// js/pages/dashboard-page.js
console.log('dashboard-page.js: Script başladı.');

function initializeDashboardPage() {
    console.log('dashboard-page.js: initializeDashboardPage çağrıldı.');

    const profileDataContainer = document.getElementById('user-profile-data');
    const profileLoadingSpinner = document.getElementById('user-profile-loading');
    const profileErrorContainer = document.getElementById('user-profile-error');
    const idSpan = document.getElementById('profile-id');
    const usernameSpan = document.getElementById('profile-username');
    const emailSpan = document.getElementById('profile-email');
    const totalPointsSpan = document.getElementById('profile-totalPoints');
    const dashboardMessageContainer = document.getElementById('dashboard-message'); // HTML'de bu ID'li element var mı?

    async function loadUserProfile() {
        if (!profileLoadingSpinner || !profileDataContainer || !profileErrorContainer || !idSpan || !usernameSpan || !emailSpan || !totalPointsSpan) {
            console.error('Dashboard Sayfası: Profil elementlerinden biri bulunamadı.');
            if (profileErrorContainer) {
                profileErrorContainer.textContent = 'Sayfa doğru yüklenemedi (elementler eksik).';
                profileErrorContainer.style.display = 'block';
            }
            return;
        }

        profileLoadingSpinner.style.display = 'block';
        profileDataContainer.style.display = 'none';
        profileErrorContainer.style.display = 'none';
        if (typeof clearMessage === 'function') {
            if(dashboardMessageContainer) clearMessage('dashboard-message');
            clearMessage('global-message-area');
        }

        const response = await fetchAPI('/user/profile', 'GET', null, true);
        profileLoadingSpinner.style.display = 'none';

        if (response.success && response.data) {
            profileDataContainer.style.display = 'block';
            const userProfile = response.data;
            idSpan.textContent = userProfile.id;
            usernameSpan.textContent = userProfile.username;
            emailSpan.textContent = userProfile.email;
            totalPointsSpan.textContent = userProfile.totalPoints;
            if (typeof showMessage === 'function' && dashboardMessageContainer) {
                showMessage('dashboard-message', response.message || 'Profil bilgileri başarıyla yüklendi.', 'success');
            }
        } else {
            if(profileErrorContainer) {
                profileErrorContainer.style.display = 'block';
                profileErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Profil bilgileri yüklenirken bir hata oluştu.';
            }
            if (response.status === 401 && typeof handleLogout === 'function') {
                if (typeof showMessage === 'function') showMessage('global-message-area', 'Oturumunuz zaman aşımına uğradı. Lütfen tekrar giriş yapın.', 'warning');
                setTimeout(() => handleLogout(), 2500);
            }
        }
    }

    if (localStorage.getItem('jwtToken')) {
        loadUserProfile();
    } else {
        console.warn("Dashboard Sayfası: Token bulunamadığı için profil yüklenmedi.");
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardPage);
} else {
    initializeDashboardPage();
}