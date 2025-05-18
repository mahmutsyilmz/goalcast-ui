// js/pages/predictions-page.js
console.log('predictions-page.js: Script başladı.');

function initializePredictionsPage() {
    console.log('predictions-page.js: initializePredictionsPage çağrıldı.');

    const predictionsTableBody = document.getElementById('predictions-table-body');
    const predictionsLoadingSpinner = document.getElementById('predictions-loading');
    const predictionsErrorContainer = document.getElementById('predictions-error');
    const predictionsEmptyContainer = document.getElementById('predictions-empty');
    const predictionsMessageContainer = document.getElementById('predictions-message'); // HTML'de bu ID'li element var mı?

    async function loadUserPredictions() {
        if (!predictionsTableBody || !predictionsLoadingSpinner || !predictionsErrorContainer || !predictionsEmptyContainer) {
            console.error('Tahminlerim Sayfası: Listeleme için DOM elementleri eksik.');
            return;
        }

        predictionsLoadingSpinner.style.display = 'block';
        predictionsTableBody.innerHTML = '';
        predictionsErrorContainer.style.display = 'none';
        predictionsEmptyContainer.style.display = 'none';
        if(typeof clearMessage === 'function') {
            if(predictionsMessageContainer) clearMessage('predictions-message');
            clearMessage('global-message-area');
        }

        const response = await fetchAPI('/predictions/user', 'GET', null, true);
        predictionsLoadingSpinner.style.display = 'none';

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                if(predictionsEmptyContainer) predictionsEmptyContainer.style.display = 'block';
            } else {
                if(predictionsEmptyContainer) predictionsEmptyContainer.style.display = 'none';
                response.data.forEach(prediction => {
                    const match = prediction.match;
                    if (!match) { // Maç verisi yoksa bu tahmini atla veya hata göster
                        console.warn("Tahmin için maç verisi bulunamadı:", prediction);
                        return; 
                    }
                    let statusText = '';
                    let statusClass = '';

                    if (match.finished === true) { // 'finished' kullandığımızdan emin olalım
                        if (prediction.isCorrect === true) {
                            statusText = 'Doğru Tahmin';
                            statusClass = 'text-success fw-bold';
                        } else if (prediction.isCorrect === false) {
                            statusText = 'Yanlış Tahmin';
                            statusClass = 'text-danger fw-bold';
                        } else { 
                            statusText = 'Sonuç Bekleniyor';
                            statusClass = 'text-muted';
                        }
                    } else {
                        statusText = 'Maç Başlamadı';
                        statusClass = 'text-primary';
                    }
                    
                    const row = `
                        <tr>
                            <td>${match.id || '-'}</td>
                            <td>${match.homeTeam || 'Bilinmiyor'} vs ${match.awayTeam || 'Bilinmiyor'} <br><small class="text-muted">${new Date(match.matchDate).toLocaleString('tr-TR', {dateStyle:'short', timeStyle:'short'})}</small></td>
                            <td>${match.league ? match.league.name : 'Bilinmiyor'}</td>
                            <td>${prediction.predictedHomeScore} - ${prediction.predictedAwayScore}</td>
                            <td>${prediction.stakePoints}</td>
                            <td class="${statusClass}">${statusText}</td>
                            <td>${prediction.pointsWon > 0 ? `+${prediction.pointsWon}` : (match.finished && prediction.isCorrect === false ? `-${prediction.stakePoints}`: (prediction.pointsWon === 0 && match.finished ? '0' : '-' ))}</td>
                        </tr>
                    `;
                    predictionsTableBody.insertAdjacentHTML('beforeend', row);
                });
            }

            if (typeof showMessage === 'function' && predictionsMessageContainer && response.data && response.data.length > 0) {
                showMessage('predictions-message', response.message || 'Tahminler başarıyla yüklendi.', 'success');
            }
        } else {
            if(predictionsErrorContainer) {
                predictionsErrorContainer.style.display = 'block';
                const errorMessage = (response.error && response.error.message) ? response.error.message : 'Tahminler yüklenirken bir hata oluştu.';
                predictionsErrorContainer.textContent = errorMessage;
            }
            if (response.status === 401 && typeof handleLogout === 'function') {
                 if (typeof showMessage === 'function') showMessage('global-message-area', 'Oturumunuz zaman aşımına uğradı. Lütfen tekrar giriş yapın.', 'warning');
                 setTimeout(() => handleLogout(), 2500);
            }
        }
    }

    if (localStorage.getItem('jwtToken')) {
        loadUserPredictions();
    } else {
        console.warn("Tahminlerim Sayfası: Token bulunamadığı için tahminler yüklenmedi.");
        // app.js zaten login'e yönlendirecek.
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePredictionsPage);
} else {
    initializePredictionsPage();
}