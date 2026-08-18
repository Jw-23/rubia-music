# Rubia Music

基于 Tauri 2、Rust 与 Vue 3 的模块化桌面音乐播放器。

## 当前能力

- 酷我音乐关键词搜索
- 内置播放地址解析和 HTML Audio 播放
- 播放/暂停、下一首、进度与音量控制
- 导入基础 LX Music 自定义源脚本
- Apple Music 风格的响应式桌面界面

## 开发

```bash
npm install
npm run tauri dev
```

仅构建前端：`npm run build`。检查后端：`cd src-tauri && cargo check`。

## 模块边界

- `src-tauri/src/domain`：跨平台领域模型
- `src-tauri/src/providers`：音乐平台适配器
- `src-tauri/src/commands.rs`：前后端命令边界
- `src/features/search`：搜索用例与界面
- `src/features/player`：播放器状态与控件
- `src/features/sources`：LX 自定义源兼容运行时
- `src/services`：前端访问 Rust 的服务层

后续收藏、歌单、首页应分别增加到 `src/features`，持久化能力则在 Rust 侧增加 repository 层，不应直接写入页面组件。

## 自定义源兼容状态

当前支持 LX API 2.0 的 `inited`、`request`、`musicUrl` 和基础 `lx.request`。源脚本在 sandbox iframe 中执行，HTTP 请求经 Rust 转发。依赖 AES、RSA、MD5、zlib 或完整 Node Buffer 行为的源，需要后续兼容层补齐后才能运行。
