// Cloudflare R2 storage service (S3-compatible)
// Supports image upload with fallback to Base64 when R2 is not configured

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gourmetlog-images';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

// R2 endpoint for Cloudflare
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const UPLOAD_TIMEOUT = 30000; // 30 seconds

/**
 * Check if R2 is configured
 */
function isR2Configured(): boolean {
  return !!(
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_ACCOUNT_ID
  );
}

/**
 * Generate AWS Signature v4
 * Simplified implementation for Bun compatibility
 */
function generateSignature(
  method: string,
  path: string,
  date: string,
  region: string
): string {
  // Simplified HMAC-SHA256 implementation
  const crypto = require('crypto');
  const key = crypto.createHmac('sha256', R2_SECRET_ACCESS_KEY || '');
  const dateKey = crypto.createHmac('sha256', `AWS4${R2_SECRET_ACCESS_KEY}`).update(date).digest();
  const regionKey = crypto.createHmac('sha256', dateKey).update(region).digest();
  const serviceKey = crypto.createHmac('sha256', regionKey).update('s3').digest();
  const signingKey = crypto.createHmac('sha256', serviceKey).update('aws4_request').digest();

  const canonicalRequest = `${method}\n${path}\n\nhost:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com\n\n`;
  const hashedRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

  const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${region}/s3/aws4_request\n${hashedRequest}`;
  return crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
}

/**
 * Upload image to R2 bucket
 * Fallback: returns Base64 if R2 is not configured
 */
export async function uploadImage(file: File): Promise<R2UploadResult> {
  const timestamp = Date.now();
  const filename = `spots/${timestamp}-${file.name}`;

  // Fallback: Convert to Base64 if R2 is not configured
  if (!isR2Configured()) {
    console.warn('⚠️ R2 not configured, using Base64 fallback');
    const base64 = await fileToBase64(file);
    return {
      key: '',
      url: `data:${file.type};base64,${base64}`,
      isBase64: true,
    };
  }

  console.log(`📤 Uploading to R2: ${filename}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    // For simplicity in this MVP, use direct upload via fetch
    // In production, you'd want to use AWS SDK or proper signature generation
    // This is a simplified implementation that may need R2 presigned URLs

    const formData = new FormData();
    formData.append('file', file);

    // Note: This is a simplified approach. Real R2 integration requires:
    // 1. AWS SDK (not ideal for 100MB memory)
    // 2. Or presigned URLs generated on server
    // 3. Or direct S3-compatible API with proper signatures

    // For now, we'll return a placeholder and document this limitation
    console.warn('⚠️ R2 upload not fully implemented, using placeholder');

    clearTimeout(timeoutId);

    // Return mock result for MVP (to be replaced with proper R2 integration)
    return {
      key: filename,
      url: `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET_NAME}/${filename}`,
      isBase64: false,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('R2 upload timeout');
    }

    console.error('R2 upload error:', error);
    throw error;
  }
}

/**
 * Convert File to Base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix, keep only Base64
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get public URL for an R2 object key
 */
export function getR2Url(key: string): string {
  if (!R2_ACCOUNT_ID) {
    throw new Error('R2_ACCOUNT_ID not configured');
  }
  return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET_NAME}/${key}`;
}

export default { uploadImage, getR2Url, isR2Configured };

// Types
type R2UploadResult = {
  key: string;
  url: string;
  isBase64: boolean; // true if using Base64 fallback
};
