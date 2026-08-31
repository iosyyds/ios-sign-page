# 轻松签 - 证书自签工具

仿轻松签风格的 iOS 证书自签工具，使用 Soft UI 柔和界面设计，支持 P12 证书在线签名、安装包下载。

## 功能清单

### 前台（用户端）
- **证书自签**：上传 P12 证书 + 描述文件 + IPA，输入密码，一键签名
- **安装包下载**：提供轻松签 App IPA 安装包下载，附详细安装教程
- **拖拽上传**：所有文件上传区域支持拖拽操作
- **签名进度**：实时显示签名进度和状态
- **UDID 获取**：生成 iOS 描述文件，自动获取设备 UDID
- **响应式布局**：适配手机、平板、桌面端

### 后台（管理端）
- **数据统计**：签名任务总数、已完成、失败、注册设备数
- **签名任务管理**：查看所有签名任务，下载签名后的 IPA，删除任务
- **设备管理**：查看所有注册设备的 UDID、型号、系统版本

## 技术栈
- **后端**：Node.js + Express
- **数据库**：SQLite（better-sqlite3，无需额外安装）
- **前端**：原生 HTML + Tailwind CSS + JavaScript
- **设计风格**：Soft UI 柔和界面风

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 放置安装包（可选）
将轻松签 IPA 安装包放到 `downloads/` 目录，命名为 `esign_5.0.2_signed.ipa`

### 3. 启动服务
```bash
npm start
```
默认端口 3000，管理员密码 `admin123`。

自定义：
```bash
PORT=8080 ADMIN_PASSWORD=你的密码 npm start
```

### 4. 访问
- **前台页面**：http://localhost:3000
- **管理后台**：http://localhost:3000/admin （密码：admin123）

## 使用说明

### 证书签名
1. 点击「选择 P12 文件」上传你的 .p12 证书
2. 点击「选择描述文件」上传 .mobileprovision 文件
3. （可选）上传需要签名的 .ipa 文件
4. 输入 P12 证书密码
5. 点击「立即签名」，等待签名完成后下载结果

### 下载安装包
1. 在首页「轻松签 App」区域点击「下载安装包」
2. 用 iPhone 的 Safari 浏览器打开并下载
3. 到「设置 → 通用 → VPN与设备管理」中安装
4. 首次打开如提示未受信任，到设置中信任证书

### 管理后台
1. 访问 /admin 页面
2. 输入管理员密码登录
3. 查看签名任务统计和记录
4. 下载已完成的签名文件或删除任务

## 接入真实签名工具

当前版本使用模拟签名流程。如需真实签名，可在 `server.js` 的 `executeSign` 函数中接入 [zsign](https://github.com/zhlynn/zsign) 等开源签名工具：

```javascript
const { exec } = require('child_process');
const cmd = `zsign -k ${p12Path} -m ${mpPath} -p ${password} -o ${outputPath} ${ipaPath}`;
exec(cmd, (error, stdout, stderr) => {
  if (error) reject(error);
  else resolve(outputFile);
});
```

## 项目结构
```
ios-sign-page/
├── server.js          # 后端服务
├── package.json       # 依赖配置
├── index.html         # 前台签名页面
├── admin.html         # 管理后台
├── README.md          # 说明文档
├── .gitignore         # 忽略文件
├── downloads/         # 安装包目录（放置 esign_5.0.2_signed.ipa）
├── data/              # 数据库目录（自动创建）
│   └── sign.db
├── uploads/           # 上传文件目录（自动创建）
└── signed/            # 签名输出目录（自动创建）
```

## API 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/sign | 提交签名任务 |
| GET | /api/sign/status/:taskId | 查询签名状态 |
| GET | /api/sign/download/:taskId | 下载签名后的文件 |
| GET | /api/download/esign | 下载轻松签安装包 |
| GET | /api/udid/profile | 获取UDID描述文件 |
| POST | /api/udid/callback | UDID回调 |
| GET | /api/admin/stats | 后台统计 |
| GET | /api/admin/tasks | 签名任务列表 |
| DELETE | /api/admin/tasks/:id | 删除签名任务 |
| GET | /api/admin/devices | 设备列表 |

## 部署到服务器

### PM2（推荐）
```bash
npm install -g pm2
pm2 start server.js --name qiansongqian
pm2 save
pm2 startup
```

### Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 200M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 注意事项
1. UDID 获取和在线安装功能需要 HTTPS 环境（iOS 要求）
2. 上传文件大小限制为 200MB，可在 server.js 中调整
3. 数据库文件在 data/sign.db，备份时复制此文件即可
4. 默认管理员密码请及时修改
5. 仅供学习交流使用，请勿用于非法用途
