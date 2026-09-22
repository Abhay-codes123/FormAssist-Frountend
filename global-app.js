
var FA = {
    API_BASE: 'https://formassist-backend-pdaq.onrender.com', 
    VERSION: '1.0.0',
    DEMO_MODE: false,
};

// ================================================
// 2. TOAST — ek jagah, sab pages use karein
// =============================================
var _toastTimer = null;

function toast(msg, duration) {
    duration = duration || 2500;
    var el = document.getElementById('toastEl');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toastEl';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
        el.classList.remove('on');
    }, duration);
}

// Short alias
var t = toast;

// ================================================
// 3. MODAL — open/close
// ================================================
function openModal(id) {
    var overlay = document.getElementById(id + 'Overlay');
    var modal = document.getElementById(id + 'Modal');
    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    var overlay = document.getElementById(id + 'Overlay');
    var modal = document.getElementById(id + 'Modal');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
}

// Short alias
var openM = openModal;
var closeM = closeModal;

// ================================================
// 4. API CALL — ek jagah sab requests
// ================================================
async function apiCall(endpoint, method, body, requiresAuth) {
    method = method || 'GET';
    requiresAuth = requiresAuth !== false;

    var headers = { 'Content-Type': 'application/json' };

    if (requiresAuth) {
        var token = localStorage.getItem('fa_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    try {
        var options = { method: method, headers: headers };
        if (body) options.body = JSON.stringify(body);

        var res = await fetch(FA.API_BASE + endpoint, options);
        var data = await res.json();

        return { ok: res.ok, status: res.status, data: data };
    } catch (e) {
        FA.DEMO_MODE = true;
        console.log('API offline — Demo mode:', endpoint);
        return { ok: false, status: 0, data: { detail: 'Backend offline' }, offline: true };
    }
}

// ================================================
// 5. AUTH — token check, logout
// ================================================
function isLoggedIn() {
    return !!localStorage.getItem('fa_token');
}

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function logout(confirm_msg) {
    confirm_msg = confirm_msg || 'Are you sure you want to logout?';
    if (confirm(confirm_msg)) {
        localStorage.removeItem('fa_token');
        localStorage.removeItem('fa_username');
        localStorage.removeItem('fa_demo_mode');
        window.location.href = 'index.html';
    }
}

function getUsername() {
    return localStorage.getItem('fa_username') || 'User';
}

// ================================================
// 6. STORAGE — save/load data
// ================================================
function saveData(key, value) {
    try {
        localStorage.setItem('fa_' + key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Save failed:', e);
        return false;
    }
}

function loadData(key, defaultVal) {
    try {
        var saved = localStorage.getItem('fa_' + key);
        return saved ? JSON.parse(saved) : (defaultVal !== undefined ? defaultVal : null);
    } catch (e) {
        return defaultVal !== undefined ? defaultVal : null;
    }
}

function removeData(key) {
    localStorage.removeItem('fa_' + key);
}

// ================================================
// 7. PROFILE / VAULT
// ================================================
function getProfile() {
    return loadData('vault_self', {
        name: '', mobile: '', email: '',
        dob: '', address: '', pin: '',
        aadhar: '', pan: ''
    });
}

function saveProfile(data) {
    saveData('vault_self', data);
}

function getFamilyMembers() {
    return loadData('family', []);
}

function saveFamilyMembers(members) {
    saveData('family', members);
}

// ================================================
// 8. VALIDATION — ek jagah sab validations
// ================================================
function validateMobile(val) {
    val = String(val).trim();
    if (val.length !== 10) return { ok: false, msg: 'Mobile must be 10 digits!' };
    if (!['6','7','8','9'].includes(val[0])) return { ok: false, msg: 'Mobile must start with 6/7/8/9!' };
    if (!/^\d+$/.test(val)) return { ok: false, msg: 'Mobile must be numbers only!' };
    return { ok: true, msg: 'Valid mobile number!' };
}

function validateAadhar(val) {
    val = String(val).trim();
    if (val.length !== 12) return { ok: false, msg: 'Aadhar must be 12 digits!' };
    if (!['2','3','4','5','6','7','8','9'].includes(val[0])) return { ok: false, msg: 'Invalid Aadhar number!' };
    if (!/^\d+$/.test(val)) return { ok: false, msg: 'Aadhar must be numbers only!' };
    return { ok: true, msg: 'Valid Aadhar format!' };
}

function validatePAN(val) {
    val = String(val).toUpperCase().trim();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) return { ok: false, msg: 'PAN format: ABCDE1234F' };
    return { ok: true, msg: 'Valid PAN format!' };
}

function validateEmail(val) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return { ok: false, msg: 'Invalid email format!' };
    return { ok: true, msg: 'Valid email!' };
}

