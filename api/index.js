require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Limit ditingkatkan untuk upload banyak foto

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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String, // Snapshot username saat upload
    category: String, // akun-game, joki-game, lainnya
    subCategory: String, // ml, ff, roblox, dll
    images: [String], // Array base64
    name: String,
    description: String,
    price: Number,
    paymentMethod: String, // Dana / Gopay
    paymentNumber: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    rejectedAt: { type: Date }, // Untuk timer hapus otomatis
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

// --- AUTH & USER ROUTES (Sama seperti sebelumnya) ---

app.post('/api/request-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, type, username, phone } = req.body;
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });

        // Email logic (simplified for brevity, assume logic same as before)
        await transporter.sendMail({
            from: "Maishipro Admin <" + process.env.SMTP_USER + ">",
            to: email,
            subject: `Kode OTP: ${otpCode}`,
            text: `Kode OTP Anda: ${otpCode}`
        });

        res.json({ success: true, message: "OTP Terkirim ke Email." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Error Server/Email." });
    }
});

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
        res.status(500).json({ success: false, message: "Error Register." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { loginInput, password } = req.body;
        const user = await User.findOne({
            $or: [{ email: loginInput }, { username: loginInput }]
        });
        if (!user) return res.status(400).json({ success: false, message: "User tidak ditemukan!" });
        if (user.password !== password) return res.status(400).json({ success: false, message: "Password Salah!" });
        
        // Auto Admin Check
        if (ADMIN_EMAILS.includes(user.email) && user.role !== 'Admin') {
             await User.updateOne({_id: user._id}, {role: 'Admin'});
             user.role = 'Admin';
        }
        res.json({ success: true, userData: user });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/get-user', async (req, res) => {
    try {
        await connectDB();
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.json({ success: false });
        res.json({ success: true, userData: user });
    } catch(e) { res.json({ success: false }); }
});

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
        res.json({ success: true, message: "Verifikasi Terkirim!", user: updatedUser });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/update-pic', async (req, res) => {
    try {
        await connectDB();
        const { email, imageBase64 } = req.body;
        await User.findOneAndUpdate({ email }, { profilePic: imageBase64 });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- PRODUCT ROUTES (BARU) ---

// 1. Upload Produk
app.post('/api/products/add', async (req, res) => {
    try {
        await connectDB();
        const { userId, category, subCategory, images, name, description, price, paymentMethod, paymentNumber } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Cek Verifikasi
        if (user.verificationStatus !== 'verified') {
            return res.status(403).json({ success: false, message: "Anda harus terverifikasi untuk upload produk." });
        }

        // Cek Limit Produk (Max 5 produk aktif/pending)
        const productCount = await Product.countDocuments({ userId: userId, status: { $ne: 'rejected' } });
        if (productCount >= 5) {
            return res.status(400).json({ success: false, message: "Batas maksimal 5 produk tercapai." });
        }

        const newProduct = await Product.create({
            userId,
            username: user.username,
            category,
            subCategory,
            images,
            name,
            description,
            price,
            paymentMethod,
            paymentNumber,
            status: 'pending' // Default pending
        });

        res.json({ success: true, message: "Produk berhasil diupload, menunggu persetujuan Admin." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Gagal upload produk." });
    }
});

// 2. Get User Products (List Produk Anda)
app.get('/api/products/user/:userId', async (req, res) => {
    try {
        await connectDB();
        const { userId } = req.params;
        
        // Ambil semua produk user
        let products = await Product.find({ userId }).sort({ createdAt: -1 });
        
        // Filter logika "Hilang setelah 5 menit jika ditolak"
        const now = new Date();
        products = products.filter(p => {
            if (p.status === 'rejected' && p.rejectedAt) {
                const diffMs = now - new Date(p.rejectedAt);
                const diffMins = Math.round(diffMs / 60000);
                return diffMins < 5; // Hanya tampilkan jika ditolak kurang dari 5 menit lalu
            }
            return true;
        });

        res.json({ success: true, products });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. Get Public Products (Untuk Home/Kategori)
app.get('/api/products/public', async (req, res) => {
    try {
        await connectDB();
        const products = await Product.find({ status: 'approved' }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- ADMIN PRODUCT ROUTES ---

// Get Pending Products
app.get('/api/admin/products/pending', async (req, res) => {
    try {
        await connectDB();
        const products = await Product.find({ status: 'pending' }).populate('userId', 'username email').sort({ createdAt: 1 });
        res.json({ success: true, products });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Action Approve/Reject
app.post('/api/admin/products/action', async (req, res) => {
    try {
        await connectDB();
        const { productId, action } = req.body; // 'approve' or 'reject'
        
        const updateData = { status: action === 'approve' ? 'approved' : 'rejected' };
        if (action === 'reject') {
            updateData.rejectedAt = new Date();
        }

        await Product.findByIdAndUpdate(productId, updateData);
        res.json({ success: true, message: `Produk berhasil di-${action === 'approve' ? 'setujui' : 'tolak'}` });
    } catch (e) { res.status(500).json({ success: false }); }
});


// ADMIN USER ROUTES
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
        const users = await User.find({ verificationStatus: 'pending' });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/admin/verify-action', async (req, res) => {
    try {
        await connectDB();
        const { userId, action } = req.body;
        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        await User.findByIdAndUpdate(userId, { verificationStatus: newStatus });
        res.json({ success: true, message: "Status updated" });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        await User.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

module.exports = app;