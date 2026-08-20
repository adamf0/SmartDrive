import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_BASE_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads base directory exists
if (!fs.existsSync(UPLOADS_BASE_DIR)) {
  fs.mkdirSync(UPLOADS_BASE_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve static uploaded files at /uploads/[email]/[folder]/[filename]
app.use('/uploads', express.static(UPLOADS_BASE_DIR));

const DB_CONFIG = {
  host: process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.MARIADB_PORT || '3306', 10),
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'mydrive',
  connectTimeout: 60000,
};

let pool = null;

async function initMariaDB() {
  try {
    const sysConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });

    await sysConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
    try {
      await sysConn.query('SET GLOBAL max_allowed_packet = 67108864;');
    } catch (e) {
      console.warn('Could not set global max_allowed_packet:', e.message);
    }
    await sysConn.end();

    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // 1. Account Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT '123456',
        role VARCHAR(100) NOT NULL DEFAULT 'Pengguna',
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Files Table (ID Integer Auto-Increment + UUID String)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        is_folder TINYINT(1) NOT NULL DEFAULT 0,
        parent_id VARCHAR(64) NOT NULL DEFAULT 'root',
        folder_id VARCHAR(64) NOT NULL DEFAULT 'root',
        file_type VARCHAR(100) NOT NULL DEFAULT 'folder',
        file_size_kb INT NOT NULL DEFAULT 0,
        file_path TEXT,
        file_data_url LONGTEXT,
        owner_email VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'umum',
        category_name VARCHAR(100) NOT NULL DEFAULT 'Umum',
        color VARCHAR(50) DEFAULT 'bg-indigo-500',
        uploaded_at VARCHAR(100) NOT NULL,
        uploaded_by VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Background Job Table (Status 3 state: process, done, fail, ref files.id INT)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS background_job (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'process',
        processing_progress INT NOT NULL DEFAULT 0,
        current_job_task TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. File Contexts Table (file_id ref files.id INT)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_contexts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL UNIQUE,
        classification_method VARCHAR(50) NOT NULL DEFAULT 'unclassified',
        analysis_result LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Files Tags Table (files_tags with file_id INT ref files.id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        category_name VARCHAR(100) NOT NULL DEFAULT 'Tag Visual',
        tag_name VARCHAR(150) NOT NULL,
        score INT NOT NULL DEFAULT 95,
        is_hashtag TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        INDEX idx_file_id (file_id),
        INDEX idx_tag_name (tag_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Shared Items Table (file_id + target_email)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id VARCHAR(64) NOT NULL,
        target_email VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_share (file_id, target_email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. Recent Activity Table (file_id INT, account_id INT, created_at)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recent_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        account_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE,
        INDEX idx_account_recent (account_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log(`✅ MariaDB Server connected successfully to database: '${DB_CONFIG.database}'`);
  } catch (err) {
    console.warn(`⚠️ MariaDB connection warning (${err.message}).`);
  }
}

initMariaDB();

// Helper: Save File Buffer to Physical Disk in uploads/[account]/[folder]/[filename]
function saveFileToPhysicalDisk(ownerEmail, folderId, fileName, dataUrl) {
  try {
    const cleanEmail = (ownerEmail || 'user').replace(/[^a-zA-Z0-9_@.-]/g, '_');
    const cleanFolder = (folderId || 'root').replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetDir = path.join(UPLOADS_BASE_DIR, cleanEmail, cleanFolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFileName = path.basename(fileName || `file_${Date.now()}.png`);
    const targetPath = path.join(targetDir, safeFileName);

    if (dataUrl && dataUrl.startsWith('data:')) {
      const base64Part = dataUrl.split(',')[1];
      if (base64Part) {
        fs.writeFileSync(targetPath, Buffer.from(base64Part, 'base64'));
        console.log(`📁 Physical file saved: uploads/${cleanEmail}/${cleanFolder}/${safeFileName}`);
      }
    } else {
      // Create empty placeholder if no base64 provided
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, Buffer.from(''));
      }
    }

    return `uploads/${cleanEmail}/${cleanFolder}/${safeFileName}`;
  } catch (e) {
    console.error('Error saving physical file to disk:', e);
    return `uploads/${fileName}`;
  }
}

// -------------------------------------------------------------
// 1. ACCOUNT CRUD & STORAGE
// -------------------------------------------------------------

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: DB_CONFIG.database,
    uploadsDir: UPLOADS_BASE_DIR,
    mariadbConnected: pool !== null,
  });
});

