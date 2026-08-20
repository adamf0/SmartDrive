-- MariaDB Database Schema for mydrive (Pure Backend Architecture)
CREATE DATABASE IF NOT EXISTS mydrive;
USE mydrive;

-- 1. Account Table (Users Authentication)
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

-- 2. Files Table (Menampung Folder, Folder dalam Folder / File dalam Folder, Kolom ID Integer + UUID)
CREATE TABLE IF NOT EXISTS files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  is_folder TINYINT(1) NOT NULL DEFAULT 0, -- 1 = Folder, 0 = File
  parent_id VARCHAR(64) NOT NULL DEFAULT 'root', -- Parent Folder UUID (untuk hierarki folder dalam folder)
  folder_id VARCHAR(64) NOT NULL DEFAULT 'root', -- Folder penampung UUID
  file_type VARCHAR(100) NOT NULL DEFAULT 'folder',
  file_size_kb INT NOT NULL DEFAULT 0,
  file_path TEXT, -- Lokasi fisik file: uploads/[account]/[folder]/[file]
  file_data_url LONGTEXT, -- Binary data URL / Static URL
  owner_email VARCHAR(255) NOT NULL, -- Kepemilikan akun yang login
  category VARCHAR(50) NOT NULL DEFAULT 'umum',
  category_name VARCHAR(100) NOT NULL DEFAULT 'Umum',
  color VARCHAR(50) DEFAULT 'bg-indigo-500',
  uploaded_at VARCHAR(100) NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Background Job Table (Status 3 state: process, done, fail)
CREATE TABLE IF NOT EXISTS background_job (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'process', -- 'process', 'done', 'fail'
  processing_progress INT NOT NULL DEFAULT 0,
  current_job_task TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. File Contexts Table (file_id mereferensikan kolom id INTEGER pada tabel files)
CREATE TABLE IF NOT EXISTS file_contexts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL UNIQUE,
  classification_method VARCHAR(50) NOT NULL DEFAULT 'unclassified', -- 'ai', 'manual', 'unclassified'
  analysis_result LONGTEXT NOT NULL, -- JSON hasil ekstraksi Gemini AI
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Shared Items Table (Kolaborasi & Hak Akses Berbagi dengan file_id)
CREATE TABLE IF NOT EXISTS shared_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id VARCHAR(64) NOT NULL,
  target_email VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_share (file_id, target_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
