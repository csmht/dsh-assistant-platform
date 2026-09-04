/**
 * @deepseek-ai/dsh-api-monitor（浏览器端）
 *
 * 职责：在侧边栏底部注册一个「API 用量」按钮，点击后弹出实时仪表盘，
 * 周期轮询宿主端 `GET /api-monitor/stats` 获取用量与余额快照。
 *
 * 仅使用 React.createElement（无 JSX），静态客户端插件的浏览器运行环境
 * 由 window.__ModuleLoader__ 提供。
 */
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-api-monitor",
  factory: (require) => {
    const React = require("react");
    const el = React.createElement;

    /** 轮询间隔（毫秒） */
    const POLL_MS = 3000;

    /** 面板主题色：优先使用主题 CSS 变量，缺失时回退到中性值 */
    const panelStyle = {
      position: "fixed",
      left: 16,
      bottom: 64,
      zIndex: 10000,
      width: 340,
      maxHeight: "70vh",
      overflow: "auto",
      boxSizing: "border-box",
      background: "var(--dsw-specific-bubble, #ffffff)",
      color: "var(--dsw-alias-label-primary, #1a1a1a)",
      border: "1px solid var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.12))",
      borderRadius: 12,
      boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      padding: "14px 16px",
      font: "var(--dsw-font-markdown-code, 13px/1.5 system-ui, sans-serif)",
    };

    /** 二级文字颜色 */
    const secondaryColor = "var(--dsw-alias-label-secondary, #666666)";

    /**
     * 渲染一行「标签：值」统计项。
     * @param label - 标签文本
     * @param value - 值文本
     */
    function StatRow(label, value) {
      return el("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "3px 0",
        },
      }, el("span", { style: { color: secondaryColor } }, label), el("span", null, value));
    }

    /**
     * 渲染一个分组标题。
     * @param text - 标题文本
     */
    function SectionTitle(text) {
      return el("div", {
        style: {
          margin: "12px 0 4px",
          fontWeight: 600,
          fontSize: 13,
          opacity: 0.9,
        },
      }, text);
    }

    /**
     * 渲染状态码分布。
     * @param statusCodes - { "429": 2, "500": 1 }
     */
    function StatusCodesView(statusCodes) {
      const entries = statusCodes === null || statusCodes === undefined ? [] : Object.entries(statusCodes);
      if (entries.length === 0) return el("span", { style: { color: secondaryColor } }, "—");
      return el("div", null, entries.map(function (entry) {
        return el("span", {
          key: entry[0],
          style: {
            display: "inline-block",
            margin: "2px 6px 2px 0",
            padding: "1px 8px",
            borderRadius: 10,
            border: "1px solid var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.12))",
          },
        }, entry[0] + " × " + entry[1]);
      }));
    }

    /**
     * 仪表盘面板主组件：轮询数据并按需渲染。
     * @param props - 含 wide（侧边栏是否展开）
     */
    function ApiMonitorPanel(props) {
      const [open, setOpen] = React.useState(false);
      const [stats, setStats] = React.useState(null);
      const [error, setError] = React.useState(null);

      // 面板打开期间周期轮询宿主端统计接口
      React.useEffect(function () {
        if (!open) return undefined;
        let disposed = false;
        const poll = function () {
          fetch("/api-monitor/stats")
            .then(function (res) {
              if (!res.ok) throw new Error("HTTP " + res.status);
              return res.json();
            })
            .then(function (data) {
              if (!disposed) {
                setStats(data);
                setError(null);
              }
            })
            .catch(function (e) {
              if (!disposed) setError(String(e && e.message ? e.message : e));
            });
        };
        poll();
        const id = window.setInterval(poll, POLL_MS);
        return function () {
          disposed = true;
          window.clearInterval(id);
        };
      }, [open]);

      const wide = props && props.wide;

      // 折叠态只显示短标签，展开态显示完整标签
      const button = el("button", {
        type: "button",
        onClick: function () {
          setOpen(!open);
        },
        style: {
          cursor: "pointer",
          background: "transparent",
          border: "none",
          borderRadius: 8,
          padding: "6px 10px",
          color: "var(--dsw-alias-label-secondary, #666666)",
          font: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        },
      }, wide ? "API 用量" : "API");

      if (!open) return button;

      const usage = stats && stats.usage ? stats.usage : null;
      const balance = stats && stats.balance ? stats.balance : null;

      const panel = el("div", { style: panelStyle },
        el("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
          el("strong", null, "API 使用详情"),
          el("div", { style: { display: "inline-flex", gap: 6 } },
            el("button", {
              type: "button",
              onClick: function () {
                fetch("/api-monitor/stats?refresh=1")
                  .then(function (r) { return r.json(); })
                  .then(function (d) { setStats(d); setError(null); })
                  .catch(function (e) { setError(String(e && e.message ? e.message : e)); });
              },
              style: {
                cursor: "pointer",
                background: "transparent",
                border: "1px solid var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.12))",
                borderRadius: 6,
                padding: "2px 8px",
                color: "inherit",
              },
            }, "刷新"),
            el("button", {
              type: "button",
              onClick: function () { setOpen(false); },
              style: {
                cursor: "pointer",
                background: "transparent",
                border: "1px solid var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.12))",
                borderRadius: 6,
                padding: "2px 8px",
                color: "inherit",
              },
            }, "关闭")
          )
        ),

        // —— 余额 ——
        SectionTitle("账户余额"),
        balance !== null
          ? el("div", null,
              StatRow("可用总额", (balance.totalBalance === null ? "—" : balance.totalBalance) + (balance.currency ? " " + balance.currency : "")),
              StatRow("赠送余额", balance.grantedBalance === null ? "—" : balance.grantedBalance),
              StatRow("充值余额", balance.toppedUpBalance === null ? "—" : balance.toppedUpBalance),
              stats && stats.balanceError
                ? el("div", { style: { color: "var(--dsw-alias-danger, #c0392b)", marginTop: 4 } }, "余额异常：" + stats.balanceError)
                : null
            )
          : el("div", { style: { color: secondaryColor } },
              stats && stats.balanceError
                ? "余额异常：" + stats.balanceError
                : (stats === null ? "加载中…" : "暂无可用的余额信息")
            ),

        // —— 用量 ——
        SectionTitle("用量统计"),
        usage !== null
          ? el("div", null,
              StatRow("请求数（累计）", String(usage.requests)),
              StatRow("近 60 秒请求", String(usage.recentRequests60s)),
              StatRow("成功", String(usage.successes)),
              StatRow("失败", String(usage.errors)),
              StatRow("重试", String(usage.retries)),
              StatRow("平均延迟", usage.avgLatencyMs + " ms")
            )
          : el("div", { style: { color: secondaryColor } }, "加载中…"),

        // —— 状态码 ——
        SectionTitle("状态码分布"),
        usage !== null
          ? StatusCodesView(usage.statusCodes)
          : el("span", { style: { color: secondaryColor } }, "加载中…"),

        // —— Token ——
        SectionTitle("Token 消耗"),
        usage !== null
          ? el("div", null,
              StatRow("输入（未缓存）", String(usage.inputTokens)),
              StatRow("输出", String(usage.outputTokens)),
              StatRow("缓存读", String(usage.cacheReadTokens)),
              StatRow("缓存写", String(usage.cacheWriteTokens)),
              StatRow("推理", String(usage.reasoningTokens))
            )
          : el("div", { style: { color: secondaryColor } }, "加载中…"),

        error !== null
          ? el("div", { style: { color: "var(--dsw-alias-danger, #c0392b)", marginTop: 8 } }, "拉取失败：" + error)
          : null
      );

      // 外层包裹：按钮 + 面板（面板用固定定位浮层，避免被侧边栏裁剪）
      return el("div", null, button, panel);
    }

    /**
     * 客户端插件入口：在侧边栏底部动作区注册按钮。
     * @param ctx - 客户端 Cordis 上下文
     */
    function apply(ctx) {
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      slots.inject("sidebar.footer.action", function () {
        return slots.register({
          name: "sidebar.footer.action",
          id: "api-monitor",
          order: 100,
        }, ApiMonitorPanel);
      });
    }

    return { apply: apply };
  },
});
