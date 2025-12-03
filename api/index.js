// api/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware - Limit ditingkatkan untuk handle upload gambar base64 multiple
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// --- KONFIGURASI ADMIN ---
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

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
    role: { type: String, default: "Member" },
    sellerLevel: { type: String, default: "Newbie" },
    verificationStatus: { type: String, default: "unverified" },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const OtpSchema = new mongoose.Schema({
    email: String,
    code: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
});
const OTP = mongoose.models.OTP || mongoose.model('OTP', OtpSchema);

// MODEL PRODUK BARU
const ProductSchema = new mongoose.Schema({
    userId: String,
    username: String, // Untuk display nama penjual
    category: String, // Akun Game, Joki, dll
    subCategory: String, // akun-roblox, akun-ml, dll
    images: [String], // Array base64 strings (max 5)
    name: String,
    description: String,
    price: Number,
    paymentMethod: String, // dana, gopay
    paymentNumber: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

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
        const { email, type } = req.body;
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });

        const emailTemplate = `
        <h3>Kode OTP Maishipro</h3>
        <p>Kode Anda: <b>${otpCode}</b></p>
        <p>Jangan berikan kode ini kepada siapapun.</p>
        `;

        await transporter.sendMail({
            from: "Maishipro Admin <" + process.env.SMTP_USER + ">",
            to: email,
            subject: `Kode OTP: ${otpCode}`,
            html: emailTemplate
        });

        res.json({ success: true, message: "OTP Terkirim ke Email." });
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

        const userRole = ADMIN_EMAILS.includes(email) ? 'Admin' : 'Member';
        await User.create({ username, email, phone, password, role: userRole, createdAt: new Date() });
        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ success: true, message: "Pendaftaran Berhasil!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Username/Email sudah ada." });
    }
});

// C. USER SETTINGS & VERIFIKASI
app.post('/api/submit-verification', async (req, res) => {
    try {
        await connectDB();
        const { originalEmail, newUsername, newEmail, newPhone, otp } = req.body;
        const targetEmail = newEmail || originalEmail;
        const validOtp = await OTP.findOne({ email: targetEmail, code: otp });
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Salah!" });

        const updatedUser = await User.findOneAndUpdate(
            { email: originalEmail }, 
            { username: newUsername, email: newEmail, phone: newPhone, verificationStatus: 'pending' }, 
            { new: true }
        );
        await OTP.deleteOne({ _id: validOtp._id });
        res.json({ success: true, message: "Permintaan Verifikasi Terkirim!", user: updatedUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

// D. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { loginInput, password } = req.body;
        const user = await User.findOne({ $or: [{ email: loginInput }, { username: loginInput }] });

        if (!user) return res.status(400).json({ success: false, message: "User tidak ditemukan!" });
        if (user.password !== password) return res.status(400).json({ success: false, message: "Password Salah!" });

        if (ADMIN_EMAILS.includes(user.email) && user.role !== 'Admin') {
             await User.updateOne({_id: user._id}, {role: 'Admin'});
             user.role = 'Admin';
        }
        res.json({ success: true, userData: user });
    } catch (e) { res.status(500).json({ success: false, message: "Error Login" }); }
});

app.post('/api/get-user', async (req, res) => {
    try {
        await connectDB();
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.json({ success: false });
        res.json({ success: true, userData: user });
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/update-pic', async (req, res) => {
    try {
        await connectDB();
        const { email, imageBase64 } = req.body;
        await User.findOneAndUpdate({ email }, { profilePic: imageBase64 });
        res.json({ success: true, message: "Foto updated!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- PRODUCT ROUTES (NEW) ---

// 1. Tambah Produk (User)
app.post('/api/products/add', async (req, res) => {
    try {
        await connectDB();
        const { userId, username, category, subCategory, images, name, description, price, paymentMethod, paymentNumber } = req.body;

        // Cek limit 5 produk aktif/pending per user
        const productCount = await Product.countDocuments({ 
            userId, 
            status: { $in: ['pending', 'approved'] } 
        });

        if (productCount >= 5) {
            return res.status(400).json({ success: false, message: "Limit tercapai! Maksimal 5 produk." });
        }

        await Product.create({
            userId, username, category, subCategory, images, name, description, price, paymentMethod, paymentNumber,
            status: 'pending' // Default pending agar admin check dulu
        });

        res.json({ success: true, message: "Produk berhasil dikirim! Menunggu persetujuan Admin." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Gagal upload produk." });
    }
});

// 2. Get User Products (List Produk Anda)
app.get('/api/products/user/:userId', async (req, res) => {
    try {
        await connectDB();
        // Ambil pending dan approved. Rejected biasanya dihapus atau bisa ditampilkan sebentar.
        // Di sini kita ambil semua kecuali yg sudah dihapus (jika ada soft delete, tapi di sini hard delete via cron/manual)
        const products = await Product.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. Get Public Products (Untuk Halaman Kategori)
app.get('/api/products/public/:subCategory', async (req, res) => {
    try {
        await connectDB();
        const products = await Product.find({ 
            subCategory: req.params.subCategory, 
            status: 'approved' 
        }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/verifications', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find({ verificationStatus: 'pending' }).sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/verify-action', async (req, res) => {
    try {
        await connectDB();
        const { userId, action } = req.body;
        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        await User.findByIdAndUpdate(userId, { verificationStatus: newStatus });
        res.json({ success: true, message: `Status User Updated.` });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. Admin Get Pending Products (Acc)
app.get('/api/admin/products/pending', async (req, res) => {
    try {
        await connectDB();
        const products = await Product.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. Admin Approve/Reject Product
app.post('/api/admin/products/action', async (req, res) => {
    try {
        await connectDB();
        const { productId, action } = req.body; // action: 'approve' | 'reject'
        
        if (action === 'approve') {
            await Product.findByIdAndUpdate(productId, { status: 'approved' });
            res.json({ success: true, message: "Produk Disetujui!" });
        } else {
            // Jika reject, update status jadi rejected
            await Product.findByIdAndUpdate(productId, { status: 'rejected' });
            
            // Hapus otomatis setelah 5 menit (menggunakan setTimeout di memory serverless tidak reliable, 
            // tapi untuk simulasi logic ini bisa. Idealnya pakai cron job atau check saat get).
            // Kita biarkan status 'rejected' agar user lihat, nanti frontend filter atau user hapus manual.
            
            res.json({ success: true, message: "Produk Ditolak!" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// Fitur Hapus Produk (User/Admin)
app.delete('/api/products/:id', async (req, res) => {
    try {
        await connectDB();
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Produk dihapus." });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try { await connectDB(); await User.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) {}
});

app.put('/api/admin/users/:id', async (req, res) => {
    try { await connectDB(); await User.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); } catch (e) {}
});

module.exports = app;