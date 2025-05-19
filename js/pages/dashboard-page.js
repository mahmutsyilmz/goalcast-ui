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
    const dashboardMessageContainer = document.getElementById('dashboard-message');

    // Yeni eklenen DOM elementleri
    const emailVerificationStatusBadge = document.getElementById('email-verification-status-badge');
    const emailVerificationActionArea = document.getElementById('email-verification-action-area');

    async function loadUserProfile() {
        if (!profileLoadingSpinner || !profileDataContainer || !profileErrorContainer ||
            !idSpan || !usernameSpan || !emailSpan || !totalPointsSpan ||
            !emailVerificationStatusBadge || !emailVerificationActionArea) { // Yeni elementleri de kontrol et
            console.error('Dashboard Sayfası: Profil elementlerinden biri bulunamadı.');
            if (profileErrorContainer) {
                profileErrorContainer.textContent = 'Sayfa doğru yüklenemedi (DOM elementleri eksik).';
                profileErrorContainer.style.display = 'block';
                if(profileLoadingSpinner) profileLoadingSpinner.style.display = 'none'; // Spinner'ı gizle
            }
            return;
        }

        profileLoadingSpinner.style.display = 'block';
        profileDataContainer.style.display = 'none';
        profileErrorContainer.style.display = 'none';
        emailVerificationActionArea.innerHTML = ''; // Önceki butonu temizle
        emailVerificationActionArea.style.display = 'none'; // Başlangıçta gizle

        if (typeof clearMessage === 'function') {
            if (dashboardMessageContainer) clearMessage('dashboard-message');
            // global-message-area varsa temizle
            if (document.getElementById('global-message-area')) clearMessage('global-message-area');
        }

        // Backend'deki UserProfileDto'nun 'emailVerified' (boolean) alanını içerdiğinden emin ol.
        const response = await fetchAPI('/user/profile', 'GET', null, true);
        profileLoadingSpinner.style.display = 'none';

        if (response.success && response.data) {
            profileDataContainer.style.display = 'block';
            const userProfile = response.data;

            idSpan.textContent = userProfile.id;
            usernameSpan.textContent = userProfile.username;
            emailSpan.textContent = userProfile.email;
            totalPointsSpan.textContent = userProfile.totalPoints;

            // E-posta doğrulama durumunu ve aksiyonunu ayarla
            if (userProfile.emailVerified) {
                emailVerificationStatusBadge.innerHTML = '<span class="badge bg-success">Doğrulandı</span>';
                emailVerificationActionArea.style.display = 'none'; // Doğrulanmışsa aksiyon alanını gizle
            } else {
                emailVerificationStatusBadge.innerHTML = '<span class="badge bg-warning text-dark">Doğrulanmadı</span>';
                
                const requestVerificationButton = document.createElement('button');
                requestVerificationButton.id = 'request-verification-btn';
                requestVerificationButton.classList.add('btn', 'btn-sm', 'btn-info');
                requestVerificationButton.textContent = 'Doğrulama E-postası Gönder';
                
                emailVerificationActionArea.innerHTML = ''; // Önceki içeriği temizle
                emailVerificationActionArea.appendChild(requestVerificationButton);
                emailVerificationActionArea.style.display = 'block'; // Aksiyon alanını göster

                requestVerificationButton.addEventListener('click', async () => {
                    requestVerificationButton.disabled = true;
                    requestVerificationButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gönderiliyor...';
                    if (typeof clearMessage === 'function' && dashboardMessageContainer) clearMessage('dashboard-message');

                    try {
                        // Backend'deki /api/auth/request-verification-email endpoint'ine POST isteği
                        const resendResponse = await fetchAPI('/auth/request-verification-email', 'POST', null, true);
                        
                        if (resendResponse.success) {
                            if (typeof showMessage === 'function' && dashboardMessageContainer) {
                                showMessage('dashboard-message', resendResponse.message || 'Doğrulama e-postası isteği gönderildi. Lütfen e-postanızı kontrol edin.', 'success');
                            }
                            requestVerificationButton.textContent = 'E-posta Tekrar Gönderildi'; // Veya butonu kaldırabilirsiniz
                            // Butonu bir süre sonra tekrar aktif hale getirebilir veya tamamen kaldırabilirsiniz.
                            // setTimeout(() => {
                            //    requestVerificationButton.disabled = false;
                            //    requestVerificationButton.textContent = 'Doğrulama E-postası Gönder';
                            // }, 30000); // Örneğin 30 saniye sonra
                        } else {
                            if (typeof showMessage === 'function' && dashboardMessageContainer) {
                                showMessage('dashboard-message', resendResponse.error?.message || 'Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.', 'danger');
                            }
                            requestVerificationButton.disabled = false;
                            requestVerificationButton.textContent = 'Doğrulama E-postası Gönder';
                        }
                    } catch (err) {
                        console.error("Error requesting verification email:", err);
                        if (typeof showMessage === 'function' && dashboardMessageContainer) {
                            showMessage('dashboard-message', 'Doğrulama e-postası gönderilirken bir ağ hatası oluştu.', 'danger');
                        }
                        requestVerificationButton.disabled = false;
                        requestVerificationButton.textContent = 'Doğrulama E-postası Gönder';
                    }
                });
            }
            // Profil yüklendi mesajı (doğrulama durumundan bağımsız)
            if (typeof showMessage === 'function' && dashboardMessageContainer && !userProfile.emailVerified) {
                // Eğer e-posta doğrulanmamışsa ve buton gösteriliyorsa, ana mesajı sonra gösterelim
                // veya hiç göstermeyelim, kullanıcı butona odaklanacaktır.
                // Ya da sadece e-posta doğrulanmışsa başarı mesajı gösterelim.
            } else if (typeof showMessage === 'function' && dashboardMessageContainer && userProfile.emailVerified) {
                 showMessage('dashboard-message', response.message || 'Profil bilgileri başarıyla yüklendi.', 'success');
            }


        } else {
            if (profileErrorContainer) {
                profileErrorContainer.style.display = 'block';
                profileErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Profil bilgileri yüklenirken bir hata oluştu.';
            }
            if (response.status === 401 && typeof handleLogout === 'function') {
                if (typeof showMessage === 'function' && document.getElementById('global-message-area')) {
                     showMessage('global-message-area', 'Oturumunuz zaman aşımına uğradı. Lütfen tekrar giriş yapın.', 'warning');
                }
                setTimeout(() => handleLogout(), 2500);
            }
        }
    }

    if (localStorage.getItem('jwtToken')) {
        loadUserProfile();
    } else {
        console.warn("Dashboard Sayfası: Token bulunamadığı için profil yüklenmedi. Login sayfasına yönlendiriliyor.");
        // Eğer token yoksa direkt login'e yönlendirmek daha iyi olabilir.
        // location.hash = '#/login'; 
        // Bu zaten app.js'deki router tarafından authRequired ile yönetiliyor olmalı.
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardPage);
} else {
    initializeDashboardPage();
}