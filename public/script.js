// script.js
const API_URL = "/api"; 
const ADMIN_EMAILS = ["owner@maishipro.com", "admin@gmail.com", "ilyassyuhada00@gmail.com"]; 

let tempRegisterData = {}; 
let tempVerificationEmail = ''; 
let authMode = 'register'; 
let cropper = null; 

/* DOM Elements */
const authOverlay = document.getElementById('authOverlay');
const boxLogin = document.getElementById('loginBox');
const boxReg = document.getElementById('registerBox');
const boxOtp = document.getElementById('otpBox');

// INIT
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    setupOtpInputs(); 
    setupFileUploadListener(); 
    setupSliderSwipe(); 

    const hash = window.location.hash.substring(1);
    if (hash && hash !== "") {
        renderPage(hash, null);
    } else {
        const savedTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(savedTab);
    }
});

// Helper: Is Admin
function isAdmin(email) { return ADMIN_EMAILS.includes(email); }

// Helper: Format Date
function formatDate(dateString) {
    if(!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
}

// Navigation Functions
function switchMainTab(tabName) {
    localStorage.setItem('activeTab', tabName);
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById(tabName + '-page')?.classList.add('active');
    document.getElementById('nav-' + tabName)?.classList.add('active');

    // Reset Admin Tab to Users if entering Admin
    if(tabName === 'admin') {
        const activeItem = document.querySelector('.admin-menu-item.active');
        if(!activeItem) loadAdminTab('users', document.querySelector('.admin-menu-item'));
        else loadAdminTab(activeItem.innerText.includes('User') ? 'users' : 'verif', activeItem);
    }
}

function goToPage(pageId, titleName) {
    window.location.hash = pageId;
    localStorage.setItem('currentTitle', titleName);
    renderPage(pageId, titleName);
}

function renderPage(pageId, titleName) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById('detail-page').classList.add('active');
    document.getElementById('page-title').innerText = titleName || 'Detail';
    window.scrollTo(0,0);
}

function goBack() {
    document.getElementById('detail-page').classList.remove('active');
    switchMainTab(localStorage.getItem('activeTab') || 'home');
    history.pushState("", document.title, window.location.pathname + window.location.search);
}

// Slider
function setupSliderSwipe() {
    // (Kode slider sama seperti sebelumnya)
    const wrapper = document.getElementById('slider-wrapper');
    if(!wrapper) return;
    let currentIndex = 0;
    setInterval(() => {
        currentIndex = (currentIndex + 1) % 3;
        wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
        document.querySelectorAll('.dot').forEach((d, i) => {
            d.classList.toggle('active', i === currentIndex);
        });
    }, 4000);
}

/* ============================================== */
/* --- AUTH & LOGIN STATE LOGIC --- */
/* ============================================== */

function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');

    if (userSession) {
        const user = JSON.parse(userSession);
        const isOwner = isAdmin(user.email);
        
        let headerAvatar = user.profilePic 
            ? `<img src="${user.profilePic}" class="profile-pic">`
            : `<div style="width:35px;height:35px;border-radius:50%;background:white;color:#205081;display:flex;align-items:center;justify-content:center;font-weight:bold;">${user.username.charAt(0).toUpperCase()}</div>`;

        headerAuthArea.innerHTML = `
            <div class="header-user-area" onclick="switchMainTab('profile')">
                <span class="user-name-header">${user.username}</span>
                ${headerAvatar}
            </div>
        `;
        renderAuthPages(true, user, isOwner);
        document.getElementById('nav-admin').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('nav-transaksi').style.display = isOwner ? 'none' : 'flex';
    } else {
        headerAuthArea.innerHTML = `<button class="btn-login-header" onclick="openAuthModal('login')"><i class="fas fa-user-circle"></i> Masuk</button>`;
        renderAuthPages(false, null, false);
        document.getElementById('nav-admin').style.display = 'none';
    }
}

/* ============================================== */
/* --- SETTINGS PAGE RENDER LOGIC (CORE) --- */
/* ============================================== */

