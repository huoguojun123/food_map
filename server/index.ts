// Bun API Server Entry Point
// Uses app.ts for route handling and middleware

import { handleRequest, initializeServer } from './app.js';

const API_PORT = process.env.API_PORT || 3001;
const API_HOST = process.env.API_HOST || '127.0.0.1';

// Initialize server (database, graceful shutdown)
initializeServer();

// Start Bun server
Bun.serve({
  port: API_PORT,
  hostname: API_HOST,
  fetch: handleRequest,
});

console.log(`🚀 Bun API Server running on http://${API_HOST}:${API_PORT}`);
