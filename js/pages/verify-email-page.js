// goalcast-ui/js/pages/verify-email-page.js
console.log('verify-email-page.js: Script başladı.');

async function initializeVerifyEmailPage() {
    console.log('verify-email-page.js: initializeVerifyEmailPage çağrıldı.');

    const loadingIndicator = document.getElementById('verification-loading');
    const resultMessageArea = document.getElementById('verification-result-message');
    const actionsArea = document.getElementById('verification-actions');

    if (!loadingIndicator || !resultMessageArea || !actionsArea) {
        console.error('Verify Email Sayfası: Gerekli DOM elementleri eksik.');
        if (document.body) document.body.innerHTML = '<div class="alert alert-danger container mt-5">Sayfa yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>';
        return;
    }

    loadingIndicator.style.display = 'block';
    resultMessageArea.style.display = 'none';
    actionsArea.style.display = 'none';

    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const token = params.get('token');

    if (!token) {
        loadingIndicator.style.display = 'none';
        resultMessageArea.textContent = 'Doğrulama token\'ı bulunamadı. Lütfen e-postanızdaki linki kontrol edin.';
        resultMessageArea.className = 'alert alert-danger'; // className'i resetle ve yenisini ata
        resultMessageArea.style.display = 'block';
        return;
    }

    try {
        // Backend'deki /api/auth/verify-email endpoint'ine GET isteği at
        const response = await fetchAPI(`/auth/verify-email?token=${encodeURIComponent(token)}`, 'GET', null, false); // Token public endpoint olduğu için false

        loadingIndicator.style.display = 'none';
        resultMessageArea.className = 'alert'; // Önceki class'ları temizle

        if (response.success) {
            resultMessageArea.textContent = response.message || 'E-postanız başarıyla doğrulandı! Artık giriş yapabilirsiniz.';
            resultMessageArea.classList.add('alert-success');
            actionsArea.style.display = 'block'; // "Giriş Yap" butonunu göster
        } else {
            resultMessageArea.textContent = response.error?.message || 'E-posta doğrulaması başarısız oldu. Lütfen tekrar deneyin veya yeni bir doğrulama e-postası isteyin.';
            resultMessageArea.classList.add('alert-danger');
        }
        resultMessageArea.style.display = 'block';

    } catch (error) {
        console.error('Error verifying email:', error);
        loadingIndicator.style.display = 'none';
        resultMessageArea.className = 'alert alert-danger';
        resultMessageArea.textContent = 'E-posta doğrulanırken bir ağ hatası oluştu. Lütfen daha sonra tekrar deneyin.';
        resultMessageArea.style.display = 'block';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVerifyEmailPage);
} else {
    initializeVerifyEmailPage();
}