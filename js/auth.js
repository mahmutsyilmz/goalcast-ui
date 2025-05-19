// js/auth.js

/**
 * Kullanıcı kayıt formunu yönetir.
 * @param {Event} event - Form submit olayı.
 */
async function handleRegister(event) {
    event.preventDefault(); // Formun varsayılan submit davranışını engelle
    console.log('auth.js: Register formu submit edildi.');

    // Mesaj alanını temizle
    if (typeof clearMessage === 'function') {
        clearMessage('register-message'); // views/register.html'deki mesaj alanı ID'si
        clearMessage('global-message-area'); 
    }

    // Form elemanlarını al (Bu ID'lerin views/register.html'de olduğundan emin olun)
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Input değerlerini al (Eğer inputlar bulunamazsa hata verecektir, bu iyi bir kontrol)
    if (!usernameInput || !emailInput || !passwordInput) {
        console.error("Kayıt formundaki inputlardan biri veya birkaçı bulunamadı!");
        if (typeof showMessage === 'function') {
            showMessage('register-message', 'Form yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.', 'danger');
        }
        return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !email || !password) {
        if (typeof showMessage === 'function') {
            showMessage('register-message', 'Lütfen tüm alanları doldurun.', 'warning');
        }
        return;
    }

    const registrationData = {
        username: username,
        email: email,
        password: password
    };

    // Geliştirme sırasında hassas olmayan verileri loglamak sorun değil, şifre gibi şeyler için dikkatli olunmalı.
    // console.log('Sending registration data (excluding password):', { username, email }); 

    try {
        const response = await fetchAPI('/auth/register', 'POST', registrationData, false);
        console.log('Registration API Response:', response);

        if (response.success && response.fullResponse && response.fullResponse.success) { 
            if (typeof showMessage === 'function') {
                showMessage('register-message', response.message || 'Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...', 'success');
            }
            event.target.reset(); 
            
            setTimeout(() => {
                location.hash = '#/login'; // YENİ SPA YÖNLENDİRMESİ
                console.log('auth.js: Kayıt sonrası #/login adresine yönlendirildi.');
            }, 2000); 
        } else {
            const errorMessage = (response.error && response.error.message) ? response.error.message : 'Kayıt sırasında bir hata oluştu.';
            if (typeof showMessage === 'function') {
                showMessage('register-message', errorMessage, 'danger');
            }
        }
    } catch (error) {
        console.error('Error during handleRegister:', error);
        if (typeof showMessage === 'function') {
            showMessage('register-message', 'Beklenmedik bir hata oluştu. Lütfen konsolu kontrol edin.', 'danger');
        }
    }
}

/**
 * Kullanıcı giriş formunu yönetir.
 * @param {Event} event - Form submit olayı.
 */
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const username = form.username.value;
    const password = form.password.value;
    const messageArea = 'login-message-area';

    if (!username || !password) {
        if (typeof showMessage === 'function') showMessage(messageArea, 'Kullanıcı adı ve şifre boş bırakılamaz.', 'warning');
        return;
    }

    const loginButton = form.querySelector('button[type="submit"]');
    const originalButtonText = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Giriş Yapılıyor...';
    if (typeof clearMessage === 'function') clearMessage(messageArea);

    const response = await fetchAPI('/auth/login', 'POST', { username, password }, false);

    loginButton.disabled = false;
    loginButton.innerHTML = originalButtonText;

    if (response.success && response.data && response.data.token) {
        console.log('Login API Response (with points & verification status):', response.data);
        localStorage.setItem('jwtToken', response.data.token);
        localStorage.setItem('username', response.data.username);
        localStorage.setItem('userRole', response.data.role);
        localStorage.setItem('userId', response.data.id);

        // Doğrudan login yanıtından puan ve doğrulama durumunu al
        if (typeof response.data.totalPoints !== 'undefined') {
            localStorage.setItem('totalPoints', response.data.totalPoints);
            console.log('Total points saved from login response:', response.data.totalPoints);
        }
        if (typeof response.data.emailVerified !== 'undefined') {
            localStorage.setItem('emailVerified', response.data.emailVerified);
            console.log('Email verified status saved from login response:', response.data.emailVerified);
        }
        // Ekstra /user/profile çağrısı ARTIK GEREKLİ DEĞİL

        if (typeof showMessage === 'function') {
            const globalMessageArea = document.getElementById('global-message-area');
            if (globalMessageArea) {
                showMessage('global-message-area', `Hoş geldin, ${escapeHTML(response.data.username)}! Başarıyla giriş yaptın.`, 'success');
            } else {
                showMessage(messageArea, `Hoş geldin, ${escapeHTML(response.data.username)}! Başarıyla giriş yaptın.`, 'success');
            }
        }
        
        location.hash = '#/'; // Ana sayfaya yönlendir (router updateNavigation'ı çağıracak)
    } else {
        if (typeof showMessage === 'function') showMessage(messageArea, response.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.', 'danger');
        console.error('Login failed:', response.error);
    }
}

// Bu dosyadaki fonksiyonlar, app.js tarafından yüklenen 
// js/pages/login-page.js ve js/pages/register-page.js gibi
// sayfa-özel scriptler tarafından çağrılacaktır.