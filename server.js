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

// 目录初始化
const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'uploads');
const signedDir = path.join(__dirname, 'signed');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(signedDir)) fs.mkdirSync(signedDir, { recursive: true });

// 数据库
const db = new Database(path.join(dataDir, 'sign.db'));
db.pragma('journal_mode = WAL');

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS sign_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT UNIQUE NOT NULL,
    p12_file TEXT DEFAULT '',
    mp_file TEXT DEFAULT '',
    ipa_file TEXT DEFAULT '',
    output_file TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    error_msg TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    udid TEXT UNIQUE NOT NULL,
    product TEXT DEFAULT '',
    model TEXT DEFAULT '',
    version TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_' + crypto.randomBytes(4).toString('hex') + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// ============ 签名 API ============

app.post('/api/sign', upload.fields([
  { name: 'p12', maxCount: 1 },
  { name: 'mobileprovision', maxCount: 1 },
  { name: 'ipa', maxCount: 1 }
]), async (req, res) => {
  const { password } = req.body;
  const p12File = req.files['p12'] ? req.files['p12'][0] : null;
  const mpFile = req.files['mobileprovision'] ? req.files['mobileprovision'][0] : null;
  const ipaFile = req.files['ipa'] ? req.files['ipa'][0] : null;

  if (!p12File) return res.json({ success: false, message: '请上传 P12 证书文件' });
  if (!mpFile) return res.json({ success: false, message: '请上传描述文件' });
  if (!password) return res.json({ success: false, message: '请输入 P12 证书密码' });

  const taskId = crypto.randomBytes(8).toString('hex');

  // 记录任务
  db.prepare(`INSERT INTO sign_tasks (task_id, p12_file, mp_file, ipa_file, status) VALUES (?, ?, ?, ?, 'processing')`)
    .run(taskId, p12File.filename, mpFile.filename, ipaFile ? ipaFile.filename : '');

  // 执行签名（异步）
  executeSign(taskId, p12File.filename, mpFile.filename, ipaFile ? ipaFile.filename : null, password)
    .then(outputFile => {
      db.prepare(`UPDATE sign_tasks SET status = 'done', output_file = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?`)
        .run(outputFile, taskId);
    })
    .catch(err => {
      db.prepare(`UPDATE sign_tasks SET status = 'failed', error_msg = ?, completed_at = CURRENT_TIMESTAMP WHERE task_id = ?`)
        .run(err.message, taskId);
    });

  // 立即返回（前端会显示进度动画）
  // 实际签名在后台执行，前端可以通过 /api/sign/status 查询
  res.json({
    success: true,
    message: '签名任务已提交，正在处理...',
    task_id: taskId,
    download_url: `/api/sign/download/${taskId}`
  });
});

// 查询签名状态
app.get('/api/sign/status/:taskId', (req, res) => {
  const task = db.prepare('SELECT * FROM sign_tasks WHERE task_id = ?').get(req.params.taskId);
  if (!task) return res.json({ success: false, message: '任务不存在' });
  res.json({
    success: true,
    status: task.status,
    message: task.error_msg || '',
    download_url: task.status === 'done' ? `/api/sign/download/${task.task_id}` : null
  });
});

// 下载签名后的文件
app.get('/api/sign/download/:taskId', (req, res) => {
  const task = db.prepare('SELECT * FROM sign_tasks WHERE task_id = ?').get(req.params.taskId);
  if (!task || task.status !== 'done' || !task.output_file) {
    return res.status(404).send('文件不存在或签名未完成');
  }
  const filePath = path.join(signedDir, task.output_file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('文件不存在');
  }
  res.download(filePath, `signed_${task.task_id}.ipa`);
});

