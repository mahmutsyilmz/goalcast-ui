// js/pages/admin-matches-page.js
console.log('admin-matches-page.js: Script başladı.');

function initializeAdminMatchesPage() {
    console.log('admin-matches-page.js: initializeAdminMatchesPage çağrıldı.');

    const matchesTableBody = document.getElementById('admin-matches-table-body');
    const matchesLoadingSpinner = document.getElementById('admin-matches-loading');
    const matchesErrorContainer = document.getElementById('admin-matches-error');
    const matchesEmptyContainer = document.getElementById('admin-matches-empty');
    // const adminMatchesMessageContainer = document.getElementById('admin-matches-message'); // HTML'de var, kullanılabilir

    const addMatchBtn = document.getElementById('addMatchBtn');

    const matchModalElement = document.getElementById('matchModal');
    const matchModal = matchModalElement ? new bootstrap.Modal(matchModalElement) : null;
    const matchModalLabel = document.getElementById('matchModalLabel');
    const matchForm = document.getElementById('match-form');
    const matchIdInput = document.getElementById('match-id');
    const matchLeagueSelect = document.getElementById('match-leagueId');
    const matchHomeTeamInput = document.getElementById('match-homeTeam');
    const matchAwayTeamInput = document.getElementById('match-awayTeam');
    const matchDateInput = document.getElementById('match-matchDate');
    const matchModalMessage = document.getElementById('match-modal-message');
    const saveMatchBtn = document.getElementById('saveMatchBtn');

    const matchResultModalElement = document.getElementById('matchResultModal');
    const matchResultModal = matchResultModalElement ? new bootstrap.Modal(matchResultModalElement) : null;
    const matchResultModalLabel = document.getElementById('matchResultModalLabel');
    const matchResultForm = document.getElementById('match-result-form');
    const resultMatchIdInput = document.getElementById('result-match-id');
    const resultMatchInfoSpan = document.getElementById('result-match-info');
    const resultHomeScoreInput = document.getElementById('result-homeScore');
    const resultAwayScoreInput = document.getElementById('result-awayScore');
    const matchResultModalMessage = document.getElementById('match-result-modal-message');
    const saveMatchResultBtn = document.getElementById('saveMatchResultBtn');
    
    const deleteMatchConfirmModalElement = document.getElementById('deleteMatchConfirmModal');
    const deleteMatchConfirmModal = deleteMatchConfirmModalElement ? new bootstrap.Modal(deleteMatchConfirmModalElement) : null;
    // const deleteMatchIdInput = document.getElementById('delete-match-id'); // Bu modal body'sine dinamik eklenecek
    const confirmDeleteMatchBtn = document.getElementById('confirmDeleteMatchBtn');

    let editingMatchId = null;
    let matchIdToUpdateResult = null;
    let matchToDeleteId = null; // Silinecek maç ID'sini global tutalım

    async function loadLeaguesForMatchModal() {
        if (!matchLeagueSelect) {
            console.error("Admin Maçlar: Lig select dropdown'ı bulunamadı.");
            return;
        }
        const response = await fetchAPI('/leagues', 'GET', null, false);
        if (response.success && Array.isArray(response.data)) {
            matchLeagueSelect.innerHTML = '<option value="" selected disabled>Lig Seçiniz...</option>';
            response.data.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                option.textContent = `${league.name} (${league.country})`;
                matchLeagueSelect.appendChild(option);
            });
        } else {
            console.warn('Admin Maçlar: Maç modalı için ligler yüklenemedi.');
            matchLeagueSelect.innerHTML = '<option value="" selected disabled>Ligler yüklenemedi</option>';
        }
    }

    async function loadAdminMatches() {
        if (!matchesTableBody || !matchesLoadingSpinner || !matchesErrorContainer || !matchesEmptyContainer) {
            console.error("Admin Maçlar: Listeleme için DOM elementleri eksik.");
            return;
        }

        matchesLoadingSpinner.style.display = 'block';
        matchesTableBody.innerHTML = '';
        matchesErrorContainer.style.display = 'none';
        matchesEmptyContainer.style.display = 'none';
        if(typeof clearMessage === 'function') {
            clearMessage('admin-matches-message'); // Bu ID'li element HTML'de olmalı
            clearMessage('global-message-area');
        }

        const response = await fetchAPI('/matches', 'GET', null, false); 
        matchesLoadingSpinner.style.display = 'none';

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                matchesEmptyContainer.style.display = 'block';
            } else {
                const sortedMatches = response.data.sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate));
                sortedMatches.forEach(match => {
                    const matchDate = new Date(match.matchDate);
                    // Backend'den gelen JSON'da 'finished' olmalı, 'isFinished' değil.
                    const scoreDisplay = match.finished ? `${match.homeScore} - ${match.awayScore}` : '-';
                    const statusDisplay = match.finished ? '<span class="badge bg-danger">Bitti</span>' : '<span class="badge bg-success">Yakında</span>';
                    
                    const row = `
                        <tr>
                            <td>${match.id}</td>
                            <td>${match.league.name}</td>
                            <td>${match.homeTeam}</td>
                            <td>${match.awayTeam}</td>
                            <td>${matchDate.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td>${scoreDisplay}</td>
                            <td>${statusDisplay}</td>
                            <td>
                                <button class="btn btn-sm btn-info result-match-btn" 
                                        data-match-id="${match.id}" 
                                        data-match-info="${match.homeTeam} vs ${match.awayTeam}" 
                                        ${match.finished ? 'disabled' : ''}>
                                    <i class="fas fa-futbol"></i> Sonuç
                                </button>
                                <button class="btn btn-sm btn-warning edit-match-btn" 
                                        data-match-id="${match.id}" 
                                        ${match.finished ? 'disabled' : ''}>
                                    <i class="fas fa-edit"></i> Düzenle
                                </button>
                                <button class="btn btn-sm btn-danger delete-match-btn" 
                                        data-match-id="${match.id}" 
                                        data-match-info="${match.homeTeam} vs ${match.awayTeam}">
                                    <i class="fas fa-trash-alt"></i> Sil
                                </button>
                            </td>
                        </tr>
                    `;
                    matchesTableBody.insertAdjacentHTML('beforeend', row);
                });
                addTableButtonListeners();
            }
            if (typeof showMessage === 'function' && response.data && response.data.length > 0) {
                 showMessage('admin-matches-message', response.message || 'Maçlar başarıyla yüklendi.', 'success');
            }
        } else {
            matchesErrorContainer.style.display = 'block';
            matchesErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Maçlar yüklenirken bir hata oluştu.';
        }
    }

    function addTableButtonListeners() {
        document.querySelectorAll('.edit-match-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const matchId = this.dataset.matchId;
                const response = await fetchAPI('/matches', 'GET', null, false); 
                if (response.success && Array.isArray(response.data)) {
                    const matchToEdit = response.data.find(m => m.id.toString() === matchId);
                    if (matchToEdit) {
                        openEditMatchModal(matchToEdit);
                    } else {
                        if(typeof showMessage === 'function') showMessage('admin-matches-message', 'Düzenlenecek maç bulunamadı.', 'danger');
                    }
                }
            });
        });

        document.querySelectorAll('.delete-match-btn').forEach(button => {
            button.addEventListener('click', function() {
                const matchId = this.dataset.matchId;
                const matchInfo = this.dataset.matchInfo;
                openDeleteMatchConfirmModal(matchId, matchInfo);
            });
        });

        document.querySelectorAll('.result-match-btn').forEach(button => {
            button.addEventListener('click', function() {
                const matchId = this.dataset.matchId;
                const matchInfo = this.dataset.matchInfo;
                openMatchResultModal(matchId, matchInfo);
            });
        });
    }
    
    if (addMatchBtn) {
        addMatchBtn.addEventListener('click', function() {
            editingMatchId = null;
            if(matchModalLabel) matchModalLabel.textContent = 'Yeni Maç Ekle';
            if(matchForm) matchForm.reset();
            if(matchIdInput) matchIdInput.value = '';
            if(typeof clearMessage === 'function' && matchModalMessage) clearMessage('match-modal-message');
        });
    } else {
        console.error("Admin Maçlar: 'Yeni Maç Ekle' butonu bulunamadı.");
    }


    if (matchForm) {
        matchForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('admin-matches-page.js: Maç formu submit edildi.');

            if(!matchLeagueSelect || !matchHomeTeamInput || !matchAwayTeamInput || !matchDateInput || !saveMatchBtn) {
                console.error("Admin Maçlar: Maç formu elemanları eksik.");
                if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', 'Formda bir sorun var.', 'danger');
                return;
            }

            const matchDateValue = matchDateInput.value; 
            const matchData = {
                leagueId: parseInt(matchLeagueSelect.value),
                homeTeam: matchHomeTeamInput.value.trim(),
                awayTeam: matchAwayTeamInput.value.trim(),
                matchDate: matchDateValue 
            };

            if (!matchData.leagueId || !matchData.homeTeam || !matchData.awayTeam || !matchDateInput.value) {
                if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', 'Tüm alanlar zorunludur.', 'warning');
                return;
            }
            if (new Date(matchData.matchDate) <= new Date()) {
                 if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', 'Maç tarihi geçmiş veya şu anki bir tarih olamaz.', 'warning');
                 return;
            }

            let response;
            const originalButtonText = saveMatchBtn.innerHTML;
            saveMatchBtn.disabled = true;
            saveMatchBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';

            if (editingMatchId) {
                response = await fetchAPI(`/admin/matches/${editingMatchId}`, 'PUT', matchData, true);
            } else {
                response = await fetchAPI('/admin/matches', 'POST', matchData, true);
            }

            saveMatchBtn.disabled = false;
            saveMatchBtn.innerHTML = originalButtonText;

            if (response.success && response.data) {
                if (typeof showMessage === 'function' && document.getElementById('admin-matches-message')) showMessage('admin-matches-message', response.message || `Maç başarıyla ${editingMatchId ? 'güncellendi' : 'eklendi'}!`, 'success');
                if(matchModal) matchModal.hide();
                await loadAdminMatches();
            } else {
                if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', (response.error && response.error.message) || 'Bir hata oluştu.', 'danger');
            }
        });
        console.log('admin-matches-page.js: Maç formu için submit listener eklendi.');
    } else {
         console.error('HATA: admin-matches-page.js: Maç formu (id="match-form") bulunamadı!');
    }
    

    function openEditMatchModal(match) {
        editingMatchId = match.id;
        if(matchModalLabel) matchModalLabel.textContent = `Maçı Düzenle: ${match.homeTeam} vs ${match.awayTeam}`;
        if(matchForm) matchForm.reset();
        if(typeof clearMessage === 'function' && matchModalMessage) clearMessage('match-modal-message');

        if(matchIdInput) matchIdInput.value = match.id;
        if(matchLeagueSelect) matchLeagueSelect.value = match.league.id;
        if(matchHomeTeamInput) matchHomeTeamInput.value = match.homeTeam;
        if(matchAwayTeamInput) matchAwayTeamInput.value = match.awayTeam;
        if(matchDateInput && match.matchDate) matchDateInput.value = match.matchDate.substring(0, 16);

        if(matchModal) matchModal.show();
    }

    function openMatchResultModal(matchId, matchInfo) {
        matchIdToUpdateResult = matchId;
        if(matchResultModalLabel) matchResultModalLabel.textContent = `Sonuç Gir: ${matchInfo}`;
        if(matchResultForm) matchResultForm.reset();
        if(typeof clearMessage === 'function' && matchResultModalMessage) clearMessage('match-result-modal-message');
        if(resultMatchIdInput) resultMatchIdInput.value = matchId;
        if(resultMatchInfoSpan) resultMatchInfoSpan.textContent = matchInfo;
        if(matchResultModal) matchResultModal.show();
    }

    if (matchResultForm) {
        matchResultForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if(!resultHomeScoreInput || !resultAwayScoreInput || !saveMatchResultBtn) {
                 console.error("Admin Maçlar: Maç sonucu formu elemanları eksik.");
                 if (typeof showMessage === 'function' && matchResultModalMessage) showMessage('match-result-modal-message', 'Formda bir sorun var.', 'danger');
                 return;
            }
            const resultData = {
                homeScore: parseInt(resultHomeScoreInput.value),
                awayScore: parseInt(resultAwayScoreInput.value)
            };

            if (isNaN(resultData.homeScore) || isNaN(resultData.awayScore) || resultData.homeScore < 0 || resultData.awayScore < 0) {
                if (typeof showMessage === 'function' && matchResultModalMessage) showMessage('match-result-modal-message', 'Geçerli skorlar giriniz (sayı, min 0).', 'warning');
                return;
            }

            const originalButtonText = saveMatchResultBtn.innerHTML;
            saveMatchResultBtn.disabled = true;
            saveMatchResultBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';

            const response = await fetchAPI(`/admin/matches/${matchIdToUpdateResult}/result`, 'PUT', resultData, true);

            saveMatchResultBtn.disabled = false;
            saveMatchResultBtn.innerHTML = originalButtonText;

            if (response.success && response.data) {
                if (typeof showMessage === 'function' && document.getElementById('admin-matches-message')) showMessage('admin-matches-message', response.message || 'Maç sonucu başarıyla güncellendi!', 'success');
                if(matchResultModal) matchResultModal.hide();
                await loadAdminMatches();
            } else {
                if (typeof showMessage === 'function' && matchResultModalMessage) showMessage('match-result-modal-message', (response.error && response.error.message) || 'Sonuç güncellenirken bir hata oluştu.', 'danger');
            }
        });
         console.log('admin-matches-page.js: Maç sonucu formu için submit listener eklendi.');
    } else {
        console.error('HATA: admin-matches-page.js: Maç sonucu formu (id="match-result-form") bulunamadı!');
    }


    function openDeleteMatchConfirmModal(matchId, matchInfo) {
        matchToDeleteId = matchId;
        const modalBody = deleteMatchConfirmModalElement ? deleteMatchConfirmModalElement.querySelector('.modal-body') : null;
        if(modalBody) {
            const oldHiddenInput = modalBody.querySelector('#delete-match-id-hidden'); // Farklı ID kullanıyoruz
            if(oldHiddenInput) oldHiddenInput.remove();
            
            modalBody.textContent = `'${matchInfo}' (ID: ${matchId}) adlı maçı silmek istediğinizden emin misiniz?`;
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'delete-match-id-hidden'; // Farklı ID
            hiddenInput.value = matchId;
            modalBody.appendChild(hiddenInput);
        }
        if(deleteMatchConfirmModal) deleteMatchConfirmModal.show();
    }

    if (confirmDeleteMatchBtn) {
        confirmDeleteMatchBtn.addEventListener('click', async function() {
            const idInputInModal = deleteMatchConfirmModalElement ? deleteMatchConfirmModalElement.querySelector('#delete-match-id-hidden') : null;
            const idToDelete = idInputInModal ? idInputInModal.value : matchToDeleteId;

            if (!idToDelete) {
                console.error("Silinecek maç ID'si bulunamadı.");
                return;
            }

            const originalButtonText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Siliniyor...';

            const response = await fetchAPI(`/admin/matches/${idToDelete}`, 'DELETE', null, true);

            this.disabled = false;
            this.innerHTML = originalButtonText;

            if (response.success && response.fullResponse && response.fullResponse.success) {
                if (typeof showMessage === 'function' && document.getElementById('admin-matches-message')) showMessage('admin-matches-message', response.message || 'Maç başarıyla silindi!', 'success');
                if(deleteMatchConfirmModal) deleteMatchConfirmModal.hide();
                await loadAdminMatches();
            } else {
                if (typeof showMessage === 'function' && document.getElementById('admin-matches-message')) showMessage('admin-matches-message', (response.error && response.error.message) || 'Maç silinirken bir hata oluştu.', 'danger');
            }
        });
    } else {
         console.error("Admin Maçlar: Maç silme onay butonu bulunamadı.");
    }
    

    if(matchModalElement) matchModalElement.addEventListener('hidden.bs.modal', function () { if(matchForm) matchForm.reset(); editingMatchId = null; if(typeof clearMessage === 'function' && matchModalMessage) clearMessage('match-modal-message');});
    if(matchResultModalElement) matchResultModalElement.addEventListener('hidden.bs.modal', function () { if(matchResultForm) matchResultForm.reset(); matchIdToUpdateResult = null; if(typeof clearMessage === 'function' && matchResultModalMessage) clearMessage('match-result-modal-message'); });
    if(deleteMatchConfirmModalElement) deleteMatchConfirmModalElement.addEventListener('hidden.bs.modal', function () { const DMI = deleteMatchConfirmModalElement.querySelector('#delete-match-id-hidden'); if(DMI) DMI.remove(); matchToDeleteId = null; });

    async function initializePageData() {
        await loadLeaguesForMatchModal();
        await loadAdminMatches();
    }

    initializePageData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminMatchesPage);
} else {
    initializeAdminMatchesPage();
}