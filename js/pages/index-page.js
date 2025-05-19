// js/pages/index-page.js
console.log('index-page.js: Script başladı.');

// Test fonksiyonları global scope'ta kalabilir
function testSuccessMessage() {
    if (typeof showMessage === 'function' && document.getElementById('test-message-area')) {
        showMessage('test-message-area', 'Bu bir başarı mesajı testidir! Her şey yolunda.', 'success');
    } else {
        console.warn('index-page.js: showMessage fonksiyonu veya test-message-area bulunamadı.');
    }
}

function testErrorMessage() {
    if (typeof showMessage === 'function' && document.getElementById('test-message-area')) {
        showMessage('test-message-area', 'Bu bir hata mesajı testidir! Bir sorun oluştu.', 'danger');
    } else {
        console.warn('index-page.js: showMessage fonksiyonu veya test-message-area bulunamadı.');
    }
}

async function testApiError() {
    if (typeof fetchAPI === 'function' && document.getElementById('test-message-area')) {
        if (typeof showMessage === 'function') showMessage('test-message-area', 'Varolmayan bir API endpointine istek atılıyor...', 'info');
        try {
            const response = await fetchAPI('/nonexistent/endpoint-test', 'GET', null, false); // fetchAPI zaten hatayı handle eder
            console.log('API Test Response (eğer başarılıysa, ki olmamalı):', response);
        } catch (e) {
            // fetchAPI içindeki catch bloğu zaten showMessage ile global mesajı göstermeli
            console.log("testApiError içinde yakalanan hata (beklenen):", e);
        }
    } else {
        console.warn('index-page.js: fetchAPI fonksiyonu veya test-message-area bulunamadı.');
    }
}

function initializeIndexPage() {
    console.log('index-page.js: initializeIndexPage fonksiyonu çalıştı.');
    
    const token = localStorage.getItem('jwtToken');
    // Ana CTA butonları
    const matchesCta = document.getElementById('index-matches-cta'); // Bu her zaman görünür olabilir
    const registerCta = document.getElementById('index-register-cta');
    const predictionsCta = document.getElementById('index-predictions-cta');
    const dashboardCta = document.getElementById('index-dashboard-cta');

    // Geliştirici test butonları bölümü
    //const testButtonsSection = document.getElementById('test-buttons-section'); 

    if (registerCta && predictionsCta && dashboardCta) { // Tüm butonların varlığını kontrol et
        if (token) {
            // Kullanıcı giriş yapmışsa
            if(registerCta) registerCta.style.display = 'none';
            if(predictionsCta) predictionsCta.style.display = 'inline-block'; // veya 'block' ya da flex stiline göre
            if(dashboardCta) dashboardCta.style.display = 'inline-block';
        } else {
            // Kullanıcı giriş yapmamışsa
            if(registerCta) registerCta.style.display = 'inline-block';
            if(predictionsCta) predictionsCta.style.display = 'none';
            if(dashboardCta) dashboardCta.style.display = 'none';
        }
    } else {
        console.warn('index-page.js: Ana sayfa CTA butonlarından bazıları DOM\'da bulunamadı.');
    }
    
    if (testButtonsSection) {
       // Sadece yerel geliştirme ortamında göster
       if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
           testButtonsSection.style.display = 'block';
       } else {
           testButtonsSection.style.display = 'none';
       }
    }
    
    console.log('index-page.js: Ana sayfa UI güncellemeleri tamamlandı.');
}

// Sayfa yüklendiğinde ana fonksiyonu çağır
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIndexPage);
} else {
    initializeIndexPage();
}