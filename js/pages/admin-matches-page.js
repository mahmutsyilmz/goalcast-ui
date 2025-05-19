// js/pages/admin-matches-page.js
console.log('admin-matches-page.js: Script başladı.');

function initializeAdminMatchesPage() {
    console.log('admin-matches-page.js: initializeAdminMatchesPage çağrıldı.');

    const matchesTableBody = document.getElementById('admin-matches-table-body');
    const matchesLoadingSpinner = document.getElementById('admin-matches-loading');
    const matchesErrorContainer = document.getElementById('admin-matches-error');
    const matchesEmptyContainer = document.getElementById('admin-matches-empty');
    const adminMatchesMessageContainer = document.getElementById('admin-matches-message');

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
    const matchSendEmailCheckbox = document.getElementById('match-sendEmailNotification'); // YENİ: Checkbox'ı al
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
    const confirmDeleteMatchBtn = document.getElementById('confirmDeleteMatchBtn');

    let editingMatchId = null;
    let matchIdToUpdateResult = null;
    let matchToDeleteId = null;

    async function loadLeaguesForMatchModal() {
        if (!matchLeagueSelect) {
            console.error("Admin Maçlar: Lig select dropdown'ı bulunamadı.");
            return;
        }
        // Ligler zaten herkese açık bir endpoint, requiresAuth: false olmalı
        const response = await fetchAPI('/leagues', 'GET', null, false); 
        if (response.success && Array.isArray(response.data)) {
            matchLeagueSelect.innerHTML = '<option value="" selected disabled>Lig Seçiniz...</option>';
            response.data.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                option.textContent = `${escapeHTML(league.name)} (${escapeHTML(league.country)})`;
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
            if(adminMatchesMessageContainer) clearMessage('admin-matches-message');
            if(document.getElementById('global-message-area')) clearMessage('global-message-area');
        }

        // Maç listesi de herkese açık bir endpoint olabilir veya admin yetkisi gerektirebilir.
        // Şimdilik 'false' bırakıyorum, eğer backend'de /matches yetki istiyorsa 'true' yap.
        const response = await fetchAPI('/matches?showAll=true', 'GET', null, false); // showAll=true ile bitmiş maçları da alalım
        matchesLoadingSpinner.style.display = 'none';

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                matchesEmptyContainer.style.display = 'block';
            } else {
                // Maçları tarihe göre tersten sırala (en yeni en üstte)
                const sortedMatches = response.data.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
                sortedMatches.forEach(match => {
                    const matchDate = new Date(match.matchDate);
                    const scoreDisplay = match.finished ? `${match.homeScore} - ${match.awayScore}` : '-';
                    const statusDisplay = match.finished ? '<span class="badge bg-danger">Bitti</span>' : '<span class="badge bg-success">Yakında</span>';
                    
                    const row = `
                        <tr>
                            <td>${match.id}</td>
                            <td>${escapeHTML(match.league.name)}</td>
                            <td>${escapeHTML(match.homeTeam)}</td>
                            <td>${escapeHTML(match.awayTeam)}</td>
                            <td>${matchDate.toLocaleString('tr-TR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            <td>${scoreDisplay}</td>
                            <td>${statusDisplay}</td>
                            <td>
                                <button class="btn btn-sm btn-info result-match-btn" 
                                        data-match-id="${match.id}" 
                                        data-match-info="${escapeHTML(match.homeTeam)} vs ${escapeHTML(match.awayTeam)}" 
                                        ${match.finished ? 'disabled' : ''} title="Sonuç Gir">
                                    <i class="fas fa-futbol"></i> <span class="d-none d-md-inline">Sonuç</span>
                                </button>
                                <button class="btn btn-sm btn-warning edit-match-btn" 
                                        data-match-id="${match.id}" 
                                        ${match.finished ? 'disabled' : ''} title="Düzenle">
                                    <i class="fas fa-edit"></i> <span class="d-none d-md-inline">Düzenle</span>
                                </button>
                                <button class="btn btn-sm btn-danger delete-match-btn" 
                                        data-match-id="${match.id}" 
                                        data-match-info="${escapeHTML(match.homeTeam)} vs ${escapeHTML(match.awayTeam)}" title="Sil">
                                    <i class="fas fa-trash-alt"></i> <span class="d-none d-md-inline">Sil</span>
                                </button>
                            </td>
                        </tr>
                    `;
                    matchesTableBody.insertAdjacentHTML('beforeend', row);
                });
                addTableButtonListeners();
            }
            if (typeof showMessage === 'function' && adminMatchesMessageContainer && response.data && response.data.length > 0) {
                 showMessage('admin-matches-message', response.message || 'Maçlar başarıyla yüklendi.', 'success');
            }
        } else {
            matchesErrorContainer.style.display = 'block';
            matchesErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Maçlar yüklenirken bir hata oluştu.';
        }
    }

    function addTableButtonListeners() {
        matchesTableBody.querySelectorAll('.edit-match-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const matchId = this.dataset.matchId;
                // Maç detayını API'den çekmek yerine, loadAdminMatches'tan gelen listeden bulabiliriz.
                // Ancak API'den çekmek her zaman en güncel veriyi getirir.
                // Şimdilik, listedeki veriyi güncel tuttuğumuzu varsayarak API'den çekmeye gerek yok,
                // doğrudan match objesini listeden bulup modalı doldurabiliriz.
                // Ama en doğru yaklaşım, düzenlenecek maçın güncel halini API'den çekmektir.
                // /api/matches/{id} gibi bir endpoint'in olması iyi olur.
                // Yoksa, tüm maçları tekrar çekip filtrelemek bir seçenek ama verimsiz.
                // Şimdilik /matches'tan filtreleyerek gidelim:
                const apiResponse = await fetchAPI('/matches?showAll=true', 'GET', null, false); 
                if (apiResponse.success && Array.isArray(apiResponse.data)) {
                    const matchToEdit = apiResponse.data.find(m => m.id.toString() === matchId);
                    if (matchToEdit) {
                        openEditMatchModal(matchToEdit);
                    } else {
                        if(typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', 'Düzenlenecek maç bulunamadı.', 'danger');
                    }
                } else {
                     if(typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', 'Maç bilgileri alınırken hata.', 'danger');
                }
            });
        });

        matchesTableBody.querySelectorAll('.delete-match-btn').forEach(button => {
            button.addEventListener('click', function() {
                const matchId = this.dataset.matchId;
                const matchInfo = this.dataset.matchInfo;
                openDeleteMatchConfirmModal(matchId, matchInfo);
            });
        });

        matchesTableBody.querySelectorAll('.result-match-btn').forEach(button => {
            button.addEventListener('click', function() {
                const matchId = this.dataset.matchId;
                const matchInfo = this.dataset.matchInfo;
                openMatchResultModal(matchId, matchInfo);
            });
        });
    }
    
    if (addMatchBtn) {
        addMatchBtn.addEventListener('click', function() {
            editingMatchId = null; // Yeni maç ekleme modunda olduğumuzu belirt
            if(matchModalLabel) matchModalLabel.textContent = 'Yeni Maç Ekle';
            if(matchForm) matchForm.reset(); // Formu temizle
            if(matchIdInput) matchIdInput.value = ''; // Gizli ID'yi temizle
            if(matchSendEmailCheckbox) matchSendEmailCheckbox.checked = false; // E-posta checkbox'ını default false yap
            if(typeof clearMessage === 'function' && matchModalMessage) clearMessage('match-modal-message');
            if(matchModal) matchModal.show(); // Modalı göster (data-bs-target ile zaten açılır ama JS'den de kontrol edebiliriz)
        });
    } else {
        console.error("Admin Maçlar: 'Yeni Maç Ekle' butonu (#addMatchBtn) bulunamadı.");
    }

    if (matchForm) {
        matchForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('admin-matches-page.js: Maç formu submit edildi.');

            if(!matchLeagueSelect || !matchHomeTeamInput || !matchAwayTeamInput || !matchDateInput || !saveMatchBtn || !matchSendEmailCheckbox) {
                console.error("Admin Maçlar: Maç formu elemanları eksik.");
                if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', 'Form elemanlarında bir eksiklik var. Lütfen konsolu kontrol edin.', 'danger');
                return;
            }

            const matchDateValue = matchDateInput.value;
            const matchData = {
                leagueId: parseInt(matchLeagueSelect.value),
                homeTeam: matchHomeTeamInput.value.trim(),
                awayTeam: matchAwayTeamInput.value.trim(),
                matchDate: matchDateValue, // Backend'e "yyyy-MM-ddTHH:mm" formatında gider
                sendEmailNotification: matchSendEmailCheckbox.checked // YENİ: Checkbox değeri
            };

            // Basit validasyonlar
            if (!matchData.leagueId || !matchData.homeTeam || !matchData.awayTeam || !matchData.matchDate) {
                if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', 'Lütfen tüm zorunlu alanları (*) doldurun.', 'warning');
                return;
            }
             // Maç tarihi geçmiş olmamalı (sadece yeni maç eklerken bu kontrol mantıklı)
            if (!editingMatchId && new Date(matchData.matchDate) <= new Date()) {
                 if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', 'Maç tarihi geçmiş veya şu anki bir tarih olamaz.', 'warning');
                 return;
            }


            let response;
            const originalButtonText = saveMatchBtn.innerHTML;
            saveMatchBtn.disabled = true;
            saveMatchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

            if (editingMatchId) {
                // Düzenleme sırasında sendEmailNotification backend'e gönderilmiyor.
                // Eğer düzenlemede de bu seçenek olacaksa, MatchUpdateRequestDto'ya ve buradaki payload'a eklenmeli.
                const updateData = { ...matchData };
                delete updateData.sendEmailNotification; // Düzenlemede bu alanı gönderme (şimdilik)
                response = await fetchAPI(`/admin/matches/${editingMatchId}`, 'PUT', updateData, true);
            } else {
                response = await fetchAPI('/admin/matches', 'POST', matchData, true);
            }

            saveMatchBtn.disabled = false;
            saveMatchBtn.innerHTML = originalButtonText;

            if (response.success && response.data) {
                if (typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', response.message || `Maç başarıyla ${editingMatchId ? 'güncellendi' : 'eklendi'}!`, 'success');
                if(matchModal) matchModal.hide();
                await loadAdminMatches(); // Listeyi yenile
            } else {
                if (typeof showMessage === 'function' && matchModalMessage) showMessage('match-modal-message', (response.error && response.error.message) || 'Bir hata oluştu.', 'danger');
            }
        });
    } else {
         console.error('HATA: admin-matches-page.js: Maç formu (id="match-form") bulunamadı!');
    }
    
    function openEditMatchModal(match) {
        editingMatchId = match.id;
        if(matchModalLabel) matchModalLabel.textContent = `Maçı Düzenle: ${escapeHTML(match.homeTeam)} vs ${escapeHTML(match.awayTeam)}`;
        if(matchForm) matchForm.reset();
        if(typeof clearMessage === 'function' && matchModalMessage) clearMessage('match-modal-message');

        if(matchIdInput) matchIdInput.value = match.id;
        if(matchLeagueSelect) matchLeagueSelect.value = match.league.id;
        if(matchHomeTeamInput) matchHomeTeamInput.value = match.homeTeam;
        if(matchAwayTeamInput) matchAwayTeamInput.value = match.awayTeam;
        // match.matchDate backend'den "2024-05-20T10:00:00" gibi ISO formatında gelmeli.
        // datetime-local inputu "YYYY-MM-DDTHH:mm" formatını bekler.
        if(matchDateInput && match.matchDate) {
            // Eğer saniye veya milisaniye varsa, "YYYY-MM-DDTHH:mm" formatına getir
            matchDateInput.value = match.matchDate.substring(0, 16);
        }
        // Düzenleme modunda e-posta gönderme checkbox'ı gizlenebilir veya disable edilebilir.
        // Şimdilik, yeni maç eklerkenki durumunu korusun veya resetlensin.
        if(matchSendEmailCheckbox) matchSendEmailCheckbox.checked = false; // Düzenlemede default false

        if(matchModal) matchModal.show();
    }

    function openMatchResultModal(matchId, matchInfo) {
        matchIdToUpdateResult = matchId;
        if(matchResultModalLabel) matchResultModalLabel.textContent = `Sonuç Gir: ${escapeHTML(matchInfo)}`;
        if(matchResultForm) matchResultForm.reset();
        if(typeof clearMessage === 'function' && matchResultModalMessage) clearMessage('match-result-modal-message');
        if(resultMatchIdInput) resultMatchIdInput.value = matchId;
        if(resultMatchInfoSpan) resultMatchInfoSpan.innerHTML = escapeHTML(matchInfo); // innerHTML ile güvenli
        if(matchResultModal) matchResultModal.show();
    }

    if (matchResultForm) {
        matchResultForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if(!resultHomeScoreInput || !resultAwayScoreInput || !saveMatchResultBtn) {
                 console.error("Admin Maçlar: Maç sonucu formu elemanları eksik.");
                 if (typeof showMessage === 'function' && matchResultModalMessage) showMessage('match-result-modal-message', 'Form elemanlarında bir eksiklik var.', 'danger');
                 return;
            }
            const resultData = {
                homeScore: parseInt(resultHomeScoreInput.value),
                awayScore: parseInt(resultAwayScoreInput.value)
            };

            if (isNaN(resultData.homeScore) || isNaN(resultData.awayScore) || resultData.homeScore < 0 || resultData.awayScore < 0) {
                if (typeof showMessage === 'function' && matchResultModalMessage) showMessage('match-result-modal-message', 'Geçerli skorlar giriniz (pozitif tam sayı).', 'warning');
                return;
            }

            const originalButtonText = saveMatchResultBtn.innerHTML;
            saveMatchResultBtn.disabled = true;
            saveMatchResultBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

            const response = await fetchAPI(`/admin/matches/${matchIdToUpdateResult}/result`, 'PUT', resultData, true);

            saveMatchResultBtn.disabled = false;
            saveMatchResultBtn.innerHTML = originalButtonText;

            if (response.success && response.data) {
                if (typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', response.message || 'Maç sonucu başarıyla güncellendi!', 'success');
                if(matchResultModal) matchResultModal.hide();
                await loadAdminMatches();
            } else {
                if (typeof showMessage === 'function' && matchResultModalMessage) showMessage('match-result-modal-message', (response.error && response.error.message) || 'Sonuç güncellenirken bir hata oluştu.', 'danger');
            }
        });
    } else {
        console.error('HATA: admin-matches-page.js: Maç sonucu formu (id="match-result-form") bulunamadı!');
    }

    function openDeleteMatchConfirmModal(matchId, matchInfo) {
        matchToDeleteId = matchId;
        const modalBody = deleteMatchConfirmModalElement ? deleteMatchConfirmModalElement.querySelector('.modal-body') : null;
        if(modalBody) {
            modalBody.innerHTML = `'${escapeHTML(matchInfo)}' (ID: ${matchId}) adlı maçı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`;
            // Gizli input'a artık gerek yok, matchToDeleteId'yi kullanıyoruz.
        }
        if(deleteMatchConfirmModal) deleteMatchConfirmModal.show();
    }

    if (confirmDeleteMatchBtn) {
        confirmDeleteMatchBtn.addEventListener('click', async function() {
            if (!matchToDeleteId) {
                console.error("Silinecek maç ID'si (matchToDeleteId) bulunamadı.");
                if(typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', 'Silinecek maç belirlenemedi.', 'danger');
                return;
            }

            const originalButtonText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Siliniyor...';

            const response = await fetchAPI(`/admin/matches/${matchToDeleteId}`, 'DELETE', null, true);

            this.disabled = false;
            this.innerHTML = originalButtonText;

            if (response.success && response.fullResponse && response.fullResponse.success) { // fullResponse'u kontrol et çünkü DELETE 204 dönebilir
                if (typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', response.message || 'Maç başarıyla silindi!', 'success');
                if(deleteMatchConfirmModal) deleteMatchConfirmModal.hide();
                await loadAdminMatches();
            } else {
                if (typeof showMessage === 'function' && adminMatchesMessageContainer) showMessage('admin-matches-message', (response.error && response.error.message) || 'Maç silinirken bir hata oluştu.', 'danger');
            }
        });
    } else {
         console.error("Admin Maçlar: Maç silme onay butonu (#confirmDeleteMatchBtn) bulunamadı.");
    }
    
    // Modal kapandığında formları temizle ve state'leri resetle
    if(matchModalElement) matchModalElement.addEventListener('hidden.bs.modal', function () { if(matchForm) matchForm.reset(); editingMatchId = null; if(matchSendEmailCheckbox) matchSendEmailCheckbox.checked = false; if(typeof clearMessage === 'function' && matchModalMessage) clearMessage('match-modal-message');});
    if(matchResultModalElement) matchResultModalElement.addEventListener('hidden.bs.modal', function () { if(matchResultForm) matchResultForm.reset(); matchIdToUpdateResult = null; if(typeof clearMessage === 'function' && matchResultModalMessage) clearMessage('match-result-modal-message'); });
    if(deleteMatchConfirmModalElement) deleteMatchConfirmModalElement.addEventListener('hidden.bs.modal', function () { matchToDeleteId = null; const modalBody = this.querySelector('.modal-body'); if(modalBody) modalBody.textContent = 'Bu maçı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.';});

    async function initializePageData() {
        await loadLeaguesForMatchModal(); // Önce ligleri yükle
        await loadAdminMatches();         // Sonra maçları yükle
    }

    initializePageData();
}

// escapeHTML fonksiyonu ui.js'de global olarak tanımlı olmalı.
// Eğer değilse ve sadece burada lazımsa, buraya eklenebilir.
// function escapeHTML(str) { ... }

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminMatchesPage);
} else {
    initializeAdminMatchesPage();
}