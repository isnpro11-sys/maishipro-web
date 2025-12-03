/* ============================================== */
/* --- KONFIGURASI BACKEND (WAJIB JALAN) --- */
/* ============================================== */
const API_URL = "/api"; 

// --- KONFIGURASI ADMIN ---
// Masukkan email owner/admin di sini. Jika login pakai email ini, tampilan akan berubah jadi Admin.
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

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
const boxForgot = document.getElementById('forgotBox'); // Opsional jika ada di HTML
const boxReset = document.getElementById('resetPassBox'); // Opsional jika ada di HTML
const boxChangePass = document.getElementById('changePassModal');
const boxAdminEdit = document.getElementById('adminEditUserModal');

/* ============================================== */
/* --- INIT: CEK LOGIN & SETUP --- */
/* ============================================== */
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    setupOtpInputs(); 
    setupFileUploadListener(); // Init listener upload foto
    setupSliderSwipe(); // Init Slider Manual & Swipe

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

// 1. Cek Admin
function isAdmin(email) {
    return ADMIN_EMAILS.includes(email);
}

// 2. Format Tanggal
function formatDate(dateString) {
    if(!dateString) return "-";
    try {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateString;
    }
}

// 3. Validasi Password
function isValidPassword(pass) {
    const minLength = 9;
    const hasUpperCase = /[A-Z]/.test(pass); 
    const hasNumber = /\d/.test(pass);       
    return pass.length >= minLength && hasUpperCase && hasNumber;
}

// 4. Validasi Username
function isValidUsername(user) {
    return user && user.length >= 4;
}

/* ============================================== */
/* --- FUNGSI NAVIGASI UTAMA (TAB & SPA) --- */
/* ============================================== */
const detailSection = document.getElementById('detail-page');
const pageTitle = document.getElementById('page-title');

function switchMainTab(tabName) {
    localStorage.setItem('activeTab', tabName);
    
    // Reset Tampilan
    detailSection.classList.remove('active');
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    // Aktifkan Tab Tujuan
    const target = document.getElementById(tabName + '-page');
    if (target) target.classList.add('active');

    // Update Navigasi Bawah
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) activeNav.classList.add('active');

    // Jika masuk tab Admin, load default sub-menu
    if(tabName === 'admin') {
        const firstMenu = document.querySelector('.admin-menu-item'); 
        if(firstMenu) loadAdminTab('users', firstMenu);
    }

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
function setupSliderSwipe() {
    const wrapper = document.getElementById('slider-wrapper');
    const container = document.getElementById('slider-container');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = 3;
    let currentIndex = 0;
    let autoSlideInterval;
    let startX = 0;
    let endX = 0;

    if(!wrapper || !container) return;

    function updateSlider() {
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
        const isOwner = isAdmin(user.email);
        
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

        renderAuthPages(true, user, isOwner);
        toggleAdminNav(isOwner);

    } else {
        // --- BELUM LOGIN ---
        headerAuthArea.innerHTML = `
            <button class="btn-login-header" onclick="openAuthModal('login')">
                <i class="fas fa-user-circle"></i> Masuk / Daftar
            </button>
        `;
        renderAuthPages(false, null, false);
        toggleAdminNav(false);
    }
}

// Switch Navbar Bawah (Admin vs User Biasa)
function toggleAdminNav(isOwner) {
    const navTrans = document.getElementById('nav-transaksi');
    const navAdmin = document.getElementById('nav-admin');

    if (isOwner) {
        if(navTrans) navTrans.style.display = 'none'; // Sembunyikan Transaksi
        if(navAdmin) navAdmin.style.display = 'flex'; // Tampilkan Admin (A)
    } else {
        if(navTrans) navTrans.style.display = 'flex';
        if(navAdmin) navAdmin.style.display = 'none';
    }
}

