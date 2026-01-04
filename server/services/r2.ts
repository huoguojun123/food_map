// Cloudflare R2 storage service (S3-compatible)
// Supports image upload with fallback to Base64 when R2 is not configured

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gourmetlog-images';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// R2 endpoint for Cloudflare
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const UPLOAD_TIMEOUT = 30000; // 30 seconds
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds

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

function getAmzDates(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  }
}

function sha256Hex(data: Buffer | string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(data).digest('hex')
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', key).update(data).digest()
}

function getSignatureKey(secret: string, dateStamp: string, region: string): Buffer {
  const kDate = hmacSha256(`AWS4${secret}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, 's3')
  return hmacSha256(kService, 'aws4_request')
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

/**
 * Upload image to R2 bucket
 * Fallback: returns Base64 if R2 is not configured
 */
export async function uploadImage(file: File): Promise<R2UploadResult> {
  const timestamp = Date.now();
  const objectKey = `spots/${timestamp}-${file.name}`;
  const encodedKey = encodeKey(objectKey);

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

  console.log(`📤 Uploading to R2: ${objectKey}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

  try {
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${encodedKey}`;

    const arrayBuffer = await file.arrayBuffer();
    const payload = Buffer.from(arrayBuffer);
    const payloadHash = sha256Hex(payload);

    const { amzDate, dateStamp } = getAmzDates(new Date());
    const region = 'auto';

    const canonicalUri = `/${R2_BUCKET_NAME}/${encodedKey}`;
    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${region}/s3/aws4_request`,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY || '', dateStamp, region);
    const signature = hmacSha256(signingKey, stringToSign).toString('hex');

    const authorization = [
      'AWS4-HMAC-SHA256 Credential=' +
        `${R2_ACCESS_KEY_ID}/${dateStamp}/${region}/s3/aws4_request`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`R2 upload failed: ${response.status} ${errorText}`);
    }

    const publicBase = R2_PUBLIC_URL
      ? R2_PUBLIC_URL.replace(/\/$/, '')
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev`;

    return {
      key: objectKey,
      url: `${publicBase}/${encodedKey}`,
      isBase64: false,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('R2 upload timeout');
    }

    console.error('R2 upload error:', error);
    if (!isR2Configured()) {
      const base64 = await fileToBase64(file);
      return {
        key: '',
        url: `data:${file.type};base64,${base64}`,
        isBase64: true,
      };
    }

    throw error instanceof Error ? error : new Error('R2 upload failed');
  }
}

/**
 * Fetch object from R2 (private bucket supported via signed request)
 */
export async function getObject(objectKey: string): Promise<Response> {
  if (!isR2Configured()) {
    return new Response('R2 not configured', { status: 400 })
  }

  const encodedKey = encodeKey(objectKey)
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${encodedKey}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT)

  try {
    const payloadHash = sha256Hex('')
    const { amzDate, dateStamp } = getAmzDates(new Date())
    const region = 'auto'

    const canonicalUri = `/${R2_BUCKET_NAME}/${encodedKey}`
    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const canonicalRequest = [
      'GET',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${region}/s3/aws4_request`,
      sha256Hex(canonicalRequest),
    ].join('\n')

    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY || '', dateStamp, region)
    const signature = hmacSha256(signingKey, stringToSign).toString('hex')
    const authorization = [
      'AWS4-HMAC-SHA256 Credential=' +
        `${R2_ACCESS_KEY_ID}/${dateStamp}/${region}/s3/aws4_request`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ')

    return await fetch(url, {
      method: 'GET',
      headers: {
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      },
      signal: controller.signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('R2 download timeout')
    }
    throw error instanceof Error ? error : new Error('R2 download failed')
  } finally {
    clearTimeout(timeoutId)
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

export default { uploadImage, getObject, getR2Url, isR2Configured };

// Types
type R2UploadResult = {
  key: string;
  url: string;
  isBase64: boolean; // true if using Base64 fallback
};
