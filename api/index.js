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

// 1. Koneksi Database
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        // Pastikan MONGO_URI di .env sudah benar (tanpa port jika pakai SRV)
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log("DB Connected");
    } catch (err) {
        console.error("DB Error", err);
        throw err; // Lempar error agar request tau kalau DB gagal
    }
};

// 2. Models
const UserSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String, // Catatan: Sebaiknya di-hash (bcrypt) di production
    phone: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const OtpSchema = new mongoose.Schema({
    email: String,
    code: String,
    createdAt: { type: Date, expires: '5m', default: Date.now } // Expire 5 menit
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

// A. REQUEST OTP (Register & Forgot)
app.post('/api/request-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, type } = req.body;

        // Cek user jika konteksnya 'register' (tidak boleh duplikat)
        if (type === 'register') {
            const exist = await User.findOne({ email });
            if (exist) return res.status(400).json({ success: false, message: "Email sudah terdaftar!" });
        }

        // Cek user jika konteksnya 'forgot' (harus ada)
        if (type === 'forgot') {
            const exist = await User.findOne({ email });
            if (!exist) return res.status(400).json({ success: false, message: "Email tidak ditemukan!" });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Simpan/Update OTP di Database
        await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });

        // Kirim Email
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

// B. VERIFIKASI REGISTER (Simpan User)
app.post('/api/register-verify', async (req, res) => {
    try {
        await connectDB();
        const { username, email, phone, password, otp } = req.body;

        // 1. Cek OTP di Database
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) {
            return res.status(400).json({ success: false, message: "Kode OTP Salah atau Kadaluarsa!" });
        }

        // 2. Simpan User Baru
        const newUser = await User.create({ username, email, phone, password });

        // 3. Hapus OTP agar tidak bisa dipakai lagi
        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Pendaftaran Berhasil!" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat mendaftar." });
    }
});

// C. CEK OTP SAJA (Untuk tahap awal Reset Password)
app.post('/api/check-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, otp } = req.body;
        
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) {
            return res.status(400).json({ success: false, message: "Kode OTP Salah!" });
        }

        res.json({ success: true, message: "OTP Valid" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Server" });
    }
});

// D. RESET PASSWORD FINAL
app.post('/api/reset-password', async (req, res) => {
    try {
        await connectDB();
        const { email, otp, newPassword } = req.body;

        // Validasi OTP lagi untuk keamanan ganda sebelum ganti password
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) {
            return res.status(400).json({ success: false, message: "Sesi OTP habis, ulangi permintaan." });
        }

        // Update Password
        await User.findOneAndUpdate({ email }, { password: newPassword });

        // Hapus OTP
        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Password berhasil diubah!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Gagal mereset password." });
    }
});

// E. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { loginInput, password } = req.body;

        // Cari user berdasarkan email ATAU username
        const user = await User.findOne({
            $or: [{ email: loginInput }, { username: loginInput }]
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "User tidak ditemukan!" });
        }

        // Cek password (plain text match)
        if (user.password !== password) {
            return res.status(400).json({ success: false, message: "Password Salah!" });
        }

        res.json({ 
            success: true, 
            userData: { username: user.username, email: user.email } 
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Login" });
    }
});

module.exports = app;
