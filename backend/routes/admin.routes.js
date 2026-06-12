import {Router} from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import {requireAdmin, requireAuth} from '../middleware/auth.middleware.js'

const router = Router()
router.use(requireAuth, requireAdmin)

// -------------------- Helpers --------------------
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
    if (!Number.isInteger(parsed) || parsed <= 0) return null
    return parsed
}

function normalizeString(value) {
    if (value === undefined || value === null) return null
    const trimmed = String(value).trim()
    return trimmed.length > 0 ? trimmed : null
}

function normalizeEmail(value) {
    const normalized = normalizeString(value)
    return normalized ? normalized.toLowerCase() : null
}

function validateRole(value) {
    if (value === undefined) return undefined
    return value === 'admin' || value === 'logged_in_user' ? value : null
}

function normalizeDeleteReason(value) {
    const normalized = normalizeString(value)
    if (!normalized || normalized.length < 3) return null
    return normalized
}

async function writeDeleteAudit({actor, entityType, entityKey, reason}) {
    await prisma.adminDeleteAudit.create({
        data: {
            actorUserID: actor?.userID || 0,
            actorEmail: normalizeEmail(actor?.email),
            entityType,
            entityKey,
            reason,
        },
    })
}

// -------------------- User CRUD --------------------

router.get('/users', async (_req, res) => {
    try {
        const users = await prisma.user.findMany({orderBy: {userID: 'asc'}, select: safeUserSelect})
        return res.json({users})
    } catch (error) {
        console.error('Admin users list error:', error)
        return res.status(500).json({message: 'Failed to fetch users'})
    }
})

router.get('/users/:id', async (req, res) => {
    const userID = parsePositiveInt(req.params.id)
    if (!userID) return res.status(400).json({message: 'Invalid user id'})
    try {
        const user = await prisma.user.findUnique({where: {userID}, select: safeUserSelect})
        if (!user) return res.status(404).json({message: 'User not found'})
        return res.json({user})
    } catch (error) {
        console.error('Admin user fetch error:', error)
        return res.status(500).json({message: 'Failed to fetch user'})
    }
})

router.post('/users', async (req, res) => {
    const name = normalizeString(req.body.name)
    const surname = normalizeString(req.body.surname)
    const email = normalizeEmail(req.body.email)
    const password = String(req.body.password ?? '')
    const roleInput = validateRole(req.body.role)
    const role = roleInput === undefined ? 'logged_in_user' : roleInput

    if (req.body.role !== undefined && roleInput === null)
        return res.status(400).json({message: 'Invalid role value'})
    if (!name || !surname || !email || !password.trim())
        return res.status(400).json({message: 'name, surname, email and password are required'})
    if (password.length < 8)
        return res.status(400).json({message: 'Password must be at least 8 characters'})

    try {
        const existing = await prisma.user.findUnique({where: {email}})
        if (existing) return res.status(409).json({message: 'That email is already in use'})
        const password_hash = await bcrypt.hash(password, 12)
        const user = await prisma.user.create({
            data: {name, surname, email, password_hash, role},
            select: safeUserSelect,
        })
        return res.status(201).json({message: 'User created', user})
    } catch (error) {
        console.error('Admin user create error:', error)
        return res.status(500).json({message: 'Failed to create user'})
    }
})

