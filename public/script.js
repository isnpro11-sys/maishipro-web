/* ============================================== */
/* --- KONFIGURASI UTAMA --- */
/* ============================================== */
const API_URL = "/api"; 
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

/* --- GLOBAL VARIABLES --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let currentEmail = ''; 
let cropper = null; 
let uploadedProductImages = []; // Array untuk menyimpan foto produk sementara (Base64)

/* DOM Elements (Diisi saat init) */
let authOverlay, boxLogin, boxReg, boxOtp, boxForgot, boxChangePass, boxAdminEdit, boxVerification;

/* --- DATA SUB-KATEGORI PRODUK --- */
// Topup tidak dimasukkan karena hanya admin yang bisa (sesuai request)
const SUB_CATEGORIES = {
    'akun-game': [
        { id: 'ml', name: 'Mobile Legends' },
        { id: 'ff', name: 'Free Fire' },
        { id: 'roblox', name: 'Roblox' },
        { id: 'pubg', name: 'PUBG Mobile' },
        { id: 'fc', name: 'EA Sports FC' }
    ],
    'joki-game': [
        { id: 'ml', name: 'Joki Mobile Legends' },
        { id: 'ff', name: 'Joki Free Fire' },
        { id: 'roblox', name: 'Joki Roblox' }
    ],
    'lainnya': [
        { id: 'bot', name: 'Sewa Bot WA' },
        { id: 'script', name: 'Script' },
        { id: 'app', name: 'Aplikasi Premium' },
        { id: 'jasa', name: 'Jasa Website' }
    ]
};

/* ============================================== */
/* --- INIT: SETUP AWAL --- */
/* ============================================== */
document.addEventListener("DOMContentLoaded", async () => {
    injectCustomElements(); // Inject CSS alert & loading
    initializeDomElements(); // Tangkap elemen ID

    // 1. Handle URL Navigation (Agar refresh tetap di tab yang sama)
    handleUrlNavigation(); 

    // 2. Setup Listeners
    setupFileUploadListener(); // Untuk crop foto profil
    setupSliderSwipe(); // Slider banner home
    
    // 3. Ambil Data User Terbaru
    await refreshUserData(); 

    // 4. Cek Status Login & Update UI
    checkLoginState(); 
    
    // 5. Render Konten Dinamis (Kategori & Produk Publik)
    initDynamicUI();
});

/* ============================================== */
/* --- NAVIGASI & UI UMUM --- */
/* ============================================== */

function initDynamicUI() {
    renderNavbar();
    renderHomeCategories(); // Render kategori statis
    renderPublicProducts(); // Render produk user yang sudah di-acc
}

function handleUrlNavigation() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('p');
    const id = urlParams.get('id');

    // Jika mode detail produk
    if (page === 'detail' && id) {
        // Kita perlu fetch data produk atau ambil dari cache jika memungkinkan
        // Untuk simpelnya, kita akan render detail saat user klik card saja.
        // Jika direfresh di halaman detail, kita balik ke home dulu (karena data produk ada di memory)
        switchMainTab('home', false);
    } else if (page) {
        switchMainTab(page, false);
    } else {
        const lastTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(lastTab, false);
    }
}

function switchMainTab(tabName, pushHistory = true) {
    localStorage.setItem('activeTab', tabName);
    
    // UI Update
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');

    // Bottom Nav Update
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) activeNav.classList.add('active');

    // Tutup Detail Page jika terbuka
    const detailPage = document.getElementById('detail-page');
    if(detailPage) detailPage.classList.remove('active');

    // Special Logic per Tab
    if (tabName === 'produk') fetchUserProducts();
    if (tabName === 'admin') {
         // Default admin tab -> users
         const firstMenu = document.querySelector('.admin-menu-item');
         if(firstMenu) loadAdminTab('users', firstMenu);
    }

    // Update URL Browser
    if (pushHistory) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('p', tabName);
        newUrl.searchParams.delete('id');
        window.history.pushState({path: newUrl.href}, '', newUrl.href);
    }
}

// Fungsi untuk tombol Back di header
function goBack() {
    // Tutup modal detail produk fullscreen jika ada
    const prodModal = document.getElementById('productDetailModal');
    if(prodModal && prodModal.style.display === 'flex') {
        closeProductDetail();
        return;
    }
    
    const detailSection = document.getElementById('detail-page');
    if(detailSection.classList.contains('active')) {
        detailSection.classList.remove('active');
        const lastTab = localStorage.getItem('activeTab') || 'home';
        switchMainTab(lastTab, false);
    } else {
        switchMainTab('home');
    }
}

