# @deepseek-ai/dsh-api-monitor

DeepSeek Harness（DSH）的 API 用量与账户余额**实时监控插件**。

在 Web 界面侧边栏底部注册一个「API 用量」按钮，点击后弹出仪表盘，实时展示：

- **账户余额**：可用总额 / 赠送余额 / 充值余额（来自 DeepSeek 官方 `GET /user/balance` 接口）。
- **用量统计**：累计请求数、近 60 秒请求速率、成功 / 失败 / 重试次数、平均延迟。
- **状态码分布**：按 HTTP 状态码统计的失败分布。
- **Token 消耗**：输入（未缓存）、输出、缓存读、缓存写、推理。

## 工作原理

| 面 | 职责 |
| --- | --- |
| 宿主端 `lib/index.js` | 订阅 `session/event` 累计用量；周期调用官方余额接口；注册 `GET /api-monitor/stats` 精确路由返回 JSON 快照 |
| 浏览器端 `lib/client.js` | 在 `sidebar.footer.action` 插槽注册按钮；周期轮询上述路由并渲染仪表盘 |

数据来源说明：DeepSeek 官方**没有**「用量统计」接口，因此请求数、延迟、错误率、状态码等由插件在本进程内统计（记录每次真实发往 DeepSeek 的模型调用）；**余额**直接来自官方 `/user/balance` 接口。

## 安装

1. 把本插件安装进 web profile：

   ```sh
   dsh plugin --profile web add <本插件目录路径>
   ```

2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中注册一行：

   ```yaml
   - insert:
       - id: api-monitor
         name: '@deepseek-ai/dsh-api-monitor'
   ```

3. 校验组合（不启动服务）：

   ```sh
   dsh --dump-config --profile web
   ```

4. 重启 Web 服务，刷新页面后即可在侧边栏底部看到「API 用量」按钮。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 覆盖余额接口端点（与 llm-deepseek 适配器一致） |
| `DEEPSEEK_API_KEY` | 由凭据服务解析 | API 密钥，插件经 `ctx.credentials` 按引用解析 |
