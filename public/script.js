/* ============================================== */
/* --- KONFIGURASI BACKEND (WAJIB JALAN) --- */
/* ============================================== */
const API_URL = "/api"; 

/* --- VARIABLES --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let currentEmail = ''; 

/* DOM Elements */
const authOverlay = document.getElementById('authOverlay');
const boxLogin = document.getElementById('loginBox');
const boxReg = document.getElementById('registerBox');
const boxOtp = document.getElementById('otpBox');
const boxForgot = document.getElementById('forgotBox');
const boxReset = document.getElementById('resetPassBox');
// Modal Baru untuk Ganti Password
const boxChangePass = document.getElementById('changePassModal');

/* ============================================== */
/* --- INIT: CEK LOGIN & SETUP --- */
/* ============================================== */
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    setupOtpInputs(); 
    
    // Check URL Hash untuk persistence (Agar tidak balik ke home saat refresh)
    const hash = window.location.hash.substring(1);
    if (hash && hash !== "") {
        renderPage(hash, null);
    } else {
        const savedTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(savedTab);
    }
});

/* ============================================== */
/* --- FUNGSI NAVIGASI UTAMA (TAB & SPA) --- */
/* ============================================== */
const homeSection = document.getElementById('home-page');
const detailSection = document.getElementById('detail-page');
const pageTitle = document.getElementById('page-title');

// 1. Ganti Tab Utama (Home, Transaksi, dll)
function switchMainTab(tabName) {
    localStorage.setItem('activeTab', tabName);
    
    // Sembunyikan Detail Page jika aktif
    detailSection.classList.remove('active');
    
    // Hide semua section
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    // Show target section
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');

    // Update Bottom Nav
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) activeNav.classList.add('active');

    // Bersihkan hash agar URL bersih saat di menu utama
    history.pushState("", document.title, window.location.pathname + window.location.search);
}

// 2. Masuk ke Halaman Detail (Produk/Kategori)
function goToPage(pageId, titleName) {
    window.location.hash = pageId;
    localStorage.setItem('currentTitle', titleName);
    renderPage(pageId, titleName);
}

// 3. Render Halaman Detail
function renderPage(pageId, titleName) {
    // Sembunyikan semua tab utama
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    // Tampilkan halaman detail
    detailSection.classList.add('active');
    window.scrollTo(0, 0);

    if (titleName) {
        pageTitle.innerText = titleName;
    } else {
        pageTitle.innerText = localStorage.getItem('currentTitle') || 'Detail Kategori';
    }
}

// 4. Tombol Kembali
function goBack() {
    // Hapus hash
    history.pushState("", document.title, window.location.pathname + window.location.search);
    
    detailSection.classList.remove('active');
    // Kembali ke tab terakhir yang dibuka
    const lastTab = localStorage.getItem('activeTab') || 'home';
    switchMainTab(lastTab);
}

// 5. Handle Tombol Back Browser (Popstate)
window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1);
    if (!hash) {
        detailSection.classList.remove('active');
        const lastTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(lastTab);
    } else {
        renderPage(hash, null);
    }
});

/* ============================================== */
/* --- SLIDER MANUAL + OTOMATIS (SWIPE) --- */
/* ============================================== */
const wrapper = document.getElementById('slider-wrapper');
const container = document.getElementById('slider-container');
const dots = document.querySelectorAll('.dot');
const totalSlides = 3;
let currentIndex = 0;
let autoSlideInterval;
let startX = 0;
let endX = 0;

// Fungsi Update Posisi
function updateSlider() {
    if(!wrapper) return;
    wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    if(dots[currentIndex]) dots[currentIndex].classList.add('active');
}

// Fungsi Next Slide
function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider();
}

// Fungsi Start Otomatis
function startAutoSlide() {
    stopAutoSlide(); 
    autoSlideInterval = setInterval(nextSlide, 4000); 
}

// Fungsi Stop Otomatis
function stopAutoSlide() {
    clearInterval(autoSlideInterval);
}

// Event Listeners Slider
if (container) {
    // 1. Touch Start
    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        stopAutoSlide();
    });

    // 2. Touch Move
    container.addEventListener('touchmove', (e) => {
        endX = e.touches[0].clientX;
    });

    // 3. Touch End
    container.addEventListener('touchend', () => {
        if (startX > endX + 50) {
            // Geser ke Kiri (Next)
            nextSlide();
        } else if (startX < endX - 50) {
            // Geser ke Kanan (Prev)
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSlider();
        }
        startAutoSlide();
    });

    // 4. Klik Dots Navigasi
    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            stopAutoSlide();
            currentIndex = parseInt(e.target.dataset.index);
            updateSlider();
            startAutoSlide();
        });
    });

    startAutoSlide();
}

