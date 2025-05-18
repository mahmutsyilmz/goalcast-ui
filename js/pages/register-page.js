// js/pages/register-page.js
console.log('register-page.js: Script başladı.');

function initializeRegisterPage() {
    const registerForm = document.getElementById('register-form'); // Fonksiyon içinde tanımla

    if (registerForm) {
        console.log('register-page.js: Register formu (id="register-form") bulundu.');
        if (typeof handleRegister === 'function') {
            registerForm.addEventListener('submit', function(event) { 
                console.log('register-page.js: Register formu submit edildi, handleRegister çağrılacak.');
                handleRegister(event); 
            });
            console.log('register-page.js: handleRegister event listenerı register-form\'a eklendi.');
        } else {
            console.error('HATA: register-page.js: handleRegister fonksiyonu (auth.js içinde olmalı) bulunamadı!');
        }
    } else {
        console.error('HATA: register-page.js: Register formu (id="register-form") bulunamadı! views/register.html doğru mu?');
    }
}

initializeRegisterPage(); // Fonksiyonu çağır