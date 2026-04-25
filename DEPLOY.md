# EdgeOne Pages 部署指南

本项目已从 PHP 后端改造成 EdgeOne Pages Functions（JavaScript 边缘函数），可以**完全免费**部署到腾讯云 EdgeOne，无服务器、无带宽费用。

---

## 项目结构

```
UGOnlineMusicPlayer/
├── functions/                # ⭐ EdgeOne Pages Functions（边缘函数）
│   ├── api.js                # PHP 兼容入口 /api?types=xxx
│   ├── api/                  # RESTful 路径 /api/url、/api/pic 等
│   │   ├── url.js
│   │   ├── pic.js  lyric.js  search.js  playlist.js  comments.js
│   │   ├── userinfo.js  userlist.js  like.js  check_like.js
│   │   └── download.js
│   ├── _lib/                 # 公共库
│   │   ├── crypto.js         # AES-128-CBC + RSA-2048 (BigInt 实现)
│   │   ├── md5.js            # 纯 JS MD5 (酷狗依赖)
│   │   ├── cors.js           # CORS / 参数解析
│   │   ├── format.js         # 各源响应统一格式化
│   │   └── sources/          # 6 个音源 fetcher
│   │       ├── netease.js  tencent.js  kugou.js
│   │       ├── baidu.js  kuwo.js  xiami.js
│   │       └── index.js      # 6 源汇总入口
│   └── package.json          # type: module
├── index.html、css/、js/、images/、plugns/  # 静态前端（保持不变）
├── tests/                    # Node.js 单元/集成测试（不部署）
├── legacy-php/               # 原 PHP 代码（已归档，不部署）
└── DEPLOY.md                 # 本文档
```

---

## 部署到 EdgeOne Pages

### 前置条件

