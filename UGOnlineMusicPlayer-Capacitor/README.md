# UG 在线音乐播放器 Android 版

<p align="center">
  <img src="https://music.ug666.top/favicon.ico" width="100" alt="UG音乐播放器"/>
  <br>
  <b>随时随地，畅享音乐</b>
</p>

<p align="center">
  <img src="./screenshots/app-preview.jpg" width="80%" alt="应用预览" />
</p>

## 📋 版本更新

### V1.0.2 (2025.06.02)

#### 🎯 主要改进

- **后台播放优化**: 改进了移动端后台自动播放机制，确保在平板和手机上都能正常工作
- **加载体验**: 修复了加载进度条不动画的问题，增加了渐变和动画效果
- **代码清理**: 大幅简化了 `background-autoplay.js` 和 `input-combined-fix.js`，移除过多调试日志
- **性能提升**: 清理冗余代码，应用启动和运行更加流畅

#### 🔧 技术改进

- 优化了 Android WebView 的输入修复机制
- 简化了后台自动播放的实现逻辑
- 保持核心功能完整性，移除不必要的复杂性
- 改进了设备检测和适配机制

#### 🐛 问题修复

- 修复了手机端后台自动播放的兼容性问题
- 解决了加载进度条直接跳到音乐播放器的问题
- 改进了 Android 设备上的中文输入支持

## 📱 应用简介

UGOnlineMusicPlayer 移动版是基于流行的 UG 在线音乐播放器开发的 Android 原生应用，使用 Capacitor 框架将 Web 版功能完整移植到手机平台。它为您提供了随时随地享受多平台音乐的便捷体验，拥有与 Web 版相同的强大功能，同时针对移动设备做了专门优化。

### 主要特性

| 特性              | 描述                                        |
| ----------------- | ------------------------------------------- |
| 🌐 **多平台支持** | 聚合网易云、QQ 音乐、酷狗等多个音乐平台资源 |
| 📱 **移动优化**   | 针对触摸屏和小屏幕优化的交互界面            |
| 🔍 **强大搜索**   | 跨平台音乐搜索，找到您想要的任何歌曲        |
| 📃 **歌词同步**   | 实时歌词滚动显示，沉浸式体验音乐            |
| 💾 **歌单同步**   | 支持网易云音乐个人歌单同步                  |
| 📶 **离线检测**   | 智能检测网络状态，自动重连                  |
| 🎛️ **媒体控制**   | 通过系统通知栏控制音乐播放                  |
| 🤝 **手势支持**   | 支持滑动控制和其他触摸手势                  |

## ⚙️ 系统要求

- **Android 版本**: 5.0 (Lollipop) 及以上
- **存储空间**: 至少 20MB 可用空间
- **网络连接**: 用于流媒体播放和资源下载

## 📲 安装方法

### 方式一：直接安装 APK

1. 从[发布页面](https://github.com/username/UGOnlineMusicPlayer-Capacitor/releases)下载最新 APK
2. 在 Android 设备上打开下载的 APK 文件
3. 根据提示完成安装
   > 注意：您可能需要在设置中允许"安装未知来源的应用"

### 方式二：应用商店安装

目前正在申请上架各大应用商店，敬请期待。

## 🛠️ 开发环境设置

如果您是开发者，想要从源码构建应用，请按照以下步骤操作：

### 前提条件

| 工具           | 最低版本 | 推荐版本  |
| -------------- | -------- | --------- |
| Node.js        | v14.0.0  | v16.13.0+ |
| npm            | v6.0.0   | v8.1.0+   |
| Android Studio | 4.0      | 最新版    |
| JDK            | 11       | 11        |
| Gradle         | 7.0      | 7.4+      |

### 开发步骤

1. **获取源代码**

   ```bash
   git clone https://github.com/username/UGOnlineMusicPlayer-Capacitor.git
   cd UGOnlineMusicPlayer-Capacitor
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **添加 Android 平台**

   ```bash
   npx cap add android
   ```

4. **同步 Web 代码到 Android 平台**

   ```bash
   npx cap sync
   ```

5. **在 Android Studio 中打开项目**
   ```bash
   npx cap open android
   ```

## 📦 构建发布版本

### 开发版构建

```bash
# 构建web资源并同步到Android
npm run build
npx cap sync

# 构建Android调试APK
cd android
./gradlew assembleDebug
```

生成的 APK 位于 `android/app/build/outputs/apk/debug/` 目录。

### 发布版构建

1. **配置签名密钥**

   ```bash
   # 生成签名密钥（仅首次需要）
   keytool -genkey -v -keystore ug-music-key.keystore -alias ug-music-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **设置 gradle 签名配置**
   在`android/app/build.gradle`中配置签名信息：

   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("路径/ug-music-key.keystore")
               storePassword "您的密钥库密码"
               keyAlias "ug-music-alias"
               keyPassword "您的密钥密码"
           }
       }

       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. **构建发布版 APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   生成的 APK 位于 `android/app/build/outputs/apk/release/` 目录。

