# @liang/dsh-workbench-home

DeepSeek Harness Web 的本地启动首页。它在浏览器端提供：

- 一个响应式、可扩展的应用卡片容器；
- 一张进入现有 Workbench 的内置卡片；
- 侧边栏底部的“首页”返回按钮；
- `#home` / `#workbench` 两个轻量浏览器状态。

插件没有 Host 权限，不读取文件、不启动进程，也不访问网络。

## 注册新卡片

依赖此插件的浏览器插件可以注册自己的首页入口：

```js
const dispose = window.__DSH_HOME__.registerCard({
  id: 'example',
  title: '示例应用',
  description: '一行简短说明。',
  icon: 'E',
  hash: '#example',
  action: '打开',
  status: '可用',
  state: 'ready',
  tone: 'blue',
  order: 20,
})
```

`registerCard()` 返回卸载函数；使用相同 `id` 再次注册即可更新卡片状态。

## 本地安装

```powershell
dsh plugin --profile web add .\plugins\workbench-home
```

修改 `src/client.js` 后重启 `dsh web` 即可看到结果。
