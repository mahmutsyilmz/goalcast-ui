// js/app.js

const APP_CONFIG = {
    copyrightYear: "2025",
    appName: "GoalCast"
};

const appContent = document.getElementById('app-content');

// escapeHTML fonksiyonu ui.js'de tanımlı olmalı ve ui.js, app.js'den önce yüklenmeli.
// Eğer ui.js yoksa veya sıralama farklıysa, escapeHTML'i buraya veya global'e taşıyabilirsiniz.
// function escapeHTML(str) { ... } 

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
    '/admin/users': { // YENİ ADMIN KULLANICI YÖNETİMİ ROUTE'U
        templatePath: 'views/admin-users.html',
        title: 'Admin - Kullanıcı Yönetimi',
        authRequired: true,
        adminRequired: true
    },
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

let isNavigating = false; 

async function router() {
    if (isNavigating && location.hash !== window.currentNavHash) { // Eğer hash değişmişse devam et
        // Bu, aynı hash için tekrar tekrar router çağrılmasını engellemeye yardımcı olabilir,
        // ama location.hash doğrudan set edildiğinde bu kontrol atlanabilir.
        // console.log("Router: Navigation already in progress for a different hash, but new hash detected. Proceeding.");
    } else if (isNavigating) {
        // console.log("Router: Navigation already in progress for the same hash. Exiting.");
        return;
    }
    
    isNavigating = true;
    window.currentNavHash = location.hash; // Mevcut hash'i sakla

    if (!appContent) {
        console.error("app-content elementi bulunamadı!");
        isNavigating = false;
        return;
    }

    const fullHash = location.hash.slice(1) || '/';
    const pathParts = fullHash.split('?');
    const path = pathParts[0];
    const route = routes[path] || routes['/'];

    console.log(`Router: Routing to path: ${path} (Full hash: ${fullHash})`);

    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');

    if (route.authRequired && !token) {
        console.log("Router: Yetki Gerekli, token yok. Login'e yönlendiriliyor.");
        location.hash = '#/login';
        // isNavigating false yapılmadan önce return, çünkü location.hash değişimi yeni bir router çağrısını tetikleyecek.
        // Ancak, location.hash ataması senkron olduğu için, bu fonksiyonun sonundaki isNavigating = false;
        // bir sonraki router çağrısından önce çalışabilir. Daha sağlam bir lock mekanizması gerekebilir
        // veya bu yönlendirmelerden sonra direkt return edilebilir.
        // Şimdilik, location.hash'in yeni bir event tetikleyeceğini varsayıyoruz.
        // isNavigating = false; // Bunu burada false yapmak yerine, en sonda yapalım
        return; 
    }
    if (route.adminRequired && userRole !== 'ADMIN') {
        console.log("Router: Admin Yetkisi Gerekli. Yönlendiriliyor.");
        location.hash = (routes['/unauthorized'] && routes['/unauthorized'].templatePath) ? '#/unauthorized' : '#/';
        // isNavigating = false;
        return;
    }

    document.title = `${APP_CONFIG.appName} - ${route.title || 'Hoş Geldiniz'}`;

    try {
        if (route.templatePath) {
            appContent.innerHTML = '<div class="d-flex justify-content-center align-items-center" style="min-height: 300px;"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';
            const response = await fetch(route.templatePath);
            if (!response.ok) throw new Error(`Template yüklenemedi: ${route.templatePath} (${response.status})`);
            const html = await response.text();
            appContent.innerHTML = html;
            await loadPageScript(path); // Script yüklemesinin bitmesini bekle
        } else if (route.content) {
            appContent.innerHTML = route.content;
            await loadPageScript(path);
        } else {
            appContent.innerHTML = '<div class="alert alert-warning text-center">Aradığınız sayfa bulunamadı (404).</div>';
        }
    } catch (error) {
        console.error("Router error loading template or page script:", error);
        appContent.innerHTML = `<div class="alert alert-danger text-center">Sayfa yüklenirken bir hata oluştu: ${escapeHTML(error.message)}</div>`;
    } finally {
        // Puan ve bildirimleri template/script yüklendikten sonra çek ve navbar'ı çiz
        if (token) {
            await loadUnreadNotificationCount(); 
        }
        updateNavigation(); 
        isNavigating = false; // Yönlendirme tamamlandı
    }
}

