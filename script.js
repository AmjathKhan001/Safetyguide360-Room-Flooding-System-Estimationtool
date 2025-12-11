// FM-200 Calculator - Complete Application Logic
// Version 4.0 - Professional Edition + Traffic & Design Enhancements

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '4.0',
    appName: 'FM-200 Calculator',
    developer: 'Fire Safety Tools',
    contactEmail: 'support@firesafetytools.com',
    
    // Calculation Constants (NFPA 2001)
    MIN_CONCENTRATION: 7.0, // 7% for Class A fires
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

// Cost Multipliers (Base USD Prices - More detailed than data.json for BOQ logic)
const COST_MULTIPLIERS = {
    // Agent Cost
    agentCostPerKg: 48.50,
    
    // Equipment Costs
    cylinderCost: 1250.00,
    nozzleCost: 175.00,
    pipingCostPerMeter: 45.00,
    fittingsCost: 320.00,
    valveAssembly: 450.00,
    mountingHardware: 85.00,
    
    // Detection & Control
    detectionPanel: 2200.00,
    smokeDetector: 95.00,
    heatDetector: 85.00,
    manualCallPoint: 65.00,
    hooterStrobe: 75.00,
    // Note: The value from data.json (85) is used for a single warning sign, 
    // but the logic here uses a smaller per-unit cost. We stick to this detailed breakdown.
    warningSigns: 45.00, 
    
    // Installation & Engineering
    installationLaborPerHour: 85.00,
    engineeringDesign: 2500.00,
    commissioningTesting: 1800.00,
    documentation: 450.00,
    
    // Factors
    installationFactor: 1.28,   // 28% for installation
    engineeringFactor: 1.15,    // 15% for engineering
    contingencyFactor: 1.10     // 10% contingency
};

// Exchange Rates (Updated regularly - Extended list for flexibility)
const EXCHANGE_RATES = {
    USD: 1.00,
    EUR: 0.92,
    INR: 83.50,
    AED: 3.67,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.52
};

// OEM Suppliers Database
const OEM_SUPPLIERS = [
    {
        name: "Kidde-Fenwal",
        website: "https://www.kiddefenwal.com",
        description: "Leading manufacturer of fire suppression systems",
        products: ["FM-200", "Detection Systems", "Control Panels"],
        regions: ["Global"],
        contact: "sales@kiddefenwal.com"
    },
    {
        name: "Fike Corporation",
        website: "https://www.fike.com",
        description: "Specialists in clean agent fire protection",
        products: ["FM-200", "Novec 1230", "Detection Systems"],
        regions: ["Global"],
        contact: "info@fike.com"
    },
    {
        name: "Ansul (Tyco)",
        website: "https://www.ansul.com",
        description: "Tyco Fire Protection Products",
        products: ["FM-200", "Sapphire", "Inergen"],
        regions: ["Global"],
        contact: "ansul.support@tyco.com"
    },
    {
        name: "Rotarex Firetec",
        website: "https://www.rotarexfiretec.com",
        description: "Cylinder and valve specialists",
        products: ["Cylinders", "Valves", "Manifolds"],
        regions: ["Europe", "Middle East", "Asia"],
        contact: "firetec@rotarex.com"
    },
    {
        name: "3M",
        website: "https://www.3m.com",
        description: "Novec 1230 Clean Agent",
        products: ["Novec 1230"],
        regions: ["Global"],
        contact: "support@3m.com"
    },
    {
        name: "Chemours",
        website: "https://www.chemours.com",
        description: "Original manufacturer of FM-200 (HFC-227ea)",
        products: ["FM-200 (HFC-227ea)"],
        regions: ["Global"],
        contact: "info@chemours.com"
    }
];

// Technical Specifications (Cylinder sizes, nozzle types, safety factors)
const TECHNICAL_SPECS = {
    cylinderSizes: [
        { weight: 54.4, name: "120lb Standard" },
        { weight: 27.2, name: "60lb Compact" },
        { weight: 108.8, name: "240lb Large" },
        // Added common cylinder size for more options
        { weight: 45.4, name: "100lb Intermediate" } 
    ],
    nozzleTypes: [
        { type: "Standard", coverage: 50 },
        { type: "High-Flow", coverage: 75 },
        { type: "Low-Pressure", coverage: 35 }
    ],
    safetyFactors: {
        altitude: 1.1,
        highTemp: 1.05,
        criticalArea: 1.2
    },
    nfpaRequirements: {
        minConcentration: 7.0,
        minAgentMargin: 0.07 // 7% Agent Margin over calculated required mass
    }
};

