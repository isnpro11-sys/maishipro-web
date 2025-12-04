/* ============================================== */
/* --- 1. KONFIGURASI & VARIABEL GLOBAL --- */
/* ============================================== */
const API_URL = "/api"; 
// Masukkan email admin di sini
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

/* --- VARIABLES STATE --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let currentEmail = ''; 
let cropper = null; 
let productImages = []; // Menyimpan array base64 foto produk

/* DOM Elements Global */
let authOverlay, boxLogin, boxReg, boxOtp, boxForgot, boxChangePass, boxAdminEdit, boxVerification, boxAddProduct;

/* ============================================== */
/* --- 2. INIT: SETUP AWAL --- */
/* ============================================== */
document.addEventListener("DOMContentLoaded", async () => {
    injectCustomElements();
    initializeDomElements();

    // 1. Jalankan Navigasi DULUAN agar tampilan langsung pindah sesuai URL
    handleUrlNavigation(); 

    // Setup UI components
    setupFileUploadListener();
    setupSliderSwipe();
    
    // 2. Ambil data user terbaru (Async)
    await refreshUserData(); 

    // 3. Update UI berdasarkan status login
    checkLoginState(); 
    
    // 4. Render kategori home
    initDynamicUI();
});

/* ============================================== */
/* --- 3. DATA KATEGORI & NAVBAR --- */
/* ============================================== */

const NAV_MENU = [
    { id: 'home', icon: 'fa-home', label: 'Home' },
    { id: 'transaksi', icon: 'fa-exchange-alt', label: 'Transaksi' },
    { id: 'admin', icon: 'fa-font', label: 'Admin', role: 'admin' }, 
    { id: 'profile', type: 'profile', label: 'Profile' },
    { id: 'produk', icon: 'fa-shopping-basket', label: 'Produk' },
    { id: 'pengaturan', icon: 'fa-cog', label: 'Pengaturan' }
];

