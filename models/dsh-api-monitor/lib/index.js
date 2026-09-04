/**
 * @deepseek-ai/dsh-api-monitor（宿主端）
 *
 * 职责：
 * 1. 订阅 `session/event`，跨会话累计 DeepSeek API 用量（请求数、成功/失败、
 *    重试、状态码分布、平均延迟、Token 消耗、近 60 秒请求速率）。
 * 2. 通过 `ctx.credentials` 解析 DEEPSEEK_API_KEY，周期调用 DeepSeek 官方
 *    `GET /user/balance` 接口拉取账户余额（赠金 / 充值 / 总额）。
 * 3. 在 Web 服务器上注册 `GET /api-monitor/stats` 精确路由，供浏览器端轮询，
 *    返回「用量 + 余额」的 JSON 快照。
 *
 * 数据来源说明：
 * - 用量详情：DeepSeek 官方不提供「用量统计」接口，因此请求数、延迟、错误率、
 *   状态码等由本插件在本进程内统计（记录每次真实发往 DeepSeek 的模型调用）。
 * - 余额：直接来自 DeepSeek 官方 `/user/balance` 接口（官方端口）。
 */

const name = "api-monitor";
// 定时器 mixin：提供 ctx.interval / ctx.timeout，随插件卸载自动清理
const inject = ["timer"];

/** 余额接口默认端点；可用 DEEPSEEK_BASE_URL 环境变量覆盖（与 llm-deepseek 适配器一致） */
const DEFAULT_BASE_URL = "https://api.deepseek.com";
/** 余额接口路径（DeepSeek 官方） */
const BALANCE_PATH = "/user/balance";
/** 凭据引用名（与 llm-deepseek、web-search-deepseek 共用同一把 Key） */
const API_KEY_REF = "DEEPSEEK_API_KEY";
/** 余额自动刷新周期（毫秒） */
const BALANCE_REFRESH_MS = 30000;
/** 请求速率统计窗口（毫秒），用于「近 60 秒请求数」 */
const RATE_WINDOW_MS = 60000;

/**
 * 进程级统计存储：跨会话累计，浏览器端只读，不落盘。
 * 使用普通对象而非闭包，便于 `snapshot()` 直接序列化。
 */
const store = {
  requests: 0,               // 逻辑请求数（step/start，一次模型调用）
  successes: 0,              // 成功响应数（assistant/message）
  errors: 0,                 // 失败轮次数（turn/end 且 reason.kind === 'error'）
  retries: 0,                // 重试次数（llm/retry）
  statusCodes: Object.create(null), // HTTP 状态码 → 次数（如 {"429": 2}）
  totalLatencyMs: 0,         // 延迟累计（毫秒）
  latencyCount: 0,           // 延迟样本数
  recentRequestTimes: [],    // 近 60 秒内的请求时间戳（用于速率）
  inputTokens: 0,            // 未缓存输入 Token
  outputTokens: 0,           // 输出 Token
  cacheReadTokens: 0,        // 缓存读 Token
  cacheWriteTokens: 0,       // 缓存写 Token
  reasoningTokens: 0,        // 推理 Token
  balance: null,             // 最近一次余额原始 JSON
  balanceError: null,        // 余额拉取失败信息
  balanceUpdatedAt: 0,       // 余额更新时间戳（毫秒）
};

/** 每会话的待结算步骤起点（用于配对 step/start → step/end 计算延迟） */
const pendingStep = new WeakMap();

/**
 * 将一条会话事件折叠进全局统计。
 * 事件类型与数据结构见 @deepseek-ai/dsh-session 的 SessionEventMap。
 * @param session - 产生该事件的会话对象（用于 WeakMap 键）
 * @param event - 已提交的会话事件（含 type / seq / time / data）
 */
function foldEvent(session, event) {
  switch (event.type) {
    case "step/start": {
      // 一次模型调用开始
      store.requests += 1;
      const now = event.time;
      store.recentRequestTimes.push(now);
      // 丢弃超出速率窗口的记录
      const cutoff = now - RATE_WINDOW_MS;
      store.recentRequestTimes = store.recentRequestTimes.filter((t) => t >= cutoff);
      // 记录本步骤起点，供 step/end 计算延迟
      pendingStep.set(session, { turn: event.data.turn, step: event.data.step, startedAt: now });
      break;
    }
    case "step/end": {
      // 步骤结束：与起点配对计算本次模型调用耗时
      const p = pendingStep.get(session);
      if (p !== undefined && p.turn === event.data.turn && p.step === event.data.step) {
        const latency = Math.max(0, event.time - p.startedAt);
        store.totalLatencyMs += latency;
        store.latencyCount += 1;
        pendingStep.delete(session);
      }
      break;
    }
    case "assistant/message": {
      // 一次成功响应，携带 Token 计量（可能缺失）
      store.successes += 1;
      const usage = event.data.usage;
      if (usage !== undefined && usage !== null) {
        store.inputTokens += usage.inputTokens ?? 0;
        store.outputTokens += usage.outputTokens ?? 0;
        store.cacheReadTokens += usage.cacheReadTokens ?? 0;
        store.cacheWriteTokens += usage.cacheWriteTokens ?? 0;
        store.reasoningTokens += usage.reasoningTokens ?? 0;
      }
      break;
    }
    case "turn/end": {
      // 轮次以错误收尾：reason.kind === 'error'，error 为 LlmFailure（含 status/code）
      const reason = event.data.reason;
      if (reason !== undefined && reason !== null && reason.kind === "error") {
        store.errors += 1;
        const failure = reason.error;
        const key = failure !== undefined && failure.status !== undefined
          ? String(failure.status)
          : (failure !== undefined && failure.code !== undefined ? failure.code : "UNKNOWN");
        store.statusCodes[key] = (store.statusCodes[key] ?? 0) + 1;
      }
      break;
    }
    case "llm/retry": {
      // 触发了一次重试决策（额外的真实 HTTP 请求）
      store.retries += 1;
      break;
    }
    default:
      break;
  }
}

