import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

router.use(requireAuth, requireAdmin)

const safeUserSelect = {
    userID: true,
    name: true,
    surname: true,
    email: true,
    role: true,
    created_at: true,
    updated_at: true,
}

function parsePositiveInt(rawValue) {
    const parsed = Number(rawValue)
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null
    }

    return parsed
}

function normalizeString(value) {
    if (value === undefined || value === null) {
        return null
    }

    const trimmed = String(value).trim()
    return trimmed.length > 0 ? trimmed : null
}

function normalizeEmail(value) {
    const normalized = normalizeString(value)
    return normalized ? normalized.toLowerCase() : null
}

function validateRole(value) {
    if (value === undefined) {
        return undefined
    }

    return value === 'admin' || value === 'logged_in_user' ? value : null
}

function normalizeDeleteReason(value) {
    const normalized = normalizeString(value)
    if (!normalized || normalized.length < 3) {
        return null
    }

    return normalized
}

async function writeDeleteAudit({ actor, entityType, entityKey, reason }) {
    await prisma.adminDeleteAudit.create({
        data: {
            actorUserID: Number(actor?.userID) || 0,
            actorEmail: normalizeEmail(actor?.email),
            entityType,
            entityKey,
            reason,
        },
    })
}

const adminWaterInclude = {
    metagenomic: {
        orderBy: [{ sequence_name: 'asc' }],
    },
    wgs: {
        orderBy: [{ isolateID: 'asc' }],
        include: {
            virulenceGenes: {
                orderBy: [{ geneSymbol: 'asc' }],
            },
        },
    },
    amrResistanceGenes: {
        orderBy: [{ geneSymbol: 'asc' }],
    },
}

// ─── Admin User CRUD ────────────────────────────────────────────────────────

router.get('/users', async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { userID: 'asc' },
            select: safeUserSelect,
        })

        return res.json({ users })
    } catch (error) {
        console.error('Admin users list error:', error)
        return res.status(500).json({ message: 'Failed to fetch users' })
    }
})

router.get('/users/:id', async (req, res) => {
    const userID = parsePositiveInt(req.params.id)
    if (!userID) {
        return res.status(400).json({ message: 'Invalid user id' })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { userID },
            select: safeUserSelect,
        })

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        return res.json({ user })
    } catch (error) {
        console.error('Admin user fetch error:', error)
        return res.status(500).json({ message: 'Failed to fetch user' })
    }
})

router.post('/users', async (req, res) => {
    const name = normalizeString(req.body.name)
    const surname = normalizeString(req.body.surname)
    const email = normalizeEmail(req.body.email)
    const password = String(req.body.password ?? '')
    const roleInput = validateRole(req.body.role)
    const role = roleInput === undefined ? 'logged_in_user' : roleInput

    if (req.body.role !== undefined && roleInput === null) {
        return res.status(400).json({ message: 'Invalid role value' })
    }

    if (!name || !surname || !email || !password.trim()) {
        return res.status(400).json({
            message: 'name, surname, email and password are required',
        })
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters',
        })
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return res.status(409).json({ message: 'That email is already in use' })
        }

        const password_hash = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                name,
                surname,
                email,
                password_hash,
                role,
            },
            select: safeUserSelect,
        })

        return res.status(201).json({ message: 'User created', user })
    } catch (error) {
        console.error('Admin user create error:', error)
        return res.status(500).json({ message: 'Failed to create user' })
    }
})

