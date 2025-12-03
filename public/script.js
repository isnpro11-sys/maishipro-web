/* ============================================== */
/* --- KONFIGURASI BACKEND (WAJIB JALAN) --- */
/* ============================================== */
const API_URL = "/api"; 

/* --- VARIABLES --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let currentEmail = ''; 
let cropper = null; // Variabel untuk instance Cropper.js

/* DOM Elements Global */
const authOverlay = document.getElementById('authOverlay');
const boxLogin = document.getElementById('loginBox');
const boxReg = document.getElementById('registerBox');
const boxOtp = document.getElementById('otpBox');
const boxForgot = document.getElementById('forgotBox');
const boxReset = document.getElementById('resetPassBox');
const boxChangePass = document.getElementById('changePassModal');

/* ============================================== */
/* --- INIT: CEK LOGIN & SETUP --- */
/* ============================================== */
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    setupOtpInputs(); 
    setupFileUploadListener(); // Init listener upload foto
    
    // Check URL Hash untuk persistence
    const hash = window.location.hash.substring(1);
    if (hash && hash !== "") {
        renderPage(hash, null);
    } else {
        const savedTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(savedTab);
    }
});

/* ============================================== */
/* --- HELPER FUNCTIONS (VALIDASI & FORMAT) --- */
/* ============================================== */

// 1. Format Tanggal (Contoh: 03 Desember 2025)
function formatDate(dateString) {
    if(!dateString) return "-";
    try {
        const date = new Date(dateString);
        // Opsi format: Tanggal Bulan Tahun
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateString;
    }
}

// 2. Validasi Password (Min 9, 1 Huruf Besar, 1 Angka)
function isValidPassword(pass) {
    const minLength = 9;
    const hasUpperCase = /[A-Z]/.test(pass); // Cek huruf besar
    const hasNumber = /\d/.test(pass);       // Cek angka
    return pass.length >= minLength && hasUpperCase && hasNumber;
}

// 3. Validasi Username (Min 4 Karakter)
function isValidUsername(user) {
    // Hapus spasi jika tidak diperbolehkan, atau biarkan jika boleh spasi
    return user && user.length >= 4;
}

/* ============================================== */
/* --- FUNGSI NAVIGASI UTAMA (TAB & SPA) --- */
/* ============================================== */
const homeSection = document.getElementById('home-page');
const detailSection = document.getElementById('detail-page');
const pageTitle = document.getElementById('page-title');

function switchMainTab(tabName) {
    localStorage.setItem('activeTab', tabName);
    detailSection.classList.remove('active');
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) activeNav.classList.add('active');

    history.pushState("", document.title, window.location.pathname + window.location.search);
}

function goToPage(pageId, titleName) {
    window.location.hash = pageId;
    localStorage.setItem('currentTitle', titleName);
    renderPage(pageId, titleName);
}

function renderPage(pageId, titleName) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    detailSection.classList.add('active');
    window.scrollTo(0, 0);

    if (titleName) {
        pageTitle.innerText = titleName;
    } else {
        pageTitle.innerText = localStorage.getItem('currentTitle') || 'Detail Kategori';
    }
}

function goBack() {
    history.pushState("", document.title, window.location.pathname + window.location.search);
    detailSection.classList.remove('active');
    const lastTab = localStorage.getItem('activeTab') || 'home';
    switchMainTab(lastTab);
}

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

function updateSlider() {
    if(!wrapper) return;
    wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    if(dots[currentIndex]) dots[currentIndex].classList.add('active');
}

function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider();
}

function startAutoSlide() {
    stopAutoSlide(); 
    autoSlideInterval = setInterval(nextSlide, 4000); 
}

function stopAutoSlide() {
    clearInterval(autoSlideInterval);
}

if (container) {
    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        stopAutoSlide();
    });
    container.addEventListener('touchmove', (e) => {
        endX = e.touches[0].clientX;
    });
    container.addEventListener('touchend', () => {
        if (startX > endX + 50) {
            nextSlide();
        } else if (startX < endX - 50) {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSlider();
        }
        startAutoSlide();
    });
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

