// js/app.js

const APP_CONFIG = {
    copyrightYear: "2025",
    appName: "GoalCast"
};

const appContent = document.getElementById('app-content');

const routes = {
    '/': { templatePath: 'views/home.html', title: 'Ana Sayfa' },
    '/login': { templatePath: 'views/login.html', title: 'Giriş Yap' },
    '/register': { templatePath: 'views/register.html', title: 'Kayıt Ol' },
    '/dashboard': { templatePath: 'views/dashboard.html', title: 'Panelim', authRequired: true },
    '/leagues': { templatePath: 'views/leagues.html', title: 'Ligler' },
    '/matches': { templatePath: 'views/matches.html', title: 'Maçlar' },
    '/predictions': { templatePath: 'views/predictions.html', title: 'Tahminlerim', authRequired: true },
    '/admin/leagues': { templatePath: 'views/admin-leagues.html', title: 'Admin - Lig Yönetimi', authRequired: true, adminRequired: true },
    '/admin/matches': { templatePath: 'views/admin-matches.html', title: 'Admin - Maç Yönetimi', authRequired: true, adminRequired: true },
    '/unauthorized': { templatePath: 'views/unauthorized.html', title: 'Yetkisiz Erişim' },
    '/leaderboard': {
        templatePath: 'views/leaderboard.html',
        title: 'Lider Tablosu'
    },
    '/verify-email': {
        templatePath: 'views/verify-email.html',
        title: 'E-posta Doğrulama'
    },
    '/notifications': {
        templatePath: 'views/notifications.html',
        title: 'Bildirimlerim',
        authRequired: true
    },
};

let isNavigating = false; // Router'ın tekrar tekrar tetiklenmesini önlemek için bir bayrak

async function router() {
    if (isNavigating) return; // Eğer zaten bir yönlendirme işlemi yapılıyorsa çık
    isNavigating = true;

    if (!appContent) {
        console.error("app-content elementi bulunamadı!");
        isNavigating = false;
        return;
    }

    const fullHash = location.hash.slice(1) || '/';
    const pathParts = fullHash.split('?');
    const path = pathParts[0];
    const route = routes[path] || routes['/'];

    console.log(`Routing to path: ${path} (Full hash: ${fullHash})`);

    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');

    if (route.authRequired && !token) {
        console.log("Yetki Gerekli, token yok. Login'e yönlendiriliyor.");
        location.hash = '#/login'; // Bu tekrar router'ı tetikleyecek
        isNavigating = false;
        return; // Mevcut router işlemini sonlandır
    }
    if (route.adminRequired && userRole !== 'ADMIN') {
        console.log("Admin Yetkisi Gerekli. Yönlendiriliyor.");
        location.hash = (routes['/unauthorized'] && routes['/unauthorized'].templatePath) ? '#/unauthorized' : '#/';
        isNavigating = false;
        return;
    }

    document.title = `GoalCast - ${route.title || APP_CONFIG.appName}`;

    try {
        if (route.templatePath) {
            appContent.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';
            const response = await fetch(route.templatePath);
            if (!response.ok) throw new Error(`Template yüklenemedi: ${route.templatePath} - ${response.statusText} (${response.status})`);
            const html = await response.text();
            appContent.innerHTML = html;
            loadPageScript(path);
        } else if (route.content) {
            appContent.innerHTML = route.content;
            loadPageScript(path);
        } else {
            appContent.innerHTML = '<div class="alert alert-warning">Bu sayfa için içerik bulunamadı (404).</div>';
        }
    } catch (error) {
        console.error("Router error loading template or script:", error);
        appContent.innerHTML = `<div class="alert alert-danger">Sayfa yüklenirken bir hata oluştu: ${error.message}</div>`;
    }

    // updateNavigation'ı template ve script yüklendikten sonra çağır
    // ve loadUnreadNotificationCount'un sonucunu bekle (eğer puanı güncelleyecekse)
    if (token) {
        // Önce bildirim ve puan bilgisini çek, sonra navbar'ı çiz
        await loadUnreadNotificationCount(); // Bu fonksiyon localStorage'ı güncelleyebilir
    }
    updateNavigation(); // En güncel localStorage değerleriyle navbar'ı çiz

    isNavigating = false;
}

