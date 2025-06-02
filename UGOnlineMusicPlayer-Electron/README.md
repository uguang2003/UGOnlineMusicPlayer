# UGOnlineMusicPlayer 桌面版

![UG音乐播放器桌面版](https://music.ug666.top/favicon.ico)

> 全功能音乐播放器的 Windows 桌面应用版，享受无浏览器的原生体验！

## 📋 版本更新

### V1.0.2 (2025.06.02)

#### 🎯 主要改进

- **性能优化**: 清理了大量调试日志，应用启动和运行更加流畅
- **界面优化**: 加载进度条增加了动画效果，提供更好的视觉反馈
- **代码重构**: 简化了复杂的后台逻辑，保持核心功能稳定
- **用户体验**: 减少了控制台输出，专注于核心播放功能

#### 🔧 技术改进

- 优化 Electron 应用的启动速度
- 改进了系统托盘和全局快捷键的响应性
- 清理冗余代码，减少内存占用

## 📌 项目简介

UGOnlineMusicPlayer 桌面版是将在线音乐播放器包装成独立桌面应用程序的解决方案，提供了比 Web 浏览器更优秀的集成体验。通过 Electron 框架，我们将 Web 版本的所有功能保留的同时，还加入了许多专为桌面环境开发的特性。

![桌面版截图](./screenshots/desktop-preview.png)

## ✨ 特色功能

除了继承 Web 版的所有功能外，桌面版还拥有以下独特特性：

| 功能              | 描述                                           |
| ----------------- | ---------------------------------------------- |
| 🖥️ **原生体验**   | 独立应用窗口，无浏览器地址栏和工具栏           |
| 🔄 **系统托盘**   | 关闭窗口后继续在后台运行，托盘图标显示播放状态 |
| ⌨️ **全局快捷键** | 在任何应用中控制音乐播放，无需切换窗口         |
| 📥 **增强下载**   | 使用系统对话框保存文件，更好的下载体验         |
| 🔔 **系统通知**   | 歌曲切换、下载完成时显示系统通知               |
| 🔌 **离线缓存**   | 改进的资源缓存机制，提升加载速度               |

### 全局快捷键

| 快捷键          | 功能      |
| --------------- | --------- |
| `Ctrl+Alt+→`    | 下一首    |
| `Ctrl+Alt+←`    | 上一首    |
| `Ctrl+Alt+空格` | 播放/暂停 |
| `Ctrl+Alt+↑`    | 增加音量  |
| `Ctrl+Alt+↓`    | 减小音量  |

## 💻 系统要求

- **操作系统**: Windows 7 SP1 及以上
- **处理器**: 1.6GHz 及以上双核
- **内存**: 最少 2GB RAM
- **存储**: 最少 200MB 可用空间
- **网络**: 宽带互联网连接

## 📥 安装使用

### 方式一：直接下载安装包

1. 访问[发布页面](https://github.com/username/UGOnlineMusicPlayer-Electron/releases)
2. 下载最新版本的安装包 `UGMusicPlayer-Setup-x.x.x.exe`
3. 运行安装程序，按照提示完成安装
4. 启动桌面图标或开始菜单中的"UG 音乐播放器"

### 方式二：从源码构建

1. **准备环境**

   ```bash
   # 确保已安装Node.js (14+)和Git
   node -v
   git --version
   ```

2. **获取源码**

   ```bash
   git clone https://github.com/username/UGOnlineMusicPlayer-Electron.git
   cd UGOnlineMusicPlayer-Electron
   ```

3. **安装依赖**

   ```bash
   npm install
   ```

4. **开发模式运行**

   ```bash
   npm start
   ```

5. **构建安装包**
   ```bash
   npm run dist
   ```
   生成的安装程序位于`dist`目录中

## 🛠️ 开发指南

### 项目结构

```
UGOnlineMusicPlayer-Electron/
├── src/                # 源代码目录
│   ├── main.js         # 主进程代码
│   ├── preload.js      # 预加载脚本
│   └── renderer/       # 渲染进程相关文件
├── resources/          # 资源文件(图标等)
├── dist/               # 打包输出目录
├── package.json        # 项目配置
└── forge.config.js     # Electron Forge配置
```

### 开发调试

1. **修改主进程**  
   编辑`src/main.js`文件，然后运行`npm start`查看效果

2. **修改 HTML/CSS/JS**  
   编辑`src/renderer`目录下的文件

3. **调试工具**  
   开发模式下，可使用 Chrome 开发者工具进行调试
   ```javascript
   // 在main.js中添加此行以打开开发者工具
   mainWindow.webContents.openDevTools();
   ```

### 自定义配置

- **应用设置**: 修改`package.json`中的`productName`、`version`等字段
- **打包配置**: 编辑`forge.config.js`文件自定义打包选项
- **图标替换**: 替换`resources`目录中的图标文件

## 🔄 更新日志

### v1.0.2 (2025-06-01)

- 版本号统一更新
- 与移动版保持版本同步
- 优化代码结构和注释

### v1.2.0 (2025-05-10)

- 新增全局音量控制快捷键
- 优化系统托盘菜单
- 修复部分歌曲无法播放的问题
- 改进下载文件命名规则

### v1.1.0 (2025-03-15)

- 添加窗口大小和位置记忆功能
- 改进系统通知样式
- 修复高 DPI 屏幕显示问题
- 性能优化，减少内存占用

### v1.0.0 (2025-02-01)

- 首次发布

## 📝 常见问题

<details>
<summary>应用无法启动或崩溃</summary>

1. 确保系统符合最低配置要求
2. 检查杀毒软件是否拦截应用
3. 尝试以管理员权限运行
4. 完全卸载后重新安装最新版本
</details>

<details>
<summary>全局快捷键不起作用</summary>

1. 确认快捷键是否与其他应用冲突
2. 重启应用尝试重新注册快捷键
3. 在任务管理器中确认应用进程是否在运行
</details>

<details>
<summary>如何完全退出应用？</summary>

点击托盘图标，选择"退出"选项，或使用快捷键`Alt+F4`同时按住`Shift`键。

</details>

## 📝 更新日志

### V1.0.2 (2025.06.02)

#### ✨ 新功能与改进

- **启动性能**: 优化了应用启动速度，减少了初始化时间
- **用户界面**: 改进了加载进度条的视觉效果和动画
- **资源管理**: 清理了大量调试日志，减少内存占用
- **稳定性**: 简化了后台逻辑，提高应用运行稳定性

#### 🔧 技术优化

- 优化 Electron 主进程的资源管理
- 改进了系统托盘的响应速度
- 清理冗余代码，减少安装包体积
- 增强全局快捷键的可靠性

#### 🐛 问题修复

- 修复了某些情况下托盘图标不显示的问题
- 解决了快捷键在特定应用中不响应的问题
- 改进了窗口关闭后的内存释放

### V1.0.1 (2025.05.xx)

- 🎯 添加系统托盘支持
- ⌨️ 实现全局快捷键控制
- 🔔 增加系统通知功能

### V1.0.0 (2025.04.xx)

- 🎉 首个桌面版发布
- 🌐 集成完整 Web 功能
- 🖥️ 原生桌面体验

## 📄 许可协议

本项目使用 MIT 许可证 - 查看[LICENSE](LICENSE)文件了解详情

## 👥 贡献指南

欢迎贡献代码、报告问题或提供改进建议！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📞 联系我们

有问题或建议？请通过以下方式联系我们：

- 问题反馈：[GitHub Issues](https://github.com/username/UGOnlineMusicPlayer-Electron/issues)
- 电子邮件：contact@example.com

---

<p align="center">
  用心聆听，随身相伴 - UG音乐播放器桌面版
</p>