function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');

    if (userSession) {
        // --- SUDAH LOGIN ---
        const user = JSON.parse(userSession);
        
        // Cek apakah ada foto profil
        let headerAvatar = `<div style="width:35px; height:35px; border-radius:50%; background:white; color:#205081; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
        
        if (user.profilePic) {
            headerAvatar = `<img src="${user.profilePic}" class="profile-pic">`;
        }

        headerAuthArea.innerHTML = `
            <div class="header-user-area" onclick="switchMainTab('profile')">
                <span class="user-name-header">${user.username}</span>
                ${headerAvatar}
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

// Render Halaman Berdasarkan Login (UPDATED: DATE, LEVEL, FOTO)
function renderAuthPages(isLoggedIn, user) {
    const transContent = document.getElementById('transaksi-content');
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    const produkContent = document.getElementById('produk-content');
    const navProfileImg = document.querySelector('.floating-circle');
    
    // Inisial Default
    const userInitial = user ? user.username.charAt(0).toUpperCase() : '?';

    // HTML Prompt Login
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

        // 1. Update Navbar Bottom (Foto atau Inisial)
        if(navProfileImg) {
            let navContent = '';
            if (user.profilePic) {
                navContent = `<img src="${user.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                navContent = `
                <div style="width:100%; height:100%; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#205081; font-weight:bold; font-size:20px; border:2px solid #eee;">
                    ${userInitial}
                </div>`;
            }
            navProfileImg.innerHTML = navContent;
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

        // 3. Halaman PROFIL (LENGKAP: Foto, Tanggal, Level Penjual)
        if(profileContent) {
            const avatarDisplay = user.profilePic 
                ? `<img src="${user.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : userInitial;

            profileContent.innerHTML = `
                <div class="profile-view-header">
                    <div class="profile-view-avatar">${avatarDisplay}</div>
                    <div style="color:white; margin-top:10px; font-weight:bold;">${user.username}</div>
                    <div style="color:#dbeafe; font-size:12px; margin-top:2px;">Bergabung: ${formatDate(user.createdAt)}</div>
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
                        <span class="detail-label">Member Level</span>
                        <span class="level-badge" style="background:#205081; color:white;">BASIC</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Penjual Level</span>
                        <span class="level-badge" style="background:#27ae60; color:white;">${user.sellerLevel || 'Newbie'}</span>
                    </div>
                </div>
            `;
        }

        // 4. Halaman PENGATURAN (Ada Tombol Kamera & Tanggal)
        if(settingsContent) {
            const avatarDisplay = user.profilePic 
                ? `<img src="${user.profilePic}" class="avatar-circle-display" style="border:none;">`
                : `<div class="avatar-circle-display">${userInitial}</div>`;

            settingsContent.innerHTML = `
                <div class="settings-page-wrapper">
                    <div>
                        <div class="profile-header-container">
                            <div class="avatar-wrapper">
                                ${avatarDisplay}
                                <div class="camera-badge" onclick="triggerFileUpload()">
                                    <i class="fas fa-camera"></i>
                                </div>
                            </div>
                            <div style="font-size:12px; color:#666; margin-top:10px;">
                                Terdaftar sejak: <b>${formatDate(user.createdAt)}</b>
                            </div>
                        </div>

                        <div class="form-container" style="padding: 0 10px;">
                            <div class="form-group-styled">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-input-styled permanent" value="${user.username}" readonly>
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
        
        // Produk (Konten Sample)
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
/* --- FITUR: UPLOAD & CROP FOTO PROFIL --- */
/* ============================================== */

// 1. Setup Listener Input File
function setupFileUploadListener() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    // Masukkan gambar ke modal crop
                    const imageElement = document.getElementById('imageToCrop');
                    if (imageElement) {
                        imageElement.src = event.target.result;
                        openCropModal();
                    }
                };
                reader.readAsDataURL(file);
            }
            // Reset agar bisa pilih file yang sama
            e.target.value = '';
        });
    }
}

// 2. Trigger Klik Input File
function triggerFileUpload() {
    document.getElementById('fileInput').click();
}

// 3. Buka Modal Crop
function openCropModal() {
    const modal = document.getElementById('cropModal');
    modal.style.display = 'flex';
    
    const image = document.getElementById('imageToCrop');
    
    // Hapus instance lama jika ada
    if(cropper) { cropper.destroy(); }

    // Buat instance Cropper baru (Rasio 1:1)
    cropper = new Cropper(image, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        dragMode: 'move',
        responsive: true
    });
}

// 4. Tutup Modal Crop
function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
}

// 5. Simpan Hasil Crop & Upload
function saveCropImage() {
    if(!cropper) return;
    
    // Ambil hasil crop, resize ke 300x300 agar ringan
    const canvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
        fillColor: '#fff'
    });
    
    // Konversi ke Base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    
    // Kirim ke Server
    updateProfilePicOnServer(base64Image);
}

// 6. Fungsi Fetch ke Backend
async function updateProfilePicOnServer(base64Image) {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;
    
    const btn = document.querySelector('.btn-save'); // Tombol simpan di modal
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    try {
        const res = await fetch(`${API_URL}/update-pic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, imageBase64: base64Image })
        });
        const data = await res.json();
        
        if(data.success) {
            // Update LocalStorage dengan foto baru
            user.profilePic = base64Image;
            localStorage.setItem('user', JSON.stringify(user));
            
            alert("Foto Profil Berhasil Diubah!");
            closeCropModal();
            checkLoginState(); // Refresh Tampilan
        } else {
            alert("Gagal upload foto: " + data.message);
        }
    } catch (e) {
        alert("Error koneksi server.");
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
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
    [boxLogin, boxReg, boxOtp, boxForgot, boxReset].forEach(b => { if(b) b.style.display = 'none'; });
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
/* --- REGISTER & OTP LOGIC (VALIDASI KETAT) --- */
/* ============================================== */

async function handleRegisterRequest(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const btn = document.getElementById('btnRegBtn');

    // 1. Validasi Username (Min 4 Karakter)
    if (!isValidUsername(username)) {
        return alert("Username minimal 4 karakter!");
    }

    // 2. Validasi Password (Min 9, 1 Upper, 1 Angka)
    if (!isValidPassword(password)) {
        return alert("Password harus minimal 9 karakter, mengandung huruf BESAR, dan Angka!");
    }

    // 3. Validasi Match Password
    if (password !== confirm) return alert("Password konfirmasi tidak cocok!");

    tempRegisterData = { username, email, phone, password };
    currentEmail = email;
    authMode = 'register';
    btn.innerText = "Mengecek Data..."; btn.disabled = true;

    try {
        // Kirim semua data (username, email, phone) untuk dicek duplikat
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, phone, type: 'register' })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('otpTextEmail').innerText = `Kode OTP dikirim ke ${email}`;
            switchAuth('otp');
        } else { 
            // Alert jika duplikat (Username/Email/HP sudah ada)
            alert(data.message || "Gagal mengirim OTP"); 
        }
    } catch (err) { alert("Gagal terhubung ke Server."); } 
    finally { btn.innerText = "DAFTAR"; btn.disabled = false; }
}