function renderAuthPages(isLoggedIn, user, isOwner) {
    const settingsContent = document.getElementById('pengaturan-content');
    
    if (!isLoggedIn) {
        settingsContent.innerHTML = `<div class="auth-required-state"><p>Silakan Login dulu.</p></div>`;
        return;
    }

    // --- LOGIKA STATUS VERIFIKASI ---
    const vStatus = user.verificationStatus || 'unverified'; // unverified, pending, verified, rejected
    
    let statusBoxHTML = '';
    let isLocked = false;
    let bottomVerifyArea = '';

    if (vStatus === 'verified') {
        // HIJAU: Terverifikasi
        statusBoxHTML = `<div class="status-box status-green">TERVERIFIKASI <i class="fas fa-check-circle"></i></div>`;
        isLocked = true; // Kunci input permanen
        // Area bawah password: Teks saja
        bottomVerifyArea = `<span class="verify-status-text done">Akun Terverifikasi</span>`;
    } else if (vStatus === 'pending') {
        // ORANYE: Proses
        statusBoxHTML = `<div class="status-box status-orange">PROSES VERIFIKASI <i class="fas fa-clock"></i></div>`;
        isLocked = true; // Kunci input saat menunggu
        // Area bawah password: Teks Proses
        bottomVerifyArea = `<span class="verify-status-text process">Proses Verifikasi</span>`;
    } else if (vStatus === 'rejected') {
         // MERAH: Ditolak (Bisa coba lagi)
        statusBoxHTML = `<div class="status-box status-red">DITOLAK VERIFIKASI <i class="fas fa-times-circle"></i></div>`;
        isLocked = false; 
        bottomVerifyArea = `
            <button class="btn-verify-trigger" onclick="openVerificationModal()">Coba Verifikasi Lagi</button>
            <span class="verify-status-text">Ditolak</span>
        `;
    } else {
        // MERAH: Belum Verifikasi
        statusBoxHTML = `<div class="status-box status-red">BELUM TERVERIFIKASI <i class="fas fa-exclamation-circle"></i></div>`;
        isLocked = false; 
        bottomVerifyArea = `
            <button class="btn-verify-trigger" onclick="openVerificationModal()">Verifikasi</button>
            <span class="verify-status-text">Belum Verifikasi</span>
        `;
    }

    const inputClass = isLocked ? 'form-input-styled permanent' : 'form-input-styled';
    const readOnlyAttr = isLocked ? 'readonly' : '';
    
    const avatarDisplay = user.profilePic 
        ? `<img src="${user.profilePic}" class="avatar-circle-display" style="border:none;">`
        : `<div class="avatar-circle-display">${user.username.charAt(0).toUpperCase()}</div>`;

    settingsContent.innerHTML = `
        <div class="settings-page-wrapper">
            <div>
                <div class="profile-header-container">
                    <div class="avatar-wrapper">
                        ${avatarDisplay}
                        <div class="camera-badge" onclick="triggerFileUpload()"><i class="fas fa-camera"></i></div>
                    </div>
                    <div style="font-size:12px; color:#666; margin-top:10px;">
                        Terdaftar: <b>${formatDate(user.createdAt)}</b>
                    </div>
                </div>

                <!-- KOTAK STATUS HIJAU/MERAH -->
                <div style="padding: 0 10px;">${statusBoxHTML}</div>

                <div class="form-container" style="padding: 0 10px;">
                    <div class="form-group-styled">
                        <label class="form-label">Username</label>
                        <input type="text" class="${inputClass}" value="${user.username}" ${readOnlyAttr}>
                    </div>

                    <div class="form-group-styled">
                        <label class="form-label">Email</label>
                        <input type="text" class="${inputClass}" value="${user.email}" ${readOnlyAttr}>
                    </div>

                    <div class="form-group-styled">
                        <label class="form-label">Nomor WhatsApp</label>
                        <input type="text" class="${inputClass}" value="${user.phone}" ${readOnlyAttr}>
                    </div>

                    <div class="form-group-styled">
                        <label class="form-label">Password</label>
                        <input type="text" class="${inputClass}" value="${user.password}" ${readOnlyAttr}>
                    </div>

                    <!-- AREA TOMBOL VERIFIKASI -->
                    <div class="verification-row">
                        ${bottomVerifyArea}
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

/* ============================================== */
/* --- VERIFICATION FLOW LOGIC --- */
/* ============================================== */

// 1. Buka Modal Isi Data
function openVerificationModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('authOverlay').classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    document.getElementById('verificationRequestModal').style.display = 'block';

    // Pre-fill data user saat ini
    document.getElementById('verifUser').value = user.username;
    document.getElementById('verifEmail').value = user.email;
    document.getElementById('verifPhone').value = user.phone;
}

// 2. Submit Data Verifikasi -> Request OTP
async function handleVerificationSubmit(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const btn = document.getElementById('btnVerifRequest');
    
    const username = document.getElementById('verifUser').value;
    const email = document.getElementById('verifEmail').value;
    const phone = document.getElementById('verifPhone').value;

    btn.innerText = "Mengirim Kode..."; btn.disabled = true;

    try {
        // Kirim request OTP tipe verification
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userId: user._id,
                email: email, 
                username: username,
                phone: phone,
                password: user.password, // Pass current password for re-saving logic
                type: 'verification'
            })
        });
        const data = await res.json();
        
        if (data.success) {
            tempVerificationEmail = email; // Simpan email target OTP
            document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
            document.getElementById('verificationOtpModal').style.display = 'block';
            document.getElementById('verifOtpEmailText').innerText = `Kode dikirim ke: ${email}`;
        } else {
            alert(data.message);
        }
    } catch (e) { alert("Gagal koneksi server."); }
    finally { btn.innerText = "KONFIRMASI DATA"; btn.disabled = false; }
}

// 3. Submit OTP Verifikasi
async function handleVerificationOtpSubmit() {
    const otp = document.getElementById('verifOtpInput').value;
    const btn = document.getElementById('btnVerifFinal');
    const user = JSON.parse(localStorage.getItem('user'));

    if(otp.length < 6) return alert("Masukkan kode 6 digit");
    btn.innerText = "Memproses..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/verification-confirm`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userId: user._id,
                otp: otp,
                email: tempVerificationEmail
            })
        });
        const data = await res.json();

        if (data.success) {
            // Update local storage dengan data baru & status pending
            localStorage.setItem('user', JSON.stringify(data.user));
            alert("Permintaan dikirim! Status kini: Proses Verifikasi.");
            closeAuthModal();
            checkLoginState(); // Re-render Settings UI
        } else {
            alert(data.message);
        }
    } catch (e) { alert("Error Server"); }
    finally { btn.innerText = "VERIFIKASI SEKARANG"; btn.disabled = false; }
}