async function loadPageScript(routePath) {
    let scriptName = routePath.substring(1).replace(/\//g, '-');
    if (scriptName === '') scriptName = 'index';
    if (scriptName.endsWith('-')) {
        scriptName = scriptName.slice(0, -1);
    }

    const scriptPath = `js/pages/${scriptName}-page.js`;
    console.log(`loadPageScript: Attempting to load script: ${scriptPath}`);

    const oldScript = document.getElementById('page-specific-script');
    if (oldScript) {
        oldScript.remove();
    }

    return new Promise((resolve, reject) => {
        const scriptElement = document.createElement('script');
        scriptElement.id = 'page-specific-script';
        scriptElement.src = scriptPath;
        scriptElement.type = 'text/javascript';

        scriptElement.onload = () => {
            console.log(`SUCCESS: ${scriptPath} loaded.`);
            resolve();
        };
        scriptElement.onerror = (event) => {
            console.warn(`WARNING: ${scriptPath} could not be loaded or not found.`, event);
            resolve(); // Script yüklenemese bile router devam etmeli
        };
        document.body.appendChild(scriptElement);
    });
}

function updateNavigation() {
    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');
    const username = localStorage.getItem('username');
    const totalPoints = localStorage.getItem('totalPoints'); // Her zaman en güncelini oku
    const navUl = document.querySelector('#navbarNav .navbar-nav');

    // console.log('updateNavigation called. Current totalPoints from localStorage:', totalPoints);

    const currentFullHash = location.hash || '#/';
    const currentPathOnly = currentFullHash.split('?')[0];

    if (!navUl) {
        console.error("Navbar UL element (#navbarNav .navbar-nav) not found!");
        return;
    }

    let navLinksHTML = `
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/' ? 'active' : ''}" href="#/">Ana Sayfa</a></li>
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/leagues' ? 'active' : ''}" href="#/leagues">Ligler</a></li>
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/matches' ? 'active' : ''}" href="#/matches">Maçlar</a></li>
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/leaderboard' ? 'active' : ''}" href="#/leaderboard">Lider Tablosu</a></li>
    `;

    let userSpecificLinksHTML = '';

    if (token) {
        userSpecificLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/dashboard' ? 'active' : ''}" href="#/dashboard">Panelim</a></li>`;
        userSpecificLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/predictions' ? 'active' : ''}" href="#/predictions">Tahminlerim</a></li>`;

        if (userRole === 'ADMIN') {
            userSpecificLinksHTML += `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle ${(currentPathOnly.startsWith('#/admin')) ? 'active' : ''}" href="#" id="navbarDropdownAdmin" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Admin
                    </a>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="navbarDropdownAdmin">
                        <li><a class="dropdown-item" href="#/admin/matches">Maç Yönetimi</a></li>
                        <li><a class="dropdown-item" href="#/admin/leagues">Lig Yönetimi</a></li>
                    </ul>
                </li>`;
        }

        if (totalPoints !== null && typeof totalPoints !== 'undefined' && totalPoints.toString().trim() !== '') {
            userSpecificLinksHTML += `
                <li class="nav-item">
                    <span class="nav-link text-warning fw-bold disabled" title="Puanınız" style="cursor: default;">
                        💰 ${typeof escapeHTML === 'function' ? escapeHTML(totalPoints) : totalPoints} P
                    </span>
                </li>`;
        }

        userSpecificLinksHTML += `
            <li class="nav-item dropdown" id="notifications-dropdown-container">
                <a class="nav-link dropdown-toggle ${(currentPathOnly === '#/notifications') ? 'active' : ''}" href="#" id="navbarDropdownNotifications" role="button" data-bs-toggle="dropdown" aria-expanded="false" style="position: relative;">
                    <i class="fas fa-bell"></i>
                    <span class="badge rounded-pill bg-danger" id="unread-notification-count-badge" style="display: none; position: absolute; top: 5px; right: 0px; font-size: 0.6em; padding: 0.2em 0.4em;"></span>
                </a>
                <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" aria-labelledby="navbarDropdownNotifications" id="notifications-dropdown-menu" style="min-width: 300px; max-height: 400px; overflow-y: auto;">
                    <li><div class="text-center p-2 small text-muted"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div></li>
                </ul>
            </li>
        `;
        
        const displayUsername = (username && typeof escapeHTML === 'function') ? escapeHTML(username) : (username || 'Kullanıcı');
        userSpecificLinksHTML += `<li class="nav-item"><a class="nav-link" href="#" id="logout-link">Çıkış Yap (${displayUsername})</a></li>`;
        
        navLinksHTML += userSpecificLinksHTML;
    } else {
        navLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/login' ? 'active' : ''}" href="#/login">Giriş Yap</a></li>`;
        navLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/register' ? 'active' : ''}" href="#/register">Kayıt Ol</a></li>`;
    }
    
    navUl.innerHTML = navLinksHTML;

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }

    if (token) {
        // setupNotificationDropdownListener loadUnreadNotificationCount'u zaten çağırıyor olabilir,
        // ya da loadUnreadNotificationCount'u burada çağırıp, onun puanı güncelledikten sonra
        // setupNotificationDropdownListener'ı çağırmak daha mantıklı olabilir.
        // Şimdilik ayrı ayrı çağırıyoruz.
        if (typeof setupNotificationDropdownListener === 'function') {
            setupNotificationDropdownListener(); // Bu, dropdown açıldığında bildirimleri çeker
        }
         // loadUnreadNotificationCount'u updateNavigation'ın sonunda bir kez daha çağırmak yerine,
         // router fonksiyonu içinde updateNavigation'dan önce çağırdık.
    }
}