router.put('/users/:id', async (req, res) => {
    const userID = parsePositiveInt(req.params.id)
    if (!userID) {
        return res.status(400).json({ message: 'Invalid user id' })
    }

    const name = normalizeString(req.body.name)
    const surname = normalizeString(req.body.surname)
    const email = normalizeEmail(req.body.email)
    const password = req.body.password
    const roleValidation = validateRole(req.body.role)

    if (req.body.role !== undefined && roleValidation === null) {
        return res.status(400).json({ message: 'Invalid role value' })
    }

    if (req.body.name !== undefined && !name) {
        return res.status(400).json({ message: 'name cannot be empty' })
    }

    if (req.body.surname !== undefined && !surname) {
        return res.status(400).json({ message: 'surname cannot be empty' })
    }

    if (req.body.email !== undefined && !email) {
        return res.status(400).json({ message: 'email must be valid' })
    }

    if (
        password !== undefined &&
        String(password).trim().length > 0 &&
        String(password).length < 8
    ) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters',
        })
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { userID },
            select: { userID: true, email: true },
        })

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' })
        }

        if (email && email !== existingUser.email) {
            const duplicate = await prisma.user.findUnique({ where: { email } })
            if (duplicate && duplicate.userID !== userID) {
                return res.status(409).json({ message: 'That email is already in use' })
            }
        }

        const data = {}

        if (req.body.name !== undefined) data.name = name
        if (req.body.surname !== undefined) data.surname = surname
        if (req.body.email !== undefined) data.email = email
        if (roleValidation !== undefined) data.role = roleValidation

        if (password !== undefined && String(password).trim().length > 0) {
            data.password_hash = await bcrypt.hash(String(password), 12)
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                message: 'No valid fields provided for update',
            })
        }

        const user = await prisma.user.update({
            where: { userID },
            data,
            select: safeUserSelect,
        })

        return res.json({ message: 'User updated', user })
    } catch (error) {
        console.error('Admin user update error:', error)
        return res.status(500).json({ message: 'Failed to update user' })
    }
})

router.delete('/users/:id', async (req, res) => {
    const userID = parsePositiveInt(req.params.id)
    if (!userID) {
        return res.status(400).json({ message: 'Invalid user id' })
    }

    const reason = normalizeDeleteReason(req.body?.reason)
    if (!reason) {
        return res.status(400).json({
            message: 'Delete reason is required (minimum 3 characters)',
        })
    }

    if (req.user.userID === userID) {
        return res.status(400).json({
            message: 'You cannot delete your own active account',
        })
    }

    try {
        const targetUser = await prisma.user.findUnique({
            where: { userID },
            select: { userID: true, email: true },
        })

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' })
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.delete({ where: { userID } })
            await tx.adminDeleteAudit.create({
                data: {
                    actorUserID: Number(req.user?.userID) || 0,
                    actorEmail: normalizeEmail(req.user?.email),
                    entityType: 'user',
                    entityKey: {
                        userID: targetUser.userID,
                        email: targetUser.email,
                    },
                    reason,
                },
            })
        })

        return res.json({ message: 'User deleted' })
    } catch (error) {
        console.error('Admin user delete error:', error)
        return res.status(500).json({ message: 'Failed to delete user' })
    }
})

// ─── Admin Water Data CRUD ─────────────────────────────────────────────────

function getDelegate(entityLabel, possibleNames) {
    for (const name of possibleNames) {
        if (prisma[name]) {
            return prisma[name]
        }
    }

    throw new Error(
        `Prisma delegate for ${entityLabel} is unavailable. Run prisma generate.`
    )
}

function castFieldValue(rawValue, fieldName, fieldSpec) {
    const nullable = fieldSpec.nullable !== false

    if (rawValue === null || rawValue === '') {
        if (!nullable) {
            return { error: `${fieldName} cannot be empty` }
        }

        return null
    }

    if (fieldSpec.type === 'number') {
        const value = Number(rawValue)
        if (Number.isNaN(value)) {
            return { error: `${fieldName} must be a valid number` }
        }

        return value
    }

    if (fieldSpec.type === 'int') {
        const value = Number(rawValue)
        if (!Number.isInteger(value)) {
            return { error: `${fieldName} must be a valid integer` }
        }

        return value
    }

    if (fieldSpec.type === 'date') {
        const dateValue = new Date(rawValue)
        if (Number.isNaN(dateValue.getTime())) {
            return { error: `${fieldName} must be a valid date` }
        }

        return dateValue
    }

    const value = String(rawValue).trim()
    if (!value && !nullable) {
        return { error: `${fieldName} cannot be empty` }
    }

    return value || null
}

