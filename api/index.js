// api/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Koneksi Database (Cached Connection untuk Vercel)
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log("DB Connected");
    } catch (err) {
        console.error("DB Error", err);
    }
};

// 2. Models
const UserSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    phone: String
});
// Cek agar model tidak dicompile ulang
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const OtpSchema = new mongoose.Schema({
    email: String,
    code: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
});
const OTP = mongoose.models.OTP || mongoose.model('OTP', OtpSchema);

// 3. Transporter Email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// --- ROUTES ---
app.get('/api', (req, res) => res.send("Server is Running!"));

app.post('/api/request-otp', async (req, res) => {
    await connectDB();
    const { email, type } = req.body;
    
    // Logic kirim email (Sama seperti sebelumnya)
    // ... Copy paste logic OTP bagian dalam try-catch dari kode sebelumnya ...
    // Demi singkatnya, anggap logic kirim email ada di sini
    
    // CONTOH SIMPLE PENGIRIMAN:
    try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });
        
        await transporter.sendMail({
            from: "Admin <" + process.env.SMTP_USER + ">",
            to: email,
            subject: "Kode OTP",
            text: "Kode Anda: " + otpCode
        });
        res.json({ success: true, message: "OTP Terkirim" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/register-verify', async (req, res) => {
    await connectDB();
    // ... Masukkan logic register verify di sini ...
    res.json({ success: true, message: "Register Sukses (Simulasi)" });
});

app.post('/api/login', async (req, res) => {
    await connectDB();
    // ... Masukkan logic login di sini ...
    res.json({ success: true, userData: { username: "User" } });
});

// Export untuk Vercel
module.exports = app;
