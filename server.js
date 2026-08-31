const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(dataDir, 'sign.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT UNIQUE NOT NULL,
    product TEXT DEFAULT '',
    model TEXT DEFAULT '',
    version TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    status INTEGER DEFAULT 0,
    used_udid TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT NOT NULL,
    code TEXT DEFAULT '',
    app_name TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT NOT NULL,
    cert_name TEXT DEFAULT '',
    p12_file TEXT DEFAULT '',
    mp_file TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_' + crypto.randomBytes(4).toString('hex') + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// UDID获取 - 生成描述文件
app.get('/api/udid/profile', (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const callbackUrl = `${protocol}://${host}/api/udid/callback`;
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
  <string>iOS签名工具</string>
  <key>PayloadDisplayName</key>
  <string>获取设备UDID</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadUUID</key>
  <string>${crypto.randomUUID()}</string>
  <key>PayloadIdentifier</key>
  <string>com.sign.udid</string>
  <key>PayloadType</key>
  <string>Profile Service</string>
</dict>
</plist>`;
  res.setHeader('Content-Type', 'application/x-apple-aspen-config');
  res.setHeader('Content-Disposition', 'attachment; filename="udid.mobileconfig"');
  res.send(mobileconfig);
});

// UDID回调
app.post('/api/udid/callback', (req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const udidMatch = body.match(/<key>UDID<\/key>\s*<string>([^<]+)<\/string>/);
      const productMatch = body.match(/<key>PRODUCT<\/key>\s*<string>([^<]+)<\/string>/);
      const modelMatch = body.match(/<key>MODEL<\/key>\s*<string>([^<]+)<\/string>/);
      const versionMatch = body.match(/<key>VERSION<\/key>\s*<string>([^<]+)<\/string>/);
      if (udidMatch) {
        const udid = udidMatch[1];
        const product = productMatch ? productMatch[1] : '';
        const model = modelMatch ? modelMatch[1] : '';
        const version = versionMatch ? versionMatch[1] : '';
        const stmt = db.prepare(`INSERT OR REPLACE INTO devices (udid, product, model, version, created_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM devices WHERE udid = ?), CURRENT_TIMESTAMP))`);
        stmt.run(udid, product, model, version, udid);
        res.redirect(301, `/?udid=${encodeURIComponent(udid)}`);
      } else {
        res.status(400).send('无法获取UDID');
      }
    } catch (e) {
      res.status(500).send('解析失败: ' + e.message);
    }
  });
});

app.get('/api/udid/check', (req, res) => {
  const { udid } = req.query;
  if (!udid) return res.json({ success: false, message: 'UDID不能为空' });
  const device = db.prepare('SELECT * FROM devices WHERE udid = ?').get(udid);
  res.json({ success: true, exists: !!device, device: device || null });
});

// 兑换码
app.post('/api/code/verify', (req, res) => {
  const { code, udid } = req.body;
  if (!code || !udid) return res.json({ success: false, message: '兑换码和UDID不能为空' });
  const codeRow = db.prepare('SELECT * FROM codes WHERE code = ?').get(code.trim().toUpperCase());
  if (!codeRow) return res.json({ success: false, message: '兑换码不存在' });
  if (codeRow.status === 1) return res.json({ success: false, message: '兑换码已被使用' });
  res.json({ success: true, message: '兑换码有效', code: codeRow.code });
});

app.post('/api/code/use', (req, res) => {
  const { code, udid, app_name } = req.body;
  if (!code || !udid) return res.json({ success: false, message: '兑换码和UDID不能为空' });
  const codeRow = db.prepare('SELECT * FROM codes WHERE code = ?').get(code.trim().toUpperCase());
  if (!codeRow) return res.json({ success: false, message: '兑换码不存在' });
  if (codeRow.status === 1) return res.json({ success: false, message: '兑换码已被使用' });
  const tx = db.transaction(() => {
    db.prepare('UPDATE codes SET status = 1, used_udid = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?').run(udid, codeRow.id);
    db.prepare('INSERT INTO records (udid, code, app_name, status) VALUES (?, ?, ?, ?)').run(udid, codeRow.code, app_name || '默认应用', 'processing');
    db.prepare('INSERT OR IGNORE INTO devices (udid) VALUES (?)').run(udid);
  });
  tx();
  res.json({ success: true, message: '兑换成功，正在准备安装...' });
});

// 历史查询
app.get('/api/history', (req, res) => {
  const { udid } = req.query;
  if (!udid) return res.json({ success: false, message: 'UDID不能为空' });
  const records = db.prepare('SELECT * FROM records WHERE udid = ? ORDER BY created_at DESC').all(udid);
  const device = db.prepare('SELECT * FROM devices WHERE udid = ?').get(udid);
  res.json({ success: true, device, records });
});

// 立即安装
app.post('/api/install', (req, res) => {
  const { udid, code } = req.body;
  if (!udid) return res.json({ success: false, message: '请先输入设备UDID' });
  db.prepare('INSERT OR IGNORE INTO devices (udid) VALUES (?)').run(udid);
  if (code) {
    const codeRow = db.prepare('SELECT * FROM codes WHERE code = ?').get(code.trim().toUpperCase());
    if (!codeRow) return res.json({ success: false, message: '兑换码不存在' });
    if (codeRow.status === 1) return res.json({ success: false, message: '兑换码已被使用' });
    const tx = db.transaction(() => {
      db.prepare('UPDATE codes SET status = 1, used_udid = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?').run(udid, codeRow.id);
      db.prepare('INSERT INTO records (udid, code, app_name, status) VALUES (?, ?, ?, ?)').run(udid, codeRow.code, '专业版应用', 'processing');
    });
    tx();
    return res.json({ success: true, message: '验证通过，正在准备安装包...' });
  }
  db.prepare('INSERT INTO records (udid, code, app_name, status) VALUES (?, ?, ?, ?)').run(udid, '', '免费版应用', 'processing');
  res.json({ success: true, message: '正在准备免费安装包...' });
});

// 自助安装
app.post('/api/self-install', upload.fields([
  { name: 'p12', maxCount: 1 },
  { name: 'mobileprovision', maxCount: 1 },
  { name: 'ipa', maxCount: 1 }
]), (req, res) => {
  const { udid, cert_name } = req.body;
  if (!udid) return res.json({ success: false, message: 'UDID不能为空' });
  const p12File = req.files['p12'] ? req.files['p12'][0].filename : '';
  const mpFile = req.files['mobileprovision'] ? req.files['mobileprovision'][0].filename : '';
  const ipaFile = req.files['ipa'] ? req.files['ipa'][0].filename : '';
  if (!p12File || !mpFile) return res.json({ success: false, message: '请上传P12证书和描述文件' });
  db.prepare('INSERT OR IGNORE INTO devices (udid) VALUES (?)').run(udid);
  db.prepare('INSERT INTO certificates (udid, cert_name, p12_file, mp_file) VALUES (?, ?, ?, ?)').run(udid, cert_name || '自定义证书', p12File, mpFile);
  db.prepare('INSERT INTO records (udid, code, app_name, status) VALUES (?, ?, ?, ?)').run(udid, '', cert_name || '自助安装', 'processing');
  res.json({ success: true, message: '证书上传成功，正在签名...', files: { p12: p12File, mobileprovision: mpFile, ipa: ipaFile } });
});

// 管理后台鉴权
function authAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false, message: '管理员密码错误' });
  next();
}

app.get('/api/admin/stats', authAdmin, (req, res) => {
  const devices = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
  const codesTotal = db.prepare('SELECT COUNT(*) as c FROM codes').get().c;
  const codesUsed = db.prepare('SELECT COUNT(*) as c FROM codes WHERE status = 1').get().c;
  const records = db.prepare('SELECT COUNT(*) as c FROM records').get().c;
  res.json({ success: true, stats: { devices, codesTotal, codesUsed, codesUnused: codesTotal - codesUsed, records } });
});

app.get('/api/admin/devices', authAdmin, (req, res) => {
  const devices = db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
  res.json({ success: true, devices });
});

app.get('/api/admin/codes', authAdmin, (req, res) => {
  const codes = db.prepare('SELECT * FROM codes ORDER BY created_at DESC').all();
  res.json({ success: true, codes });
});

app.post('/api/admin/codes', authAdmin, (req, res) => {
  const { count = 1, prefix = '' } = req.body;
  const num = Math.min(parseInt(count) || 1, 100);
  const generated = [];
  const insert = db.prepare('INSERT INTO codes (code) VALUES (?)');
  const tx = db.transaction(() => {
    for (let i = 0; i < num; i++) {
      let code;
      do { code = (prefix || '') + crypto.randomBytes(4).toString('hex').toUpperCase(); }
      while (db.prepare('SELECT id FROM codes WHERE code = ?').get(code));
      insert.run(code);
      generated.push(code);
    }
  });
  tx();
  res.json({ success: true, message: `成功生成${num}个兑换码`, codes: generated });
});

app.delete('/api/admin/codes/:id', authAdmin, (req, res) => {
  db.prepare('DELETE FROM codes WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

app.get('/api/admin/records', authAdmin, (req, res) => {
  const records = db.prepare('SELECT * FROM records ORDER BY created_at DESC LIMIT 200').all();
  res.json({ success: true, records });
});

app.get('/api/admin/certificates', authAdmin, (req, res) => {
  const certs = db.prepare('SELECT * FROM certificates ORDER BY created_at DESC').all();
  res.json({ success: true, certificates: certs });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  iOS签名工具服务已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  管理后台: http://localhost:${PORT}/admin`);
  console.log(`  管理员密码: ${ADMIN_PASSWORD}`);
  console.log(`========================================`);
});
