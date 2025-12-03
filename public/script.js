/* ============================================== */
/* --- KONFIGURASI GLOBAL --- */
/* ============================================== */
const API_URL = "/api"; 
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

/* --- VARIABLES STATE --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let currentEmail = ''; 
let cropper = null; 
let productImages = []; // Menyimpan array base64 gambar saat input produk

/* DOM Elements Global Placeholders */
let authOverlay, boxLogin, boxReg, boxOtp, boxForgot, boxChangePass, boxAdminEdit, boxVerification;

/* ============================================== */
/* --- 1. INIT: SETUP AWAL (MAIN ENTRY) --- */
/* ============================================== */
document.addEventListener("DOMContentLoaded", async () => {
    // Inject Style Tambahan (Alert, dll)
    injectCustomElements();
    initializeDomElements();

    // 1. Handle URL Navigation (agar saat refresh tetap di halaman yang sama)
    handleUrlNavigation(); 

    // 2. Setup Listeners UI
    setupFileUploadListener();
    setupSliderSwipe();
    
    // 3. Ambil Data User Terbaru dari Server
    await refreshUserData(); 

    // 4. Cek Status Login & Update Tampilan Navbar/Profile
    checkLoginState(); 
    
    // 5. Render Kategori Home
    renderHomeCategories();
});

/* ============================================== */
/* --- 2. DATA & KONFIGURASI KATEGORI --- */
/* ============================================== */

