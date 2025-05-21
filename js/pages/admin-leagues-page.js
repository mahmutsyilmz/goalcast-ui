// js/pages/admin-leagues-page.js
console.log('admin-leagues-page.js: Script başladı.');

function initializeAdminLeaguesPage() {
    console.log('admin-leagues-page.js: initializeAdminLeaguesPage çağrıldı.');

    const leaguesTableBody = document.getElementById('admin-leagues-table-body');
    const leaguesLoadingSpinner = document.getElementById('admin-leagues-loading');
    const leaguesErrorContainer = document.getElementById('admin-leagues-error');
    const leaguesEmptyContainer = document.getElementById('admin-leagues-empty');
    const adminLeaguesMessageContainer = document.getElementById('admin-leagues-message');

    const leagueModalElement = document.getElementById('leagueModal');
    const leagueModal = leagueModalElement ? new bootstrap.Modal(leagueModalElement) : null;
    const leagueModalLabel = document.getElementById('leagueModalLabel');
    const leagueForm = document.getElementById('league-form');
    const leagueIdInput = document.getElementById('league-id');
    const leagueNameInput = document.getElementById('league-name');
    const leagueTypeSelect = document.getElementById('league-type'); // Yeni
    const leagueCountrySelect = document.getElementById('league-country');
    const leagueCountryGroup = document.getElementById('league-country-group'); // Yeni
    const leagueCountryRequiredIndicator = document.getElementById('league-country-required-indicator'); // Yeni
    const leagueModalMessage = document.getElementById('league-modal-message');
    const addLeagueBtn = document.getElementById('addLeagueBtn');
    const saveLeagueBtn = document.getElementById('saveLeagueBtn');

    const deleteConfirmModalElement = document.getElementById('deleteConfirmModal');
    const deleteConfirmModal = deleteConfirmModalElement ? new bootstrap.Modal(deleteConfirmModalElement) : null;
    const confirmDeleteLeagueBtn = document.getElementById('confirmDeleteLeagueBtn');

    let editingLeagueId = null;
    let leagueToDeleteId = null;

    // Enum değerleri için çeviriler
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

    // Ülke alanının görünürlüğünü ve zorunluluğunu ayarlar
    function toggleCountryField() {
        const selectedType = leagueTypeSelect.value;
        const countryNeeded = selectedType === 'NATIONAL_LEAGUE' || selectedType === 'DOMESTIC_CUP';

        if (leagueCountryGroup) leagueCountryGroup.style.display = countryNeeded ? 'block' : 'none';
        if (leagueCountrySelect) leagueCountrySelect.required = countryNeeded;
        if (leagueCountryRequiredIndicator) leagueCountryRequiredIndicator.style.display = countryNeeded ? 'inline' : 'none';

        if (!countryNeeded && leagueCountrySelect) {
            leagueCountrySelect.value = ""; // Ülke gerekli değilse seçimi temizle
        }
    }

    if (leagueTypeSelect) {
        leagueTypeSelect.addEventListener('change', toggleCountryField);
    }

    async function loadAdminLeagues() {
        if (!leaguesTableBody || !leaguesLoadingSpinner || !leaguesErrorContainer || !leaguesEmptyContainer) {
            console.error("Admin Ligler: Listeleme için DOM elementleri eksik.");
            return;
        }

        showSpinner('admin-leagues-loading');
        leaguesTableBody.innerHTML = '';
        leaguesErrorContainer.style.display = 'none';
        leaguesEmptyContainer.style.display = 'none';
        if (adminLeaguesMessageContainer) clearMessage('admin-leagues-message');
        clearMessage('global-message-area');

        // Backend'den gelen LeagueDto'da country ve leagueType string olarak geliyor.
        const response = await fetchAPI('/leagues', 'GET', null, false); // Tüm ligleri almak için normal kullanıcı endpoint'i
                                                                        // veya admin için ayrı bir endpoint /admin/leagues olabilir.
                                                                        // Dokümantasyonunuzda /leagues endpoint'i public gibi.
        hideSpinner('admin-leagues-loading');

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                leaguesEmptyContainer.style.display = 'block';
            } else {
                response.data.forEach(league => {
                    const countryName = league.country ? (countryDisplayNames[league.country] || league.country) : '-';
                    const leagueTypeName = leagueTypeDisplayNames[league.leagueType] || league.leagueType;
                    const row = `
                        <tr>
                            <td>${league.id}</td>
                            <td>${escapeHTML(league.name)}</td>
                            <td>${escapeHTML(leagueTypeName)}</td>
                            <td>${escapeHTML(countryName)}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-league-btn"
                                        data-league-id="${league.id}"
                                        data-bs-toggle="tooltip" title="Düzenle">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-league-btn"
                                        data-league-id="${league.id}"
                                        data-league-name="${escapeHTML(league.name)}"
                                        data-bs-toggle="tooltip" title="Sil">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    leaguesTableBody.insertAdjacentHTML('beforeend', row);
                });
                addTableButtonListeners();
                // Tooltip'leri etkinleştir
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }
             if (adminLeaguesMessageContainer && response.message && response.data.length > 0) {
                 showMessage('admin-leagues-message', response.message, 'success');
            }
        } else {
            leaguesErrorContainer.style.display = 'block';
            leaguesErrorContainer.textContent = (response.error && response.error.message) ? response.error.message : 'Ligler yüklenirken bir hata oluştu.';
        }
    }

    async function fetchLeagueForEdit(leagueId) {
        const response = await fetchAPI(`/leagues/${leagueId}`, 'GET', null, false); // Tek bir ligi getiren endpoint
        if (response.success && response.data) {
            return response.data;
        } else {
            console.error(`Lig detayları alınamadı (ID: ${leagueId}):`, response.message || response.error);
            if (adminLeaguesMessageContainer) showMessage('admin-leagues-message', `Lig detayları alınamadı: ${response.message || 'Bilinmeyen hata'}`, 'danger');
            return null;
        }
    }


    function addTableButtonListeners() {
        document.querySelectorAll('.edit-league-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const leagueId = this.dataset.leagueId;
                // API'den en güncel lig verisini çek
                const leagueData = await fetchLeagueForEdit(leagueId);
                if (leagueData) {
                    openEditModal(leagueData);
                }
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
            if (leagueModalMessage) clearMessage('league-modal-message');
            toggleCountryField(); // Modal açıldığında ülke alanını doğru ayarla
            // leagueModal.show(); bootstrap data-bs-toggle ile zaten açıyor.
        });
    }

    if (leagueForm) {
        leagueForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (!leagueNameInput || !leagueTypeSelect || !saveLeagueBtn) {
                console.error("Admin Ligler: Lig formu elemanlarından bazıları eksik.");
                if (leagueModalMessage) showMessage('league-modal-message', 'Formda bir sorun var.', 'danger');
                return;
            }

            const leagueData = {
                name: leagueNameInput.value.trim(),
                leagueType: leagueTypeSelect.value,
                country: null // Varsayılan olarak null
            };

            const selectedLeagueType = leagueTypeSelect.value;
            const countryNeeded = selectedLeagueType === 'NATIONAL_LEAGUE' || selectedLeagueType === 'DOMESTIC_CUP';

            if (countryNeeded) {
                leagueData.country = leagueCountrySelect.value;
                if (!leagueData.country) {
                    if (leagueModalMessage) showMessage('league-modal-message', 'Ulusal lig/kupa için ülke seçimi zorunludur.', 'warning');
                    return;
                }
            } else {
                leagueData.country = null; // Ülke gerekli değilse null gönder. Backend'de @Column(nullable=true) olmalı.
                                           // Senin League entity'nde Country alanı için nullable=true yapmışsın, bu doğru.
                                           // DTO'larda Country alanı @NotNull, bu backend'de validasyon hatası verebilir.
                                           // LeagueCreateRequestDto ve LeagueUpdateRequestDto'da Country alanı için @NotNull'ı
                                           // @ValidCountryIfRequired gibi özel bir validasyonla veya serviste kontrol etmen gerekebilir.
                                           // Şimdilik frontend'den null gönderiyoruz, backend validasyonunu gözden geçir.
            }


            if (!leagueData.name || !leagueData.leagueType) {
                if (leagueModalMessage) showMessage('league-modal-message', 'Lig adı ve lig türü zorunludur.', 'warning');
                return;
            }

            let response;
            const originalButtonText = saveLeagueBtn.innerHTML;
            saveLeagueBtn.disabled = true;
            saveLeagueBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

            if (editingLeagueId) {
                // LeagueUpdateRequestDto'nun country alanını null kabul etmesi için backend DTO'sunu gözden geçir.
                response = await fetchAPI(`/admin/leagues/${editingLeagueId}`, 'PUT', leagueData, true);
            } else {
                // LeagueCreateRequestDto'nun country alanını null kabul etmesi için backend DTO'sunu gözden geçir.
                response = await fetchAPI('/admin/leagues', 'POST', leagueData, true);
            }

            saveLeagueBtn.disabled = false;
            saveLeagueBtn.innerHTML = originalButtonText;

            if (response.success && response.data) {
                if (adminLeaguesMessageContainer) showMessage('admin-leagues-message', response.message || `Lig başarıyla ${editingLeagueId ? 'güncellendi' : 'eklendi'}!`, 'success');
                if (leagueModal) leagueModal.hide();
                await loadAdminLeagues();
            } else {
                // Backend'den gelen validasyon hatalarını veya diğer hataları göster
                let errorMessage = `Lig ${editingLeagueId ? 'güncellenirken' : 'eklenirken'} bir hata oluştu.`;
                if (response.error && response.error.message) {
                    errorMessage = response.error.message;
                } else if (response.fullResponse && response.fullResponse.data && typeof response.fullResponse.data === 'object') {
                    // Spring Validation hataları genellikle 'data' içinde field:message şeklinde gelir.
                    const errors = response.fullResponse.data;
                    const errorMessages = Object.values(errors).join(', ');
                    if (errorMessages) errorMessage = errorMessages;
                } else if(response.message) {
                    errorMessage = response.message;
                }
                if (leagueModalMessage) showMessage('league-modal-message', errorMessage, 'danger');
            }
        });
    }

    // Düzenleme modalını league objesi (API'den gelen) ile açar
    function openEditModal(league) { // league objesi {id, name, leagueType, country} şeklinde bekleniyor
        editingLeagueId = league.id;
        if (leagueModalLabel) leagueModalLabel.textContent = `Ligi Düzenle: ${escapeHTML(league.name)}`;
        if (leagueForm) leagueForm.reset();
        if (leagueModalMessage) clearMessage('league-modal-message');

        if (leagueIdInput) leagueIdInput.value = league.id;
        if (leagueNameInput) leagueNameInput.value = league.name;
        if (leagueTypeSelect) leagueTypeSelect.value = league.leagueType;

        toggleCountryField(); // Lig türüne göre ülke alanını ayarla

        if (leagueCountrySelect && (league.leagueType === 'NATIONAL_LEAGUE' || league.leagueType === 'DOMESTIC_CUP')) {
            leagueCountrySelect.value = league.country || ""; // country null ise boş seç
        } else if (leagueCountrySelect) {
            leagueCountrySelect.value = ""; // Diğer durumlarda ülke seçimini boşalt
        }


        if (leagueModal) leagueModal.show();
    }

    function openDeleteConfirmModal(leagueId, leagueName) {
        leagueToDeleteId = leagueId;
        const modalBody = deleteConfirmModalElement ? deleteConfirmModalElement.querySelector('.modal-body') : null;
        if (modalBody) {
            modalBody.textContent = `'${escapeHTML(leagueName)}' (ID: ${leagueId}) adlı ligi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`;
            // Silinecek ID'yi saklamak için data attribute kullanabiliriz veya global değişken yeterli
        }
        if (deleteConfirmModal) deleteConfirmModal.show();
    }

    if (confirmDeleteLeagueBtn) {
        confirmDeleteLeagueBtn.addEventListener('click', async function() {
            if (!leagueToDeleteId) {
                console.error("Silinecek lig ID'si bulunamadı.");
                if (adminLeaguesMessageContainer) showMessage('admin-leagues-message', 'Silinecek lig ID bulunamadı.', 'danger');
                return;
            }

            const originalButtonText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Siliniyor...';

            const response = await fetchAPI(`/admin/leagues/${leagueToDeleteId}`, 'DELETE', null, true);

            this.disabled = false;
            this.innerHTML = originalButtonText;

            if (response.success) { // fetchAPI'deki success genellikle 2xx durumlarını işaret eder
                if (adminLeaguesMessageContainer) showMessage('admin-leagues-message', response.message || 'Lig başarıyla silindi!', 'success');
                if (deleteConfirmModal) deleteConfirmModal.hide();
                await loadAdminLeagues();
            } else {
                const errorMessage = (response.error && response.error.message) ? response.error.message : (response.message || 'Lig silinirken bir hata oluştu.');
                if (adminLeaguesMessageContainer) showMessage('admin-leagues-message', errorMessage, 'danger');
                 if (deleteConfirmModal) deleteConfirmModal.hide(); // Hata olsa da modalı kapat
            }
        });
    }

    if (leagueModalElement) {
        leagueModalElement.addEventListener('hidden.bs.modal', function () {
            if (leagueModalMessage) clearMessage('league-modal-message');
            if (leagueForm) leagueForm.reset();
            editingLeagueId = null;
            // Ülke alanını varsayılan durumuna getir (event listener tetiklemesiyle)
            if (leagueTypeSelect) {
                leagueTypeSelect.value = ""; // veya ilk option
                toggleCountryField();
            }
        });
    }

    if (deleteConfirmModalElement) {
         deleteConfirmModalElement.addEventListener('hidden.bs.modal', function () {
            leagueToDeleteId = null;
        });
    }

    loadAdminLeagues();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminLeaguesPage);
} else {
    initializeAdminLeaguesPage();
}