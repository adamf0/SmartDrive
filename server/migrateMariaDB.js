import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.MARIADB_PORT || '3306', 10),
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'mydrive',
};

async function migrate() {
  console.log(`🔌 Menghubungkan ke MariaDB di ${DB_CONFIG.host}:${DB_CONFIG.port} (DB: '${DB_CONFIG.database}')...`);
  const conn = await mysql.createConnection(DB_CONFIG);

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('DROP TABLE IF EXISTS shared_items');
  await conn.query('DROP TABLE IF EXISTS file_contexts');
  await conn.query('DROP TABLE IF EXISTS background_jobs');
  await conn.query('DROP TABLE IF EXISTS files');
  await conn.query('DROP TABLE IF EXISTS folders');
  await conn.query('DROP TABLE IF EXISTS users');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('✨ Re-creating normalized tables with physical file paths...');

  // 1. Users
  await conn.query(`
    CREATE TABLE users (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(100) NOT NULL DEFAULT 'Pengguna',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. Folders
  await conn.query(`
    CREATE TABLE folders (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      parent_id VARCHAR(100) NOT NULL DEFAULT 'root',
      category_key VARCHAR(50),
      owner_email VARCHAR(255) NOT NULL,
      color VARCHAR(50) DEFAULT 'bg-blue-500',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. Files
  await conn.query(`
    CREATE TABLE files (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(100) NOT NULL,
      file_size_kb INT NOT NULL,
      file_path TEXT NOT NULL,
      file_data_url LONGTEXT NOT NULL,
      folder_id VARCHAR(100) NOT NULL DEFAULT 'root',
      owner_email VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'umum',
      category_name VARCHAR(100) NOT NULL DEFAULT 'Umum',
      uploaded_at VARCHAR(100) NOT NULL,
      uploaded_by VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. Background Jobs
  await conn.query(`
    CREATE TABLE background_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_id VARCHAR(100) NOT NULL UNIQUE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      processing_progress INT NOT NULL DEFAULT 0,
      current_job_task TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. File Contexts
  await conn.query(`
    CREATE TABLE file_contexts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_id VARCHAR(100) NOT NULL UNIQUE,
      classification_method VARCHAR(50) NOT NULL DEFAULT 'unclassified',
      analysis_result LONGTEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. Shared Items
  await conn.query(`
    CREATE TABLE shared_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id VARCHAR(100) NOT NULL,
      item_type VARCHAR(20) NOT NULL,
      target_email VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_share (item_id, item_type, target_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed Users
  await conn.query(`
    INSERT INTO users (id, name, email, role, avatar) VALUES
    ('user-yuni', 'Yuni Sri Melani', 'yuni@pakuan.ac.id', 'Administrator', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
    ('user-andi', 'Dr. Andi Wijaya', 'andi@pakuan.ac.id', 'Dosen Akademik', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    ('user-keuangan', 'Admin Keuangan', 'keuangan@pakuan.ac.id', 'Staf Keuangan', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
  `);

  console.log('✅ MariaDB Database mydrive Migration with file_path Selesai 100%!');
  await conn.end();
}

migrate();