function buildPayload(body, config, { forCreate }) {
    const payload = {}

    for (const [fieldName, fieldSpec] of Object.entries(config.fields)) {
        const hasField = Object.prototype.hasOwnProperty.call(body, fieldName)

        if (!forCreate && !hasField) {
            continue
        }

        if (forCreate && !hasField) {
            if (fieldSpec.nullable === false) {
                return { error: `${fieldName} is required` }
            }
            payload[fieldName] = null
            continue
        }

        const casted = castFieldValue(body[fieldName], fieldName, fieldSpec)

        if (casted && typeof casted === 'object' && casted.error) {
            return casted
        }

        payload[fieldName] = casted
    }

    if (!forCreate && Object.keys(payload).length === 0) {
        return { error: 'No valid fields provided for update' }
    }

    return payload
}

function encodeRowId(row, keyFields) {
    const keyData = {}

    for (const field of keyFields) {
        keyData[field] = row[field]
    }

    return Buffer.from(JSON.stringify(keyData), 'utf8').toString('base64url')
}

function decodeRowId(rawRowId, keyFields) {
    try {
        const decoded = Buffer.from(rawRowId, 'base64url').toString('utf8')
        const parsed = JSON.parse(decoded)

        const keyData = {}
        for (const field of keyFields) {
            if (
                parsed[field] === undefined ||
                parsed[field] === null ||
                parsed[field] === ''
            ) {
                return null
            }

            keyData[field] = parsed[field]
        }

        return keyData
    } catch {
        return null
    }
}

function parseIntStrict(rawValue) {
    const value = Number(rawValue)
    return Number.isInteger(value) ? value : null
}

function normalizeMetagenomicRecords(value) {
    if (!Array.isArray(value)) {
        return { rows: [], error: null }
    }

    const rows = []
    const seenSequenceNames = new Set()

    for (const record of value) {
        const sequence_name = normalizeString(record?.sequence_name)
        if (!sequence_name) {
            return {
                rows: [],
                error: 'Each metagenomic record requires sequence_name',
            }
        }

        if (seenSequenceNames.has(sequence_name)) {
            return {
                rows: [],
                error: `Duplicate metagenomic sequence_name: ${sequence_name}`,
            }
        }

        seenSequenceNames.add(sequence_name)

        rows.push({
            sequence_name,
            element_type: normalizeString(record?.element_type),
            class: normalizeString(record?.class),
            subclass: normalizeString(record?.subclass),
        })
    }

    return { rows, error: null }
}

function normalizeWgsRecords(value) {
    if (!Array.isArray(value)) {
        return { rows: [], error: null }
    }

    const rows = []
    const seenIsolates = new Set()

    for (const record of value) {
        const isolateID = parseIntStrict(record?.isolateID)
        if (isolateID === null) {
            return {
                rows: [],
                error: 'Each WGS record requires a valid isolateID integer',
            }
        }

        if (seenIsolates.has(isolateID)) {
            return {
                rows: [],
                error: `Duplicate WGS isolateID: ${isolateID}`,
            }
        }

        seenIsolates.add(isolateID)

        const rawVirulence = record?.virulenceGenes ?? record?.virulence_genes
        const virulenceGenes = Array.isArray(rawVirulence)
            ? [...new Set(rawVirulence.map((gene) => normalizeString(gene)).filter(Boolean))]
            : []

        rows.push({
            isolateID,
            organism: normalizeString(record?.organism),
            virulenceGenes,
        })
    }

    return { rows, error: null }
}

function normalizeAmrGeneSymbols(value, metagenomicRows) {
    const directGenes = Array.isArray(value)
        ? value.map((gene) => normalizeString(gene)).filter(Boolean)
        : []

    const metagenomicGenes = []

    const rows = Array.isArray(metagenomicRows) ? metagenomicRows : []

    for (const row of rows) {
        const source = row?.amr_resistance_genes ?? row?.amrResistanceGenes
        if (!Array.isArray(source)) {
            continue
        }

        for (const gene of source) {
            const normalized = normalizeString(gene)
            if (normalized) {
                metagenomicGenes.push(normalized)
            }
        }
    }

    return [...new Set([...directGenes, ...metagenomicGenes])]
}

