// Bun application setup
// Provides CORS middleware, error handling, and route registration

import { initializeDatabase } from './db/d1.js';
import { handleCreateSpot, handleListSpots, handleGetSpot, handleUpdateSpot, handleDeleteSpot } from './api/spots.js';
import { handleAiExtract, handleAiPlan } from './api/ai.js';
import { handleGeocode } from './api/geocode.js';
import { handleImageProxy } from './api/images.js';
import { handleUpload } from './api/upload.js';
import { handleSettings, handleSettingsTest } from './api/settings.js';
import { handleCreatePlan, handleDeletePlan, handleListPlans } from './api/plans.js';

// Route handler type
type RouteHandler = (req: Request, url: URL) => Response | Promise<Response>;

// Route registry
const routes: Map<string, RouteHandler> = new Map();

// Register API routes
registerRoute('/api/spots', async (req, url) => {
  if (req.method === 'POST') {
    return handleCreateSpot(req, url);
  } else if (req.method === 'GET') {
    return handleListSpots(req, url);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/spots/', async (req, url) => {
  if (req.method === 'GET') {
    return handleGetSpot(req, url);
  }
  if (req.method === 'PUT') {
    return handleUpdateSpot(req, url);
  }
  if (req.method === 'DELETE') {
    return handleDeleteSpot(req, url);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/ai/extract', async (req, url) => {
  if (req.method === 'POST') {
    return handleAiExtract(req);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/ai/plan', async (req, url) => {
  if (req.method === 'POST') {
    return handleAiPlan(req);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/ai/geocode', async (req, url) => {
  if (req.method === 'POST') {
    return handleGeocode(req);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/upload/r2', async (req, url) => {
  if (req.method === 'POST') {
    return handleUpload(req);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/images/', async (req, url) => {
  if (req.method === 'GET') {
    return handleImageProxy(req, url);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/settings', async (req, url) => {
  if (req.method === 'POST') {
    return handleSettings(req);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/settings/test', async (req, url) => {
  if (req.method === 'POST') {
    return handleSettingsTest(req);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/plans', async (req, url) => {
  if (req.method === 'POST') {
    return handleCreatePlan(req);
  }
  if (req.method === 'GET') {
    return handleListPlans();
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

registerRoute('/api/plans/', async (req, url) => {
  if (req.method === 'DELETE') {
    return handleDeletePlan(req, url);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

// CORS configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Register a route handler
 */
export function registerRoute(path: string, handler: RouteHandler): void {
  routes.set(path, handler);
  console.log(`Route registered: ${path}`);
}

/**
 * Apply CORS headers to response
 */
function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function handleOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Error handler middleware
 */
function handleError(error: unknown): Response {
  console.error('Server error:', error);

  if (error instanceof Error) {
    return withCors(
      Response.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    );
  }

  return withCors(
    Response.json({ error: 'Internal server error' }, { status: 500 })
  );
}

/**
 * Main request handler with middleware pipeline
 */
export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleOptions();
    }

    // Health check
    if (pathname === '/health') {
      return withCors(
        Response.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          database: 'connected',
        })
      );
    }

    // Match route
    for (const [route, handler] of routes.entries()) {
      const isPrefix = route.endsWith('/');
      const isMatch = isPrefix ? pathname.startsWith(route) : pathname === route;

      if (isMatch) {
        const response = await handler(req, url);
        return withCors(response);
      }
    }

    // 404 - Not Found
    return withCors(
      Response.json({ error: 'Not Found' }, { status: 404 })
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Initialize server (initialize database, setup graceful shutdown)
 */
export async function initializeServer(): Promise<void> {
  await initializeDatabase();
  console.log('Server initialized');

  // Graceful shutdown
  const closeDatabase = async () => {
    console.log('\nShutting down server...');
    process.exit(0);
  };

  process.on('SIGINT', closeDatabase);
  process.on('SIGTERM', closeDatabase);
}

export default { handleRequest, initializeServer, registerRoute };