// Render Halaman Berdasarkan Login
function renderAuthPages(isLoggedIn, user, isOwner) {
    const transContent = document.getElementById('transaksi-content');
    const profileContent = document.getElementById('profile-content');
    const settingsContent = document.getElementById('pengaturan-content');
    const produkContent = document.getElementById('produk-content');
    const navProfileImg = document.querySelector('.floating-circle');
    
    const userInitial = user ? user.username.charAt(0).toUpperCase() : '?';

    // Prompt Login
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
        if(navProfileImg) navProfileImg.innerHTML = `<img src="https://api.deline.web.id/76NssFHmcI.png">`;

    } else {
        // --- LOGIKA SUDAH LOGIN ---

        // 1. Update Navbar Bottom
        if(navProfileImg) {
            if (user.profilePic) {
                navProfileImg.innerHTML = `<img src="${user.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                navProfileImg.innerHTML = `
                <div style="width:100%; height:100%; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#205081; font-weight:bold; font-size:20px; border:2px solid #eee;">
                    ${userInitial}
                </div>`;
            }
        }

        // 2. Halaman Transaksi (Hanya User Biasa)
        if(transContent && !isOwner) {
            transContent.innerHTML = `
                <div class="empty-page" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-receipt" style="font-size:40px; margin-bottom:10px;"></i>
                    <p>Halo <b>${user.username}</b>, belum ada riwayat transaksi.</p>
                </div>
            `;
        }

        // 3. Halaman PROFIL (Admin vs Member)
        if(profileContent) {
            const avatarDisplay = user.profilePic 
                ? `<img src="${user.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : userInitial;

            // Logic Badge: Admin Website atau Level Biasa
            let badgeHTML = `
                <div class="detail-row">
                    <span class="detail-label">Member Level</span>
                    <span class="level-badge" style="background:#205081; color:white;">BASIC</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Penjual Level</span>
                    <span class="level-badge" style="background:#27ae60; color:white;">${user.sellerLevel || 'Newbie'}</span>
                </div>`;

            if(isOwner) {
                badgeHTML = `
                <div class="detail-row" style="justify-content:center; border:none; margin-top:10px;">
                    <span class="badge-admin-website"><i class="fas fa-shield-alt"></i> ADMIN WEBSITE</span>
                </div>`;
            }

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
                    ${badgeHTML}
                </div>
            `;
        }

        // 4. Halaman PENGATURAN (Admin bisa edit langsung)
        if(settingsContent) {
            const avatarDisplay = user.profilePic 
                ? `<img src="${user.profilePic}" class="avatar-circle-display" style="border:none;">`
                : `<div class="avatar-circle-display">${userInitial}</div>`;

            // Tentukan apakah input bisa diedit
            const readOnlyAttr = isOwner ? '' : 'readonly';
            const inputClass = isOwner ? 'form-input-styled' : 'form-input-styled permanent';
            const passwordField = isOwner 
                ? `<input type="text" class="form-input-styled" value="${user.password}" placeholder="Password (Teks Biasa)">` 
                : `<div class="form-input-styled clickable" onclick="openChangePassModal()"><span>••••••••</span><i class="fas fa-pen" style="color:#205081; font-size:12px;"></i></div>`;

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
                            ${isOwner ? '<p style="text-align:center; color:#205081; font-size:12px; margin-bottom:10px;">(Mode Admin: Edit data langsung)</p>' : ''}
                            
                            <div class="form-group-styled">
                                <label class="form-label">Username</label>
                                <input type="text" class="${inputClass}" value="${user.username}" ${readOnlyAttr}>
                            </div>

                            <div class="form-group-styled">
                                <label class="form-label">Email <i class="fas fa-lock" style="font-size:10px; margin-left:5px;"></i></label>
                                <input type="text" class="${inputClass}" value="${user.email}" ${readOnlyAttr}>
                            </div>

                            <div class="form-group-styled">
                                <label class="form-label">Nomor WhatsApp <i class="fas fa-lock" style="font-size:10px; margin-left:5px;"></i></label>
                                <input type="text" class="${inputClass}" value="${user.phone}" ${readOnlyAttr}>
                            </div>

                            <div class="form-group-styled">
                                <label class="form-label">Password</label>
                                ${passwordField}
                            </div>
                            
                            ${isOwner ? '<button class="btn-auth-action" onclick="alert(\'Simpan Profile Admin: Fitur ini simulasi.\')">SIMPAN PERUBAHAN</button>' : ''}
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
/* --- ADMIN DASHBOARD LOGIC (BARU) --- */
/* ============================================== */

// Switch Sub-Tab Admin
function loadAdminTab(tab, element) {
    // Style Active Button
    document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');

    const container = document.getElementById('admin-content-area');
    container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-circle-notch fa-spin"></i> Loading Data...</div>`;

    if (tab === 'users') {
        fetchAdminUsers();
    } else if (tab === 'verif' || tab === 'chat' || tab === 'acc') {
        container.innerHTML = `
            <div class="empty-state-placeholder">
                <i class="fas fa-folder-open" style="font-size: 40px; margin-bottom: 15px; color:#ccc;"></i>
                <p>Halaman <b>${tab.toUpperCase()}</b> saat ini kosong.</p>
            </div>`;
    }
}

// 1. Fetch Users
async function fetchAdminUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        
        if(data.success) {
            renderUserList(data.users);
        } else {
            document.getElementById('admin-content-area').innerHTML = "Gagal memuat data.";
        }
    } catch (e) {
        document.getElementById('admin-content-area').innerHTML = "Error koneksi.";
    }
}

