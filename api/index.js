// api/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit ditingkatkan untuk upload gambar base64

// ==========================================
// --- KONFIGURASI ADMIN ---
// ==========================================
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

// ==========================================
// --- 1. KONEKSI DATABASE ---
// ==========================================
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

// ==========================================
// --- 2. MODELS (SCHEMA) ---
// ==========================================

// --- USER SCHEMA ---
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    phone: { type: String, unique: true },
    profilePic: { type: String, default: "" },
    role: { type: String, default: "Member" }, // Member, Admin
    sellerLevel: { type: String, default: "Newbie" },
    verificationStatus: { type: String, default: "unverified" }, // unverified, pending, verified, rejected
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- OTP SCHEMA ---
const OtpSchema = new mongoose.Schema({
    email: String,
    code: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
});
const OTP = mongoose.models.OTP || mongoose.model('OTP', OtpSchema);

// --- PRODUCT SCHEMA (BARU) ---
const ProductSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String, // Simpan username agar query admin lebih cepat
    userPhone: String, // Untuk kontak pembeli ke penjual
    mainCategory: String, // cth: Akun Game
    subCategory: String, // cth: akun-ff
    title: String,
    description: String,
    price: Number,
    paymentMethod: String, // Dana / Gopay
    paymentNumber: String,
    images: [String], // Array of Base64 strings
    status: { type: String, default: 'pending' }, // pending, active, rejected
    rejectedAt: { type: Date }, // Untuk timer hapus otomatis
    createdAt: { type: Date, default: Date.now }
});

// TTL Index: Dokumen akan otomatis dihapus MongoDB 5 menit (300 detik) setelah rejectedAt terisi
ProductSchema.index({ rejectedAt: 1 }, { expireAfterSeconds: 300 });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ==========================================
// --- 3. TRANSPORTER EMAIL ---
// ==========================================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// ==========================================
// --- ROUTES API ---
// ==========================================

// Test Route
app.get('/api', (req, res) => res.send("Server is Running!"));

