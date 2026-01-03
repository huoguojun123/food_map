// Database connection module for SQLite
// Uses bun:sqlite (built-in) for Bun compatibility

import { Database } from 'bun:sqlite'
import { createTables, insertSampleData } from '../../lib/db/schema.js'

const DATABASE_PATH = process.env.DATABASE_PATH || './data/gourmetlog.db'

let db: Database | null = null

export function getDatabase(): Database {
  if (!db) {
    const fs = require('fs')
    const path = require('path')
    const dbDir = path.dirname(DATABASE_PATH)

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    db = new Database(DATABASE_PATH)
    db.exec('PRAGMA journal_mode = WAL')

    initializeDatabase()

    console.log('Database connected at:', DATABASE_PATH)
  }

  return db
}

function initializeDatabase(): void {
  if (!db) {
    throw new Error('Database not initialized')
  }

  try {
    db.exec(createTables)
    ensureColumns()

    const spotCount = db
      .prepare('SELECT COUNT(*) as count FROM food_spots')
      .get() as { count: number }
    if (spotCount.count === 0) {
      db.exec(insertSampleData)
      console.log('Sample data inserted')
    }
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

function ensureColumns(): void {
  if (!db) {
    return
  }

  const columns = db.prepare('PRAGMA table_info(food_spots)').all() as Array<{
    name: string
  }>
  const columnSet = new Set(columns.map(column => column.name))

  if (!columnSet.has('screenshot_urls')) {
    db.exec('ALTER TABLE food_spots ADD COLUMN screenshot_urls TEXT')
  }

  if (!columnSet.has('source_url')) {
    db.exec('ALTER TABLE food_spots ADD COLUMN source_url TEXT')
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed')
  }
}

export default { getDatabase, closeDatabase }
