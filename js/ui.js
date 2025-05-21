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
                ${escapeHTML(message)}
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

const countryDisplayNames = {
    "TURKEY": "Türkiye",
    "FRANCE": "Fransa",
    "ENGLAND": "İngiltere",
    "SPAIN": "İspanya",
    "ITALY": "İtalya",
    "GERMANY": "Almanya",
    "OTHER": "Diğer Ülke"
};

const leagueTypeDisplayNames = {
    "NATIONAL_LEAGUE": "Ulusal Lig",
    "DOMESTIC_CUP": "Ulusal Kupa",
    "INTERNATIONAL_CLUB": "Uluslararası Kulüp Turnuvası",
    "INTERNATIONAL_NATIONAL": "Uluslararası Milli Takım Turnuvası",
    "FRIENDLY": "Hazırlık Maçı",
    "OTHER": "Diğer"
};

/**
 * Verilen country enum string'i için kullanıcı dostu adı döndürür.
 * @param {string} countryEnumString - Ülke enum değeri (örn: "TURKEY").
 * @returns {string} Kullanıcı dostu ülke adı veya orijinal string.
 */
function getCountryDisplayName(countryEnumString) {
    return countryDisplayNames[countryEnumString] || countryEnumString;
}

/**
 * Verilen leagueType enum string'i için kullanıcı dostu adı döndürür.
 * @param {string} leagueTypeEnumString - Lig türü enum değeri (örn: "NATIONAL_LEAGUE").
 * @returns {string} Kullanıcı dostu lig türü adı veya orijinal string.
 */
function getLeagueTypeDisplayName(leagueTypeEnumString) {
    return leagueTypeDisplayNames[leagueTypeEnumString] || leagueTypeEnumString;
}

/**
 * Bir lig objesinden kullanıcı dostu bir başlık stringi oluşturur.
 * @param {object} league - { name, leagueType, country } içeren lig objesi.
 * @returns {string} Oluşturulan başlık.
 */
function getLeagueCardSubtitle(league) {
    if (!league) return "";
    let subtitle = escapeHTML(getLeagueTypeDisplayName(league.leagueType));
    if (league.country && (league.leagueType === 'NATIONAL_LEAGUE' || league.leagueType === 'DOMESTIC_CUP')) {
        const countryName = getCountryDisplayName(league.country);
        subtitle += ` (${escapeHTML(countryName)})`;
    }
    return subtitle;
}