// Ensure jQuery is loaded (if needed)
if (typeof jQuery === 'undefined') {
    console.warn('jQuery not found, loading from CDN');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js';
    script.onload = () => console.log('jQuery loaded successfully');
    document.head.appendChild(script);
}

// Ensure toastr is available
if (typeof toastr === 'undefined') {
    console.warn('toastr not found, but will use custom notifications');
}
// FM-200 Calculator - Complete Application Logic
// Version 4.0 - Professional Edition with Print Functionality
// UPDATED: Added robust error handling and fallbacks

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '5.0',
    appName: 'FM-200 Calculator',
    developer: 'Fire Safety Tools',
    contactEmail: 'contact@amjathkhan.com',
    contactPhone: '+91-9750816163',
    
    // Calculation Constants (NFPA 2001)
    MIN_CONCENTRATION: 7.0,
    SPECIFIC_VAPOR_BASE: 0.1269,
    SPECIFIC_VAPOR_TEMP_FACTOR: 0.0005,
    
    // Units
    units: {
        volume: 'm³',
        weight: 'kg',
        temperature: '°C',
        length: 'm',
        area: 'm²'
    },
    
    // Storage Keys
    storageKeys: {
        BUDGET_DATA: 'fm200_budget_data',
        USER_PREFERENCES: 'fm200_user_prefs',
        QUOTATION_DATA: 'fm200_quotation_data'
    }
};

// ============================================================================
// DATA LOADING & CONSTANTS
// ============================================================================

let EXTERNAL_DATA = {};

// DEFAULT DATA - Used if data.json is missing
const DEFAULT_DATA = {
    exchangeRates: {
        "USD": 1.00,
        "EUR": 0.92,
        "INR": 83.50,
        "AED": 3.67,
        "GBP": 0.79,
        "CAD": 1.36,
        "AUD": 1.52
    },
    costMultipliers: {
        "agentCostPerKg": 48.50,
        "cylinderCost": 1250.00,
        "nozzleCost": 175.00,
        "pipingCostPerMeter": 45.00,
        "fittingsCost": 320.00,
        "valveAssembly": 450.00,
        "mountingHardware": 85.00,
        "detectionPanel": 2200.00,
        "smokeDetector": 95.00,
        "heatDetector": 85.00,
        "manualCallPoint": 65.00,
        "hooterStrobe": 75.00,
        "warningSigns": 45.00,
        "installationLaborPerHour": 85.00,
        "engineeringDesign": 2500.00,
        "commissioningTesting": 1800.00,
        "documentation": 450.00,
        "installationFactor": 1.28,
        "engineeringFactor": 1.15,
        "contingencyFactor": 1.10
    }
};

let COST_MULTIPLIERS = DEFAULT_DATA.costMultipliers;
let EXCHANGE_RATES = DEFAULT_DATA.exchangeRates;

/**
 * Loads configuration data from the external data.json file with fallback to defaults.
 */
function loadExternalData() {
    console.log('Loading external configuration from data.json...');
    
    // Use fetch instead of XMLHttpRequest for better error handling
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load data.json');
            }
            return response.json();
        })
        .then(data => {
            EXTERNAL_DATA = data;
            COST_MULTIPLIERS = EXTERNAL_DATA.costMultipliers || DEFAULT_DATA.costMultipliers;
            EXCHANGE_RATES = EXTERNAL_DATA.exchangeRates || DEFAULT_DATA.exchangeRates;
            console.log('External data loaded successfully.');
        })
        .catch(error => {
            console.warn('Error loading data.json:', error.message, 'Using default values.');
            COST_MULTIPLIERS = DEFAULT_DATA.costMultipliers;
            EXCHANGE_RATES = DEFAULT_DATA.exchangeRates;
        });
}