const measurementsConfig = {
    keyFields: ['sampleID'],
    fields: {
        water_temperature: { type: 'number' },
        ph: { type: 'number' },
        tds: { type: 'number' },
        do: { type: 'number' },
        sample_analysis_type: { type: 'string' },
        isolation_source: { type: 'string' },
        collection_date: { type: 'date' },
        location_name: { type: 'string' },
        latitude: { type: 'number', nullable: false },
        longitude: { type: 'number', nullable: false },
        collected_by: { type: 'string' },
        predicted_sir_profile: { type: 'string' },
    },
    list: () =>
        getDelegate('measurements', ['sample']).findMany({
            orderBy: { sampleID: 'desc' },
        }),
    create: (data) => getDelegate('measurements', ['sample']).create({ data }),
    updateMany: (where, data) =>
        getDelegate('measurements', ['sample']).updateMany({ where, data }),
    deleteMany: (where) =>
        getDelegate('measurements', ['sample']).deleteMany({ where }),
    findFirst: (where) =>
        getDelegate('measurements', ['sample']).findFirst({ where }),
}

const entityConfig = {
    measurements: measurementsConfig,
    samples: measurementsConfig,
    metagenomic: {
        keyFields: ['sampleID', 'sequence_name'],
        fields: {
            sampleID: { type: 'int', nullable: false },
            sequence_name: { type: 'string', nullable: false },
            element_type: { type: 'string' },
            class: { type: 'string' },
            subclass: { type: 'string' },
        },
        list: () =>
            getDelegate('metagenomic', ['metagenomic']).findMany({
                orderBy: [{ sampleID: 'desc' }, { sequence_name: 'asc' }],
            }),
        create: (data) =>
            getDelegate('metagenomic', ['metagenomic']).create({ data }),
        updateMany: (where, data) =>
            getDelegate('metagenomic', ['metagenomic']).updateMany({
                where,
                data,
            }),
        deleteMany: (where) =>
            getDelegate('metagenomic', ['metagenomic']).deleteMany({ where }),
        findFirst: (where) =>
            getDelegate('metagenomic', ['metagenomic']).findFirst({ where }),
    },
    wgs: {
        keyFields: ['sampleID', 'isolateID'],
        fields: {
            sampleID: { type: 'int', nullable: false },
            isolateID: { type: 'int', nullable: false },
            organism: { type: 'string' },
        },
        list: () =>
            getDelegate('wgs', ['wGS', 'wgs']).findMany({
                orderBy: [{ sampleID: 'desc' }, { isolateID: 'desc' }],
            }),
        create: (data) => getDelegate('wgs', ['wGS', 'wgs']).create({ data }),
        updateMany: (where, data) =>
            getDelegate('wgs', ['wGS', 'wgs']).updateMany({ where, data }),
        deleteMany: (where) =>
            getDelegate('wgs', ['wGS', 'wgs']).deleteMany({ where }),
        findFirst: (where) =>
            getDelegate('wgs', ['wGS', 'wgs']).findFirst({ where }),
    },
    amrResistanceGenes: {
        keyFields: ['sampleID', 'geneSymbol'],
        fields: {
            sampleID: { type: 'int', nullable: false },
            geneSymbol: { type: 'string', nullable: false },
        },
        list: () =>
            getDelegate('amrResistanceGenes', [
                'aMRResistanceGene',
                'amrResistanceGene',
            ]).findMany({
                orderBy: [{ sampleID: 'desc' }, { geneSymbol: 'asc' }],
            }),
        create: (data) =>
            getDelegate('amrResistanceGenes', [
                'aMRResistanceGene',
                'amrResistanceGene',
            ]).create({ data }),
        updateMany: (where, data) =>
            getDelegate('amrResistanceGenes', [
                'aMRResistanceGene',
                'amrResistanceGene',
            ]).updateMany({ where, data }),
        deleteMany: (where) =>
            getDelegate('amrResistanceGenes', [
                'aMRResistanceGene',
                'amrResistanceGene',
            ]).deleteMany({ where }),
        findFirst: (where) =>
            getDelegate('amrResistanceGenes', [
                'aMRResistanceGene',
                'amrResistanceGene',
            ]).findFirst({ where }),
    },
    virulenceGenes: {
        keyFields: ['sampleID', 'isolateID', 'geneSymbol'],
        fields: {
            sampleID: { type: 'int', nullable: false },
            isolateID: { type: 'int', nullable: false },
            geneSymbol: { type: 'string', nullable: false },
        },
        list: () =>
            getDelegate('virulenceGenes', ['virulenceGene']).findMany({
                orderBy: [
                    { sampleID: 'desc' },
                    { isolateID: 'desc' },
                    { geneSymbol: 'asc' },
                ],
            }),
        create: (data) =>
            getDelegate('virulenceGenes', ['virulenceGene']).create({ data }),
        updateMany: (where, data) =>
            getDelegate('virulenceGenes', ['virulenceGene']).updateMany({
                where,
                data,
            }),
        deleteMany: (where) =>
            getDelegate('virulenceGenes', ['virulenceGene']).deleteMany({
                where,
            }),
        findFirst: (where) =>
            getDelegate('virulenceGenes', ['virulenceGene']).findFirst({
                where,
            }),
    },
}

