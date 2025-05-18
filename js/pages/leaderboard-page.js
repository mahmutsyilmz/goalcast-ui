// goalcast-ui/js/pages/leaderboard-page.js
console.log('leaderboard-page.js: Script başladı.');

// escapeHTML fonksiyonu artık ui.js'den yüklenecek, bu yüzden buradaki tanımı siliyoruz.

async function initializeLeaderboardPage() {
    console.log('leaderboard-page.js: initializeLeaderboardPage çağrıldı.');

    const leaderboardBody = document.getElementById('leaderboard-body');
    const loadingIndicator = document.getElementById('leaderboard-loading');
    const errorAlert = document.getElementById('leaderboard-error');
    const leaderboardMessageContainer = document.getElementById('leaderboard-message'); // Opsiyonel

    if (!leaderboardBody || !loadingIndicator || !errorAlert) {
        console.error('Leaderboard Sayfası: Gerekli DOM elementlerinden bazıları eksik.');
        if (errorAlert) {
            errorAlert.textContent = 'Sayfa doğru yüklenemedi (elementler eksik).';
            errorAlert.style.display = 'block';
        }
        return;
    }

    leaderboardBody.innerHTML = '';
    loadingIndicator.style.display = 'block';
    errorAlert.style.display = 'none';
    if (typeof clearMessage === 'function') {
        if (leaderboardMessageContainer) clearMessage('leaderboard-message');
        // global-message-area elementinin HTML'de olduğundan emin ol veya bu satırı yorumla/kaldır
        if (document.getElementById('global-message-area')) clearMessage('global-message-area');
    }

    try {
        const response = await fetchAPI('/leaderboard?limit=20', 'GET', null, false);
        loadingIndicator.style.display = 'none';

        if (response && response.success && Array.isArray(response.data)) {
            const leaderboardData = response.data;
            if (leaderboardData.length === 0) {
                leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center">Lider tablosunda henüz kimse yok.</td></tr>';
            } else {
                leaderboardData.forEach(entry => {
                    // escapeHTML fonksiyonu artık ui.js'den global olarak erişilebilir olmalı
                    const row = `<tr>
                                    <th scope="row">${entry.rank}</th>
                                    <td>${escapeHTML(entry.username)}</td>
                                    <td>${entry.totalPoints}</td>
                               </tr>`;
                    leaderboardBody.insertAdjacentHTML('beforeend', row);
                });
            }
            if (typeof showMessage === 'function' && leaderboardMessageContainer && response.data && response.data.length > 0) {
                showMessage('leaderboard-message', response.message || 'Lider tablosu başarıyla yüklendi.', 'success');
            }
        } else {
            console.error('Lider tablosu yüklenemedi:', response ? response.message : 'Sunucudan yanıt yok.');
            errorAlert.textContent = `Lider tablosu yüklenemedi: ${response && response.message ? response.message : (response && response.error && response.error.message ? response.error.message : 'Sunucudan geçerli bir yanıt alınamadı veya bir hata oluştu.')}`;
            errorAlert.style.display = 'block';
        }
    } catch (error) {
        console.error('Lider tablosu fetch hatası:', error);
        loadingIndicator.style.display = 'none';
        errorAlert.textContent = `Bir hata oluştu: ${error.message}`;
        errorAlert.style.display = 'block';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLeaderboardPage);
} else {
    initializeLeaderboardPage();
}