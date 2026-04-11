import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Pool } from 'pg'
import amrResistanceGenesRouter from './routes/amrresistancegenes.routes.js'
import authRouter from './routes/auth.routes.js'
import metagenomicRouter from './routes/metagenomic.routes.js'
import mockDataRouter from './routes/mockdata.routes.js'
import samplesRouter from './routes/samples.routes.js'
import virulenceGenesRouter from './routes/virulencegenes.routes.js'
import wgsRouter from './routes/wgs.routes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Middleware
const corsOptions =
    process.env.NODE_ENV === 'production'
        ? { origin: process.env.FRONTEND_URL, credentials: true }
        : { origin: true, credentials: true } // Allow all origins in development

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// API routes
app.use('/api/auth', authRouter)
app.use('/api/samples', samplesRouter)
app.use('/api/metagenomic', metagenomicRouter)
app.use('/api/wgs', wgsRouter)
app.use('/api/amr-resistance-genes', amrResistanceGenesRouter)
app.use('/api/virulence-genes', virulenceGenesRouter)
app.use('/api', mockDataRouter)

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
            users: result.rows
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve users',
            error: err.message
        })
    }
})



// Get Samples Endpoint

app.get('/get-samples', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM samples')
        res.json({
            message: 'Samples retrieved successfully',
            samples: result.rows
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve samples',
            error: err.message
        })
    }
})




// Get Metagenomics Endpoint

app.get('/get-metagenomic', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM metagenomic')
        res.json({
            message: 'Metagenomic data retrieved successfully',
            metagenomics: result.rows
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve metagenomic data',
            error: err.message
        })
    }
})



// Get WGS Endpoint

app.get('/get-wgs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wgs')
        res.json({
            message: 'WGS data retrieved successfully',
            wgs: result.rows
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve WGS data',
            error: err.message
        })
    }
})


// Get AMR resistance genes Endpoint

app.get('/get-amrResistanceGenes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM amrResistanceGenes')
        res.json({
            message: 'AMR resistance genes retrieved successfully',
            amrResistanceGenes: result.rows
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve AMR resistance genes',
            error: err.message
        })
    }
})


// Get Virulence genes Endpoint

app.get('/get-virulenceGenes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM virulenceGenes')
        res.json({
            message: 'Virulence genes retrieved successfully',
            virulenceGenes: result.rows
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Failed to retrieve virulence genes',
            error: err.message
        })
    }
})


app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`)
})