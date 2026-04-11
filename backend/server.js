import express from 'express';
import {Pool} from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use('/api/auth', authRouter);

// Simple connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

//
// BASIC ENDPOINTS
//

// Get Users Endpoint

app.get('/get-users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json({
            message: 'Users retrieved successfully',
            users: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Failed to retrieve users',
            error: err.message
        });
    }
});



// Get Samples Endpoint

app.get('/get-samples', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM samples');
        res.json({
            message: 'Samples retrieved successfully',
            samples: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Failed to retrieve samples',
            error: err.message
        });
    }
});




// Get Water Endpoint

app.get('/get-water', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM water');
        res.json({
            message: 'Water retrieved successfully',
            water: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Failed to retrieve water',
            error: err.message
        });
    }
});



// Get Proteins Endpoint

app.get('/get-proteins', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM proteins');
        res.json({
            message: 'Proteins retrieved successfully',
            proteins: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Failed to retrieve proteins',
            error: err.message
        });
    }
});


app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});