- 腾讯云账号（[https://cloud.tencent.com](https://cloud.tencent.com)）
- GitHub / GitLab / Gitee 仓库（推送本项目）

### 步骤

1. **推送代码到 Git 仓库**
   ```bash
   git push origin refactor/edge-function
   # 或合并到 main 后推送
   ```

2. **登录 EdgeOne Pages 控制台**
   - 国际版：[https://edgeone.ai/pages](https://edgeone.ai/pages)
   - 国内版：[https://console.cloud.tencent.com/edgeone/pages](https://console.cloud.tencent.com/edgeone/pages)

3. **创建项目**
   - 选择 "导入 Git 仓库"
   - 授权并选择你的仓库
   - 分支：`refactor/edge-function` 或 `main`

4. **构建配置**（无需构建框架，纯静态 + Functions）
   ```
   构建命令:    （留空）
   输出目录:    /
   根目录:      /
   ```

5. **部署**
   - 点击"开始部署"
   - 等待 1-2 分钟
   - 拿到分配的域名 `https://xxx.edgeone.app`

6. **绑定自定义域名（可选）**
   - 国内版需要 ICP 备案
   - 国际版无需备案

### 注意事项

| 项 | 说明 |
|----|------|
| Functions 入口约定 | `functions/<path>.js` 自动映射到 `/<path>`，例如 `functions/api/url.js` → `/api/url` |
| ESM 支持 | `functions/package.json` 已声明 `type: module`，全部用 ESM 语法 |
| 函数大小限制 | 单文件 < 5MB（实际整个 functions 目录约 30KB，远低于上限） |
| 函数超时 | 默认 30 秒，下载大文件 `/api/download?direct=1` 流式传输需注意 |
| 调用次数 | 免费 100 万次/月（覆盖个人项目绰绰有余） |

---

## 本地开发与测试

### 跑单元测试（推荐先跑一遍验证）

```bash
cd UGOnlineMusicPlayer
node tests/crypto.test.js      # 18 个加密测试（含 PHP 黄金 vector）
node tests/md5.test.js         # 11 个 MD5 测试（RFC 1321 标准）
node tests/url.test.js         # 11 个 url 路由测试
node tests/sources.test.js     # 29 个 6 源结构测试
node tests/endpoints.test.js   # 30 个 endpoint 综合测试
node tests/api-compat.test.js  # 18 个 PHP 兼容入口测试
```

**累计 117 个测试，全部通过即可放心部署**。

### 浏览器集成测试

部署后访问 `https://你的域名/test-edge.html`，点击各按钮验证 endpoint 是否正常工作。

### 本地模拟（可选）

EdgeOne Pages 没有官方本地 CLI，但因为代码是标准 Web API，可以用 Cloudflare 的 `wrangler` 模拟（功能等价）：

```bash
npm install -g wrangler
cd UGOnlineMusicPlayer
wrangler pages dev . --compatibility-date=2024-01-01
# 访问 http://localhost:8788
```

---

## 架构变更要点

### 砍掉的功能（原 PHP 有但新版没有）

- `cache/` 目录（边缘函数无文件系统）→ 浏览器自带 HTTP 缓存
- `temp/` 服务器缓存下载（`download direct=0` 模式）→ 改为前端直拉
- `cron` 缓存清理 → 不需要
- PHP `$_SESSION` → 改用前端 `localStorage`

### 保留的功能

- ✅ 6 个音源切换：netease / tencent / kugou / baidu / kuwo（xiami 已停服占位）
- ✅ 网易云 weapi 加密（AES + RSA）100% 等价 PHP
- ✅ 第三方 API 优先 + 失败本地兜底
- ✅ 我喜欢功能（cookie 改走 localStorage）
- ✅ 评论、歌词、歌单、用户信息全部支持
- ✅ 歌曲下载（`direct=1` 流式 / `direct=0` 直链）

### 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 边缘平台 | EdgeOne Pages | 国内访问快、100 万次/月免费 |
| 加密库 | Web Crypto API + 纯 JS BigInt | 零依赖、兼容 V8 isolate |
| MD5 | 自实现 RFC 1321 (~80 行) | Web Crypto 已弃用 MD5 |
| 路由 | 文件式 `functions/api/*.js` | EdgeOne / Cloudflare Pages 标准 |
| 兼容 | `/api?types=xxx` PHP 入口 | 前端只需改 1 行 mkPlayer.api |

---

## Meting 第三方代理说明

`/api/url` 默认返回的不是网易云的真实 CDN 链接，而是 Meting 公益代理的 URL：

| 代理 | 地址 | 特点 |
|------|------|------|
| **主选** ⭐ | `https://api.qijieya.cn/meting/` | **支持解析网易云 VIP 歌曲**（参考 [qijieya.cn/archives/service](https://qijieya.cn/archives/service)） |
| **备用** | `https://api.injahow.cn/meting/` | [injahow/meting-api](https://github.com/injahow/meting-api) 官方实例 |

**调用策略**：80% 流量走主选（qijieya），20% 流量走备用（保活）。如果代理挂了，前端 [js/ajax.js](js/ajax.js) 的 `retryWithLocalSource` 会自动切到 `?use_local=1` 走加密的官方接口。

**如果想改主选**：编辑 [functions/api/url.js](functions/api/url.js) 的 `PROXY_PRIMARY` / `PROXY_FALLBACK` 常量。

---

## 故障排查

### Q: 部署后页面打不开？
A: 检查根目录是否有 `index.html`，EdgeOne Pages 默认从根目录读取。

### Q: API 调用返回 500？
A: 在 EdgeOne Pages 控制台查看 Functions 日志，常见原因：
- 网易云 cookie 过期 → 重新登录获取新 cookie
- 上游 API 风控 → Worker 出口 IP 被封，等几小时或换源

### Q: `like` / `check_like` 返回 401？
A: 这是预期的，前端必须带上 `localStorage` 里存的网易云 cookie：
```js
$.ajax({
  url: '/api?types=like',
  method: 'POST',
  data: 'id=123&like=1&cookie=' + encodeURIComponent(localStorage.getItem('netease_cookie'))
});
```
项目原有 `js/custom/like.js` 已经实现这个流程。

### Q: 想本地跑 PHP 版调试？
A: 进入 `legacy-php/` 目录，运行 `docker-compose up -d` 即可（旧 docker-compose.yml 已归档到此处）。

---

## 测试覆盖率（截至发布）

| 测试文件 | 测试数 | 覆盖 |
|---------|--------|------|
| crypto.test.js | 18 | RSA、AES、neteaseEncrypt、baiduEncrypt、随机密钥 |
| md5.test.js | 11 | RFC 1321 全部标准 vector + UTF-8 + 二进制 |
| url.test.js | 11 | url endpoint 路由 + 参数校验 + obdo.cc 默认路径 |
| sources.test.js | 29 | 6 源 × 4 方法 exports 完整性 + 占位行为 |
| endpoints.test.js | 30 | 11 endpoint × OPTIONS/参数/未知源/Cookie 鉴权 |
| api-compat.test.js | 18 | PHP `?types=xxx` 派发 + POST body 正确转发 |
| **合计** | **117** | **全部通过** ✅ |

> 注：联网类测试（真实调网易云/QQ 接口）未在自动化测试中跑，需部署到 EdgeOne 后通过 `test-edge.html` 进行回归。

---

## 后续维护

- 新增音源：在 `functions/_lib/sources/` 加文件，并在 `index.js` 注册
- 修改加密：`functions/_lib/crypto.js` + 跑 `node tests/crypto.test.js` 确保 PHP 黄金 vector 仍通过
- 增加 endpoint：在 `functions/api/` 加文件，并在 `functions/api.js` 的 `ROUTES` 注册
