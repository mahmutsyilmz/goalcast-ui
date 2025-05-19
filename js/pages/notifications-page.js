// goalcast-ui/js/pages/notifications-page.js
console.log('notifications-page.js: Script başladı.');

// escapeHTML fonksiyonu ui.js içinde global olarak tanımlı olmalı.

async function initializeNotificationsPage() {
    console.log('notifications-page.js: initializeNotificationsPage çağrıldı.');

    const listContainer = document.getElementById('notifications-list-container');
    const loadingSpinner = document.getElementById('notifications-page-loading');
    const errorContainer = document.getElementById('notifications-page-error');
    const messageContainer = document.getElementById('notifications-page-message');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    const paginationNav = document.getElementById('notifications-pagination-nav');
    const paginationUl = document.getElementById('notifications-pagination');

    let currentPage = 0;
    const pageSize = 10;

    // === YARDIMCI FONKSİYONLARIN TANIMLARI BURADA BAŞLASIN ===

    function getNotificationTitle(type) { // Bu fonksiyonu renderNotifications'tan önce tanımla
        switch (type) {
            case 'NEW_MATCH_ADDED': return 'Yeni Maç Eklendi!';
            case 'PREDICTION_RESULT_WIN': return 'Tahmin Kazandı!';
            case 'PREDICTION_RESULT_LOSS': return 'Tahmin Kaybetti';
            case 'PREDICTION_RESULT_DRAW': return 'Tahmin Sonuçlandı (Puan Değişimi Yok)';
            case 'EMAIL_VERIFIED': return 'E-posta Doğrulandı!';
            default: return 'Bildirim';
        }
    }

    function renderNotifications(notifications) {
        if (!listContainer) {
            console.error("Bildirim listesi konteyneri bulunamadı!");
            return;
        }
        listContainer.innerHTML = '';
        if (notifications.length === 0) {
            listContainer.innerHTML = '<p class="text-muted text-center">Gösterilecek bildirim bulunamadı.</p>';
            if (markAllReadBtn) markAllReadBtn.style.display = 'none';
            return;
        }

        let hasUnread = false;
        const ul = document.createElement('ul');
        ul.classList.add('list-group', 'shadow-sm');

        notifications.forEach(notif => {
            if (!notif.read) hasUnread = true;
            const itemClass = notif.read ? 'list-group-item-light text-muted' : 'list-group-item-primary fw-bold';
            const linkHref = notif.link || '#/notifications'; // Link yoksa bildirimler sayfasına gitsin

            const listItem = `
                <a href="${escapeHTML(linkHref)}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-start ${itemClass}" data-notification-id="${notif.id}">
                    <div class="ms-2 me-auto">
                        <div class="fw-bold ${notif.read ? '' : 'text-primary'}">${escapeHTML(getNotificationTitle(notif.type))}</div>
                        ${escapeHTML(notif.message)}
                    </div>
                    <small class="text-muted">${new Date(notif.createdAt).toLocaleString('tr-TR', {day:'2-digit', month:'numeric', year:'2-digit', hour:'2-digit', minute:'2-digit'})}</small>
                    ${!notif.read ? '<span class="badge bg-primary rounded-pill ms-2">Yeni</span>' : ''}
                </a>`;
            ul.insertAdjacentHTML('beforeend', listItem);
        });
        listContainer.appendChild(ul);

        if (markAllReadBtn) {
            markAllReadBtn.style.display = hasUnread ? 'block' : 'none';
        }

        ul.querySelectorAll('a.list-group-item[data-notification-id]').forEach(item => {
            item.addEventListener('click', async function (event) {
                // Eğer link "#" değilse, varsayılan davranışı engelleme.
                // Sadece okundu işaretleme işlemini yap ve sonra yönlendirme olsun.
                const notificationId = this.dataset.notificationId;
                if (notificationId && !this.classList.contains('list-group-item-light')) {
                    try {
                        const markResponse = await fetchAPI(`/notifications/${notificationId}/mark-as-read`, 'POST', null, true);
                        if (markResponse.success) {
                            this.classList.remove('list-group-item-primary', 'fw-bold');
                            this.classList.add('list-group-item-light', 'text-muted');
                            this.querySelector('.badge.bg-primary')?.remove();
                            if (typeof loadUnreadNotificationCount === 'function') loadUnreadNotificationCount();
                            
                            const stillHasUnread = Array.from(ul.querySelectorAll('a.list-group-item[data-notification-id]'))
                                                         .some(el => !el.classList.contains('list-group-item-light'));
                            if (markAllReadBtn) markAllReadBtn.style.display = stillHasUnread ? 'block' : 'none';
                        }
                    } catch (error) {
                        console.error('Error marking notification as read on page:', error);
                    }
                }
                // Eğer link #/ ise veya spesifik bir durumda engellemek istersen:
                // if (this.getAttribute('href') === '#') {
                //    event.preventDefault();
                // }
            });
        });
    }

    function renderPagination(pageData) { // Sadece bir tane renderPagination olmalı
        if (!paginationUl || !paginationNav) {
            console.warn("Pagination elements not found in notifications page.");
            return;
        }
        paginationUl.innerHTML = '';
        if (pageData.totalPages <= 1) {
            paginationNav.style.display = 'none';
            return;
        }
        paginationNav.style.display = 'block';

        const prevLi = document.createElement('li');
        prevLi.classList.add('page-item');
        if (pageData.first) {
            prevLi.classList.add('disabled');
        }
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${pageData.number - 1}">Previous</a>`;
        paginationUl.appendChild(prevLi);

        for (let i = 0; i < pageData.totalPages; i++) {
            const pageLi = document.createElement('li');
            pageLi.classList.add('page-item');
            if (i === pageData.number) {
                pageLi.classList.add('active');
            }
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i + 1}</a>`;
            paginationUl.appendChild(pageLi);
        }

        const nextLi = document.createElement('li');
        nextLi.classList.add('page-item');
        if (pageData.last) {
            nextLi.classList.add('disabled');
        }
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${pageData.number + 1}">Next</a>`;
        paginationUl.appendChild(nextLi);

        paginationUl.querySelectorAll('a.page-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (link.parentElement.classList.contains('disabled') || link.parentElement.classList.contains('active')) {
                    return;
                }
                currentPage = parseInt(e.target.dataset.page);
                loadNotifications(); // loadNotifications'ı burada çağırıyoruz
            });
        });
    }

    // === ANA YÜKLEME FONKSİYONU ===
    async function loadNotifications() {
        if (!listContainer || !loadingSpinner || !errorContainer) {
             console.error('Temel DOM elementleri eksik, yükleme yapılamıyor.');
             if(loadingSpinner) loadingSpinner.style.display = 'none';
             if(errorContainer) {
                errorContainer.textContent = 'Sayfa yüklenirken bir yapılandırma hatası oluştu.';
                errorContainer.style.display = 'block';
             }
            return;
        }

        loadingSpinner.style.display = 'block';
        listContainer.innerHTML = ''; // Temizle
        errorContainer.style.display = 'none';
        if (markAllReadBtn) markAllReadBtn.style.display = 'none';
        if (paginationNav) paginationNav.style.display = 'none';

        if (typeof clearMessage === 'function') {
            if (messageContainer) clearMessage('notifications-page-message'); // ID doğru olmalı
            if (document.getElementById('global-message-area')) clearMessage('global-message-area');
        }

        try {
            const response = await fetchAPI(`/notifications?page=${currentPage}&size=${pageSize}&sort=createdAt,desc`, 'GET', null, true);
            loadingSpinner.style.display = 'none';

            if (response.success && response.data) {
                if (typeof response.data.currentUserTotalPoints !== 'undefined') {
                localStorage.setItem('totalPoints', response.data.currentUserTotalPoints);
                if (typeof updateNavigation === 'function') updateNavigation();
            }
                renderNotifications(response.data.content || []); // renderNotifications'ı burada çağır
                renderPagination(response.data);                  // renderPagination'ı burada çağır
                if (typeof showMessage === 'function' && messageContainer && response.data.content && response.data.content.length > 0) {
                    showMessage('notifications-page-message', 'Bildirimler başarıyla yüklendi.', 'success');
                }
            } else {
                errorContainer.textContent = response.error?.message || 'Bildirimler yüklenirken bir hata oluştu.';
                errorContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            loadingSpinner.style.display = 'none';
            errorContainer.textContent = 'Bildirimler yüklenirken bir ağ hatası oluştu.';
            errorContainer.style.display = 'block';
        }
    }

    // === SAYFA İLK YÜKLENDİĞİNDE ÇALIŞACAK KISIM ===
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            markAllReadBtn.disabled = true;
            markAllReadBtn.textContent = 'İşleniyor...';
            try {
                const response = await fetchAPI('/notifications/mark-all-as-read', 'POST', null, true);
                if (response.success) {
                    if (typeof showMessage === 'function' && messageContainer) {
                        showMessage('notifications-page-message', `${response.data || 0} bildirim okundu olarak işaretlendi.`, 'success');
                    }
                    currentPage = 0;
                    await loadNotifications();
                    if (typeof loadUnreadNotificationCount === 'function') loadUnreadNotificationCount();
                } else {
                    if (typeof showMessage === 'function' && messageContainer) {
                        showMessage('notifications-page-message', response.error?.message || 'Bir hata oluştu.', 'danger');
                    }
                }
            } catch (error) {
                 if (typeof showMessage === 'function' && messageContainer) {
                        showMessage('notifications-page-message', 'İşlem sırasında bir ağ hatası oluştu.', 'danger');
                    }
            } finally {
                markAllReadBtn.disabled = false;
                markAllReadBtn.textContent = 'Tümünü Okundu İşaretle';
            }
        });
    }

    if (localStorage.getItem('jwtToken')) {
        loadNotifications(); // Sayfa ilk yüklendiğinde bildirimleri yükle
    } else {
        errorContainer.textContent = 'Bildirimleri görmek için lütfen giriş yapın.';
        errorContainer.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }
} // initializeNotificationsPage sonu


// Sayfa yüklendiğinde initialize fonksiyonunu çağır
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotificationsPage);
} else {
    initializeNotificationsPage();
}