async function loadUnreadNotificationCount() {
    const badge = document.getElementById('unread-notification-count-badge');
    const token = localStorage.getItem('jwtToken'); // Token'ı fonksiyon içinde alalım

    if (!badge || !token) { // Token yoksa veya badge elementi yoksa işlem yapma
        if(badge) badge.style.display = 'none';
        return false; // Puan güncellenmedi veya işlem yapılmadı
    }

    try {
        const response = await fetchAPI('/notifications/unread-count', 'GET', null, true);
        let pointsUpdated = false;

        if (response.success && response.data) {
            const count = response.data.unreadCount;
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count.toString();
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }

            if (typeof response.data.currentUserTotalPoints !== 'undefined') {
                const newPoints = response.data.currentUserTotalPoints.toString();
                const currentStoredPoints = localStorage.getItem('totalPoints');
                if (currentStoredPoints !== newPoints) {
                    localStorage.setItem('totalPoints', newPoints);
                    console.log('loadUnreadNotificationCount: totalPoints updated in localStorage to', newPoints);
                    pointsUpdated = true; // Puanın değiştiğini işaretle
                }
            }
        } else {
            badge.style.display = 'none';
        }
        return pointsUpdated; // Puanın güncellenip güncellenmediğini döndür
    } catch (error) {
        console.error('Error fetching unread notification count:', error);
        if (badge) badge.style.display = 'none';
        return false;
    }
}

