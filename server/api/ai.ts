// AI API endpoints
// Handles AI extraction from images and text

import { extractFromImage, extractFromText } from '../services/openai.js';

/**
 * Handle POST /api/ai/extract - Extract restaurant info
 */
export async function handleAiExtract(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    // Validate request body
    if (!body.type || (body.type !== 'image' && body.type !== 'text' && body.type !== 'url')) {
      return Response.json(
        { error: 'Invalid type, must be "image", "text" or "url"' },
        { status: 400 }
      );
    }

    // Handle image extraction
    if (body.type === 'image') {
      if (!body.image) {
        return Response.json(
          { error: 'Image data is required for image type' },
          { status: 400 }
        );
      }

      const result = await extractFromImage(body.image);
      return Response.json({
        success: true,
        data: result,
      });
    }

    // Handle text extraction
    if (body.type === 'text') {
      if (!body.text) {
        return Response.json(
          { error: 'Text data is required for text type' },
          { status: 400 }
        );
      }

      const result = await extractFromText(body.text);
      return Response.json({
        success: true,
        data: result,
      });
    }

    // Handle URL extraction
    if (body.type === 'url') {
      if (!body.url || typeof body.url !== 'string') {
        return Response.json(
          { error: 'URL is required for url type' },
          { status: 400 }
        );
      }

      const normalizedUrl = normalizeUrl(body.url);
      if (!normalizedUrl) {
        return Response.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      if (!isSafeUrl(normalizedUrl)) {
        return Response.json(
          { error: 'URL is not allowed' },
          { status: 400 }
        );
      }

      const pageText = await fetchPageText(normalizedUrl);
      const result = await extractFromText(pageText);
      return Response.json({
        success: true,
        data: result,
      });
    }

    // Should not reach here
    return Response.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Error in AI extract:', error);

    // Return user-friendly error message
    const errorMessage =
      error instanceof Error ? error.message : 'AI extraction failed';

    return Response.json(
      {
        success: false,
        data: null,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

function normalizeUrl(value: string): string | null {
  try {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.toString();
  } catch {
    return null;
  }
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return false;
    }
    if (isPrivateIp(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isPrivateIp(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) {
    return false;
  }
  const octets = parts.map(part => Number(part));
  if (octets.some(value => Number.isNaN(value))) {
    return false;
  }
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GourmetLogBot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const clipped = html.slice(0, 20000);
  return extractPlainText(clipped);
}

function extractPlainText(html: string): string {
  const scriptPattern = new RegExp('<script[^>]*>[\\s\\S]*?<\\/script>', 'gi')
  const stylePattern = new RegExp('<style[^>]*>[\\s\\S]*?<\\/style>', 'gi')
  const tagPattern = new RegExp('<[^>]+>', 'g')
  const spacePattern = new RegExp('\\s+', 'g')

  const withoutScripts = html.replace(scriptPattern, ' ').replace(stylePattern, ' ')
  const withoutTags = withoutScripts.replace(tagPattern, ' ')
  return withoutTags.replace(spacePattern, ' ').trim().slice(0, 4000)
}
