# Rubia Music

Rubia Music 是一款使用 **Tauri 2、Rust 和 Vue 3** 构建的跨平台桌面音乐播放器。项目采用模块化结构，界面参考 Apple Music，重点兼容 LX Music 自定义音乐源。

> 项目仍处于早期开发阶段。音乐平台接口与第三方音源可能随时变化，请仅在获得授权并遵守当地法律、平台协议和内容版权要求的前提下使用。

## 功能

- 搜索歌曲、歌手和专辑
- 播放、暂停、下一首、拖动进度和音量控制
- 播放队列和最近播放记录
- 歌曲收藏
- 创建、重命名和删除自定义歌单
- 将歌曲添加到指定歌单
- 全屏歌词、歌词滚动、点击歌词跳转和颜色进度浸染
- 平台歌词失败时下载保底歌词并持久缓存
- 搜索结果、播放器和歌词界面的专辑封面
- 导入、管理和切换 LX Music 自定义源脚本
- 自定义源 HTTP 请求代理与调试日志
- macOS 原生应用菜单和常用快捷键
- 响应式桌面与移动窗口布局
- 自动跟随系统深色模式和“减少透明度”设置
- Apple 风格毛玻璃材质

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面框架 | Tauri 2 |
| 后端 | Rust 2024、Tokio、Reqwest |
| 前端 | Vue 3、TypeScript、Vite |
| 日志 | tracing、tracing-subscriber |
| 播放 | HTML Audio |
| 本地数据 | Tauri 应用数据目录、localStorage |

## 开发环境

请先安装：

- Rust stable 与 Cargo
- Node.js 和 npm
- Tauri 2 对应平台的系统依赖

克隆项目后安装前端依赖：

```bash
cd rubia-music-app
npm install
```

## 运行与预览

推荐直接启动完整的 Tauri 应用：

```bash
cd rubia-music-app
npm run tauri dev
```

仅启动浏览器前端：

```bash
cd rubia-music-app
npm run dev
```

浏览器模式无法使用依赖 Tauri 的 Rust 命令，因此搜索、音源代理和本地配置等能力可能不可用。

## 检查与构建

在仓库根目录检查 Rust workspace：

```bash
cargo check --workspace --all-targets
cargo test --workspace
```

检查并构建前端：

```bash
cd rubia-music-app
npm run build
```

生成桌面安装包：

```bash
cd rubia-music-app
npm run tauri build
```

构建产物位于 Cargo target 目录中，具体格式取决于当前操作系统。

## 自动构建与发布

仓库中的 `Build desktop installers` GitHub Actions 工作流会构建以下安装包：

- macOS Apple Silicon 的 DMG
- macOS Intel 的 DMG
- Windows x64 的 NSIS 和 MSI 安装包

推送到 `main` 分支或在 GitHub 的 Actions 页面手动运行工作流时，安装包会保存为工作流产物。推送与应用版本一致的标签时，还会自动创建 GitHub Release 并上传安装包：

```bash
git tag v0.1.1
git push origin v0.1.1
```

工作流会校验标签是否与 `package.json` 中的应用版本一致。CI 生成的 macOS 安装包使用 ad-hoc 签名；面向最终用户正式发布时，仍建议配置 Apple Developer ID、公证以及 Windows 代码签名。

## 自定义音乐源

在“设置 → 音乐来源”中可以：

1. 从 URL 下载并导入 `.js` 音源。
2. 选择本地 `.js` 音源文件。
3. 切换当前音源。
4. 查看初始化状态和错误信息。
5. 删除不再使用的音源。

音源脚本运行在受限 iframe 中，网络请求通过 Rust 后端转发。当前兼容 LX Music API 2.0 的主要初始化、请求、更新提醒和 `musicUrl` 流程，并提供常用的 Buffer、AES、RSA、MD5、随机字节和 zlib 兼容能力。

不同脚本可能依赖特定运行环境、在线接口或临时授权参数，因此不能保证所有第三方音源始终可用。

## 调试日志

Debug 构建默认输出 Rubia Music 的调试日志。可以使用 `RUST_LOG` 调整过滤规则：

```bash
RUST_LOG=rubia_music_app=debug npm run tauri dev
```

常见日志目标：

- `rubia_music_app::music_source`：音源 HTTP 请求和响应
- `rubia_music_app::lyrics`：平台歌词、保底歌词和缓存
- `rubia_music_app::artwork`：封面解析
- `rubia_music_app::menu`：原生菜单事件

开发者工具控制台还会输出带有 `[music-source]` 前缀的自定义源运行日志。

## 数据与缓存

- 音源脚本和当前音源选择保存在 Tauri 应用数据目录。
- 已下载歌词保存在应用数据目录的 `lyrics/` 子目录。
- 收藏、歌单、最近播放和界面偏好保存在 WebView localStorage。
- 旧版单一“默认歌单”数据会自动迁移到新的多歌单结构。

可以在“设置 → 数据”中清理资料库数据或恢复默认偏好。

## 项目结构

```text
rubia-music/
├── Cargo.toml                    # Rust workspace 入口
├── rubia-music-app/
│   ├── src/
│   │   ├── components/           # 通用界面组件
│   │   ├── features/
│   │   │   ├── home/             # 首页
│   │   │   ├── library/          # 收藏、歌单、最近播放
│   │   │   ├── lyrics/           # 全屏歌词
│   │   │   ├── navigation/       # 页面导航状态
│   │   │   ├── player/           # 播放器与队列
│   │   │   ├── search/           # 音乐搜索
│   │   │   ├── settings/         # 应用偏好
│   │   │   └── sources/          # LX 音源兼容运行时
│   │   ├── services/             # 前端调用 Rust 的服务边界
│   │   ├── styles/               # 响应式与主题样式
│   │   └── types/                # TypeScript 类型
│   └── src-tauri/
│       └── src/
│           ├── commands.rs       # Tauri commands
│           ├── domain/           # Rust 领域模型
│           ├── lyrics.rs         # 歌词获取与缓存
│           ├── native_menu.rs    # 桌面原生菜单
│           └── providers/        # 音乐平台适配器
```

## 模块约定

- 页面功能优先放入独立的 `src/features/<feature>` 目录。
- Vue 组件不直接拼接平台 API，请通过 `services` 或 Rust provider 调用。
- 音乐平台差异封装在 `src-tauri/src/providers`。
- 跨前后端对象统一放在领域模型和 `src/types` 中。
- 自定义源兼容逻辑与播放器状态保持解耦。
- 新增持久化数据时需要考虑旧版本迁移。

## 当前限制

- 内置搜索平台目前以酷我音乐为主。
- 部分平台只返回试听地址，无法保证获得完整歌曲。
- 第三方音源服务可能超时、失效或返回过期链接。
- 保底纯文本歌词只能生成近似时间轴，精度低于同步歌词。
- 当前资料库数据保存在本地，尚未提供账户同步。

## 后续计划

- 更完整的多平台搜索和歌词切换
- 歌单封面、排序和拖放管理
- 播放模式、上一首和随机播放
- 本地音乐扫描
- 桌面通知和媒体按键
- 数据导入、导出和跨设备同步