async function loadPageScript(routePath) {
    let scriptName = routePath.substring(1).replace(/\//g, '-');
    if (scriptName === '') scriptName = 'index';
    if (scriptName.endsWith('-')) {
        scriptName = scriptName.slice(0, -1);
    }
    // Eğer /admin ise, scriptName 'admin' olur, -page.js eklenince 'admin-page.js' olur.
    // /admin/users ise, scriptName 'admin-users' olur.
    if (scriptName === 'admin') { // Genel bir admin sayfası için (eğer varsa)
        scriptName = 'admin-dashboard'; // Veya spesifik bir isim
    }


    const scriptPath = `js/pages/${scriptName}-page.js`;
    // console.log(`loadPageScript: Attempting to load script: ${scriptPath}`);

    const oldScript = document.getElementById('page-specific-script');
    if (oldScript) {
        oldScript.remove();
    }

    return new Promise((resolve) => { // Hata durumunda da resolve et, router devam etsin
        const scriptElement = document.createElement('script');
        scriptElement.id = 'page-specific-script';
        scriptElement.src = scriptPath;
        scriptElement.type = 'text/javascript';

        scriptElement.onload = () => {
            console.log(`SUCCESS: ${scriptPath} loaded.`);
            resolve();
        };
        scriptElement.onerror = (event) => {
            console.warn(`WARNING: Script ${scriptPath} could not be loaded or not found. This page might not have specific JS.`, event.type);
            // Sayfaya özel JS yoksa, bu bir hata değildir, router devam etmeli.
            // appContent'i temizle (spinner kalmış olabilir)
            if(appContent.innerHTML.includes('spinner-border')) {
                // Eğer template yüklenmiş ama script yüklenememişse ve spinner varsa,
                // bu durumun ayrıca ele alınması gerekebilir.
                // Ancak genellikle template yüklendiyse scriptin initialize fonksiyonu DOM'u yönetir.
            }
            resolve(); 
        };
        document.body.appendChild(scriptElement);
    });
}

function updateNavigation() {
    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');
    const username = localStorage.getItem('username');
    const totalPoints = localStorage.getItem('totalPoints');
    const navUl = document.querySelector('#navbarNav .navbar-nav');

    const currentFullHash = location.hash || '#/';
    const currentPathOnly = currentFullHash.split('?')[0];

    if (!navUl) return;

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
                        <li><a class="dropdown-item" href="#/admin/users">Kullanıcı Yönetimi</a></li>
                    </ul>
                </li>`;
        }

        if (totalPoints !== null && typeof totalPoints !== 'undefined' && totalPoints.toString().trim() !== '') {
            userSpecificLinksHTML += `
                <li class="nav-item">
                    <span class="nav-link text-warning fw-bold disabled" title="Puanınız" style="cursor: default;">
                        💰 ${escapeHTML(totalPoints)} P 
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
        // loadUnreadNotificationCount zaten router tarafından updateNavigation'dan önce çağrıldı.
        // setupNotificationDropdownListener, navbar DOM'u oluştuktan sonra çağrılmalı.
        if (typeof setupNotificationDropdownListener === 'function') {
            setupNotificationDropdownListener();
        }
    }
}

async function loadUnreadNotificationCount() {
    const badge = document.getElementById('unread-notification-count-badge');
    const token = localStorage.getItem('jwtToken');

    if (!badge || !token) {
        if(badge) badge.style.display = 'none';
        return false; 
    }

    try {
        const response = await fetchAPI('/notifications/unread-count', 'GET', null, true);
        let pointsHaveChanged = false;

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
                    pointsHaveChanged = true;
                }
            }
        } else {
            badge.style.display = 'none';
        }
        return pointsHaveChanged; // Puanın güncellenip güncellenmediğini döndür
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
                const response = await fetchAPI('/notifications?page=0&size=5&sort=createdAt,desc', 'GET', null, true);
                dropdownMenu.innerHTML = ''; 

                if (response.success && response.data && typeof response.data.currentUserTotalPoints !== 'undefined') {
                     const newPoints = response.data.currentUserTotalPoints.toString();
                     const currentStoredPoints = localStorage.getItem('totalPoints');
                     if (currentStoredPoints !== newPoints) {
                         localStorage.setItem('totalPoints', newPoints);
                         console.log('Notification Dropdown (show.bs.dropdown): totalPoints updated in localStorage to', newPoints);
                         updateNavigation(); // Dropdown açılırken puan değiştiyse navbar'ı hemen güncelle
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
                // ... (hata yönetimi aynı)
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
                        
                        const pointsUpdated = await loadUnreadNotificationCount(); // Badge'i ve localStorage'ı güncelle
                        if (pointsUpdated) {
                            updateNavigation(); // Eğer puan değiştiyse navbar'ı yenile
                        } else {
                            // Sadece badge güncellenmiş olabilir, navbar'ı tekrar çizmeye gerek yok
                            // (eğer updateNavigation sadece puan için değilse yine de çağrılabilir)
                        }
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
    localStorage.clear(); // Her şeyi temizlemek daha güvenli olabilir
    /*
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('totalPoints');
    localStorage.removeItem('emailVerified');
    */

    if (typeof showMessage === 'function' && document.getElementById('global-message-area')) {
        showMessage('global-message-area', 'Başarıyla çıkış yaptınız. Ana sayfaya yönlendiriliyorsunuz...', 'success');
    }
    setTimeout(() => {
        location.hash = '#/'; // Bu router'ı tetikleyecektir
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
    router();
});