// Render Menu Navbar Bawah
function renderNavbar() {
    const navContainer = document.querySelector('.bottom-navbar');
    if (!navContainer) return;
    const user = JSON.parse(localStorage.getItem('user'));
    const isOwner = user && isAdmin(user.email);
    const profileImgSrc = (user && user.profilePic) ? user.profilePic : 'https://api.deline.web.id/76NssFHmcI.png';

    // Jika Admin, sembunyikan Transaksi, tampilkan Admin. Jika User biasa sebaliknya.
    const showAdmin = isOwner ? 'flex' : 'none';
    const showTrans = isOwner ? 'none' : 'flex'; // Admin jarang butuh tab transaksi di bawah

    navContainer.innerHTML = `
        <div class="nav-item" id="nav-home" onclick="switchMainTab('home')"><i class="fas fa-home"></i><span>Home</span></div>
        <div class="nav-item" id="nav-transaksi" onclick="switchMainTab('transaksi')" style="display:${showTrans}"><i class="fas fa-exchange-alt"></i><span>Transaksi</span></div>
        <div class="nav-item" id="nav-admin" onclick="switchMainTab('admin')" style="display:${showAdmin}"><i class="fas fa-font"></i><span>Admin</span></div>
        <div class="nav-item center-item" id="nav-profile" onclick="switchMainTab('profile')">
            <div class="floating-circle"><img src="${profileImgSrc}"></div><span>Profile</span>
        </div>
        <div class="nav-item" id="nav-produk" onclick="switchMainTab('produk')"><i class="fas fa-shopping-basket"></i><span>Produk</span></div>
        <div class="nav-item" id="nav-pengaturan" onclick="switchMainTab('pengaturan')"><i class="fas fa-cog"></i><span>Pengaturan</span></div>
    `;
    
    // Set active class
    const activeTab = localStorage.getItem('activeTab') || 'home';
    const el = document.getElementById('nav-'+activeTab);
    if(el) el.classList.add('active');
}

/* ============================================== */
/* --- PRODUCT SYSTEM (FITUR BARU) --- */
/* ============================================== */

/* 1. Open Modal Tambah Produk */
function openAddProductModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Cek Login
    if (!user) {
        showAlert("Silakan Login terlebih dahulu.", "Akses Ditolak");
        return openAuthModal('login');
    }

    // Cek Verifikasi (Wajib Verified)
    if (user.verificationStatus !== 'verified') {
        showAlert("Anda harus memverifikasi akun terlebih dahulu!", "Verifikasi Diperlukan");
        switchMainTab('pengaturan'); // Arahkan ke setting
        return;
    }

    // Reset Form Modal
    document.getElementById('addProductModal').classList.add('active');
    document.getElementById('prodCategory').value = '';
    document.getElementById('subCategoryArea').style.display = 'none';
    document.getElementById('photoUploadGrid').innerHTML = `<div class="photo-add-btn" onclick="triggerProductPhotoUpload()"><i class="fas fa-camera"></i></div>`;
    
    // Reset inputs
    document.getElementById('prodName').value = '';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodPaymentMethod').value = '';
    document.getElementById('prodPaymentNumber').value = '';
    togglePaymentNumber('');

    uploadedProductImages = []; // Kosongkan array foto
    document.querySelectorAll('.cat-select-item').forEach(el => el.classList.remove('active'));
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.remove('active');
}