function setupNotificationDropdownListener() {
    const dropdownContainer = document.getElementById('notifications-dropdown-container');
    const dropdownMenu = document.getElementById('notifications-dropdown-menu');

    if (dropdownContainer && dropdownMenu) {
        dropdownContainer.addEventListener('show.bs.dropdown', async event => {
            dropdownMenu.innerHTML = '<li><div class="text-center p-2 small text-muted"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div></li>';
            
            try {
                // `/api/notifications` yanıtı UserNotificationsPageResponseDto bekliyor
                const response = await fetchAPI('/notifications?page=0&size=5&sort=createdAt,desc', 'GET', null, true);
                dropdownMenu.innerHTML = ''; 

                // Backend'den gelen güncel puanı burada da alıp localStorage'ı güncelleyebiliriz
                if (response.success && response.data && typeof response.data.currentUserTotalPoints !== 'undefined') {
                     const newPoints = response.data.currentUserTotalPoints.toString();
                     const currentStoredPoints = localStorage.getItem('totalPoints');
                     if (currentStoredPoints !== newPoints) {
                         localStorage.setItem('totalPoints', newPoints);
                         console.log('Notification Dropdown: totalPoints updated in localStorage to', newPoints);
                         // updateNavigation(); // Dropdown açılırken navbar'ı tekrar çizmek UI'da zıplamaya neden olabilir.
                                             // Bunun yerine, bir sonraki router() çağrısı veya periyodik güncelleme yapsın.
                     }
                }

                if (response.success && response.data && response.data.content) {
                    const notifications = response.data.content;
                    if (notifications.length === 0) {
                        dropdownMenu.insertAdjacentHTML('beforeend', '<li><a class="dropdown-item text-muted small disabled" href="#">Okunacak yeni bildirim yok.</a></li>');
                    } else {
                        notifications.forEach(notif => {
                            const itemClass = notif.read ? 'text-muted' : 'fw-bold';
                            const dateString = notif.createdAt ? new Date(notif.createdAt).toLocaleString('tr-TR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '';
                            const listItem = `
                                <li>
                                    <a class="dropdown-item small ${itemClass} notification-item" href="${escapeHTML(notif.link) || '#/notifications'}" data-notification-id="${notif.id}">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1 small">${escapeHTML(getNotificationTitle(notif.type))}</h6>
                                            <small>${dateString}</small>
                                        </div>
                                        <p class="mb-1 small">${escapeHTML(notif.message)}</p>
                                    </a>
                                </li>`;
                            dropdownMenu.insertAdjacentHTML('beforeend', listItem);
                        });
                        dropdownMenu.insertAdjacentHTML('beforeend', '<li><hr class="dropdown-divider my-1"></li>');
                    }
                } else {
                     dropdownMenu.insertAdjacentHTML('beforeend', '<li><a class="dropdown-item text-danger small disabled" href="#">Bildirimler yüklenemedi.</a></li>');
                }
                dropdownMenu.insertAdjacentHTML('beforeend', '<li><a class="dropdown-item text-center small py-2" href="#/notifications">Tüm Bildirimleri Gör</a></li>');
                
                addNotificationItemClickListeners();

            } catch (error) {
                console.error('Error loading notifications for dropdown:', error);
                dropdownMenu.innerHTML = '<li><a class="dropdown-item text-danger small disabled" href="#">Bir hata oluştu.</a></li>';
                dropdownMenu.insertAdjacentHTML('beforeend', '<li><hr class="dropdown-divider my-1"></li>');
                dropdownMenu.insertAdjacentHTML('beforeend', '<li><a class="dropdown-item text-center small py-2" href="#/notifications">Tüm Bildirimleri Gör</a></li>');
            }
        });
    }
}

function addNotificationItemClickListeners() {
    const dropdownMenu = document.getElementById('notifications-dropdown-menu');
    if (!dropdownMenu) return;

    dropdownMenu.querySelectorAll('a.notification-item[data-notification-id]').forEach(item => {
        item.addEventListener('click', async function(event) {
            const notificationId = this.dataset.notificationId;
            const isAlreadyRead = this.classList.contains('text-muted');

            if (notificationId && !isAlreadyRead) {
                try {
                    const markResponse = await fetchAPI(`/notifications/${notificationId}/mark-as-read`, 'POST', null, true);
                    if (markResponse.success) {
                        this.classList.remove('fw-bold');
                        this.classList.add('text-muted');
                        // loadUnreadNotificationCount, localStorage'ı güncelleyip navbar'ı tetikleyebilir
                        // veya sadece badge'i güncelleyebilir. Navbar'ı hemen güncellemek için:
                        const pointsUpdated = await loadUnreadNotificationCount();
                        if(pointsUpdated) {
                            // updateNavigation(); // Eğer loadUnreadNotificationCount kendisi yapmıyorsa.
                            // Ama loadUnreadNotificationCount localStorage'ı güncellediği için
                            // ve addNotificationItemClickListeners -> loadUnreadNotificationCount -> (puan değişirse) updateNavigation
                            // şeklinde bir akış varsa, bu updateNavigation'ı burada çağırmak yine riskli olabilir.
                            // En iyisi, loadUnreadNotificationCount'un navbar'ı yenileme sorumluluğunu alması.
                            // Ancak loadUnreadNotificationCount'un kendisi updateNavigation'ı çağırmamalı.
                            // Bu durumda, puan değiştiyse elle updateNavigation çağırmak gerekir.
                        }
                        // Basitçe, badge'i güncelledik, linke tıklanınca sayfa zaten değişecek ve router navbar'ı yenileyecek.
                    }
                } catch (error) {
                    console.error('Error marking notification as read from dropdown:', error);
                }
            }
        });
    });
}

function getNotificationTitle(type) {
    switch (type) {
        case 'NEW_MATCH_ADDED': return 'Yeni Maç Eklendi!';
        case 'PREDICTION_RESULT_WIN': return 'Tahmin Kazandı!';
        case 'PREDICTION_RESULT_LOSS': return 'Tahmin Kaybetti';
        case 'PREDICTION_RESULT_DRAW': return 'Tahmin Sonuçlandı';
        case 'EMAIL_VERIFIED': return 'E-posta Doğrulandı!';
        default: return 'Bildirim';
    }
}

function handleLogout(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('totalPoints'); // Çıkışta puanı da temizle
    localStorage.removeItem('emailVerified'); // E-posta doğrulama durumunu da temizle

    if (typeof showMessage === 'function' && document.getElementById('global-message-area')) {
        showMessage('global-message-area', 'Başarıyla çıkış yaptınız. Ana sayfaya yönlendiriliyorsunuz...', 'success');
    }
    setTimeout(() => {
        location.hash = '#/';
    }, 1000);
}

function updateFooterYear() {
    const footerYearSpan = document.getElementById('footer-year');
    if (footerYearSpan) {
        footerYearSpan.textContent = APP_CONFIG.copyrightYear;
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    updateFooterYear();
    router(); // İlk yüklemede router'ı çalıştır
});

// escapeHTML fonksiyonu (ui.js'de olması tercih edilir)
if (typeof escapeHTML !== 'function') {
    function escapeHTML(str) {
        if (str === null || typeof str === 'undefined') return '';
        return str.toString()
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '\'');
    }
}

// Periyodik olarak puan ve okunmamış bildirim sayısını kontrol etme (Opsiyonel)
// Bu, kullanıcı sayfada aktifken backend kaynaklı değişiklikleri yansıtmak için.
// setInterval(async () => {
//     if (localStorage.getItem('jwtToken')) {
//         console.log('Periodic check for updates (points/notifications)...');
//         const pointsWereUpdated = await loadUnreadNotificationCount();
//         if (pointsWereUpdated) {
//             updateNavigation(); // Sadece puan gerçekten değiştiyse navbar'ı yenile
//         }
//     }
// }, 30000); // Örn: Her 30 saniyede bir