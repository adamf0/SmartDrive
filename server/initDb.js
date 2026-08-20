import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

export async function initializeDatabase() {
  console.log('Connecting to MariaDB to initialize `mydrive` with INT ID + UUID Schema...');
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MariaDB server successfully.');

    // Drop and re-create for clean state
    await connection.query('DROP DATABASE IF EXISTS mydrive;');
    console.log('Cleaned old database `mydrive`.');

    // Run schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('Executed schema.sql successfully.');

    // Insert Default Accounts
    const defaultAccounts = [
      {
        uuid: 'acc-' + crypto.randomUUID(),
        name: 'Yuni Sri Melani',
        email: 'yuni@pakuan.ac.id',
        password: '123456',
        role: 'Administrator',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      },
      {
        uuid: 'acc-' + crypto.randomUUID(),
        name: 'Dr. Andi Wijaya',
        email: 'andi@pakuan.ac.id',
        password: '123456',
        role: 'Dosen Akademik',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      {
        uuid: 'acc-' + crypto.randomUUID(),
        name: 'Admin Keuangan',
        email: 'keuangan@pakuan.ac.id',
        password: '123456',
        role: 'Staf Keuangan',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      {
        uuid: 'acc-' + crypto.randomUUID(),
        name: 'Siti Rahmawati',
        email: 'siti.rahma@pakuan.ac.id',
        password: '123456',
        role: 'Mahasiswa',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      },
    ];

    for (const acc of defaultAccounts) {
      await connection.query(
        'INSERT INTO mydrive.account (uuid, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [acc.uuid, acc.name, acc.email, acc.password, acc.role, acc.avatar]
      );
    }
    console.log(`Seeded ${defaultAccounts.length} user accounts with INT ID + UUID.`);

    // Insert Default Folders with UUID
    const folderProjectsUuid = 'fld-' + crypto.randomUUID();
    const folderDocumentsUuid = 'fld-' + crypto.randomUUID();
    const folderFinancialUuid = 'fld-' + crypto.randomUUID();
    const folderResearchUuid = 'fld-' + crypto.randomUUID();
    const folderFrontendSubUuid = 'fld-' + crypto.randomUUID();

    const defaultFolders = [
      {
        uuid: folderProjectsUuid,
        name: 'Folder Uji Coba Proyek',
        original_name: 'Folder Uji Coba Proyek',
        is_folder: 1,
        parent_id: 'root',
        folder_id: 'root',
        owner_email: 'yuni@pakuan.ac.id',
        category: 'akademik',
        category_name: 'Akademik',
        color: 'bg-indigo-500',
        uploaded_at: 'Hari ini',
        uploaded_by: 'Yuni Sri Melani',
      },
      {
        uuid: folderDocumentsUuid,
        name: 'Dokumen Skripsi & Tesis',
        original_name: 'Dokumen Skripsi & Tesis',
        is_folder: 1,
        parent_id: 'root',
        folder_id: 'root',
        owner_email: 'yuni@pakuan.ac.id',
        category: 'akademik',
        category_name: 'Akademik',
        color: 'bg-blue-500',
        uploaded_at: 'Kemarin',
        uploaded_by: 'Yuni Sri Melani',
      },
      {
        uuid: folderFinancialUuid,
        name: 'Laporan Keuangan LPPM',
        original_name: 'Laporan Keuangan LPPM',
        is_folder: 1,
        parent_id: 'root',
        folder_id: 'root',
        owner_email: 'keuangan@pakuan.ac.id',
        category: 'keuangan',
        category_name: 'Keuangan',
        color: 'bg-emerald-500',
        uploaded_at: '3 hari lalu',
        uploaded_by: 'Admin Keuangan',
      },
      {
        uuid: folderResearchUuid,
        name: 'Publikasi Jurnal & AI',
        original_name: 'Publikasi Jurnal & AI',
        is_folder: 1,
        parent_id: 'root',
        folder_id: 'root',
        owner_email: 'andi@pakuan.ac.id',
        category: 'penelitian',
        category_name: 'Penelitian',
        color: 'bg-cyan-500',
        uploaded_at: '5 hari lalu',
        uploaded_by: 'Dr. Andi Wijaya',
      },
      {
        uuid: folderFrontendSubUuid,
        name: 'Arsitektur Frontend React (Subfolder)',
        original_name: 'Arsitektur Frontend React (Subfolder)',
        is_folder: 1,
        parent_id: folderProjectsUuid,
        folder_id: folderProjectsUuid,
        owner_email: 'yuni@pakuan.ac.id',
        category: 'akademik',
        category_name: 'Akademik',
        color: 'bg-purple-500',
        uploaded_at: 'Hari ini',
        uploaded_by: 'Yuni Sri Melani',
      },
    ];

    for (const f of defaultFolders) {
      await connection.query(
        `INSERT INTO mydrive.files 
         (uuid, name, original_name, is_folder, parent_id, folder_id, file_type, file_size_kb, file_path, file_data_url, owner_email, category, category_name, color, uploaded_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, 'folder', 0, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
        [f.uuid, f.name, f.original_name, f.is_folder, f.parent_id, f.folder_id, f.owner_email, f.category, f.category_name, f.color, f.uploaded_at, f.uploaded_by]
      );
    }
    console.log(`Seeded ${defaultFolders.length} default folders & nested subfolders.`);

    console.log('Database initialization completed successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase().catch(() => process.exit(1));
}