// A. REQUEST OTP (Register & Verification)
app.post('/api/request-otp', async (req, res) => {
    try {
        await connectDB();
        const { email, type, username, phone } = req.body;

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });

        // --- DESAIN EMAIL HTML ---
        const emailTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background-color: #205081; padding: 20px; text-align: center; color: white; }
                .content { padding: 30px 20px; text-align: center; color: #333333; }
                .otp-box { 
                    background-color: #f3f4f6; 
                    border: 2px dashed #205081; 
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
            </style>
        </head>
        <body>
            <div style="padding: 20px;">
                <div class="container">
                    <div class="header"><h2 style="margin:0;">Maishipro</h2></div>
                    <div class="content">
                        <h3 style="margin-top: 0;">Kode Verifikasi</h3>
                        <p>Gunakan kode di bawah ini untuk ${type === 'register' ? 'Pendaftaran' : 'Verifikasi Akun'}:</p>
                        <div class="otp-box"><span class="otp-code">${otpCode}</span></div>
                        <p style="margin-top: 30px; font-size: 13px; color: #888;">Kode berlaku 5 menit.</p>
                    </div>
                    <div class="footer">&copy; ${new Date().getFullYear()} Maishipro.</div>
                </div>
            </div>
        </body>
        </html>
        `;

        await transporter.sendMail({
            from: "Maishipro Website <" + process.env.SMTP_USER + ">",
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
        res.status(500).json({ success: false, message: "Error Register. Username/Email mungkin sudah ada." });
    }
});

// C. AJUKAN VERIFIKASI (User Settings)
app.post('/api/submit-verification', async (req, res) => {
    try {
        await connectDB();
        const { originalEmail, newUsername, newEmail, newPhone, otp } = req.body;

        // 1. Cek OTP (dikirim ke email BARU jika diganti, atau email LAMA jika tidak)
        const targetEmail = newEmail || originalEmail;
        const validOtp = await OTP.findOne({ email: targetEmail, code: otp });
        
        if (!validOtp) return res.status(400).json({ success: false, message: "OTP Salah!" });

        // 2. Update Data User & Set Status Pending
        const updateData = {
            username: newUsername,
            email: newEmail,
            phone: newPhone,
            verificationStatus: 'pending' // Status berubah jadi Pending
        };

        const updatedUser = await User.findOneAndUpdate(
            { email: originalEmail }, 
            updateData, 
            { new: true } // Return user baru
        );

        if (!updatedUser) return res.status(404).json({ success: false, message: "User tidak ditemukan." });

        await OTP.deleteOne({ _id: validOtp._id });

        res.json({ 
            success: true, 
            message: "Permintaan Verifikasi Terkirim!",
            user: updatedUser 
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Gagal memproses verifikasi." });
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

        // Auto Admin Check
        if (ADMIN_EMAILS.includes(user.email) && user.role !== 'Admin') {
             await User.updateOne({_id: user._id}, {role: 'Admin'});
             user.role = 'Admin';
        }

        res.json({ 
            success: true, 
            userData: user // Mengirim object user lengkap termasuk verificationStatus
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error Login" });
    }
});

// Get Single User Data
app.post('/api/get-user', async (req, res) => {
    try {
        await connectDB();
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.json({ success: false });
        res.json({ success: true, userData: user });
    } catch(e) {
        res.json({ success: false });
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

// ==========================================
// --- PRODUCT ROUTES (BARU) ---
// ==========================================

// 1. Upload Produk Baru
app.post('/api/products/add', async (req, res) => {
    try {
        await connectDB();
        const { email, mainCategory, subCategory, title, description, price, paymentMethod, paymentNumber, images } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Validasi simpel: Wajib verified
        if(user.verificationStatus !== 'verified') {
            return res.status(403).json({ success: false, message: "Akun belum terverifikasi!" });
        }

        await Product.create({
            userId: user._id,
            username: user.username,
            userPhone: user.phone,
            mainCategory, subCategory, title, description, price, 
            paymentMethod, paymentNumber, images,
            status: 'pending'
        });

        res.json({ success: true, message: "Produk berhasil dikirim untuk ditinjau." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Gagal upload produk. Cek ukuran gambar." });
    }
});

// 2. Get Produk User (List Produk Anda)
app.post('/api/products/my-products', async (req, res) => {
    try {
        await connectDB();
        const user = await User.findOne({ email: req.body.email });
        if(!user) return res.json({ success: false });

        const products = await Product.find({ userId: user._id }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch(e) { res.status(500).json({ success: false }); }
});

// 3. Admin: Get Pending Products (Untuk Menu Acc)
app.get('/api/admin/products/pending', async (req, res) => {
    try {
        await connectDB();
        const products = await Product.find({ status: 'pending' }).sort({ createdAt: 1 });
        res.json({ success: true, products });
    } catch(e) { res.status(500).json({ success: false }); }
});

// 4. Admin: Action Acc/Reject Produk
app.post('/api/admin/products/action', async (req, res) => {
    try {
        await connectDB();
        const { productId, action } = req.body; // action: 'approve' | 'reject'

        if (action === 'approve') {
            await Product.findByIdAndUpdate(productId, { status: 'active' });
        } else {
            // Set rejectedAt agar TTL index bekerja (hapus otomatis setelah 5 menit)
            await Product.findByIdAndUpdate(productId, { status: 'rejected', rejectedAt: new Date() });
        }
        res.json({ success: true, message: "Status diperbarui." });
    } catch(e) { res.status(500).json({ success: false }); }
});

// 5. Public: Get Active Products by Category (Untuk Halaman Detail/Kategori)
app.get('/api/products/public/:category', async (req, res) => {
    try {
        await connectDB();
        const { category } = req.params;
        const products = await Product.find({ subCategory: category, status: 'active' }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch(e) { res.status(500).json({ success: false }); }
});


// ==========================================
// --- ADMIN ROUTES (USER MANAGEMENT) ---
// ==========================================

// 1. Get All Users (For List)
app.get('/api/admin/users', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false, message: "Error fetch users" }); }
});

// 2. Get Pending Verifications
app.get('/api/admin/verifications', async (req, res) => {
    try {
        await connectDB();
        const users = await User.find({ verificationStatus: 'pending' }).sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false, message: "Error fetch pending" }); }
});

// 3. Action Verifikasi (Terima/Tolak User)
app.post('/api/admin/verify-action', async (req, res) => {
    try {
        await connectDB();
        const { userId, action } = req.body; // action: 'approve' | 'reject'
        
        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        
        await User.findByIdAndUpdate(userId, { verificationStatus: newStatus });
        
        res.json({ success: true, message: `User berhasil di-${action === 'approve' ? 'verifikasi' : 'tolak'}` });
    } catch (e) { res.status(500).json({ success: false, message: "Gagal update status." }); }
});

// 4. Delete & Edit User (Existing)
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "User dihapus." });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.put('/api/admin/users/:id', async (req, res) => {
    try {
        await connectDB();
        await User.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true, message: "User diupdate!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Listener untuk Local Development (Agar tidak error saat npm start)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
