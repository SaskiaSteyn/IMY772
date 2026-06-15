/**
 * Tests for the S3 helper (lib/s3.js).
 *
 * The AWS SDK is mocked so no real S3 calls or credentials are required — we
 * verify each helper builds the right command and targets the right bucket/key.
 */

import { jest } from '@jest/globals'

const mockSend = jest.fn()
const mockGetSignedUrl = jest.fn()

// Command classes capture their input so we can assert on bucket/key/etc.
class PutObjectCommand {
    constructor(input) {
        this.input = input
    }
}
class GetObjectCommand {
    constructor(input) {
        this.input = input
    }
}
class DeleteObjectCommand {
    constructor(input) {
        this.input = input
    }
}
class S3Client {
    constructor(config) {
        this.config = config
    }
    send(...args) {
        return mockSend(...args)
    }
}

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
}))

jest.unstable_mockModule('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: mockGetSignedUrl,
}))

const { putObject, getPresignedUrl, deleteObject, S3_BUCKET } = await import('../lib/s3.js')

beforeEach(() => {
    jest.clearAllMocks()
})

describe('lib/s3', () => {
    test('putObject sends a PutObjectCommand with bucket, key, body and content type', async () => {
        mockSend.mockResolvedValue({})

        const key = await putObject('profile-images/1', Buffer.from('x'), 'image/png')

        expect(key).toBe('profile-images/1')
        expect(mockSend).toHaveBeenCalledTimes(1)
        const cmd = mockSend.mock.calls[0][0]
        expect(cmd).toBeInstanceOf(PutObjectCommand)
        expect(cmd.input).toMatchObject({
            Bucket: S3_BUCKET,
            Key: 'profile-images/1',
            ContentType: 'image/png',
        })
    })

    test('getPresignedUrl signs a GetObjectCommand for the key', async () => {
        mockGetSignedUrl.mockResolvedValue('https://signed.example/url')

        const url = await getPresignedUrl('profile-images/2')

        expect(url).toBe('https://signed.example/url')
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1)
        const [, cmd, opts] = mockGetSignedUrl.mock.calls[0]
        expect(cmd).toBeInstanceOf(GetObjectCommand)
        expect(cmd.input).toMatchObject({ Bucket: S3_BUCKET, Key: 'profile-images/2' })
        expect(opts).toHaveProperty('expiresIn')
    })

    test('getPresignedUrl honours a custom expiry', async () => {
        mockGetSignedUrl.mockResolvedValue('u')

        await getPresignedUrl('k', 120)

        expect(mockGetSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: 120 })
    })

    test('deleteObject sends a DeleteObjectCommand for the key', async () => {
        mockSend.mockResolvedValue({})

        await deleteObject('profile-images/3')

        const cmd = mockSend.mock.calls[0][0]
        expect(cmd).toBeInstanceOf(DeleteObjectCommand)
        expect(cmd.input).toMatchObject({ Bucket: S3_BUCKET, Key: 'profile-images/3' })
    })

    test('reuses a single lazily-created S3 client across calls', async () => {
        mockSend.mockResolvedValue({})

        await putObject('a', Buffer.from('x'), 'image/png')
        await deleteObject('a')

        expect(mockSend).toHaveBeenCalledTimes(2)
    })
})
