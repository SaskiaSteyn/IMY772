// MicroTrack — serverless image processing.
//
// Triggered by S3 ObjectCreated events under the `profile-images/` prefix.
// When a user uploads a profile picture, this Lambda generates a small 64x64
// avatar thumbnail and writes it to `thumbnails/` in the same bucket. This
// demonstrates AWS serverless (Lambda) processing of real-time S3 events for
// image processing, with no servers to manage.
//
// Credentials come from the Lambda execution role (microtrack-lambda-role).
// @aws-sdk/* v3 is provided by the Lambda Node 20 runtime; only jimp is bundled.

const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
} = require('@aws-sdk/client-s3')
const Jimp = require('jimp')

const s3 = new S3Client({})
const THUMB_SIZE = 64
const SOURCE_PREFIX = 'profile-images/'
const THUMB_PREFIX = 'thumbnails/'

async function streamToBuffer(stream) {
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
}

exports.handler = async (event) => {
    const results = []

    for (const record of event.Records || []) {
        const bucket = record.s3.bucket.name
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

        // Defensive: only process source images, never our own thumbnails.
        if (!key.startsWith(SOURCE_PREFIX) || key.startsWith(THUMB_PREFIX)) {
            continue
        }

        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        const input = await streamToBuffer(obj.Body)

        const image = await Jimp.read(input)
        image.cover(THUMB_SIZE, THUMB_SIZE)
        const output = await image.getBufferAsync(Jimp.MIME_PNG)

        const thumbKey = THUMB_PREFIX + key.slice(SOURCE_PREFIX.length)
        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: thumbKey,
                Body: output,
                ContentType: 'image/png',
            }),
        )

        console.log(`Thumbnail created: s3://${bucket}/${thumbKey} (${output.length} bytes)`)
        results.push(thumbKey)
    }

    return { ok: true, thumbnails: results }
}
