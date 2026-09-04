# DSH Assistant Platform

面向微信、飞书等渠道助手的 DeepSeek Harness 控制平台与可审计内核源码仓库。

## 内容

```text
kernel/deepseek-harness/  DeepSeek Harness v0.1.1-rc.2 完整源码快照
plugins/workbench-home/   多助手工作台首页插件
models/dsh-api-monitor/   API 调用与余额监控插件
```

内核快照来自官方 `deepseek-ai/deepseek-harness` 仓库的 `dsh-v0.1.1-rc.2` 标签，提交为
`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`。上游代码继续遵循其目录内的 MIT License 和
Third-Party Notices。

## 使用已安装的 DSH

```powershell
pwsh -File .\scripts\install-platform.ps1
dsh web --no-open
```

## 从内核源码构建

```powershell
Set-Location .\kernel\deepseek-harness
corepack enable
pnpm install
pnpm run build
pnpm dsh web
```

建议将渠道助手分别从以下仓库安装：

- [`csmht/dsh-weixin-assistant`](https://github.com/csmht/dsh-weixin-assistant)
- [`csmht/dsh-feishu-assistant`](https://github.com/csmht/dsh-feishu-assistant)

Node.js 版本要求为 `^22.19.0` 或 `>=24`。模型凭据与渠道凭据必须在本机单独配置，不得提交。