// 2. Render List User
function renderUserList(users) {
    const container = document.getElementById('admin-content-area');
    if(users.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px;">Belum ada user.</p>`;
        return;
    }

    let html = `<div class="admin-user-list">`;
    users.forEach(u => {
        html += `
            <div class="user-card-admin">
                <div class="user-card-row"><span class="u-label">Username</span><span class="u-value">${u.username}</span></div>
                <div class="user-card-row"><span class="u-label">Email</span><span class="u-value">${u.email}</span></div>
                <div class="user-card-row"><span class="u-label">No. WA</span><span class="u-value">${u.phone}</span></div>
                <div class="user-card-row"><span class="u-label">Password</span><span class="u-value" style="color:#e74c3c;">${u.password}</span></div>
                <div class="user-card-row"><span class="u-label">Daftar</span><span class="u-value">${formatDate(u.createdAt)}</span></div>
                
                <div class="admin-card-actions">
                    <button class="btn-admin-action btn-edit-user" onclick='openAdminEditModal(${JSON.stringify(u)})'>
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-admin-action btn-del-user" onclick="deleteUser('${u._id}', '${u.username}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// 3. Delete User
async function deleteUser(id, name) {
    if(!confirm(`Yakin ingin menghapus user ${name}?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) { alert("User dihapus."); fetchAdminUsers(); }
        else alert("Gagal hapus.");
    } catch(e) { alert("Error server."); }
}

// 4. Edit User (Modal)
function openAdminEditModal(user) {
    document.getElementById('authOverlay').classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    document.getElementById('adminEditUserModal').style.display='block';

    // Isi form
    document.getElementById('editUserId').value = user._id;
    document.getElementById('editUserUsername').value = user.username;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone;
    document.getElementById('editUserPass').value = user.password;
}

function closeAdminEditModal() {
    document.getElementById('authOverlay').classList.remove('active');
}

// 5. Submit Edit User
async function handleAdminUpdateUser(e) {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const btn = document.getElementById('btnAdminSave');

    const payload = {
        username: document.getElementById('editUserUsername').value,
        email: document.getElementById('editUserEmail').value,
        phone: document.getElementById('editUserPhone').value,
        password: document.getElementById('editUserPass').value
    };

    btn.innerText = "Menyimpan..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            alert("Data user berhasil diupdate!");
            closeAdminEditModal();
            fetchAdminUsers(); // Refresh list
        } else {
            alert("Gagal update: " + data.message);
        }
    } catch(e) { alert("Error Server"); }
    finally { btn.innerText = "SIMPAN PERUBAHAN"; btn.disabled = false; }
}

/* ============================================== */
/* --- FITUR: UPLOAD & CROP FOTO PROFIL --- */
/* ============================================== */

function setupFileUploadListener() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imageElement = document.getElementById('imageToCrop');
                    if (imageElement) {
                        imageElement.src = event.target.result;
                        openCropModal();
                    }
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }
}

function triggerFileUpload() {
    document.getElementById('fileInput').click();
}

