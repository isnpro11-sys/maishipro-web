// api/users.js
require('dotenv').config();
const mongoose = require('mongoose');

// --- Gunakan Schema yang sama dengan index.js ---
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    phone: String,
    profilePic: String,
    role: String,
    sellerLevel: String,
    createdAt: { type: Date, default: Date.now }
});

// Mencegah error "OverwriteModelError" saat hot-reload di Vercel
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- Koneksi Database ---
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
    } catch (err) {
        console.error("DB Connect Error", err);
        throw err;
    }
};

export default async function handler(req, res) {
    await connectDB();

    // 1. GET: Ambil Semua User (Untuk Menu List User)
    if (req.method === 'GET') {
        try {
            // Ambil semua user, urutkan dari yang terbaru
            const users = await User.find({}).sort({ createdAt: -1 });
            return res.status(200).json({ success: true, data: users });
        } catch (error) {
            return res.status(500).json({ success: false, message: "Gagal ambil data" });
        }
    }

    // 2. DELETE: Hapus User
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            await User.findByIdAndDelete(id);
            return res.status(200).json({ success: true, message: "User berhasil dihapus" });
        } catch (error) {
            return res.status(500).json({ success: false, message: "Gagal hapus user" });
        }
    }

    // 3. PUT: Edit User (Untuk Admin Update Data User Lain atau Diri Sendiri)
    if (req.method === 'PUT') {
        try {
            const { id, username, email, phone, password } = req.body;
            await User.findByIdAndUpdate(id, { username, email, phone, password });
            return res.status(200).json({ success: true, message: "Data berhasil diupdate" });
        } catch (error) {
            return res.status(500).json({ success: false, message: "Gagal update user" });
        }
    }

    return res.status(405).json({ message: "Method not allowed" });
}
