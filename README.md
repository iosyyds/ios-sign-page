# 轻松签 - iOS 证书自签工具

简单、快速、安全的 iOS 证书自签工具，支持 P12 证书在线签名、UDID 一键获取，无需电脑，手机端即可完成全部操作。

## 功能特性

- 在线签名：上传 P12 证书 + 描述文件 + IPA，一键签名（纯前端模拟，不需要后端）
- UDID 获取：通过 Cloudflare Workers 一键获取设备 UDID，无需电脑
- 安装包下载：内置轻松签 App 安装包，可直接安装
- 签名教程：详细的图文教程（独立页面）
- 常见问题：FAQ 问答（独立页面）
- 微信拦截：检测微信浏览器，提示用户用 Safari 打开
- 响应式设计：完美适配手机、平板、电脑

## 架构说明

| 部分 | 部署位置 | 说明 |
|------|----------|------|
| 前端页面 | GitHub Pages（免费） | 静态 HTML，签名功能纯前端模拟 |
| UDID 服务 | Cloudflare Workers（免费） | 生成描述文件、接收 iOS 回调、返回 UDID |

> 签名功能为前端模拟（上传后返回原 IPA），如需真正的 IPA 重签名，需要部署 Node.js 后端并安装 zsign 工具（见文末）。

---

## 快速部署（5分钟，完全免费）

### 第一步：上传代码到 GitHub

1. 在 GitHub 创建一个新仓库（如 `ios-sign-page`）
2. 把本项目所有文件上传到仓库
3. 确保仓库中有 `udid-worker.js`、`config.js`、`index.html` 等文件

### 第二步：启用 GitHub Pages（前端）

1. 进入仓库 → Settings → Pages
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main` / `root`，点击 Save
4. 等待 1-2 分钟，获得前端地址，如：`https://你的用户名.github.io/ios-sign-page/`

### 第三步：部署 UDID 服务到 Cloudflare Workers（免费）

1. 访问 **[workers.cloudflare.com](https://workers.cloudflare.com)**，用邮箱注册（免费，不需要信用卡）
2. 登录后点击 **Create a Worker**
3. 打开本项目中的 `udid-worker.js` 文件，**全选复制**全部内容
4. 回到 Cloudflare Workers 编辑器，**全选删除**左侧默认代码，**粘贴**你复制的代码
5. 修改代码中的 `FRONTEND_URL` 为你的 GitHub Pages 地址（第二步获得的地址，末尾不要加 `/`）
   ```javascript
   const FRONTEND_URL = 'https://你的用户名.github.io/ios-sign-page';
   ```
6. 点击 **Save and Deploy**
7. 部署成功后，复制 Workers 地址，格式如：`https://udid-getter.你的用户名.workers.dev`

### 第四步：配置前端连接 UDID 服务

1. 打开 GitHub 仓库中的 `config.js` 文件
2. 把第三步获得的 Workers 地址填入：
   ```javascript
   window.UDID_WORKER_URL = 'https://udid-getter.你的用户名.workers.dev';
   ```
3. 提交更改，等待 GitHub Pages 自动更新（1-2 分钟）

### 第五步：验证

1. 打开前端地址（GitHub Pages）
2. 安装包下载 → 直接可用
3. 立即签名 → 上传证书后前端模拟签名，完成后可下载
4. 获取 UDID → 用 iPhone Safari 打开，点击按钮下载描述文件，安装后自动返回显示 UDID

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 首页（签名 + UDID + 功能介绍） |
| `tutorial.html` | 签名教程（独立页面） |
| `faq.html` | 常见问题（独立页面） |
| `config.js` | **配置文件（部署后必须修改 UDID_WORKER_URL）** |
| `udid-worker.js` | **Cloudflare Workers 脚本（部署 UDID 服务用）** |
| `assets/` | logo、favicon 等静态资源 |
| `downloads/` | 轻松签 App 安装包 |
| `server.js` | Node.js 后端（可选，需要真正签名和管理后台时用） |
| `admin.html` | 管理后台（可选，需要 server.js 后端） |
| `render.yaml` | Render 部署配置（可选） |

---

## 关于签名功能

当前版本的签名是**纯前端模拟**：
- 上传 P12 证书、描述文件、IPA 后，前端显示签名进度动画
- 3 秒后完成，下载的是你上传的原 IPA（或默认轻松签 IPA）
- **不会真正修改 IPA 的签名**

这适用于：
- 测试界面和流程
- 展示用途
- 已经通过其他方式签好名，只需要分发

### 如需真正的 IPA 重签名

需要部署 Node.js 后端并安装 zsign 工具：
1. 部署 `server.js` 到支持 Node.js 的服务器（Render、VPS 等）
2. 在服务器安装 zsign：`sudo apt-get install g++ make libssl-dev && git clone https://github.com/zhlynn/zsign.git && cd zsign && sudo make install`
3. 修改 `server.js` 中的 `executeSign` 函数，把模拟代码替换为 zsign 调用（代码中有注释示例）
4. 在 `config.js` 中填入后端地址：`window.API_BASE_URL = 'https://你的后端地址'`

---

## UDID 获取原理

1. 用户点击「获取 UDID」按钮
2. Cloudflare Worker 生成一个 iOS 描述文件（mobileconfig）
3. 用户安装描述文件
4. iOS 设备把 UDID、型号、系统版本等信息 POST 到 Worker 的回调地址
5. Worker 解析 UDID，重定向回前端页面，把 UDID 放在 URL 参数中
6. 前端页面读取 URL 参数，显示 UDID 并提供复制功能

> UDID 获取必须用 iPhone 的 Safari 浏览器，微信内会被拦截提示。必须通过 HTTPS 访问（GitHub Pages 和 Cloudflare Workers 都自动提供 HTTPS）。

---

## 常见问题

### Q: 部署后 UDID 还是提示未配置？
A: 检查 `config.js` 中的 `UDID_WORKER_URL` 是否正确填写，是否带 `https://`，末尾不要加 `/`。然后硬刷新页面（Ctrl+Shift+R）。

### Q: UDID 点击后没反应？
A: 必须用 iPhone 的 Safari 浏览器，微信内会被拦截。且必须通过 HTTPS 访问。

### Q: 签名后下载的 IPA 和原来的一样？
A: 是的，当前版本是前端模拟签名，不会真正修改 IPA。如需真正签名，见上方「如需真正的 IPA 重签名」。

### Q: Cloudflare Workers 免费吗？
A: 完全免费，每天 10 万次请求额度，不需要信用卡。个人使用完全够用。

### Q: 管理后台怎么用？
A: 管理后台（admin.html）需要部署 Node.js 后端（server.js）才能使用。如果你只需要 UDID 和签名功能，不需要管理后台。

---

## 技术栈

- 前端：HTML + Tailwind CSS + 原生 JavaScript
- UDID 服务：Cloudflare Workers（JavaScript）
- 可选后端：Node.js + Express + SQLite
- 可选签名工具：zsign

---

## 免责声明

本项目仅供学习交流使用，请勿用于非法用途。使用本工具签名的应用需遵守相关法律法规和 Apple 开发者协议。本站与 Apple Inc. 无任何关联。