router.put('/users/:id', async (req, res) => {
    const userID = parsePositiveInt(req.params.id)
    if (!userID) return res.status(400).json({message: 'Invalid user id'})
    const name = normalizeString(req.body.name)
    const surname = normalizeString(req.body.surname)
    const email = normalizeEmail(req.body.email)
    const password = req.body.password
    const roleValidation = validateRole(req.body.role)

    if (req.body.role !== undefined && roleValidation === null)
        return res.status(400).json({message: 'Invalid role value'})
    if (req.body.name !== undefined && !name)
        return res.status(400).json({message: 'name cannot be empty'})
    if (req.body.surname !== undefined && !surname)
        return res.status(400).json({message: 'surname cannot be empty'})
    if (req.body.email !== undefined && !email)
        return res.status(400).json({message: 'email must be valid'})
    if (password !== undefined && String(password).trim().length > 0 && String(password).length < 8)
        return res.status(400).json({message: 'Password must be at least 8 characters'})

    try {
        const existingUser = await prisma.user.findUnique({where: {userID}, select: {userID: true, email: true}})
        if (!existingUser) return res.status(404).json({message: 'User not found'})
        if (email && email !== existingUser.email) {
            const duplicate = await prisma.user.findUnique({where: {email}})
            if (duplicate && duplicate.userID !== userID)
                return res.status(409).json({message: 'That email is already in use'})
        }
        const data = {}
        if (req.body.name !== undefined) data.name = name
        if (req.body.surname !== undefined) data.surname = surname
        if (req.body.email !== undefined) data.email = email
        if (roleValidation !== undefined) data.role = roleValidation
        if (password !== undefined && String(password).trim().length > 0)
            data.password_hash = await bcrypt.hash(String(password), 12)
        if (Object.keys(data).length === 0)
            return res.status(400).json({message: 'No valid fields provided for update'})
        const user = await prisma.user.update({where: {userID}, data, select: safeUserSelect})
        return res.json({message: 'User updated', user})
    } catch (error) {
        console.error('Admin user update error:', error)
        return res.status(500).json({message: 'Failed to update user'})
    }
})

router.delete('/users/:id', async (req, res) => {
    const userID = parsePositiveInt(req.params.id)
    if (!userID) return res.status(400).json({message: 'Invalid user id'})
    const reason = normalizeDeleteReason(req.body?.reason)
    if (!reason) return res.status(400).json({message: 'Delete reason is required (minimum 3 characters)'})
    if (req.user.userID === userID) return res.status(400).json({message: 'You cannot delete your own active account'})
    try {
        const targetUser = await prisma.user.findUnique({where: {userID}, select: {userID: true, email: true}})
        if (!targetUser) return res.status(404).json({message: 'User not found'})
        await prisma.$transaction(async (tx) => {
            // Delete all samples owned by this user (and their relations)
            const userSamples = await tx.sample.findMany({where: {uploaded_by: userID}, select: {sample_id: true}})
            for (const {sample_id} of userSamples) {
                await tx.isolate.deleteMany({where: {sample_id}})
                await tx.amrFinding.deleteMany({where: {sample_id}})
                await tx.predictedPhenotype.deleteMany({where: {sample_id}})
                await tx.sample.delete({where: {sample_id}})
            }
            await tx.user.delete({where: {userID}})
            await tx.adminDeleteAudit.create({
                data: {
                    actorUserID: req.user.userID,
                    actorEmail: normalizeEmail(req.user.email),
                    entityType: 'user',
                    entityKey: {userID: targetUser.userID, email: targetUser.email},
                    reason,
                },
            })
        })
        return res.json({message: 'User deleted'})
    } catch (error) {
        console.error('Admin user delete error:', error)
        return res.status(500).json({message: 'Failed to delete user'})
    }
})

// -------------------- Water Samples CRUD  --------------------
// Include related isolates, amrFindings, predictedPhenotypes
const waterSampleInclude = {
    isolates: {orderBy: {isolate_id: 'asc'}},
    amrFindings: {orderBy: {finding_id: 'asc'}},
    predictedPhenotypes: {orderBy: {phenotype_id: 'asc'}},
}

// Encode row id for sample (sample_id string)
function encodeRowId(row, keyFields) {
    const keyData = {}
    for (const field of keyFields) keyData[field] = row[field]
    return Buffer.from(JSON.stringify(keyData), 'utf8').toString('base64url')
}

function decodeRowId(rawRowId, keyFields) {
    try {
        const decoded = Buffer.from(rawRowId, 'base64url').toString('utf8')
        const parsed = JSON.parse(decoded)
        const keyData = {}
        for (const field of keyFields) {
            if (parsed[field] === undefined || parsed[field] === null || parsed[field] === '')
                return null
            keyData[field] = parsed[field]
        }
        return keyData
    } catch {
        return null
    }
}

