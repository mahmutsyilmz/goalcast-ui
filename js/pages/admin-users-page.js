// js/pages/admin-users-page.js
console.log('admin-users-page.js: Script başladı.');

// escapeHTML fonksiyonunun ui.js'de global olarak tanımlı olduğunu varsayıyoruz.

function initializeAdminUsersPage() {
    console.log('admin-users-page.js: initializeAdminUsersPage çağrıldı.');

    const tableBody = document.getElementById('admin-users-table-body');
    const loadingSpinner = document.getElementById('admin-users-loading');
    const errorContainer = document.getElementById('admin-users-error');
    const emptyContainer = document.getElementById('admin-users-empty');
    const messageContainer = document.getElementById('admin-users-message');

    // Kullanıcı Detay Modal Elementleri
    const userDetailsModalElement = document.getElementById('userDetailsModal');
    const userDetailsModal = userDetailsModalElement ? new bootstrap.Modal(userDetailsModalElement) : null;
    const userDetailsModalLabel = document.getElementById('userDetailsModalLabel');
    const userDetailsLoadingModal = document.getElementById('user-details-loading-modal');
    const userDetailsErrorModal = document.getElementById('user-details-error-modal');
    const userDetailsContentModal = document.getElementById('user-details-content-modal');
    const detailUserIdSpan = document.getElementById('detail-userId');
    const detailUsernameSpan = document.getElementById('detail-username');
    const detailEmailSpan = document.getElementById('detail-email');
    const detailEmailVerifiedBadgeSpan = document.getElementById('detail-emailVerifiedBadge');
    const detailTotalPointsSpan = document.getElementById('detail-totalPoints');
    const detailRoleSpan = document.getElementById('detail-role');
    const detailCreatedAtSpan = document.getElementById('detail-createdAt');
    const detailUpdatedAtSpan = document.getElementById('detail-updatedAt');

    // Puan Ayarlama Modal Elementleri
    const adjustPointsModalElement = document.getElementById('adjustPointsModal');
    const adjustPointsModal = adjustPointsModalElement ? new bootstrap.Modal(adjustPointsModalElement) : null;
    const adjustPointsForm = document.getElementById('adjust-points-form');
    const adjustPointsUserIdInput = document.getElementById('adjust-points-userId');
    const adjustPointsUsernameSpan = document.getElementById('adjust-points-username');
    const adjustPointsCurrentPointsSpan = document.getElementById('adjust-points-currentPoints');
    const pointsAdjustmentInput = document.getElementById('points-adjustment');
    const adjustPointsModalMessage = document.getElementById('adjust-points-modal-message');
    const savePointsAdjustmentBtn = document.getElementById('savePointsAdjustmentBtn');

    // Silme Onay Modal Elementleri
    const deleteUserConfirmModalElement = document.getElementById('deleteUserConfirmModal');
    const deleteUserConfirmModal = deleteUserConfirmModalElement ? new bootstrap.Modal(deleteUserConfirmModalElement) : null;
    const deleteUserConfirmModalBody = document.getElementById('delete-user-confirm-modal-body');
    const confirmDeleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    let userIdToDelete = null;

    async function loadUsers() {
        if (!tableBody || !loadingSpinner || !errorContainer || !emptyContainer) {
            console.error("Kullanıcı Yönetimi: Temel DOM elementleri bulunamadı.");
            return;
        }
        loadingSpinner.style.display = 'block';
        tableBody.innerHTML = '';
        errorContainer.style.display = 'none';
        emptyContainer.style.display = 'none';
        if (typeof clearMessage === 'function' && messageContainer) clearMessage('admin-users-message');
        if (typeof clearMessage === 'function' && document.getElementById('global-message-area')) clearMessage('global-message-area');


        try {
            const response = await fetchAPI('/admin/users', 'GET', null, true);
            loadingSpinner.style.display = 'none';

            if (response.success && Array.isArray(response.data)) {
                if (response.data.length === 0) {
                    if(emptyContainer) emptyContainer.style.display = 'block';
                } else {
                    // Kullanıcıları ID'ye göre sıralayabiliriz veya kullanıcı adına
                    response.data.sort((a,b) => a.id - b.id).forEach(user => {
                        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
                        const emailVerifiedBadge = user.emailVerified ? '<span class="badge bg-success">Evet</span>' : '<span class="badge bg-warning text-dark">Hayır</span>';
                        
                        const row = `
                            <tr>
                                <td>${user.id}</td>
                                <td><a href="#" class="view-user-details" data-user-id="${user.id}">${escapeHTML(user.username)}</a></td>
                                <td>${escapeHTML(user.email)}</td>
                                <td class="text-end">${user.totalPoints}</td>
                                <td><span class="badge bg-secondary">${user.role}</span></td>
                                <td class="text-center">${emailVerifiedBadge}</td>
                                <td>${createdAt}</td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-primary adjust-points-btn" data-user-id="${user.id}" data-username="${escapeHTML(user.username)}" data-current-points="${user.totalPoints}" title="Puan Ayarla">
                                        <i class="fas fa-coins"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user.id}" data-username="${escapeHTML(user.username)}" title="Kullanıcıyı Sil">
                                        <i class="fas fa-user-times"></i>
                                    </button>
                                </td>
                            </tr>`;
                        tableBody.insertAdjacentHTML('beforeend', row);
                    });
                    addTableActionListeners();
                }
                if (typeof showMessage === 'function' && messageContainer && response.data.length > 0) {
                    showMessage('admin-users-message', response.message || 'Kullanıcılar başarıyla yüklendi.', 'success');
                }
            } else {
                if(errorContainer) {
                    errorContainer.textContent = response.error?.message || 'Kullanıcılar yüklenirken bir hata oluştu.';
                    errorContainer.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Kullanıcıları yüklerken hata:", error);
            if(loadingSpinner) loadingSpinner.style.display = 'none';
            if(errorContainer) {
                errorContainer.textContent = 'Kullanıcılar yüklenirken bir ağ hatası oluştu.';
                errorContainer.style.display = 'block';
            }
        }
    }

    function addTableActionListeners() {
        tableBody.querySelectorAll('.view-user-details').forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const userId = this.dataset.userId;
                openUserDetailsModal(userId);
            });
        });
        tableBody.querySelectorAll('.adjust-points-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.userId;
                const username = this.dataset.username;
                const currentPoints = this.dataset.currentPoints;
                openAdjustPointsModal(userId, username, currentPoints);
            });
        });
        tableBody.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                userIdToDelete = this.dataset.userId; // Global değişkene ata
                const username = this.dataset.username;
                openDeleteUserConfirmModal(userIdToDelete, username);
            });
        });
    }

    async function openUserDetailsModal(userId) {
        if (!userDetailsModal || !userDetailsLoadingModal || !userDetailsErrorModal || !userDetailsContentModal) return;

        userDetailsLoadingModal.style.display = 'block';
        userDetailsErrorModal.style.display = 'none';
        userDetailsContentModal.style.display = 'none';
        if(userDetailsModalLabel) userDetailsModalLabel.textContent = `Kullanıcı Detayları (ID: ${userId})`;
        userDetailsModal.show();

        try {
            const response = await fetchAPI(`/admin/users/${userId}`, 'GET', null, true);
            userDetailsLoadingModal.style.display = 'none';

            if (response.success && response.data) {
                const user = response.data;
                if(detailUserIdSpan) detailUserIdSpan.textContent = user.id;
                if(detailUsernameSpan) detailUsernameSpan.textContent = escapeHTML(user.username);
                if(detailEmailSpan) detailEmailSpan.textContent = escapeHTML(user.email);
                if(detailEmailVerifiedBadgeSpan) detailEmailVerifiedBadgeSpan.innerHTML = user.emailVerified ? '<span class="badge bg-success ms-1">Doğrulandı</span>' : '<span class="badge bg-warning text-dark ms-1">Doğrulanmadı</span>';
                if(detailTotalPointsSpan) detailTotalPointsSpan.textContent = user.totalPoints;
                if(detailRoleSpan) detailRoleSpan.innerHTML = `<span class="badge bg-info">${user.role}</span>`;
                if(detailCreatedAtSpan) detailCreatedAtSpan.textContent = user.createdAt ? new Date(user.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
                if(detailUpdatedAtSpan) detailUpdatedAtSpan.textContent = user.updatedAt ? new Date(user.updatedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
                
                userDetailsContentModal.style.display = 'block';
            } else {
                if(userDetailsErrorModal) {
                    userDetailsErrorModal.textContent = response.error?.message || 'Kullanıcı detayları yüklenirken bir hata oluştu.';
                    userDetailsErrorModal.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error fetching user details for admin:', error);
            if(userDetailsLoadingModal) userDetailsLoadingModal.style.display = 'none';
            if(userDetailsErrorModal) {
                userDetailsErrorModal.textContent = 'Kullanıcı detayları alınırken bir ağ hatası oluştu.';
                userDetailsErrorModal.style.display = 'block';
            }
        }
    }

    function openAdjustPointsModal(userId, username, currentPoints) {
        if (!adjustPointsModal || !adjustPointsForm || !adjustPointsUserIdInput || !adjustPointsUsernameSpan || !adjustPointsCurrentPointsSpan) return;
        adjustPointsForm.reset();
        if(typeof clearMessage === 'function' && adjustPointsModalMessage) clearMessage('adjust-points-modal-message');
        adjustPointsUserIdInput.value = userId;
        adjustPointsUsernameSpan.textContent = escapeHTML(username);
        adjustPointsCurrentPointsSpan.textContent = currentPoints;
        adjustPointsModal.show();
    }

    if (adjustPointsForm && savePointsAdjustmentBtn) {
        adjustPointsForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const userId = adjustPointsUserIdInput.value;
            const adjustment = parseInt(pointsAdjustmentInput.value);

            if (isNaN(adjustment)) {
                if (typeof showMessage === 'function' && adjustPointsModalMessage) showMessage('adjust-points-modal-message', 'Lütfen geçerli bir sayısal puan miktarı girin.', 'warning');
                return;
            }

            const originalBtnText = savePointsAdjustmentBtn.innerHTML;
            savePointsAdjustmentBtn.disabled = true;
            savePointsAdjustmentBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';

            try {
                const response = await fetchAPI(`/admin/users/${userId}/adjust-points`, 'POST', { pointsAdjustment: adjustment }, true);
                if (response.success && response.data) {
                    if (typeof showMessage === 'function' && messageContainer) showMessage('admin-users-message', response.message || 'Puan başarıyla ayarlandı.', 'success');
                    adjustPointsModal.hide();
                    await loadUsers(); 
                } else {
                    if (typeof showMessage === 'function' && adjustPointsModalMessage) showMessage('adjust-points-modal-message', response.error?.message || 'Puan ayarlanamadı.', 'danger');
                }
            } catch (error) {
                 console.error("Puan ayarlama sırasında API hatası:", error);
                 if (typeof showMessage === 'function' && adjustPointsModalMessage) showMessage('adjust-points-modal-message', 'Puan ayarlanırken bir ağ hatası oluştu.', 'danger');
            } finally {
                savePointsAdjustmentBtn.disabled = false;
                savePointsAdjustmentBtn.innerHTML = originalBtnText;
            }
        });
    }

    function openDeleteUserConfirmModal(userId, username) {
        userIdToDelete = userId;
        if(deleteUserConfirmModalBody) {
            deleteUserConfirmModalBody.innerHTML = `<strong>${escapeHTML(username)}</strong> (ID: ${userId}) adlı kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem kullanıcının tüm tahminlerini, bildirimlerini ve ilişkili diğer verilerini de silecektir. Bu işlem geri alınamaz.`;
        }
        if(deleteUserConfirmModal) deleteUserConfirmModal.show();
    }

    if (confirmDeleteUserBtn) {
        confirmDeleteUserBtn.addEventListener('click', async function() {
            if (!userIdToDelete) return;
            
            const originalBtnText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Siliniyor...';

            try {
                const response = await fetchAPI(`/admin/users/${userIdToDelete}`, 'DELETE', null, true);
                if (response.success) {
                    if (typeof showMessage === 'function' && messageContainer) showMessage('admin-users-message', response.message || 'Kullanıcı başarıyla silindi!', 'success');
                    deleteUserConfirmModal.hide();
                    await loadUsers();
                } else {
                    if (typeof showMessage === 'function' && messageContainer) showMessage('admin-users-message', response.error?.message || 'Kullanıcı silinirken bir hata oluştu.', 'danger');
                }
            } catch (error) {
                 console.error("Kullanıcı silme sırasında API hatası:", error);
                 if (typeof showMessage === 'function' && messageContainer) showMessage('admin-users-message', 'Kullanıcı silinirken bir ağ hatası oluştu.', 'danger');
            } finally {
                this.disabled = false;
                this.innerHTML = originalBtnText;
                 userIdToDelete = null; // İşlem sonrası resetle
            }
        });
    }
    
    if(adjustPointsModalElement) adjustPointsModalElement.addEventListener('hidden.bs.modal', () => { if(adjustPointsForm) adjustPointsForm.reset(); if(typeof clearMessage === 'function' && adjustPointsModalMessage) clearMessage('adjust-points-modal-message'); });
    if(deleteUserConfirmModalElement) deleteUserConfirmModalElement.addEventListener('hidden.bs.modal', () => { userIdToDelete = null; if(deleteUserConfirmModalBody) deleteUserConfirmModalBody.textContent = 'Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem kullanıcının tüm ilişkili verilerini de silecektir ve geri alınamaz.'; });
    if(userDetailsModalElement) userDetailsModalElement.addEventListener('hidden.bs.modal', () => { if(userDetailsContentModal) userDetailsContentModal.style.display = 'none'; if(userDetailsErrorModal) userDetailsErrorModal.style.display = 'none'; });

    // Sayfa yüklendiğinde veya admin yetkisi kontrolünden sonra çağrılacak ana fonksiyon
    function initPage() {
        if (localStorage.getItem('jwtToken') && localStorage.getItem('userRole') === 'ADMIN') {
            loadUsers();
        } else {
            if(errorContainer) {
                errorContainer.textContent = 'Bu sayfayı görüntüleme yetkiniz yok veya giriş yapmadınız.';
                errorContainer.style.display = 'block';
                if(loadingSpinner) loadingSpinner.style.display = 'none';
            }
            // İsteğe bağlı: Kullanıcıyı login'e veya ana sayfaya yönlendir
            // location.hash = '#/login';
        }
    }
    
    initPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminUsersPage);
} else {
    initializeAdminUsersPage();
}