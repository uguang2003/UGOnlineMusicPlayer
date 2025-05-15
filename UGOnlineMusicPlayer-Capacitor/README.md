# UG在线音乐播放器 Capacitor Android版

![UG音乐播放器](https://music.ug666.top/favicon.ico) 

## 项目介绍

UGOnlineMusicPlayer-Capacitor 是 UG在线音乐播放器的移动版本，使用 Capacitor 框架将 Web 版本打包为 Android 应用。通过这个应用，您可以随时随地在安卓设备上享受与 Web 端相同的音乐体验，支持多平台音乐搜索、歌单收藏、歌词显示等功能。

### 功能特点

- **原生应用体验**: 使用原生控件和系统通知集成，提供流畅的用户体验
- **离线检测**: 自动检测网络连接状态，并提供友好的错误处理
- **响应式设计**: 自适应不同屏幕尺寸的安卓设备
- **全屏模式**: 提供沉浸式的音乐播放体验
- **系统整合**: 支持系统媒体控制，可通过通知栏控制音乐播放
- **优化性能**: 专为移动设备优化的加载和运行性能

## 技术架构

项目使用了以下技术:

- **Capacitor**: 用于将 Web 应用转换为原生应用
- **HTML/CSS/JavaScript**: 基础的 Web 技术栈
- **Android SDK**: 用于构建和打包 Android 应用

## 项目结构

```
UGOnlineMusicPlayer-Capacitor/
├── android/              # Android项目文件
├── capacitor.config.json # Capacitor配置文件
├── package.json          # NPM包配置
├── www/                  # Web源代码
│   ├── index.html        # 主HTML文件
│   ├── js/               # JavaScript文件
│   │   └── app.js        # 主应用逻辑
│   └── offline.html      # 离线页面
└── README.md             # 项目文档
```

## 开发环境设置

### 前提条件

- Node.js (v14+)
- NPM (v6+)
- Android Studio (最新版)
- JDK 11+
- Gradle

### 安装依赖

```bash
npm install
```

## 构建和运行

### 开发环境

1. 启动本地web服务器预览应用:

```bash
npm run start
```

2. 添加Android平台:

```bash
npm run add-android
```

3. 将当前Web应用同步到Android项目:

```bash
npm run sync
```

4. 打开Android Studio查看项目:

```bash
npm run open
```

### 打包应用

#### 生成调试版本APK

```bash
npm run build-android
```
生成的APK将位于 `android/app/build/outputs/apk/debug/` 目录下。

#### 生成发布版本APK

1. 首先需要设置签名密钥。在 `android/app/` 目录下创建或编辑 `build.gradle` 文件，添加签名配置:

```gradle
android {
    // ...
    signingConfigs {
        release {
            storeFile file("您的keystore文件路径")
            storePassword "您的keystore密码"
            keyAlias "您的密钥别名"
            keyPassword "您的密钥密码"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

2. 生成签名版本:

```bash
npm run build-release
```

生成的APK将位于 `android/app/build/outputs/apk/release/` 目录下。

## 自定义配置

### 修改应用设置

编辑 `capacitor.config.json` 文件可以更改应用名称、包名、版本等信息:

```json
{
  "appId": "com.ug.musicplayer",
  "appName": "UG音乐播放器",
  "webDir": "www",
  "bundledWebRuntime": false
}
```

### 修改音乐源

如果要更改音乐API地址，请编辑 `www/js/app.js` 文件中的 `MUSIC_URL` 常量:

```javascript
const MUSIC_URL = 'https://music.ug666.top';
```

## 问题排查

### 常见问题

1. **应用无法连接到服务器**
   - 检查网络连接
   - 确认API地址是否正确
   - 检查Android权限设置

2. **界面显示异常**
   - 更新Capacitor和依赖到最新版本
   - 检查CSS是否兼容安卓WebView

3. **打包失败**
   - 确保已安装所有必要的Android开发工具
   - 检查Gradle配置
   - 查看Android Studio日志了解具体错误

## 许可证

ISC License

## 联系方式

如有问题或建议，请联系UG团队。

## 致谢

感谢所有开源项目和贡献者，使这个项目成为可能。