const HOME_CATEGORIES = [
    {
        title: "Akun Game",
        icon: "fa-user-circle",
        colorClass: "icon-akun",
        items: [
            { id: 'akun-roblox', name: 'Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' },
            { id: 'akun-ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
            { id: 'akun-ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
            { id: 'akun-pubg', name: 'PUBG', img: 'https://api.deline.web.id/UXAYVjr3MP.jpg' },
            { id: 'akun-fc', name: 'EA Sports FC', img: 'https://api.deline.web.id/drNQO5aO9Z.jpg' }
        ]
    },
    {
        title: "Top Up Game",
        icon: "fa-gem",
        colorClass: "icon-topup",
        items: [
            { id: 'topup-ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
            { id: 'topup-ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
            { id: 'topup-roblox', name: 'Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' },
            { id: 'topup-pubg', name: 'PUBG Mobile', img: 'https://api.deline.web.id/UXAYVjr3MP.jpg' }
        ]
    },
    {
        title: "Joki Game",
        icon: "fa-gamepad",
        colorClass: "icon-joki",
        items: [
            { id: 'joki-ml', name: 'Joki MLBB', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
            { id: 'joki-ff', name: 'Joki FF', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
            { id: 'joki-roblox', name: 'Joki Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' }
        ]
    },
    {
        title: "Lainnya",
        icon: "fa-layer-group",
        colorClass: "icon-lainnya",
        items: [
            { id: 'sewa-bot', name: 'Sewa Bot', img: 'https://api.deline.web.id/8ASC30F6zj.jpg' },
            { id: 'script', name: 'Script', img: 'https://api.deline.web.id/kP9sQzd1TU.jpg' },
            { id: 'apk-premium', name: 'Apk Premium', img: 'https://api.deline.web.id/Lunp2IR8bG.jpg' },
            { id: 'jasa-web', name: 'Jasa Web', img: 'https://api.deline.web.id/OWtCG5ldGU.jpg' },
            { id: 'pulsa', name: 'Pulsa', img: 'https://api.deline.web.id/MH25SGMbc9.jpg' }
        ]
    }
];

/* ============================================== */
/* --- 4. UI RENDER FUNCTIONS --- */
/* ============================================== */

function initDynamicUI() {
    renderNavbar();
    renderHomeCategories();
}

function renderNavbar() {
    const navContainer = document.querySelector('.bottom-navbar');
    if (!navContainer) return;

    const user = JSON.parse(localStorage.getItem('user'));
    const isOwner = user && isAdmin(user.email);

    let html = '';
    
    NAV_MENU.forEach(item => {
        if (item.id === 'transaksi' && isOwner) return;
        if (item.role === 'admin' && !isOwner) return;

        if (item.type === 'profile') {
            const profileImgSrc = (user && user.profilePic) ? user.profilePic : 'https://api.deline.web.id/76NssFHmcI.png';
            html += `
            <div class="nav-item center-item" id="nav-${item.id}" onclick="switchMainTab('${item.id}')">
                <div class="floating-circle">
                    <img src="${profileImgSrc}" alt="Profile">
                </div>
                <span>${item.label}</span>
            </div>`;
        } else {
            html += `
            <div class="nav-item" id="nav-${item.id}" onclick="switchMainTab('${item.id}')">
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            </div>`;
        }
    });

    navContainer.innerHTML = html;
    
    const activeTab = localStorage.getItem('activeTab') || 'home';
    const activeNav = document.getElementById('nav-' + activeTab);
    if(activeNav) activeNav.classList.add('active');
}

function renderHomeCategories() {
    const targetContainer = document.querySelector('.category-wrapper-bg');
    if (!targetContainer) return;

    targetContainer.innerHTML = '';
    let html = '';

    HOME_CATEGORIES.forEach(cat => {
        html += `
        <div class="category-card">
            <div class="category-header">
                <i class="fas ${cat.icon} ${cat.colorClass}"></i> ${cat.title}
            </div>
            <div class="cat-grid">`;
        
        cat.items.forEach(item => {
            html += `
                <div class="cat-item" onclick="goToPage('${item.id}', '${item.name}')">
                    <img src="${item.img}" class="cat-img" alt="${item.name}">
                    <div class="cat-name">${item.name}</div>
                </div>`;
        });
        html += `</div></div>`;
    });
    targetContainer.innerHTML = html;
}

/* ============================================== */
/* --- 5. SYSTEM: HELPER & DOM --- */
/* ============================================== */
function injectCustomElements() {
    const style = document.createElement('style');
    style.innerHTML = `
        .custom-alert-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99999; display: none; justify-content: center; align-items: center; backdrop-filter: blur(2px); animation: fadeIn 0.2s; }
        .custom-alert-box { background: #fff; width: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transform: scale(0.9); animation: popUp 0.3s forwards; }
        .custom-alert-header { background: #205081; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .custom-alert-body { padding: 25px 20px; text-align: center; color: #333; }
        .custom-alert-body h4 { color: #205081; margin-bottom: 8px; font-size: 16px; }
        .custom-alert-body p { font-size: 13px; line-height: 1.5; color: #555; margin: 0; }
        .btn-alert-ok { width: 100%; padding: 12px; border: none; background: #f8fafc; color: #205081; font-weight: bold; cursor: pointer; border-top: 1px solid #eee; transition: 0.2s; }
        .btn-alert-ok:hover { background: #e0f2fe; }
        @keyframes popUp { to { transform: scale(1); } }
        .btn-loading { pointer-events: none; opacity: 0.7; background: #555 !important; }
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
    boxAddProduct = document.getElementById('addProductModal'); // NEW
}

function handleUrlNavigation() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('p');
    const id = urlParams.get('id');

    if (page === 'detail' && id) {
        const savedTitle = localStorage.getItem('currentTitle') || 'Detail Produk';
        renderPage(id, savedTitle);
    } else if (page) {
        const isValidTab = NAV_MENU.some(item => item.id === page);
        if (isValidTab) {
            switchMainTab(page, false);
        } else {
            switchMainTab('home', false);
        }
    } else {
        const lastTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(lastTab, false);
    }
}

function showAlert(message, title = "Info") {
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertMsg').innerText = message;
    document.getElementById('customAlertModal').style.display = 'flex';
}

function closeAppAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

function setLoading(btnId, isLoading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (isLoading) {
        btn.dataset.originalText = defaultText;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Memproses...`;
        btn.classList.add('btn-loading');
    } else {
        btn.innerText = defaultText;
        btn.classList.remove('btn-loading');
    }
}

function isAdmin(email) { return ADMIN_EMAILS.includes(email); }

function formatDate(dateString) {
    if(!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
}

/* ============================================== */
/* --- 6. AUTHENTICATION --- */
/* ============================================== */

function checkAutoSubmitOtp(el) {
    const val = el.value.toString();
    if(val.length > 6) el.value = val.slice(0, 6);
    if(el.value.length === 6) { el.blur(); handleVerifyOtp(); }
}

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
    
    if(type === 'login') {
        boxLogin.style.display = 'block';
    } 
    else if(type === 'register') { 
        boxReg.style.display = 'block'; 
        authMode = 'register'; 
    } 
    else if(type === 'otp') { 
        boxOtp.style.display = 'block'; 
        setTimeout(() => {
            const input = document.getElementById('otpInputLong');
            if(input) { input.value = ''; input.focus(); }
        }, 100);
    } 
    else if(type === 'forgot') {
        if(boxForgot) boxForgot.style.display = 'block';
    }
}

function togglePass(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
}

/* --- REGISTER --- */
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
            showAlert(`Kode OTP telah dikirim ke ${email}`, "Berhasil");
            switchAuth('otp');
            document.getElementById('otpTextEmail').innerText = `Cek email: ${email}`;
        } else {
            let errMsg = data.message;
            if (errMsg && errMsg.includes("duplicate")) errMsg = "Username atau Email sudah terdaftar!";
            showAlert(errMsg || "Gagal Request OTP", "Gagal Daftar");
        }
    } catch(e){
        showAlert("Gagal menghubungi server.", "Koneksi Error");
    } finally {
        setLoading('btnRegBtn', false, "DAFTAR");
    }
}

/* --- VERIFY OTP & AUTO LOGIN --- */
async function handleVerifyOtp() {
    const inputLong = document.getElementById('otpInputLong');
    let otp = inputLong ? inputLong.value : '';

    if (!otp || otp.toString().length < 6) return showAlert("Masukkan 6 digit kode OTP!", "Peringatan");

    setLoading('btnVerifyBtn', true, "VERIFIKASI");

    try {
        const res = await fetch(`${API_URL}/register-verify`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({...tempRegisterData, otp})
        });
        const data = await res.json();

        if(data.success) {
            await performAutoLogin(tempRegisterData.username, tempRegisterData.password);
        } else {
            showAlert("Kode OTP Salah atau Kadaluarsa.", "Gagal");
            setLoading('btnVerifyBtn', false, "VERIFIKASI");
            if(inputLong) inputLong.value = '';
        }
    } catch(e){
        showAlert("Terjadi kesalahan sistem.", "Error");
        setLoading('btnVerifyBtn', false, "VERIFIKASI");
    }
}

async function performAutoLogin(loginInput, password) {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({loginInput, password})
        });
        const data = await res.json();
        
        if(data.success) {
            closeAuthModal();
            localStorage.setItem('user', JSON.stringify(data.userData));
            checkLoginState();
            const isAdminUser = isAdmin(data.userData.email);
            switchMainTab(isAdminUser ? 'admin' : 'home');
            showAlert(`Selamat datang, ${data.userData.username}!`, "Login Sukses");
        } else {
            showAlert("Pendaftaran sukses, silakan login manual.", "Info");
            switchAuth('login');
        }
    } catch(e) {
        switchAuth('login');
    } finally {
        setLoading('btnVerifyBtn', false, "VERIFIKASI");
    }
}