/* 2. Logic Kategori & Sub Kategori */
function selectProductCategory(cat, element) {
    document.getElementById('prodCategory').value = cat;
    document.querySelectorAll('.cat-select-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Populate Sub Kategori Dropdown
    const subSelect = document.getElementById('prodSubCategory');
    subSelect.innerHTML = "";
    
    if (SUB_CATEGORIES[cat]) {
        SUB_CATEGORIES[cat].forEach(sub => {
            subSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        document.getElementById('subCategoryArea').style.display = 'block';
    } else {
        document.getElementById('subCategoryArea').style.display = 'none';
    }
}

/* 3. Logic Upload Foto Produk (Max 5) */
function triggerProductPhotoUpload() {
    document.getElementById('productPhotoInput').click();
}

// Listener untuk input file produk (di dalam setupListener atau dipanggil langsung)
function setupProductPhotoListener() {
    const input = document.getElementById('productPhotoInput');
    if(!input) return;

    input.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        
        if (uploadedProductImages.length + files.length > 5) {
            return showAlert("Maksimal 5 foto per produk!", "Batas Tercapai");
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const base64 = ev.target.result;
                uploadedProductImages.push(base64);
                renderProductThumbnails();
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset agar bisa pilih file sama jika dihapus
    });
}

function renderProductThumbnails() {
    const grid = document.getElementById('photoUploadGrid');
    let html = `<div class="photo-add-btn" onclick="triggerProductPhotoUpload()"><i class="fas fa-camera"></i></div>`;
    
    uploadedProductImages.forEach((img, index) => {
        html += `<img src="${img}" class="uploaded-thumb" onclick="removeProductPhoto(${index})">`;
    });
    grid.innerHTML = html;
}

function removeProductPhoto(index) {
    if(confirm("Hapus foto ini?")) {
        uploadedProductImages.splice(index, 1);
        renderProductThumbnails();
    }
}

/* 4. Logic Metode Pembayaran */
function togglePaymentNumber(val) {
    const area = document.getElementById('paymentNumberArea');
    area.style.display = val ? 'block' : 'none';
}

/* 5. Submit Produk ke Server */
async function handleSubmitProduct(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    
    const payload = {
        userId: user._id, // ID MongoDB
        category: document.getElementById('prodCategory').value,
        subCategory: document.getElementById('prodSubCategory').value,
        images: uploadedProductImages, 
        name: document.getElementById('prodName').value,
        description: document.getElementById('prodDesc').value,
        price: document.getElementById('prodPrice').value,
        paymentMethod: document.getElementById('prodPaymentMethod').value,
        paymentNumber: document.getElementById('prodPaymentNumber').value
    };

    if (!payload.category) return showAlert("Silakan pilih kategori!", "Data Belum Lengkap");
    if (payload.images.length === 0) {
        // Option: Jika ingin membolehkan tanpa foto, hapus baris ini. 
        // Tapi di prompt "jika tidak memiliki foto tetap bisa di post". 
        // Jadi kita biarkan, tapi backend harus handle default image.
    }

    setLoading('btnAddProdSubmit', true, "TAMBAHKAN");

    try {
        const res = await fetch(`${API_URL}/products/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showAlert("Produk berhasil ditambahkan! Status: Proses Accept.", "Sukses");
            closeAddProductModal();
            fetchUserProducts(); // Refresh list di tab produk
        } else {
            showAlert(data.message || "Gagal upload produk.", "Gagal");
        }
    } catch (e) {
        showAlert("Terjadi kesalahan koneksi.", "Error");
    } finally {
        setLoading('btnAddProdSubmit', false, "TAMBAHKAN");
    }
}

/* 6. Fetch & Render List Produk User (Tab Produk) */
async function fetchUserProducts() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const container = document.getElementById('user-product-list');
    container.innerHTML = `<p style="text-align:center; padding:20px; color:#aaa;"><i class="fas fa-circle-notch fa-spin"></i> Memuat Produk...</p>`;

    try {
        const res = await fetch(`${API_URL}/products/user/${user._id}`);
        const data = await res.json();

        if (data.products && data.products.length > 0) {
            let html = '';
            data.products.forEach(p => {
                let statusClass = 'status-pending';
                let statusText = 'Proses Accept'; // Default
                
                if (p.status === 'approved') { statusClass = 'status-done'; statusText = 'Selesai'; }
                if (p.status === 'rejected') { statusClass = 'status-rejected'; statusText = 'Ditolak'; }

                const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100?text=No+Img';

                html += `
                <div class="user-product-card">
                    <img src="${img}" class="u-prod-img">
                    <div class="u-prod-info">
                        <div class="u-prod-name">${p.name}</div>
                        <div class="u-prod-price">Rp ${parseInt(p.price).toLocaleString()}</div>
                        <div class="u-prod-status ${statusClass}">${statusText}</div>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="empty-state-placeholder">
                    <i class="fas fa-box-open" style="font-size:30px; margin-bottom:10px; color:#ccc;"></i>
                    <p>Anda belum memiliki produk.</p>
                </div>`;
        }
    } catch (e) {
        container.innerHTML = "<p style='text-align:center;'>Gagal memuat produk.</p>";
    }
}

/* 7. Fetch & Render Produk Publik (Home) */
async function renderPublicProducts() {
    // Ambil data produk yang statusnya 'approved'
    try {
        const res = await fetch(`${API_URL}/products/public`);
        const data = await res.json();
        
        if (data.products) {
            const wrapper = document.getElementById('category-wrapper-bg');
            if(!wrapper) return;

            // Cek apakah container produk user sudah ada, jika belum buat baru di paling atas atau bawah
            let userSection = document.getElementById('user-public-products');
            
            // Logic: Kita append di bawah kategori static
            if (!userSection) {
                userSection = document.createElement('div');
                userSection.id = 'user-public-products';
                userSection.className = 'category-card';
                userSection.style.marginTop = "15px";
                userSection.innerHTML = `
                    <div class="category-header"><i class="fas fa-store icon-akun"></i> Marketplace User</div>
                    <div class="public-prod-grid" id="public-prod-grid-content"></div>
                `;
                wrapper.appendChild(userSection);
            }

            const gridContent = document.getElementById('public-prod-grid-content');
            let html = '';
            
            data.products.forEach(p => {
                const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/150x150?text=No+Img';
                // Encode object produk ke string JSON agar bisa dipassing ke fungsi onclick
                const pJson = encodeURIComponent(JSON.stringify(p));
                
                html += `
                <div class="public-prod-card" onclick="openProductDetail('${pJson}')">
                    <div class="prod-img-box"><img src="${img}"></div>
                    <div class="prod-details">
                        <div class="prod-title">${p.name}</div>
                        <div class="prod-desc-trunc">${p.description}</div>
                        <div class="prod-price">Rp ${parseInt(p.price).toLocaleString()}</div>
                    </div>
                </div>`;
            });

            if (data.products.length === 0) {
                html = '<p style="padding:10px; font-size:12px; color:#999; text-align:center; width:200%;">Belum ada produk user.</p>';
            }
            
            gridContent.innerHTML = html;
        }
    } catch (e) {
        console.log("Error fetching public products");
    }
}

/* 8. Detail Produk (Fullscreen Modal) */
function openProductDetail(productJson) {
    const product = JSON.parse(decodeURIComponent(productJson));
    const modal = document.getElementById('productDetailModal');
    
    const img = (product.images && product.images.length > 0) ? product.images[0] : 'https://placehold.co/300x300';
    
    document.getElementById('detailProdImg').src = img;
    document.getElementById('detailProdName').innerText = product.name;
    document.getElementById('detailProdPrice').innerText = "Rp " + parseInt(product.price).toLocaleString();
    document.getElementById('detailProdDesc').innerText = product.description;
    document.getElementById('detailProdSeller').innerText = product.username || "User";

    // Counter Badge jika lebih dari 1 foto (Logic sederhana)
    const badge = document.getElementById('imgCounterBadge');
    if (product.images && product.images.length > 1) {
        badge.innerText = `1/${product.images.length}`;
        badge.style.display = 'block';
        // Note: Logic swipe foto detail bisa ditambahkan nanti
    } else {
        badge.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeProductDetail() {
    document.getElementById('productDetailModal').style.display = 'none';
}

function viewFullImage(src) {
    // Optional: Bisa tambah logic zoom gambar
}

function buyProductAction() {
    showAlert("Belum tersedia", "Info Pembelian"); // Alert sesuai request
}

/* ============================================== */
/* --- ADMIN DASHBOARD LOGIC (UPDATED) --- */
/* ============================================== */

// Override fungsi loadAdminTab untuk support tab 'acc'
function loadAdminTab(tab, element) {
    // Update active UI
    document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');

    const container = document.getElementById('admin-content-area');
    container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    if (tab === 'users') fetchAdminUsers();
    else if (tab === 'verif') fetchAdminVerifications();
    else if (tab === 'acc') fetchAdminProductApprovals(); // Fitur Baru
    else if (tab === 'chat') container.innerHTML = `<div class="empty-state-placeholder"><p>Fitur Chat segera hadir.</p></div>`;
    else container.innerHTML = `<div class="empty-state-placeholder"><p>Menu kosong.</p></div>`;
}

// Fetch Produk Pending (Acc)
async function fetchAdminProductApprovals() {
    try {
        const res = await fetch(`${API_URL}/admin/products/pending`);
        const data = await res.json();
        renderAdminProductList(data.products);
    } catch (e) {
        document.getElementById('admin-content-area').innerHTML = "Error fetching products.";
    }
}

function renderAdminProductList(products) {
    const container = document.getElementById('admin-content-area');
    if (!products || products.length === 0) {
        container.innerHTML = `<div class="empty-state-placeholder"><i class="fas fa-check-circle"></i><p>Tidak ada produk menunggu approval.</p></div>`;
        return;
    }

    let html = `<div class="admin-list-container">`;
    products.forEach(p => {
        const uniqueId = `prod_acc_${p._id}`;
        const img = (p.images && p.images.length > 0) ? p.images[0] : null;
        
        html += `
            <div class="admin-acc-item warning-border">
                <div class="admin-acc-header" onclick="toggleAccordion('${uniqueId}')">
                    <span class="acc-title"><i class="fas fa-box"></i> ${p.username}</span>
                    <i class="fas fa-chevron-down acc-icon"></i>
                </div>
                <div id="${uniqueId}" class="admin-acc-body" style="display:none;">
                    <div style="text-align:center; margin-bottom:10px;">
                        ${img ? `<img src="${img}" style="width:80px; height:80px; object-fit:cover; border-radius:5px; border:1px solid #ddd;">` : 'No Image'}
                    </div>
                    <div class="acc-row"><span>Barang:</span> <b>${p.name}</b></div>
                    <div class="acc-row"><span>Kategori:</span> <b>${p.category} (${p.subCategory})</b></div>
                    <div class="acc-row"><span>Harga:</span> <b>Rp ${parseInt(p.price).toLocaleString()}</b></div>
                    <div class="acc-row"><span>Ket:</span> <div style="max-width:200px; font-size:11px; text-align:right;">${p.description}</div></div>
                    
                    <div class="acc-actions">
                         <button class="btn-acc-action approve" onclick="adminProductAction('${p._id}', 'approve')">Setuju</button>
                         <button class="btn-acc-action reject" onclick="adminProductAction('${p._id}', 'reject')">Tolak</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

async function adminProductAction(productId, action) {
    if(!confirm(`Yakin ingin ${action === 'approve' ? 'Menyetujui' : 'Menolak'} produk ini?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/admin/products/action`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId, action })
        });
        const data = await res.json();
        if(data.success) {
            showAlert(data.message, "Sukses");
            fetchAdminProductApprovals(); // Refresh list
        } else {
            showAlert("Gagal memproses.", "Error");
        }
    } catch(e) { showAlert("Server Error", "Error"); }
}

/* --- ADMIN USERS & VERIFICATIONS (EXISTING) --- */

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        renderAdminUserList(data.users);
    } catch (e) { document.getElementById('admin-content-area').innerText = "Error fetch users."; }
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
    } catch (e) { document.getElementById('admin-content-area').innerText = "Error."; }
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