// ============================================================================
// CORE CALCULATION FUNCTIONS (NFPA 2001 COMPLIANT)
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.costChart = null;
        this.userPrefs = this.loadPreferences();
        
        // Load external data first
        loadExternalData();
        
        this.initializeApp();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    initializeApp() {
        console.log('Initializing FM-200 Calculator v' + APP_CONFIG.version);
        
        // Hide loading screen with safe check
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen && loadingScreen.style) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 1000);

        // Error handling
        window.onerror = (msg, url, line, col, error) => {
            console.error(`Application Error: ${msg} at ${url}:${line}:${col}`);
            this.showNotification(`Application Error: ${msg}`, 'error');
            return false;
        };

        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === '/' || path.includes('/index.html')) {
            this.initCalculatorPage();
        } else if (path.includes('results.html')) {
            this.initResultsPage();
        } else if (path.includes('quotation.html')) {
            this.initQuotationPage();
        }

        this.initThemeToggle();
        this.initExpertMode();
        this.initGoogleTranslate();
        this.initAffiliateLinks();
        this.initBuyMeCoffee();
        
        console.log('Application initialized successfully');
    }

    // ============================================================================
    // CALCULATOR PAGE FUNCTIONS
    // ============================================================================

    initCalculatorPage() {
        console.log('Initializing Calculator Page');
        
        const form = document.getElementById('fm200Form');
        const resetBtn = document.getElementById('resetBtn');
        const saveBtn = document.getElementById('saveBtn');
        const expertToggle = document.getElementById('expertModeToggle');

        // Set default values
        this.setDefaultValues();

        // Form submission handler
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Reset button handler
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all inputs to default values?')) {
                    this.resetForm();
                }
            });
        }

        // Save button handler
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.openSaveModal();
            });
        }

        // Expert mode toggle
        if (expertToggle) {
            expertToggle.addEventListener('change', () => this.toggleExpertMode());
            const expertPanel = document.getElementById('expertModePanel');
            if (expertPanel) {
                expertPanel.style.display = this.userPrefs.expertMode ? 'block' : 'none';
            }
        }

        // Real-time preview updates
        ['room-length', 'room-width', 'room-height', 'room-temperature', 'hazard-class'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuickPreview());
            }
        });

        // Initialize quick preview
        this.updateQuickPreview();
        
        // Initialize accordion
        this.initAccordion();

        console.log('Calculator Page Initialized Successfully');
    }

    // ... [REST OF THE METHODS - Keep all existing methods as they are in your file]
    // Just make sure to fix the typo on line 123 and ensure all methods are properly defined

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    round(value, decimals) {
        if (isNaN(value) || value === null || value === undefined) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    // ... [Keep all other utility methods as they are]

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#34bf49';
                break;
            case 'error':
                notification.style.backgroundColor = '#ff4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#0099e5';
        }
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

// Add CSS for notifications
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .dark-mode {
        background: #1a1a1a !important;
        color: #ffffff !important;
    }
    .dark-mode .panel {
        background: #2d2d2d !important;
        color: #ffffff !important;
    }
    .dark-mode input,
    .dark-mode select,
    .dark-mode textarea {
        background: #3d3d3d !important;
        color: #ffffff !important;
        border-color: #555 !important;
    }
`;
document.head.appendChild(notificationStyle);

// Global Google Translate initialization (only once)
function googleTranslateElementInit() {
    if (window.google && window.google.translate) {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,es,fr,de,ar,hi,zh-CN',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    }
}

// Visitor counter - global function
function updateVisitorCounter() {
    const counterElement = document.getElementById('visitorCount');
    if (!counterElement) return;
    
    try {
        let visitorCount = localStorage.getItem('fm200VisitorCount');
        
        if (!visitorCount) {
            visitorCount = Math.floor(Math.random() * 500) + 1500;
        } else {
            visitorCount = parseInt(visitorCount);
        }
        
        visitorCount += 1;
        localStorage.setItem('fm200VisitorCount', visitorCount.toString());
        counterElement.textContent = visitorCount.toLocaleString();
    } catch (e) {
        console.warn('Could not update visitor counter:', e);
        counterElement.textContent = '1,500+';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FM-200 Calculator v5.0 - Initializing...');
    
    // Update visitor counter
    updateVisitorCounter();
    
    try {
        // Initialize calculator
        window.fm200Calculator = new FM200Calculator();
        console.log('FM-200 Calculator v5.0 - Ready!');
    } catch (error) {
        console.error('Failed to initialize FM-200 Calculator:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
        `;
        errorDiv.innerHTML = `
            <h3>Application Error</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: white; color: #ff4444; border: none; border-radius: 5px; cursor: pointer;">
                Reload Application
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Handle unhandled errors
window.addEventListener('error', function(e) {
    console.error('Unhandled error:', e.message, 'at', e.filename, ':', e.lineno);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
});
