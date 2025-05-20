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
                ${escapeHTML(message)} {/* Mesajı da escape edelim */}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    } else {
        console.warn(`Message container with ID '${elementId}' not found. Message: ${message}`);
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
        spinner.style.display = 'block';
    } else {
        console.warn(`Spinner with ID '${spinnerId}' not found.`);
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
    } else {
        console.warn(`Spinner with ID '${spinnerId}' not found to hide.`);
    }
}

function escapeHTML(str) {
    if (str === null || typeof str === 'undefined') return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// İleride eklenebilecek diğer UI yardımcı fonksiyonları:
// - Formu temizleme
// - Modal gösterme/gizleme vb.