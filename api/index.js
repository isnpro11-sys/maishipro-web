// api/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit diperbesar untuk upload foto base64

// 1. Koneksi Database
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log("DB Connected");
    } catch (err) {
        console.error("DB Error", err);
        throw err;
    }
};

// 2. Models
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    phone: { type: String, unique: true },
    profilePic: { type: String, default: "" }, // Foto Profil Base64/URL
    role: { type: String, default: "Member" }, // Role default
    sellerLevel: { type: String, default: "Newbie" }, // Penjual Level
    createdAt: { type: Date, default: Date.now } // Tanggal Bergabung
});
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

// A. REQUEST OTP (Register & Forgot) dengan Validasi Duplikat Lengkap
app.post('/api/request-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, type, username, phone } = req.body;

        // Cek user jika konteksnya 'register' (Cek Email, Username, DAN Phone)
        if (type === 'register') {
            // Cek apakah ada user dengan salah satu data yang sama
            const exist = await User.findOne({
                $or: [
                    { email: email },
                    { username: username },
                    { phone: phone }
                ]
            });

            if (exist) {
                let msg = "Data sudah terdaftar!";
                if (exist.email === email) msg = "Email sudah terdaftar!";
                else if (exist.username === username) msg = "Username sudah digunakan!";
                else if (exist.phone === phone) msg = "Nomor WhatsApp sudah terdaftar!";
                
                return res.status(400).json({ success: false, message: msg });
            }
        }

        if (type === 'forgot') {
            const exist = await User.findOne({ email });
            if (!exist) return res.status(400).json({ success: false, message: "Email tidak ditemukan!" });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });

        await transporter.sendMail({
            from: "Admin <" + process.env.SMTP_USER + ">",
            to: email,
            subject: "Kode OTP Maishipro",
            html: `<h3>Kode OTP Anda: <b>${otpCode}</b></h3><p>Jangan berikan kode ini kepada siapapun.</p>`
        });

        res.json({ success: true, message: "OTP Terkirim ke email Anda." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Gagal mengirim email/koneksi DB error." });
    }
});

// B. VERIFIKASI REGISTER
app.post('/api/register-verify', async (req, res) => {
    try {
        await connectDB();
        const { username, email, phone, password, otp } = req.body;

        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) {
            return res.status(400).json({ success: false, message: "Kode OTP Salah atau Kadaluarsa!" });
        }

        // Simpan User dengan timestamp otomatis
        const newUser = await User.create({ 
            username, email, phone, password,
            createdAt: new Date() 
        });

        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Pendaftaran Berhasil!" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat mendaftar." });
    }
});

// C. CEK OTP
app.post('/api/check-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, otp } = req.body;
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) return res.status(400).json({ success: false, message: "Kode OTP Salah!" });
        res.json({ success: true, message: "OTP Valid" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Server" });
    }
});

// D. RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
    try {
        await connectDB();
        const { email, otp, newPassword } = req.body;
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) return res.status(400).json({ success: false, message: "Sesi OTP habis." });
        
        await User.findOneAndUpdate({ email }, { password: newPassword });
        await OTP.deleteOne({ _id: validOtp._id });
        res.json({ success: true, message: "Password berhasil diubah!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Gagal mereset password." });
    }
});

// E. LOGIN (Return data lengkap: join date, pic, level)
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { loginInput, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: loginInput }, { username: loginInput }]
        });

        if (!user) return res.status(400).json({ success: false, message: "User tidak ditemukan!" });
        if (user.password !== password) return res.status(400).json({ success: false, message: "Password Salah!" });

        res.json({ 
            success: true, 
            userData: { 
                username: user.username, 
                email: user.email, 
                phone: user.phone,
                profilePic: user.profilePic,
                sellerLevel: user.sellerLevel,
                createdAt: user.createdAt
            } 
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Login" });
    }
});

// F. UPDATE PROFILE PICTURE
app.post('/api/update-pic', async (req, res) => {
    try {
        await connectDB();
        const { email, imageBase64 } = req.body;
        await User.findOneAndUpdate({ email }, { profilePic: imageBase64 });
        res.json({ success: true, message: "Foto profil diperbarui!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Gagal update foto." });
    }
});

module.exports = app;
