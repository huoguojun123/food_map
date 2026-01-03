// Bun API Server Entry Point
// Uses app.ts for route handling and middleware

import { handleRequest, initializeServer } from './app.js';

const API_PORT = process.env.API_PORT || 3001;
const API_HOST = process.env.API_HOST || '127.0.0.1';

// Load .env.local file for Bun
// Bun doesn't load .env.local by default
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
const fs = require('fs');
const path = require('path');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
  console.log(`✅ Loaded environment from ${envPath}`);
}

// Initialize server (database, graceful shutdown)
initializeServer();

// Start Bun server
Bun.serve({
  port: API_PORT,
  hostname: API_HOST,
  fetch: handleRequest,
});

console.log(`🚀 Bun API Server running on http://${API_HOST}:${API_PORT}`);