function openCropModal() {
    const modal = document.getElementById('cropModal');
    modal.style.display = 'flex';
    const image = document.getElementById('imageToCrop');
    if(cropper) { cropper.destroy(); }
    cropper = new Cropper(image, {
        aspectRatio: 1, viewMode: 1, autoCropArea: 1, dragMode: 'move', responsive: true
    });
}

function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
}

function saveCropImage() {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 300, height: 300, fillColor: '#fff' });
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    updateProfilePicOnServer(base64Image);
}

async function updateProfilePicOnServer(base64Image) {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;
    
    const btn = document.querySelector('.btn-save'); 
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    try {
        const res = await fetch(`${API_URL}/update-pic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, imageBase64: base64Image })
        });
        const data = await res.json();
        
        if(data.success) {
            user.profilePic = base64Image;
            localStorage.setItem('user', JSON.stringify(user));
            alert("Foto Profil Berhasil Diubah!");
            closeCropModal();
            checkLoginState(); 
        } else {
            alert("Gagal upload foto: " + data.message);
        }
    } catch (e) { alert("Error koneksi server."); } 
    finally { if(btn) { btn.innerText = "Simpan"; btn.disabled = false; } }
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
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');

    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') { boxReg.style.display = 'block'; authMode = 'register'; }
    if(type === 'otp') {
        boxOtp.style.display = 'block';
        setTimeout(() => document.querySelector('.otp-field').focus(), 100);
    }
    if(type === 'forgot') { if(boxForgot) boxForgot.style.display = 'block'; authMode = 'forgot'; }
    if(type === 'reset') if(boxReset) boxReset.style.display = 'block';
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

    if (!isValidUsername(username)) return alert("Username minimal 4 karakter!");
    if (!isValidPassword(password)) return alert("Password harus minimal 9 karakter, mengandung huruf BESAR, dan Angka!");
    if (password !== confirm) return alert("Password konfirmasi tidak cocok!");

    tempRegisterData = { username, email, phone, password };
    currentEmail = email;
    authMode = 'register';
    btn.innerText = "Mengecek Data..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, phone, type: 'register' })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('otpTextEmail').innerText = `Kode OTP dikirim ke ${email}`;
            switchAuth('otp');
        } else { alert(data.message || "Gagal mengirim OTP"); }
    } catch (err) { alert("Gagal terhubung ke Server."); } 
    finally { btn.innerText = "DAFTAR"; btn.disabled = false; }
}

function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-field');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value !== "" && index < inputs.length - 1) inputs[index + 1].focus();
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
                switchAuth('login');
            } else { alert(data.message || "Kode OTP Salah!"); }
        }
    } catch (err) { alert("Terjadi kesalahan sistem."); }
    finally { btn.innerText = "VERIFIKASI"; btn.disabled = false; }
}

/* ============================================== */
/* --- LOGIN LOGIC --- */
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
            closeAuthModal();
            localStorage.setItem('user', JSON.stringify(data.userData));
            
            // Cek Apakah Admin
            if (isAdmin(data.userData.email)) {
                alert(`Selamat Datang Admin: ${data.userData.username}`);
                switchMainTab('admin'); // Masuk Tab Admin
            } else {
                alert(`Selamat datang, ${data.userData.username}!`);
                switchMainTab('home'); // Masuk Tab Home
            }
            checkLoginState(); 
        } else {
            alert(data.message || "Login Gagal");
        }
    } catch (err) { alert("Gagal login. Cek koneksi server."); }
    finally { btn.innerText = "LOGIN"; btn.disabled = false; }
}

/* ============================================== */
/* --- CHANGE PASSWORD (USER BIASA) --- */
/* ============================================== */

function openChangePassModal() {
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    document.getElementById('authOverlay').classList.add('active');
    document.getElementById('changePassModal').style.display = 'block';
}

async function handleChangePassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPass').value;
    if (!isValidPassword(newPass)) return alert("Password Baru: Min 9 char, 1 Besar, 1 Angka!");
    
    alert("Simulasi: Password Berhasil Diubah! Silakan login ulang.");
    logoutUser();
}
