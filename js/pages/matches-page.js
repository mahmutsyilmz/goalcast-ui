// js/pages/matches-page.js
console.log('matches-page.js: Script başladı.');

function initializeMatchesPage() {
    console.log('matches-page.js: initializeMatchesPage çağrıldı.');

    const matchesListContainer = document.getElementById('matches-list');
    const matchesLoadingSpinner = document.getElementById('matches-loading');
    const matchesErrorContainer = document.getElementById('matches-error');
    const matchesMessageContainer = document.getElementById('matches-message');
    const filterForm = document.getElementById('filter-matches-form');
    const leagueSelect = document.getElementById('filter-leagueId');
    const leagueTypeSelect = document.getElementById('filter-leagueType'); // YENİ
    const startDateInput = document.getElementById('filter-startDate');
    const endDateInput = document.getElementById('filter-endDate');
    const clearFiltersButton = document.getElementById('clear-filters-btn');

    // ... (predictionModal ile ilgili değişkenler aynı kalır)
    const predictionModalElement = document.getElementById('predictionModal');
    const predictionModal = predictionModalElement ? new bootstrap.Modal(predictionModalElement) : null;
    const predictionForm = document.getElementById('prediction-form');
    const predictMatchIdInput = document.getElementById('predict-match-id');
    const predictMatchTeamsSpan = document.getElementById('predict-match-teams');
    const predictHomeTeamLabel = document.getElementById('predict-home-team-label');
    const predictAwayTeamLabel = document.getElementById('predict-away-team-label');
    const predictionMessageModal = document.getElementById('prediction-message-modal');


    let currentToken = localStorage.getItem('jwtToken');
    let userPredictionsMap = new Map();

    // Kullanıcı dostu isimler (ui.js'e taşınabilir)
    const countryDisplayNames = {
        "TURKEY": "Türkiye", "FRANCE": "Fransa", "ENGLAND": "İngiltere",
        "SPAIN": "İspanya", "ITALY": "İtalya", "GERMANY": "Almanya", "OTHER": "Diğer Ülke"
    };
    const leagueTypeDisplayNames = {
        "NATIONAL_LEAGUE": "Ulusal Lig", "DOMESTIC_CUP": "Ulusal Kupa",
        "INTERNATIONAL_CLUB": "Ulus. Kulüp Turnuvası", "INTERNATIONAL_NATIONAL": "Ulus. Milli Takım Turnuvası",
        "FRIENDLY": "Hazırlık Maçı", "OTHER": "Diğer"
    };


    async function loadUserExistingPredictions() {
        // ... (Bu fonksiyon aynı kalabilir)
        if (!currentToken) {
            userPredictionsMap.clear();
            return;
        }
        const response = await fetchAPI('/predictions/user', 'GET', null, true);
        if (response.success && Array.isArray(response.data)) {
            userPredictionsMap.clear();
            response.data.forEach(prediction => {
                if (prediction.match && typeof prediction.match.id !== 'undefined') {
                    userPredictionsMap.set(prediction.match.id, prediction);
                } else {
                    console.warn("Maçlar sayfası: Geçersiz maç verisi içeren tahmin geldi:", prediction);
                }
            });
        } else {
            userPredictionsMap.clear();
        }
    }

    async function loadLeaguesForFilter() {
        // ... (Bu fonksiyon aynı kalabilir)
        if (!leagueSelect) return;
        const response = await fetchAPI('/leagues', 'GET', null, false);
        if (response.success && Array.isArray(response.data)) {
            leagueSelect.innerHTML = '<option value="">Tüm Ligler</option>'; // Mevcut içeriği temizle ve varsayılanı ekle
            response.data.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                // Lig türünü ve ülkeyi daha anlamlı göster
                let leagueDisplayName = escapeHTML(league.name);
                const typeName = league.leagueType ? (leagueTypeDisplayNames[league.leagueType] || league.leagueType) : '';
                const countryName = league.country ? (countryDisplayNames[league.country] || league.country) : '';

                if (typeName && (league.leagueType === 'NATIONAL_LEAGUE' || league.leagueType === 'DOMESTIC_CUP') && countryName) {
                    leagueDisplayName += ` (${escapeHTML(typeName)}, ${escapeHTML(countryName)})`;
                } else if (typeName) {
                     leagueDisplayName += ` (${escapeHTML(typeName)})`;
                } else if (countryName) { // Eski ligler için fallback (leagueType yoksa)
                    leagueDisplayName += ` (${escapeHTML(countryName)})`;
                }
                option.textContent = leagueDisplayName;
                leagueSelect.appendChild(option);
            });
        } else {
            leagueSelect.innerHTML = '<option value="">Ligler Yüklenemedi</option>';
        }
    }

    async function loadMatches(filters = {}) {
        if (!matchesListContainer || !matchesLoadingSpinner || !matchesErrorContainer) return;

        showSpinner('matches-loading'); // ui.js'den gelmeli
        matchesListContainer.innerHTML = '';
        matchesErrorContainer.style.display = 'none';
        if (matchesMessageContainer) clearMessage('matches-message'); // ui.js'den
        clearMessage('global-message-area'); // ui.js'den

        currentToken = localStorage.getItem('jwtToken');
        // Filtresiz ilk yüklemede ve token varsa tahminleri çek
        if (currentToken && userPredictionsMap.size === 0 && Object.keys(filters).length === 0) {
             await loadUserExistingPredictions();
        }

        // URL'den gelen leagueId filtresini uygula
        const hashParts = location.hash.split('?');
        const queryParamsFromUrl = new URLSearchParams(hashParts[1] || '');
        const initialLeagueId = queryParamsFromUrl.get('leagueId');

        if (initialLeagueId && !filters.leagueId && Object.keys(filters).length === 0) { // Sadece ilk yüklemede ve filtre yoksa
            filters.leagueId = initialLeagueId;
            if (leagueSelect && leagueSelect.options.length > 1) { // Ligler yüklendiyse
                leagueSelect.value = initialLeagueId; // Dropdown'ı da ayarla
            }
        }

        let queryParams = new URLSearchParams();
        if (filters.leagueId) queryParams.append('leagueId', filters.leagueId);
        if (filters.leagueType) queryParams.append('leagueType', filters.leagueType); // YENİ
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        const endpoint = `/matches?${queryParams.toString()}`;
        console.log("Maçlar yükleniyor, endpoint:", endpoint); // Debug için
        const response = await fetchAPI(endpoint, 'GET', null, false);

        hideSpinner('matches-loading'); // ui.js'den
        if(clearFiltersButton) updateClearFiltersButtonVisibility();

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                matchesErrorContainer.textContent = 'Filtrenize uygun maç bulunamadı veya gösterilecek maç yok.';
                matchesErrorContainer.style.display = 'block';
            } else {
                response.data.forEach(match => {
                    const matchDate = new Date(match.matchDate);
                    const userPredictionForThisMatch = userPredictionsMap.get(match.id);
                    let actionContent = '';
                    const canPredict = currentToken && !match.finished && matchDate > new Date() && !userPredictionForThisMatch;

                    if (userPredictionForThisMatch) {
                        actionContent = `
                            <div class="card-footer text-center bg-light py-2">
                                <p class="mb-0 small"><strong>Tahmininiz:</strong>
                                    <span class="fw-bold">${escapeHTML(userPredictionForThisMatch.predictedHomeScore.toString())} - ${escapeHTML(userPredictionForThisMatch.predictedAwayScore.toString())}</span>
                                    <span class="text-muted">(${escapeHTML(userPredictionForThisMatch.stakePoints.toString())} Puan)</span>
                                </p>
                            </div>`;
                    } else if (canPredict) {
                        actionContent = `
                            <div class="card-footer text-center py-2">
                                <button class="btn btn-sm btn-warning predict-btn"
                                        data-match-id="${match.id}"
                                        data-home-team="${escapeHTML(match.homeTeam)}"
                                        data-away-team="${escapeHTML(match.awayTeam)}">
                                    Tahmin Yap
                                </button>
                            </div>`;
                    }

                    // Lig adını, türünü ve ülkesini göster
                    let leagueDisplay = escapeHTML(match.league.name);
                    const typeName = match.league.leagueType ? (leagueTypeDisplayNames[match.league.leagueType] || match.league.leagueType) : '';
                    const countryName = match.league.country ? (countryDisplayNames[match.league.country] || match.league.country) : '';

                    if (typeName && (match.league.leagueType === 'NATIONAL_LEAGUE' || match.league.leagueType === 'DOMESTIC_CUP') && countryName) {
                        leagueDisplay += ` (${escapeHTML(typeName)}, ${escapeHTML(countryName)})`;
                    } else if (typeName) {
                         leagueDisplay += ` (${escapeHTML(typeName)})`;
                    } else if (countryName) {
                        leagueDisplay += ` (${escapeHTML(countryName)})`;
                    }


                    const matchCard = `
                        <div class="col">
                            <div class="card h-100 shadow-sm">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span>${leagueDisplay}</span>
                                    <small class="text-muted">ID: ${match.id}</small>
                                </div>
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title text-center">${escapeHTML(match.homeTeam)} vs ${escapeHTML(match.awayTeam)}</h5>
                                    <p class="card-text text-center text-muted small mb-2">
                                        ${matchDate.toLocaleString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <div class="mt-auto text-center">
                                        ${match.finished ?
                                            `<p class="card-text fs-4 fw-bold mb-1">${match.homeScore} - ${match.awayScore}</p>
                                             <span class="badge bg-danger">Maç Bitti</span>` :
                                            '<span class="badge bg-success">Yakında</span>'
                                        }
                                    </div>
                                </div>
                                ${actionContent}
                            </div>
                        </div>
                    `;
                    matchesListContainer.insertAdjacentHTML('beforeend', matchCard);
                });
                addPredictButtonListeners(); // İsmi addPredictButtonListeners olarak değiştirdim, daha anlamlı.
            }
            if (matchesMessageContainer && response.message && response.data && response.data.length > 0) {
                 showMessage('matches-message', response.message, 'success'); // ui.js'den
            }
        } else {
            matchesErrorContainer.style.display = 'block';
            const errorMessage = (response.error && response.error.message) ? response.error.message : 'Maçlar yüklenirken bir hata oluştu.';
            matchesErrorContainer.textContent = errorMessage;
        }
    }

    function addPredictButtonListeners() { // addTableButtonListeners -> addPredictButtonListeners
        document.querySelectorAll('.predict-btn').forEach(button => {
            button.addEventListener('click', function() {
                const matchId = this.dataset.matchId;
                const homeTeam = this.dataset.homeTeam;
                const awayTeam = this.dataset.awayTeam;
                openPredictionModal(matchId, homeTeam, awayTeam);
            });
        });
    }

    if (filterForm) {
        filterForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const filters = {
                leagueId: leagueSelect ? leagueSelect.value : null,
                leagueType: leagueTypeSelect ? leagueTypeSelect.value : null, // YENİ
                startDate: startDateInput ? (startDateInput.value ? new Date(startDateInput.value).toISOString().slice(0, 16) : null) : null, // ISOString ve slice(0,16) datetime-local formatına uygun
                endDate: endDateInput ? (endDateInput.value ? new Date(endDateInput.value).toISOString().slice(0, 16) : null) : null
            };
            // Sadece dolu olan filtreleri al
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v != null && v !== '')
            );
            await loadMatches(activeFilters);
        });
    }

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', async function() {
            if(filterForm) filterForm.reset();
            // URL'den leagueId filtresini temizle (opsiyonel)
            // const currentHash = location.hash.split('?')[0];
            // history.pushState(null, null, currentHash);
            await loadMatches(); // Tüm filtreleri temizleyerek yükle
        });
    }

    function updateClearFiltersButtonVisibility() {
        if (!clearFiltersButton) return;
        if ((leagueSelect && leagueSelect.value) ||
            (leagueTypeSelect && leagueTypeSelect.value) || // YENİ
            (startDateInput && startDateInput.value) ||
            (endDateInput && endDateInput.value)) {
            clearFiltersButton.style.display = 'inline-block'; // veya 'block'
        } else {
            clearFiltersButton.style.display = 'none';
        }
    }

    // Filtre elemanlarına event listener ekle
    if(leagueSelect) leagueSelect.addEventListener('change', updateClearFiltersButtonVisibility);
    if(leagueTypeSelect) leagueTypeSelect.addEventListener('change', updateClearFiltersButtonVisibility); // YENİ
    if(startDateInput) startDateInput.addEventListener('input', updateClearFiltersButtonVisibility);
    if(endDateInput) endDateInput.addEventListener('input', updateClearFiltersButtonVisibility);


    function openPredictionModal(matchId, homeTeam, awayTeam) {
        // ... (Bu fonksiyon aynı kalabilir)
         if (!predictMatchIdInput || !predictMatchTeamsSpan || !predictHomeTeamLabel || !predictAwayTeamLabel || !predictionModal || !predictionForm) return;
        if(predictionMessageModal) clearMessage('prediction-message-modal');
        predictionForm.reset();
        predictMatchIdInput.value = matchId;
        predictMatchTeamsSpan.textContent = `${escapeHTML(homeTeam)} vs ${escapeHTML(awayTeam)}`;
        predictHomeTeamLabel.textContent = `${escapeHTML(homeTeam)} Skor`;
        predictAwayTeamLabel.textContent = `${escapeHTML(awayTeam)} Skor`;
        predictionModal.show();
    }

    async function handlePredictionSubmit(event) {
        // ... (Bu fonksiyon büyük ölçüde aynı kalabilir, içindeki escapeHTML kullanımlarını kontrol et)
        event.preventDefault();
        currentToken = localStorage.getItem('jwtToken');
        if (!currentToken) {
            if (predictionMessageModal) showMessage('prediction-message-modal', 'Tahmin yapmak için giriş yapmalısınız.', 'warning');
            return;
        }
        const predHomeScoreEl = document.getElementById('predictedHomeScore');
        const predAwayScoreEl = document.getElementById('predictedAwayScore');
        const stakePointsEl = document.getElementById('stakePoints');

        if(!predHomeScoreEl || !predAwayScoreEl || !stakePointsEl || !predictMatchIdInput){
             if (predictionMessageModal) showMessage('prediction-message-modal', 'Formda bir hata oluştu.', 'danger');
            return;
        }
        const matchId = predictMatchIdInput.value;
        const predictedHomeScore = predHomeScoreEl.value;
        const predictedAwayScore = predAwayScoreEl.value;
        const stakePoints = stakePointsEl.value;

        if (predictedHomeScore === '' || predictedAwayScore === '' || stakePoints === '') {
            if (predictionMessageModal) showMessage('prediction-message-modal', 'Lütfen tüm skor ve puan alanlarını doldurun.', 'warning');
            return;
        }
        const stake = parseInt(stakePoints);
        if (isNaN(stake) || stake < 100 || stake > 1000) {
            if (predictionMessageModal) showMessage('prediction-message-modal', 'Risk edilecek puan 100 ile 1000 arasında geçerli bir sayı olmalıdır.', 'warning');
            return;
        }
        const homeScoreInt = parseInt(predictedHomeScore);
        const awayScoreInt = parseInt(predictedAwayScore);
        if (isNaN(homeScoreInt) || homeScoreInt < 0 || isNaN(awayScoreInt) || awayScoreInt < 0) {
            if (predictionMessageModal) showMessage('prediction-message-modal', 'Skorlar geçerli bir sayı (minimum 0) olmalıdır.', 'warning');
            return;
        }
        const predictionData = {
            matchId: parseInt(matchId),
            predictedHomeScore: homeScoreInt,
            predictedAwayScore: awayScoreInt,
            stakePoints: stake
        };
        const submitButton = predictionForm ? predictionForm.querySelector('button[type="submit"]') : null;
        if (!submitButton) {
            if(predictionMessageModal) showMessage('prediction-message-modal', 'Kaydetme sırasında bir sorun oluştu.', 'danger');
            return;
        }
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

        const response = await fetchAPI('/predictions', 'POST', predictionData, true);

        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;

        if (response.success && response.data) {
            if(predictionMessageModal) showMessage('prediction-message-modal', response.message || 'Tahmin başarıyla kaydedildi!', 'success');
            if (typeof response.data.updatedUserTotalPoints !== 'undefined') {
                localStorage.setItem('totalPoints', response.data.updatedUserTotalPoints);
                if (typeof updateNavigation === 'function') updateNavigation();
            }
             // Tahmin başarılı olduktan sonra tahmin listesini ve maç kartlarını yenilemek için modal kapanınca tetiklenecek
            setTimeout(() => {
                if(predictionModal) predictionModal.hide(); // Bu, 'hidden.bs.modal' event'ini tetikleyecek
            }, 1500);
        } else {
            const errorMessage = (response.error && response.error.message) ? response.error.message : 'Tahmin kaydedilirken bir hata oluştu.';
            if(predictionMessageModal) showMessage('prediction-message-modal', errorMessage, 'danger');
        }
    }

    if (predictionForm) {
        predictionForm.addEventListener('submit', handlePredictionSubmit);
    }

    if (predictionModalElement) {
        predictionModalElement.addEventListener('hidden.bs.modal', async function (event) {
            if(predictionForm) predictionForm.reset();
            if(predictionMessageModal) clearMessage('prediction-message-modal');

            currentToken = localStorage.getItem('jwtToken');
            if (currentToken) {
                await loadUserExistingPredictions(); // Kullanıcının tahminlerini yeniden yükle
            } else {
                userPredictionsMap.clear();
            }
            // Mevcut filtreleri alıp maçları yeniden yükle
            const currentFilters = {
                leagueId: leagueSelect ? leagueSelect.value : null,
                leagueType: leagueTypeSelect ? leagueTypeSelect.value : null,
                startDate: startDateInput ? (startDateInput.value ? new Date(startDateInput.value).toISOString().slice(0, 16) : null) : null,
                endDate: endDateInput ? (endDateInput.value ? new Date(endDateInput.value).toISOString().slice(0, 16) : null) : null
            };
            const activeFilters = Object.fromEntries(
                Object.entries(currentFilters).filter(([_, v]) => v != null && v !== '')
            );
            await loadMatches(activeFilters); // Maçları mevcut filtrelerle yeniden yükle
        });
    }

    async function initializePageData() {
        await loadLeaguesForFilter();
        currentToken = localStorage.getItem('jwtToken');
        if (currentToken) {
            await loadUserExistingPredictions();
        }
        const hashPartsInit = location.hash.split('?');
        const queryParamsFromUrlInit = new URLSearchParams(hashPartsInit[1] || '');
        const initialLeagueIdToLoad = queryParamsFromUrlInit.get('leagueId');

        const initialFilters = {};
        if (initialLeagueIdToLoad) {
            initialFilters.leagueId = initialLeagueIdToLoad;
             // Eğer ligler yüklendiyse ve leagueSelect varsa, değeri ayarla
            if (leagueSelect && leagueSelect.options.length > 1) { // Kontrol et: ligler yüklendi mi?
                 // Lig dropdown'ının dolmasını bekle veya burada bir timeout/promise ile senkronize et
                 // Şimdilik doğrudan set etmeye çalışalım, loadLeaguesForFilter önce biterse çalışır.
                leagueSelect.value = initialLeagueIdToLoad;
            }
        }
        await loadMatches(initialFilters);
        updateClearFiltersButtonVisibility(); // Sayfa ilk yüklendiğinde de buton görünürlüğünü ayarla
    }

    initializePageData();
} // initializeMatchesPage Sonu

// ui.js'deki showSpinner, hideSpinner, clearMessage, showMessage, escapeHTML fonksiyonlarının var olduğu varsayılıyor.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMatchesPage);
} else {
    initializeMatchesPage();
}