# 轻松签 - iOS 证书自签工具

简单、快速、安全的 iOS 证书自签工具，支持 P12 证书在线签名、IPA 重签、UDID 一键获取，无需电脑，手机端即可完成全部操作。

## 功能特性

- 在线签名：上传 P12 证书 + 描述文件 + IPA，一键签名
- UDID 获取：通过描述文件一键获取设备 UDID，无需电脑
- 安装包下载：内置轻松签 App 安装包，可直接安装
- 签名教程：详细的图文教程，新手也能轻松上手（独立页面）
- 常见问题：FAQ 问答，解决使用中的各种问题（独立页面）
- 管理后台：查看签名记录、设备列表、统计数据
- 微信拦截：检测微信浏览器，提示用户用 Safari 打开
- 响应式设计：完美适配手机、平板、电脑
- SEO 优化：完整的 meta 标签、结构化数据

## 环境要求

- Node.js >= 16.0.0
- 服务器（推荐 Linux，如 CentOS/Ubuntu/Debian）
- 域名 + HTTPS 证书（UDID 获取必须 HTTPS）
- zsign（可选，用于实际 IPA 签名，见下文）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
# 默认端口 3000，默认管理员密码 admin123
npm start

# 自定义端口和密码
PORT=8080 ADMIN_PASSWORD=yourpassword npm start
```

### 3. 访问

- 首页：http://localhost:3000
- 管理后台：http://localhost:3000/admin
- 管理员密码：admin123（或你设置的 ADMIN_PASSWORD）

## 签名功能说明

### 默认模式（模拟签名）

项目默认使用模拟签名，上传文件后 3 秒返回结果（实际是复制原 IPA），**不会真正修改 IPA 签名**。这适用于测试界面和流程。

### 接入真实签名（zsign）

要实现真正的 IPA 重签名，需要安装 [zsign](https://github.com/zhlynn/zsign) 工具：

#### 安装 zsign

```bash
# Ubuntu/Debian
sudo apt-get install g++ make libssl-dev zlib1g-dev
git clone https://github.com/zhlynn/zsign.git
cd zsign
sudo make && sudo make install

# 验证安装
zsign --help
```

#### 修改 server.js

打开 `server.js`，找到 `executeSign` 函数，将模拟代码替换为：

```javascript
async function executeSign(taskId, p12Name, mpName, ipaName, password) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const p12Path = path.join(uploadDir, p12Name);
    const mpPath = path.join(uploadDir, mpName);
    const ipaPath = ipaName ? path.join(uploadDir, ipaName) : path.join(__dirname, 'downloads', 'esign_5.0.2_signed.ipa');
    const outputPath = path.join(signedDir, taskId + '.ipa');

    const cmd = `zsign -k "${p12Path}" -m "${mpPath}" -p "${password}" -o "${outputPath}" "${ipaPath}"`;

    exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else if (fs.existsSync(outputPath)) {
        resolve(taskId + '.ipa');
      } else {
        reject(new Error('签名失败，未生成输出文件'));
      }
    });
  });
}
```

## UDID 获取说明

UDID 获取功能**必须满足以下条件**：

1. **HTTPS**：必须通过 HTTPS 访问（iOS 要求描述文件必须来自安全连接）
2. **域名**：不能用 IP 地址，必须有域名
3. **端口**：建议使用 443 标准端口

### 工作原理

1. 用户点击「获取 UDID」按钮
2. 服务器动态生成描述文件（mobileconfig）
3. 用户安装描述文件
4. iOS 设备将 UDID 等信息 POST 到回调地址
5. 服务器记录 UDID 并跳转回首页显示

### 本地测试

本地测试 UDID 功能需要内网穿透工具（如 ngrok、frp）提供 HTTPS 域名。

## 宝塔面板部署

### 1. 安装 Node.js

在宝塔软件商店安装「PM2管理器」或「Node.js版本管理」。

### 2. 上传项目

将项目文件上传到服务器，如 `/www/wwwroot/sign.yourdomain.com`。

### 3. 安装依赖

```bash
cd /www/wwwroot/sign.yourdomain.com
npm install
```

### 4. PM2 启动

在 PM2 管理器中添加项目：
- 项目目录：`/www/wwwroot/sign.yourdomain.com`
- 启动文件：`server.js`
- 项目名称：`轻松签`

或命令行：

```bash
npm install -g pm2
pm2 start server.js --name "轻松签"
pm2 save
pm2 startup
```

### 5. 配置反向代理

在宝塔网站设置中添加反向代理：
- 代理名称：`轻松签`
- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host`