/* --- LOGIN --- */
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
            checkLoginState();
            const isAdminUser = isAdmin(data.userData.email);
            switchMainTab(isAdminUser ? 'admin' : 'home');
            showAlert("Berhasil masuk ke akun Anda.", "Login Sukses");
        } else {
            showAlert(data.message || "Username atau Password Salah!", "Login Gagal");
        }
    } catch(e){
        showAlert("Tidak dapat terhubung ke server.", "Koneksi Error");
    } finally {
        setLoading('btnLoginBtn', false, "LOGIN");
    }
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
        if (data.success) localStorage.setItem("user", JSON.stringify(data.userData));
    } catch (e) { console.error("Gagal refresh user:", e); }
}

/* ============================================== */
/* --- 7. NAVIGASI HALAMAN & TAB --- */
/* ============================================== */
const detailSection = document.getElementById('detail-page');
const pageTitle = document.getElementById('page-title');

function switchMainTab(tabName, pushHistory = true) {
    localStorage.setItem('activeTab', tabName);
    
    // UI Update
    detailSection.classList.remove('active');
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) activeNav.classList.add('active');

    // LOGIKA HALAMAN KHUSUS
    if(tabName === 'produk') renderProdukPage();
    if(tabName === 'admin') {
        const firstMenu = document.querySelector('.admin-menu-item'); 
        if(firstMenu) loadAdminTab('users', firstMenu);
    }
    
    // History Browser
    if (pushHistory) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('p', tabName); 
        newUrl.searchParams.delete('id');      
        window.history.pushState({path: newUrl.href}, '', newUrl.href);
    }
}

// Fungsi Pindah ke Halaman Detail / Publik Produk
function goToPage(pageId, titleName) {
    localStorage.setItem('currentTitle', titleName);
    renderPage(pageId, titleName);

    const newUrl = new URL(window.location);
    newUrl.searchParams.set('p', 'detail');
    newUrl.searchParams.set('id', pageId);
    window.history.pushState({path: newUrl.href}, '', newUrl.href);
}