router.get('/water/samples', async (_req, res) => {
    try {
        const rows = await prisma.sample.findMany({
            orderBy: [{ sampleID: 'desc' }],
            include: adminWaterInclude,
        })

        return res.json({
            rows: rows.map((row) => ({
                ...row,
                _rowId: encodeRowId(row, ['sampleID']),
            })),
        })
    } catch (error) {
        console.error('Admin water samples list error:', error)
        return res.status(500).json({ message: 'Failed to fetch water samples' })
    }
})

router.post('/water/samples', async (req, res) => {
    const samplePayload = buildPayload(req.body ?? {}, measurementsConfig, {
        forCreate: true,
    })

    if (samplePayload.error) {
        return res.status(400).json({ message: samplePayload.error })
    }

    const metagenomicRecordsResult = normalizeMetagenomicRecords(
        req.body?.metagenomic
    )
    if (metagenomicRecordsResult.error) {
        return res.status(400).json({ message: metagenomicRecordsResult.error })
    }

    const wgsRecordsResult = normalizeWgsRecords(req.body?.wgs)
    if (wgsRecordsResult.error) {
        return res.status(400).json({ message: wgsRecordsResult.error })
    }

    const amrGeneSymbols = normalizeAmrGeneSymbols(
        req.body?.amrResistanceGenes ?? req.body?.amr_resistance_genes,
        req.body?.metagenomic
    )

    try {
        const row = await prisma.$transaction(async (tx) => {
            const createdSample = await tx.sample.create({
                data: samplePayload,
            })

            for (const metagenomicRecord of metagenomicRecordsResult.rows) {
                await tx.metagenomic.create({
                    data: {
                        sampleID: createdSample.sampleID,
                        sequence_name: metagenomicRecord.sequence_name,
                        element_type: metagenomicRecord.element_type,
                        class: metagenomicRecord.class,
                        subclass: metagenomicRecord.subclass,
                    },
                })
            }

            for (const geneSymbol of amrGeneSymbols) {
                await tx.amrResistanceGene.create({
                    data: {
                        sampleID: createdSample.sampleID,
                        geneSymbol,
                    },
                })
            }

            for (const wgsRecord of wgsRecordsResult.rows) {
                await tx.wgs.create({
                    data: {
                        sampleID: createdSample.sampleID,
                        isolateID: wgsRecord.isolateID,
                        organism: wgsRecord.organism,
                    },
                })

                for (const geneSymbol of wgsRecord.virulenceGenes) {
                    await tx.virulenceGene.create({
                        data: {
                            sampleID: createdSample.sampleID,
                            isolateID: wgsRecord.isolateID,
                            geneSymbol,
                        },
                    })
                }
            }

            const completeRow = await tx.sample.findUnique({
                where: { sampleID: createdSample.sampleID },
                include: adminWaterInclude,
            })

            return completeRow || createdSample
        })

        return res.status(201).json({
            message: 'Water sample created',
            row: {
                ...row,
                _rowId: encodeRowId(row, ['sampleID']),
            },
        })
    } catch (error) {
        if (error.code === 'P2002') {
            return res
                .status(409)
                .json({ message: 'A child record with this key already exists' })
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Related record was not found' })
        }

        console.error('Admin water sample create error:', error)
        return res.status(500).json({ message: 'Failed to create water sample' })
    }
})

