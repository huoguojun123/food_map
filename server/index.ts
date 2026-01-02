// Bun API Server Entry Point
// This server handles all API endpoints for database, AI, and geocoding operations

const API_PORT = process.env.API_PORT || 3001;
const API_HOST = process.env.API_HOST || '127.0.0.1';

Bun.serve({
  port: API_PORT,
  hostname: API_HOST,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // API routes
    if (url.pathname.startsWith('/api')) {
      return Response.json({ error: 'API endpoint not implemented yet' }, { status: 501 });
    }

    // 404
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🚀 Bun API Server running on http://${API_HOST}:${API_PORT}`);