## ⚡ 自定义配置

### 应用配置

编辑 `capacitor.config.json` 文件修改应用基本信息：

```json
{
  "appId": "com.ug666.musicplayer",
  "appName": "UG音乐播放器",
  "webDir": "www",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https",
    "allowNavigation": ["music.ug666.top"]
  },
  "android": {
    "backgroundColor": "#000000",
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": true,
    "useLegacyBridge": true,
    "initialFocus": false,
    "hideSplashScreen": false,
    "overrideUserAgent": "Mozilla/5.0 UGMusicPlayer Android App",
    "allowBackForwardNavigationGestures": true
  }
}
```

### 修改音乐源

如需更改后端 API 地址，编辑 `www/js/app.js` 文件：

```javascript
const MUSIC_URL = "https://music.ug666.top"; // 修改为您的API地址
```

## 🔍 常见问题解答

<details>
<summary><b>应用无法连接服务器</b></summary>

- 检查网络连接是否正常
- 确认 API 地址在 capacitor.config.json 的 allowNavigation 列表中
- 检查手机是否有网络访问权限
- 尝试在浏览器中访问音乐 API 地址
</details>

<details>
<summary><b>界面显示异常</b></summary>

- 清除应用数据和缓存
- 确保使用最新版本的应用
- 检查设备是否满足最低系统要求
- 确认 Webview 版本是否兼容
</details>

<details>
<summary><b>音乐无法播放</b></summary>

- 检查是否有音频焦点冲突
- 确认 API 能否正常获取音乐资源
- 检查音频播放权限是否已授予
- 尝试其他音乐平台的资源
</details>

<details>
<summary><b>登录失败</b></summary>

- 确认账号密码正确
- 检查网络连接是否稳定
- 确认身份验证 API 是否正常工作
- 清除应用数据后重试
</details>

## 📝 详细更新日志

### V1.0.2 (2025.06.02) - 性能优化版

#### 🎯 主要改进

- **后台播放革新**: 完全重写了后台自动播放机制
  - 优化平板设备的播放连续性
  - 修复手机端后台播放兼容性问题
  - 简化播放逻辑，提高稳定性
- **加载体验升级**:
  - 修复加载进度条不动画的问题
  - 增加渐变背景和 shimmer 动画效果
  - 优化加载过程的视觉反馈
- **代码结构优化**:
  - 大幅简化 `background-autoplay.js` (从 155 行减至约 100 行)
  - 重构 `input-combined-fix.js` (从 337 行减至约 120 行)
  - 移除过多的调试日志，提升性能

#### 🔧 技术改进

- 优化设备检测和适配机制
- 改进 Android WebView 的输入修复逻辑
- 简化事件监听和消息传递机制
- 保持核心功能完整，移除冗余复杂性

#### 🐛 问题修复

- ✅ 修复手机端后台自动播放失效问题
- ✅ 解决加载进度条直接跳到 100%的问题
- ✅ 改进中文输入法在 Android 设备上的支持
- ✅ 优化 iframe 消息传递的可靠性

#### 📱 移动端特别优化

- 针对不同 Android 版本的兼容性改进
- 优化触摸交互和手势识别
- 改进系统媒体控制集成
- 增强离线状态检测和重连机制

## 📊 版本历史

| 版本   | 日期       | 主要更新                                     |
| ------ | ---------- | -------------------------------------------- |
| v1.0.2 | 2025-06-02 | 性能优化，后台播放改进，代码结构优化         |
| v1.2.0 | 2025-05-15 | 增加离线模式、优化 UI 交互、修复界面刷新问题 |
| v1.1.0 | 2025-03-20 | 添加桌面小部件、改进播放控制、修复已知问题   |
| v1.0.0 | 2025-02-05 | 初始发布版本                                 |

## 📜 许可证

ISC License - 详见 [LICENSE](./LICENSE) 文件

## 👥 贡献者

感谢所有让这个项目成为可能的贡献者！

- UG 团队 - 核心开发
- 开源社区贡献者

## 📞 联系我们

- **问题反馈**: [GitHub Issues](https://github.com/username/UGOnlineMusicPlayer-Capacitor/issues)
- **电子邮件**: contact@example.com

---

<p align="center">
  UG音乐播放器 © 2025<br>
  音乐，随心而动
</p>
