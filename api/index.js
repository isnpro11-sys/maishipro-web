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
const ADMIN_EMAILS = ["owner@maishipro.com", "admin@gmail.com", "ilyassyuhada00@gmail.com"]; 

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
    
    // Status Verifikasi: 'unverified', 'pending' (sedang diproses), 'verified', 'rejected'
    verificationStatus: { type: String, default: "unverified" }, 
    sellerLevel: { type: String, default: "Newbie" },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const OtpSchema = new mongoose.Schema({
    email: String,
    code: String,
    type: { type: String, default: 'register' }, // 'register' atau 'verification'
    tempData: { type: Object, default: {} }, // Menyimpan data sementara saat verifikasi
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

// A. REQUEST OTP (Register & Verification)
app.post('/api/request-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, type, username, phone, password, userId } = req.body;

        // Cek duplikasi jika register atau jika ganti data saat verifikasi
        if (type === 'register') {
            const exist = await User.findOne({ $or: [{ email }, { username }, { phone }] });
            if (exist) return res.status(400).json({ success: false, message: "Data sudah terdaftar!" });
        } else if (type === 'verification') {
            // Pastikan user tidak menggunakan data milik orang lain (kecuali punya sendiri)
            const exist = await User.findOne({
                $and: [
                    { _id: { $ne: userId } }, // Bukan user ini sendiri
                    { $or: [{ email }, { username }, { phone }] }
                ]
            });
            if (exist) return res.status(400).json({ success: false, message: "Username/Email/HP sudah dipakai user lain!" });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Simpan OTP beserta data sementara (untuk verifikasi)
        await OTP.create({
            email,
            code: otpCode,
            type: type,
            tempData: { username, email, phone, password } // Simpan data yg mau diupdate
        });

        // --- DESAIN EMAIL HTML ---
        const emailTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background-color: #2563EB; padding: 20px; text-align: center; color: white; }
                .content { padding: 30px 20px; text-align: center; color: #333333; }
                .otp-box { 
                    background-color: #f3f4f6; 
                    border: 2px dashed #2563EB; 
                    border-radius: 8px; 
                    padding: 15px; 
                    margin: 20px auto; 
                    width: fit-content;
                    min-width: 150px;
                }
                .otp-code { 
                    font-size: 32px; 
                    font-weight: bold; 
                    letter-spacing: 5px; 
                    color: #1f2937; 
                    display: block;
                }
                .footer { background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
                .note { font-size: 14px; color: #666; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div style="padding: 20px;">
                <div class="container">
                    <div class="header">
                        <h2 style="margin:0;">Maishipro</h2>
                    </div>
                    
                    <div class="content">
                        <h3 style="margin-top: 0;">Verifikasi Akun Anda</h3>
                        <p>Halo,</p>
                        <p>Kami menerima permintaan kode OTP untuk akun Anda. Gunakan kode di bawah ini untuk melanjutkan:</p>
                        
                        <div class="otp-box">
                            <span class="otp-code">${otpCode}</span>
                        </div>
                        
                        <p class="note">Tekan lama kode di atas untuk menyalin.</p>
                        
                        <p style="margin-top: 30px; font-size: 13px; color: #888;">
                            Kode ini akan kadaluarsa dalam 5 menit.<br>
                            Jika Anda tidak meminta kode ini, abaikan email ini.
                        </p>
                    </div>

                    <div class="footer">
                        &copy; ${new Date().getFullYear()} Maishipro Website. All rights reserved.
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        await transporter.sendMail({
            from: "Maisshipro Website <" + process.env.SMTP_USER + ">",
            to: email,
            subject: `Kode OTP Anda: ${otpCode} - Maishipro`,
            html: emailTemplate
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
        const { email, otp } = req.body; // Data diambil dari OTP record

        // Cari OTP berdasarkan email dan kode, ambil yang terbaru
        const validOtp = await OTP.findOne({ email, code: otp, type: 'register' }).sort({ createdAt: -1 });
        
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Salah/Kadaluarsa!" });

        const { username, phone, password } = validOtp.tempData;
        const userRole = ADMIN_EMAILS.includes(email) ? 'Admin' : 'Member';

        await User.create({ 
            username, email, phone, password, 
            role: userRole, 
            verificationStatus: 'unverified',
            createdAt: new Date() 
        });
        
        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Pendaftaran Berhasil!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Register." });
    }
});

// C. SUBMIT VERIFIKASI USER (Konfirmasi OTP lalu update data & status)
app.post('/api/verification-confirm', async (req, res) => {
    try {
        await connectDB();
        const { userId, otp, email } = req.body; // Email yang baru diinput

        const validOtp = await OTP.findOne({ email, code: otp, type: 'verification' }).sort({ createdAt: -1 });
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Salah!" });

        const { username, phone } = validOtp.tempData;

        // Update User Data & Set Status ke 'pending'
        const updatedUser = await User.findByIdAndUpdate(userId, {
            username, 
            email, 
            phone,
            verificationStatus: 'pending' // Menunggu ACC Admin
        }, { new: true });

        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Permintaan Verifikasi Dikirim!", user: updatedUser });
    } catch (e) {
        res.status(500).json({ success: false, message: "Gagal Verifikasi." });
    }
});

// D. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { loginInput, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: loginInput }, { username: loginInput }]
        });

        if (!user) return res.status(400).json({ success: false, message: "User tidak ditemukan!" });
        if (user.password !== password) return res.status(400).json({ success: false, message: "Password Salah!" });

        // Force Admin check
        if (ADMIN_EMAILS.includes(user.email) && user.role !== 'Admin') {
             await User.updateOne({_id: user._id}, {role: 'Admin'});
             user.role = 'Admin';
        }

        res.json({ success: true, userData: user });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Login" });
    }
});

// E. UPDATE PROFILE PIC
app.post('/api/update-pic', async (req, res) => {
    try {
        await connectDB();
        const { email, imageBase64 } = req.body;
        await User.findOneAndUpdate({ email }, { profilePic: imageBase64 });
        res.json({ success: true, message: "Foto updated!" });
    } catch (e) { res.status(500).json({ success: false, message: "Error Upload." }); }
});

// --- ADMIN ROUTES ---

// 1. Get All Users (Untuk Tab Users)
app.get('/api/admin/users', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false, message: "Error fetch users" }); }
});

// 2. Get Pending Verifications (Untuk Tab Verifikasi)
app.get('/api/admin/verifications', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find({ verificationStatus: 'pending' });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false, message: "Error fetch pending" }); }
});

// 3. Admin Action (Terima/Tolak Verifikasi)
app.post('/api/admin/verification-action', async (req, res) => {
    try {
        await connectDB();
        const { userId, action } = req.body; // action: 'approve' or 'reject'
        
        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        
        await User.findByIdAndUpdate(userId, { verificationStatus: newStatus });
        
        res.json({ success: true, message: `User berhasil di-${action === 'approve' ? 'verifikasi' : 'tolak'}` });
    } catch (e) { res.status(500).json({ success: false, message: "Gagal memproses." }); }
});

// 4. Update User (Admin Edit)
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        await User.findByIdAndUpdate(id, req.body);
        res.json({ success: true, message: "User diupdate!" });
    } catch (e) { res.status(500).json({ success: false, message: "Gagal update." }); }
});

// 5. Delete User
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ success: true, message: "User dihapus." });
    } catch (e) { res.status(500).json({ success: false, message: "Gagal hapus." }); }
});

module.exports = app;