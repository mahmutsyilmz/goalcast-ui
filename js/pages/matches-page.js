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
    const leagueTypeSelect = document.getElementById('filter-leagueType');
    const startDateInput = document.getElementById('filter-startDate');
    const endDateInput = document.getElementById('filter-endDate');
    const clearFiltersButton = document.getElementById('clear-filters-btn');

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

    const countryDisplayNames = {
        "TURKEY": "Türkiye", "FRANCE": "Fransa", "ENGLAND": "İngiltere",
        "SPAIN": "İspanya", "ITALY": "İtalya", "GERMANY": "Almanya", "OTHER": "Diğer Ülke"
    };
    const leagueTypeDisplayNames = {
        "NATIONAL_LEAGUE": "Ulusal Lig", "DOMESTIC_CUP": "Ulusal Kupa",
        "INTERNATIONAL_CLUB": "Ulus. Kulüp Turnuvası", "INTERNATIONAL_NATIONAL": "Ulus. Milli Takım Turnuvası",
        "FRIENDLY": "Hazırlık Maçı", "OTHER": "Diğer"
    };

    // --- KULLANICININ MEVCUT TAHMİNLERİNİ YÜKLEYEN FONKSİYON ---
    async function loadUserExistingPredictions() {
        console.log("Maçlar Sayfası: loadUserExistingPredictions çağrıldı."); // BAŞLANGIÇ YORUMU
        currentToken = localStorage.getItem('jwtToken'); // Her ihtimale karşı token'ı güncelle
        if (!currentToken) {
            userPredictionsMap.clear();
            console.log("Maçlar Sayfası: Token yok, tahminler temizlendi."); // YORUM
            return;
        }
        // Önceki tahminleri temizle, her seferinde güncel listeyi al
        userPredictionsMap.clear();
        const response = await fetchAPI('/predictions/user', 'GET', null, true);
        if (response.success && Array.isArray(response.data)) {
            response.data.forEach(prediction => {
                // Maç ID'sinin null veya undefined olmadığından emin ol
                if (prediction.match && typeof prediction.match.id !== 'undefined') {
                    userPredictionsMap.set(prediction.match.id, prediction);
                } else {
                    console.warn("Maçlar sayfası: Geçersiz maç verisi içeren tahmin geldi:", prediction);
                }
            });
            console.log("Maçlar Sayfası: Kullanıcının mevcut tahminleri yüklendi, Map boyutu:", userPredictionsMap.size); // YORUM
        } else {
            console.warn("Maçlar Sayfası: Kullanıcının mevcut tahminleri yüklenemedi veya boş. Map temizlendi."); // YORUM
            userPredictionsMap.clear(); // Hata durumunda da temizle
        }
        // --- FONKSİYON SONU ---
    }

    async function loadLeaguesForFilter() {
        if (!leagueSelect) return;
        const response = await fetchAPI('/leagues', 'GET', null, false);
        if (response.success && Array.isArray(response.data)) {
            leagueSelect.innerHTML = '<option value="">Tüm Ligler</option>';
            response.data.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                let leagueDisplayName = escapeHTML(league.name);
                const typeName = league.leagueType ? (leagueTypeDisplayNames[league.leagueType] || league.leagueType) : '';
                const countryName = league.country ? (countryDisplayNames[league.country] || league.country) : '';

                if (typeName && (league.leagueType === 'NATIONAL_LEAGUE' || league.leagueType === 'DOMESTIC_CUP') && countryName) {
                    leagueDisplayName += ` (${escapeHTML(typeName)}, ${escapeHTML(countryName)})`;
                } else if (typeName) {
                     leagueDisplayName += ` (${escapeHTML(typeName)})`;
                } else if (countryName) {
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

        showSpinner('matches-loading');
        matchesListContainer.innerHTML = '';
        matchesErrorContainer.style.display = 'none';
        if (matchesMessageContainer) clearMessage('matches-message');
        clearMessage('global-message-area');

        currentToken = localStorage.getItem('jwtToken');
        // Sadece token varsa ve filtresiz ilk yüklemede/sayfa yenilemede tahminleri çek
        // Bu kontrol loadUserExistingPredictions içinde de var ama burada da olması zararsız.
        // Ya da loadUserExistingPredictions'ı sadece initializePageData'da ve modal kapanınca çağırabiliriz.
        // Şimdilik burada kalsın, ama tekrar tekrar çağrılmasını önlemek için bir state (örn: predictionsLoaded) tutulabilir.
        if (currentToken && userPredictionsMap.size === 0 && Object.keys(filters).length === 0) {
            // await loadUserExistingPredictions(); // Bu satır initializePageData ve modal hidden event'inde zaten var.
                                                // Tekrar çağrılması gereksiz olabilir, performansa göre değerlendir.
                                                // Şimdilik yoruma alıyorum, çünkü initializePageData'da zaten yükleniyor.
        }


        const hashParts = location.hash.split('?');
        const queryParamsFromUrl = new URLSearchParams(hashParts[1] || '');
        const initialLeagueId = queryParamsFromUrl.get('leagueId');

        if (initialLeagueId && !filters.leagueId && Object.keys(filters).length === 0) {
            filters.leagueId = initialLeagueId;
            if (leagueSelect && leagueSelect.options.length > 1) {
                leagueSelect.value = initialLeagueId;
            }
        }

        let queryParams = new URLSearchParams();
        if (filters.leagueId) queryParams.append('leagueId', filters.leagueId);
        if (filters.leagueType) queryParams.append('leagueType', filters.leagueType);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        const endpoint = `/matches?${queryParams.toString()}`;
        const response = await fetchAPI(endpoint, 'GET', null, false);

        hideSpinner('matches-loading');
        if(clearFiltersButton) updateClearFiltersButtonVisibility();

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                matchesErrorContainer.textContent = 'Filtrenize uygun maç bulunamadı veya gösterilecek maç yok.';
                matchesErrorContainer.style.display = 'block';
            } else {
                response.data.forEach(match => {
                    const matchDate = new Date(match.matchDate);
                    // --- KULLANICININ BU MAÇ İÇİN TAHMİNİ VAR MI KONTROLÜ ---
                    const userPredictionForThisMatch = userPredictionsMap.get(match.id);
                    // --- YORUM: userPredictionForThisMatch, kullanıcının bu maç (match.id) için yaptığı tahmini içerir veya undefined'dır. ---
                    
                    let actionContent = '';
                    // Tahmin Yap butonu için koşullar: token var, maç bitmemiş, maç gelecekte VE kullanıcı bu maça daha önce tahmin yapmamış.
                    const canPredict = currentToken && !match.finished && matchDate > new Date() && !userPredictionForThisMatch;
                    
                    // --- ACTION CONTENT OLUŞTURMA BLOGU BAŞLANGICI ---
                    if (userPredictionForThisMatch) {
                        // --- YORUM: Eğer kullanıcı bu maça daha önce tahmin yapmışsa, tahminini göster ---
                        actionContent = `
                            <div class="card-footer text-center bg-light py-2">
                                <p class="mb-0 small"><strong>Tahmininiz:</strong>
                                    <span class="fw-bold">${escapeHTML(userPredictionForThisMatch.predictedHomeScore.toString())} - ${escapeHTML(userPredictionForThisMatch.predictedAwayScore.toString())}</span>
                                    <span class="text-muted">(${escapeHTML(userPredictionForThisMatch.stakePoints.toString())} Puan)</span>
                                </p>
                            </div>`;
                    } else if (canPredict) {
                        // --- YORUM: Eğer kullanıcı tahmin yapabilir durumdaysa (ve daha önce yapmamışsa), Tahmin Yap butonunu göster ---
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
                    // --- YORUM: Eğer maç bitmişse, geçmişteyse veya token yoksa actionContent boş kalır (veya farklı bir mesaj gösterilebilir) ---
                    // --- ACTION CONTENT OLUŞTURMA BLOGU SONU ---


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
                                            `<p class="card-text fs-4 fw-bold mb-1">${escapeHTML(String(match.homeScore))} - ${escapeHTML(String(match.awayScore))}</p>
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
                addPredictButtonListeners();
            }
            if (matchesMessageContainer && response.message && response.data && response.data.length > 0) {
                 showMessage('matches-message', response.message, 'success');
            }
        } else {
            matchesErrorContainer.style.display = 'block';
            const errorMessage = (response.error && response.error.message) ? response.error.message : 'Maçlar yüklenirken bir hata oluştu.';
            matchesErrorContainer.textContent = errorMessage;
        }
    }

    function addPredictButtonListeners() {
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
                leagueType: leagueTypeSelect ? leagueTypeSelect.value : null,
                startDate: startDateInput ? (startDateInput.value ? new Date(startDateInput.value).toISOString().slice(0, 16) : null) : null,
                endDate: endDateInput ? (endDateInput.value ? new Date(endDateInput.value).toISOString().slice(0, 16) : null) : null
            };
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v != null && v !== '')
            );
            await loadUserExistingPredictions(); // Filtreleme öncesi tahminleri güncelle
            await loadMatches(activeFilters);
        });
    }

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', async function() {
            if(filterForm) filterForm.reset();
            await loadUserExistingPredictions(); // Filtreleri temizleyince de tahminleri güncelle
            await loadMatches();
        });
    }

    function updateClearFiltersButtonVisibility() {
        if (!clearFiltersButton) return;
        if ((leagueSelect && leagueSelect.value) ||
            (leagueTypeSelect && leagueTypeSelect.value) ||
            (startDateInput && startDateInput.value) ||
            (endDateInput && endDateInput.value)) {
            clearFiltersButton.style.display = 'inline-block';
        } else {
            clearFiltersButton.style.display = 'none';
        }
    }

    if(leagueSelect) leagueSelect.addEventListener('change', updateClearFiltersButtonVisibility);
    if(leagueTypeSelect) leagueTypeSelect.addEventListener('change', updateClearFiltersButtonVisibility);
    if(startDateInput) startDateInput.addEventListener('input', updateClearFiltersButtonVisibility);
    if(endDateInput) endDateInput.addEventListener('input', updateClearFiltersButtonVisibility);


    function openPredictionModal(matchId, homeTeam, awayTeam) {
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
            setTimeout(() => {
                if(predictionModal) predictionModal.hide();
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
                await loadUserExistingPredictions();
            } else {
                userPredictionsMap.clear();
            }
            const currentFilters = {
                leagueId: leagueSelect ? leagueSelect.value : null,
                leagueType: leagueTypeSelect ? leagueTypeSelect.value : null,
                startDate: startDateInput ? (startDateInput.value ? new Date(startDateInput.value).toISOString().slice(0, 16) : null) : null,
                endDate: endDateInput ? (endDateInput.value ? new Date(endDateInput.value).toISOString().slice(0, 16) : null) : null
            };
            const activeFilters = Object.fromEntries(
                Object.entries(currentFilters).filter(([_, v]) => v != null && v !== '')
            );
            await loadMatches(activeFilters);
        });
    }

    async function initializePageData() {
        await loadLeaguesForFilter(); // Önce ligleri yükle
        currentToken = localStorage.getItem('jwtToken');
        if (currentToken) {
            await loadUserExistingPredictions(); // Sonra kullanıcı tahminlerini yükle
        }

        // Sayfa ilk yüklendiğinde veya URL'den filtre geldiğinde
        const hashPartsInit = location.hash.split('?');
        const queryParamsFromUrlInit = new URLSearchParams(hashPartsInit[1] || '');
        const initialLeagueIdToLoad = queryParamsFromUrlInit.get('leagueId');

        const initialFilters = {};
        if (initialLeagueIdToLoad) {
            initialFilters.leagueId = initialLeagueIdToLoad;
            // Dropdown'ı ayarla (loadLeaguesForFilter bittikten sonra)
            if (leagueSelect) { // leagueSelect'in varlığından emin ol
                // Option'ların yüklenmesini beklemek için küçük bir gecikme veya promise bazlı çözüm
                // en basit yol, doğrudan set etmek, eğer option'lar varsa çalışır.
                leagueSelect.value = initialLeagueIdToLoad;
            }
        }
        await loadMatches(initialFilters); // En son maçları yükle
        updateClearFiltersButtonVisibility();
    }

    initializePageData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMatchesPage);
} else {
    initializeMatchesPage();
}