### 6. 配置 SSL

在宝塔 SSL 中申请 Let's Encrypt 证书并强制 HTTPS。

## 项目结构

```
ios-sign-page/
├── index.html          # 首页（签名 + UDID + 功能介绍）
├── tutorial.html       # 签名教程（独立页面）
├── faq.html            # 常见问题（独立页面）
├── admin.html          # 管理后台
├── server.js           # Node.js 后端服务
├── package.json        # 依赖配置
├── README.md           # 说明文档
├── .gitignore          # Git 忽略
├── assets/             # 静态资源
│   ├── logo.png        # 网站 Logo
│   ├── favicon.ico     # 浏览器图标
│   └── apple-touch-icon.png  # iOS 添加到主屏幕图标
├── downloads/          # 安装包目录
│   └── esign_5.0.2_signed.ipa  # 轻松签 App
├── uploads/            # 用户上传文件（自动创建）
├── signed/             # 签名后文件（自动创建）
└── data/               # 数据库目录（自动创建）
    └── sign.db         # SQLite 数据库
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/sign` | POST | 提交签名任务 |
| `/api/sign/status/:taskId` | GET | 查询签名状态 |
| `/api/sign/download/:taskId` | GET | 下载签名后的 IPA |
| `/api/udid/profile` | GET | 获取 UDID 描述文件 |
| `/api/udid/callback` | POST | UDID 回调（iOS 调用） |
| `/api/download/esign` | GET | 下载轻松签 App |
| `/api/admin/stats` | GET | 管理后台统计 |
| `/api/admin/tasks` | GET | 签名任务列表 |
| `/api/admin/devices` | GET | 设备列表 |
| `/api/admin/tasks/:id` | DELETE | 删除签名任务 |

## 安全建议

1. **修改管理员密码**：启动时设置 `ADMIN_PASSWORD` 环境变量
2. **HTTPS**：生产环境必须使用 HTTPS
3. **文件大小**：默认上传限制 200MB，可在 server.js 中修改
4. **定期清理**：定期清理 uploads 和 signed 目录中的旧文件
5. **备份数据**：定期备份 data/sign.db 数据库

## 常见问题

### 签名时提示「网络错误，请确认服务已启动」

- 确保后端服务已启动（`npm start`）
- 确保通过后端服务访问页面（http://localhost:3000），不要直接双击打开 HTML 文件
- 检查防火墙是否开放了对应端口

### UDID 获取无反应

- 确认使用 HTTPS 访问
- 确认使用 Safari 浏览器（微信内已被拦截提示）
- 确认域名正确，不是 IP 地址

### 安装后提示未受信任

到「设置 → 通用 → VPN与设备管理」中信任对应证书。

### 证书哪里买？

推荐购买渠道：https://puaaa.cn/shop/10.html

## 技术栈

- 前端：HTML + Tailwind CSS + 原生 JavaScript
- 后端：Node.js + Express
- 数据库：SQLite (better-sqlite3)
- 文件上传：Multer
- 签名工具：zsign（可选，需自行安装）

## 许可证

MIT License - 仅供学习交流使用

## 免责声明

本项目仅供学习交流使用，请勿用于非法用途。使用本工具签名的应用需遵守相关法律法规和 Apple 开发者协议。本站与 Apple Inc. 无任何关联。