function normalizeStringArray(value) {
    if (!Array.isArray(value)) return []
    return value.map(v => normalizeString(v)).filter(Boolean)
}

router.get('/water/samples', async (_req, res) => {
    try {
        const rows = await prisma.sample.findMany({
            orderBy: {created_at: 'desc'},
            include: waterSampleInclude,
        })
        return res.json({
            rows: rows.map(row => ({...row, _rowId: encodeRowId(row, ['sample_id'])})),
        })
    } catch (error) {
        console.error('Admin water samples list error:', error)
        return res.status(500).json({message: 'Failed to fetch water samples'})
    }
})

router.post('/water/samples', async (req, res) => {
    const {sample_id, sample_name, collected_by, latitude, longitude, water_temp, ph, tds, do: doVal, isolation_source, collection_date, location_name, isolates, amrFindings, predictedPhenotypes} = req.body

    if (!sample_id || !latitude || !longitude) {
        return res.status(400).json({message: 'sample_id, latitude, longitude are required'})
    }

    try {
        const createdSample = await prisma.sample.create({
            data: {
                sample_id,
                sample_name: sample_name || sample_id,
                collected_by: collected_by || null,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                water_temp: water_temp !== undefined ? parseFloat(water_temp) : null,
                ph: ph !== undefined ? parseFloat(ph) : null,
                tds: tds !== undefined ? parseFloat(tds) : null,
                do: doVal !== undefined ? parseFloat(doVal) : null,
                isolation_source: isolation_source || null,
                collection_date: collection_date ? new Date(collection_date) : null,
                location_name: location_name || null,
                uploaded_by: req.user.userID,
            },
            include: waterSampleInclude,
        })

        // Create nested relations if provided
        if (Array.isArray(isolates)) {
            for (const iso of isolates) {
                await prisma.isolate.create({
                    data: {sample_id: createdSample.sample_id, organism: iso.organism, mlst_type: iso.mlst_type},
                })
            }
        }
        if (Array.isArray(amrFindings)) {
            for (const amr of amrFindings) {
                await prisma.amrFinding.create({
                    data: {
                        sample_id: createdSample.sample_id,
                        analysis_type: amr.analysis_type,
                        gene_symbol: amr.gene_symbol,
                        amr_class: amr.amr_class,
                        method: amr.method,
                        percent_identity: amr.percent_identity ? parseFloat(amr.percent_identity) : null,
                    },
                })
            }
        }
        if (Array.isArray(predictedPhenotypes)) {
            for (const phen of predictedPhenotypes) {
                await prisma.predictedPhenotype.create({
                    data: {
                        sample_id: createdSample.sample_id,
                        organism: phen.organism,
                        antibiotic: phen.antibiotic,
                        predicted_sir_profile: phen.predicted_sir_profile || null,
                    },
                })
            }
        }

        // Reload with relations
        const fullSample = await prisma.sample.findUnique({
            where: {sample_id: createdSample.sample_id},
            include: waterSampleInclude,
        })

        return res.status(201).json({
            message: 'Water sample created',
            row: {...fullSample, _rowId: encodeRowId(fullSample, ['sample_id'])},
        })
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({message: 'Sample ID already exists'})
        console.error('Admin water sample create error:', error)
        return res.status(500).json({message: 'Failed to create water sample'})
    }
})

