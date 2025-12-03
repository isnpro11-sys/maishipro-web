/* ============================================== */
/* --- KONFIGURASI BACKEND (WAJIB JALAN) --- */
/* ============================================== */
const API_URL = "/api"; 

// --- KONFIGURASI ADMIN ---
const ADMIN_EMAILS = ["ilyassyuhada00@gmail.com", "admin@gmail.com"]; 

/* --- VARIABLES --- */
let tempRegisterData = {}; 
let authMode = 'register'; 
let currentEmail = ''; 
let cropper = null; 

/* DOM Elements Global */
const authOverlay = document.getElementById('authOverlay');
const boxLogin = document.getElementById('loginBox');
const boxReg = document.getElementById('registerBox');
const boxOtp = document.getElementById('otpBox');
const boxForgot = document.getElementById('forgotBox'); 
const boxChangePass = document.getElementById('changePassModal');
const boxAdminEdit = document.getElementById('adminEditUserModal');

// Modal Baru: Verifikasi User
const boxVerification = document.getElementById('verificationModal');

/* ============================================== */
/* --- INIT: CEK LOGIN & SETUP --- */
/* ============================================== */
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

/* ============================================== */
/* --- HELPER FUNCTIONS --- */
/* ============================================== */
function isAdmin(email) { return ADMIN_EMAILS.includes(email); }

function formatDate(dateString) {
    if(!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return dateString; }
}

function isValidPassword(pass) {
    const minLength = 9;
    const hasUpperCase = /[A-Z]/.test(pass); 
    const hasNumber = /\d/.test(pass);       
    return pass.length >= minLength && hasUpperCase && hasNumber;
}

function isValidUsername(user) { return user && user.length >= 4; }

/* ============================================== */
/* --- NAVIGASI --- */
/* ============================================== */
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
    pageTitle.innerText = titleName ? titleName : (localStorage.getItem('currentTitle') || 'Detail');
}

function goBack() {
    history.pushState("", document.title, window.location.pathname + window.location.search);
    detailSection.classList.remove('active');
    switchMainTab(localStorage.getItem('activeTab') || 'home');
}

