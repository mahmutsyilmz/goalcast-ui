// js/pages/admin-leagues-page.js
console.log('admin-leagues-page.js: Script başladı.');

function initializeAdminLeaguesPage() {
    console.log('admin-leagues-page.js: initializeAdminLeaguesPage çağrıldı.');

    const leaguesTableBody = document.getElementById('admin-leagues-table-body');
    const leaguesLoadingSpinner = document.getElementById('admin-leagues-loading');
    const leaguesErrorContainer = document.getElementById('admin-leagues-error');
    const leaguesEmptyContainer = document.getElementById('admin-leagues-empty');
    // const adminLeaguesMessageContainer = document.getElementById('admin-leagues-message'); // Bu ID'li element HTML'de var mı? Varsa kullanılabilir.

    const leagueModalElement = document.getElementById('leagueModal');
    const leagueModal = leagueModalElement ? new bootstrap.Modal(leagueModalElement) : null;
    const leagueModalLabel = document.getElementById('leagueModalLabel');
    const leagueForm = document.getElementById('league-form');
    const leagueIdInput = document.getElementById('league-id');
    const leagueNameInput = document.getElementById('league-name');
    const leagueCountrySelect = document.getElementById('league-country');
    const leagueModalMessage = document.getElementById('league-modal-message'); // Bu ID'li element modal HTML'inde var
    const addLeagueBtn = document.getElementById('addLeagueBtn');
    const saveLeagueBtn = document.getElementById('saveLeagueBtn');

    const deleteConfirmModalElement = document.getElementById('deleteConfirmModal');
    const deleteConfirmModal = deleteConfirmModalElement ? new bootstrap.Modal(deleteConfirmModalElement) : null;
    // const deleteLeagueIdInput = document.getElementById('delete-league-id'); // Bu input modalın body'sine dinamik eklenecek
    const confirmDeleteLeagueBtn = document.getElementById('confirmDeleteLeagueBtn');

    let editingLeagueId = null; 
    let leagueToDeleteId = null; // Silinecek lig ID'sini global tutalım

    const countryEnumValues = { 
        "TURKEY": "Türkiye", "ENGLAND": "İngiltere", "SPAIN": "İspanya",
        "GERMANY": "Almanya", "ITALY": "İtalya", "FRANCE": "Fransa"
    };

    async function loadAdminLeagues() {
        if (!leaguesTableBody || !leaguesLoadingSpinner || !leaguesErrorContainer || !leaguesEmptyContainer) {
            console.error("Admin Ligler: Listeleme için DOM elementleri eksik.");
            return;
        }

        leaguesLoadingSpinner.style.display = 'block';
        leaguesTableBody.innerHTML = '';
        leaguesErrorContainer.style.display = 'none';
        leaguesEmptyContainer.style.display = 'none';
        if(typeof clearMessage === 'function') {
            clearMessage('admin-leagues-message'); // Bu ID'li element HTML'de olmalı
            clearMessage('global-message-area'); // Bu ID index.html'de olmalı
        }

        const response = await fetchAPI('/leagues', 'GET', null, false);

        leaguesLoadingSpinner.style.display = 'none';

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                leaguesEmptyContainer.style.display = 'block';
            } else {
                response.data.forEach(league => {
                    const row = `
                        <tr>
                            <td>${league.id}</td>
                            <td>${league.name}</td>
                            <td>${countryEnumValues[league.country] || league.country}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-league-btn" 
                                        data-league-id="${league.id}" 
                                        data-league-name="${league.name}" 
                                        data-league-country-key="${league.country}">
                                    <i class="fas fa-edit"></i> Düzenle
                                </button>
                                <button class="btn btn-sm btn-danger delete-league-btn" 
                                        data-league-id="${league.id}" 
                                        data-league-name="${league.name}">
                                    <i class="fas fa-trash-alt"></i> Sil
                                </button>
                            </td>
                        </tr>
                    `;
                    leaguesTableBody.insertAdjacentHTML('beforeend', row);
                });
                addTableButtonListeners();
            }
            if (typeof showMessage === 'function' && response.data && response.data.length > 0) {
                 showMessage('admin-leagues-message', response.message || 'Ligler başarıyla yüklendi.', 'success');
            }
        } else {
            leaguesErrorContainer.style.display = 'block';
            leaguesErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Ligler yüklenirken bir hata oluştu.';
        }
    }

    function addTableButtonListeners() {
        document.querySelectorAll('.edit-league-btn').forEach(button => {
            button.addEventListener('click', function() {
                const leagueId = this.dataset.leagueId;
                const leagueName = this.dataset.leagueName;
                const leagueCountryKey = this.dataset.leagueCountryKey;
                openEditModal({ id: leagueId, name: leagueName, country: leagueCountryKey });
            });
        });

        document.querySelectorAll('.delete-league-btn').forEach(button => {
            button.addEventListener('click', function() {
                const leagueId = this.dataset.leagueId;
                const leagueName = this.dataset.leagueName;
                openDeleteConfirmModal(leagueId, leagueName);
            });
        });
    }

    if (addLeagueBtn) {
        addLeagueBtn.addEventListener('click', function() {
            editingLeagueId = null;
            if (leagueModalLabel) leagueModalLabel.textContent = 'Yeni Lig Ekle';
            if (leagueForm) leagueForm.reset();
            if (leagueIdInput) leagueIdInput.value = '';
            if (typeof clearMessage === 'function' && leagueModalMessage) clearMessage('league-modal-message');
            // Modal zaten data-bs-toggle ile açılıyor, leagueModal.show() gerekirse eklenebilir
        });
    } else {
        console.error("Admin Ligler: 'Yeni Lig Ekle' butonu bulunamadı.");
    }
    

    if (leagueForm) {
        leagueForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Formun varsayılan submit davranışını engelle
            console.log('admin-leagues-page.js: Lig formu submit edildi.');

            if (!leagueNameInput || !leagueCountrySelect || !saveLeagueBtn) {
                console.error("Admin Ligler: Lig formu elemanlarından bazıları eksik.");
                if (typeof showMessage === 'function' && leagueModalMessage) showMessage('league-modal-message', 'Formda bir sorun var.', 'danger');
                return;
            }

            const leagueData = {
                name: leagueNameInput.value.trim(),
                country: leagueCountrySelect.value 
            };

            if (!leagueData.name || !leagueData.country) {
                if (typeof showMessage === 'function' && leagueModalMessage) showMessage('league-modal-message', 'Lig adı ve ülke zorunludur.', 'warning');
                return;
            }

            let response;
            const originalButtonText = saveLeagueBtn.innerHTML;
            saveLeagueBtn.disabled = true;
            saveLeagueBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

            if (editingLeagueId) {
                response = await fetchAPI(`/admin/leagues/${editingLeagueId}`, 'PUT', leagueData, true);
            } else {
                response = await fetchAPI('/admin/leagues', 'POST', leagueData, true);
            }

            saveLeagueBtn.disabled = false;
            saveLeagueBtn.innerHTML = originalButtonText;

            if (response.success && response.data) {
                if (typeof showMessage === 'function' && document.getElementById('admin-leagues-message')) showMessage('admin-leagues-message', response.message || `Lig başarıyla ${editingLeagueId ? 'güncellendi' : 'eklendi'}!`, 'success');
                if (leagueModal) leagueModal.hide();
                await loadAdminLeagues();
            } else {
                const errorMessage = (response.error && response.error.message) ? response.error.message : `Lig ${editingLeagueId ? 'güncellenirken' : 'eklenirken'} bir hata oluştu.`;
                if (typeof showMessage === 'function' && leagueModalMessage) showMessage('league-modal-message', errorMessage, 'danger');
            }
        });
        console.log('admin-leagues-page.js: Lig formu için submit listener eklendi.');
    } else {
        console.error('HATA: admin-leagues-page.js: Lig formu (id="league-form") bulunamadı!');
    }
    

    function openEditModal(league) {
        editingLeagueId = league.id;
        if (leagueModalLabel) leagueModalLabel.textContent = `Ligi Düzenle: ${league.name}`;
        if (leagueForm) leagueForm.reset();
        if (typeof clearMessage === 'function' && leagueModalMessage) clearMessage('league-modal-message');

        if (leagueIdInput) leagueIdInput.value = league.id;
        if (leagueNameInput) leagueNameInput.value = league.name;
        if (leagueCountrySelect) leagueCountrySelect.value = league.country;

        if (leagueModal) leagueModal.show();
    }

    function openDeleteConfirmModal(leagueId, leagueName) {
        leagueToDeleteId = leagueId; 
        const modalBody = deleteConfirmModalElement ? deleteConfirmModalElement.querySelector('.modal-body') : null;
        if (modalBody) {
            // Önceki inputu sil (varsa)
            const oldHiddenInput = modalBody.querySelector('#delete-league-id-hidden');
            if(oldHiddenInput) oldHiddenInput.remove();

            modalBody.textContent = `'${leagueName}' (ID: ${leagueId}) adlı ligi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`;
            // Silinecek ID'yi saklamak için yeni bir gizli input ekle
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'delete-league-id-hidden'; // Farklı bir ID verelim karışmasın
            hiddenInput.value = leagueId;
            modalBody.appendChild(hiddenInput);
        }
        if (deleteConfirmModal) deleteConfirmModal.show();
    }

    if (confirmDeleteLeagueBtn) {
        confirmDeleteLeagueBtn.addEventListener('click', async function() {
            const idInputInModal = deleteConfirmModalElement.querySelector('#delete-league-id-hidden');
            const idToDelete = idInputInModal ? idInputInModal.value : leagueToDeleteId; // Fallback olarak global değişken

            if (!idToDelete) {
                console.error("Silinecek lig ID'si bulunamadı.");
                return;
            }

            const originalButtonText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Siliniyor...';

            const response = await fetchAPI(`/admin/leagues/${idToDelete}`, 'DELETE', null, true);

            this.disabled = false;
            this.innerHTML = originalButtonText;

            if (response.success && response.fullResponse && response.fullResponse.success) {
                if (typeof showMessage === 'function' && document.getElementById('admin-leagues-message')) showMessage('admin-leagues-message', response.message || 'Lig başarıyla silindi!', 'success');
                if (deleteConfirmModal) deleteConfirmModal.hide();
                await loadAdminLeagues();
            } else {
                const errorMessage = (response.error && response.error.message) ? response.error.message : 'Lig silinirken bir hata oluştu.';
                if (typeof showMessage === 'function' && document.getElementById('admin-leagues-message')) showMessage('admin-leagues-message', errorMessage, 'danger');
            }
        });
    } else {
        console.error("Admin Ligler: Silme onay butonu bulunamadı.");
    }
    

    if (leagueModalElement) {
        leagueModalElement.addEventListener('hidden.bs.modal', function () {
            if (typeof clearMessage === 'function' && leagueModalMessage) clearMessage('league-modal-message');
            if (leagueForm) leagueForm.reset();
            editingLeagueId = null;
        });
    }
    
    if (deleteConfirmModalElement) {
         deleteConfirmModalElement.addEventListener('hidden.bs.modal', function () {
            const hiddenInput = deleteConfirmModalElement.querySelector('#delete-league-id-hidden');
            if(hiddenInput) hiddenInput.remove(); // Dinamik eklenen inputu temizle
            leagueToDeleteId = null; // Global değişkeni de sıfırla
        });
    }

    // Sayfa yüklendiğinde ligleri yükle
    loadAdminLeagues();
}

// app.js scripti view HTML'ini yükledikten sonra bu scripti yükleyip çalıştıracak.
// Bu script çalıştığında, view HTML'i DOM'da olmalı.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminLeaguesPage);
} else {
    initializeAdminLeaguesPage();
}