// GET /api/storage (Disk Storage Capacity metrics)
app.get('/api/storage', (req, res) => {
  res.json({
    totalGB: 98.31,
    usedGB: 13.22,
    freeGB: 85.08,
    usagePercentage: 13.5,
    diskPath: '/',
  });
});

// GET /api/account
app.get('/api/account', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  try {
    const [rows] = await pool.query('SELECT id, uuid, name, email, role, avatar, created_at FROM account ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/account/register
app.post('/api/account/register', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { name, email, password, role, avatar } = req.body;
  try {
    const uuid = 'acc-' + crypto.randomUUID();
    const userEmail = email.trim().toLowerCase();
    const userAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const [result] = await pool.query(
      'INSERT INTO account (uuid, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, name, userEmail, password || '123456', role || 'Pengguna', userAvatar]
    );

    res.json({
      success: true,
      user: { id: result.insertId, uuid, name, email: userEmail, role: role || 'Pengguna', avatar: userAvatar },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/account/login
app.post('/api/account/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { email, password } = req.body;
  try {
    const userEmail = (email || '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM account WHERE LOWER(email) = ?', [userEmail]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Akun tidak ditemukan. Silakan periksa email atau daftar akun baru.' });
    }

    const user = rows[0];
    if (password && user.password && user.password !== password) {
      return res.status(401).json({ error: 'Password yang Anda masukkan salah.' });
    }

    res.json({
      success: true,
      user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/account/update (Update Profile Name, Email, Avatar & Password)
app.post('/api/account/update', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { currentEmail, name, email, currentPassword, newPassword, avatar } = req.body;
  try {
    const origEmail = (currentEmail || '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM account WHERE LOWER(email) = ?', [origEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    }

    const user = rows[0];

    // If changing password, verify current password
    if (newPassword && newPassword.trim()) {
      if (currentPassword && user.password && user.password !== currentPassword) {
        return res.status(401).json({ error: 'Password lama yang Anda masukkan salah.' });
      }
    }

    const newEmail = email ? email.trim().toLowerCase() : user.email;
    const newName = name ? name.trim() : user.name;
    const newAvatar = avatar ? avatar.trim() : user.avatar;
    const finalPassword = (newPassword && newPassword.trim()) ? newPassword.trim() : user.password;

    await pool.query(
      'UPDATE account SET name = ?, email = ?, password = ?, avatar = ? WHERE id = ?',
      [newName, newEmail, finalPassword, newAvatar, user.id]
    );

    const updatedUser = {
      id: user.id,
      uuid: user.uuid,
      name: newName,
      email: newEmail,
      role: user.role,
      avatar: newAvatar,
    };

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profil akun berhasil diperbarui!',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 2. FILES & FOLDERS CRUD (Files, Subfolders, Nested Hierarchy)
// -------------------------------------------------------------

// GET /api/files (Fetch all files and folders, joining background_job, file_contexts & files_tags)
app.get('/api/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  try {
    const [files] = await pool.query(`
      SELECT 
        f.*,
        b.status as job_status,
        b.processing_progress,
        b.current_job_task,
        c.classification_method,
        c.analysis_result
      FROM files f
      LEFT JOIN background_job b ON f.id = b.file_id
      LEFT JOIN file_contexts c ON f.id = c.file_id
      ORDER BY f.is_folder DESC, f.created_at DESC
    `);

    const [shares] = await pool.query('SELECT * FROM shared_items');
    const [allTags] = await pool.query('SELECT file_id, category_name, tag_name, score, is_hashtag FROM files_tags ORDER BY is_hashtag ASC, score DESC');

    const result = files.map((f) => {
      const itemShares = shares
        .filter((s) => s.file_id === f.uuid || String(s.file_id) === String(f.id))
        .map((s) => s.target_email);

      const fileTags = allTags
        .filter((t) => t.file_id === f.id)
        .map((t) => t.tag_name);

      const fileTagsList = allTags
        .filter((t) => t.file_id === f.id)
        .map((t) => ({
          tagName: t.tag_name,
          categoryName: t.category_name,
          score: t.score,
          isHashtag: Boolean(t.is_hashtag),
        }));

      let parsedAnalysis = null;
      try {
        if (f.analysis_result) parsedAnalysis = JSON.parse(f.analysis_result);
      } catch (err) {
        console.warn('Failed to parse analysis_result:', err);
      }

      // Map raw job status to 3 normalized states: process | done | fail
      let normalizedStatus = 'process';
      if (f.is_folder) {
        normalizedStatus = 'done';
      } else if (f.job_status === 'completed' || f.job_status === 'done') {
        normalizedStatus = 'done';
      } else if (f.job_status === 'failed' || f.job_status === 'fail') {
        normalizedStatus = 'fail';
      } else {
        normalizedStatus = 'process';
      }

      // If file_data_url is huge or path stored, construct URL
      const fileUrl = f.file_data_url && f.file_data_url.startsWith('data:')
        ? f.file_data_url
        : f.file_path
        ? `http://localhost:${PORT}/${f.file_path}`
        : f.file_data_url;

      return {
        id: f.id,
        uuid: f.uuid,
        name: f.name,
        originalName: f.original_name,
        isFolder: Boolean(f.is_folder),
        parentId: f.parent_id || 'root',
        folderId: f.folder_id || 'root',
        fileType: f.file_type,
        fileSizeKB: f.file_size_kb,
        filePath: f.file_path,
        fileDataUrl: fileUrl,
        ownerEmail: f.owner_email,
        sharedWithEmails: itemShares,
        category: f.category,
        categoryName: f.category_name,
        tags: fileTags,
        tagsList: fileTagsList,
        color: f.color || 'bg-indigo-500',
        status: normalizedStatus,
        processingProgress: f.processing_progress || (f.is_folder ? 100 : 0),
        currentJobTask: f.current_job_task || (f.is_folder ? 'Folder Siap' : 'Di-antrikan...'),
        uploadedAt: f.uploaded_at,
        updatedAt: f.updated_at,
        uploadedBy: f.uploaded_by,
        classificationMethod: f.classification_method || 'unclassified',
        analysisResult: parsedAnalysis,
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/files/folder (Create Folder or Subfolder)
app.post('/api/files/folder', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { name, ownerEmail, parentId, color, uploadedBy } = req.body;
  try {
    const folderUuid = 'fld-' + crypto.randomUUID();
    const folderParentId = parentId || 'root';
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // 0. Auto-Deduplicate Folder Name if same folder name already exists in target directory
    let finalFolderName = name || 'Folder Baru';
    const [existingFolders] = await pool.query(
      'SELECT name FROM files WHERE owner_email = ? AND (folder_id = ? OR parent_id = ?) AND is_folder = 1',
      [ownerEmail, folderParentId, folderParentId]
    );
    const existingFolderNamesSet = new Set(existingFolders.map((r) => (r.name || '').trim().toLowerCase()));

    if (existingFolderNamesSet.has(finalFolderName.trim().toLowerCase())) {
      let counter = 1;
      let candidate = `${finalFolderName} (${counter})`;
      while (existingFolderNamesSet.has(candidate.trim().toLowerCase())) {
        counter++;
        candidate = `${finalFolderName} (${counter})`;
      }
      finalFolderName = candidate;
    }

    const [result] = await pool.query(
      `INSERT INTO files (
        uuid, name, original_name, is_folder, parent_id, folder_id, file_type, file_size_kb,
        owner_email, category, category_name, color, uploaded_at, uploaded_by
      ) VALUES (?, ?, ?, 1, ?, ?, 'folder', 0, ?, 'umum', 'Umum', ?, ?, ?)`,
      [
        folderUuid,
        finalFolderName,
        name || finalFolderName,
        folderParentId,
        folderParentId,
        ownerEmail,
        color || 'bg-indigo-500',
        dateStr,
        uploadedBy || 'User',
      ]
    );

    // Create physical subfolder directory on disk: uploads/[account]/[folder]
    const cleanEmail = (ownerEmail || 'user').replace(/[^a-zA-Z0-9_@.-]/g, '_');
    const cleanFolder = folderUuid.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderPath = path.join(UPLOADS_BASE_DIR, cleanEmail, cleanFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    res.json({
      success: true,
      folder: {
        id: result.insertId,
        uuid: folderUuid,
        name: finalFolderName,
        originalName: name || finalFolderName,
        isFolder: true,
        parentId: folderParentId,
        folderId: folderParentId,
        fileType: 'folder',
        fileSizeKB: 0,
        ownerEmail,
        sharedWithEmails: [],
        category: 'umum',
        categoryName: 'Umum',
        tags: [],
        tagsList: [],
        color: color || 'bg-indigo-500',
        uploadedAt: dateStr,
        uploadedBy: uploadedBy || 'User',
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/files/upload (Upload File & Save to /uploads/[account]/[folder]/[file])
app.post('/api/files/upload', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const file = req.body;
  try {
    const fileUuid = file.uuid || ('file-' + crypto.randomUUID());
    const folderId = file.folderId || 'root';
    const ownerEmail = file.ownerEmail || 'user@example.com';
    const originalRequestedName = file.name || 'file.png';

    // 0. Auto-Deduplicate Filename if same filename already exists in the target folder for this owner
    let finalFileName = originalRequestedName;
    const [existingRows] = await pool.query(
      'SELECT name FROM files WHERE owner_email = ? AND (folder_id = ? OR parent_id = ?) AND is_folder = 0',
      [ownerEmail, folderId, folderId]
    );

    const existingNamesSet = new Set(existingRows.map((r) => (r.name || '').trim().toLowerCase()));

    console.log('DEBUG UPLOAD DEDUP:', {
      ownerEmail,
      folderId,
      originalRequestedName,
      existingRowsCount: existingRows.length,
      existingNames: existingRows.map(r => r.name),
      hasMatch: existingNamesSet.has(originalRequestedName.trim().toLowerCase())
    });

    if (existingNamesSet.has(originalRequestedName.trim().toLowerCase())) {
      const ext = path.extname(originalRequestedName);
      const baseName = path.basename(originalRequestedName, ext);
      let counter = 1;
      let candidate = `${baseName}(${counter})${ext}`;
      while (existingNamesSet.has(candidate.trim().toLowerCase())) {
        counter++;
        candidate = `${baseName}(${counter})${ext}`;
      }
      finalFileName = candidate;
      console.log(`🏷️ Auto-renamed duplicate uploaded file from "${originalRequestedName}" to "${finalFileName}" for ${ownerEmail}`);
    }

    // 1. Save Physical File to Disk in /uploads/[account]/[folder]/[finalFileName]
    const relativeFilePath = saveFileToPhysicalDisk(
      ownerEmail,
      folderId,
      finalFileName,
      file.fileDataUrl
    );

    const dateStr = file.uploadedAt || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Store URL or optimized data URL in DB to prevent MySQL packet limits
    const storedDataUrl = (file.fileDataUrl && file.fileDataUrl.length > 250000)
      ? `http://localhost:${PORT}/${relativeFilePath}`
      : (file.fileDataUrl || `http://localhost:${PORT}/${relativeFilePath}`);

    // 2. Insert into MariaDB files table with auto-increment ID & UUID
    const [result] = await pool.query(
      `INSERT INTO files (
        uuid, name, original_name, is_folder, parent_id, folder_id, file_type, file_size_kb,
        file_path, file_data_url, owner_email, category, category_name, uploaded_at, uploaded_by
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileUuid,
        finalFileName,
        originalRequestedName,
        folderId,
        folderId,
        file.fileType || 'image/png',
        file.fileSizeKB || 0,
        relativeFilePath,
        storedDataUrl,
        ownerEmail,
        file.category || 'umum',
        file.categoryName || 'Umum',
        dateStr,
        file.uploadedBy || 'User',
      ]
    );

    const fileIntId = result.insertId;

    // 3. Insert Job into MariaDB background_job table (status: 'process', file_id INT)
    await pool.query(
      `INSERT INTO background_job (file_id, status, processing_progress, current_job_task)
       VALUES (?, 'process', 0, 'Di-antrikan untuk Ekstraksi AI Background...')
       ON DUPLICATE KEY UPDATE status='process', processing_progress=0, current_job_task='Di-antrikan untuk Ekstraksi AI Background...'`,
      [fileIntId]
    );

    console.log(`✅ File uploaded & stored physically with INT ID ${fileIntId} and UUID ${fileUuid}`);

    res.json({
      success: true,
      file: {
        id: fileIntId,
        uuid: fileUuid,
        name: finalFileName,
        originalName: originalRequestedName,
        isFolder: false,
        parentId: folderId,
        folderId,
        fileType: file.fileType,
        fileSizeKB: file.fileSizeKB,
        filePath: relativeFilePath,
        fileDataUrl: file.fileDataUrl || storedDataUrl,
        ownerEmail,
        sharedWithEmails: [],
        category: file.category || 'umum',
        categoryName: file.categoryName || 'Umum',
        tags: [],
        tagsList: [],
        status: 'process',
        processingProgress: 0,
        currentJobTask: 'Di-antrikan untuk Ekstraksi AI Background...',
        uploadedAt: dateStr,
        uploadedBy: file.uploadedBy,
      },
    });
  } catch (e) {
    console.error('POST /api/files/upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Helper: Resolve File Integer ID from param (can be integer ID or UUID)
async function resolveFileIntId(fileIdentifier) {
  if (/^\d+$/.test(String(fileIdentifier))) {
    return Number(fileIdentifier);
  }
  const [rows] = await pool.query('SELECT id FROM files WHERE uuid = ?', [fileIdentifier]);
  if (rows.length > 0) return rows[0].id;
  return null;
}

// PUT /api/files/:uuid/category (Update file category in MariaDB)
app.put('/api/files/:uuid/category', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { uuid } = req.params;
  const { category, categoryName } = req.body;
  try {
    const fileIntId = await resolveFileIntId(uuid);
    if (!fileIntId) return res.status(404).json({ error: 'File not found' });

    const catName = categoryName || category.charAt(0).toUpperCase() + category.slice(1);
    await pool.query(
      'UPDATE files SET category = ?, category_name = ? WHERE id = ?',
      [category, catName, fileIntId]
    );

    await pool.query(
      `INSERT INTO file_contexts (file_id, classification_method, analysis_result)
       VALUES (?, 'manual', '{}')
       ON DUPLICATE KEY UPDATE classification_method = 'manual'`,
      [fileIntId]
    );

    res.json({ success: true, category, categoryName: catName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/files/:uuid/rename (Rename file or folder in MariaDB)
app.put('/api/files/:uuid/rename', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { uuid } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama berkas tidak boleh kosong.' });
  }
  try {
    const fileIntId = await resolveFileIntId(uuid);
    if (!fileIntId) return res.status(404).json({ error: 'File not found' });

    await pool.query('UPDATE files SET name = ? WHERE id = ?', [name.trim(), fileIntId]);
    res.json({ success: true, name: name.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/files/:uuid (Delete file or folder from MariaDB + Physical Disk)
app.delete('/api/files/:uuid', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { uuid } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM files WHERE uuid = ? OR id = ?', [uuid, uuid]);
    if (rows.length > 0) {
      const fileRecord = rows[0];
      if (fileRecord.file_path) {
        const fullPath = path.join(__dirname, '..', fileRecord.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      const targetIntId = fileRecord.id;
      const targetUuid = fileRecord.uuid;
      await pool.query('DELETE FROM files WHERE id = ? OR parent_id = ?', [targetIntId, targetUuid]);
      await pool.query('DELETE FROM background_job WHERE file_id = ?', [targetIntId]);
      await pool.query('DELETE FROM file_contexts WHERE file_id = ?', [targetIntId]);
      await pool.query('DELETE FROM files_tags WHERE file_id = ?', [targetIntId]);
      await pool.query('DELETE FROM shared_items WHERE file_id = ?', [targetUuid]);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 3. BACKGROUND_JOB & FILE_CONTEXTS & FILES_TAGS CRUD
// -------------------------------------------------------------

// PUT /api/jobs/:fileId/progress
app.put('/api/jobs/:fileId/progress', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { fileId } = req.params;
  const { progress, taskDescription, status } = req.body;
  const normalizedStatus = status === 'fail' || status === 'failed' ? 'fail' : 'process';
  try {
    const fileIntId = await resolveFileIntId(fileId);
    if (!fileIntId) return res.status(404).json({ error: 'File not found for job progress' });

    await pool.query(
      `INSERT INTO background_job (file_id, status, processing_progress, current_job_task)
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=?, processing_progress=?, current_job_task=?`,
      [fileIntId, normalizedStatus, progress, taskDescription, normalizedStatus, progress, taskDescription]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/jobs/:fileId/complete (Save analysis, category, file_contexts, and files_tags)
app.put('/api/jobs/:fileId/complete', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { fileId } = req.params;
  const { analysisResult, categoryKey, categoryName } = req.body;
  try {
    const fileIntId = await resolveFileIntId(fileId);
    if (!fileIntId) return res.status(404).json({ error: 'File not found for job completion' });

    // 1. Update category in files table
    await pool.query(
      'UPDATE files SET category = ?, category_name = ? WHERE id = ?',
      [categoryKey, categoryName, fileIntId]
    );

    // 2. Mark background_job as done
    await pool.query(
      `INSERT INTO background_job (file_id, status, processing_progress, current_job_task)
       VALUES (?, 'done', 100, 'Ekstraksi AI Background Selesai')
       ON DUPLICATE KEY UPDATE status='done', processing_progress=100, current_job_task='Ekstraksi AI Background Selesai'`,
      [fileIntId]
    );

    // 3. Store full analysis JSON in file_contexts
    await pool.query(
      `INSERT INTO file_contexts (file_id, classification_method, analysis_result)
       VALUES (?, 'ai', ?)
       ON DUPLICATE KEY UPDATE classification_method='ai', analysis_result=?`,
      [fileIntId, JSON.stringify(analysisResult), JSON.stringify(analysisResult)]
    );

    // 4. Save Extracted Tags & Hashtags into files_tags Table
    await pool.query('DELETE FROM files_tags WHERE file_id = ?', [fileIntId]);

    if (analysisResult && Array.isArray(analysisResult.tagCategories)) {
      for (const cat of analysisResult.tagCategories) {
        const catName = cat.categoryId || cat.category || 'Tag Visual';
        if (Array.isArray(cat.tags)) {
          for (const t of cat.tags) {
            const tagName = t.nameId || t.name;
            const score = Math.round((t.score || 0.95) * 100);
            if (tagName && tagName.trim()) {
              await pool.query(
                'INSERT INTO files_tags (file_id, category_name, tag_name, score, is_hashtag) VALUES (?, ?, ?, ?, 0)',
                [fileIntId, catName, tagName.trim(), score]
              );
            }
          }
        }
      }
    }

    if (analysisResult && analysisResult.captions && Array.isArray(analysisResult.captions.hashtags)) {
      for (const h of analysisResult.captions.hashtags) {
        if (h && h.trim()) {
          await pool.query(
            'INSERT INTO files_tags (file_id, category_name, tag_name, score, is_hashtag) VALUES (?, ?, ?, 99, 1)',
            [fileIntId, 'Rekomendasi Tagar', h.trim()]
          );
        }
      }
    }

    console.log(`🏷️ Synced tags into files_tags table for file ID ${fileIntId}`);

    res.json({ success: true });
  } catch (e) {
    console.error('Error in /api/jobs/:fileId/complete:', e);
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 4. SHARED_ITEMS CRUD (Kolaborasi dengan file_id & target_email)
// -------------------------------------------------------------

// POST /api/share
app.post('/api/share', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { fileId, itemId, targetEmail } = req.body;
  const targetFileId = fileId || itemId;
  try {
    await pool.query(
      'INSERT IGNORE INTO shared_items (file_id, target_email) VALUES (?, ?)',
      [targetFileId, targetEmail.trim().toLowerCase()]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/share
app.delete('/api/share', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { fileId, itemId, targetEmail } = req.body;
  const targetFileId = fileId || itemId;
  try {
    await pool.query(
      'DELETE FROM shared_items WHERE file_id = ? AND target_email = ?',
      [targetFileId, targetEmail.trim().toLowerCase()]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------------------------------------------------------
// 5. RECENT ACTIVITY CRUD (file_id, account_id, created_at)
// -------------------------------------------------------------

// POST /api/activity (Save activity on double-click file/folder or download file)
app.post('/api/activity', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { fileUuid, fileId, accountId, userEmail } = req.body;

  try {
    let targetFileId = fileId;
    if (!targetFileId && fileUuid) {
      const [fRows] = await pool.query('SELECT id FROM files WHERE uuid = ?', [fileUuid]);
      if (fRows.length > 0) targetFileId = fRows[0].id;
    }

    let targetAccountId = accountId;
    if (!targetAccountId && userEmail) {
      const [accRows] = await pool.query('SELECT id FROM account WHERE email = ?', [userEmail.trim().toLowerCase()]);
      if (accRows.length > 0) targetAccountId = accRows[0].id;
    }

    if (!targetFileId || !targetAccountId) {
      return res.status(400).json({ error: 'file_id and account_id could not be resolved' });
    }

    await pool.query(
      'INSERT INTO recent_activity (file_id, account_id, created_at) VALUES (?, ?, NOW())',
      [targetFileId, targetAccountId]
    );

    res.json({ success: true });
  } catch (e) {
    console.error('Error recording recent_activity:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity (Get latest 10 activities ordered by created_at desc for account_id)
app.get('/api/activity', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'MariaDB not connected' });
  const { accountId, email } = req.query;

  try {
    let targetAccountId = accountId;
    if (!targetAccountId && email) {
      const [accRows] = await pool.query('SELECT id FROM account WHERE email = ?', [email.trim().toLowerCase()]);
      if (accRows.length > 0) targetAccountId = accRows[0].id;
    }

    if (!targetAccountId) {
      return res.status(400).json({ error: 'accountId or email query is required' });
    }

    const [rows] = await pool.query(
      `SELECT 
        ra.id as activity_id,
        ra.file_id,
        ra.account_id,
        ra.created_at as activity_created_at,
        f.id,
        f.uuid,
        f.name,
        f.is_folder,
        f.file_type,
        f.file_size_kb,
        f.file_path,
        f.file_data_url,
        f.category,
        f.category_name,
        f.color,
        fc.analysis_result
       FROM recent_activity ra
       JOIN files f ON ra.file_id = f.id
       LEFT JOIN file_contexts fc ON f.id = fc.file_id
       WHERE ra.account_id = ?
       ORDER BY ra.created_at DESC, ra.id DESC
       LIMIT 10`,
      [targetAccountId]
    );

    const result = rows.map((r) => {
      let parsedAnalysis = null;
      try {
        if (r.analysis_result) parsedAnalysis = JSON.parse(r.analysis_result);
      } catch (err) {
        console.warn('Failed to parse analysis_result:', err);
      }

      const dateObj = new Date(r.activity_created_at);
      const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      return {
        activityId: r.activity_id,
        id: r.id,
        uuid: r.uuid,
        name: r.name,
        isFolder: Boolean(r.is_folder),
        fileType: r.file_type,
        fileSizeKB: r.file_size_kb,
        category: r.category,
        categoryName: r.category_name || 'Umum',
        color: r.color,
        openedAt: timeStr,
        createdAt: r.activity_created_at,
        action: 'opened',
        analysisResult: parsedAnalysis,
      };
    });

    res.json(result);
  } catch (e) {
    console.error('Error fetching recent_activity:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MariaDB Backend Server listening on http://localhost:${PORT} [Database: '${DB_CONFIG.database}']`);
});
