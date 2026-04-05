import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://pub-xxx.r2.dev

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Uploads a file to Cloudflare R2
 */
export async function uploadImage(
  data: Uint8Array | ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  if (!R2_BUCKET_NAME) throw new Error("R2_BUCKET_NAME is not configured");

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: data instanceof ArrayBuffer ? new Uint8Array(data) : data,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${filename}`;
  }

  // Fallback to the R2 endpoint if no public URL is provided (might need auth)
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
}

/**
 * Deletes a file from Cloudflare R2
 */
export async function deleteImage(filename: string): Promise<void> {
  if (!R2_BUCKET_NAME) throw new Error("R2_BUCKET_NAME is not configured");

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
  });

  await s3Client.send(command);
}
