import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ─── Configuration ────────────────────────────────────────────────────────────
//
// Credentials are resolved by the AWS SDK's default provider chain. In production
// the EC2 instance role (microtrack-ec2-role) supplies them automatically — no
// access keys live in code or env. Region/bucket are configurable via env.

const REGION = process.env.AWS_REGION || 'us-east-1'
export const S3_BUCKET = process.env.S3_BUCKET || 'microtrack-images'
const PRESIGN_EXPIRY_SECONDS = Number(process.env.S3_PRESIGN_EXPIRY) || 60 * 60 // 1 hour

let s3Client = null

function getS3Client() {
    if (!s3Client) {
        s3Client = new S3Client({ region: REGION })
    }
    return s3Client
}

/** Uploads a buffer to the bucket under `key`, overwriting any existing object. */
export async function putObject(key, body, contentType) {
    await getS3Client().send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    )
    return key
}

/**
 * Returns a short-lived presigned GET URL for `key`. The bucket stays private —
 * the browser fetches the object directly via this time-limited signed URL.
 */
export async function getPresignedUrl(key, expiresIn = PRESIGN_EXPIRY_SECONDS) {
    return getSignedUrl(
        getS3Client(),
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
        { expiresIn },
    )
}

/** Deletes an object by key. Safe to call for a key that may not exist. */
export async function deleteObject(key) {
    await getS3Client().send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    )
}
