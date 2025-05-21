// js/pages/leagues-page.js
console.log('leagues-page.js: Script başladı.');

function initializeLeaguesPage() {
    console.log('leagues-page.js: initializeLeaguesPage çağrıldı.');

    const leaguesListContainer = document.getElementById('leagues-list');
    const leaguesLoadingSpinner = document.getElementById('leagues-loading');
    const leaguesErrorContainer = document.getElementById('leagues-error');
    const leaguesMessageContainer = document.getElementById('leagues-message');

    // Enum değerleri için çeviriler (admin sayfasıyla aynı olabilir, ui.js'e taşınabilir)
    const countryDisplayNames = {
        "TURKEY": "Türkiye",
        "FRANCE": "Fransa",
        "ENGLAND": "İngiltere",
        "SPAIN": "İspanya",
        "ITALY": "İtalya",
        "GERMANY": "Almanya",
        "OTHER": "Diğer Ülke"
    };

    const leagueTypeDisplayNames = {
        "NATIONAL_LEAGUE": "Ulusal Lig",
        "DOMESTIC_CUP": "Ulusal Kupa",
        "INTERNATIONAL_CLUB": "Uluslararası Kulüp Turnuvası",
        "INTERNATIONAL_NATIONAL": "Uluslararası Milli Takım Turnuvası",
        "FRIENDLY": "Hazırlık Maçı",
        "OTHER": "Diğer"
    };

    async function loadLeagues() {
        if (!leaguesListContainer || !leaguesLoadingSpinner || !leaguesErrorContainer ) {
            console.error('Ligler Sayfası: Gerekli DOM elementlerinden bazıları eksik.');
            return;
        }
        showSpinner('leagues-loading');
        leaguesListContainer.innerHTML = '';
        leaguesErrorContainer.style.display = 'none';
        if(leaguesMessageContainer) clearMessage('leagues-message');
        clearMessage('global-message-area');

        // Backend'den gelen LeagueDto'da country ve leagueType string olarak geliyor.
        const response = await fetchAPI('/leagues', 'GET', null, false);
        hideSpinner('leagues-loading');

        if (response.success && Array.isArray(response.data)) {
            const leaguesEmptyContainer = document.getElementById('leagues-empty'); // HTML'de bu ID'li elementin olduğundan emin ol
            if (response.data.length === 0) {
                if(leaguesEmptyContainer) {
                    leaguesEmptyContainer.style.display = 'block';
                } else {
                    leaguesListContainer.innerHTML = '<div class="col"><p class="text-muted">Gösterilecek lig bulunamadı.</p></div>';
                }
            } else {
                if(leaguesEmptyContainer) leaguesEmptyContainer.style.display = 'none';
                response.data.forEach(league => {
                    const leagueTypeName = leagueTypeDisplayNames[league.leagueType] || league.leagueType;
                    let subtitle = `${escapeHTML(leagueTypeName)}`;
                    if (league.country && (league.leagueType === 'NATIONAL_LEAGUE' || league.leagueType === 'DOMESTIC_CUP')) {
                        const countryName = countryDisplayNames[league.country] || league.country;
                        subtitle += ` (${escapeHTML(countryName)})`;
                    }

                    const leagueCard = `
                        <div class="col">
                            <div class="card h-100 shadow-sm">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title">${escapeHTML(league.name)}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${subtitle}</h6>
                                    <!-- <p class="card-text">ID: ${league.id}</p> -->
                                    <a href="#/matches?leagueId=${league.id}" class="btn btn-sm btn-outline-primary mt-auto align-self-start">
                                        <i class="fas fa-futbol me-1"></i> Bu Ligin Maçları
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                    leaguesListContainer.insertAdjacentHTML('beforeend', leagueCard);
                });
            }
            if (leaguesMessageContainer && response.message && response.data && response.data.length > 0) {
                showMessage('leagues-message', response.message, 'success');
            }
        } else {
            leaguesErrorContainer.style.display = 'block';
            leaguesErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Ligler yüklenirken bir hata oluştu.';
        }
    }

    loadLeagues();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLeaguesPage);
} else {
    initializeLeaguesPage();
}