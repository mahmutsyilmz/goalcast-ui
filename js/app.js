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
    '/matches': { templatePath: 'views/matches.html', title: 'Maçlar' }, // Bu route için query param okunacak
    '/predictions': { templatePath: 'views/predictions.html', title: 'Tahminlerim', authRequired: true },
    '/admin/leagues': { templatePath: 'views/admin-leagues.html', title: 'Admin - Lig Yönetimi', authRequired: true, adminRequired: true },
    '/admin/matches': { templatePath: 'views/admin-matches.html', title: 'Admin - Maç Yönetimi', authRequired: true, adminRequired: true },
    '/unauthorized': { templatePath: 'views/unauthorized.html', title: 'Yetkisiz Erişim' }
};

async function router() {
    if (!appContent) {
        console.error("app-content elementi bulunamadı!");
        return;
    }

    // Mevcut hash'i al ve query string'den ayır
    const fullHash = location.hash.slice(1) || '/';      // Örn: /matches?leagueId=6 veya /login
    const pathParts = fullHash.split('?');          // ["/matches", "leagueId=6"] veya ["/login"]
    const path = pathParts[0];                      // Sadece path kısmı: "/matches" veya "/login"
    // const queryString = pathParts[1] || '';      // Query string: "leagueId=6" veya "" (ihtiyaç olursa)

    const route = routes[path] || routes['/']; 
    
    console.log(`Routing to path: ${path} (Full hash: ${fullHash})`);

    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');

    if (route.authRequired && !token) {
        console.log("Yetki Gerekli, token yok. Login'e yönlendiriliyor.");
        location.hash = '#/login';
        return;
    }
    if (route.adminRequired && userRole !== 'ADMIN') {
        console.log("Admin Yetkisi Gerekli. Yetkisiz erişim sayfasına/ana sayfaya yönlendiriliyor.");
        location.hash = (routes['/unauthorized'] && routes['/unauthorized'].templatePath) ? '#/unauthorized' : '#/';
        return;
    }

    document.title = `GoalCast - ${route.title || APP_CONFIG.appName}`;

    if (route.templatePath) {
        try {
            appContent.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';
            const response = await fetch(route.templatePath);
            if (!response.ok) throw new Error(`Template yüklenemedi: ${route.templatePath} - ${response.statusText} (${response.status})`);
            const html = await response.text();
            appContent.innerHTML = html;

            // Template yüklendikten sonra sayfaya özel JS'i yükle
            // path olarak query string'siz halini gönderiyoruz,
            // sayfa-özel JS dosyası gerekirse location.hash'ten query parametrelerini kendisi okuyacak.
            loadPageScript(path); 

        } catch (error) {
            console.error("Router error loading template:", error);
            appContent.innerHTML = `<div class="alert alert-danger">Sayfa yüklenirken bir hata oluştu: ${error.message}</div>`;
        }
    } else if (route.content) { // Template path yerine direkt içerik de verilebilir
        appContent.innerHTML = route.content;
        loadPageScript(path); 
    } else { // Ne template ne de content varsa
        appContent.innerHTML = '<div class="alert alert-warning">Bu sayfa için içerik bulunamadı (404).</div>';
        // 404 durumu için de bir script yüklenebilir veya ana sayfaya yönlendirilebilir.
        // Örneğin: if (path !== '/') location.hash = '#/';
    }
    updateNavigation(); // Her route değişiminde navbar'ı ve aktif linkleri güncelle
}