function validatePassword(val) {
    if (val.length < 6) return { ok: false, msg: 'Password must be at least 6 characters!', strength: 0 };
    var score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    var labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return { ok: true, msg: labels[score] || 'OK', strength: score };
}

// Apply validation UI to input field
function applyValidation(inputEl, result) {
    if (!inputEl) return;
    inputEl.classList.remove('ok', 'err');
    inputEl.classList.add(result.ok ? 'ok' : 'err');
}

// ================================================
// 9. AUTO-FILL FORM
// ================================================
function autoFillForm(fieldMap, profileKey) {
    profileKey = profileKey || 'vault_self';
    var profile = loadData(profileKey, {});
    if (!profile || Object.keys(profile).length === 0) {
        toast('⚠️ No saved profile! Please save your details first.');
        return false;
    }
    var filled = 0;
    Object.keys(fieldMap).forEach(function (inputId) {
        var profileField = fieldMap[inputId];
        var el = document.getElementById(inputId);
        var val = profile[profileField];
        if (el && val) {
            el.value = val;
            el.classList.add('ok');
            setTimeout(function () { el.classList.remove('ok'); }, 1500);
            filled++;
        }
    });
    if (filled > 0) toast('⚡ ' + filled + ' fields auto-filled!');
    else toast('⚠️ No matching data found in profile.');
    return filled > 0;
}

// ================================================
// 10. VOICE — Web Speech API
// ================================================
var FA_voice = {
    active: loadData('settings', {}).voice !== false,
    lang: localStorage.getItem('fa_lang') || 'en',
    recognition: null,
    isListening: false,
    langMap: { en: 'en-US', hi: 'hi-IN', mr: 'mr-IN' }
};

function speakText(text) {
    if (!FA_voice.active) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = FA_voice.langMap[FA_voice.lang] || 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function startVoiceInput(onResult, onError) {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast('⚠️ Voice not supported! Use Chrome browser.');
        if (onError) onError('not_supported');
        return;
    }

    // Stop if already listening
    if (FA_voice.recognition) {
        try { FA_voice.recognition.stop(); } catch(e) {}
    }

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    FA_voice.recognition = new SR();

    var lang = localStorage.getItem('fa_lang') || 'en';
    var langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
    FA_voice.recognition.lang = langMap[lang] || 'en-IN';
    FA_voice.recognition.continuous = false;
    FA_voice.recognition.interimResults = false;
    FA_voice.recognition.maxAlternatives = 1;
    FA_voice.isListening = true;

    FA_voice.recognition.onstart = function() {
        FA_voice.isListening = true;
        toast('🎤 Listening... speak now!');
    };

    FA_voice.recognition.onresult = function(e) {
        var transcript = e.results[0][0].transcript;
        FA_voice.isListening = false;
        if (onResult) onResult(transcript);
    };

    FA_voice.recognition.onerror = function(e) {
        FA_voice.isListening = false;
        var msg = '❌ Voice error!';
        if (e.error === 'not-allowed') msg = '❌ Microphone permission denied!';
        else if (e.error === 'no-speech') msg = '⚠️ No speech detected. Try again!';
        else if (e.error === 'network') msg = '⚠️ Network error. Check internet!';
        toast(msg);
        if (onError) onError(e.error);
    };

    FA_voice.recognition.onend = function() {
        FA_voice.isListening = false;
    };

    try {
        FA_voice.recognition.start();
    } catch(e) {
        toast('❌ Could not start voice. Try again!');
        if (onError) onError('start_failed');
    }
}

function stopVoiceInput() {
    if (FA_voice.recognition) FA_voice.recognition.stop();
    FA_voice.isListening = false;
}