/* ============================================== */
/* --- AUTHENTICATION & LOGIN STATE --- */
/* ============================================== */

// Fungsi Cek State Login
function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');

    if (userSession) {
        // --- SUDAH LOGIN ---
        const user = JSON.parse(userSession);
        
        // 1. Update Header (Kiri Atas)
        headerAuthArea.innerHTML = `
            <div class="header-user-area" onclick="switchMainTab('profile')">
                <span class="user-name-header">${user.username}</span>
                <img src="https://api.deline.web.id/76NssFHmcI.png" alt="Profile" class="profile-pic">
            </div>
        `;

        renderAuthPages(true, user);

    } else {
        // --- BELUM LOGIN ---
        headerAuthArea.innerHTML = `
            <button class="btn-login-header" onclick="openAuthModal('login')">
                <i class="fas fa-user-circle"></i> Masuk / Daftar
            </button>
        `;
        renderAuthPages(false, null);
    }
}

// Render Halaman Berdasarkan Login (UPDATED: UI BARU)
function renderAuthPages(isLoggedIn, user) {
    const transContent = document.getElementById('transaksi-content');
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    const produkContent = document.getElementById('produk-content');
    
    // Update Floating Circle di Navbar Bawah
    const navProfileImg = document.querySelector('.floating-circle');
    
    // Ambil Inisial Huruf Pertama
    const userInitial = user ? user.username.charAt(0).toUpperCase() : '?';

    // HTML untuk Login Prompt (Jika belum login)
    const loginPromptHTML = `
        <div class="auth-required-state">
            <i class="fas fa-lock lock-icon"></i>
            <p>Silakan Login untuk mengakses halaman ini.</p>
            <button class="btn-center-login" onclick="openAuthModal('login')">
                <i class="fas fa-sign-in-alt"></i> LOGIN / DAFTAR
            </button>
        </div>
    `;

    if (!isLoggedIn) {
        if(transContent) transContent.innerHTML = loginPromptHTML;
        if(profileContent) profileContent.innerHTML = loginPromptHTML;
        if(settingsContent) settingsContent.innerHTML = loginPromptHTML;
        if(produkContent) produkContent.innerHTML = loginPromptHTML;
        
        // Reset Nav Image ke default
        if(navProfileImg) navProfileImg.innerHTML = `<img src="https://api.deline.web.id/76NssFHmcI.png">`;

    } else {
        // --- LOGIKA SUDAH LOGIN ---

        // 1. Update Navbar Bottom Image dengan Inisial (White BG)
        if(navProfileImg) {
            navProfileImg.innerHTML = `
                <div style="width:100%; height:100%; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#205081; font-weight:bold; font-size:20px; border:2px solid #eee;">
                    ${userInitial}
                </div>
            `;
        }

        // 2. Halaman Transaksi
        if(transContent) {
            transContent.innerHTML = `
                <div class="empty-page" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-receipt" style="font-size:40px; margin-bottom:10px;"></i>
                    <p>Halo <b>${user.username}</b>, belum ada riwayat transaksi.</p>
                </div>
            `;
        }

        // 3. Halaman PROFIL (View Only - Kotak Panjang)
        if(profileContent) {
            profileContent.innerHTML = `
                <div class="profile-view-header">
                    <div class="profile-view-avatar">${userInitial}</div>
                    <div style="color:white; margin-top:10px; font-weight:bold;">${user.username}</div>
                </div>
                
                <div class="profile-details-card">
                    <div class="detail-row">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${user.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${user.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Nomor WhatsApp</span>
                        <span class="detail-value">${user.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Password</span>
                        <span class="detail-value">••••••••</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Member Level</span>
                        <span class="level-badge">BASIC</span>
                    </div>
                </div>
            `;
        }

        // 4. Halaman PENGATURAN (Settings - Edit & Logout)
        if(settingsContent) {
            settingsContent.innerHTML = `
                <div class="settings-page-wrapper">
                    <div>
                        <div class="profile-header-container">
                            <div class="avatar-wrapper">
                                <div class="avatar-circle-display">${userInitial}</div>
                                <div class="camera-badge" onclick="alert('Fitur ganti foto belum tersedia di demo ini')">
                                    <i class="fas fa-camera"></i>
                                </div>
                            </div>
                        </div>

                        <div class="form-container" style="padding: 0 10px;">
                            
                            <div class="form-group-styled">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-input-styled" value="${user.username}" onchange="updateLocalUsername(this.value)">
                            </div>

                            <div class="form-group-styled">
                                <label class="form-label">Email <i class="fas fa-lock" style="font-size:10px; margin-left:5px;"></i></label>
                                <input type="text" class="form-input-styled permanent" value="${user.email}" readonly>
                            </div>

                            <div class="form-group-styled">
                                <label class="form-label">Nomor WhatsApp <i class="fas fa-lock" style="font-size:10px; margin-left:5px;"></i></label>
                                <input type="text" class="form-input-styled permanent" value="${user.phone}" readonly>
                            </div>

                            <div class="form-group-styled">
                                <label class="form-label">Password</label>
                                <div class="form-input-styled clickable" onclick="openChangePassModal()">
                                    <span>••••••••</span>
                                    <i class="fas fa-pen" style="color:#205081; font-size:12px;"></i>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="logout-area" style="padding: 0 10px;">
                        <button class="btn-logout-bottom" onclick="logoutUser()">
                            <i class="fas fa-sign-out-alt"></i> KELUAR AKUN
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Produk tetap sama
        if(produkContent) {
             produkContent.innerHTML = `
                <div class="game-grid" style="background:transparent; padding:0;">
                   <div class="category-wrapper-bg" style="padding:0;">
                        <div class="category-card" style="margin-top:0;">
                            <div class="cat-grid">
                                <div class="cat-item" onclick="goToPage('topup-ml', 'Topup ML')">
                                    <img src="https://api.deline.web.id/u8m7Yq2Pdu.jpg" class="cat-img"><div class="cat-name">MLBB</div>
                                </div>
                                <div class="cat-item" onclick="goToPage('topup-ff', 'Topup FF')">
                                    <img src="https://api.deline.web.id/BqQnrJVNPO.jpg" class="cat-img"><div class="cat-name">Free Fire</div>
                                </div>
                            </div>
                        </div>
                   </div>
                </div>
            `;
        }
    }
}

function logoutUser() {
    localStorage.removeItem('user');
    alert("Berhasil keluar.");
    checkLoginState(); 
    switchMainTab('home'); 
}

/* ============================================== */
/* --- AUTH MODAL LOGIC & TOGGLE PASS --- */
/* ============================================== */

function openAuthModal(type) {
    authOverlay.classList.add('active');
    document.body.classList.add('lock-scroll');
    switchAuth(type);
}

function closeAuthModal() {
    authOverlay.classList.remove('active');
    document.body.classList.remove('lock-scroll');
    document.querySelectorAll('.auth-box input').forEach(i => i.value = '');
}

function switchAuth(type) {
    // Sembunyikan semua box
    [boxLogin, boxReg, boxOtp, boxForgot, boxReset].forEach(b => { if(b) b.style.display = 'none'; });
    
    // Pastikan Change Pass Modal juga ketutup jika tidak dipanggil
    const cpModal = document.getElementById('changePassModal');
    if(cpModal) cpModal.style.display = 'none';

    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') { boxReg.style.display = 'block'; authMode = 'register'; }
    if(type === 'otp') {
        boxOtp.style.display = 'block';
        setTimeout(() => document.querySelector('.otp-field').focus(), 100);
    }
    if(type === 'forgot') { boxForgot.style.display = 'block'; authMode = 'forgot'; }
    if(type === 'reset') boxReset.style.display = 'block';
}

// 1. Fitur Toggle Password (Mata Coret)
function togglePass(id, icon) {
    const input = document.getElementById(id);
    if(input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

/* ============================================== */
/* --- REGISTER & OTP LOGIC --- */
/* ============================================== */

async function handleRegisterRequest(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const btn = document.getElementById('btnRegBtn');

    if (password !== confirm) return alert("Password konfirmasi tidak cocok!");

    tempRegisterData = { username, email, phone, password };
    currentEmail = email;
    authMode = 'register';
    btn.innerText = "Mengirim Kode..."; btn.disabled = true;

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
        } else { alert(data.message || "Gagal mengirim OTP"); }
    } catch (err) { alert("Gagal terhubung ke Server (Mode Demo)."); } 
    finally { btn.innerText = "DAFTAR"; btn.disabled = false; }
}

// 2. Setup OTP Input (Auto Paste & Focus)
function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-field');
    inputs.forEach((input, index) => {
        // Handle Paste (Tempel 6 kode langsung isi semua)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const cleanData = e.clipboardData.getData('text').replace(/\D/g, ''); // Ambil angka saja
            
            if (cleanData) {
                const len = cleanData.length;
                for (let i = 0; i < len; i++) {
                    if (inputs[index + i]) {
                        inputs[index + i].value = cleanData[i];
                        // Focus ke input terakhir yang terisi
                        if(index + i < inputs.length - 1) inputs[index + i + 1].focus();
                        else inputs[index + i].focus();
                    }
                }
            }
        });

        input.addEventListener('input', (e) => {
            if (isNaN(e.target.value)) { e.target.value = ""; return; }
            if (e.target.value !== "" && index < inputs.length - 1) inputs[index + 1].focus();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === "" && index > 0) inputs[index - 1].focus();
        });
    });
}

// 3. Verifikasi OTP & Auto Login
async function handleVerifyOtp() {
    let otpCode = "";
    document.querySelectorAll('.otp-field').forEach(field => otpCode += field.value);
    if (otpCode.length < 6) return alert("Masukkan 6 digit kode!");
    const btn = document.getElementById('btnVerifyBtn');
    btn.innerText = "Memproses..."; btn.disabled = true;
    
    try {
        if (authMode === 'register') {
            const res = await fetch(`${API_URL}/register-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...tempRegisterData, otp: otpCode })
            });
            const data = await res.json();
            
            if (data.success) { 
                alert("Pendaftaran Berhasil!"); 
                
                // --- AUTO LOGIN LOGIC ---
                // Simpan data user ke localStorage seolah-olah login sukses
                const userData = {
                    username: tempRegisterData.username,
                    email: tempRegisterData.email,
                    phone: tempRegisterData.phone
                };
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Refresh tampilan & tutup modal
                checkLoginState();
                closeAuthModal();
                
            } else { alert(data.message || "Kode OTP Salah!"); }

        } else if (authMode === 'forgot') {
            const res = await fetch(`${API_URL}/check-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, otp: otpCode })
            });
            const data = await res.json();
            if (data.success) { tempRegisterData.otp = otpCode; switchAuth('reset'); }
            else { alert(data.message || "Kode OTP Salah!"); }
        }
    } catch (err) { alert("Terjadi kesalahan sistem."); }
    finally { btn.innerText = "VERIFIKASI"; btn.disabled = false; }
}

/* ============================================== */
/* --- LOGIN, FORGOT, SEARCH --- */
/* ============================================== */

async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLoginBtn');

    btn.innerText = "Loading..."; btn.disabled = true;

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
            localStorage.setItem('user', JSON.stringify(data.userData));
            checkLoginState(); 
        } else {
            alert(data.message || "Login Gagal");
        }
    } catch (err) { alert("Gagal login. Cek koneksi server."); }
    finally { btn.innerText = "LOGIN"; btn.disabled = false; }
}

async function handleForgotRequest(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const btn = document.getElementById('btnForgotBtn');
    currentEmail = email; authMode = 'forgot';
    btn.innerText = "Mengirim..."; btn.disabled = true;
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
        } else { alert(data.message); }
    } catch (err) { alert("Error server"); }
    finally { btn.innerText = "KIRIM KODE"; btn.disabled = false; }
}

async function handleResetPasswordFinal(e) {
    e.preventDefault();
    const newPass = document.getElementById('resetNewPass').value;
    const confirmPass = document.getElementById('resetConfirmPass').value;
    const btn = document.getElementById('btnResetFinal');
    if (newPass !== confirmPass) return alert("Password konfirmasi tidak cocok!");
    btn.innerText = "Menyimpan..."; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, otp: tempRegisterData.otp, newPassword: newPass })
        });
        const data = await res.json();
        if (data.success) { alert("Password berhasil diubah!"); switchAuth('login'); }
        else { alert(data.message); }
    } catch (e) { alert("Terjadi kesalahan."); }
    finally { btn.innerText = "UBAH PASSWORD"; btn.disabled = false; }
}

/* SEARCH OVERLAY */
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

/* ============================================== */
/* --- NEW FEATURES: SETTINGS & PASSWORD --- */
/* ============================================== */

// 1. Update Username Local (Simulasi)
function updateLocalUsername(newName) {
    if(!newName) return;
    const userSession = JSON.parse(localStorage.getItem('user'));
    userSession.username = newName;
    localStorage.setItem('user', JSON.stringify(userSession));
    
    // Update tampilan header tanpa refresh full
    document.querySelector('.user-name-header').innerText = newName;
    checkLoginState(); // Refresh inisial
}

// 2. Buka Modal Ganti Password
function openChangePassModal() {
    // Tutup modal lain jika ada
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    
    const overlay = document.getElementById('authOverlay');
    const modal = document.getElementById('changePassModal');
    
    overlay.classList.add('active');
    if(modal) modal.style.display = 'block';
}

// 3. Handle Submit Ganti Password
async function handleChangePassword(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPass').value;
    const newPass = document.getElementById('newPass').value;
    
    // Di real app, validasi password lama harus di server. 
    // Di demo UI ini kita anggap valid jika form terisi.
    
    if(!oldPass || !newPass) return alert("Mohon isi semua bidang.");
    
    // Simulasi Loading
    const btn = e.target.querySelector('button');
    const oriText = btn.innerText;
    btn.innerText = "Memproses..."; btn.disabled = true;

    setTimeout(() => {
        alert("Password Berhasil Diubah! Silakan login ulang.");
        logoutUser();
        btn.innerText = oriText; btn.disabled = false;
        closeAuthModal();
    }, 1500);
}
