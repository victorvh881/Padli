import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Neon Object Storage (S3-compatibel). Sleutels, endpoint en regio komen uit de
// AWS_*-variabelen die `neon deploy` / `neon env pull` invult.
export const UPLOADS_BUCKET = "uploads";

let client: S3Client | undefined;
const s3 = () => (client ??= new S3Client({ forcePathStyle: true })); // Neon vereist path-style

export const storageEnabled = () => Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID);

export async function putFile(key: string, body: Uint8Array | string, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getFile(key: string) {
  const res = await s3().send(new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key }));
  return res.Body ? await res.Body.transformToByteArray() : null;
}

export async function deleteFile(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key }));
}

// Tijdelijke downloadlink voor een privébestand (standaard 1 uur geldig).
export function fileUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key }), { expiresIn });
}