/* ============================================== */
/* --- SLIDER SWIPE --- */
/* ============================================== */
function setupSliderSwipe() {
    // (Kode slider sama seperti sebelumnya)
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
/* --- LOGIN STATE & RENDER UI --- */
/* ============================================== */

function checkLoginState() {
    const userSession = localStorage.getItem('user');
    const headerAuthArea = document.getElementById('headerAuthArea');

    if (userSession) {
        const user = JSON.parse(userSession);
        const isOwner = isAdmin(user.email);
        
        let headerAvatar = `<div style="width:35px; height:35px; border-radius:50%; background:white; color:#205081; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>`;
        if (user.profilePic) headerAvatar = `<img src="${user.profilePic}" class="profile-pic">`;

        headerAuthArea.innerHTML = `<div class="header-user-area" onclick="switchMainTab('profile')"><span class="user-name-header">${user.username}</span>${headerAvatar}</div>`;
        renderAuthPages(true, user, isOwner);
        toggleAdminNav(isOwner);
    } else {
        headerAuthArea.innerHTML = `<button class="btn-login-header" onclick="openAuthModal('login')"><i class="fas fa-user-circle"></i> Masuk / Daftar</button>`;
        renderAuthPages(false, null, false);
        toggleAdminNav(false);
    }
}

function toggleAdminNav(isOwner) {
    const navTrans = document.getElementById('nav-transaksi');
    const navAdmin = document.getElementById('nav-admin');
    if (isOwner) {
        if(navTrans) navTrans.style.display = 'none';
        if(navAdmin) navAdmin.style.display = 'flex';
    } else {
        if(navTrans) navTrans.style.display = 'flex';
        if(navAdmin) navAdmin.style.display = 'none';
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
                </div>
                <div class="profile-details-card">
                    <div class="detail-row"><span class="detail-label">Username</span><span class="detail-value">${user.username}</span></div>
                    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email}</span></div>
                    <div class="detail-row"><span class="detail-label">Level</span><span class="level-badge" style="background:#205081; color:white;">BASIC</span></div>
                </div>`;
        }

        // --- PENGATURAN PAGE (MODIFIED FOR VERIFICATION) ---
        if(settingsContent) {
            const avatarDisplay = user.profilePic 
                ? `<img src="${user.profilePic}" class="avatar-circle-display" style="border:none;">`
                : `<div class="avatar-circle-display">${userInitial}</div>`;

            // Logika Status Verifikasi
            const status = user.verificationStatus || 'unverified'; // unverified, pending, verified, rejected
            let badgeHtml = '';
            let isLocked = false;
            let verifyButtonHtml = '';
            let statusText = 'Belum Verifikasi';

            if (status === 'verified') {
                badgeHtml = `<div class="status-badge green">Terverifikasi</div>`;
                isLocked = true;
                statusText = ''; // Hilang jika sudah verif
            } else if (status === 'pending') {
                badgeHtml = `<div class="status-badge yellow">Proses Verifikasi</div>`;
                isLocked = true; 
                statusText = 'Proses Verifikasi';
            } else if (status === 'rejected') {
                badgeHtml = `<div class="status-badge red">Verifikasi Ditolak</div>`;
                isLocked = false;
                statusText = 'Ditolak (Coba Lagi)';
                verifyButtonHtml = `<button class="btn-verify-mini" onclick="openVerificationModal()">Verifikasi</button>`;
            } else {
                // Unverified
                badgeHtml = `<div class="status-badge red">Belum Terverifikasi</div>`;
                isLocked = false;
                verifyButtonHtml = `<button class="btn-verify-mini" onclick="openVerificationModal()">Verifikasi</button>`;
            }

            const inputClass = isLocked ? 'form-input-styled permanent' : 'form-input-styled';
            const readOnlyAttr = isLocked ? 'readonly' : '';

            // Area Verifikasi di bawah Password
            let verificationActionArea = '';
            if (status !== 'verified') {
                verificationActionArea = `
                    <div class="verification-action-row">
                        ${verifyButtonHtml}
                        <span class="verify-status-text">${statusText}</span>
                    </div>
                `;
            }

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
}

/* ============================================== */
/* --- USER VERIFICATION FLOW --- */
/* ============================================== */

function openVerificationModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;

    authOverlay.classList.add('active');
    document.querySelectorAll('.auth-box').forEach(b => b.style.display='none');
    boxVerification.style.display = 'block';

    // Step 1: Input
    document.getElementById('verifStep1').style.display = 'block';
    document.getElementById('verifStep2').style.display = 'none';

    // Isi Data Saat Ini
    document.getElementById('verifUsername').value = user.username;
    document.getElementById('verifEmail').value = user.email;
    document.getElementById('verifPhone').value = user.phone;
}

// Handler Tombol Konfirmasi (Kirim OTP)
async function handleVerificationConfirm(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const newUsername = document.getElementById('verifUsername').value;
    const newEmail = document.getElementById('verifEmail').value;
    const newPhone = document.getElementById('verifPhone').value;
    const btn = document.getElementById('btnVerifConfirm');

    if(!newUsername || !newEmail || !newPhone) return alert("Semua data wajib diisi!");

    btn.innerText = "Mengirim Kode..."; btn.disabled = true;

    try {
        // Request OTP ke Email Baru (atau lama jika sama)
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                email: newEmail, 
                username: newUsername, 
                phone: newPhone,
                type: 'verification_update' 
            })
        });
        const data = await res.json();
        
        if(data.success) {
            // Pindah ke Step 2 (OTP)
            document.getElementById('verifStep1').style.display = 'none';
            document.getElementById('verifStep2').style.display = 'block';
        } else {
            alert(data.message || "Gagal mengirim kode.");
        }
    } catch(e) { alert("Error Server"); }
    finally { btn.innerText = "KONFIRMASI"; btn.disabled = false; }
}

// Handler Submit OTP & Finalisasi
async function handleVerificationSubmitOtp() {
    const user = JSON.parse(localStorage.getItem('user'));
    const otp = document.getElementById('verifOtpCode').value;
    
    const newUsername = document.getElementById('verifUsername').value;
    const newEmail = document.getElementById('verifEmail').value;
    const newPhone = document.getElementById('verifPhone').value;
    const btn = document.getElementById('btnVerifSubmit');

    if(!otp) return alert("Masukkan kode OTP!");
    btn.innerText = "Memproses..."; btn.disabled = true;

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
            alert("Permintaan Verifikasi Terkirim! Menunggu persetujuan Admin.");
            localStorage.setItem('user', JSON.stringify(data.user)); // Update session lokal
            closeAuthModal();
            checkLoginState(); // Refresh tampilan settings
        } else {
            alert(data.message || "Gagal verifikasi.");
        }
    } catch(e) { alert("Error koneksi."); }
    finally { btn.innerText = "KIRIM & VERIFIKASI"; btn.disabled = false; }
}


/* ============================================== */
/* --- ADMIN DASHBOARD (ACCORDION STYLE) --- */
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

// 1. ADMIN USERS (Accordion)
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
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// 2. ADMIN VERIFIKASI (Accordion + Terima/Tolak)
async function fetchAdminVerifications() {
    try {
        const res = await fetch(`${API_URL}/admin/verifications`); // Get pending only
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

function toggleAccordion(id) {
    const el = document.getElementById(id);
    if(el.style.display === 'none') el.style.display = 'block';
    else el.style.display = 'none';
}

async function adminVerifyAction(userId, action) {
    if(!confirm(`Yakin ingin ${action === 'approve' ? 'Menerima' : 'Menolak'} verifikasi ini?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/admin/verify-action`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, action })
        });
        const data = await res.json();
        if(data.success) {
            alert(data.message);
            fetchAdminVerifications(); // Refresh list
        } else alert("Gagal.");
    } catch(e) { alert("Error Server"); }
}

// 3. Delete & Edit User (Standard)
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
    } catch(e) { alert("Error"); }
}

/* ============================================== */
/* --- AUTH & CROPPER UTILS (EXISTING) --- */
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
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    if(type === 'login') boxLogin.style.display = 'block';
    if(type === 'register') { boxReg.style.display = 'block'; authMode = 'register'; }
    if(type === 'otp') boxOtp.style.display = 'block';
    if(type === 'forgot') if(boxForgot) boxForgot.style.display = 'block';
}
function togglePass(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
}

// Register & Login Handlers (Simplified for brevity, same logic as before)
async function handleRegisterRequest(e) {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    if(password !== confirm) return alert("Password beda!");
    tempRegisterData = { username, email, phone, password };
    try {
        const res = await fetch(`${API_URL}/request-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, phone, type: 'register' })
        });
        if((await res.json()).success) switchAuth('otp');
        else alert("Gagal kirim OTP");
    } catch(e){}
}
function setupOtpInputs() {
    document.querySelectorAll('.otp-field').forEach((input, index, inputs) => {
        input.addEventListener('input', (e) => {
            if(e.target.value !== "" && index < inputs.length - 1) inputs[index+1].focus();
        });
    });
}
async function handleVerifyOtp() {
    let otp = ""; document.querySelectorAll('.otp-field').forEach(f => otp += f.value);
    try {
        const res = await fetch(`${API_URL}/register-verify`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({...tempRegisterData, otp})
        });
        if((await res.json()).success) { alert("Daftar Sukses"); switchAuth('login'); }
        else alert("OTP Salah");
    } catch(e){}
}
async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPass').value;
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
            switchMainTab(isAdmin(data.userData.email) ? 'admin' : 'home');
        } else alert("Login Gagal");
    } catch(e){}
}
function openChangePassModal() {
    closeAuthModal(); authOverlay.classList.add('active'); boxChangePass.style.display='block';
}
