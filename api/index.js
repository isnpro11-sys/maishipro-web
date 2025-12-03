// api/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- KONFIGURASI ADMIN ---
// Masukkan email owner di sini
const ADMIN_EMAILS = ["owner@maishipro.com", "admin@gmail.com"]; 

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
    profilePic: { type: String, default: "" },
    role: { type: String, default: "Member" }, // Member, Admin
    sellerLevel: { type: String, default: "Newbie" },
    createdAt: { type: Date, default: Date.now }
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

// A. REQUEST OTP
app.post('/api/request-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, type, username, phone } = req.body;

        if (type === 'register') {
            const exist = await User.findOne({
                $or: [{ email }, { username }, { phone }]
            });
            if (exist) return res.status(400).json({ success: false, message: "Data (Email/User/HP) sudah terdaftar!" });
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
            html: `<h3>Kode OTP: <b>${otpCode}</b></h3>`
        });

        res.json({ success: true, message: "OTP Terkirim." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Error Server/Email." });
    }
});

// B. VERIFIKASI REGISTER
app.post('/api/register-verify', async (req, res) => {
    try {
        await connectDB();
        const { username, email, phone, password, otp } = req.body;

        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Salah!" });

        // Cek apakah email termasuk admin
        const userRole = ADMIN_EMAILS.includes(email) ? 'Admin' : 'Member';

        await User.create({ username, email, phone, password, role: userRole, createdAt: new Date() });
        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Pendaftaran Berhasil!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Register." });
    }
});

// C. CEK OTP
app.post('/api/check-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, otp } = req.body;
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Salah!" });
        res.json({ success: true, message: "OTP Valid" });
    } catch (e) { res.status(500).json({ success: false, message: "Error" }); }
});

// D. RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
    try {
        await connectDB();
        const { email, otp, newPassword } = req.body;
        const validOtp = await OTP.findOne({ email, code: otp });
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Habis/Salah." });
        
        await User.findOneAndUpdate({ email }, { password: newPassword });
        await OTP.deleteOne({ _id: validOtp._id });
        res.json({ success: true, message: "Password diubah!" });
    } catch (e) { res.status(500).json({ success: false, message: "Error Reset." }); }
});

// E. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { loginInput, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: loginInput }, { username: loginInput }]
        });

        if (!user) return res.status(400).json({ success: false, message: "User tidak ditemukan!" });
        if (user.password !== password) return res.status(400).json({ success: false, message: "Password Salah!" });

        // Force update role jika email ada di list ADMIN_EMAILS (untuk keamanan ganda)
        let finalRole = user.role;
        if (ADMIN_EMAILS.includes(user.email)) {
             finalRole = 'Admin';
             if(user.role !== 'Admin') await User.updateOne({_id: user._id}, {role: 'Admin'});
        }

        res.json({ 
            success: true, 
            userData: { 
                _id: user._id,
                username: user.username, 
                email: user.email, 
                phone: user.phone,
                password: user.password,
                profilePic: user.profilePic,
                role: finalRole, 
                sellerLevel: user.sellerLevel,
                createdAt: user.createdAt
            } 
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Login" });
    }
});

// F. UPDATE PROFILE PIC
app.post('/api/update-pic', async (req, res) => {
    try {
        await connectDB();
        const { email, imageBase64 } = req.body;
        await User.findOneAndUpdate({ email }, { profilePic: imageBase64 });
        res.json({ success: true, message: "Foto updated!" });
    } catch (e) { res.status(500).json({ success: false, message: "Error Upload." }); }
});

// --- ADMIN ROUTES ---

// 1. Get All Users
app.get('/api/admin/users', async (req, res) => {
    try {
        await connectDB();
        // Hanya return jika request aman (di real app pakai token, disini kita anggap client validasi role)
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false, message: "Error fetch users" }); }
});

// 2. Delete User
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ success: true, message: "User dihapus." });
    } catch (e) { res.status(500).json({ success: false, message: "Gagal hapus." }); }
});

// 3. Edit User (Admin Power)
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const updateData = req.body; // { username, email, phone, password, role }
        
        await User.findByIdAndUpdate(id, updateData);
        res.json({ success: true, message: "User diupdate!" });
    } catch (e) { res.status(500).json({ success: false, message: "Gagal update." }); }
});

module.exports = app;