// Data Kategori Produk (Marketplace)
const PRODUCT_SUBCATS = {
    'akun-game': [
        { id: 'ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
        { id: 'ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
        { id: 'roblox', name: 'Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' },
        { id: 'pubg', name: 'PUBG', img: 'https://api.deline.web.id/UXAYVjr3MP.jpg' },
        { id: 'fc', name: 'EA FC Mobile', img: 'https://api.deline.web.id/drNQO5aO9Z.jpg' }
    ],
    'topup-game': [
        { id: 'ml', name: 'Diamond ML', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
        { id: 'ff', name: 'Diamond FF', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' },
        { id: 'roblox', name: 'Robux', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' }
    ],
    'joki-game': [
        { id: 'joki-ml', name: 'Joki MLBB', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
        { id: 'joki-ff', name: 'Joki FF', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' }
    ],
    'lainnya': [
        { id: 'app', name: 'Aplikasi Premium', img: 'https://api.deline.web.id/Lunp2IR8bG.jpg' },
        { id: 'script', name: 'Script', img: 'https://api.deline.web.id/kP9sQzd1TU.jpg' },
        { id: 'jasa', name: 'Jasa Web', img: 'https://api.deline.web.id/OWtCG5ldGU.jpg' }
    ]
};

// Data Kategori Halaman Home (Navigasi Cepat)
const HOME_CATEGORIES = [
    { title: "Akun Game", icon: "fa-user-circle", colorClass: "icon-akun", items: PRODUCT_SUBCATS['akun-game'] },
    { title: "Top Up Game", icon: "fa-gem", colorClass: "icon-topup", items: PRODUCT_SUBCATS['topup-game'] },
    { title: "Joki Game", icon: "fa-gamepad", colorClass: "icon-joki", items: PRODUCT_SUBCATS['joki-game'] },
    { title: "Lainnya", icon: "fa-layer-group", colorClass: "icon-lainnya", items: PRODUCT_SUBCATS['lainnya'] }
];

/* ============================================== */
/* --- 3. NAVIGASI & RENDER HALAMAN --- */
/* ============================================== */

function handleUrlNavigation() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('p') || 'home';
    // Gunakan false agar tidak push history saat load awal
    switchMainTab(page, false);
}

function switchMainTab(tabName, pushHistory = true) {
    localStorage.setItem('activeTab', tabName);
    
    // 1. Sembunyikan semua section
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    // 2. Tampilkan section target
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');
    else document.getElementById('home-page').classList.add('active'); // Fallback

    // 3. Update Navbar Active State
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) activeNav.classList.add('active');

    // 4. Logic Khusus per Halaman
    if (tabName === 'produk') {
        fetchMarketplaceProducts();
    } else if (tabName === 'admin') {
        const firstMenu = document.querySelector('.admin-menu-item'); 
        if(firstMenu) loadAdminTab('users', firstMenu);
    }
    
    // 5. Update URL Browser
    if (pushHistory) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('p', tabName); 
        newUrl.searchParams.delete('id');      
        window.history.pushState({path: newUrl.href}, '', newUrl.href);
    }
}

function goBack() {
    const lastTab = localStorage.getItem('activeTab') || 'home';
    switchMainTab(lastTab); 
}

/* ============================================== */
/* --- 4. RENDER UI KOMPONEN --- */
/* ============================================== */

function renderHomeCategories() {
    const container = document.querySelector('.category-wrapper-bg');
    if (!container) return;
    container.innerHTML = '';

    let html = '';
    HOME_CATEGORIES.forEach(cat => {
        html += `
        <div class="category-card">
            <div class="category-header">
                <i class="fas ${cat.icon} ${cat.colorClass}"></i> ${cat.title}
            </div>
            <div class="cat-grid">`;
        
        cat.items.forEach(item => {
            // Saat diklik di home, arahkan ke tab Produk dengan filter (Logic sederhana: buka tab produk)
            html += `
                <div class="cat-item" onclick="switchMainTab('produk')">
                    <img src="${item.img}" class="cat-img" alt="${item.name}">
                    <div class="cat-name">${item.name}</div>
                </div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html;
}

/* ============================================== */
/* --- 5. MARKETPLACE / PRODUK LOGIC --- */
/* ============================================== */

// A. Handle Tombol "Tambah Produk"
function handleAddProductClick() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        showAlert("Silakan login terlebih dahulu.", "Akses Ditolak");
        return openAuthModal('login');
    }

    // Cek Verifikasi
    if (user.verificationStatus !== 'verified') {
        showAlert("Anda belum terverifikasi! Silakan verifikasi akun di menu Pengaturan.", "Belum Verifikasi");
        switchMainTab('pengaturan');
        return;
    }

    // Buka Modal
    openAddProductModal();
}

function openAddProductModal() {
    document.getElementById('addProductModal').style.display = 'flex';
    // Reset Form
    document.getElementById('formAddProduct').reset();
    document.getElementById('previewContainer').innerHTML = '';
    productImages = []; // Reset array gambar
    document.getElementById('formAddProduct').style.display = 'none';
    document.getElementById('subCatContainer').innerHTML = '';
    
    // Default select tab pertama
    const firstTab = document.querySelector('.p-cat-item');
    if(firstTab) selectProdCat('akun-game', firstTab);
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
}

// B. Pilih Kategori & Render Sub-Kategori
function selectProdCat(catId, el) {
    // Styling Tab Active
    document.querySelectorAll('.p-cat-item').forEach(e => e.classList.remove('active'));
    if(el) el.classList.add('active');

    const subContainer = document.getElementById('subCatContainer');
    const form = document.getElementById('formAddProduct');
    const user = JSON.parse(localStorage.getItem('user'));
    const isOwner = isAdmin(user.email) || user.role === 'Admin';

    // Reset area sub kategori
    subContainer.innerHTML = '';
    form.style.display = 'none';
    document.getElementById('finalCategory').value = catId;

    // Logic Khusus: Kategori Topup hanya untuk Admin/Owner
    if (catId === 'topup-game' && !isOwner) {
        subContainer.innerHTML = `
            <div style="text-align:center; padding:30px; color:#777; background:#fff; border-radius:10px;">
                <i class="fas fa-lock" style="font-size:24px; margin-bottom:10px; color:#ccc;"></i><br>
                Kategori Topup hanya khusus Admin/Official.
            </div>`;
        return;
    }

    // Render Sub Categories
    const subs = PRODUCT_SUBCATS[catId] || [];
    if(subs.length === 0) {
        subContainer.innerHTML = '<div style="padding:10px; text-align:center;">Tidak ada sub-kategori.</div>';
        return;
    }

    subs.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'sub-cat-btn';
        div.innerHTML = `<img src="${sub.img}"> ${sub.name}`;
        div.onclick = () => {
            // Highlight selection
            document.querySelectorAll('.sub-cat-btn').forEach(b => b.classList.remove('selected'));
            div.classList.add('selected');
            
            // Show Form Input
            document.getElementById('finalSubCategory').value = sub.id;
            form.style.display = 'block';
            
            // Smooth scroll ke form
            form.scrollIntoView({behavior: "smooth"});
        };
        subContainer.appendChild(div);
    });
}

// C. Handle Select & Preview Gambar (Max 5)
function handleProductImgSelect(input) {
    const files = Array.from(input.files);
    
    // Cek jumlah total (existing + new)
    if (productImages.length + files.length > 5) {
        alert("Maksimal 5 foto produk!");
        return;
    }

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            productImages.push(e.target.result); // Simpan Base64 ke array
            
            // Render Preview Thumbnail
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-thumb';
            // Fitur hapus gambar saat diklik (opsional, bisa dikembangkan)
            document.getElementById('previewContainer').appendChild(img);
        };
        reader.readAsDataURL(file);
    });
    
    // Reset input agar bisa pilih file yang sama jika dihapus (opsional)
    input.value = '';
}

// D. Toggle Input Rekening
function toggleRekInput(select) {
    const val = select.value;
    const box = document.getElementById('rekInputContainer');
    if (val === 'dana' || val === 'gopay') {
        box.style.display = 'block';
        document.getElementById('prodRek').required = true;
    } else {
        box.style.display = 'none';
        document.getElementById('prodRek').required = false;
        document.getElementById('prodRek').value = '';
    }
}

// E. Submit Produk
async function submitProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btnAddProdSubmit');
    const originalText = btn.innerText;
    btn.innerText = "Mengirim..."; btn.disabled = true;

    const user = JSON.parse(localStorage.getItem('user'));
    
    const payload = {
        sellerEmail: user.email,
        sellerName: user.username,
        sellerPhone: user.phone,
        sellerAvatar: user.profilePic,
        category: document.getElementById('finalCategory').value,
        subCategory: document.getElementById('finalSubCategory').value,
        name: document.getElementById('prodName').value,
        description: document.getElementById('prodDesc').value,
        price: document.getElementById('prodPrice').value,
        paymentMethod: document.getElementById('prodPayment').value,
        accountNumber: document.getElementById('prodRek').value,
        images: productImages // Mengirim array base64
    };

    try {
        const res = await fetch(`${API_URL}/products/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            showAlert("Produk berhasil ditambahkan!", "Sukses");
            closeAddProductModal();
            fetchMarketplaceProducts(); // Refresh list produk
        } else {
            showAlert(data.message || "Gagal upload.", "Error");
        }
    } catch (err) {
        showAlert("Terjadi kesalahan server.", "Error");
    } finally {
        btn.innerText = originalText; btn.disabled = false;
    }
}

// F. Fetch & Render Produk Grid
async function fetchMarketplaceProducts() {
    const grid = document.getElementById('marketplaceGrid');
    // Set loading state
    grid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:20px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Memuat Produk...</div>`;
    
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        
        if (data.success && data.products.length > 0) {
            let html = '';
            data.products.forEach(prod => {
                // Gambar pertama sebagai thumbnail
                const mainImg = (prod.images && prod.images.length > 0) 
                    ? `<img src="${prod.images[0]}" alt="${prod.name}">` 
                    : `<div class="no-img-placeholder"><i class="fas fa-image"></i></div>`;
                
                // Escape string agar aman dimasukkan ke dalam function call onclick
                const prodString = encodeURIComponent(JSON.stringify(prod));

                html += `
                <div class="prod-card" onclick="openProductDetail('${prodString}')">
                    <div class="prod-img-box">
                        ${mainImg}
                        <div class="prod-badge-cat">${prod.subCategory.toUpperCase()}</div>
                    </div>
                    <div class="prod-info-box">
                        <div class="prod-name">${prod.name}</div>
                        <div class="prod-desc-short">${prod.description}</div>
                        <div class="prod-price">Rp ${parseInt(prod.price).toLocaleString('id-ID')}</div>
                    </div>
                </div>`;
            });
            grid.innerHTML = html;
        } else {
            grid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:30px; color:#999; border:2px dashed #eee; border-radius:10px;">Belum ada produk yang diposting.</div>`;
        }
    } catch (e) {
        grid.innerHTML = `<div style="grid-column: span 2; text-align:center; color:red;">Gagal memuat produk.</div>`;
    }
}

// G. Detail Produk Pop-up Logic
function openProductDetail(prodString) {
    const prod = JSON.parse(decodeURIComponent(prodString));
    
    // Populate Data Text
    document.getElementById('detName').innerText = prod.name;
    document.getElementById('detPrice').innerText = "Rp " + parseInt(prod.price).toLocaleString('id-ID');
    document.getElementById('detDesc').innerText = prod.description;
    document.getElementById('detPayment').innerText = prod.paymentMethod ? prod.paymentMethod.toUpperCase() : '-';
    document.getElementById('detRek').innerText = prod.accountNumber || '-';
    
    // Seller Info
    document.getElementById('detSellerName').innerText = prod.sellerName || 'Unknown';
    document.getElementById('detSellerPic').src = prod.sellerAvatar || 'https://api.deline.web.id/76NssFHmcI.png';
    // Logic Level sederhana: jika email ada di admin, tampilkan Admin, jika tidak Member
    const role = isAdmin(prod.sellerEmail) ? 'Official Admin' : 'Verified Member';
    document.getElementById('detSellerLevel').innerText = role;
    
    // Images Slider
    const imgContainer = document.getElementById('detImgContainer');
    imgContainer.innerHTML = '';
    if (prod.images && prod.images.length > 0) {
        prod.images.forEach(imgSrc => {
            const img = document.createElement('img');
            img.src = imgSrc;
            // Agar slider rapi
            imgContainer.appendChild(img);
        });
    } else {
        imgContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#ccc;font-size:40px;"><i class="fas fa-image"></i></div>`;
    }

    // Show Modal Overlay
    document.getElementById('productDetailModal').style.display = 'flex';
}

function closeProductDetail() {
    document.getElementById('productDetailModal').style.display = 'none';
}


/* ============================================== */
/* --- 6. AUTHENTICATION (LOGIN/REGISTER/OTP) --- */
/* ============================================== */

function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');
    
    // Jika User Login
    if (userSession) {
        const user = JSON.parse(userSession);
        const isOwner = isAdmin(user.email);
        
        // Update Header Avatar
        let headerAvatar = `<div style="width:35px; height:35px; border-radius:50%; background:white; color:#205081; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
        if (user.profilePic) headerAvatar = `<img src="${user.profilePic}" class="profile-pic">`;

        // Tampilkan Avatar di Header
        headerAuthArea.innerHTML = `<div class="header-user-area" onclick="switchMainTab('profile')"><span class="user-name-header">${user.username}</span>${headerAvatar}</div>`;
        
        // Render Halaman Profile & Pengaturan
        renderAuthPages(true, user, isOwner);

        // Update Nav Item Profile (Floating Circle)
        const navProfileImg = document.querySelector('.floating-circle');
        if(navProfileImg) {
            navProfileImg.innerHTML = user.profilePic 
                ? `<img src="${user.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                : `<div style="width:100%; height:100%; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#205081; font-weight:bold; font-size:20px; border:2px solid #eee;">${user.username.charAt(0).toUpperCase()}</div>`;
        }
        
        // Tampilkan/Sembunyikan Tab Admin
        const navAdmin = document.getElementById('nav-admin');
        if(isOwner) {
            navAdmin.style.display = 'flex';
        } else {
            navAdmin.style.display = 'none';
        }

    } else {
        // Jika Belum Login
        headerAuthArea.innerHTML = `<button class="btn-login-header" onclick="openAuthModal('login')"><i class="fas fa-user-circle"></i> Masuk / Daftar</button>`;
        renderAuthPages(false, null, false);
        
        const navProfileImg = document.querySelector('.floating-circle');
        if(navProfileImg) navProfileImg.innerHTML = `<img src="https://api.deline.web.id/76NssFHmcI.png">`;
        
        document.getElementById('nav-admin').style.display = 'none';
    }
}

// Render Konten Halaman Profile & Pengaturan
function renderAuthPages(isLoggedIn, user, isOwner) {
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    
    // HTML jika belum login
    const loginPromptHTML = `
        <div class="auth-required-state">
            <i class="fas fa-lock lock-icon"></i><p>Silakan Login untuk mengakses halaman ini.</p>
            <button class="btn-center-login" onclick="openAuthModal('login')"><i class="fas fa-sign-in-alt"></i> LOGIN / DAFTAR</button>
        </div>`;

    if (!isLoggedIn) {
        if(profileContent) profileContent.innerHTML = loginPromptHTML;
        if(settingsContent) settingsContent.innerHTML = loginPromptHTML;
    } else {
        // --- PROFILE PAGE UI ---
        if(profileContent) {
            const avatarDisplay = user.profilePic ? `<img src="${user.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : user.username.charAt(0).toUpperCase();
            
            profileContent.innerHTML = `
                <div class="profile-view-header">
                    <div class="profile-view-avatar">${avatarDisplay}</div>
                    <div style="color:white; margin-top:10px; font-weight:bold;">${user.username}</div>
                    <div style="color:#dbeafe; font-size:12px; margin-top:2px;">${user.email}</div>
                    ${isOwner ? '<div class="badge-admin-website" style="margin-top:10px;">ADMIN</div>' : ''}
                </div>
                <div class="profile-details-card">
                    <div class="detail-row"><span class="detail-label">Status</span><span class="status-badge ${user.verificationStatus === 'verified' ? 'green' : 'red'}">${user.verificationStatus === 'verified' ? 'Terverifikasi' : 'Belum Verifikasi'}</span></div>
                    <div class="detail-row"><span class="detail-label">Bergabung</span><span class="detail-value">${formatDate(user.createdAt)}</span></div>
                    <div class="detail-row"><span class="detail-label">No HP</span><span class="detail-value">${user.phone}</span></div>
                </div>`;
        }

        // --- PENGATURAN PAGE UI ---
        if(settingsContent) {
            const status = user.verificationStatus || 'unverified';
            let badgeHtml = '', verifyButtonHtml = '', statusText = '';
            let isLocked = false;

            if (status === 'verified') {
                badgeHtml = `<div class="status-badge green">Akun Terverifikasi</div>`; 
                isLocked = true; 
            } else if (status === 'pending') {
                badgeHtml = `<div class="status-badge yellow">Menunggu Verifikasi</div>`; 
                isLocked = true;
                statusText = 'Sedang diproses admin...';
            } else {
                badgeHtml = `<div class="status-badge red">Belum Terverifikasi</div>`; 
                verifyButtonHtml = `<button class="btn-verify-mini" onclick="openVerificationModal()">Verifikasi Sekarang</button>`;
                statusText = status === 'rejected' ? 'Pengajuan Ditolak. Coba lagi.' : 'Verifikasi untuk tambah produk.';
            }

            const verificationArea = status !== 'verified' 
                ? `<div class="verification-action-row">${verifyButtonHtml}<span class="verify-status-text">${statusText}</span></div>` 
                : '';

            settingsContent.innerHTML = `
                <div class="settings-page-wrapper">
                    <div>
                        <div class="profile-header-container">
                            <div class="avatar-wrapper">
                                ${user.profilePic ? `<img src="${user.profilePic}" class="avatar-circle-display">` : `<div class="avatar-circle-display">${user.username.charAt(0)}</div>`}
                                <div class="camera-badge" onclick="triggerFileUpload()"><i class="fas fa-camera"></i></div>
                            </div>
                            ${badgeHtml}
                        </div>

                        <div class="form-container" style="padding: 0 10px;">
                            <div class="form-group-styled">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-input-styled ${isLocked?'permanent':''}" value="${user.username}" readonly> 
                            </div>
                            <div class="form-group-styled">
                                <label class="form-label">Email</label>
                                <input type="text" class="form-input-styled permanent" value="${user.email}" readonly>
                            </div>
                            <div class="form-group-styled">
                                <label class="form-label">Password</label>
                                <div class="form-input-styled clickable" onclick="openChangePassModal()"><span>••••••••</span><i class="fas fa-pen" style="color:#205081; font-size:12px;"></i></div>
                                ${verificationArea}
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

// Auth Handlers
function openAuthModal(type) {
    document.getElementById('authOverlay').style.display = 'flex';
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    
    if(type === 'login') document.getElementById('loginBox').style.display = 'block';
    else if(type === 'register') document.getElementById('registerBox').style.display = 'block';
    else if(type === 'otp') document.getElementById('otpBox').style.display = 'block';
    else if(type === 'forgot') document.getElementById('forgotBox').style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('authOverlay').style.display = 'none';
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
}

function switchAuth(type) { openAuthModal(type); }

function togglePass(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
}

// REGISTER logic
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
            showAlert(data.message || "Gagal Request OTP", "Gagal Daftar");
        }
    } catch(e){
        showAlert("Gagal menghubungi server.", "Koneksi Error");
    } finally {
        setLoading('btnRegBtn', false, "DAFTAR");
    }
}

// LOGIN logic
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

// LOGOUT Logic
function logoutUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('activeTab');
    checkLoginState(); 
    switchMainTab('home'); 
    showAlert("Anda berhasil keluar.", "Logout");
}

// REFRESH DATA USER (Sync LocalStorage dengan Database)
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
    } catch (e) {}
}

