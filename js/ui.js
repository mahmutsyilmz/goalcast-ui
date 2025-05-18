// js/ui.js

/**
 * Belirtilen ID'ye sahip bir HTML elementine mesaj gösterir.
 * Bootstrap alert sınıflarını kullanır.
 * @param {string} elementId - Mesajın gösterileceği elementin ID'si.
 * @param {string} message - Gösterilecek mesaj.
 * @param {string} type - Mesajın türü ('success', 'danger', 'warning', 'info'). Varsayılan 'info'.
 */
function showMessage(elementId, message, type = 'info') {
    const messageContainer = document.getElementById(elementId);
    if (messageContainer) {
        const alertClass = `alert-${type}`;
        messageContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    } else {
        console.warn(`Message container with ID '${elementId}' not found.`);
    }
}

/**
 * Belirtilen ID'ye sahip mesaj alanını temizler.
 * @param {string} elementId - Temizlenecek mesaj elementinin ID'si.
 */
function clearMessage(elementId) {
    const messageContainer = document.getElementById(elementId);
    if (messageContainer) {
        messageContainer.innerHTML = '';
    }
}

/**
 * Bir yükleme göstergesini gösterir.
 * @param {string} spinnerId - Yükleme göstergesinin (spinner) ID'si.
 */
function showSpinner(spinnerId) {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
        spinner.style.display = 'block'; // Veya 'inline-block' vs.
    }
}

/**
 * Bir yükleme göstergesini gizler.
 * @param {string} spinnerId - Yükleme göstergesinin (spinner) ID'si.
 */
function hideSpinner(spinnerId) {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// İleride eklenebilecek diğer UI yardımcı fonksiyonları:
// - Formu temizleme
// - Modal gösterme/gizleme vb.