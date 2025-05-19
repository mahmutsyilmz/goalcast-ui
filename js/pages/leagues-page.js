// js/pages/leagues-page.js
console.log('leagues-page.js: Script başladı.');

function initializeLeaguesPage() {
    console.log('leagues-page.js: initializeLeaguesPage çağrıldı.');

    const leaguesListContainer = document.getElementById('leagues-list');
    const leaguesLoadingSpinner = document.getElementById('leagues-loading');
    const leaguesErrorContainer = document.getElementById('leagues-error');
    const leaguesMessageContainer = document.getElementById('leagues-message'); // HTML'de bu ID'li element var mı?

    async function loadLeagues() {
        if (!leaguesListContainer || !leaguesLoadingSpinner || !leaguesErrorContainer ) { // leaguesMessageContainer opsiyonel
            console.error('Ligler Sayfası: Gerekli DOM elementlerinden bazıları eksik.');
            return;
        }
        leaguesLoadingSpinner.style.display = 'block';
        leaguesListContainer.innerHTML = ''; 
        leaguesErrorContainer.style.display = 'none';
        if(typeof clearMessage === 'function') {
            if(leaguesMessageContainer) clearMessage('leagues-message');
            clearMessage('global-message-area');
        }

        const response = await fetchAPI('/leagues', 'GET', null, false);
        leaguesLoadingSpinner.style.display = 'none';

        if (response.success && Array.isArray(response.data)) {
            const leaguesEmptyContainer = document.getElementById('leagues-empty'); // Bu ID'li element HTML'de olmalı
            if (response.data.length === 0) {
                if(leaguesEmptyContainer) leaguesEmptyContainer.style.display = 'block';
                else leaguesListContainer.innerHTML = '<div class="col"><p class="text-muted">Gösterilecek lig bulunamadı.</p></div>';
            } else {
                if(leaguesEmptyContainer) leaguesEmptyContainer.style.display = 'none';
                response.data.forEach(league => {
                    const leagueCard = `
                        <div class="col">
                            <div class="card h-100">
                                <div class="card-body d-flex flex-column"> 
                                    <h5 class="card-title">${league.name}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">ID: ${league.id}</h6>
                                    <p class="card-text"><strong>Ülke:</strong> ${countryEnumValues[league.country] || league.country}</p> 
                                    <a href="#/matches?leagueId=${league.id}" class="btn btn-sm btn-outline-primary mt-auto align-self-start">Bu Ligin Maçları</a>
                                </div>
                            </div>
                        </div>
                    `;
                    leaguesListContainer.insertAdjacentHTML('beforeend', leagueCard);
                });
            }
            if (typeof showMessage === 'function' && leaguesMessageContainer && response.data && response.data.length > 0) {
                showMessage('leagues-message', response.message || 'Ligler başarıyla yüklendi.', 'success');
            }
        } else {
            leaguesErrorContainer.style.display = 'block';
            leaguesErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Ligler yüklenirken bir hata oluştu.';
        }
    }
    
        // leagues-page.js içinde güncellenmiş hali
    const countryEnumValues = {
        "TURKEY": "Türkiye",
        "FRANCE": "Fransa",
        "ENGLAND": "İngiltere",
        "SPAIN": "İspanya",
        "ITALY": "İtalya",
        "GERMANY": "Almanya",
        "CHAMPIONS_LEAGUE": "Şampiyonlar Ligi",
        "EUROPA_LEAGUE": "Avrupa Ligi",
        "CONFERENCE_LEAGUE": "Konferans Ligi",
        "OTHER": "Diğer Turnuvalar" // Veya "Diğer"
    };

    loadLeagues();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLeaguesPage);
} else {
    initializeLeaguesPage();
}