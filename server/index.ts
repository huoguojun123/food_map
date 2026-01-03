// Bun API Server Entry Point
// Uses app.ts for route handling and middleware

import { handleRequest, initializeServer } from './app.js';

const API_PORT = process.env.API_PORT || 3001;
const API_HOST = process.env.API_HOST || '127.0.0.1';

// Load .env.local file for Bun
// Bun doesn't load .env.local by default
const envPath = import.meta.env.PROD ? '.env' : '.env.local';
const fs = require('fs');
const path = require('path');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  for (const line of envLines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [key, value] = match;
      process.env[key.trim()] = value.trim();
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