function renderPage(pageId, titleName) {
    // Reset View
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    detailSection.classList.add('active');
    window.scrollTo(0, 0);
    const finalTitle = titleName ? titleName : (localStorage.getItem('currentTitle') || 'Detail');
    pageTitle.innerText = finalTitle;
    
    // Render Konten (List Produk Publik)
    const contentDiv = document.getElementById('page-content');
    contentDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <i class="fas fa-gamepad" style="font-size:40px; color:#205081; margin-bottom:10px;"></i>
            <h3>${finalTitle}</h3>
            <p style="font-size:12px; color:#666;">Daftar produk tersedia dari seller terverifikasi.</p>
        </div>
        <div id="public-product-list" style="padding-bottom:50px;">
            <div style="text-align:center; margin-top:20px;"><i class="fas fa-circle-notch fa-spin"></i> Memuat Produk...</div>
        </div>
    `;

    // Fetch Produk Publik
    fetchPublicProducts(pageId);
}

function goBack() {
    const lastTab = localStorage.getItem('activeTab') || 'home';
    detailSection.classList.remove('active');
    switchMainTab(lastTab); 
}

/* ============================================== */
/* --- 8. FITUR PRODUK (UPLOAD & LIST) --- */
/* ============================================== */

/* --- A. RENDER HALAMAN PRODUK SAYA --- */
function renderProdukPage() {
    const container = document.getElementById('produk-content');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        container.innerHTML = `
            <div class="auth-required-state">
                <i class="fas fa-box-open lock-icon"></i>
                <p>Silakan Login untuk mengelola produk Anda.</p>
                <button class="btn-center-login" onclick="openAuthModal('login')">
                    <i class="fas fa-sign-in-alt"></i> LOGIN / DAFTAR
                </button>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="add-product-wrapper" onclick="handleClickAddProduct()">
            <div class="plus-icon-circle"><i class="fas fa-plus"></i></div>
            <span class="add-text">Tambahkan Produk</span>
        </div>
        <div class="section-divider-text">List Produk Anda</div>
        <div id="user-product-list">
            <div style="text-align:center; margin-top:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</div>
        </div>
    `;

    fetchUserProducts(user.email);
}

function handleClickAddProduct() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user.verificationStatus !== 'verified') {
        showAlert("Akun Anda belum terverifikasi! Silakan verifikasi identitas di menu Pengaturan.", "Akses Ditolak");
        setTimeout(() => { switchMainTab('pengaturan'); }, 1500);
        return;
    }
    openAddProductModal();
}

/* --- B. MODAL & FORM ADD PRODUCT --- */
function openAddProductModal() {
    boxAddProduct.style.display = 'flex';
    productImages = [];
    renderImagePreviews();
    document.getElementById('prodMainCat').value = "";
    document.getElementById('subCatContainer').style.display = 'none';
    document.getElementById('prodTitle').value = "";
    document.getElementById('prodDesc').value = "";
    document.getElementById('prodPrice').value = "";
    document.getElementById('prodPaymentMethod').value = "";
    document.getElementById('prodPaymentNum').value = "";
}

function closeAddProductModal() {
    boxAddProduct.style.display = 'none';
}

function updateSubCategories() {
    const main = document.getElementById('prodMainCat').value;
    const subSelect = document.getElementById('prodSubCat');
    const container = document.getElementById('subCatContainer');
    
    subSelect.innerHTML = "";
    container.style.display = main ? 'block' : 'none';

    let options = [];
    const categoryData = HOME_CATEGORIES.find(c => c.title === main);
    if(categoryData) options = categoryData.items;

    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.id;
        el.innerText = opt.name;
        subSelect.appendChild(el);
    });
}

function triggerProductImgUpload() {
    if(productImages.length >= 5) return showAlert("Maksimal 5 Foto.", "Info");
    document.getElementById('prodImgInput').click();
}

function handleProductImgChange(input) {
    if (input.files) {
        const files = Array.from(input.files);
        if(files.length + productImages.length > 5) return showAlert("Total foto tidak boleh lebih dari 5", "Warning");

        files.forEach(file => {
            if(file.size > 2 * 1024 * 1024) return showAlert(`File ${file.name} terlalu besar (Max 2MB)`, "Error");
            const reader = new FileReader();
            reader.onload = (e) => {
                productImages.push(e.target.result);
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    }
    input.value = ""; 
}

function renderImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    grid.innerHTML = `<div class="add-img-box" onclick="triggerProductImgUpload()"><i class="fas fa-plus"></i></div>`;
    productImages.forEach((img, idx) => {
        const div = document.createElement('div');
        div.className = 'preview-img-box';
        div.style.backgroundImage = `url(${img})`;
        div.innerHTML = `<div class="remove-img-btn" onclick="removeProductImg(${idx})"><i class="fas fa-times"></i></div>`;
        grid.insertBefore(div, grid.firstChild);
    });
}

function removeProductImg(index) {
    productImages.splice(index, 1);
    renderImagePreviews();
}

function formatPriceInput(el) {
    let val = el.value.replace(/[^0-9]/g, '');
    el.value = val ? "Rp " + parseInt(val).toLocaleString('id-ID') : "";
}

function validatePhonePrefix(el) {
    if(el.value.length >= 2 && !el.value.startsWith('08')) {
        showAlert("Nomor harus diawali 08", "Error");
        el.value = '08';
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const rawPrice = document.getElementById('prodPrice').value.replace(/[^0-9]/g, '');
    
    const payload = {
        email: user.email,
        mainCategory: document.getElementById('prodMainCat').value,
        subCategory: document.getElementById('prodSubCat').value,
        title: document.getElementById('prodTitle').value,
        description: document.getElementById('prodDesc').value,
        price: parseInt(rawPrice),
        paymentMethod: document.getElementById('prodPaymentMethod').value,
        paymentNumber: document.getElementById('prodPaymentNum').value,
        images: productImages
    };

    setLoading('btnUploadProd', true, "UPLOAD PRODUK");
    try {
        const res = await fetch(`${API_URL}/products/add`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            showAlert("Produk berhasil dikirim! Menunggu persetujuan Admin.", "Sukses");
            closeAddProductModal();
            renderProdukPage(); 
        } else {
            showAlert(data.message || "Gagal upload.", "Gagal");
        }
    } catch(e) {
        showAlert("Error: File mungkin terlalu besar.", "Gagal");
    } finally {
        setLoading('btnUploadProd', false, "UPLOAD PRODUK");
    }
}

async function fetchUserProducts(email) {
    const listContainer = document.getElementById('user-product-list');
    try {
        const res = await fetch(`${API_URL}/products/my-products`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if(!data.products || data.products.length === 0) {
            listContainer.innerHTML = `<div class="empty-state-placeholder" style="margin-top:10px; border:none; background:#f9f9f9;"><p style="font-size:13px;">Belum ada produk.</p></div>`;
            return;
        }

        let html = '';
        data.products.forEach(p => {
            let statusBadge = '', statusText = '';
            if(p.status === 'pending') { statusBadge = 'st-proses'; statusText = 'Proses'; } 
            else if (p.status === 'active') { statusBadge = 'st-terupload'; statusText = 'Terupload'; } 
            else { statusBadge = 'st-ditolak'; statusText = 'Tidak Terupload'; }

            const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100?text=No+Img';
            const price = "Rp " + p.price.toLocaleString('id-ID');

            html += `
            <div class="product-card-item">
                <img src="${imgUrl}" class="prod-thumb">
                <div class="prod-info">
                    <div class="prod-title">${p.title}</div>
                    <div class="prod-price">${price}</div>
                    <div style="font-size:11px; color:#888; margin-top:3px;">${p.subCategory}</div>
                </div>
                <div class="status-label ${statusBadge}">${statusText}</div>
            </div>`;
        });
        listContainer.innerHTML = html;
    } catch(e) { listContainer.innerHTML = "Error loading products."; }
}

/* --- C. FETCH PUBLIC PRODUCTS --- */
async function fetchPublicProducts(categoryId) {
    const container = document.getElementById('public-product-list');
    try {
        const res = await fetch(`${API_URL}/products/public/${categoryId}`);
        const data = await res.json();

        if(!data.products || data.products.length === 0) {
            container.innerHTML = `<div class="empty-state-placeholder"><p>Belum ada produk tersedia.</p></div>`;
            return;
        }

        let html = '';
        data.products.forEach(p => {
            const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100?text=No+Img';
            const price = "Rp " + p.price.toLocaleString('id-ID');
            
            html += `
            <div class="product-card-item" onclick="alert('Fitur Beli Detail akan dikembangkan selanjutnya!\\nKontak Penjual: ${p.userPhone}')">
                <img src="${imgUrl}" class="prod-thumb">
                <div class="prod-info">
                    <div class="prod-title">${p.title}</div>
                    <div class="prod-price">${price}</div>
                    <div style="font-size:10px; color:#666; margin-top:5px;">
                        <i class="fas fa-user-check" style="color:#10b981;"></i> ${p.username}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <i class="fas fa-chevron-right" style="color:#ccc;"></i>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat produk.</p>`; }
}

/* ============================================== */
/* --- 9. SLIDER SWIPE --- */
/* ============================================== */
function setupSliderSwipe() {
    const wrapper = document.getElementById('slider-wrapper');
    const container = document.getElementById('slider-container');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = 3;
    let currentIndex = 0;
    let autoSlideInterval;
    let startX = 0, endX = 0;

    if(!wrapper) return;
    function updateSlider() {
        wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(d => d.classList.remove('active'));
        if(dots[currentIndex]) dots[currentIndex].classList.add('active');
    }
    function nextSlide() { currentIndex = (currentIndex + 1) % totalSlides; updateSlider(); }
    function startAutoSlide() { stopAutoSlide(); autoSlideInterval = setInterval(nextSlide, 4000); }
    function stopAutoSlide() { clearInterval(autoSlideInterval); }
    
    container.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stopAutoSlide(); });
    container.addEventListener('touchmove', (e) => { endX = e.touches[0].clientX; });
    container.addEventListener('touchend', () => {
        if (startX > endX + 50) nextSlide();
        else if (startX < endX - 50) { currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; updateSlider(); }
        startAutoSlide();
    });
    startAutoSlide();
}

/* ============================================== */
/* --- 10. LOGIN STATE & PROFIL --- */
/* ============================================== */

function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');
    renderNavbar(); 

    if (userSession) {
        const user = JSON.parse(userSession);
        const isOwner = isAdmin(user.email);
        
        let headerAvatar = `<div style="width:35px; height:35px; border-radius:50%; background:white; color:#205081; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
        if (user.profilePic) headerAvatar = `<img src="${user.profilePic}" class="profile-pic">`;

        headerAuthArea.innerHTML = `<div class="header-user-area" onclick="switchMainTab('profile')"><span class="user-name-header">${user.username}</span>${headerAvatar}</div>`;
        renderAuthPages(true, user, isOwner);
        
    } else {
        headerAuthArea.innerHTML = `<button class="btn-login-header" onclick="openAuthModal('login')"><i class="fas fa-user-circle"></i> Masuk / Daftar</button>`;
        renderAuthPages(false, null, false);
    }
}

