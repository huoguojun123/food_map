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
    if (!body.type || (body.type !== 'image' && body.type !== 'text')) {
      return Response.json(
        { error: 'Invalid type, must be "image" or "text"' },
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