async function adminVerifyAction(userId, action) {
    if(!confirm(`Yakin ingin ${action === 'approve' ? 'Menerima' : 'Menolak'} verifikasi user ini?`)) return;
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
        if(await res.json().success) fetchAdminUsers();
    } catch(e){}
}

/* ============================================== */
/* --- SYSTEM & HELPERS --- */
/* ============================================== */

function injectCustomElements() {
    // Inject CSS styles untuk alert dan loading button jika belum ada di css
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
    boxAdminEdit = document.getElementById('adminEditUserModal');
    boxVerification = document.getElementById('verificationModal');
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
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i>`;
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

function toggleAccordion(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

function goToPage(pageId, titleName) {
    // Fungsi ini dipanggil dari card home (static)
    // Untuk simplifikasi, jika id tidak ada di tab menu, kita ignore atau buat custom logic
    // Disini kita alihkan ke tab yang relevan atau alert jika belum ada
    if(pageId.startsWith('topup') || pageId.startsWith('joki')) {
        // Tampilkan alert karena ini hanya demo UI untuk static categories
        showAlert("Kategori " + titleName + " belum memiliki konten dinamis di demo ini. Coba cek kategori 'Lainnya' atau Produk User.", "Info");
    } else {
        // Fallback
        switchMainTab('home');
    }
}

function renderHomeCategories() {
    // Fungsi ini untuk render kategori statis yang ada di home
    // Sesuai kode lama, datanya ada di HOME_CATEGORIES. 
    // Kita render ulang agar bersih.
    const HOME_CATEGORIES = [
        {
            title: "Akun Game", icon: "fa-user-circle", colorClass: "icon-akun",
            items: [
                { id: 'akun-roblox', name: 'Roblox', img: 'https://api.deline.web.id/zQxSf6aiv7.jpg' },
                { id: 'akun-ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
                { id: 'akun-ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' }
            ]
        },
        {
            title: "Top Up Game", icon: "fa-gem", colorClass: "icon-topup",
            items: [
                { id: 'topup-ml', name: 'Mobile Legends', img: 'https://api.deline.web.id/u8m7Yq2Pdu.jpg' },
                { id: 'topup-ff', name: 'Free Fire', img: 'https://api.deline.web.id/BqQnrJVNPO.jpg' }
            ]
        }
    ];

    const wrapper = document.getElementById('category-wrapper-bg');
    if(!wrapper) return;

    // Bersihkan dulu tapi sisakan container produk user jika ada
    const existingUserProd = document.getElementById('user-public-products');
    wrapper.innerHTML = '';
    
    let html = '';
    HOME_CATEGORIES.forEach(cat => {
        html += `
        <div class="category-card">
            <div class="category-header"><i class="fas ${cat.icon} ${cat.colorClass}"></i> ${cat.title}</div>
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
    
    wrapper.innerHTML = html;
    
    // Append balik container user products jika sudah pernah dibuat
    if(existingUserProd) wrapper.appendChild(existingUserProd);
}