function renderAuthPages(isLoggedIn, user, isOwner) {
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    const navProfileImg = document.querySelector('.floating-circle');
    
    const loginPromptHTML = `
        <div class="auth-required-state">
            <i class="fas fa-lock lock-icon"></i><p>Silakan Login untuk mengakses halaman ini.</p>
            <button class="btn-center-login" onclick="openAuthModal('login')"><i class="fas fa-sign-in-alt"></i> LOGIN / DAFTAR</button>
        </div>`;

    if (!isLoggedIn) {
        if(profileContent) profileContent.innerHTML = loginPromptHTML;
        if(settingsContent) settingsContent.innerHTML = loginPromptHTML;
        if(navProfileImg) navProfileImg.innerHTML = `<img src="https://api.deline.web.id/76NssFHmcI.png">`;
    } else {
        const userInitial = user.username.charAt(0).toUpperCase();

        if(navProfileImg) {
            navProfileImg.innerHTML = user.profilePic 
                ? `<img src="${user.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                : `<div style="width:100%; height:100%; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#205081; font-weight:bold; font-size:20px; border:2px solid #eee;">${userInitial}</div>`;
        }

        // --- PROFILE PAGE ---
        if(profileContent) {
            const avatarDisplay = user.profilePic ? `<img src="${user.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : userInitial;
            profileContent.innerHTML = `
                <div class="profile-view-header">
                    <div class="profile-view-avatar">${avatarDisplay}</div>
                    <div style="color:white; margin-top:10px; font-weight:bold;">${user.username}</div>
                    <div style="color:#dbeafe; font-size:12px; margin-top:2px;">Bergabung: ${formatDate(user.createdAt)}</div>
                    ${isOwner ? '<div class="badge-admin-website" style="margin-top:10px;">ADMIN</div>' : ''}
                </div>
                <div class="profile-details-card">
                    <div class="detail-row"><span class="detail-label">Username</span><span class="detail-value">${user.username}</span></div>
                    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email}</span></div>
                    <div class="detail-row"><span class="detail-label">Level</span><span class="level-badge" style="background:#205081; color:white;">BASIC</span></div>
                </div>`;
        }

        // --- SETTINGS PAGE ---
        if(settingsContent) {
            const avatarDisplay = user.profilePic 
                ? `<img src="${user.profilePic}" class="avatar-circle-display" style="border:none;">`
                : `<div class="avatar-circle-display">${userInitial}</div>`;

            const status = user.verificationStatus || 'unverified';
            let badgeHtml = '', isLocked = false, verifyButtonHtml = '', statusText = 'Belum Verifikasi';

            if (status === 'verified') {
                badgeHtml = `<div class="status-badge green">Terverifikasi</div>`; isLocked = true; statusText = '';
            } else if (status === 'pending') {
                badgeHtml = `<div class="status-badge yellow">Proses Verifikasi</div>`; isLocked = true; statusText = 'Proses Verifikasi';
            } else if (status === 'rejected') {
                badgeHtml = `<div class="status-badge red">Verifikasi Ditolak</div>`; isLocked = false; statusText = 'Ditolak (Coba Lagi)';
                verifyButtonHtml = `<button class="btn-verify-mini" onclick="openVerificationModal()">Verifikasi</button>`;
            } else {
                badgeHtml = `<div class="status-badge red">Belum Terverifikasi</div>`; isLocked = false;
                verifyButtonHtml = `<button class="btn-verify-mini" onclick="openVerificationModal()">Verifikasi</button>`;
            }

            const inputClass = isLocked ? 'form-input-styled permanent' : 'form-input-styled';
            const readOnlyAttr = isLocked ? 'readonly' : '';
            let verificationActionArea = status !== 'verified' ? `<div class="verification-action-row">${verifyButtonHtml}<span class="verify-status-text">${statusText}</span></div>` : '';

            settingsContent.innerHTML = `
                <div class="settings-page-wrapper">
                    <div>
                        <div class="profile-header-container">
                            <div class="avatar-wrapper">
                                ${avatarDisplay}
                                <div class="camera-badge" onclick="triggerFileUpload()"><i class="fas fa-camera"></i></div>
                            </div>
                            <div style="font-size:12px; color:#666; margin-top:10px;">Terdaftar: <b>${formatDate(user.createdAt)}</b></div>
                            ${badgeHtml} </div>

                        <div class="form-container" style="padding: 0 10px;">
                            <div class="form-group-styled">
                                <label class="form-label">Username</label>
                                <input type="text" class="${inputClass}" value="${user.username}" ${readOnlyAttr} readonly> 
                                </div>
                            <div class="form-group-styled">
                                <label class="form-label">Email</label>
                                <input type="text" class="${inputClass}" value="${user.email}" ${readOnlyAttr} readonly>
                            </div>
                            <div class="form-group-styled">
                                <label class="form-label">Nomor WhatsApp</label>
                                <input type="text" class="${inputClass}" value="${user.phone}" ${readOnlyAttr} readonly>
                            </div>
                            <div class="form-group-styled">
                                <label class="form-label">Password</label>
                                <div class="form-input-styled clickable" onclick="openChangePassModal()"><span>••••••••</span><i class="fas fa-pen" style="color:#205081; font-size:12px;"></i></div>
                                ${verificationActionArea}
                            </div>
                        </div>
                    </div>
                    <div class="logout-area" style="padding: 0 10px;">
                        <button class="btn-logout-bottom" onclick="logoutUser()"><i class="fas fa-sign-out-alt"></i> KELUAR AKUN</button>
                    </div>
                </div>`;
        }
    }
}

