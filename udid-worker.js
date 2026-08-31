/**
 * 轻松签 - UDID 获取 Cloudflare Workers 脚本
 *
 * 部署方法：
 * 1. 访问 https://workers.cloudflare.com，用邮箱注册（免费，不需要信用卡）
 * 2. 点击 "Create a Worker"
 * 3. 把本文件全部内容复制粘贴到左侧编辑器
 * 4. 修改下面的 FRONTEND_URL 为你的 GitHub Pages 地址
 * 5. 点击 "Save and Deploy"
 * 6. 复制 Workers 地址（如 https://udid-getter.你的用户名.workers.dev）
 * 7. 把这个地址填到 GitHub 仓库的 config.js 中
 */

// ====== 配置区 ======
// 你的前端页面地址（GitHub Pages 地址），末尾不要加 /
const FRONTEND_URL = 'https://iosyyds.github.io/ios-sign-page';
// ====================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 生成并下载 UDID 描述文件
    if (url.pathname === '/profile' || url.pathname === '/') {
      const callbackUrl = `${url.origin}/callback`;
      const uuid = crypto.randomUUID();

      const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${callbackUrl}</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>PRODUCT</string>
      <string>MODEL</string>
      <string>VERSION</string>
    </array>
  </dict>
  <key>PayloadOrganization</key>
  <string>轻松签</string>
  <key>PayloadDisplayName</key>
  <string>获取设备UDID</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadUUID</key>
  <string>${uuid}</string>
  <key>PayloadIdentifier</key>
  <string>com.qs.sign.udid</string>
  <key>PayloadType</key>
  <string>Profile Service</string>
</dict>
</plist>`;

      return new Response(mobileconfig, {
        headers: {
          'Content-Type': 'application/x-apple-aspen-config',
          'Content-Disposition': 'attachment; filename="udid.mobileconfig"',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 接收 iOS 设备回调，解析 UDID 并重定向回前端
    if (url.pathname === '/callback' && request.method === 'POST') {
      const body = await request.text();

      const udidMatch = body.match(/<key>UDID<\/key>\s*<string>([^<]+)<\/string>/);
      const productMatch = body.match(/<key>PRODUCT<\/key>\s*<string>([^<]+)<\/string>/);
      const modelMatch = body.match(/<key>MODEL<\/key>\s*<string>([^<]+)<\/string>/);
      const versionMatch = body.match(/<key>VERSION<\/key>\s*<string>([^<]+)<\/string>/);

      if (udidMatch) {
        const udid = udidMatch[1];
        const product = productMatch ? productMatch[1] : '';
        const model = modelMatch ? modelMatch[1] : '';
        const version = versionMatch ? versionMatch[1] : '';

        const redirectUrl = `${FRONTEND_URL}/?udid=${encodeURIComponent(udid)}&product=${encodeURIComponent(product)}&model=${encodeURIComponent(model)}&version=${encodeURIComponent(version)}#udid`;

        return Response.redirect(redirectUrl, 301);
      }

      return new Response('无法获取 UDID，请重试', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 健康检查
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', frontend: FRONTEND_URL }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('轻松签 UDID 服务运行中。请访问 /profile 获取 UDID 描述文件。', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