// ============================================================================
// MAIN APPLICATION CLASS
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = this.loadData(APP_CONFIG.storageKeys.BUDGET_DATA);
        this.preferences = this.loadPreferences();
        this.initTheme();
        this.initEventListeners();
        this.loadPageData();
        this.initAccordion();
        this.initBuyMeCoffee();
        
        // This is primarily for the Quotation page to use the results
        if (this.currentData && window.location.pathname.includes('quotation.html')) {
            this.loadCalculationData();
            this.initQuotationForm();
            this.populateQuotationPreview();
            this.initQuotationEventListeners();
        }
    }

    // ========================================================================
    // INITIALIZATION & SETUP
    // ========================================================================
    
    initEventListeners() {
        // Shared listeners
        const form = document.getElementById('fm200Form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
            ['room-length', 'room-width', 'room-height', 'room-temperature', 'altitude', 'hazard-class'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.addEventListener('input', () => this.handleInput());
            });
            document.getElementById('expertModeToggle').addEventListener('change', (e) => this.toggleExpertMode(e.target.checked));
            document.getElementById('resetBtn').addEventListener('click', () => this.resetForm());
            document.getElementById('saveBtn').addEventListener('click', () => this.initSaveModal());
            document.getElementById('confirmSaveBtn').addEventListener('click', () => this.saveCalculationData());
        }

        // Results page listeners
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', () => this.populateResultsPage(this.currentData.formData, this.currentData.calculationResults, this.currentData.costResults));
            document.getElementById('printResults').addEventListener('click', () => window.print());
            document.getElementById('exportBOQ').addEventListener('click', () => this.exportBOQToCSV());
        }

        // Global listeners
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    }

    // ... (All other core functions like loadPageData, getFormData, calculateFM200, 
    // populatePreview, populateResultsPage, saveCalculationData, loadCalculationData, 
    // toggleExpertMode, resetForm, formatCurrency, etc. remain the same) ...

    // ************************************************************************
    // NEW: AFFILIATE & TOOL LINKS INITIALIZATION (USER REQUEST)
    // ************************************************************************
    initBuyMeCoffee() {
        // This function ensures all affiliate links open in a new tab 
        // with proper security attributes, though the HTML already contains them.
        const affiliateLinks = document.querySelectorAll('.affiliate-button');
        affiliateLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        const toolLinks = document.querySelectorAll('.other-tools-list a');
        toolLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Custom logic for Buy Me a Coffee button (if needed, but direct link is cleaner)
        // const coffeeLink = document.querySelector('.coffee-button');
        // if (coffeeLink) {
        //     coffeeLink.addEventListener('click', (e) => {
        //         // Example of custom tracking or notification
        //         // this.showNotification('Thank you for your support!', 'success');
        //     });
        // }
    }
    
    // ========================================================================
    // THEME & PREFERENCES
    // ========================================================================

    loadPreferences() {
        const defaultPrefs = { theme: 'light' };
        try {
            const prefs = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.USER_PREFERENCES));
            return prefs ? { ...defaultPrefs, ...prefs } : defaultPrefs;
        } catch (e) {
            console.error("Error loading preferences:", e);
            return defaultPrefs;
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.USER_PREFERENCES, JSON.stringify(this.preferences));
        } catch (e) {
            console.error("Error saving preferences:", e);
        }
    }

    initTheme() {
        const body = document.body;
        if (this.preferences.theme === 'dark') {
            body.classList.add('dark-mode');
            const toggleIcon = document.getElementById('themeToggle').querySelector('i');
            if(toggleIcon) toggleIcon.classList.replace('fa-moon', 'fa-sun');
        }
    }

    toggleTheme() {
        const body = document.body;
        const toggleIcon = document.getElementById('themeToggle').querySelector('i');
        
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            this.preferences.theme = 'light';
            if(toggleIcon) toggleIcon.classList.replace('fa-sun', 'fa-moon');
        } else {
            body.classList.add('dark-mode');
            this.preferences.theme = 'dark';
            if(toggleIcon) toggleIcon.classList.replace('fa-moon', 'fa-sun');
        }
        this.savePreferences();
    }
    
    // ... (Rest of the original functions will follow, modified or untouched) ...
    
    // ===========================================================================
    // APPLICATION INITIALIZATION
    // ===========================================================================
    
    // Initialize application when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log(`FM-200 Calculator v${APP_CONFIG.version} - Initializing...`);
        
        // Create global calculator instance
        window.fm200Calculator = new FM200Calculator();
        
        console.log(`FM-200 Calculator v${APP_CONFIG.version} - Ready!`);
    });

    // Add global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        
        if (window.fm200Calculator) {
            window.fm200Calculator.showNotification(
                `Application Error: ${event.reason.message || 'Unknown error'}`,\
                'error'
            );
        }
    });

} // End of Class
// The rest of the class functions (loadData, getFormData, calculateFM200, etc.) are assumed to be present here.
