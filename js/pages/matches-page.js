// js/pages/matches-page.js
function initializeMatchesPage() {
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

    let userPredictionsMap = new Map(); // Kullanıcının tahminlerini { matchId (number) -> predictionObject } şeklinde tutar

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
        const currentToken = localStorage.getItem('jwtToken');
        if (!currentToken) {
            userPredictionsMap.clear();
            return;
        }
        userPredictionsMap.clear(); // Her çağrıda map'i temizle, güncel veriyi al
        const response = await fetchAPI('/predictions/user', 'GET', null, true);

        if (response.success && response.data && Array.isArray(response.data.predictions)) {
            response.data.predictions.forEach(prediction => {
                if (prediction.match && typeof prediction.match.id !== 'undefined') {
                    const matchId = Number(prediction.match.id);
                    if (!isNaN(matchId)) {
                        userPredictionsMap.set(matchId, prediction);
                    }
                }
            });
        } else {
            userPredictionsMap.clear();
        }
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
        if (!matchesListContainer || !matchesLoadingSpinner || !matchesErrorContainer) {
            return;
        }

        showSpinner('matches-loading');
        matchesListContainer.innerHTML = '';
        matchesErrorContainer.style.display = 'none';
        if (matchesMessageContainer) clearMessage('matches-message');
        clearMessage('global-message-area');

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
                    const currentMatchId = Number(match.id);
                    const userPredictionForThisMatch = userPredictionsMap.get(currentMatchId);

                    let actionContent = '';
                    const isUserLoggedIn = !!localStorage.getItem('jwtToken');
                    const canPredict = isUserLoggedIn && !match.finished && matchDate > new Date() && !userPredictionForThisMatch;

                    if (userPredictionForThisMatch) {
                        actionContent = `
                            <div class="card-footer text-center bg-light py-2">
                                <p class="mb-0 small"><strong>Tahmininiz:</strong>
                                    <span class="fw-bold">${escapeHTML(String(userPredictionForThisMatch.predictedHomeScore))} - ${escapeHTML(String(userPredictionForThisMatch.predictedAwayScore))}</span>
                                    <span class="text-muted">(${escapeHTML(String(userPredictionForThisMatch.stakePoints))} Puan)</span>
                                </p>
                            </div>`;
                    } else if (canPredict) {
                        actionContent = `
                            <div class="card-footer text-center py-2">
                                <button class="btn btn-sm btn-warning predict-btn"
                                        data-match-id="${currentMatchId}"
                                        data-home-team="${escapeHTML(match.homeTeam)}"
                                        data-away-team="${escapeHTML(match.awayTeam)}">
                                    Tahmin Yap
                                </button>
                            </div>`;
                    }

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
                                    <small class="text-muted">ID: ${currentMatchId}</small>
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
            if (localStorage.getItem('jwtToken')) {
                await loadUserExistingPredictions();
            }
            await loadMatches(activeFilters);
        });
    }

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', async function() {
            if(filterForm) filterForm.reset();
            if (localStorage.getItem('jwtToken')) {
                await loadUserExistingPredictions();
            }
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
         if (!predictMatchIdInput || !predictMatchTeamsSpan || !predictHomeTeamLabel || !predictAwayTeamLabel || !predictionModal || !predictionForm) {
            return;
         }
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
        const currentToken = localStorage.getItem('jwtToken');
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
            const errorMessage = (response.error && response.error.message) ? response.error.message : (response.message || 'Tahmin kaydedilirken bir hata oluştu.');
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

            const currentToken = localStorage.getItem('jwtToken');
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
        await loadLeaguesForFilter();
        const currentToken = localStorage.getItem('jwtToken');
        if (currentToken) {
            await loadUserExistingPredictions();
        }

        const hashPartsInit = location.hash.split('?');
        const queryParamsFromUrlInit = new URLSearchParams(hashPartsInit[1] || '');
        const initialLeagueIdToLoad = queryParamsFromUrlInit.get('leagueId');

        const initialFilters = {};
        if (initialLeagueIdToLoad) {
            initialFilters.leagueId = initialLeagueIdToLoad;
            if (leagueSelect) {
                leagueSelect.value = initialLeagueIdToLoad;
            }
        }
        await loadMatches(initialFilters);
        updateClearFiltersButtonVisibility();
    }

    initializePageData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMatchesPage);
} else {
    initializeMatchesPage();
}