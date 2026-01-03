// Upload API endpoint
// Handles image uploads to Cloudflare R2

import { uploadImage } from '../services/r2.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Handle POST /api/upload/r2 - Upload image
 */
export async function handleUpload(req: Request): Promise<Response> {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // Validate file exists
    if (!file) {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return Response.json(
        { error: `Invalid file type. Accepted types: ${ACCEPTED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Upload to R2 (or Base64 fallback)
    const result = await uploadImage(file);

    return Response.json({
      success: true,
      data: {
        key: result.key,
        url: result.url,
      },
    });
  } catch (error: unknown) {
    console.error('Error in upload:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Upload failed';

    return Response.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
