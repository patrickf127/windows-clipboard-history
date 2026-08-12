const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');
const { app } = require('electron');

// 可攜版：資料庫放 exe 旁邊；安裝版：放使用者資料夾
function getDbPath() {
  // electron-builder 可攜版會設這個環境變數
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    return path.join(portableDir, 'clipboard_data.db');
  }
  // 一般安裝版或開發模式
  return path.join(app.getPath('userData'), 'clipboard_data.db');
}

const DB_PATH = getDbPath();
let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('text', 'image')),
      text_content TEXT,
      image_data BLOB,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 建立索引加速查詢
  db.run('CREATE INDEX IF NOT EXISTS idx_created_at ON clipboard_items(created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_is_pinned ON clipboard_items(is_pinned DESC)');

  saveDb();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  } catch (e) {
    console.error('儲存資料庫失敗:', e.message);
  }
}

// 加入新紀錄
async function addClipboardItem(type, textContent, imageData) {
  // 避免重複：如果是文字，檢查最後一筆是否相同
  if (type === 'text' && textContent) {
    const stmt = db.prepare('SELECT text_content FROM clipboard_items WHERE type = ? ORDER BY id DESC LIMIT 1');
    stmt.bind(['text']);
    if (stmt.step()) {
      const last = stmt.getAsObject();
      stmt.free();
      if (last.text_content === textContent) return;
    } else {
      stmt.free();
    }
  }

  const stmt = db.prepare('INSERT INTO clipboard_items (type, text_content, image_data) VALUES (?, ?, ?)');
  stmt.run([type, textContent || null, imageData || null]);
  stmt.free();
  saveDb();
}

// 取得所有紀錄（置頂 + 時間降冪）
async function getClipboardHistory() {
  const stmt = db.prepare(`
    SELECT id, type, text_content, image_data, is_pinned, created_at
    FROM clipboard_items
    ORDER BY is_pinned DESC, created_at DESC
    LIMIT 500
  `);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  // 將 image_data 轉為 base64
  return rows.map(row => ({
    ...row,
    image_data: row.image_data ? Buffer.from(row.image_data).toString('base64') : null,
  }));
}

// 搜索文字紀錄
async function searchHistory(keyword) {
  const stmt = db.prepare(`
    SELECT id, type, text_content, image_data, is_pinned, created_at
    FROM clipboard_items
    WHERE type = 'text' AND text_content LIKE ?
    ORDER BY is_pinned DESC, created_at DESC
    LIMIT 500
  `);
  stmt.bind([`%${keyword}%`]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows.map(row => ({
    ...row,
    image_data: row.image_data ? Buffer.from(row.image_data).toString('base64') : null,
  }));
}

// 刪除
async function deleteClipboardItem(id) {
  db.run('DELETE FROM clipboard_items WHERE id = ?', [id]);
  saveDb();
}

// 切換置頂
async function togglePin(id) {
  db.run('UPDATE clipboard_items SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
  saveDb();
}

// 清理超過指定天數的資料
async function clearOldEntries(days) {
  const result = db.run(`DELETE FROM clipboard_items WHERE is_pinned = 0 AND created_at < datetime('now', 'localtime', ?)`, [`-${days} days`]);
  saveDb();

  // VACUUM 釋放空間
  if (result && result.changes > 0) {
    db.run('VACUUM');
  }
  return result ? result.changes : 0;
}

module.exports = { initDatabase, addClipboardItem, getClipboardHistory, deleteClipboardItem, togglePin, clearOldEntries, searchHistory };