function logoutUser() {
    localStorage.removeItem('user');
    checkLoginState(); 
    switchMainTab('home'); 
    showAlert("Anda berhasil keluar.", "Logout");
}

/* ============================================== */
/* --- 11. VERIFIKASI USER --- */
/* ============================================== */
function openVerificationModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;
    authOverlay.classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    boxVerification.style.display = 'block';

    document.getElementById('verifStep1').style.display = 'block';
    document.getElementById('verifStep2').style.display = 'none';

    document.getElementById('verifUsername').value = user.username;
    document.getElementById('verifEmail').value = user.email;
    document.getElementById('verifPhone').value = user.phone;
}

async function handleVerificationConfirm(e) {
    e.preventDefault();
    const newUsername = document.getElementById('verifUsername').value;
    const newEmail = document.getElementById('verifEmail').value;
    const newPhone = document.getElementById('verifPhone').value;
    
    setLoading('btnVerifConfirm', true, "KONFIRMASI");
    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: newEmail, username: newUsername, phone: newPhone, type: 'verification_update' })
        });
        const data = await res.json();
        if(data.success) {
            document.getElementById('verifStep1').style.display = 'none';
            document.getElementById('verifStep2').style.display = 'block';
        } else {
            showAlert(data.message || "Gagal mengirim kode.", "Gagal");
        }
    } catch(e) { showAlert("Error Server", "Error"); }
    finally { setLoading('btnVerifConfirm', false, "KONFIRMASI"); }
}

