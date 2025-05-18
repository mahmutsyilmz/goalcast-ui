// js/pages/index-page.js
console.log('index-page.js: Script başladı.');

// Test fonksiyonları global scope'ta kalabilir çünkü onclick ile çağrılıyorlar
// views/home.html içindeki butonlardan.
function testSuccessMessage() {
    if (typeof showMessage === 'function') {
        showMessage('global-message-area', 'Bu bir başarı mesajıdır!', 'success');
    } else {
        console.warn('index-page.js: showMessage fonksiyonu bulunamadı.');
    }
}

function testErrorMessage() {
    if (typeof showMessage === 'function') {
        showMessage('global-message-area', 'Bu bir hata mesajıdır!', 'danger');
    } else {
        console.warn('index-page.js: showMessage fonksiyonu bulunamadı.');
    }
}

async function testApiError() {
    if (typeof fetchAPI === 'function') {
        if (typeof clearMessage === 'function') clearMessage('global-message-area'); 
        const response = await fetchAPI('/nonexistent/endpoint', 'GET');
        console.log('API Test Response:', response);
    } else {
        console.warn('index-page.js: fetchAPI fonksiyonu bulunamadı.');
    }
}

function initializeIndexPage() {
    console.log('index-page.js: initializeIndexPage fonksiyonu çalıştı.');
    
    const token = localStorage.getItem('jwtToken');
    const indexLoginCta = document.getElementById('index-login-cta');
    const indexPredictionsCta = document.getElementById('index-predictions-cta');
    const testButtonsSection = document.getElementById('test-buttons-section'); 

    if (token) {
        if (indexLoginCta) indexLoginCta.style.display = 'none';
        if (indexPredictionsCta) indexPredictionsCta.style.display = 'inline-block';
    } else {
        if (indexLoginCta) indexLoginCta.style.display = 'inline-block';
        if (indexPredictionsCta) indexPredictionsCta.style.display = 'none';
    }
    
    if (testButtonsSection) {
       testButtonsSection.style.display = 'none'; // Varsayılan olarak gizli kalsın
        // URL'de ?dev=true varsa göstermek için:
        // const urlParams = new URLSearchParams(location.hash.split('?')[1] || ''); // Hash'ten sonraki query string'i al
        // if (urlParams.has('dev')) {
        //    testButtonsSection.style.display = 'block';
        // }
    }
    
    console.log('index-page.js: Ana sayfa UI güncellemeleri tamamlandı.');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIndexPage);
} else {
    initializeIndexPage();
}