import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import {Pool} from 'pg'
import prisma from './lib/prisma.js'
import adminRouter from './routes/admin.routes.js'
import authRouter from './routes/auth.routes.js'
import bulkUploadRouter from './routes/bulk-upload.routes.js'
import imageExtractRouter from './routes/image-extract.routes.js'
import mockDataRouter from './routes/mockdata.routes.js'
import samplesRouter from './routes/samples.routes.js'
import isolatesRouter from './routes/isolates.routes.js'
import amrFindingsRouter from './routes/amr-findings.routes.js'
import predictedPhenotypesRouter from './routes/predicted-phenotypes.routes.js'

dotenv.config()
dotenv.config({path: '../.env'})

const app = express()
const port = process.env.PORT || 3000

// Middleware
const corsOptions =
    process.env.NODE_ENV === 'production'
        ? {origin: process.env.FRONTEND_URL, credentials: true}
        : {origin: true, credentials: true} // Allow all origins in development

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// API routes
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/samples/extract-image', imageExtractRouter)
app.use('/api/samples', samplesRouter)
app.use('/api/isolates', isolatesRouter)
app.use('/api/amr-findings', amrFindingsRouter)
app.use('/api/predicted-phenotypes', predictedPhenotypesRouter)
app.use('/api/bulk-upload', bulkUploadRouter)
app.use('/api', mockDataRouter)

app.get('/health', (_req, res) => {
    res.json({status: 'ok'})
})

// Simple connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

//
// BASIC ENDPOINTS
//

// Get Users Endpoint

app.get('/get-users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users')
        res.json({
            message: 'Users retrieved successfully',
            users: result.rows,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve users',
            error: err.message,
        })
    }
})

// Get Samples Endpoint

app.get('/get-samples', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM samples')
        res.json({
            message: 'Samples retrieved successfully',
            samples: result.rows,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve samples',
            error: err.message,
        })
    }
})

// Get Metagenomics Endpoint

app.get('/get-metagenomic', async (req, res) => {
    try {
        const result = await prisma.amrFinding.findMany()
        res.json({
            message: 'Metagenomic analysis data retrieved successfully',
            data: result,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve metagenomic data',
            error: err.message,
        })
    }
})

// Get WGS Endpoint

app.get('/get-wgs', async (req, res) => {
    try {
        const result = await prisma.isolate.findMany({
            include: {sample: true},
        })
        res.json({
            message: 'WGS isolate data retrieved successfully',
            wgs: result,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve WGS data',
            error: err.message,
        })
    }
})

// Get AMR findings Endpoint

app.get('/get-amrResistanceGenes', async (req, res) => {
    try {
        const result = await prisma.amrFinding.findMany({
            include: {sample: true},
        })
        res.json({
            message: 'AMR findings retrieved successfully',
            amrFindings: result,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve AMR findings',
            error: err.message,
        })
    }
})

// Get Predicted phenotypes Endpoint

app.get('/get-virulenceGenes', async (req, res) => {
    try {
        const result = await prisma.predictedPhenotype.findMany({
            include: {sample: true},
        })
        res.json({
            message: 'Predicted phenotypes retrieved successfully',
            phenotypes: result,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve predicted phenotypes',
            error: err.message,
        })
    }
})

app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`)
})