async function handleVerificationSubmitOtp() {
    const user = JSON.parse(localStorage.getItem('user'));
    const otp = document.getElementById('verifOtpCode').value;
    const newUsername = document.getElementById('verifUsername').value;
    const newEmail = document.getElementById('verifEmail').value;
    const newPhone = document.getElementById('verifPhone').value;
    
    if(!otp) return showAlert("Masukkan kode OTP!", "Error");
    setLoading('btnVerifSubmit', true, "KIRIM & VERIFIKASI");

    try {
        const res = await fetch(`${API_URL}/submit-verification`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ originalEmail: user.email, newUsername, newEmail, newPhone, otp })
        });
        const data = await res.json();
        if(data.success) {
            showAlert("Permintaan Verifikasi Terkirim! Menunggu persetujuan Admin.", "Sukses");
            localStorage.setItem('user', JSON.stringify(data.user)); 
            closeAuthModal();
            checkLoginState(); 
        } else {
            showAlert(data.message || "Gagal verifikasi.", "Gagal");
        }
    } catch(e) { showAlert("Error koneksi.", "Error"); }
    finally { setLoading('btnVerifSubmit', false, "KIRIM & VERIFIKASI"); }
}

/* ============================================== */
/* --- 12. ADMIN DASHBOARD --- */
/* ============================================== */

function loadAdminTab(tab, element) {
    document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');

    const container = document.getElementById('admin-content-area');
    container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    if (tab === 'users') fetchAdminUsers();
    else if (tab === 'verif') fetchAdminVerifications();
    else if (tab === 'acc') fetchAdminProductAcc();
    else container.innerHTML = `<div class="empty-state-placeholder"><p>Menu ${tab} kosong.</p></div>`;
}

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        renderAdminUserList(data.users);
    } catch (e) { document.getElementById('admin-content-area').innerText = "Error."; }
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
            </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

async function fetchAdminVerifications() {
    try {
        const res = await fetch(`${API_URL}/admin/verifications`); 
        const data = await res.json();
        renderAdminVerifList(data.users);
    } catch (e) { document.getElementById('admin-content-area').innerText = "Error."; }
}