/* ============================================== */
/* --- AUTH FLOW (LOGIN, REGISTER, OTP) --- */
/* ============================================== */

function openAuthModal(type) {
    document.getElementById('authOverlay').classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    
    if(type === 'login') {
        document.getElementById('loginBox').style.display = 'block';
    } else if(type === 'register') { 
        document.getElementById('registerBox').style.display = 'block'; 
        authMode = 'register'; 
    }
}

function closeAuthModal() {
    document.getElementById('authOverlay').classList.remove('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
}

function switchAuth(type) { openAuthModal(type); }

function togglePass(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
}

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
            switchMainTab('home'); // Redirect ke home
            showAlert("Selamat datang!", "Login Sukses");
        } else {
            showAlert(data.message || "Username/Password Salah", "Login Gagal");
        }
    } catch(e){
        showAlert("Gagal terhubung ke server.", "Error");
    } finally {
        setLoading('btnLoginBtn', false, "LOGIN");
    }
}

async function handleRegisterRequest(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;

    if(password !== confirm) return showAlert("Password tidak cocok!", "Error");

    setLoading('btnRegBtn', true, "DAFTAR");
    tempRegisterData = { username, email, phone, password };

    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, phone, type: 'register' })
        });
        const data = await res.json();

        if(data.success) {
            document.getElementById('registerBox').style.display = 'none';
            document.getElementById('otpBox').style.display = 'block';
            document.getElementById('otpTextEmail').innerText = `Kode OTP dikirim ke ${email}`;
        } else {
            showAlert(data.message || "Gagal Daftar", "Error");
        }
    } catch(e){
        showAlert("Error Server", "Error");
    } finally {
        setLoading('btnRegBtn', false, "DAFTAR");
    }
}

