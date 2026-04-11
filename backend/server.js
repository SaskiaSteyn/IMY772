import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Pool } from 'pg'
import authRouter from './routes/auth.routes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

// Auth routes
app.use('/api/auth', authRouter)

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