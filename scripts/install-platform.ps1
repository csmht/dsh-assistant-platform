$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$homePlugin = Join-Path $repoRoot "plugins\workbench-home"

if (-not (Get-Command dsh -ErrorAction SilentlyContinue)) {
    throw "未找到 dsh。请先安装 @deepseek-ai/dsh，或从 kernel/deepseek-harness 构建内核。"
}

dsh plugin --profile web add "dsh-workbench-plugin@0.1.31"
if ($LASTEXITCODE -ne 0) { throw "安装 dsh-workbench-plugin 失败。" }
dsh plugin --profile web add $homePlugin
if ($LASTEXITCODE -ne 0) { throw "安装工作台首页插件失败。" }

dsh plugin --profile web list
Write-Host "控制平台配置完成。运行 'dsh web --no-open' 启动。"
