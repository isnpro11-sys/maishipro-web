/* ============================================== */
/* --- KONFIGURASI BACKEND (WAJIB JALAN) --- */
/* ============================================== */
// Ganti dengan URL hosting backend Anda jika sudah online
// Jika di lokal, pastikan 'node server.js' berjalan di port 3000
const API_URL = "/api"; 

/* --- VARIABLES --- */
let tempRegisterData = {}; // Menyimpan data register sementara sebelum OTP
const authOverlay = document.getElementById('authOverlay');
const boxLogin = document.getElementById('loginBox');
const boxReg = document.getElementById('registerBox');
const boxOtp = document.getElementById('otpBox');
const boxForgot = document.getElementById('forgotBox');

/* ============================================== */
/* --- 1. NAVIGASI HALAMAN (SPA) --- */
/* ============================================== */
const homeSection = document.getElementById('home-page');
const detailSection = document.getElementById('detail-page');
const pageTitle = document.getElementById('page-title');

function goToPage(pageId, titleName) {
    window.location.hash = pageId;
    localStorage.setItem('currentTitle', titleName);
    renderPage(pageId, titleName);
}

function renderPage(pageId, titleName) {
    homeSection.classList.remove('active');
    detailSection.classList.add('active');
    window.scrollTo(0, 0);
    pageTitle.innerText = titleName || localStorage.getItem('currentTitle') || 'Detail';
}

function goBack() {
    history.pushState("", document.title, window.location.pathname + window.location.search);
    detailSection.classList.remove('active');
    homeSection.classList.add('active');
}

// Handle Back Button Browser
window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1);
    if (!hash) {
        detailSection.classList.remove('active');
        homeSection.classList.add('active');
    } else {
        renderPage(hash, null);
    }
});

/* ============================================== */
/* --- 2. AUTHENTICATION LOGIC (API) --- */
/* ============================================== */

// A. Modal Control
function openAuthModal(type) {
    authOverlay.classList.add('active');
    document.body.classList.add('lock-scroll');
    switchAuth(type);
}

function closeAuthModal() {
    authOverlay.classList.remove('active');
    document.body.classList.remove('lock-scroll');
}

function switchAuth(type) {
    [boxLogin, boxReg, boxOtp, boxForgot].forEach(b => b.style.display = 'none');
    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') boxReg.style.display = 'block';
    if(type === 'otp') boxOtp.style.display = 'block';
    if(type === 'forgot') boxForgot.style.display = 'block';
}

function togglePass(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}

// B. REGISTER FLOW (Kirim OTP)
async function handleRegisterRequest(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const btn = document.getElementById('btnRegBtn');

    if (password !== confirm) return alert("Password konfirmasi tidak cocok!");

    // Simpan data di memory browser
    tempRegisterData = { username, email, phone, password };

    btn.innerText = "Mengirim Kode...";
    btn.disabled = true;

    try {
        // Panggil API Backend (Kirim Email)
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'register' })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('otpTextEmail').innerText = `Kode dikirim ke ${email}`;
            switchAuth('otp');
        } else {
            alert(data.message || "Gagal mengirim OTP");
        }
    } catch (err) {
        console.error(err);
        alert("Gagal terhubung ke Server. Pastikan server.js jalan!");
    } finally {
        btn.innerText = "DAFTAR";
        btn.disabled = false;
    }
}

// C. OTP Logic (Auto Move & Verify)
function otpMove(elm) {
    if(elm.value.length >= 1) {
        const next = elm.nextElementSibling;
        if(next) next.focus();
    }
}

async function handleVerifyOtp() {
    let otpCode = "";
    document.querySelectorAll('.otp-field').forEach(field => otpCode += field.value);

    if (otpCode.length < 6) return alert("Masukkan 6 digit kode!");

    const btn = document.getElementById('btnVerifyBtn');
    btn.innerText = "Memproses...";
    
    try {
        // Verifikasi OTP & Create User di DB
        const res = await fetch(`${API_URL}/register-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tempRegisterData, otp: otpCode })
        });
        const data = await res.json();

        if (data.success) {
            alert("Pendaftaran Berhasil! Silakan Login.");
            switchAuth('login');
        } else {
            alert(data.message || "Kode OTP Salah!");
        }
    } catch (err) {
        alert("Terjadi kesalahan sistem.");
    } finally {
        btn.innerText = "VERIFIKASI";
    }
}

// D. LOGIN FLOW
async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLoginBtn');

    btn.innerText = "Loading...";

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginInput, password })
        });
        const data = await res.json();

        if (data.success) {
            alert(`Selamat datang, ${data.userData.username}!`);
            closeAuthModal();
            // Simpan sesi login (opsional)
            localStorage.setItem('user', JSON.stringify(data.userData));
            
            // Ubah tombol header jadi nama user (Visual Feedback)
            const headerBtn = document.querySelector('.btn-login-header');
            headerBtn.innerHTML = `<i class="fas fa-user-check"></i> ${data.userData.username}`;
        } else {
            alert(data.message || "Login Gagal");
        }
    } catch (err) {
        alert("Gagal login. Cek koneksi server.");
    } finally {
        btn.innerText = "LOGIN";
    }
}

// E. FORGOT PASSWORD FLOW
async function handleForgotRequest(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const btn = document.getElementById('btnForgotBtn');

    btn.innerText = "Mengirim...";
    
    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'forgot' })
        });
        const data = await res.json();

        if (data.success) {
            alert("Kode OTP reset password telah dikirim ke email.");
            document.getElementById('otpTextEmail').innerText = `Reset Pass: Kode ke ${email}`;
            switchAuth('otp');
            // Catatan: Logic reset password final butuh endpoint tambahan di server
            // Di sini kita arahkan ke OTP dulu sebagai validasi
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error server");
    } finally {
        btn.innerText = "KIRIM KODE";
    }
}

/* ============================================== */
/* --- 3. SLIDER & SEARCH LOGIC (UI) --- */
/* ============================================== */

// Slider Otomatis
const wrapper = document.getElementById('slider-wrapper');
const dots = document.querySelectorAll('.dot');
let slideIndex = 0;

function showSlide(n) {
    slideIndex = n;
    if(slideIndex >= 3) slideIndex = 0;
    if(slideIndex < 0) slideIndex = 2;
    if(wrapper) wrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    if(dots[slideIndex]) dots[slideIndex].classList.add('active');
}

setInterval(() => showSlide(slideIndex + 1), 4000); // Auto geser 4 detik

// Search Overlay Logic
const searchInput = document.getElementById('searchInput');
const searchOverlay = document.getElementById('searchOverlay');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const header = document.getElementById('mainHeader');

if (searchInput) {
    searchInput.addEventListener('focus', () => {
        const h = header.offsetHeight;
        searchOverlay.style.top = h + 'px';
        searchOverlay.style.height = `calc(100vh - ${h}px)`;
        searchOverlay.classList.add('active');
        document.body.classList.add('lock-scroll');
    });

    closeSearchBtn.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
        searchOverlay.style.height = '0';
        document.body.classList.remove('lock-scroll');
    });
}