async function handleVerifyOtp() {
    const otp = document.getElementById('otpInputLong').value;
    if (!otp || otp.length < 6) return showAlert("Masukkan 6 digit kode!", "Error");

    setLoading('btnVerifyBtn', true, "VERIFIKASI");

    try {
        const res = await fetch(`${API_URL}/register-verify`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({...tempRegisterData, otp})
        });
        const data = await res.json();

        if(data.success) {
            // Auto login setelah register
            const loginRes = await fetch(`${API_URL}/login`, {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({loginInput: tempRegisterData.username, password: tempRegisterData.password})
            });
            const loginData = await loginRes.json();
            
            if(loginData.success) {
                localStorage.setItem('user', JSON.stringify(loginData.userData));
                closeAuthModal();
                checkLoginState();
                switchMainTab('home');
                showAlert("Akun berhasil dibuat!", "Sukses");
            } else {
                switchAuth('login');
            }
        } else {
            showAlert("Kode OTP Salah!", "Gagal");
        }
    } catch(e){
        showAlert("Error Server", "Error");
    } finally {
        setLoading('btnVerifyBtn', false, "VERIFIKASI");
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
    } catch (e) { console.error(e); }
}

/* ============================================== */
/* --- USER PROFILE & VERIFICATION LOGIC --- */
/* ============================================== */