/**
 * 调用 DeepSeek 官方余额接口，把结果写入 store。
 * 失败不抛出，而是写入 balanceError 供浏览器端展示。
 * @param ctx - 宿主端 Cordis 上下文
 */
async function fetchBalance(ctx) {
  const credentials = ctx.get("credentials");
  if (credentials === undefined) {
    store.balanceError = "凭据服务未挂载";
    return;
  }
  let hit;
  try {
    hit = await credentials.resolve(API_KEY_REF);
  } catch (error) {
    store.balanceError = "解析凭据失败：" + String(error?.message ?? error);
    return;
  }
  if (hit === undefined || hit.value === undefined || hit.value.length === 0) {
    store.balanceError = "未配置 " + API_KEY_REF;
    return;
  }
  const base = process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL;
  let res;
  try {
    res = await fetch(base + BALANCE_PATH, {
      headers: { authorization: "Bearer " + hit.value },
    });
  } catch (error) {
    store.balanceError = "请求余额接口失败：" + String(error?.message ?? error);
    return;
  }
  if (!res.ok) {
    store.balanceError = "余额接口 HTTP " + res.status;
    return;
  }
  let data;
  try {
    data = await res.json();
  } catch (error) {
    store.balanceError = "解析余额响应失败：" + String(error?.message ?? error);
    return;
  }
  store.balance = data;
  store.balanceError = null;
  store.balanceUpdatedAt = Date.now();
}

/**
 * 把 DeepSeek 余额原始 JSON 规整为浏览器端可展示的扁平结构。
 * @param raw - `/user/balance` 返回的原始对象
 * @returns 规整后的余额对象；raw 为空时返回 null
 */
function normalizeBalance(raw) {
  if (raw === null || raw === undefined) return null;
  const infos = Array.isArray(raw.balance_infos) ? raw.balance_infos : [];
  const info = infos.length > 0 ? infos[0] : null;
  return {
    isAvailable: raw.is_available === true,
    currency: info !== null && info.currency !== undefined ? info.currency : null,
    totalBalance: info !== null && info.total_balance !== undefined ? info.total_balance : null,
    grantedBalance: info !== null && info.granted_balance !== undefined ? info.granted_balance : null,
    toppedUpBalance: info !== null && info.topped_up_balance !== undefined ? info.topped_up_balance : null,
  };
}

/**
 * 生成浏览器端轮询用的 JSON 快照（仅标量/普通对象，可无损序列化）。
 * @returns 用量 + 余额快照
 */
function snapshot() {
  const latencyCount = store.latencyCount;
  return {
    usage: {
      requests: store.requests,
      successes: store.successes,
      errors: store.errors,
      retries: store.retries,
      statusCodes: store.statusCodes,
      avgLatencyMs: latencyCount === 0 ? 0 : Math.round(store.totalLatencyMs / latencyCount),
      recentRequests60s: store.recentRequestTimes.length,
      inputTokens: store.inputTokens,
      outputTokens: store.outputTokens,
      cacheReadTokens: store.cacheReadTokens,
      cacheWriteTokens: store.cacheWriteTokens,
      reasoningTokens: store.reasoningTokens,
    },
    balance: normalizeBalance(store.balance),
    balanceError: store.balanceError,
    balanceUpdatedAt: store.balanceUpdatedAt,
  };
}

/**
 * 插件入口。
 * @param ctx - 宿主端 Cordis 上下文
 */
function apply(ctx) {
  // 订阅会话事件流，跨会话累计用量（根平面监听器接收全部会话的事件）
  ctx.on("session/event", (session, event) => {
    foldEvent(session, event);
  });

  // 余额拉取：启动时立即拉一次，此后周期刷新；失败信息写入 store 而非抛出
  const tick = () => {
    fetchBalance(ctx).catch((error) => {
      store.balanceError = "余额拉取异常：" + String(error?.message ?? error);
    });
  };
  tick();
  ctx.interval(tick, BALANCE_REFRESH_MS);

  // 注册 HTTP 精确路由供浏览器端轮询（同源，无 CORS 问题）
  const webServer = ctx.get("webServer");
  if (webServer !== undefined) {
    webServer.register({
      kind: "exact",
      path: "/api-monitor/stats",
      handler: async (req, res) => {
        // URL 携带 ?refresh=1 时，先强制刷新一次余额再返回
        if (req.url !== undefined && req.url.indexOf("refresh=1") !== -1) {
          try {
            await fetchBalance(ctx);
          } catch (error) {
            store.balanceError = "余额拉取异常：" + String(error?.message ?? error);
          }
        }
        const body = JSON.stringify(snapshot());
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        });
        res.end(body);
      },
    });
  }
}

export { name, inject, apply };