/* ============================================== */
/* --- ADMIN DASHBOARD LOGIC (ACCORDION) --- */
/* ============================================== */

async function loadAdminTab(tab, element) {
    if(element) {
        document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }

    const container = document.getElementById('admin-content-area');
    container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    if (tab === 'users') {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        renderAdminUserAccordion(data.users || []);
    } else if (tab === 'verif') {
        const res = await fetch(`${API_URL}/admin/verifications`);
        const data = await res.json();
        renderAdminVerificationList(data.users || []);
    } else {
        container.innerHTML = `<p style="text-align:center; margin-top:20px;">Fitur belum tersedia.</p>`;
    }
}

// Render Users as Accordion (Slide Down)
function renderAdminUserAccordion(users) {
    const container = document.getElementById('admin-content-area');
    if (users.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px;">User kosong.</p>`;
        return;
    }

    let html = `<div style="padding:15px;">`;
    users.forEach(u => {
        const statusColor = u.verificationStatus === 'verified' ? 'green' : (u.verificationStatus === 'pending' ? 'orange' : 'red');
        const statusIcon = u.verificationStatus === 'verified' ? 'check-circle' : 'times-circle';

        html += `
            <div class="user-accordion-item" onclick="toggleAccordion(this)">
                <div class="accordion-header">
                    <span>${u.username} <i class="fas fa-${statusIcon}" style="color:${statusColor}; font-size:10px; margin-left:5px;"></i></span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="accordion-content">
                    <div class="acc-details">
                        <div class="acc-row"><span class="acc-label">Email</span><span class="acc-val">${u.email}</span></div>
                        <div class="acc-row"><span class="acc-label">No WA</span><span class="acc-val">${u.phone}</span></div>
                        <div class="acc-row"><span class="acc-label">Password</span><span class="acc-val" style="color:#e74c3c;">${u.password}</span></div>
                        <div class="acc-row"><span class="acc-label">Status</span><span class="acc-val" style="color:${statusColor};">${u.verificationStatus.toUpperCase()}</span></div>
                        
                        <div class="admin-card-actions">
                            <button class="btn-admin-action btn-edit-user" onclick='event.stopPropagation(); openAdminEditModal(${JSON.stringify(u)})'>Edit</button>
                            <button class="btn-admin-action btn-del-user" onclick="event.stopPropagation(); deleteUser('${u._id}', '${u.username}')">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function toggleAccordion(element) {
    element.classList.toggle('active');
}

// Render Verification Requests
function renderAdminVerificationList(users) {
    const container = document.getElementById('admin-content-area');
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state-placeholder">
                <i class="fas fa-check-double" style="font-size: 40px; margin-bottom: 15px; color:#ccc;"></i>
                <p>Tidak ada permintaan verifikasi.</p>
            </div>`;
        return;
    }

    let html = `<div style="padding:15px;">`;
    users.forEach(u => {
        html += `
            <div class="verif-card">
                <div style="font-weight:bold; font-size:14px; margin-bottom:5px;">${u.username}</div>
                <div style="font-size:12px; color:#666; margin-bottom:2px;">${u.email}</div>
                <div style="font-size:12px; color:#666;">${u.phone}</div>
                
                <div class="verif-actions">
                    <button class="btn-accept" onclick="processVerification('${u._id}', 'approve')">TERIMA</button>
                    <button class="btn-reject" onclick="processVerification('${u._id}', 'reject')">TOLAK</button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

async function processVerification(userId, action) {
    if(!confirm(`Yakin ingin ${action === 'approve' ? 'Menerima' : 'Menolak'} user ini?`)) return;

    try {
        const res = await fetch(`${API_URL}/admin/verification-action`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, action })
        });
        const data = await res.json();
        
        if (data.success) {
            alert(data.message);
            loadAdminTab('verif'); // Refresh
        } else {
            alert(data.message);
        }
    } catch(e) { alert("Error Server"); }
}

/* ============================================== */
/* --- AUTH MODAL (LOGIN/REGISTER) --- */
/* ============================================== */

function openAuthModal(type) {
    authOverlay.classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') boxReg.style.display = 'block';
}

function closeAuthModal() {
    authOverlay.classList.remove('active');
}

function switchAuth(type) {
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') boxReg.style.display = 'block';
}

function togglePass(id, icon) {
    const input = document.getElementById(id);
    if(input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLoginBtn');

    btn.innerText = "Loading..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginInput, password })
        });
        const data = await res.json();
        if (data.success) {
            closeAuthModal();
            localStorage.setItem('user', JSON.stringify(data.userData));
            
            if (isAdmin(data.userData.email) || data.userData.role === 'Admin') {
                switchMainTab('admin'); 
            } else {
                switchMainTab('home');
            }
            checkLoginState(); 
        } else {
            alert(data.message || "Login Gagal");
        }
    } catch (err) { alert("Error Server."); }
    finally { btn.innerText = "LOGIN"; btn.disabled = false; }
}

async function handleRegisterRequest(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const btn = document.getElementById('btnRegBtn');

    tempRegisterData = { username, email, phone, password };
    btn.innerText = "Processing..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, phone, type: 'register' })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('otpTextEmail').innerText = `Kode OTP ke: ${email}`;
            document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
            document.getElementById('otpBox').style.display = 'block';
        } else { alert(data.message); }
    } catch (err) { alert("Error Server"); } 
    finally { btn.innerText = "DAFTAR"; btn.disabled = false; }
}

async function handleVerifyOtp() {
    const otp = document.querySelector('.otp-field').value;
    // (Logika verifikasi register tetap sama, panggil API /register-verify)
    try {
        const res = await fetch(`${API_URL}/register-verify`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ otp: otp, email: tempRegisterData.email })
        });
        const data = await res.json();
        if(data.success) { alert("Berhasil!"); switchAuth('login'); }
        else { alert("OTP Salah"); }
    } catch(e) {}
}

function setupOtpInputs() {
    // Basic OTP input helper
}

function logoutUser() {
    localStorage.removeItem('user');
    checkLoginState();
    switchMainTab('home');
}