// ================================================
// 11. LANGUAGE
// ================================================
var FA_LANG = {
    en: {
        login: 'Login', signup: 'Sign Up', home: 'Home',
        save: 'Save', cancel: 'Cancel', logout: 'Logout',
        delete: 'Delete', edit: 'Edit', back: 'Back',
        submit: 'Submit', loading: 'Loading...',
        fill_form: 'Fill Form', cv_builder: 'CV Builder',
        letter_writer: 'Letter Writer', doc_analysis: 'Document Analysis',
        welfare: 'Welfare Schemes', auto_fill: 'Smart Auto-Fill',
        form_auditor: 'Form Auditor', ai_assistant: 'AI Assistant',
        settings: 'Settings', profile: 'Profile',
    },
    hi: {
        login: 'लॉगिन', signup: 'साइन अप', home: 'होम',
        save: 'सहेजें', cancel: 'रद्द करें', logout: 'लॉगआउट',
        delete: 'हटाएं', edit: 'संपादित करें', back: 'वापस',
        submit: 'जमा करें', loading: 'लोड हो रहा है...',
        fill_form: 'फॉर्म भरें', cv_builder: 'सीवी बनाएं',
        letter_writer: 'पत्र लिखें', doc_analysis: 'दस्तावेज़ विश्लेषण',
        welfare: 'सरकारी योजनाएं', auto_fill: 'ऑटो भरें',
        form_auditor: 'फॉर्म ऑडिटर', ai_assistant: 'एआई सहायक',
        settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल',
    },
    mr: {
        login: 'लॉगिन', signup: 'साइन अप', home: 'मुख्यपृष्ठ',
        save: 'जतन करा', cancel: 'रद्द करा', logout: 'लॉगआउट',
        delete: 'हटवा', edit: 'संपादित करा', back: 'मागे',
        submit: 'सबमिट करा', loading: 'लोड होत आहे...',
        fill_form: 'फॉर्म भरा', cv_builder: 'सीव्ही तयार करा',
        letter_writer: 'पत्र लिहा', doc_analysis: 'दस्तऐवज विश्लेषण',
        welfare: 'सरकारी योजना', auto_fill: 'ऑटो भरा',
        form_auditor: 'फॉर्म ऑडिटर', ai_assistant: 'एआय सहाय्यक',
        settings: 'सेटिंग्ज', profile: 'प्रोफाइल',
    }
};

function getLang() {
    return localStorage.getItem('fa_lang') || 'en';
}

function getText(key) {
    var lang = getLang();
    return (FA_LANG[lang] && FA_LANG[lang][key]) || FA_LANG['en'][key] || key;
}

function setLanguage(lang) {
    localStorage.setItem('fa_lang', lang);
    FA_voice.lang = lang;
    // Apply to all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        el.textContent = getText(key);
    });
    toast('🌐 Language: ' + {en:'English', hi:'हिंदी', mr:'मराठी'}[lang]);
}

// ================================================
// 12. AUTO LOGOUT
// ================================================
var _autoLogoutTimer = null;

function startAutoLogout() {
    clearTimeout(_autoLogoutTimer);
    var settings = loadData('settings', {});
    var mins = settings.autoLogout || 30;
    _autoLogoutTimer = setTimeout(function () {
        if (isLoggedIn()) {
            localStorage.removeItem('fa_token');
            toast('⏱️ Auto logged out due to inactivity!');
            setTimeout(function () { window.location.href = 'index.html'; }, 1500);
        }
    }, mins * 60 * 1000);
}

function resetAutoLogout() {
    startAutoLogout();
}

// Reset on user activity
['click', 'keypress', 'touchstart', 'mousemove'].forEach(function (ev) {
    document.addEventListener(ev, resetAutoLogout, { passive: true });
});

// ================================================
// 13. ERROR BOX HELPER
// ================================================
function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
}

function hideError(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

// ================================================
// 14. LOADER ON BUTTON
// ================================================
function setButtonLoading(btnId, loading, originalText) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
        btn.setAttribute('data-original', btn.textContent);
        btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;display:inline-block;vertical-align:middle;"></div>';
    } else {
        btn.textContent = originalText || btn.getAttribute('data-original') || 'Submit';
    }
}

// ================================================
// 15. NAVIGATE
// ================================================
function goTo(url) {
    window.location.href = url;
}

function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'home.html';
}

// ================================================
// 16. INIT — on every page load
// ================================================
document.addEventListener('DOMContentLoaded', function () {
    // Apply language
    var lang = getLang();
    if (lang !== 'en') setLanguage(lang);

    // Start auto logout on protected pages
    if (isLoggedIn()) startAutoLogout();

    // Show demo mode banner if active
    if (FA.DEMO_MODE) {
        toast('⚠️ Demo Mode — Backend offline');
    }

    // Wire language select if present
    var langSel = document.getElementById('langSelect');
    if (langSel) {
        langSel.value = getLang();
        langSel.addEventListener('change', function () {
            setLanguage(this.value);
        });
    }

    console.log('FormAssist v' + FA.VERSION + ' initialized!');
});