router.put('/water/samples/:sampleID', async (req, res) => {
    const sampleID = parsePositiveInt(req.params.sampleID)
    if (!sampleID) {
        return res.status(400).json({ message: 'Invalid sample id' })
    }

    const payload = buildPayload(req.body ?? {}, measurementsConfig, {
        forCreate: false,
    })

    if (payload.error) {
        return res.status(400).json({ message: payload.error })
    }

    try {
        const row = await prisma.sample.update({
            where: { sampleID },
            data: payload,
            include: adminWaterInclude,
        })

        return res.json({
            message: 'Water sample updated',
            row: {
                ...row,
                _rowId: encodeRowId(row, ['sampleID']),
            },
        })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Sample not found' })
        }

        console.error('Admin water sample update error:', error)
        return res.status(500).json({ message: 'Failed to update water sample' })
    }
})

router.delete('/water/samples/:sampleID', async (req, res) => {
    const sampleID = parsePositiveInt(req.params.sampleID)
    if (!sampleID) {
        return res.status(400).json({ message: 'Invalid sample id' })
    }

    const reason = normalizeDeleteReason(req.body?.reason)
    if (!reason) {
        return res.status(400).json({
            message: 'Delete reason is required (minimum 3 characters)',
        })
    }

    try {
        const existing = await prisma.sample.findUnique({
            where: { sampleID },
            select: { sampleID: true },
        })

        if (!existing) {
            return res.status(404).json({ message: 'Sample not found' })
        }

        await prisma.$transaction(async (tx) => {
            await tx.virulenceGene.deleteMany({ where: { sampleID } })
            await tx.wgs.deleteMany({ where: { sampleID } })
            await tx.metagenomic.deleteMany({ where: { sampleID } })
            await tx.amrResistanceGene.deleteMany({ where: { sampleID } })
            await tx.sample.delete({ where: { sampleID } })
            await tx.adminDeleteAudit.create({
                data: {
                    actorUserID: Number(req.user?.userID) || 0,
                    actorEmail: normalizeEmail(req.user?.email),
                    entityType: 'water_sample',
                    entityKey: { sampleID },
                    reason,
                },
            })
        })

        return res.json({ message: 'Water sample deleted' })
    } catch (error) {
        console.error('Admin water sample delete error:', error)
        return res.status(500).json({ message: 'Failed to delete water sample' })
    }
})

router.get('/summary', async (_req, res) => {
    try {
        const [
            usersCount,
            samplesCount,
            metagenomicCount,
            wgsCount,
            amrCount,
            virulenceCount,
            recentDeletions,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.sample.count(),
            prisma.metagenomic.count(),
            prisma.wgs.count(),
            prisma.amrResistanceGene.count(),
            prisma.virulenceGene.count(),
            prisma.adminDeleteAudit.findMany({
                orderBy: [{ created_at: 'desc' }],
                take: 6,
                select: {
                    id: true,
                    actorUserID: true,
                    actorEmail: true,
                    entityType: true,
                    entityKey: true,
                    reason: true,
                    created_at: true,
                },
            }),
        ])

        return res.json({
            metrics: {
                usersCount,
                samplesCount,
                metagenomicCount,
                wgsCount,
                amrCount,
                virulenceCount,
            },
            recentDeletions,
        })
    } catch (error) {
        console.error('Admin summary error:', error)
        return res.status(500).json({ message: 'Failed to fetch summary metrics' })
    }
})

router.get('/data/:entity', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) {
        return res.status(404).json({ message: 'Unknown data entity' })
    }

    try {
        const rows = await config.list()
        const rowsWithId = rows.map((row) => ({
            ...row,
            _rowId: encodeRowId(row, config.keyFields),
        }))

        return res.json({ rows: rowsWithId })
    } catch (error) {
        console.error(`Admin list error (${req.params.entity}):`, error)
        return res.status(500).json({ message: 'Failed to fetch data' })
    }
})