router.put('/water/samples/:sample_id', async (req, res) => {
    const sample_id = req.params.sample_id
    if (!sample_id) return res.status(400).json({message: 'Invalid sample id'})
    const {water_temp, ph, tds, do: doVal, isolation_source, collection_date, location_name, latitude, longitude} = req.body
    const updateData = {}
    if (water_temp !== undefined) updateData.water_temp = parseFloat(water_temp)
    if (ph !== undefined) updateData.ph = parseFloat(ph)
    if (tds !== undefined) updateData.tds = parseFloat(tds)
    if (doVal !== undefined) updateData.do = parseFloat(doVal)
    if (isolation_source !== undefined) updateData.isolation_source = isolation_source
    if (collection_date !== undefined) updateData.collection_date = new Date(collection_date)
    if (location_name !== undefined) updateData.location_name = location_name
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude)
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude)

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({message: 'No valid fields provided for update'})
    }

    try {
        const updated = await prisma.sample.update({
            where: {sample_id},
            data: updateData,
            include: waterSampleInclude,
        })
        return res.json({
            message: 'Water sample updated',
            row: {...updated, _rowId: encodeRowId(updated, ['sample_id'])},
        })
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({message: 'Sample not found'})
        console.error('Admin water sample update error:', error)
        return res.status(500).json({message: 'Failed to update water sample'})
    }
})

router.delete('/water/samples/:sample_id', async (req, res) => {
    const sample_id = req.params.sample_id
    if (!sample_id) return res.status(400).json({message: 'Invalid sample id'})
    const reason = normalizeDeleteReason(req.body?.reason)
    if (!reason) return res.status(400).json({message: 'Delete reason is required (minimum 3 characters)'})

    try {
        const existing = await prisma.sample.findUnique({where: {sample_id}, select: {sample_id: true}})
        if (!existing) return res.status(404).json({message: 'Sample not found'})

        await prisma.$transaction(async (tx) => {
            await tx.isolate.deleteMany({where: {sample_id}})
            await tx.amrFinding.deleteMany({where: {sample_id}})
            await tx.predictedPhenotype.deleteMany({where: {sample_id}})
            await tx.sample.delete({where: {sample_id}})
            await tx.adminDeleteAudit.create({
                data: {
                    actorUserID: req.user.userID,
                    actorEmail: normalizeEmail(req.user.email),
                    entityType: 'water_sample',
                    entityKey: {sample_id},
                    reason,
                },
            })
        })
        return res.json({message: 'Water sample deleted'})
    } catch (error) {
        console.error('Admin water sample delete error:', error)
        return res.status(500).json({message: 'Failed to delete water sample'})
    }
})

// -------------------- Generic Entity CRUD --------------------
// Supported entities: samples, isolates, amr_findings, predicted_phenotypes
const entityConfig = {
    samples: {
        keyFields: ['sample_id'],
        delegate: () => prisma.sample,
        fields: {
            sample_id: {type: 'string', nullable: false},
            sample_name: {type: 'string', nullable: false},
            collected_by: {type: 'string'},
            water_temp: {type: 'number'},
            ph: {type: 'number'},
            tds: {type: 'number'},
            do: {type: 'number'},
            isolation_source: {type: 'string'},
            collection_date: {type: 'date'},
            location_name: {type: 'string'},
            latitude: {type: 'number', nullable: false},
            longitude: {type: 'number', nullable: false},
            uploaded_by: {type: 'int', nullable: false},
        },
        list: () => prisma.sample.findMany({orderBy: {created_at: 'desc'}}),
        create: (data) => prisma.sample.create({data}),
        updateMany: (where, data) => prisma.sample.updateMany({where, data}),
        deleteMany: (where) => prisma.sample.deleteMany({where}),
        findFirst: (where) => prisma.sample.findFirst({where}),
    },
    isolates: {
        keyFields: ['isolate_id'],
        delegate: () => prisma.isolate,
        fields: {
            sample_id: {type: 'string', nullable: false},
            organism: {type: 'string'},
            mlst_type: {type: 'string'},
        },
        list: () => prisma.isolate.findMany({orderBy: {isolate_id: 'asc'}}),
        create: (data) => prisma.isolate.create({data}),
        updateMany: (where, data) => prisma.isolate.updateMany({where, data}),
        deleteMany: (where) => prisma.isolate.deleteMany({where}),
        findFirst: (where) => prisma.isolate.findFirst({where}),
    },
    amr_findings: {
        keyFields: ['finding_id'],
        delegate: () => prisma.amrFinding,
        fields: {
            sample_id: {type: 'string', nullable: false},
            analysis_type: {type: 'string'},
            gene_symbol: {type: 'string'},
            amr_class: {type: 'string'},
            method: {type: 'string'},
            percent_identity: {type: 'number'},
        },
        list: () => prisma.amrFinding.findMany({orderBy: {finding_id: 'asc'}}),
        create: (data) => prisma.amrFinding.create({data}),
        updateMany: (where, data) => prisma.amrFinding.updateMany({where, data}),
        deleteMany: (where) => prisma.amrFinding.deleteMany({where}),
        findFirst: (where) => prisma.amrFinding.findFirst({where}),
    },
    predicted_phenotypes: {
        keyFields: ['phenotype_id'],
        delegate: () => prisma.predictedPhenotype,
        fields: {
            sample_id: {type: 'string', nullable: false},
            organism: {type: 'string'},
            antibiotic: {type: 'string'},
            predicted_sir_profile: {type: 'string'},
        },
        list: () => prisma.predictedPhenotype.findMany({orderBy: {phenotype_id: 'asc'}}),
        create: (data) => prisma.predictedPhenotype.create({data}),
        updateMany: (where, data) => prisma.predictedPhenotype.updateMany({where, data}),
        deleteMany: (where) => prisma.predictedPhenotype.deleteMany({where}),
        findFirst: (where) => prisma.predictedPhenotype.findFirst({where}),
    },
}

