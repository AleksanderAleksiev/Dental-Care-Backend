import express from 'express';
import { connectToDatabase } from '../lib/db.js';
import { verifyToken } from './utils.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const router = express.Router();

router.post('/user/register', async (req, res) => {
    const { email, name, password, phone, address, years, image, is_dentist } = req.body;

    try {
        const db = await connectToDatabase();
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        console.log('hash', hashPassword);

        await db.query('INSERT INTO users (email, name, password, phone, address, years, image, is_dentist) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [email, name, hashPassword, phone, address, years, image, is_dentist]
        );

        res.status(201).json({ message: 'User created successfully' });
    }
    catch (err) {
        res.status(500).json(err);
    }
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const db = await connectToDatabase();
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        const token = jwt.sign({ id: rows[0].id }, process.env.JWT_KEY, { expiresIn: '3h' });
        res.cookie('token', token);
        return res.status(200).json({ message: 'Successfully logged in', status: 'Success' });
    }
    catch (err) {
        console.log('err', err);
        res.status(500).json(err);
    }
});


router.get('/logout', async (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: "Logged out successfully" });
    }
    catch (err) {
        return res.status(500).json({ err });
    }
})


router.get('/user/me', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User with this id does not exist' });
        }

        return res.status(200).json({ user: rows[0] });
    }
    catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});


router.put('/user/me', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User with this id does not exist' });
        }

        const { name, phone, address, years } = req.body;

        await db.query('UPDATE users SET name = ?, phone = ?, address = ?, years = ? WHERE id = ?', [name, phone, address, years, req.userId]);

        return res.status(200).json({ message: 'User details updated successfully' });
    }
    catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});


router.get('/user/dentists/all', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const rows = await db.query('SELECT * FROM users WHERE is_dentist = 1');

        return res.status(200).json({ dentists: rows[0] });
    }
    catch (err) {
        return res.status(500).json({ error: 'Something went wrong when retrieving dentist users' });
    }
})


router.get('/user/name', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const [rows] = await db.query('SELECT name FROM users WHERE id = ?', [req.query.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User with this id does not exist' });
        }

        return res.status(200).json({ name: rows[0].name });
    }
    catch (err) {
        return res.status(500).json({ error: 'Something went wrong when retrieving user name' });
    }
});

export default router;