router.post('/data/:entity', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) {
        return res.status(404).json({ message: 'Unknown data entity' })
    }

    const payload = buildPayload(req.body ?? {}, config, { forCreate: true })
    if (payload.error) {
        return res.status(400).json({ message: payload.error })
    }

    try {
        const row = await config.create(payload)

        return res.status(201).json({
            message: 'Record created',
            row: {
                ...row,
                _rowId: encodeRowId(row, config.keyFields),
            },
        })
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'A record with this key already exists' })
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Related record was not found' })
        }

        console.error(`Admin create error (${req.params.entity}):`, error)
        return res.status(500).json({ message: 'Failed to create data record' })
    }
})

router.put('/data/:entity/:rowId', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) {
        return res.status(404).json({ message: 'Unknown data entity' })
    }

    const rowId = decodeURIComponent(req.params.rowId || '').trim()
    const keyWhere = decodeRowId(rowId, config.keyFields)
    if (!keyWhere) {
        return res.status(400).json({ message: 'Invalid row id' })
    }

    const payload = buildPayload(req.body ?? {}, config, { forCreate: false })
    if (payload.error) {
        return res.status(400).json({ message: payload.error })
    }

    try {
        const updated = await config.updateMany(keyWhere, payload)
        if (updated.count === 0) {
            return res.status(404).json({ message: 'Record not found' })
        }

        const nextWhere = { ...keyWhere }
        for (const field of config.keyFields) {
            if (Object.prototype.hasOwnProperty.call(payload, field)) {
                nextWhere[field] = payload[field]
            }
        }

        const row = await config.findFirst(nextWhere)

        if (!row) {
            return res.json({ message: 'Record updated' })
        }

        return res.json({
            message: 'Record updated',
            row: {
                ...row,
                _rowId: encodeRowId(row, config.keyFields),
            },
        })
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'A record with this key already exists' })
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Related record was not found' })
        }

        console.error(`Admin update error (${req.params.entity}):`, error)
        return res.status(500).json({ message: 'Failed to update data record' })
    }
})

router.delete('/data/:entity/:rowId', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) {
        return res.status(404).json({ message: 'Unknown data entity' })
    }

    const reason = normalizeDeleteReason(req.body?.reason)
    if (!reason) {
        return res.status(400).json({
            message: 'Delete reason is required (minimum 3 characters)',
        })
    }

    const rowId = decodeURIComponent(req.params.rowId || '').trim()
    const keyWhere = decodeRowId(rowId, config.keyFields)
    if (!keyWhere) {
        return res.status(400).json({ message: 'Invalid row id' })
    }

    try {
        const isSampleDelete =
            req.params.entity === 'measurements' || req.params.entity === 'samples'

        if (isSampleDelete) {
            const sampleID = parseIntStrict(keyWhere.sampleID)
            if (sampleID === null) {
                return res.status(400).json({ message: 'Invalid sample id in row id' })
            }

            const existingSample = await prisma.sample.findUnique({
                where: { sampleID },
                select: { sampleID: true },
            })

            if (!existingSample) {
                return res.status(404).json({ message: 'Record not found' })
            }

            await prisma.$transaction(async (tx) => {
                await tx.virulenceGene.deleteMany({ where: { sampleID } })
                await tx.wgs.deleteMany({ where: { sampleID } })
                await tx.metagenomic.deleteMany({ where: { sampleID } })
                await tx.amrResistanceGene.deleteMany({ where: { sampleID } })
                await tx.sample.delete({ where: { sampleID } })
                await tx.adminDeleteAudit.create({
                    data: {
                        actorUserID: Number(req.user?.userID) || 0,
                        actorEmail: normalizeEmail(req.user?.email),
                        entityType: req.params.entity,
                        entityKey: keyWhere,
                        reason,
                    },
                })
            })

            return res.json({ message: 'Record deleted' })
        }

        const deleted = await config.deleteMany(keyWhere)
        if (deleted.count === 0) {
            return res.status(404).json({ message: 'Record not found' })
        }

        await writeDeleteAudit({
            actor: req.user,
            entityType: req.params.entity,
            entityKey: keyWhere,
            reason,
        })

        return res.json({ message: 'Record deleted' })
    } catch (error) {
        console.error(`Admin delete error (${req.params.entity}):`, error)
        return res.status(500).json({ message: 'Failed to delete data record' })
    }
})

export default router
