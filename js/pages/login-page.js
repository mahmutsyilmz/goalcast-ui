// js/pages/login-page.js
console.log('login-page.js: Script başladı.');

function initializeLoginPage() {
    const loginForm = document.getElementById('login-form'); // Fonksiyon içinde tanımla

    if (loginForm) {
        console.log('login-page.js: Login formu (id="login-form") bulundu.');
        // Listener'ın tekrar tekrar eklenmesini önlemek için bir kontrol eklenebilir
        // ama app.js eski scripti sildiği için bu genellikle sorun olmaz.
        // Yine de, emin olmak için bir bayrak kullanılabilir veya listener önce kaldırılıp sonra eklenebilir.
        // Şimdilik basit tutalım.
        if (typeof handleLogin === 'function') {
            loginForm.addEventListener('submit', function(event) { 
                console.log('login-page.js: Login formu submit edildi, handleLogin çağrılacak.');
                handleLogin(event); 
            });
            console.log('login-page.js: handleLogin event listenerı login-form\'a eklendi.');
        } else {
            console.error('HATA: login-page.js: handleLogin fonksiyonu bulunamadı!');
        }
    } else {
        console.error('HATA: login-page.js: Login formu (id="login-form") bulunamadı!');
    }
}

initializeLoginPage(); // Fonksiyonu çağır