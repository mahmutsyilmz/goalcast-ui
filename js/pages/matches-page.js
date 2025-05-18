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

    async function loadUserExistingPredictions() {
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
            console.log("Maçlar sayfası: Kullanıcının mevcut tahminleri yüklendi:", userPredictionsMap);
        } else {
            console.warn("Maçlar sayfası: Kullanıcının mevcut tahminleri yüklenemedi veya boş.");
            userPredictionsMap.clear();
        }
    }

    async function loadLeaguesForFilter() {
        if (!leagueSelect) {
            console.error("Maçlar sayfası: Lig select dropdown'ı bulunamadı.");
            return;
        }
        const response = await fetchAPI('/leagues', 'GET', null, false);
        if (response.success && Array.isArray(response.data)) {
            leagueSelect.innerHTML = '<option value="">Tüm Ligler</option>';
            response.data.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                option.textContent = `${league.name} (${league.country})`;
                leagueSelect.appendChild(option);
            });
        } else {
            console.warn('Maçlar sayfası: Filtre için ligler yüklenemedi.');
            leagueSelect.innerHTML = '<option value="">Ligler Yüklenemedi</option>';
        }
    }

    async function loadMatches(filters = {}) {
        if (!matchesListContainer || !matchesLoadingSpinner || !matchesErrorContainer) {
            console.error("Maçlar sayfası: Listeleme için DOM elementleri eksik.");
            return;
        }

        matchesLoadingSpinner.style.display = 'block';
        matchesListContainer.innerHTML = '';
        matchesErrorContainer.style.display = 'none';
        if (typeof clearMessage === 'function') {
            if(matchesMessageContainer) clearMessage('matches-message');
            clearMessage('global-message-area');
        }
        
        currentToken = localStorage.getItem('jwtToken'); // Her maç yüklemesinde token'ı tekrar alalım
        if (currentToken && userPredictionsMap.size === 0 && Object.keys(filters).length === 0) { // Sadece token varsa ve filtresiz ilk yüklemede tahminleri çek
             await loadUserExistingPredictions();
        }

        // URL'den gelen leagueId filtresini uygula (eğer varsa ve filtrelerde yoksa)
        const hashParts = location.hash.split('?');
        const queryParamsFromUrl = new URLSearchParams(hashParts[1] || '');
        const initialLeagueId = queryParamsFromUrl.get('leagueId');
        if (initialLeagueId && !filters.leagueId) {
            filters.leagueId = initialLeagueId;
            if (leagueSelect && leagueSelect.options.length > 1) {
                leagueSelect.value = initialLeagueId;
            }
        }

        let queryParams = new URLSearchParams();
        if (filters.leagueId) queryParams.append('leagueId', filters.leagueId);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        const endpoint = `/matches?${queryParams.toString()}`;
        const response = await fetchAPI(endpoint, 'GET', null, false);

        matchesLoadingSpinner.style.display = 'none';
        if(clearFiltersButton) updateClearFiltersButtonVisibility();

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                if(matchesErrorContainer) {
                    matchesErrorContainer.textContent = 'Filtrenize uygun maç bulunamadı veya gösterilecek maç yok.';
                    matchesErrorContainer.style.display = 'block';
                }
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
                                    <span class="fw-bold">${userPredictionForThisMatch.predictedHomeScore} - ${userPredictionForThisMatch.predictedAwayScore}</span>
                                    <span class="text-muted">(${userPredictionForThisMatch.stakePoints} Puan)</span>
                                </p>
                            </div>`;
                    } else if (canPredict) {
                        actionContent = `
                            <div class="card-footer text-center py-2">
                                <button class="btn btn-sm btn-warning predict-btn" 
                                        data-match-id="${match.id}" 
                                        data-home-team="${match.homeTeam}" 
                                        data-away-team="${match.awayTeam}">
                                    Tahmin Yap
                                </button>
                            </div>`;
                    }

                    const matchCard = `
                        <div class="col">
                            <div class="card h-100"> 
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span>${match.league.name} - ${match.league.country}</span>
                                    <small class="text-muted">ID: ${match.id}</small>
                                </div>
                                <div class="card-body d-flex flex-column"> 
                                    <h5 class="card-title text-center">${match.homeTeam} vs ${match.awayTeam}</h5>
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
                    if(matchesListContainer) matchesListContainer.insertAdjacentHTML('beforeend', matchCard);
                });
                addTableButtonListeners();

                document.querySelectorAll('.predict-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const matchId = this.dataset.matchId;
                        const homeTeam = this.dataset.homeTeam;
                        const awayTeam = this.dataset.awayTeam;
                        openPredictionModal(matchId, homeTeam, awayTeam);
                    });
                });
            }
            if (typeof showMessage === 'function' && matchesMessageContainer && response.data && response.data.length > 0) {
                 showMessage('matches-message', response.message || 'Maçlar başarıyla yüklendi.', 'success');
            }
        } else {
            if(matchesErrorContainer) {
                matchesErrorContainer.style.display = 'block';
                const errorMessage = (response.error && response.error.message) ? response.error.message : 'Maçlar yüklenirken bir hata oluştu.';
                matchesErrorContainer.textContent = errorMessage;
            }
        }
    }

    // --- YENİ EKLENECEK FONKSİYON ---
    function addTableButtonListeners() {
        console.log("matches-page.js: addTableButtonListeners çağrıldı.");
        const predictButtons = document.querySelectorAll('.predict-btn');
        if (predictButtons.length > 0) {
            console.log(`matches-page.js: ${predictButtons.length} adet .predict-btn bulundu.`);
        } else {
            console.warn("matches-page.js: Hiç .predict-btn bulunamadı.");
        }

        predictButtons.forEach(button => {
            // Eğer butona daha önce listener eklenmişse tekrar eklememek için bir kontrol (opsiyonel ama iyi pratik)
            // Ancak loadMatches her çağrıldığında matchesListContainer.innerHTML = '' yapıldığı için butonlar yeniden oluşur,
            // bu yüzden eski listener'lar kaybolur ve yeniden eklenmesi gerekir.
            button.addEventListener('click', function() {
                console.log("matches-page.js: .predict-btn tıklandı.");
                const matchId = this.dataset.matchId;
                const homeTeam = this.dataset.homeTeam;
                const awayTeam = this.dataset.awayTeam;
                openPredictionModal(matchId, homeTeam, awayTeam);
            });
        });
        console.log("matches-page.js: .predict-btn butonlarına event listener'lar eklendi.");
    }
    
    if (filterForm) {
        filterForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const filters = {
                leagueId: leagueSelect ? leagueSelect.value : null,
                startDate: startDateInput ? (startDateInput.value ? new Date(startDateInput.value).toISOString() : null) : null,
                endDate: endDateInput ? (endDateInput.value ? new Date(endDateInput.value).toISOString() : null) : null
            };
            const activeFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v != null && v !== ''));
            await loadMatches(activeFilters);
        });
    } else {
        console.error("Maçlar sayfası: Filtre formu bulunamadı.");
    }

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', async function() {
            if(filterForm) filterForm.reset();
            await loadMatches();
            this.style.display = 'none';
        });
    }
    
    function updateClearFiltersButtonVisibility() {
        if (!clearFiltersButton) return;
        if ((leagueSelect && leagueSelect.value) || (startDateInput && startDateInput.value) || (endDateInput && endDateInput.value)) {
            clearFiltersButton.style.display = 'block';
        } else {
            clearFiltersButton.style.display = 'none';
        }
    }
    if(leagueSelect) leagueSelect.addEventListener('change', updateClearFiltersButtonVisibility);
    if(startDateInput) startDateInput.addEventListener('input', updateClearFiltersButtonVisibility);
    if(endDateInput) endDateInput.addEventListener('input', updateClearFiltersButtonVisibility);

    function openPredictionModal(matchId, homeTeam, awayTeam) {
        if (!predictMatchIdInput || !predictMatchTeamsSpan || !predictHomeTeamLabel || !predictAwayTeamLabel || !predictionModal || !predictionForm) {
            console.error("Maçlar sayfası: Tahmin modalı elementlerinden biri bulunamadı!");
            return;
        }
        if(typeof clearMessage === 'function' && predictionMessageModal) clearMessage('prediction-message-modal');
        predictionForm.reset();

        predictMatchIdInput.value = matchId;
        predictMatchTeamsSpan.textContent = `${homeTeam} vs ${awayTeam}`;
        predictHomeTeamLabel.textContent = `${homeTeam} Skor`;
        predictAwayTeamLabel.textContent = `${awayTeam} Skor`;
        
        predictionModal.show();
    }

    // js/pages/matches-page.js - initializeMatchesPage içinde

    async function handlePredictionSubmit(event) {
        event.preventDefault(); // Formun varsayılan submit davranışını engelle
        console.log('matches-page.js: handlePredictionSubmit fonksiyonu çalıştı.'); // BAŞLANGIÇ LOGU

        currentToken = localStorage.getItem('jwtToken'); 
        if (!currentToken) {
            if (typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', 'Tahmin yapmak için giriş yapmalısınız.', 'warning');
            return;
        }
        
        const predHomeScoreEl = document.getElementById('predictedHomeScore');
        const predAwayScoreEl = document.getElementById('predictedAwayScore');
        const stakePointsEl = document.getElementById('stakePoints');

        if(!predHomeScoreEl || !predAwayScoreEl || !stakePointsEl || !predictMatchIdInput){
            console.error("Maçlar sayfası: Tahmin modalı form elemanları eksik.");
             if (typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', 'Formda bir hata oluştu.', 'danger');
            return;
        }

        const matchId = predictMatchIdInput.value;
        const predictedHomeScore = predHomeScoreEl.value;
        const predictedAwayScore = predAwayScoreEl.value;
        const stakePoints = stakePointsEl.value;

        if (!predictedHomeScore || !predictedAwayScore || !stakePoints) {
            if (typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', 'Lütfen tüm skor ve puan alanlarını doldurun.', 'warning');
            return;
        }
        
        const stake = parseInt(stakePoints);
        if (isNaN(stake) || stake < 100 || stake > 1000) { // isNaN kontrolü eklendi
            if (typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', 'Risk edilecek puan 100 ile 1000 arasında geçerli bir sayı olmalıdır.', 'warning');
            return;
        }

        // Diğer skorlar için de isNaN kontrolü eklenebilir
        const homeScoreInt = parseInt(predictedHomeScore);
        const awayScoreInt = parseInt(predictedAwayScore);

        if (isNaN(homeScoreInt) || homeScoreInt < 0 || isNaN(awayScoreInt) || awayScoreInt < 0) {
            if (typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', 'Skorlar geçerli bir sayı (minimum 0) olmalıdır.', 'warning');
            return;
        }


        const predictionData = {
            matchId: parseInt(matchId),
            predictedHomeScore: homeScoreInt,
            predictedAwayScore: awayScoreInt,
            stakePoints: stake
        };

        console.log("matches-page.js: Sending prediction data:", predictionData); // LOG

        const submitButton = predictionForm ? predictionForm.querySelector('button[type="submit"]') : null;
        if (!submitButton) {
            console.error("Maçlar Sayfası: Tahmin modalı kaydet butonu bulunamadı!");
            if(typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', 'Kaydetme sırasında bir sorun oluştu.', 'danger');
            return;
        }
        
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

        const response = await fetchAPI('/predictions', 'POST', predictionData, true); // API İSTEĞİ

        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;

        if (response.success && response.data) {
            if(typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', response.message || 'Tahmin başarıyla kaydedildi!', 'success');
            console.log("matches-page.js: Tahmin başarılı, modal kapatılacak.");
            setTimeout(() => {
                if(predictionModal) predictionModal.hide(); 
            }, 1500);
        } else {
            const errorMessage = (response.error && response.error.message) ? response.error.message : 'Tahmin kaydedilirken bir hata oluştu.';
            if(typeof showMessage === 'function' && predictionMessageModal) showMessage('prediction-message-modal', errorMessage, 'danger');
            console.error("matches-page.js: Tahmin kaydetme hatası:", response.error);
        }
    } // handlePredictionSubmit sonu

    if (predictionForm) {
    predictionForm.addEventListener('submit', handlePredictionSubmit);
    console.log("Maçlar Sayfası: Tahmin formu için submit listener eklendi."); // BU LOGU KONTROL ET
} else {
    console.error("Maçlar sayfası: Tahmin formu (id=\"prediction-form\") bulunamadı!");
}
    
    if (predictionModalElement) {
        predictionModalElement.addEventListener('hidden.bs.modal', async function (event) {
            if(predictionForm) predictionForm.reset();
            if(typeof clearMessage === 'function' && predictionMessageModal) clearMessage('prediction-message-modal');
            
            currentToken = localStorage.getItem('jwtToken'); 
            if (currentToken) {
                await loadUserExistingPredictions();
            } else {
                userPredictionsMap.clear(); 
            }
            
            const currentFilters = { /* ... */ };
            const activeFilters = Object.fromEntries(Object.entries(currentFilters).filter(([_, v]) => v != null && v !== ''));
            await loadMatches(activeFilters);
        });
    }

    async function initializePageData() {
        console.log("Maçlar sayfası: initializePageData çağrıldı");
        await loadLeaguesForFilter();
        currentToken = localStorage.getItem('jwtToken'); // En güncel token'ı al
        if (currentToken) { 
            await loadUserExistingPredictions();
        }
        // URL'den gelen leagueId filtresini alıp ilk yüklemede kullan
        const hashPartsInit = location.hash.split('?');
        const queryParamsFromUrlInit = new URLSearchParams(hashPartsInit[1] || '');
        const initialLeagueIdToLoad = queryParamsFromUrlInit.get('leagueId');
        await loadMatches(initialLeagueIdToLoad ? { leagueId: initialLeagueIdToLoad } : {});
    }

    initializePageData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMatchesPage);
} else {
    initializeMatchesPage();
}