function renderAdminVerifList(users) {
    const container = document.getElementById('admin-content-area');
    if(!users || users.length === 0) { 
        container.innerHTML = `<div class="empty-state-placeholder"><i class="fas fa-check-double"></i><p>Tidak ada permintaan verifikasi.</p></div>`; return; 
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
            </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

/* --- ADMIN ACC PRODUK (NEW) --- */
async function fetchAdminProductAcc() {
    try {
        const res = await fetch(`${API_URL}/admin/products/pending`);
        const data = await res.json();
        renderAdminAccList(data.products);
    } catch (e) { document.getElementById('admin-content-area').innerText = "Error loading acc."; }
}

function renderAdminAccList(products) {
    const container = document.getElementById('admin-content-area');
    if(!products || products.length === 0) { 
        container.innerHTML = `<div class="empty-state-placeholder"><i class="fas fa-check-double"></i><p>Tidak ada produk pending.</p></div>`; return; 
    }
    let html = `<div class="admin-list-container">`;
    products.forEach(p => {
        const uniqueId = `prod_acc_${p._id}`;
        let imgHtml = '';
        if(p.images && p.images.length > 0) {
            imgHtml = '<div class="acc-img-grid">';
            p.images.forEach(img => imgHtml += `<img src="${img}" class="acc-img-thumb">`);
            imgHtml += '</div>';
        }
        html += `
            <div class="admin-acc-item warning-border">
                <div class="admin-acc-header" onclick="toggleAccordion('${uniqueId}')">
                    <span class="acc-title"><i class="fas fa-box"></i> ${p.title}</span>
                    <i class="fas fa-chevron-down acc-icon"></i>
                </div>
                <div id="${uniqueId}" class="admin-acc-body" style="display:none;">
                    <div class="acc-row"><span>User:</span> <b>${p.username}</b></div>
                    <div class="acc-row"><span>Kategori:</span> <b>${p.subCategory}</b></div>
                    <div class="acc-row"><span>Harga:</span> <b>${p.price}</b></div>
                    <div class="acc-row"><span>Payment:</span> <b>${p.paymentMethod} - ${p.paymentNumber}</b></div>
                    <div style="margin:5px 0; font-style:italic;">"${p.description}"</div>
                    ${imgHtml}
                    <div class="acc-actions">
                         <button class="btn-acc-action approve" onclick="adminProductAction('${p._id}', 'approve')">Terima</button>
                         <button class="btn-acc-action reject" onclick="adminProductAction('${p._id}', 'reject')">Tolak</button>
                    </div>
                </div>
            </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

async function adminProductAction(productId, action) {
    if(!confirm(`Yakin ingin ${action === 'approve' ? 'Menerima' : 'Menolak'} produk ini?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/products/action`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId, action })
        });
        const data = await res.json();
        if(data.success) { showAlert(data.message, "Info"); fetchAdminProductAcc(); } 
        else showAlert("Gagal.", "Error");
    } catch(e) { showAlert("Error Server", "Error"); }
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
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
    if(!confirm(`Hapus ${name}?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        if(await res.json().success) fetchAdminUsers();
    } catch(e){}
}

function openAdminEditModal(user) {
    authOverlay.classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    boxAdminEdit.style.display='block';
    document.getElementById('editUserId').value = user._id;
    document.getElementById('editUserUsername').value = user.username;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone;
    document.getElementById('editUserPass').value = user.password;
}
function closeAdminEditModal() { authOverlay.classList.remove('active'); }

async function handleAdminUpdateUser(e) {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const payload = {
        username: document.getElementById('editUserUsername').value,
        email: document.getElementById('editUserEmail').value,
        phone: document.getElementById('editUserPhone').value,
        password: document.getElementById('editUserPass').value
    };
    try {
        await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        closeAdminEditModal();
        fetchAdminUsers();
    } catch(e) { showAlert("Error Update", "Error"); }
}

/* ============================================== */
/* --- 13. CROPPER UTILS --- */
/* ============================================== */
function setupFileUploadListener() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('imageToCrop').src = event.target.result;
                    openCropModal();
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }
}
function triggerFileUpload() { document.getElementById('fileInput').click(); }
function openCropModal() {
    document.getElementById('cropModal').style.display = 'flex';
    if(cropper) cropper.destroy();
    cropper = new Cropper(document.getElementById('imageToCrop'), { aspectRatio: 1, viewMode: 1 });
}
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
            closeCropModal(); checkLoginState();
        }
    } catch (e) {}
}

/* ============================================== */
/* --- 14. CHANGE PASSWORD --- */
/* ============================================== */
function openChangePassModal() {
    closeAuthModal(); 
    setTimeout(() => {
        authOverlay.classList.add('active'); 
        boxChangePass.style.display = 'block'; 
        boxChangePass.style.zIndex = '2001';
    }, 150);
}

async function handleChangePassword(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const oldPass = document.getElementById('oldPass').value;
    const newPass = document.getElementById('newPass').value;
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerHTML = "Memproses..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/change-password`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email: user.email, oldPass, newPass })
        });
        const data = await res.json();
        if(data.success) { showAlert("Password berhasil diperbarui!", "Sukses"); closeAuthModal(); } 
        else { showAlert(data.message || "Gagal mengubah password.", "Gagal"); }
    } catch (e) { showAlert("Error Server", "Error"); } 
    finally { btn.innerText = oldText; btn.disabled = false; }
}