// OTP VERIFICATION (Register)
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
            // Auto login setelah register
            await performAutoLogin(tempRegisterData.username, tempRegisterData.password);
        } else {
            showAlert("Kode OTP Salah atau Kadaluarsa.", "Gagal");
            setLoading('btnVerifyBtn', false, "VERIFIKASI");
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
            showAlert(`Selamat datang, ${data.userData.username}!`, "Login Sukses");
        }
    } catch(e) {}
}

// Change Password
function openChangePassModal() {
    closeAuthModal();
    setTimeout(() => { document.getElementById('authOverlay').style.display = 'flex'; document.getElementById('changePassModal').style.display='block'; }, 100);
}

/* ============================================== */
/* --- 7. VERIFIKASI AKUN (USER SIDE) --- */
/* ============================================== */

function openVerificationModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;
    
    document.getElementById('authOverlay').style.display = 'flex';
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    document.getElementById('verificationModal').style.display = 'block';

    document.getElementById('verifStep1').style.display = 'block';
    document.getElementById('verifStep2').style.display = 'none';

    // Autofill data
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
        // Request OTP untuk verifikasi perubahan data
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: newEmail, username: newUsername, phone: newPhone, type: 'verification_update' })
        });
        const data = await res.json();
        
        if(data.success) {
            document.getElementById('verifStep1').style.display = 'none';
            document.getElementById('verifStep2').style.display = 'block';
        } else {
            showAlert(data.message, "Gagal");
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
/* --- 8. ADMIN DASHBOARD LOGIC --- */
/* ============================================== */

function loadAdminTab(tab, element) {
    document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');

    const container = document.getElementById('admin-content-area');
    container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    if (tab === 'users') fetchAdminUsers();
    else if (tab === 'verif') fetchAdminVerifications();
    else container.innerHTML = `<div class="empty-state-placeholder"><p>Menu ${tab} belum tersedia.</p></div>`;
}

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        renderAdminUserList(data.users);
    } catch (e) { document.getElementById('admin-content-area').innerText = "Gagal memuat data user."; }
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
                    <div class="acc-row"><span>Role:</span> <b>${u.role}</b></div>
                    <div class="acc-actions">
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
    } catch (e) { document.getElementById('admin-content-area').innerText = "Gagal memuat verifikasi."; }
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
            </div>`;
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
        if((await res.json()).success) fetchAdminUsers();
    } catch(e){}
}

/* ============================================== */
/* --- 9. UTILITIES & HELPER FUNCTIONS --- */
/* ============================================== */

// Initialize Elements
function initializeDomElements() {
    authOverlay = document.getElementById('authOverlay');
    boxLogin = document.getElementById('loginBox');
    boxReg = document.getElementById('registerBox');
    boxOtp = document.getElementById('otpBox');
    boxForgot = document.getElementById('forgotBox'); 
    boxChangePass = document.getElementById('changePassModal');
    boxVerification = document.getElementById('verificationModal');
}

// Inject CSS dinamis
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

// Show Alert Custom
function showAlert(message, title = "Info") {
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertMsg').innerText = message;
    document.getElementById('customAlertModal').style.display = 'flex';
}
function closeAppAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

// Loading Button Helper
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

// Check Admin Email
function isAdmin(email) { return ADMIN_EMAILS.includes(email); }

// Format Date
function formatDate(dateString) {
    if(!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
}

// OTP Auto Tab (Optional - simplified here)
function checkAutoSubmitOtp(el) {
    if(el.value.length === 6) { el.blur(); handleVerifyOtp(); }
}

/* ============================================== */
/* --- 10. CROPPER UTILS (PROFILE PIC) --- */
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

function closeCropModal() { 
    document.getElementById('cropModal').style.display = 'none'; 
    if(cropper) cropper.destroy(); 
}

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
/* --- 11. SLIDER SWIPE LOGIC --- */
/* ============================================== */
function setupSliderSwipe() {
    const wrapper = document.getElementById('slider-wrapper');
    if(!wrapper) return;
    
    let currentIndex = 0;
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    
    // Auto slide
    setInterval(() => {
        currentIndex = (currentIndex + 1) % totalSlides;
        wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
    }, 4000);
}