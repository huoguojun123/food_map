// Database connection module for SQLite
// Uses better-sqlite3 for Bun compatibility and performance

import Database from 'better-sqlite3';
import { createTables, insertSampleData } from '../../lib/db/schema.js';

// Database path from environment variable or default
const DATABASE_PATH = process.env.DATABASE_PATH || './data/gourmetlog.db';

// Create database connection
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const path = require('path');
    const dbDir = path.dirname(DATABASE_PATH);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database connection
    db = new Database(DATABASE_PATH);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    // Initialize tables
    initializeDatabase();

    console.log('✅ Database connected at:', DATABASE_PATH);
  }

  return db;
}

function initializeDatabase(): void {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Execute table creation scripts
    db.exec(createTables);

    // Check if we need to insert sample data
    const spotCount = db.prepare('SELECT COUNT(*) as count FROM food_spots').get() as { count: number };
    if (spotCount.count === 0) {
      db.exec(insertSampleData);
      console.log('📝 Sample data inserted');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Close database connection (for graceful shutdown)
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('🔌 Database connection closed');
  }
}

// Export for use in API routes
export default { getDatabase, closeDatabase };
