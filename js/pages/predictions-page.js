// js/pages/predictions-page.js
console.log('predictions-page.js: Script başladı.');

// escapeHTML fonksiyonunun ui.js dosyasında global olarak tanımlı olduğu varsayılıyor.
// Eğer ui.js yoksa veya escapeHTML orada tanımlı değilse, bu dosyanın başına eklenebilir:
/*
if (typeof escapeHTML !== 'function') {
    function escapeHTML(str) {
        if (str === null || typeof str === 'undefined') return '';
        return str.toString()
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, ''');
    }
}
*/

async function initializePredictionsPage() {
    console.log('predictions-page.js: initializePredictionsPage çağrıldı.');

    const predictionsTableBody = document.getElementById('predictions-table-body');
    const predictionsLoadingSpinner = document.getElementById('predictions-loading');
    const predictionsErrorContainer = document.getElementById('predictions-error');
    const predictionsEmptyContainer = document.getElementById('predictions-empty');
    const predictionsMessageContainer = document.getElementById('predictions-message');

    async function loadUserPredictions() {
        if (!predictionsTableBody || !predictionsLoadingSpinner || !predictionsErrorContainer || !predictionsEmptyContainer) {
            console.error('Tahminlerim Sayfası: Listeleme için DOM elementleri eksik.');
            if (predictionsErrorContainer) {
                predictionsErrorContainer.textContent = 'Sayfa DOM yapısı hatalı.';
                predictionsErrorContainer.style.display = 'block';
                if (predictionsLoadingSpinner) predictionsLoadingSpinner.style.display = 'none';
            }
            return;
        }

        predictionsLoadingSpinner.style.display = 'block';
        predictionsTableBody.innerHTML = '';
        predictionsErrorContainer.style.display = 'none';
        predictionsEmptyContainer.style.display = 'none';
        if (typeof clearMessage === 'function') {
            if (predictionsMessageContainer) clearMessage('predictions-message');
            if (document.getElementById('global-message-area')) clearMessage('global-message-area');
        }

        const response = await fetchAPI('/predictions/user', 'GET', null, true);
        predictionsLoadingSpinner.style.display = 'none';

        // Backend'den UserPredictionsResponseDto döndüğünü varsayıyoruz.
        // Bu DTO içinde { predictions: List<PredictionDto>, currentUserTotalPoints: int } var.
        if (response.success && response.data && Array.isArray(response.data.predictions)) {
            const userPredictionsData = response.data;
            const predictions = userPredictionsData.predictions;

            // Puan ve Navbar Güncelleme
            if (typeof userPredictionsData.currentUserTotalPoints !== 'undefined') {
                localStorage.setItem('totalPoints', userPredictionsData.currentUserTotalPoints);
                // Opsiyonel: emailVerified de güncellenebilir (eğer backend DTO'suna eklenirse)
                // if (typeof userPredictionsData.isCurrentUserEmailVerified !== 'undefined') {
                //    localStorage.setItem('emailVerified', userPredictionsData.isCurrentUserEmailVerified.toString());
                // }
                if (typeof updateNavigation === 'function') { // app.js'deki fonksiyonu çağır
                    updateNavigation();
                }
            }

            if (predictions.length === 0) {
                if (predictionsEmptyContainer) predictionsEmptyContainer.style.display = 'block';
            } else {
                if (predictionsEmptyContainer) predictionsEmptyContainer.style.display = 'none';

                // En son yapılan tahminler veya en son sonuçlananlar üste gelebilir.
                // Şimdilik maç tarihine göre (en yeni maç en üstte) sıralayalım.
                predictions.sort((a, b) => new Date(b.match.matchDate).getTime() - new Date(a.match.matchDate).getTime());

                predictions.forEach(pred => {
                    const match = pred.match;
                    if (!match) {
                        console.warn("Tahmin için maç verisi bulunamadı (prediction.match is null):", pred);
                        return; // Bu tahmini atla
                    }

                    let statusText = '';
                    let statusClass = '';
                    let pointsDisplay = ''; // "Kazanılan Puan" sütununda gösterilecek

                    if (match.finished === true) {
                        // pred.isCorrect: skoru tam bildi mi? (true/false)
                        // pred.pointsWon: bu tahminden net kazanç/kayıp
                        // pred.stakePoints: yatırılan puan

                        if (pred.isCorrect === true) { // Skoru tam bildi (net kazanç: stakePoints * 2)
                            statusText = 'Doğru Skor';
                            statusClass = 'text-success fw-bold';
                        } else if (pred.pointsWon === pred.stakePoints && pred.isCorrect === false) { // Sadece sonucu bildi (net kazanç: stakePoints * 1)
                            statusText = 'Doğru Tahmin';
                            statusClass = 'text-success'; // Yeşil, ama daha az vurgulu
                        } else if (pred.pointsWon < 0) { // Yanlış sonuç (net kayıp: -stakePoints)
                            statusText = 'Yanlış Tahmin';
                            statusClass = 'text-danger fw-bold';
                        } else if (pred.pointsWon === 0 && pred.isCorrect === false && match.finished) {
                             // Bu durum, "Doğru Tahmin" için backend'in pointsWon=0 döndürdüğü senaryo olabilir
                             // Veya gerçekten puan değişimi olmayan ama skorun da yanlış olduğu bir durum.
                             // Eğer backend "Doğru Tahmin" (sonuç doğru, skor yanlış) için pointsWon=0 döndürüyorsa,
                             // yukarıdaki "else if (pred.pointsWon === pred.stakePoints ...)" koşulu çalışmaz.
                             // Bu durumda, "Doğru Tahmin" metnini burada belirlememiz gerekir.
                             // Şimdilik, backend'in "Doğru Tahmin" için pointsWon = stakePoints (yani net 1 kat kazanç)
                             // döndürdüğünü varsayıyoruz. Bu blok o yüzden pek çalışmamalı.
                            statusText = 'İşlendi (Puan Değişimi Yok)';
                            statusClass = 'text-muted';
                        } else if (pred.isCorrect === null || typeof pred.pointsWon === 'undefined' || pred.pointsWon === null) {
                            // Maç bitmiş ama tahmin henüz değerlendirilmemişse (bu olmamalı)
                            statusText = 'Değerlendiriliyor';
                            statusClass = 'text-warning';
                        }
                         else { // Kapsanmayan bir durum (örn: pointsWon > 0 ama isCorrect false ise)
                            statusText = 'Sonuçlandı'; // Genel bir ifade
                            statusClass = 'text-info';
                        }
                        
                        // pointsDisplay her zaman pred.pointsWon'u göstersin (net kazanç/kayıp)
                        pointsDisplay = pred.pointsWon > 0 ? `+${pred.pointsWon}` : (pred.pointsWon === 0 && match.finished ? '0' : `${pred.pointsWon}`);
                        if (pointsDisplay === 'null' || pointsDisplay === 'undefined') pointsDisplay = '-';


                    } else { // Maç henüz bitmemiş
                        statusText = 'Maç Başlamadı';
                        statusClass = 'text-primary';
                        pointsDisplay = '-';
                    }

                    const matchDate = new Date(match.matchDate);
                    const row = `
                        <tr class="${pred.highlight ? 'table-info' : ''}">
                            <td>${match.id || '-'}</td>
                            <td>
                                ${escapeHTML(match.homeTeam || 'Ev Sahibi Yok')} vs ${escapeHTML(match.awayTeam || 'Deplasman Yok')}<br>
                                <small class="text-muted">${matchDate.toLocaleString('tr-TR', { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                            </td>
                            <td>${escapeHTML(match.league ? match.league.name : 'Lig Bilgisi Yok')}</td>
                            <td>${pred.predictedHomeScore} - ${pred.predictedAwayScore}</td>
                            <td>${pred.stakePoints}</td>
                            <td class="${statusClass}">${statusText}</td>
                            <td class="${pred.pointsWon > 0 ? 'text-success fw-bold' : (pred.pointsWon < 0 ? 'text-danger fw-bold' : '')}">
                                ${pointsDisplay}
                            </td>
                        </tr>
                    `;
                    predictionsTableBody.insertAdjacentHTML('beforeend', row);
                });
            }

            if (typeof showMessage === 'function' && predictionsMessageContainer && predictions.length > 0) {
                showMessage('predictions-message', response.message || 'Tahminler başarıyla yüklendi.', 'success');
            }

            const urlParams = new URLSearchParams(location.hash.split('?')[1] || '');
            const highlightId = urlParams.get('highlightMatchId');
            if (highlightId) {
                predictionsTableBody.querySelectorAll('tr').forEach(tr => {
                    const firstTd = tr.querySelector('td:first-child');
                    if (firstTd && firstTd.textContent === highlightId) {
                        tr.classList.add('table-info', 'highlighted-prediction');
                        tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Vurgulanan satıra kaydır
                    }
                });
            }

        } else {
            if (predictionsErrorContainer) {
                predictionsErrorContainer.style.display = 'block';
                const errorMessage = (response.error && response.error.message) ? response.error.message : 'Tahminler yüklenirken bir hata oluştu veya beklenen veri formatı alınamadı.';
                predictionsErrorContainer.textContent = errorMessage;
                console.error("Hata veya beklenmeyen veri yapısı /predictions/user endpoint'inden:", response);
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
        loadUserPredictions();
    } else {
        console.warn("Tahminlerim Sayfası: Token bulunamadığı için tahminler yüklenmedi.");
        if (predictionsErrorContainer) {
             predictionsErrorContainer.textContent = 'Tahminlerinizi görmek için lütfen giriş yapın.';
             predictionsErrorContainer.style.display = 'block';
             if(predictionsLoadingSpinner) predictionsLoadingSpinner.style.display = 'none';
        }
    }
}

// Sayfa yüklendiğinde initialize fonksiyonunu çağır
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePredictionsPage);
} else {
    initializePredictionsPage();
}