// Helper to cast field values (similar to your original)
function castFieldValue(rawValue, fieldName, fieldSpec) {
    const nullable = fieldSpec.nullable !== false
    if (rawValue === null || rawValue === '') {
        if (!nullable) return {error: `${fieldName} cannot be empty`}
        return null
    }
    if (fieldSpec.type === 'number') {
        const value = Number(rawValue)
        if (isNaN(value)) return {error: `${fieldName} must be a valid number`}
        return value
    }
    if (fieldSpec.type === 'int') {
        const value = Number(rawValue)
        if (!Number.isInteger(value)) return {error: `${fieldName} must be a valid integer`}
        return value
    }
    if (fieldSpec.type === 'date') {
        const dateValue = new Date(rawValue)
        if (isNaN(dateValue.getTime())) return {error: `${fieldName} must be a valid date`}
        return dateValue
    }
    if (fieldSpec.type === 'boolean') {
        if (rawValue === 'true' || rawValue === true) return true
        if (rawValue === 'false' || rawValue === false) return false
        return {error: `${fieldName} must be a boolean`}
    }
    const value = String(rawValue).trim()
    if (!value && !nullable) return {error: `${fieldName} cannot be empty`}
    return value || null
}

function buildPayload(body, config, {forCreate}) {
    const payload = {}
    for (const [fieldName, fieldSpec] of Object.entries(config.fields)) {
        const hasField = Object.prototype.hasOwnProperty.call(body, fieldName)
        if (!forCreate && !hasField) continue
        if (forCreate && !hasField) {
            if (fieldSpec.nullable === false) return {error: `${fieldName} is required`}
            payload[fieldName] = null
            continue
        }
        const casted = castFieldValue(body[fieldName], fieldName, fieldSpec)
        if (casted && typeof casted === 'object' && casted.error) return casted
        payload[fieldName] = casted
    }
    if (!forCreate && Object.keys(payload).length === 0)
        return {error: 'No valid fields provided for update'}
    return payload
}

// Generic endpoints
router.get('/data/:entity', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) return res.status(404).json({message: 'Unknown data entity'})
    try {
        const rows = await config.list()
        const rowsWithId = rows.map(row => ({...row, _rowId: encodeRowId(row, config.keyFields)}))
        return res.json({rows: rowsWithId})
    } catch (error) {
        console.error(`Admin list error (${req.params.entity}):`, error)
        return res.status(500).json({message: 'Failed to fetch data'})
    }
})

