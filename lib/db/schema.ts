// Database schema for SQLite
// This file contains the SQL schema creation scripts

export const createTables = `
-- 1. App Configuration
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 2. Food Spots (The Core)
CREATE TABLE IF NOT EXISTS food_spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,

  -- Geolocation (Float for D1)
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address_text TEXT,
  city TEXT,
  taste TEXT,

  -- Content
  summary TEXT, -- AI generated <20 chars
  my_notes TEXT, -- Optional user manual notes
  tags TEXT, -- JSON Array: ["Hot", "Date Night"]
  rating REAL,
  price INTEGER,

  -- Source
  original_share_text TEXT,
  source_url TEXT,
  screenshot_r2_key TEXT, -- Legacy single image key
  screenshot_urls TEXT, -- JSON Array of image URLs

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Collections (User curated lists)
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  spot_ids TEXT, -- JSON Array: "[1, 4, 12]"
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_food_spots_location ON food_spots(lat, lng);
CREATE INDEX IF NOT EXISTS idx_food_spots_created ON food_spots(created_at DESC);
`;

export const insertSampleData = `
-- Sample spot for testing
INSERT INTO food_spots (name, lat, lng, address_text, city, taste, summary, tags, rating, price)
VALUES
  ('示例餐厅', 39.9042, 116.4074, '北京市东城区王府井大街1号', '北京', '麻辣鲜香', '排队两小时的火锅店', '["火锅", "聚会"]', 4.5, 150)
ON CONFLICT DO NOTHING;
`;
