/**
 * 配置文件
 *
 * 【重要】部署完成后，需要修改下面的地址
 */

// ====== UDID 服务地址（Cloudflare Workers）======
// 部署 Cloudflare Workers 后，把地址填在这里，例如：
//   window.UDID_WORKER_URL = 'https://udid-getter.yourname.workers.dev';
// 部署教程见 README.md
window.UDID_WORKER_URL = '';

// ====== 后端 API 地址（可选，不需要后台功能可留空）======
// 如果你部署了 Node.js 后端（Render/服务器），把地址填在这里
// 如果只需要 UDID + 签名功能，留空即可（签名用纯前端模拟）
window.API_BASE_URL = '';