router.post('/data/:entity', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) return res.status(404).json({message: 'Unknown data entity'})
    const payload = buildPayload(req.body, config, {forCreate: true})
    if (payload.error) return res.status(400).json({message: payload.error})
    try {
        const row = await config.create(payload)
        return res.status(201).json({
            message: 'Record created',
            row: {...row, _rowId: encodeRowId(row, config.keyFields)},
        })
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({message: 'A record with this key already exists'})
        if (error.code === 'P2003') return res.status(400).json({message: 'Related record was not found'})
        console.error(`Admin create error (${req.params.entity}):`, error)
        return res.status(500).json({message: 'Failed to create data record'})
    }
})

router.put('/data/:entity/:rowId', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) return res.status(404).json({message: 'Unknown data entity'})
    const rowId = decodeURIComponent(req.params.rowId || '').trim()
    const keyWhere = decodeRowId(rowId, config.keyFields)
    if (!keyWhere) return res.status(400).json({message: 'Invalid row id'})
    const payload = buildPayload(req.body, config, {forCreate: false})
    if (payload.error) return res.status(400).json({message: payload.error})
    try {
        const updated = await config.updateMany(keyWhere, payload)
        if (updated.count === 0) return res.status(404).json({message: 'Record not found'})
        const nextWhere = {...keyWhere}
        for (const field of config.keyFields) {
            if (Object.prototype.hasOwnProperty.call(payload, field)) nextWhere[field] = payload[field]
        }
        const row = await config.findFirst(nextWhere)
        if (!row) return res.json({message: 'Record updated'})
        return res.json({
            message: 'Record updated',
            row: {...row, _rowId: encodeRowId(row, config.keyFields)},
        })
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({message: 'A record with this key already exists'})
        if (error.code === 'P2003') return res.status(400).json({message: 'Related record was not found'})
        console.error(`Admin update error (${req.params.entity}):`, error)
        return res.status(500).json({message: 'Failed to update data record'})
    }
})

router.delete('/data/:entity/:rowId', async (req, res) => {
    const config = entityConfig[req.params.entity]
    if (!config) return res.status(404).json({message: 'Unknown data entity'})
    const reason = normalizeDeleteReason(req.body?.reason)
    if (!reason) return res.status(400).json({message: 'Delete reason is required (minimum 3 characters)'})
    const rowId = decodeURIComponent(req.params.rowId || '').trim()
    const keyWhere = decodeRowId(rowId, config.keyFields)
    if (!keyWhere) return res.status(400).json({message: 'Invalid row id'})
    try {
        const deleted = await config.deleteMany(keyWhere)
        if (deleted.count === 0) return res.status(404).json({message: 'Record not found'})
        await writeDeleteAudit({
            actor: req.user,
            entityType: req.params.entity,
            entityKey: keyWhere,
            reason,
        })
        return res.json({message: 'Record deleted'})
    } catch (error) {
        console.error(`Admin delete error (${req.params.entity}):`, error)
        return res.status(500).json({message: 'Failed to delete data record'})
    }
})

// -------------------- Summary endpoint --------------------
router.get('/summary', async (_req, res) => {
    try {
        const [usersCount, samplesCount, isolatesCount, amrFindingsCount, predictedPhenotypesCount, recentDeletions] = await Promise.all([
            prisma.user.count(),
            prisma.sample.count(),
            prisma.isolate.count(),
            prisma.amrFinding.count(),
            prisma.predictedPhenotype.count(),
            prisma.adminDeleteAudit.findMany({
                orderBy: {created_at: 'desc'},
                take: 6,
                select: {id: true, actorUserID: true, actorEmail: true, entityType: true, entityKey: true, reason: true, created_at: true},
            }),
        ])
        return res.json({
            metrics: {usersCount, samplesCount, isolatesCount, amrFindingsCount, predictedPhenotypesCount},
            recentDeletions,
        })
    } catch (error) {
        console.error('Admin summary error:', error)
        return res.status(500).json({message: 'Failed to fetch summary metrics'})
    }
})

export default router