// Setup OTP Input: AUTO PASTE & KEYBOARD ANGKA (0-9 ONLY)
function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-field');
    inputs.forEach((input, index) => {
        
        // 1. Force Angka Saja saat diketik
        input.addEventListener('input', (e) => {
            // Hapus karakter selain angka
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            if (e.target.value !== "" && index < inputs.length - 1) inputs[index + 1].focus();
        });

        // 2. Handle Paste (Hanya ambil angka)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const cleanData = e.clipboardData.getData('text').replace(/\D/g, ''); // \D = non-digit
            
            if (cleanData) {
                const len = cleanData.length;
                for (let i = 0; i < len; i++) {
                    if (inputs[index + i]) {
                        inputs[index + i].value = cleanData[i];
                        if(index + i < inputs.length - 1) inputs[index + i + 1].focus();
                        else inputs[index + i].focus();
                    }
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === "" && index > 0) inputs[index - 1].focus();
        });
    });
}

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
                alert("Pendaftaran Berhasil! Silakan Login."); 
                // Kita minta user login manual agar flow lebih aman, atau auto login
                switchAuth('login');
                
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
            // Simpan Data User Lengkap (termasuk createdAt, pic, sellerLevel)
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
    
    // Validasi Password Baru juga
    if (!isValidPassword(newPass)) return alert("Password harus Min 9 char, 1 Huruf Besar, 1 Angka!");
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

// Buka Modal Ganti Password
function openChangePassModal() {
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    const overlay = document.getElementById('authOverlay');
    const modal = document.getElementById('changePassModal');
    overlay.classList.add('active');
    if(modal) modal.style.display = 'block';
}

// Handle Submit Ganti Password
async function handleChangePassword(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPass').value;
    const newPass = document.getElementById('newPass').value;
    
    // Validasi Password Baru
    if (!isValidPassword(newPass)) return alert("Password Baru: Min 9 char, 1 Besar, 1 Angka!");
    
    const btn = e.target.querySelector('button');
    const oriText = btn.innerText;
    btn.innerText = "Memproses..."; btn.disabled = true;

    setTimeout(() => {
        alert("Simulasi: Password Berhasil Diubah! Silakan login ulang.");
        logoutUser();
        btn.innerText = oriText; btn.disabled = false;
        closeAuthModal();
    }, 1500);
}
