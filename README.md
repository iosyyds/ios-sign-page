# 轻松签 - iOS 证书自签工具

简单、快速、安全的 iOS 证书自签工具，支持 P12 证书在线签名、IPA 重签、UDID 一键获取，无需电脑，手机端即可完成全部操作。

## 架构说明

本项目采用 **前后端分离** 架构：

| 部分 | 部署位置 | 说明 |
|------|----------|------|
| 前端页面 | GitHub Pages（免费） | 静态 HTML 页面，用户直接访问 |
| 后端 API | Render（免费） | Node.js 服务，处理签名、UDID、管理后台 |
| 数据库 | SQLite（Render 磁盘） | 存储签名记录、设备 UDID |

> **为什么不能只放 GitHub Pages？** GitHub Pages 是纯静态托管，无法运行 Node.js 后端，所以签名和 UDID 功能会 404。必须额外部署一个后端服务。

---

## 快速部署（5分钟完成）

### 第一步：上传代码到 GitHub

1. 在 GitHub 创建一个新仓库（如 `ios-sign-page`）
2. 把本项目所有文件上传到仓库
3. 确保仓库中有 `render.yaml`、`server.js`、`config.js` 等文件

### 第二步：启用 GitHub Pages（前端）

1. 进入仓库 → Settings → Pages
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main` / `root`，点击 Save
4. 等待 1-2 分钟，获得前端地址，如：`https://你的用户名.github.io/ios-sign-page/`

### 第三步：部署后端到 Render（免费）

1. 访问 [render.com](https://render.com)，用 GitHub 账号登录（无需信用卡）
2. 点击右上角 **New +** → **Web Service**
3. 选择你刚才创建的 GitHub 仓库，点击 **Connect**
4. Render 会自动识别 `render.yaml` 配置，确认以下信息：
   - Name: `ios-sign-server`（可自定义）
   - Region: 选 Oregon（默认）
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: **Free**（免费）
5. 点击 **Create Web Service**，等待部署完成（约 2-3 分钟）
6. 部署成功后，获得后端地址，如：`https://ios-sign-server.onrender.com`

> **注意**：Render 免费套餐 15 分钟无请求会自动休眠，下次首次访问需等待约 30 秒。个人使用完全够用。

### 第四步：配置前端连接后端

1. 打开 GitHub 仓库中的 `config.js` 文件
2. 把 Render 的后端地址填入：
   ```javascript
   window.API_BASE_URL = 'https://ios-sign-server.onrender.com';
   ```
   （把地址换成你自己的）
3. 提交更改，等待 GitHub Pages 自动更新（1-2 分钟）

### 第五步：验证

1. 打开前端地址（GitHub Pages）
2. 点击「获取 UDID」→ 应该能下载描述文件（不再 404）
3. 上传证书点击「立即签名」→ 应该能正常提交（不再网络错误）
4. 访问 `https://你的后端地址/admin` → 管理后台（默认密码 `admin123`）

---

## 管理后台

- 地址：`https://你的后端地址/admin`
- 默认密码：`admin123`
- 功能：查看签名记录、设备 UDID 列表、统计数据、删除任务

### 修改管理员密码

在 Render 后台 → 你的服务 → Environment → 添加环境变量：
- Key: `ADMIN_PASSWORD`
- Value: 你的新密码

保存后重新部署即可。

---

## 真实签名（可选）

默认使用模拟签名（返回原 IPA）。要实现真正的 IPA 重签名，需要在 Render 上安装 `zsign` 工具。

由于 Render 免费套餐的构建环境限制，建议：
1. 升级到 Render 付费套餐（$7/月），或
2. 部署到自己的 VPS（宝塔面板），参考下方「VPS 部署」

在 VPS 上安装 zsign：
```bash
sudo apt-get install g++ make libssl-dev zlib1g-dev
git clone https://github.com/zhlynn/zsign.git
cd zsign && sudo make && sudo make install
```

然后修改 `server.js` 中的 `executeSign` 函数，把模拟代码替换为 zsign 调用（代码中有注释示例）。

---

## VPS 部署（备选方案）

如果你有自己的服务器，也可以全部部署在一台服务器上：

```bash
# 1. 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 上传代码到服务器，安装依赖
cd /www/wwwroot/sign.yourdomain.com
npm install

# 3. 用 PM2 启动
npm install -g pm2
pm2 start server.js --name "轻松签"
pm2 save && pm2 startup

# 4. Nginx 反向代理 + SSL 证书（宝塔面板一键配置）
```

这种方式下 `config.js` 中的 `API_BASE_URL` 留空即可（前后端同域）。

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 首页（签名 + UDID + 功能介绍） |
| `tutorial.html` | 签名教程（独立页面） |
| `faq.html` | 常见问题（独立页面） |
| `admin.html` | 管理后台 |
| `config.js` | **后端 API 地址配置（部署后必须修改）** |
| `server.js` | Node.js 后端服务 |
| `render.yaml` | Render 一键部署配置 |
| `package.json` | 依赖配置 |
| `assets/` | logo、favicon 等静态资源 |
| `downloads/` | 轻松签 App 安装包 |

---

## 常见问题

### Q: 部署后签名还是提示网络错误？
A: 检查 `config.js` 中的后端地址是否正确，是否带 `https://`，末尾不要加 `/`。然后硬刷新页面（Ctrl+Shift+R）。

### Q: UDID 获取点击后没反应？
A: UDID 获取必须用 iPhone 的 Safari 浏览器，微信内会被拦截提示。且必须通过 HTTPS 访问。

### Q: Render 部署失败怎么办？
A: 在 Render 后台查看日志，常见原因：
- Node 版本不兼容 → 在 Environment 中添加 `NODE_VERSION=18.18.0`
- 依赖安装失败 → 手动在 Shell 中执行 `npm install` 查看错误

### Q: 免费套餐够用吗？
A: 个人使用完全够用。免费套餐有 750 小时/月的运行时间（单实例刚好够一个月），15 分钟无请求休眠。

### Q: 数据会丢失吗？
A: Render 免费套餐的磁盘是临时的，重启后数据可能丢失。建议：
- 定期在管理后台导出数据
- 或升级到付费套餐获得持久化磁盘

---

## 技术栈

- 前端：HTML + Tailwind CSS + 原生 JavaScript
- 后端：Node.js + Express
- 数据库：SQLite (better-sqlite3)
- 文件上传：Multer
- 部署：GitHub Pages + Render
- 签名工具：zsign（可选，需自行安装）

---

## 免责声明

本项目仅供学习交流使用，请勿用于非法用途。使用本工具签名的应用需遵守相关法律法规和 Apple 开发者协议。本站与 Apple Inc. 无任何关联。
