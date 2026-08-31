# iOS签名工具 - 全栈版

仿全能签风格的 iOS 签名工具完整全栈应用，所有功能均可真实使用。

## 功能清单

### 前台（用户端）
- **获取设备UDID**：生成 iOS 描述文件，设备安装后自动回调获取 UDID、产品型号、系统版本
- **立即安装**：支持免费安装和兑换码专业版安装
- **兑换码系统**：验证、使用兑换码，记录使用设备和时间
- **历史查询**：按 UDID 查询所有安装记录和状态
- **自助安装**：上传 P12 证书 + 描述文件（可选 IPA），提交签名
- **设备识别**：从描述文件回调后自动填充 UDID 并显示设备信息
- **响应式布局**：适配手机和电脑端

### 后台（管理端）
- **数据统计**：设备数、兑换码总数、已使用/未使用、安装记录数
- **设备管理**：查看所有注册设备的 UDID、型号、系统版本、注册时间
- **兑换码管理**：批量生成兑换码（支持前缀）、查看状态、删除未使用兑换码、一键复制
- **安装记录**：查看所有安装请求，含 UDID、应用名、兑换码、状态、时间
- **证书管理**：查看用户上传的证书文件

## 技术栈
- **后端**：Node.js + Express
- **数据库**：SQLite（better-sqlite3，无需额外安装数据库）
- **前端**：原生 HTML/CSS/JavaScript，无框架依赖
- **文件上传**：Multer

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务
```bash
npm start
```
默认端口 3000，管理员密码 `admin123`。

自定义端口和密码：
```bash
PORT=8080 ADMIN_PASSWORD=yourpassword npm start
```

### 3. 访问
- **前台页面**：http://localhost:3000
- **管理后台**：http://localhost:3000/admin （密码：admin123）

## 使用说明

### 获取 UDID（必须用 iOS 设备的 Safari 浏览器）
1. 用 iPhone/iPad 的 Safari 打开网站
2. 点击「获取UDID」按钮
3. 系统会提示安装描述文件，点击允许
4. 到「设置 → 通用 → VPN与设备管理」中安装描述文件
5. 安装后自动跳回网站，UDID 已自动填充

### 生成兑换码
1. 登录管理后台 `/admin`
2. 进入「兑换码管理」
3. 输入生成数量（1-100）和可选前缀
4. 点击「生成兑换码」，可一键复制

### 自助安装
1. 输入设备 UDID
2. 点击「我有证书 | 自助安装」
3. 上传 P12 证书文件和 .mobileprovision 描述文件
4. 可选上传 IPA 安装包
5. 点击「开始签名」

## 项目结构
```
ios-sign-page/
├── server.js          # 后端服务（所有API）
├── package.json       # 依赖配置
├── index.html         # 前台用户页面
├── admin.html         # 管理后台页面
├── README.md          # 说明文档
├── .gitignore         # 忽略文件
├── data/              # 数据库目录（自动创建）
│   └── sign.db        # SQLite数据库
└── uploads/           # 上传文件目录（自动创建）
```

## API 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/udid/profile | 下载UDID描述文件 |
| POST | /api/udid/callback | 设备回调接收UDID |
| GET | /api/udid/check | 检查UDID是否注册 |
| POST | /api/code/verify | 验证兑换码 |
| POST | /api/code/use | 使用兑换码 |
| GET | /api/history | 查询安装历史 |
| POST | /api/install | 提交安装请求 |
| POST | /api/self-install | 自助安装（上传证书） |
| GET | /api/admin/stats | 后台统计 |
| GET | /api/admin/devices | 设备列表 |
| GET/POST | /api/admin/codes | 兑换码列表/生成 |
| DELETE | /api/admin/codes/:id | 删除兑换码 |
| GET | /api/admin/records | 安装记录 |
| GET | /api/admin/certificates | 证书列表 |

## 部署到服务器

### 使用 PM2（推荐）
```bash
npm install -g pm2
pm2 start server.js --name ios-sign
pm2 save
pm2 startup
```

### 使用 Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 注意事项
1. **UDID 获取功能**必须在 iOS 设备的 Safari 浏览器中使用，且需要 HTTPS（本地测试可用 HTTP）
2. 实际的 IPA 重签名需要额外配置签名工具（如 zsign），当前版本记录签名请求并保存证书文件，可在此基础上接入签名脚本
3. 数据库文件在 `data/sign.db`，备份时复制此文件即可
4. 上传的证书文件保存在 `uploads/` 目录，请注意安全
5. 默认管理员密码请及时修改
