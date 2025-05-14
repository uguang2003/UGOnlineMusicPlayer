# UGOnlineMusicPlayer 桌面版

> UGOnlineMusicPlayer的Electron桌面应用版本，支持Windows系统。

UGOnlineMusicPlayer桌面版是将原有的[UGOnlineMusicPlayer](https://github.com/username/UGOnlineMusicPlayer)在线音乐播放器打包成了独立的桌面应用程序，使您可以在不打开浏览器的情况下，以原生应用的形式使用该音乐播放器。

## 功能特点

除了继承原有Web版本的全部功能外，桌面版本还新增了以下特性：

- 🖥️ 独立的桌面应用体验，无需浏览器
- 🔄 最小化到系统托盘功能，点击关闭按钮不会退出程序
- ⌨️ 全局快捷键支持，可在任何应用中控制音乐播放
  - `Ctrl+Alt+右箭头` - 下一首
  - `Ctrl+Alt+左箭头` - 上一首
  - `Ctrl+Alt+空格` - 播放/暂停
- 📥 优化的文件下载体验，直接使用系统对话框保存文件
- 🔔 下载通知提醒

## 系统要求

- Windows 7及以上版本

## 安装使用

### 直接下载

从[发布页面](https://github.com/username/UGOnlineMusicPlayer-Electron/releases)下载最新版本的安装包，运行安装程序后按照提示完成安装。

### 从源码构建

如果您想从源码构建应用程序，请按照以下步骤操作：

1. 克隆代码仓库
```bash
git clone https://github.com/username/UGOnlineMusicPlayer-Electron.git
cd UGOnlineMusicPlayer-Electron
```

2. 安装依赖
```bash
npm install
```

3. 运行应用（开发模式）
```bash
npm start
```

4. 构建安装包
```bash
npm run dist
```
生成的安装程序将位于`dist`目录中。

## 开发相关

- 本应用使用Electron框架开发
- 应用图标位于`resources`目录
- 使用electron-builder进行打包和分发

## 版权说明

本播放器原版由 [mengkun](https://mkblog.cn) 开发，桌面版由UG开发，您可以随意修改、使用、转载。

播放器中的歌曲来自各大音乐平台，歌曲版权归各大平台享有。请支持正版音乐。

## 致谢

特别感谢UGOnlineMusicPlayer原作者及各大音乐平台提供的API支持。
