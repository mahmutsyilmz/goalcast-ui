// js/api.js
const BASE_URL = 'https://goalcast-api-ethxh9f4hngugwh9.germanywestcentral-01.azurewebsites.net/api'; // Spring Boot backend adresiniz
//http://localhost:8080/api
//https://goalcast-api-ethxh9f4hngugwh9.germanywestcentral-01.azurewebsites.net/api

/**
 * Backend API'sine istek göndermek için genel bir fonksiyon.
 * @param {string} endpoint - İstek yapılacak API endpoint'i (örn: /auth/login).
 * @param {string} method - HTTP metodu (GET, POST, PUT, DELETE vb.). Varsayılan 'GET'.
 * @param {object|null} body - POST veya PUT istekleri için gönderilecek JSON gövdesi. Varsayılan null.
 * @param {boolean} requiresAuth - Bu isteğin yetkilendirme (JWT token) gerektirip gerektirmediği. Varsayılan false.
 * @returns {Promise<object>} - API'den dönen sonucu içeren bir promise.
 *                            Başarılı ise: { success: true, data: ..., message: ..., fullResponse: ... }
 *                            Başarısız ise: { success: false, error: ..., status: ... }
 */
async function fetchAPI(endpoint, method = 'GET', body = null, requiresAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
    };

    // Eğer yetkilendirme gerekiyorsa ve token localStorage'da varsa, Authorization header'ını ekle
    if (requiresAuth) {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn(`Yetki gerektiren endpoint (${endpoint}) için token bulunamadı.`);
            // İsteğe bağlı olarak burada kullanıcıyı login'e yönlendirebilir veya global bir hata mesajı gösterebiliriz.
            // Şimdilik sadece konsola yazıyoruz ve isteğin devam etmesine izin veriyoruz (backend 401 dönecektir).
            // if (typeof showMessage === 'function') {
            //     showMessage('global-message-area', 'Bu işlem için giriş yapmanız gerekmektedir. Lütfen giriş yapın.', 'warning');
            // }
            // return { success: false, error: { message: 'Yetkilendirme tokeni gerekli ve bulunamadı.' }, status: 401 };
        }
    }

    const config = {
        method: method.toUpperCase(), // Metodu büyük harfe çevir
        headers: headers,
    };

    if (body && (config.method === 'POST' || config.method === 'PUT')) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);

        // 204 No Content gibi durumlar için özel işlem
        if (response.status === 204) {
            // Genellikle 204 başarı anlamına gelir ve body olmaz.
            // Backend dokümantasyonuna göre ResponseDto<Void> için { message, success, data: null } bekleniyor.
            // Eğer backend gerçekten 204 ile boş body dönüyorsa, bunu manuel oluşturabiliriz veya
            // backend'in 204 yerine 200 OK ile ResponseDto<Void> dönmesini bekleyebiliriz.
            // Şimdilik, 204 ise ve backend'den bir mesaj gelmiyorsa, varsayılan bir başarı mesajı oluşturuyoruz.
            return {
                success: true,
                data: null,
                message: "İşlem başarıyla tamamlandı (içerik yok).",
                fullResponse: { success: true, message: "İşlem başarıyla tamamlandı (içerik yok).", data: null }
            };
        }

        const responseText = await response.text(); // Önce text olarak al
        let data;
        try {
            data = JSON.parse(responseText); // Sonra JSON'a parse etmeye çalış
        } catch (e) {
            // Eğer JSON parse edilemiyorsa (örn: backend HTML hata sayfası döndü veya beklenmedik bir format)
            console.error('API Error: Response is not valid JSON.', 'Status:', response.status, 'Endpoint:', endpoint, 'Response Text:', responseText);
            if (typeof showMessage === 'function') {
                showMessage('global-message-area', `Sunucudan beklenmedik bir cevap alındı (JSON değil). Durum: ${response.status}`, 'danger');
            }
            return { success: false, error: { message: `Sunucudan beklenmedik bir cevap alındı. Durum: ${response.status}. Detaylar konsolda.` }, status: response.status };
        }


        if (!response.ok) {
            // Backend'in standart error response yapısını burada işle (data.message bekliyoruz)
            const errorMessage = data.message || `Bilinmeyen bir API hatası oluştu. Durum: ${response.status}`;
            console.error('API Error:', errorMessage, 'Status:', response.status, 'Endpoint:', endpoint, 'Full Error Data:', data);
            if (typeof showMessage === 'function') {
                showMessage('global-message-area', errorMessage, 'danger');
            }
            return { success: false, error: data, status: response.status };
        }

        // Başarılı cevaplar için backend'in ResponseDto'sundaki "data" alanını doğrudan döndürüyoruz.
        // ResponseDto yapısı: { message: "...", success: true, data: { ... } }
        return { success: true, data: data.data, message: data.message, fullResponse: data };

    } catch (error) {
        // Genellikle ağ hatası veya fetch'in kendisinde bir sorun
        console.error('Network Error or fetch API Error:', error, 'Endpoint:', endpoint);
        let userMessage = 'Ağ hatası veya sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.';
        if (error.message.includes('Failed to fetch')) { // Tarayıcıya özgü ağ hatası mesajı
            userMessage = 'Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin veya ağ bağlantınızı kontrol edin.';
        }

        if (typeof showMessage === 'function') {
            showMessage('global-message-area', userMessage, 'danger');
        }
        return { success: false, error: { message: userMessage, details: error.toString() }, status: 0 }; // status 0 for network errors
    }
}