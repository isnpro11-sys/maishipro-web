/* ============================================== */
/* --- KONFIGURASI BACKEND --- */
/* ============================================== */
const API_URL = "/api"; 
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

/* ============================================== */
/* --- KONFIGURASI DATA --- */
/* ============================================== */

// NAV_MENU: Hapus menu 'admin' dari sini agar tidak muncul di User UI
const NAV_MENU = [
    { id: 'home', icon: 'fa-home', label: 'Home' },
    { id: 'transaksi', icon: 'fa-exchange-alt', label: 'Transaksi' },
    { id: 'profile', type: 'profile', label: 'Profile' },
    { id: 'produk', icon: 'fa-shopping-basket', label: 'Produk' },
    { id: 'pengaturan', icon: 'fa-cog', label: 'Pengaturan' }
];

// DATA KATEGORI (Digunakan juga untuk Mapping URL Parameter)
const HOME_CATEGORIES = [
    {
        title: "Akun Game", icon: "fa-user-circle", colorClass: "icon-akun",
        items: [
            { id: 'akun-roblox', name: 'Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' },
            { id: 'akun-ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
            { id: 'akun-ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
            { id: 'akun-pubg', name: 'PUBG', img: 'https://api.deline.web.id/UXAYVjr3MP.jpg' },
            { id: 'akun-fc', name: 'EA Sports FC', img: 'https://api.deline.web.id/drNQO5aO9Z.jpg' }
        ]
    },
    {
        title: "Top Up Game", icon: "fa-gem", colorClass: "icon-topup",
        items: [
            { id: 'topup-ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
            { id: 'topup-ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
            { id: 'topup-roblox', name: 'Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' },
            { id: 'topup-pubg', name: 'PUBG Mobile', img: 'https://api.deline.web.id/UXAYVjr3MP.jpg' }
        ]
    },
    {
        title: "Lainnya", icon: "fa-layer-group", colorClass: "icon-lainnya",
        items: [
            { id: 'sewa-bot', name: 'Sewa Bot', img: 'https://api.deline.web.id/8ASC30F6zj.jpg' },
            { id: 'script', name: 'Script', img: 'https://api.deline.web.id/kP9sQzd1TU.jpg' },
            { id: 'joki-ml', name: 'Joki MLBB', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' }
        ]
    }
];

/* --- VARIABLES --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let cropper = null; 
let isAdminMode = false;

/* DOM Elements Global */
let authOverlay, boxLogin, boxReg, boxOtp, boxForgot, boxChangePass, boxAdminEdit, boxVerification;

/* ============================================== */
/* --- INIT: SETUP AWAL --- */
/* ============================================== */
document.addEventListener("DOMContentLoaded", async () => {
    injectCustomElements();
    initializeDomElements();
    initDynamicUI();
    
    await refreshUserData(); 
    checkLoginState();
    setupFileUploadListener();
    setupSliderSwipe();

    // --- PENTING: Jalankan Routing URL Parameter Terakhir ---
    handleUrlRouting(); 
});

/* ============================================== */
/* --- 1. HANDLE URL PARAMETER (?p=...) --- */
/* ============================================== */
function handleUrlRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const p = urlParams.get('p'); // Ambil value dari ?p=

    if (!p) return; // Jika tidak ada parameter, biarkan default

    // Cek apakah parameter adalah Tab Utama
    const mainTabs = ['home', 'transaksi', 'profile', 'produk', 'pengaturan'];
    if (mainTabs.includes(p)) {
        switchMainTab(p);
        return;
    }

    // Cek apakah parameter adalah Halaman Admin
    if (p === 'admin') {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && isAdmin(user.email)) {
            enableAdminMode();
        } else {
            showAlert("Anda bukan Admin", "Akses Ditolak");
            switchMainTab('home');
        }
        return;
    }

    // Cek apakah parameter adalah Item/Produk (Topup, Akun, dll)
    let foundItem = null;
    HOME_CATEGORIES.forEach(cat => {
        const item = cat.items.find(i => i.id === p);
        if (item) foundItem = item;
    });

    if (foundItem) {
        goToPage(foundItem.id, foundItem.name);
    } else {
        // Fallback jika ID halaman tidak ditemukan tapi ada parameter
        goToPage(p, 'Detail Produk'); 
    }
}

/* ============================================== */
/* --- 2. ADMIN & USER SEPARATION LOGIC --- */
/* ============================================== */

function isAdmin(email) { return ADMIN_EMAILS.includes(email); }

// Fungsi untuk masuk ke Tampilan Admin (Terpisah)
function enableAdminMode() {
    isAdminMode = true;
    document.body.classList.add('admin-view-active'); // CSS class untuk hide navbar user
    
    // Hide semua section user
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    // Show section admin
    const adminPage = document.getElementById('admin-page');
    if(adminPage) adminPage.classList.add('active');

    // Load tab pertama admin
    const firstMenu = document.querySelector('.admin-menu-item');
    if(firstMenu) loadAdminTab('users', firstMenu);

    // Tambahkan tombol keluar dari mode admin di header admin
    const adminHeader = document.querySelector('#admin-page .top-bar');
    if (adminHeader && !document.getElementById('btnExitAdmin')) {
        adminHeader.innerHTML += `<button id="btnExitAdmin" onclick="disableAdminMode()" style="background:#e74c3c; border:none; color:white; padding:5px 10px; border-radius:5px; font-size:12px; margin-left:auto;">Keluar Admin</button>`;
    }
}

// Fungsi kembali ke Tampilan User
function disableAdminMode() {
    isAdminMode = false;
    document.body.classList.remove('admin-view-active');
    switchMainTab('home');
}

/* ============================================== */
/* --- SYSTEM: INJECT STYLE & ALERT --- */
/* ============================================== */
function injectCustomElements() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* CSS KHUSUS ADMIN MODE */
        body.admin-view-active .bottom-navbar { display: none !important; } /* Hilangkan navbar bawah saat admin */
        body.admin-view-active .page-section { padding-bottom: 0 !important; }
        
        /* Alert & Loading Styles */
        .custom-alert-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99999; display: none; justify-content: center; align-items: center; backdrop-filter: blur(2px); animation: fadeIn 0.2s; }
        .custom-alert-box { background: #fff; width: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transform: scale(0.9); animation: popUp 0.3s forwards; }
        .custom-alert-header { background: #205081; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .custom-alert-body { padding: 25px 20px; text-align: center; color: #333; }
        .btn-alert-ok { width: 100%; padding: 12px; border: none; background: #f8fafc; color: #205081; font-weight: bold; cursor: pointer; border-top: 1px solid #eee; transition: 0.2s; }
        .btn-alert-ok:hover { background: #e0f2fe; }
        @keyframes popUp { to { transform: scale(1); } }
        .btn-loading { pointer-events: none; opacity: 0.7; }
    `;
    document.head.appendChild(style);
}

function initializeDomElements() {
    authOverlay = document.getElementById('authOverlay');
    boxLogin = document.getElementById('loginBox');
    boxReg = document.getElementById('registerBox');
    boxOtp = document.getElementById('otpBox');
    boxForgot = document.getElementById('forgotBox'); 
    boxChangePass = document.getElementById('changePassModal');
    boxAdminEdit = document.getElementById('adminEditUserModal');
    boxVerification = document.getElementById('verificationModal');
}

/* --- FUNGSI RENDER TAMPILAN (VISUAL) --- */

function initDynamicUI() {
    // 1. Render Kategori Game (User View)
    renderHomeCategories();
    
    // 2. Render Navbar Bawah (User View)
    // Cek apakah sedang mode admin? Jika iya, jangan render navbar
    if (!isAdminMode) {
        renderNavbar();
    }
}

function renderHomeCategories() {
    const container = document.getElementById('dynamic-category-container');
    if (!container) return;

    let html = '';

    // Loop data dari HOME_CATEGORIES (Parameter)
    HOME_CATEGORIES.forEach(cat => {
        // A. Buat Header Kategori (Judul & Icon)
        html += `
        <div class="category-card">
            <div class="category-header">
                <i class="fas ${cat.icon} ${cat.colorClass}"></i> ${cat.title}
            </div>
            <div class="cat-grid">`;
        
        // B. Buat Item Game (Looping Items)
        cat.items.forEach(item => {
            html += `
                <div class="cat-item" onclick="goToPage('${item.id}', '${item.name}')">
                    <img src="${item.img}" class="cat-img" alt="${item.name}">
                    <div class="cat-name">${item.name}</div>
                </div>`;
        });

        // C. Tutup Div
        html += `
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

/* --- LOGIKA PINDAH MODE USER <-> ADMIN --- */

// Masuk ke Mode Host/Admin
function enableAdminMode() {
    isAdminMode = true;
    
    // Tambahkan class CSS khusus ke body untuk memicu perubahan tampilan
    document.body.classList.add('admin-view-active'); 
    
    // Render ulang navbar (agar hilang)
    renderNavbar(); 

    // Paksa pindah ke halaman admin
    const adminPage = document.getElementById('admin-page');
    if(adminPage) adminPage.classList.add('active');

    // Load tab default admin
    loadAdminTab('users', document.querySelector('.admin-menu-item'));
}

// Kembali ke Mode User
function disableAdminMode() {
    isAdminMode = false;
    
    // Hapus class CSS admin
    document.body.classList.remove('admin-view-active');
    
    // Render ulang navbar (agar muncul kembali)
    renderNavbar();
    
    // Kembali ke home user
    switchMainTab('home');
}

function renderNavbar() {
    const navContainer = document.querySelector('.bottom-navbar');
    if (!navContainer) return;
    
    // Jangan render navbar jika sedang mode admin
    if (isAdminMode) {
        navContainer.style.display = 'none';
        return;
    } else {
        navContainer.style.display = 'flex';
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const activeTab = localStorage.getItem('activeTab') || 'home';

    let html = '';
    NAV_MENU.forEach(item => {
        const isActive = activeTab === item.id ? 'active' : '';
        if (item.type === 'profile') {
            let imgContent = `<img src="https://api.deline.web.id/76NssFHmcI.png">`; 
            if (user && user.profilePic) {
                imgContent = `<img src="${user.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else if (user && user.username) {
                imgContent = `<div style="width:100%; height:100%; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#205081; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
            }
            html += `<div class="nav-item center-item ${isActive}" id="nav-${item.id}" onclick="switchMainTab('${item.id}')"><div class="floating-circle">${imgContent}</div><span>${item.label}</span></div>`;
        } else {
            html += `<div class="nav-item ${isActive}" id="nav-${item.id}" onclick="switchMainTab('${item.id}')"><i class="fas ${item.icon}"></i><span>${item.label}</span></div>`;
        }
    });
    navContainer.innerHTML = html;
}

/* ============================================== */
/* --- HELPER FUNCTIONS --- */
/* ============================================== */
function showAlert(message, title = "Info") {
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertMsg').innerText = message;
    document.getElementById('customAlertModal').style.display = 'flex';
}
function closeAppAlert() { document.getElementById('customAlertModal').style.display = 'none'; }
function setLoading(btnId, isLoading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Loading...`;
        btn.classList.add('btn-loading');
    } else {
        btn.innerHTML = defaultText;
        btn.classList.remove('btn-loading');
    }
}
function formatDate(dateString) {
    if(!dateString) return "-";
    try { return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); } catch (e) { return dateString; }
}

/* ============================================== */
/* --- AUTH FLOW (Login, Register, OTP) --- */
/* ============================================== */
function openAuthModal(type) {
    authOverlay.classList.add('active');
    document.body.classList.add('lock-scroll');
    switchAuth(type);
}
function closeAuthModal() {
    authOverlay.classList.remove('active');
    document.body.classList.remove('lock-scroll');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
}
function switchAuth(type) {
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    if(type === 'login') boxLogin.style.display = 'block';
    else if(type === 'register') { boxReg.style.display = 'block'; authMode = 'register'; }
    else if(type === 'otp') { boxOtp.style.display = 'block'; }
    else if(type === 'forgot') { if(boxForgot) boxForgot.style.display = 'block'; }
}
function togglePass(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
}

// REGISTER
async function handleRegisterRequest(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;

    if(password !== confirm) return showAlert("Konfirmasi Password tidak cocok!", "Error");
    setLoading('btnRegBtn', true, "DAFTAR");
    tempRegisterData = { username, email, phone, password };

    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, phone, type: 'register' })
        });
        const data = await res.json();
        if(data.success) {
            showAlert(`Kode OTP dikirim ke ${email}`, "Berhasil");
            switchAuth('otp');
            document.getElementById('otpTextEmail').innerText = `Cek email: ${email}`;
        } else {
            showAlert(data.message || "Gagal Request OTP", "Gagal Daftar");
        }
    } catch(e){ showAlert("Gagal menghubungi server.", "Koneksi Error"); } 
    finally { setLoading('btnRegBtn', false, "DAFTAR"); }
}

// LOGIN
async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPass').value;
    setLoading('btnLoginBtn', true, "LOGIN");

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({loginInput, password})
        });
        const data = await res.json();
        if(data.success) {
            closeAuthModal();
            localStorage.setItem('user', JSON.stringify(data.userData));
            
            // Cek apakah admin
            if(isAdmin(data.userData.email)) {
                enableAdminMode();
                showAlert("Selamat Datang Admin", "Login Sukses");
            } else {
                checkLoginState();
                switchMainTab('home');
                showAlert("Berhasil Login", "Sukses");
            }
        } else {
            showAlert(data.message || "Username/Password Salah!", "Login Gagal");
        }
    } catch(e){ showAlert("Tidak dapat terhubung ke server.", "Koneksi Error"); } 
    finally { setLoading('btnLoginBtn', false, "LOGIN"); }
}

function checkAutoSubmitOtp(el) {
    const val = el.value.toString();
    if(val.length > 6) el.value = val.slice(0, 6);
    if(el.value.length === 6) { el.blur(); handleVerifyOtp(); }
}

async function handleVerifyOtp() {
    const otp = document.getElementById('otpInputLong').value;
    if (!otp || otp.length < 6) return showAlert("Masukkan kode OTP!", "Error");
    setLoading('btnVerifyBtn', true, "VERIFIKASI");

    try {
        const res = await fetch(`${API_URL}/register-verify`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({...tempRegisterData, otp})
        });
        const data = await res.json();
        if(data.success) {
            showAlert("Pendaftaran Berhasil, Silakan Login", "Sukses");
            switchAuth('login');
        } else {
            showAlert("OTP Salah/Kadaluarsa", "Gagal");
        }
    } catch(e){ showAlert("Error System", "Error"); }
    finally { setLoading('btnVerifyBtn', false, "VERIFIKASI"); }
}

async function refreshUserData() {
    const local = JSON.parse(localStorage.getItem("user"));
    if (!local) return;
    try {
        const res = await fetch(`${API_URL}/get-user`, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ email: local.email })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem("user", JSON.stringify(data.userData));
            if(!isAdminMode) renderNavbar(); 
        }
    } catch (e) { console.error(e); }
}

/* ============================================== */
/* --- NAVIGATION & UI --- */
/* ============================================== */
const detailSection = document.getElementById('detail-page');
const pageTitle = document.getElementById('page-title');

function switchMainTab(tabName) {
    // Jika user biasa mencoba akses admin, tolak
    if(tabName === 'admin' && !isAdminMode) return;

    localStorage.setItem('activeTab', tabName);
    detailSection.classList.remove('active');
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');

    if(!isAdminMode) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const activeNav = document.getElementById('nav-' + tabName);
        if (activeNav) activeNav.classList.add('active');
    }

    // Update URL agar bisa di-bookmark (Contoh: ?p=transaksi)
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?p=${tabName}`;
    window.history.pushState({path: newUrl}, '', newUrl);
}

function goToPage(pageId, titleName) {
    localStorage.setItem('currentTitle', titleName);
    
    // Set parameter URL (Contoh: ?p=topup-ml)
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?p=${pageId}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    renderPage(pageId, titleName);
}

function renderPage(pageId, titleName) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    detailSection.classList.add('active');
    window.scrollTo(0, 0);
    pageTitle.innerText = titleName;
}

function goBack() {
    // Kembali ke URL bersih / Home
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({path: newUrl}, '', newUrl);
    
    detailSection.classList.remove('active');
    switchMainTab(localStorage.getItem('activeTab') || 'home');
}

/* ============================================== */
/* --- LOGIN STATE CHECK --- */
/* ============================================== */
function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');

    if (userSession) {
        const user = JSON.parse(userSession);
        
        // PENTING: Cek Admin di sini
        if (isAdmin(user.email)) {
            // Jika user adalah admin, tapi belum dalam mode admin (misal baru refresh)
            // Kita bisa tawarkan atau auto redirect. Di sini kita auto-set UI
            // Tapi biarkan switchMainTab menangani tampilannya
            const params = new URLSearchParams(window.location.search);
            if(params.get('p') === 'admin') enableAdminMode();
        }

        // Header User (Kanan Atas)
        let headerAvatar = `<div style="width:35px; height:35px; border-radius:50%; background:white; color:#205081; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
        if (user.profilePic) headerAvatar = `<img src="${user.profilePic}" class="profile-pic">`;
        headerAuthArea.innerHTML = `<div class="header-user-area" onclick="switchMainTab('profile')"><span class="user-name-header">${user.username}</span>${headerAvatar}</div>`;
        
        renderAuthPages(true, user);
        if(!isAdminMode) renderNavbar();

    } else {
        headerAuthArea.innerHTML = `<button class="btn-login-header" onclick="openAuthModal('login')"><i class="fas fa-user-circle"></i> Masuk</button>`;
        renderAuthPages(false, null);
        if(!isAdminMode) renderNavbar();
    }
}

function renderAuthPages(isLoggedIn, user) {
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    const loginPromptHTML = `
        <div class="auth-required-state">
            <i class="fas fa-lock lock-icon"></i><p>Silakan Login untuk mengakses halaman ini.</p>
            <button class="btn-center-login" onclick="openAuthModal('login')"><i class="fas fa-sign-in-alt"></i> LOGIN</button>
        </div>`;

    if (!isLoggedIn) {
        if(profileContent) profileContent.innerHTML = loginPromptHTML;
        if(settingsContent) settingsContent.innerHTML = loginPromptHTML;
    } else {
        // Render Profile & Settings (Sama seperti kode asli Anda, dipersingkat di sini)
        const avatarDisplay = user.profilePic ? `<img src="${user.profilePic}" class="avatar-circle-display" style="border:none;">` : `<div class="avatar-circle-display">${user.username.charAt(0).toUpperCase()}</div>`;
        
        if(settingsContent) {
            settingsContent.innerHTML = `
                <div class="settings-page-wrapper">
                    <div class="profile-header-container">
                        <div class="avatar-wrapper">${avatarDisplay}<div class="camera-badge" onclick="triggerFileUpload()"><i class="fas fa-camera"></i></div></div>
                        <h3 style="margin-top:10px; color:#205081;">${user.username}</h3>
                        <p style="font-size:12px; color:#666;">${user.email}</p>
                    </div>
                     <div class="logout-area" style="padding: 0 10px;">
                        ${isAdmin(user.email) ? `<button class="btn-logout-bottom" onclick="enableAdminMode()" style="background:#205081; color:white; border:none; margin-bottom:10px;"><i class="fas fa-user-shield"></i> DASHBOARD ADMIN</button>` : ''}
                        <button class="btn-logout-bottom" onclick="logoutUser()"><i class="fas fa-sign-out-alt"></i> KELUAR AKUN</button>
                    </div>
                </div>`;
        }
        if(profileContent) {
            profileContent.innerHTML = `<div class="profile-view-header"><div class="profile-view-avatar">${avatarDisplay}</div><div style="color:white; margin-top:10px; font-weight:bold;">${user.username}</div></div>`;
        }
    }
}

function logoutUser() {
    localStorage.removeItem('user');
    isAdminMode = false;
    document.body.classList.remove('admin-view-active');
    checkLoginState();
    switchMainTab('home');
    showAlert("Berhasil Logout", "Info");
}

/* ============================================== */
/* --- ADMIN DASHBOARD FUNCTIONALITY --- */
/* ============================================== */
function loadAdminTab(tab, element) {
    document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');

    const container = document.getElementById('admin-content-area');
    container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    if (tab === 'users') fetchAdminUsers();
    else if (tab === 'verif') fetchAdminVerifications();
    else container.innerHTML = `<div class="empty-state-placeholder"><p>Menu ${tab} kosong.</p></div>`;
}

/* ============================================== */
/* --- LOGIKA LENGKAP ADMIN DASHBOARD --- */
/* ============================================== */

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        renderAdminUserList(data.users);
    } catch (e) { 
        document.getElementById('admin-content-area').innerText = "Gagal memuat data user."; 
    }
}

function renderAdminUserList(users) {
    const container = document.getElementById('admin-content-area');
    if(!users || users.length === 0) { container.innerHTML = "<p>User kosong.</p>"; return; }

    let html = `<div class="admin-list-container">`;
    users.forEach(u => {
        const uniqueId = `user_detail_${u._id}`;
        html += `
            <div class="admin-acc-item">
                <div class="admin-acc-header" onclick="toggleAccordion('${uniqueId}')">
                    <span class="acc-title"><i class="fas fa-user"></i> ${u.username}</span>
                    <i class="fas fa-chevron-down acc-icon"></i>
                </div>
                <div id="${uniqueId}" class="admin-acc-body" style="display:none;">
                    <div class="acc-row"><span>Email:</span> <b>${u.email}</b></div>
                    <div class="acc-row"><span>No HP:</span> <b>${u.phone}</b></div>
                    <div class="acc-row"><span>Pass:</span> <b style="color:#e74c3c;">${u.password}</b></div>
                    <div class="acc-row"><span>Status:</span> <b>${u.verificationStatus || 'unverified'}</b></div>
                    
                    <div class="acc-actions">
                         <button class="btn-acc-action edit" onclick='openAdminEditModal(${JSON.stringify(u)})'>Edit</button>
                         <button class="btn-acc-action delete" onclick="deleteUser('${u._id}', '${u.username}')">Hapus</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

async function fetchAdminVerifications() {
    try {
        const res = await fetch(`${API_URL}/admin/verifications`); 
        const data = await res.json();
        renderAdminVerifList(data.users);
    } catch (e) { 
        document.getElementById('admin-content-area').innerText = "Gagal memuat data verifikasi."; 
    }
}

function renderAdminVerifList(users) {
    const container = document.getElementById('admin-content-area');
    if(!users || users.length === 0) { 
        container.innerHTML = `<div class="empty-state-placeholder"><i class="fas fa-check-double"></i><p>Tidak ada permintaan verifikasi.</p></div>`; 
        return; 
    }

    let html = `<div class="admin-list-container">`;
    users.forEach(u => {
        const uniqueId = `verif_detail_${u._id}`;
        html += `
            <div class="admin-acc-item warning-border">
                <div class="admin-acc-header" onclick="toggleAccordion('${uniqueId}')">
                    <span class="acc-title"><i class="fas fa-clock"></i> ${u.username}</span>
                    <i class="fas fa-chevron-down acc-icon"></i>
                </div>
                <div id="${uniqueId}" class="admin-acc-body" style="display:none;">
                    <div class="acc-row"><span>Email:</span> <b>${u.email}</b></div>
                    <div class="acc-row"><span>No HP:</span> <b>${u.phone}</b></div>
                    <div class="acc-actions">
                         <button class="btn-acc-action approve" onclick="adminVerifyAction('${u._id}', 'approve')">Terima</button>
                         <button class="btn-acc-action reject" onclick="adminVerifyAction('${u._id}', 'reject')">Tolak</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    if(el.style.display === 'none') el.style.display = 'block';
    else el.style.display = 'none';
}

async function adminVerifyAction(userId, action) {
    if(!confirm(`Yakin ingin ${action === 'approve' ? 'Menerima' : 'Menolak'} verifikasi ini?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/verify-action`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, action })
        });
        const data = await res.json();
        if(data.success) { showAlert(data.message, "Info"); fetchAdminVerifications(); } 
        else showAlert("Gagal.", "Error");
    } catch(e) { showAlert("Error Server", "Error"); }
}

async function deleteUser(id, name) {
    if(!confirm(`Hapus user ${name}?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
            fetchAdminUsers();
            showAlert("User berhasil dihapus", "Sukses");
        }
    } catch(e){ showAlert("Gagal menghapus user", "Error"); }
}

function openAdminEditModal(user) {
    authOverlay.classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    
    // Pastikan elemen boxAdminEdit sudah terdefinisi di init
    const modal = document.getElementById('adminEditUserModal');
    if(modal) {
        modal.style.display='block';
        document.getElementById('editUserId').value = user._id;
        document.getElementById('editUserUsername').value = user.username;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserPhone').value = user.phone;
        document.getElementById('editUserPass').value = user.password;
    }
}

function closeAdminEditModal() { 
    authOverlay.classList.remove('active'); 
    document.getElementById('adminEditUserModal').style.display = 'none';
}

async function handleAdminUpdateUser(e) {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const payload = {
        username: document.getElementById('editUserUsername').value,
        email: document.getElementById('editUserEmail').value,
        phone: document.getElementById('editUserPhone').value,
        password: document.getElementById('editUserPass').value
    };
    
    setLoading('btnAdminSave', true, "SIMPAN PERUBAHAN");
    
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        
        if(res.ok) {
            closeAdminEditModal();
            fetchAdminUsers();
            showAlert("Data user berhasil diupdate", "Sukses");
        } else {
            showAlert("Gagal update user", "Error");
        }
    } catch(e) { showAlert("Error Server saat update", "Error"); }
    finally { setLoading('btnAdminSave', false, "SIMPAN PERUBAHAN"); }
}

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        renderAdminUserList(data.users);
    } catch (e) { document.getElementById('admin-content-area').innerHTML = "Error loading users."; }
}

function renderAdminUserList(users) {
    const container = document.getElementById('admin-content-area');
    if(!users || users.length === 0) { container.innerHTML = "<p>User kosong.</p>"; return; }
    let html = `<div class="admin-list-container">`;
    users.forEach(u => {
        html += `<div class="admin-acc-item"><div class="admin-acc-header"><span>${u.username}</span><small>${u.email}</small></div></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}
async function fetchAdminVerifications() { /* Logic Fetch Verif */ document.getElementById('admin-content-area').innerHTML = "List Verifikasi Kosong"; }

/* ============================================== */
/* --- UTILS: CROPPER & SLIDER --- */
/* ============================================== */
function setupSliderSwipe() {
    const wrapper = document.getElementById('slider-wrapper');
    if(!wrapper) return;
    let idx = 0;
    setInterval(() => {
        idx = (idx + 1) % 3;
        wrapper.style.transform = `translateX(-${idx * 100}%)`;
    }, 4000);
}

function setupFileUploadListener() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('imageToCrop').src = event.target.result;
                    document.getElementById('cropModal').style.display = 'flex';
                    if(cropper) cropper.destroy();
                    cropper = new Cropper(document.getElementById('imageToCrop'), { aspectRatio: 1, viewMode: 1 });
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }
}
function triggerFileUpload() { document.getElementById('fileInput').click(); }
function closeCropModal() { document.getElementById('cropModal').style.display = 'none'; if(cropper) cropper.destroy(); }
function saveCropImage() {
    if(!cropper) return;
    const base64Image = cropper.getCroppedCanvas({ width: 300, height: 300 }).toDataURL('image/jpeg', 0.85);
    updateProfilePicOnServer(base64Image);
}
async function updateProfilePicOnServer(base64Image) {
    const user = JSON.parse(localStorage.getItem('user'));
    try {
        const res = await fetch(`${API_URL}/update-pic`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, imageBase64: base64Image })
        });
        if((await res.json()).success) {
            user.profilePic = base64Image;
            localStorage.setItem('user', JSON.stringify(user));
            closeCropModal(); 
            if(isAdminMode) {
                 // update UI Admin avatar logic here
            } else {
                 checkLoginState(); // refresh User UI
            }
        }
    } catch (e) {}
}
