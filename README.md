# iOS签名工具网页

仿全能签风格的 iOS 签名工具客户端页面，纯前端实现，可直接部署。

## 功能

- 设备 UDID 输入与校验
- 立即安装 / 专业版入口
- 获取 UDID、购买证书兑换码、历史查询
- 我有证书 · 自助安装
- 右侧悬浮菜单（官网、教程、客服、开发者模式）
- 响应式布局，适配手机端

## 本地运行

直接用浏览器打开 `index.html` 即可，无需任何依赖。

或启动本地服务：

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

然后访问 http://localhost:8080

## GitHub Pages 部署

1. 进入仓库 Settings → Pages
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main`，目录选 `/ (root)`
4. 保存后等待约 1 分钟，访问 `https://<你的用户名>.github.io/ios-sign-page/`

## 说明

本页面为前端演示模板，实际的 UDID 获取、证书签名、应用安装等功能需要对接后端服务。按钮点击目前仅展示提示信息，可根据需要替换为真实接口调用。