async function loadPageScript(routePath) {
    // routePath burada query string içermiyor olmalı (örn: /matches, /admin/leagues)
    let scriptName = routePath.substring(1).replace(/\//g, '-'); 
    if (scriptName === '') scriptName = 'index'; 

    if (scriptName.endsWith('-')) { // Eğer "/admin/leagues/" gibi bir şey gelirse sondaki '-'yi kaldır.
        scriptName = scriptName.slice(0, -1);
    }
    
    const scriptPath = `js/pages/${scriptName}-page.js`;
    console.log(`loadPageScript: Attempting to load script: ${scriptPath}`);

    const oldScript = document.getElementById('page-specific-script');
    if (oldScript) {
        console.log('loadPageScript: Removing old page-specific script.');
        oldScript.remove();
    }

    try {
        const scriptElement = document.createElement('script');
        scriptElement.id = 'page-specific-script';
        scriptElement.src = scriptPath;
        scriptElement.type = 'text/javascript'; 
        
        scriptElement.onload = () => { 
            console.log(`SUCCESS: ${scriptPath} loaded and executed (onload).`);
        };
        scriptElement.onerror = (event) => { 
            console.warn(`WARNING: ${scriptPath} could not be loaded or not found. This might be okay if the page has no specific JS (e.g., for a simple 404 page).`, event);
        };
        document.body.appendChild(scriptElement);
    } catch (error) {
        console.error(`ERROR in loadPageScript block for (${scriptPath}):`, error);
    }
}

function updateNavigation() {
    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');
    const navUl = document.querySelector('#navbarNav .navbar-nav');
    
    // Aktif route'u belirlerken query string'i dikkate alma
    const currentFullHash = location.hash || '#/';
    const currentPathOnly = currentFullHash.split('?')[0]; // Sadece #/path kısmı

    if (!navUl) return;

    // Navbar'ı her seferinde yeniden oluşturmak, aktif link yönetimini basitleştirir
    let navLinksHTML = `
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/' ? 'active' : ''}" href="#/">Ana Sayfa</a></li>
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/leagues' ? 'active' : ''}" href="#/leagues">Ligler</a></li>
        <li class="nav-item"><a class="nav-link ${currentPathOnly === '#/matches' ? 'active' : ''}" href="#/matches">Maçlar</a></li>
    `;
    
    if (token) {
        navLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/dashboard' ? 'active' : ''}" href="#/dashboard">Panelim</a></li>`;
        navLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/predictions' ? 'active' : ''}" href="#/predictions">Tahminlerim</a></li>`;

        if (userRole === 'ADMIN') {
            navLinksHTML += `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle ${(currentPathOnly.startsWith('#/admin')) ? 'active' : ''}" href="#" id="navbarDropdownAdmin" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Admin
                    </a>
                    <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDropdownAdmin">
                        <li><a class="dropdown-item" href="#/admin/matches">Maç Yönetimi</a></li>
                        <li><a class="dropdown-item" href="#/admin/leagues">Lig Yönetimi</a></li>
                    </ul>
                </li>`;
        }
        navLinksHTML += `<li class="nav-item"><a class="nav-link" href="#" id="logout-link">Çıkış Yap (${localStorage.getItem('username') || 'Kullanıcı'})</a></li>`;
    } else {
        navLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/login' ? 'active' : ''}" href="#/login">Giriş Yap</a></li>`;
        navLinksHTML += `<li class="nav-item"><a class="nav-link ${currentPathOnly === '#/register' ? 'active' : ''}" href="#/register">Kayıt Ol</a></li>`;
    }
    navUl.innerHTML = navLinksHTML;

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        // Listener'ın tekrar tekrar eklenmesini önlemek için, logoutLink her oluştuğunda listener ekleyebiliriz.
        // Veya logoutLink'e bir kerelik bir listener ekleyip, app.js scope'unda tutabiliriz.
        // Şimdilik her updateNavigation'da eklemek daha basit.
        logoutLink.addEventListener('click', handleLogout);
    }
}

function handleLogout(event) { 
    if(event) event.preventDefault();
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    
    // updateNavigation(); // Bu zaten location.hash değişince router tarafından çağrılacak.
    if (typeof showMessage === 'function') {
        showMessage('global-message-area', 'Başarıyla çıkış yaptınız. Ana sayfaya yönlendiriliyorsunuz...', 'success');
    }
    setTimeout(() => {
        location.hash = '#/'; 
    }, 1000); // Mesajın okunması için kısa bir gecikme
}

function updateFooterYear() {
    const footerYearSpan = document.getElementById('footer-year');
    if (footerYearSpan) {
        footerYearSpan.textContent = APP_CONFIG.copyrightYear;
    }
}

// --- BAŞLANGIÇ ---
window.addEventListener('hashchange', router); // URL hash'i değiştiğinde router'ı çalıştır
window.addEventListener('load', () => {        // Sayfa ilk yüklendiğinde
    updateFooterYear();
    router(); // Mevcut hash'e göre içeriği yükle ve navbar'ı güncelle
});