// 签名执行函数（预留接入 zsign 等工具）
async function executeSign(taskId, p12Name, mpName, ipaName, password) {
  return new Promise((resolve, reject) => {
    // 模拟签名过程（实际使用时替换为 zsign 调用）
    // 示例：
    // const { exec } = require('child_process');
    // const cmd = `zsign -k ${path.join(uploadDir, p12Name)} -m ${path.join(uploadDir, mpName)} -p ${password} -o ${path.join(signedDir, taskId + '.ipa')} ${path.join(uploadDir, ipaName)}`;
    // exec(cmd, (error, stdout, stderr) => { ... });

    setTimeout(() => {
      // 如果有IPA文件，复制一份作为签名结果（模拟）
      let outputFile = '';
      if (ipaName) {
        const src = path.join(uploadDir, ipaName);
        const dest = path.join(signedDir, taskId + '.ipa');
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          outputFile = taskId + '.ipa';
        }
      }
      // 没有IPA则生成一个占位文件
      if (!outputFile) {
        outputFile = taskId + '.txt';
        fs.writeFileSync(path.join(signedDir, outputFile), `签名任务 ${taskId} 已完成\nP12: ${p12Name}\n描述文件: ${mpName}\n时间: ${new Date().toISOString()}`);
      }
      resolve(outputFile);
    }, 3000); // 模拟3秒签名时间
  });
}

// ============ UDID 获取（保留） ============

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
    <array><string>UDID</string><string>PRODUCT</string><string>MODEL</string><string>VERSION</string></array>
  </dict>
  <key>PayloadOrganization</key><string>轻松签</string>
  <key>PayloadDisplayName</key><string>获取设备UDID</string>
  <key>PayloadVersion</key><integer>1</integer>
  <key>PayloadUUID</key><string>${crypto.randomUUID()}</string>
  <key>PayloadIdentifier</key><string>com.qs.sign.udid</string>
  <key>PayloadType</key><string>Profile Service</string>
</dict>
</plist>`;
  res.setHeader('Content-Type', 'application/x-apple-aspen-config');
  res.setHeader('Content-Disposition', 'attachment; filename="udid.mobileconfig"');
  res.send(mobileconfig);
});

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
        db.prepare(`INSERT INTO devices (udid, product, model, version) VALUES (?, ?, ?, ?)
          ON CONFLICT(udid) DO UPDATE SET product = excluded.product, model = excluded.model, version = excluded.version`).run(udid, product, model, version);
        res.redirect(301, `/?udid=${encodeURIComponent(udid)}`);
      } else {
        res.status(400).send('无法获取UDID');
      }
    } catch (e) {
      res.status(500).send('解析失败');
    }
  });
});

// ============ 管理后台 ============

function authAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: '管理员密码错误' });
  }
  next();
}

app.get('/api/admin/stats', authAdmin, (req, res) => {
  const totalTasks = db.prepare('SELECT COUNT(*) as c FROM sign_tasks').get().c;
  const doneTasks = db.prepare('SELECT COUNT(*) as c FROM sign_tasks WHERE status = ?').get('done').c;
  const failedTasks = db.prepare('SELECT COUNT(*) as c FROM sign_tasks WHERE status = ?').get('failed').c;
  const devices = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
  res.json({
    success: true,
    stats: { totalTasks, doneTasks, failedTasks, pendingTasks: totalTasks - doneTasks - failedTasks, devices }
  });
});

app.get('/api/admin/tasks', authAdmin, (req, res) => {
  const tasks = db.prepare('SELECT * FROM sign_tasks ORDER BY created_at DESC LIMIT 200').all();
  res.json({ success: true, tasks });
});

app.get('/api/admin/devices', authAdmin, (req, res) => {
  const devices = db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
  res.json({ success: true, devices });
});

app.delete('/api/admin/tasks/:id', authAdmin, (req, res) => {
  db.prepare('DELETE FROM sign_tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

// ============ 安装包下载 ============

app.get('/api/download/esign', (req, res) => {
  const filePath = path.join(__dirname, 'downloads', 'esign_5.0.2_signed.ipa');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('安装包不存在，请联系管理员');
  }
  res.download(filePath, 'esign_5.0.2_signed.ipa');
});

// ============ 页面路由 ============

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  轻松签 - 证书自签工具`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  管理后台: http://localhost:${PORT}/admin`);
  console.log(`  管理员密码: ${ADMIN_PASSWORD}`);
  console.log(`========================================`);
});
