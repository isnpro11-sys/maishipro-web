/* ============================================== */
/* --- KONFIGURASI BACKEND (WAJIB JALAN) --- */
/* ============================================== */
const API_URL = "/api"; 

/* --- VARIABLES --- */
let tempRegisterData = {}; // Menyimpan data register sementara
let authMode = 'register'; // Mode: 'register' atau 'forgot'
let currentEmail = ''; // Email yang sedang diproses

/* DOM Elements */
const authOverlay = document.getElementById('authOverlay');
const boxLogin = document.getElementById('loginBox');
const boxReg = document.getElementById('registerBox');
const boxOtp = document.getElementById('otpBox');
const boxForgot = document.getElementById('forgotBox');
const boxReset = document.getElementById('resetPassBox');

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
    // Bersihkan form input saat ditutup
    document.querySelectorAll('.auth-box input').forEach(i => i.value = '');
}

function switchAuth(type) {
    // Sembunyikan semua box terlebih dahulu
    [boxLogin, boxReg, boxOtp, boxForgot, boxReset].forEach(b => {
        if(b) b.style.display = 'none';
    });

    // Tampilkan yang sesuai request
    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') {
        boxReg.style.display = 'block';
        authMode = 'register'; 
    }
    if(type === 'otp') boxOtp.style.display = 'block';
    if(type === 'forgot') {
        boxForgot.style.display = 'block';
        authMode = 'forgot';
    }
    if(type === 'reset') boxReset.style.display = 'block';
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

    // Set Data & Mode
    tempRegisterData = { username, email, phone, password };
    currentEmail = email;
    authMode = 'register';

    btn.innerText = "Mengirim Kode...";
    btn.disabled = true;

    try {
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
        alert("Gagal terhubung ke Server.");
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
    btn.disabled = true;
    
    try {
        if (authMode === 'register') {
            // --- ALUR REGISTER ---
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

        } else if (authMode === 'forgot') {
            // --- ALUR LUPA PASSWORD (Check OTP dulu) ---
            const res = await fetch(`${API_URL}/check-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, otp: otpCode })
            });
            const data = await res.json();

            if (data.success) {
                // OTP Valid, simpan kode OTP untuk step selanjutnya
                tempRegisterData.otp = otpCode; 
                switchAuth('reset'); // Pindah ke box password baru
            } else {
                alert(data.message || "Kode OTP Salah!");
            }
        }

    } catch (err) {
        alert("Terjadi kesalahan sistem.");
    } finally {
        btn.innerText = "VERIFIKASI";
        btn.disabled = false;
    }
}

// D. LOGIN FLOW
async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLoginBtn');

    btn.innerText = "Loading...";
    btn.disabled = true;

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
            // Simpan sesi
            localStorage.setItem('user', JSON.stringify(data.userData));
            
            // Ubah tampilan tombol header
            const headerBtn = document.querySelector('.btn-login-header');
            if(headerBtn) headerBtn.innerHTML = `<i class="fas fa-user-check"></i> ${data.userData.username}`;
        } else {
            alert(data.message || "Login Gagal");
        }
    } catch (err) {
        alert("Gagal login. Cek koneksi server.");
    } finally {
        btn.innerText = "LOGIN";
        btn.disabled = false;
    }
}

// E. FORGOT PASSWORD REQUEST (Tahap 1)
async function handleForgotRequest(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const btn = document.getElementById('btnForgotBtn');

    currentEmail = email;
    authMode = 'forgot';

    btn.innerText = "Mengirim...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'forgot' })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('otpTextEmail').innerText = `Reset Pass: Kode dikirim ke ${email}`;
            switchAuth('otp');
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error server");
    } finally {
        btn.innerText = "KIRIM KODE";
        btn.disabled = false;
    }
}

// F. FINAL RESET PASSWORD (Tahap 3 - Simpan Password Baru)
async function handleResetPasswordFinal(e) {
    e.preventDefault();
    const newPass = document.getElementById('resetNewPass').value;
    const confirmPass = document.getElementById('resetConfirmPass').value;
    const btn = document.getElementById('btnResetFinal');

    if (newPass !== confirmPass) return alert("Password konfirmasi tidak cocok!");

    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: currentEmail, 
                otp: tempRegisterData.otp, // Ambil OTP yang tadi sudah divalidasi
                newPassword: newPass 
            })
        });
        const data = await res.json();

        if (data.success) {
            alert("Password berhasil diubah! Silakan login dengan password baru.");
            switchAuth('login');
        } else {
            alert(data.message || "Gagal mengubah password.");
        }
    } catch (e) {
        alert("Terjadi kesalahan.");
    } finally {
        btn.innerText = "UBAH PASSWORD";
        btn.disabled = false;
    }
}

/* ============================================== */
/* --- 3. SLIDER & SEARCH LOGIC (UI) --- */
/* ============================================== */

// Slider
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

setInterval(() => showSlide(slideIndex + 1), 4000);

// Search Overlay
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
