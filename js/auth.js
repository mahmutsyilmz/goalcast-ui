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
    event.preventDefault(); // Formun varsayılan submit davranışını engelle
    console.log('auth.js: handleLogin fonksiyonu çalıştı.');
    
    if (typeof clearMessage === 'function') {
        clearMessage('login-message'); // views/login.html'deki mesaj alanı ID'si
        clearMessage('global-message-area');
    }

    const usernameInput = document.getElementById('username'); // Bu ID'lerin views/login.html'de olduğundan emin olun
    const passwordInput = document.getElementById('password');

    if (!usernameInput || !passwordInput) {
        console.error("Login formundaki inputlardan biri veya birkaçı bulunamadı!");
        if (typeof showMessage === 'function') {
            showMessage('login-message', 'Form yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.', 'danger');
        }
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        if (typeof showMessage === 'function') {
            showMessage('login-message', 'Kullanıcı adı ve şifre alanları zorunludur.', 'warning');
        }
        return;
    }

    const loginData = {
        username: username,
        password: password
    };

    // console.log('Sending login data (excluding password):', { username });

    try {
        const response = await fetchAPI('/auth/login', 'POST', loginData, false);
        console.log('Login API Response:', response);

        if (response.success && response.data && response.data.token) {
            const authData = response.data; 

            localStorage.setItem('jwtToken', authData.token);
            localStorage.setItem('username', authData.username);
            localStorage.setItem('userRole', authData.role);
            localStorage.setItem('userId', authData.id.toString());

            if (typeof showMessage === 'function') {
                // views/login.html'de id="login-message" olan bir div olmalı
                showMessage('login-message', response.message || 'Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
            }
            
            if (event.target && typeof event.target.reset === 'function') {
                event.target.reset(); // Formu temizle
            }


            // Navbar'ı güncelle (app.js'deki fonksiyonu çağırarak)
            // updateNavigation() zaten router tarafından her hash değişiminde çağrılıyor.
            // Başarılı login sonrası doğrudan yönlendirme yapacağımız için burada tekrar çağırmaya gerek yok,
            // yeni sayfada router ve dolayısıyla updateNavigation çalışacaktır.
            // if (typeof updateNavigation === 'function') {
            //     updateNavigation(); 
            // }

            setTimeout(() => {
                location.hash = '#/'; // YENİ SPA YÖNLENDİRMESİ (Ana Sayfa)
                console.log('auth.js: Login sonrası #/ adresine yönlendirildi.');
            }, 1500); 
        } else {
            const errorMessage = (response.error && response.error.message) ? response.error.message : 'Giriş sırasında bir hata oluştu.';
            if (typeof showMessage === 'function') {
                showMessage('login-message', errorMessage, 'danger');
            }
        }
    } catch (error) {
        console.error('Error during handleLogin:', error);
        if (typeof showMessage === 'function') {
            showMessage('login-message', 'Beklenmedik bir hata oluştu. Lütfen konsolu kontrol edin.', 'danger');
        }
    }
}

// Bu dosyadaki fonksiyonlar, app.js tarafından yüklenen 
// js/pages/login-page.js ve js/pages/register-page.js gibi
// sayfa-özel scriptler tarafından çağrılacaktır.