function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');
    
    // Update navbar
    renderNavbar(); 

    if (userSession) {
        const user = JSON.parse(userSession);
        const isOwner = isAdmin(user.email);
        
        let headerAvatar = `<div style="width:35px; height:35px; border-radius:50%; background:white; color:#205081; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
        if (user.profilePic) headerAvatar = `<img src="${user.profilePic}" class="profile-pic">`;

        headerAuthArea.innerHTML = `<div class="header-user-area" onclick="switchMainTab('profile')"><span class="user-name-header">${user.username}</span>${headerAvatar}</div>`;
        renderProfileAndSettings(true, user, isOwner);
        
    } else {
        headerAuthArea.innerHTML = `<button class="btn-login-header" onclick="openAuthModal('login')"><i class="fas fa-user-circle"></i> Masuk / Daftar</button>`;
        renderProfileAndSettings(false, null, false);
    }
}

function renderProfileAndSettings(isLoggedIn, user, isOwner) {
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    
    const loginPromptHTML = `
        <div class="auth-required-state">
            <i class="fas fa-lock lock-icon"></i><p>Silakan Login untuk mengakses halaman ini.</p>
            <button class="btn-center-login" onclick="openAuthModal('login')"><i class="fas fa-sign-in-alt"></i> LOGIN / DAFTAR</button>
        </div>`;

    if (!isLoggedIn) {
        if(profileContent) profileContent.innerHTML = loginPromptHTML;
        if(settingsContent) settingsContent.innerHTML = loginPromptHTML;
        return;
    }

    const userInitial = user.username.charAt(0).toUpperCase();

    // --- PROFILE PAGE ---
    if(profileContent) {
        const avatarDisplay = user.profilePic ? `<img src="${user.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : userInitial;
        profileContent.innerHTML = `
            <div class="profile-view-header">
                <div class="profile-view-avatar">${avatarDisplay}</div>
                <div style="color:white; margin-top:10px; font-weight:bold;">${user.username}</div>
                <div style="color:#dbeafe; font-size:12px; margin-top:2px;">Member sejak: ${formatDate(user.createdAt)}</div>
                ${isOwner ? '<div class="badge-admin-website" style="margin-top:10px;">ADMIN</div>' : ''}
            </div>
            <div class="profile-details-card">
                <div class="detail-row"><span class="detail-label">Username</span><span class="detail-value">${user.username}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email}</span></div>
                <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="color:${user.verificationStatus === 'verified' ? 'green' : 'orange'}">${user.verificationStatus || 'unverified'}</span></div>
            </div>`;
    }

    // --- PENGATURAN PAGE ---
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
                        ${badgeHtml} 
                    </div>

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
                            <label class="form-label">Status Akun</label>
                             ${verificationActionArea || '<div style="font-size:12px;color:green;font-weight:bold;">Akun Terverifikasi</div>'}
                        </div>
                    </div>
                </div>
                <div class="logout-area" style="padding: 0 10px;">
                    <button class="btn-logout-bottom" onclick="logoutUser()"><i class="fas fa-sign-out-alt"></i> KELUAR AKUN</button>
                </div>
            </div>`;
    }
}

function logoutUser() {
    localStorage.removeItem('user');
    checkLoginState(); 
    switchMainTab('home'); 
    showAlert("Anda berhasil keluar.", "Logout");
}

/* --- VERIFIKASI AKUN (MODAL) --- */
function openVerificationModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;
    document.getElementById('authOverlay').classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    document.getElementById('verificationModal').style.display = 'block';

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
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                email: newEmail, username: newUsername, phone: newPhone, type: 'verification_update' 
            })
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
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                originalEmail: user.email,
                newUsername, newEmail, newPhone, otp
            })
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

/* --- ADMIN EDIT USER MODAL --- */
function openAdminEditModal(user) {
    document.getElementById('authOverlay').classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    document.getElementById('adminEditUserModal').style.display='block';
    
    document.getElementById('editUserId').value = user._id;
    document.getElementById('editUserUsername').value = user.username;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone;
    document.getElementById('editUserPass').value = user.password;
}

function closeAdminEditModal() { document.getElementById('authOverlay').classList.remove('active'); }

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
/* --- CROPPER UTILS & SLIDER --- */
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
    setupProductPhotoListener(); // Setup listener foto produk juga
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