// FM-200 Calculator - Complete Application Logic
// Version 3.0 - Professional Edition

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '3.0',
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

// ============================================================================
// DATA LOADING & CONSTANTS (Externalized from data.json)
// NOTE: These objects will be populated by loadExternalData()
// ============================================================================

let EXTERNAL_DATA = {};
let COST_MULTIPLIERS = {};
let EXCHANGE_RATES = {};

/**
 * Loads configuration data from the external data.json file.
 * Uses synchronous XHR for simple file-based applications.
 */
function loadExternalData() {
    console.log('Loading external configuration from data.json...');
    
    // In a production environment, this should be an asynchronous fetch operation.
    // Synchronous XHR is used here for simplicity in a static file environment.
    const xhr = new XMLHttpRequest();
    try {
        xhr.open('GET', 'data.json', false); // false makes it synchronous
        xhr.send(null);
    
        if (xhr.status === 200) {
            EXTERNAL_DATA = JSON.parse(xhr.responseText);
            COST_MULTIPLIERS = EXTERNAL_DATA.costMultipliers || {};
            EXCHANGE_RATES = EXTERNAL_DATA.exchangeRates || {};
            console.log('External data loaded successfully.');
        } else {
            console.error('Failed to load data.json. Status:', xhr.status);
            alert('CRITICAL ERROR: Failed to load configuration data. Calculations may be inaccurate. Check data.json file path and content.');
            // Fallback to minimal structure to prevent immediate runtime errors
            COST_MULTIPLIERS = { agentCostPerKg: 48.50, cylinderCost: 1250.00, valveAssembly: 450.00, installationFactor: 1.28, engineeringFactor: 1.15, contingencyFactor: 1.10 };
            EXCHANGE_RATES = { USD: 1.00 };
        }
    } catch (e) {
        console.error('Network or parsing error during data load:', e);
        alert('CRITICAL ERROR: Could not load data.json due to a network or parsing error.');
    }
}

// Execute data load immediately before class instantiation
loadExternalData();

// Access constants via the global objects: COST_MULTIPLIERS and EXCHANGE_RATES
// e.g., COST_MULTIPLIERS.agentCostPerKg

// OEM Suppliers Database (kept hardcoded as this is not configuration data)
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
        description: "Novec 1230 Fire Protection Fluid",
        products: ["Novec 1230", "Detection Systems"],
        regions: ["Global"],
        contact: "3mfiresuppression@3m.com"
    },
    {
        name: "Chemours",
        website: "https://www.chemours.com",
        description: "FM-200 Manufacturer",
        products: ["FM-200 Agent"],
        regions: ["Global"],
        contact: "fm200@chemours.com"
    }
];

// ============================================================================
// CORE CALCULATION FUNCTIONS (NFPA 2001 COMPLIANT)
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.costChart = null;
        this.userPrefs = this.loadPreferences();
        this.initializeApp();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    initializeApp() {
        // Set up global error handling
        window.onerror = (msg, url, line, col, error) => {
            console.error(`Application Error: ${msg} at ${url}:${line}:${col}`);
            this.showNotification(`Application Error: ${msg}`, 'error');
            return false;
        };

        // Initialize based on current page
        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === '/') {
            this.initCalculatorPage();
        } else if (path.includes('results.html')) {
            this.initResultsPage();
        } else if (path.includes('quotation.html')) {
            this.initQuotationPage();
        }

        // Initialize common features
        this.initThemeToggle();
        this.initExpertMode();
        this.initGoogleTranslate();
        this.initAffiliateLinks();
        this.initBuyMeCoffee();
    }

    // ============================================================================
    // CALCULATOR PAGE FUNCTIONS
    // ============================================================================

    initCalculatorPage() {
        console.log('Initializing Calculator Page');
        
        const form = document.getElementById('budgetForm');
        const calculateBtn = document.getElementById('calculateBtn');
        const resetBtn = document.getElementById('resetBtn');
        const expertToggle = document.getElementById('expertMode');

        // Set default dates and values
        this.setDefaultValues();

        // Form submission handler
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Calculate button handler
        if (calculateBtn) {
            calculateBtn.addEventListener('click', (e) => {
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

        // Expert mode toggle
        if (expertToggle) {
            expertToggle.addEventListener('click', () => this.toggleExpertMode());
            if (this.userPrefs.expertMode) {
                document.body.classList.add('expert-mode');
                expertToggle.innerHTML = '<i class="fas fa-user-cog"></i> Expert Mode (ON)';
                expertToggle.classList.add('active');
            }
        }

        // Real-time preview updates
        ['roomLength', 'roomWidth', 'roomHeight', 'equipmentVolume', 'minTemperature'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuickPreview());
            }
        });

        // Load OEM suppliers
        this.loadOemSuppliers();

        // Initialize quick preview
        this.updateQuickPreview();

        console.log('Calculator Page Initialized Successfully');
    }

    setDefaultValues() {
        // Set today's date for new projects
        const today = new Date();
        const projectName = document.getElementById('projectName');
        if (projectName && !projectName.value) {
            projectName.value = `FM-200 Project ${today.toLocaleDateString()}`;
        }

        // Set default currency based on location (detect from browser)
        const currencySelect = document.getElementById('currency');
        if (currencySelect) {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone.includes('Asia/Dubai') || timezone.includes('Asia/Qatar')) {
                currencySelect.value = 'AED';
            } else if (timezone.includes('Europe')) {
                currencySelect.value = 'EUR';
            } else if (timezone.includes('Asia/Kolkata')) {
                currencySelect.value = 'INR';
            }
        }
    }

    resetForm() {
        const form = document.getElementById('budgetForm');
        if (form) {
            form.reset();
            this.setDefaultValues();
            this.updateQuickPreview();
            this.showNotification('Form reset to default values', 'success');
        }
    }

    // ============================================================================
    // CORE NFPA 2001 CALCULATION
    // ============================================================================

    handleFormSubmission() {
        try {
            // 1. Collect and validate form data
            const formData = this.collectFormData();
            
            // 2. Perform NFPA 2001 calculation
            const calculationResults = this.performNFPA2001Calculation(formData);
            
            // 3. Calculate costs
            const costResults = this.calculateSystemCosts(calculationResults, formData.currency);
            
            // 4. Prepare complete data object
            const completeData = {
                formData: formData,
                calculationResults: calculationResults,
                costResults: costResults,
                metadata: {
                    timestamp: new Date().toISOString(),
                    projectId: this.generateProjectId(),
                    version: APP_CONFIG.version,
                    calculatedBy: APP_CONFIG.appName
                }
            };

            // 5. Store in sessionStorage for cross-page access
            sessionStorage.setItem(APP_CONFIG.storageKeys.BUDGET_DATA, JSON.stringify(completeData));
            
            // 6. Update user preferences
            this.userPrefs.lastCurrency = formData.currency;
            this.savePreferences();

            // 7. Show success and redirect
            this.showNotification('Calculation successful! Redirecting to results...', 'success');
            
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 1500);

        } catch (error) {
            console.error('Calculation Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    collectFormData() {
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value : null;
        };

        const getNumber = (id, defaultValue = 0) => {
            const value = getValue(id);
            return value ? parseFloat(value) : defaultValue;
        };

        const formData = {
            // Project Details
            projectName: getValue('projectName') || 'FM-200 Project',
            clientLocation: getValue('clientLocation') || 'Not Specified',
            currency: getValue('currency') || 'USD',
            
            // Room Dimensions
            roomLength: getNumber('roomLength', 10),
            roomWidth: getNumber('roomWidth', 8),
            roomHeight: getNumber('roomHeight', 4),
            
            // Advanced Parameters
            equipmentVolume: getNumber('equipmentVolume', 0),
            minTemperature: getNumber('minTemperature', 20),
            altitude: getNumber('altitude', 0),
            safetyFactor: getNumber('safetyFactor', 107) / 100, // Convert percentage to factor
            cylinderSize: getNumber('cylinderSize', 54.4)
        };

        // Validation
        const errors = [];
        
        if (formData.roomLength <= 0 || formData.roomWidth <= 0 || formData.roomHeight <= 0) {
            errors.push('Room dimensions must be greater than zero');
        }
        
        if (formData.minTemperature < -20 || formData.minTemperature > 60) {
            errors.push('Temperature must be between -20°C and 60°C');
        }
        
        if (formData.altitude < 0) {
            errors.push('Altitude cannot be negative');
        }
        
        if (formData.safetyFactor < 1.0 || formData.safetyFactor > 1.5) {
            errors.push('Safety factor must be between 100% and 150%');
        }

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        return formData;
    }

    performNFPA2001Calculation(formData) {
        const { roomLength, roomWidth, roomHeight, equipmentVolume, minTemperature, altitude, safetyFactor, cylinderSize } = formData;

        // 1. Calculate volumes
        const grossVolume = roomLength * roomWidth * roomHeight;
        const netVolume = Math.max(0.1, grossVolume - equipmentVolume); // Ensure positive volume
        
        // 2. Calculate Specific Vapor Volume (S) per NFPA 2001
        // S = 0.1269 + 0.0005 * T (where T is minimum temperature in °C)
        const specificVaporVolume = APP_CONFIG.SPECIFIC_VAPOR_BASE + 
                                   (APP_CONFIG.SPECIFIC_VAPOR_TEMP_FACTOR * minTemperature);

        // 3. Calculate Agent Weight using NFPA 2001 formula
        // W = (V / S) × (C / (100 - C))
        const C = APP_CONFIG.MIN_CONCENTRATION; // 7% for Class A fires
        let agentWeight = (netVolume / specificVaporVolume) * (C / (100 - C));

        // 4. Apply altitude correction (if altitude > 500m)
        if (altitude > 500) {
            // Altitude correction factor: 1% increase per 300m above 500m
            const altitudeFactor = 1 + ((altitude - 500) / 300) * 0.01;
            agentWeight *= altitudeFactor;
        }

        // 5. Apply safety factor
        agentWeight *= safetyFactor;

        // 6. Calculate cylinder count
        const cylinderCount = Math.ceil(agentWeight / cylinderSize);

        // 7. Calculate number of nozzles (based on coverage area)
        const floorArea = roomLength * roomWidth;
        const nozzleCoverage = 50; // Standard nozzle covers ~50 m²
        const nozzleCount = Math.max(2, Math.ceil(floorArea / nozzleCoverage));

        // 8. Estimate piping length (simplified calculation)
        const pipingLength = (roomLength + roomWidth) * 2 + (roomHeight * 2);

        // 9. Return all calculation results
        return {
            // Core results
            agentWeight: this.round(agentWeight, 2),
            cylinderCount: cylinderCount,
            nozzleCount: nozzleCount,
            cylinderSize: cylinderSize,
            
            // Volume calculations
            grossVolume: this.round(grossVolume, 2),
            netVolume: this.round(netVolume, 2),
            floorArea: this.round(floorArea, 2),
            pipingLength: this.round(pipingLength, 2),
            
            // Technical parameters
            specificVaporVolume: this.round(specificVaporVolume, 4),
            concentration: C,
            minTemperature: minTemperature,
            altitude: altitude,
            safetyFactor: safetyFactor,
            
            // Metadata
            calculationMethod: 'NFPA 2001 Standard Formula',
            formulaUsed: 'W = (V/S) × (C/(100-C))',
            units: APP_CONFIG.units
        };
    }

    calculateSystemCosts(calculationResults, currency) {
        // Access multipliers from the globally loaded object
        const m = COST_MULTIPLIERS;
        
        // 1. Agent Cost
        const agentCost = calculationResults.agentWeight * m.agentCostPerKg;
        
        // 2. Cylinder System
        const cylinderCost = calculationResults.cylinderCount * m.cylinderCost;
        const valveCost = calculationResults.cylinderCount * m.valveAssembly;
        const mountingCost = calculationResults.cylinderCount * m.mountingHardware;
        
        // 3. Distribution System
        const nozzleCost = calculationResults.nozzleCount * m.nozzleCost;
        const pipingCost = calculationResults.pipingLength * m.pipingCostPerMeter;
        const fittingsCost = m.fittingsCost;
        
        // 4. Detection & Control
        const detectionCost = m.detectionPanel;
        const smokeDetectors = Math.max(2, Math.ceil(calculationResults.floorArea / 100)) * m.smokeDetector;
        const heatDetectors = 2 * m.heatDetector; // Minimum 2 for cross-zoning
        const manualCallPoints = 2 * m.manualCallPoint; // Entry and exit
        const hooterStrobes = 4 * m.hooterStrobe; // Standard configuration
        const warningSigns = m.warningSigns;
        
        // 5. Equipment Subtotal
        const equipmentSubtotal = agentCost + cylinderCost + valveCost + mountingCost +
                                 nozzleCost + pipingCost + fittingsCost +
                                 detectionCost + smokeDetectors + heatDetectors +
                                 manualCallPoints + hooterStrobes + warningSigns;

        // 6. Installation Labor (estimated)
        const installationHours = 40 + (calculationResults.cylinderCount * 4) + 
                                 (calculationResults.nozzleCount * 2) + 
                                 (calculationResults.pipingLength * 0.5);
        const installationLabor = installationHours * m.installationLaborPerHour;

        const laborSubtotal = installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        
        // 7. Apply Factors
        // Note: The installationFactor and engineeringFactor are applied correctly in the original code,
        // but the calculation here seems to double-dip on installationLabor/engineeringDesign by including 
        // them in equipmentSubtotal and then calculating a factor on equipmentSubtotal.
        // Let's stick to the original implementation which seems to apply the factors as a markup on equipment.
        
        // Installation Cost (Factor applied to Equipment Subtotal)
        const installationFactorCost = equipmentSubtotal * (m.installationFactor - 1);
        
        // Engineering Cost (Factor applied to Equipment Subtotal)
        const engineeringFactorCost = equipmentSubtotal * (m.engineeringFactor - 1);
        
        // Contingency Cost (Factor applied to Equipment Subtotal)
        const contingency = equipmentSubtotal * (m.contingencyFactor - 1);
        
        // 8. Calculate Totals (using the labor subtotal separately for clarity)
        const subtotalUSD = equipmentSubtotal + laborSubtotal + installationFactorCost + engineeringFactorCost + contingency;

        // The original logic was:
        // const subtotalUSD = equipmentSubtotal + installationLabor + engineeringDesign + commissioningTesting + documentation;
        // const totalUSD = subtotalUSD + installationCost + engineeringCost + contingency;
        // This suggests: installationCost = equipmentSubtotal * (m.installationFactor - 1)
        // AND engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1)
        // AND installationLabor is calculated separately.

        // Reverting to the original, simpler (though slightly confusing) original costing logic:
        const totalEquipmentAndLabor = equipmentSubtotal + installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        
        const installationCost = equipmentSubtotal * (m.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1);
        const totalContingency = equipmentSubtotal * (m.contingencyFactor - 1);

        const totalUSD = totalEquipmentAndLabor + installationCost + engineeringCost + totalContingency;

        // 9. Convert to selected currency
        const exchangeRate = EXCHANGE_RATES[currency] || 1;
        const totalConverted = totalUSD * exchangeRate;
        
        // Return comprehensive cost breakdown
        return {
            // Detailed Costs (USD)
            agentCost: this.round(agentCost, 2),
            cylinderCost: this.round(cylinderCost, 2),
            valveCost: this.round(valveCost, 2),
            mountingCost: this.round(mountingCost, 2),
            nozzleCost: this.round(nozzleCost, 2),
            pipingCost: this.round(pipingCost, 2),
            fittingsCost: this.round(fittingsCost, 2),
            detectionCost: this.round(detectionCost, 2),
            smokeDetectors: this.round(smokeDetectors, 2),
            heatDetectors: this.round(heatDetectors, 2),
            manualCallPoints: this.round(manualCallPoints, 2),
            hooterStrobes: this.round(hooterStrobes, 2),
            warningSigns: this.round(warningSigns, 2),
            
            // Labor & Services
            installationLabor: this.round(installationLabor, 2),
            engineeringDesign: this.round(m.engineeringDesign, 2),
            commissioningTesting: this.round(m.commissioningTesting, 2),
            documentation: this.round(m.documentation, 2),

            // Subtotals & Factors
            equipmentSubtotal: this.round(equipmentSubtotal, 2),
            laborSubtotal: this.round(installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation, 2),
            installationFactorCost: this.round(installationCost, 2), // Cost derived from factor
            engineeringFactorCost: this.round(engineeringCost, 2),   // Cost derived from factor
            contingency: this.round(totalContingency, 2),
            
            // Totals
            totalUSD: this.round(totalUSD, 2),
            totalConverted: this.round(totalConverted, 2),
            exchangeRate: this.round(exchangeRate, 4),
            currency: currency
        };
    }

    // ============================================================================
    // RESULTS PAGE FUNCTIONS
    // ============================================================================
    
    // ... (rest of the class methods: initResultsPage, loadCalculationData, etc. remain unchanged)

    initResultsPage() {
        console.log('Initializing Results Page');
        
        this.loadCalculationData();
        this.renderResultsPage();
        this.initResultsEventListeners();
        this.initChart();
        this.renderBOQ();

        // Set the currency select to the calculated currency
        const currencySelect = document.getElementById('resultsCurrency');
        if (currencySelect && this.currentData) {
            currencySelect.value = this.currentData.formData.currency;
        }

        console.log('Results Page Initialized Successfully');
    }

    loadCalculationData() {
        const dataJson = sessionStorage.getItem(APP_CONFIG.storageKeys.BUDGET_DATA);
        if (dataJson) {
            this.currentData = JSON.parse(dataJson);
            console.log('Calculation data loaded from session storage.');
        } else {
            // Handle case where no data is available (e.g., user navigated directly)
            this.showNotification('No previous calculation found. Please use the calculator page first.', 'warning');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
    }

    renderResultsPage() {
        if (!this.currentData) return;

        const { formData, calculationResults, costResults } = this.currentData;
        
        // Project Information
        this.setElementText('displayProjectName', formData.projectName);
        this.setElementText('displayLocation', formData.clientLocation);
        this.setElementText('displayCurrency', formData.currency);
        this.setElementText('calculationDate', new Date().toLocaleDateString());

        // System Requirements
        this.setElementText('agentQuantity', `${calculationResults.agentWeight} kg`);
        this.setElementText('cylinderCount', `${calculationResults.cylinderCount} pcs`);
        this.setElementText('cylinderSizeDisplay', `${calculationResults.cylinderSize} kg`);
        this.setElementText('nozzleCount', `${calculationResults.nozzleCount} pcs`);
        this.setElementText('pipingLength', `${calculationResults.pipingLength} m`);
        this.setElementText('netVolume', `${calculationResults.netVolume} m³`);
        this.setElementText('floorArea', `${calculationResults.floorArea} m²`);
        this.setElementText('concentrationRequired', `${calculationResults.concentration}%`);
        this.setElementText('minTemp', `${calculationResults.minTemperature} °C`);
        this.setElementText('altitudeVal', `${calculationResults.altitude} m`);
        this.setElementText('safetyFactorVal', `${(calculationResults.safetyFactor * 100).toFixed(0)}%`);

        // Budgetary Cost
        this.setElementText('totalCost', this.formatCurrency(costResults.totalConverted, formData.currency));
        this.setElementText('equipmentCost', this.formatCurrency(costResults.equipmentSubtotal * costResults.exchangeRate, formData.currency));
        this.setElementText('installationCost', this.formatCurrency(costResults.installationFactorCost * costResults.exchangeRate, formData.currency));
        this.setElementText('engineeringCost', this.formatCurrency(costResults.engineeringFactorCost * costResults.exchangeRate, formData.currency));
        this.setElementText('contingencyCost', this.formatCurrency(costResults.contingency * costResults.exchangeRate, formData.currency));
        this.setElementText('exchangeRate', `1 USD = ${this.round(costResults.exchangeRate, 4)} ${formData.currency}`);
    }

    renderBOQ() {
        if (!this.currentData) return;

        const { formData, calculationResults, costResults } = this.currentData;
        const boqBody = document.getElementById('boqBody');
        const boqFooter = document.getElementById('boqFooter');
        boqBody.innerHTML = '';
        boqFooter.innerHTML = '';

        const boqItems = [
            // Agent
            { item: 'FM-200 Agent', description: 'HFC-227ea Clean Agent', quantity: calculationResults.agentWeight, unit: 'kg', unitPriceUSD: costResults.agentCost / calculationResults.agentWeight, totalUSD: costResults.agentCost },
            
            // Storage & Activation
            { item: 'Storage Cylinders', description: `${calculationResults.cylinderSize}kg capacity`, quantity: calculationResults.cylinderCount, unit: 'pcs', unitPriceUSD: costResults.cylinderCost / calculationResults.cylinderCount, totalUSD: costResults.cylinderCost },
            { item: 'Valve Assembly', description: 'Cylinder Valve/Actuator Head', quantity: calculationResults.cylinderCount, unit: 'pcs', unitPriceUSD: costResults.valveCost / calculationResults.cylinderCount, totalUSD: costResults.valveCost },
            { item: 'Mounting Hardware', description: 'Cylinder Brackets/Racks', quantity: calculationResults.cylinderCount, unit: 'set', unitPriceUSD: costResults.mountingCost / calculationResults.cylinderCount, totalUSD: costResults.mountingCost },

            // Distribution Network
            { item: 'Nozzles', description: 'Discharge Nozzles (Standard Flow)', quantity: calculationResults.nozzleCount, unit: 'pcs', unitPriceUSD: costResults.nozzleCost / calculationResults.nozzleCount, totalUSD: costResults.nozzleCost },
            { item: 'Piping', description: 'Estimated Piping Length', quantity: calculationResults.pipingLength, unit: 'm', unitPriceUSD: costResults.pipingCost / calculationResults.pipingLength, totalUSD: costResults.pipingCost },
            { item: 'Fittings', description: 'Fittings & Flanges (Estimated)', quantity: 1, unit: 'lot', unitPriceUSD: costResults.fittingsCost, totalUSD: costResults.fittingsCost },

            // Detection & Control
            { item: 'Control Panel', description: 'Fire Suppression Control Panel', quantity: 1, unit: 'pc', unitPriceUSD: costResults.detectionCost, totalUSD: costResults.detectionCost },
            { item: 'Smoke Detectors', description: 'Primary Smoke Detection', quantity: costResults.smokeDetectors / COST_MULTIPLIERS.smokeDetector, unit: 'pcs', unitPriceUSD: COST_MULTIPLIERS.smokeDetector, totalUSD: costResults.smokeDetectors },
            { item: 'Heat Detectors', description: 'Secondary Heat Detection (Cross-Zone)', quantity: costResults.heatDetectors / COST_MULTIPLIERS.heatDetector, unit: 'pcs', unitPriceUSD: COST_MULTIPLIERS.heatDetector, totalUSD: costResults.heatDetectors },
            { item: 'Manual Call Points', description: 'Manual Release Station', quantity: costResults.manualCallPoints / COST_MULTIPLIERS.manualCallPoint, unit: 'pcs', unitPriceUSD: COST_MULTIPLIERS.manualCallPoint, totalUSD: costResults.manualCallPoints },
            { item: 'Hooter & Strobe', description: 'Alarm and Warning Devices', quantity: costResults.hooterStrobes / COST_MULTIPLIERS.hooterStrobe, unit: 'pcs', unitPriceUSD: COST_MULTIPLIERS.hooterStrobe, totalUSD: costResults.hooterStrobes },
            { item: 'Warning Signs', description: 'Signage & Door Labels', quantity: 1, unit: 'lot', unitPriceUSD: costResults.warningSigns, totalUSD: costResults.warningSigns }
        ];

        boqItems.forEach(item => {
            const row = document.createElement('tr');
            const totalConverted = item.totalUSD * costResults.exchangeRate;
            row.innerHTML = `
                <td>${item.item}</td>
                <td>${item.description}</td>
                <td>${this.round(item.quantity, 2)}</td>
                <td>${item.unit}</td>
                <td class="text-right">${this.formatCurrency(item.unitPriceUSD, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(item.totalUSD, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(totalConverted, formData.currency)}</td>
            `;
            boqBody.appendChild(row);
        });

        // Add footer with totals
        boqFooter.innerHTML = `
            <tr class="subtotal-row">
                <td colspan="5" class="text-right"><strong>Equipment Subtotal</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.equipmentSubtotal, 'USD')}</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.equipmentSubtotal * costResults.exchangeRate, formData.currency)}</strong></td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Installation Labor (Estimated)</td>
                <td class="text-right">${this.formatCurrency(costResults.installationLabor, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.installationLabor * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Engineering & Design</td>
                <td class="text-right">${this.formatCurrency(costResults.engineeringDesign, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.engineeringDesign * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Commissioning & Testing</td>
                <td class="text-right">${this.formatCurrency(costResults.commissioningTesting, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.commissioningTesting * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Documentation & Certification</td>
                <td class="text-right">${this.formatCurrency(costResults.documentation, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.documentation * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr class="subtotal-row">
                <td colspan="5" class="text-right"><strong>Services Subtotal (Included in Labor & Factors)</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.laborSubtotal, 'USD')}</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.laborSubtotal * costResults.exchangeRate, formData.currency)}</strong></td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Installation Factor (${(COST_MULTIPLIERS.installationFactor * 100).toFixed(0)}% Markup)</td>
                <td class="text-right">${this.formatCurrency(costResults.installationFactorCost, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.installationFactorCost * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Engineering Factor (${(COST_MULTIPLIERS.engineeringFactor * 100).toFixed(0)}% Markup)</td>
                <td class="text-right">${this.formatCurrency(costResults.engineeringFactorCost, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.engineeringFactorCost * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right">Contingency (${(COST_MULTIPLIERS.contingencyFactor * 100).toFixed(0)}% Markup)</td>
                <td class="text-right">${this.formatCurrency(costResults.contingency, 'USD')}</td>
                <td class="text-right">${this.formatCurrency(costResults.contingency * costResults.exchangeRate, formData.currency)}</td>
            </tr>
            <tr class="total-row">
                <td colspan="5" class="text-right"><strong>GRAND TOTAL BUDGETARY COST</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.totalUSD, 'USD')}</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.totalConverted, formData.currency)}</strong></td>
            </tr>
        `;
    }

    initResultsEventListeners() {
        const printBtn = document.getElementById('printResults');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // Export BOQ to CSV
        const exportBtn = document.getElementById('exportBOQ');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportBOQToCSV();
            });
        }

        // Google Maps Search
        const searchBtn = document.getElementById('searchSuppliers');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchGoogleMaps();
            });
        }

        // Currency Change
        const currencySelect = document.getElementById('resultsCurrency');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                this.updateCurrency(e.target.value);
            });
        }
    }

    updateCurrency(newCurrency) {
        if (!this.currentData) return;
        
        const exchangeRate = EXCHANGE_RATES[newCurrency] || 1;
        const { costResults, formData } = this.currentData;

        // Create a temporary new costResults object for display
        const tempCostResults = {
            ...costResults,
            exchangeRate: exchangeRate,
            currency: newCurrency
        };
        
        // Update displayed costs
        this.setElementText('totalCost', this.formatCurrency(costResults.totalUSD * exchangeRate, newCurrency));
        this.setElementText('equipmentCost', this.formatCurrency(costResults.equipmentSubtotal * exchangeRate, newCurrency));
        this.setElementText('installationCost', this.formatCurrency(costResults.installationFactorCost * exchangeRate, newCurrency));
        this.setElementText('engineeringCost', this.formatCurrency(costResults.engineeringFactorCost * exchangeRate, newCurrency));
        this.setElementText('contingencyCost', this.formatCurrency(costResults.contingency * exchangeRate, newCurrency));
        this.setElementText('exchangeRate', `1 USD = ${this.round(exchangeRate, 4)} ${newCurrency}`);

        // Update the current data object for persistence and BOQ rendering
        this.currentData.formData.currency = newCurrency;
        this.currentData.costResults = tempCostResults;
        sessionStorage.setItem(APP_CONFIG.storageKeys.BUDGET_DATA, JSON.stringify(this.currentData));

        // Re-render BOQ and chart
        this.renderBOQ();
        this.updateChartData();
    }
    
    // ... (rest of the class methods: initChart, updateChartData, etc. remain unchanged)

    initChart() {
        // Assume Chart.js is loaded
        const ctx = document.getElementById('costChart')?.getContext('2d');
        if (!ctx || this.costChart) return; // Prevent double initialization

        const { costResults } = this.currentData;
        const currency = this.currentData.formData.currency;
        const exchangeRate = costResults.exchangeRate;

        const data = {
            labels: [
                'Agent Cost',
                'Cylinder System',
                'Distribution Piping',
                'Detection & Control',
                'Installation Factor',
                'Engineering Factor',
                'Contingency'
            ],
            datasets: [{
                label: `Budgetary Cost (${currency})`,
                data: [
                    costResults.agentCost * exchangeRate,
                    (costResults.cylinderCost + costResults.valveCost + costResults.mountingCost) * exchangeRate,
                    (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate,
                    (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate,
                    costResults.installationFactorCost * exchangeRate,
                    costResults.engineeringFactorCost * exchangeRate,
                    costResults.contingency * exchangeRate
                ],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)'
                ],
                borderWidth: 1
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: `Cost in ${currency}`
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'System Cost Breakdown'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += this.formatCurrency(context.parsed.y, currency);
                            }
                            return label;
                        }
                    }
                }
            }
        };

        this.costChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    }

    updateChartData() {
        if (!this.costChart || !this.currentData) return;

        const { costResults } = this.currentData;
        const currency = this.currentData.formData.currency;
        const exchangeRate = costResults.exchangeRate;

        // Update the dataset values
        this.costChart.data.datasets[0].label = `Budgetary Cost (${currency})`;
        this.costChart.data.datasets[0].data = [
            costResults.agentCost * exchangeRate,
            (costResults.cylinderCost + costResults.valveCost + costResults.mountingCost) * exchangeRate,
            (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate,
            (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate,
            costResults.installationFactorCost * exchangeRate,
            costResults.engineeringFactorCost * exchangeRate,
            costResults.contingency * exchangeRate
        ];

        // Update the scale label
        this.costChart.options.scales.y.title.text = `Cost in ${currency}`;
        this.costChart.options.plugins.tooltip.callbacks.label = (context) => {
            let label = context.dataset.label || '';
            if (label) {
                label += ': ';
            }
            if (context.parsed.y !== null) {
                label += this.formatCurrency(context.parsed.y, currency);
            }
            return label;
        };

        this.costChart.update();
    }

    // ... (rest of the class methods: searchGoogleMaps, loadOemSuppliers, etc. remain unchanged)

    searchGoogleMaps() {
        const location = this.currentData?.formData?.clientLocation || 'Not Specified';
        const query = encodeURIComponent(`FM-200 Fire Suppression System Suppliers near ${location}`);
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
        this.showNotification(`Searching Google Maps for suppliers near "${location}"...`, 'info');
    }

    loadOemSuppliers() {
        const supplierList = document.getElementById('oemSupplierList');
        if (!supplierList) return;

        supplierList.innerHTML = OEM_SUPPLIERS.map(supplier => `
            <div class="supplier-card">
                <h3>${supplier.name}</h3>
                <p>${supplier.description}</p>
                <div class="supplier-links">
                    <a href="${supplier.website}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary"><i class="fas fa-globe"></i> Website</a>
                    <a href="mailto:${supplier.contact}" class="btn btn-sm btn-secondary"><i class="fas fa-envelope"></i> Contact</a>
                </div>
            </div>
        `).join('');
    }

    // ============================================================================
    // QUOTATION PAGE FUNCTIONS
    // ============================================================================

    initQuotationPage() {
        console.log('Initializing Quotation Page');
        
        this.setQuotationDates();
        // Load calculation data
        this.loadCalculationData();
        // Initialize form and preview
        this.initQuotationForm();
        this.populateQuotationPreview();
        // Initialize event listeners
        this.initQuotationEventListeners();

        // Set the currency select to the calculated currency
        const currencySelect = document.getElementById('quoteCurrency');
        if (currencySelect && this.currentData) {
            currencySelect.value = this.currentData.formData.currency;
        }

        console.log('Quotation Page Initialized Successfully');
    }

    setQuotationDates() {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const validUntil = nextMonth.toISOString().split('T')[0];

        const dateField = document.getElementById('quotationDate');
        const validField = document.getElementById('validUntil');

        if (dateField) dateField.value = today;
        if (validField) validField.value = validUntil;
    }

    initQuotationForm() {
        // Auto-fill button
        const autoFillBtn = document.getElementById('autoFill');
        if (autoFillBtn) {
            autoFillBtn.addEventListener('click', () => {
                this.autoFillQuotationForm();
            });
        }

        // Currency change handler
        const currencySelect = document.getElementById('quoteCurrency');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                this.updateQuotationCurrency(e.target.value);
            });
        }
    }

    autoFillQuotationForm() {
        if (!this.currentData) {
            this.showNotification('No calculation data available for auto-fill', 'warning');
            return;
        }
        
        const { formData } = this.currentData;

        // Fill project details
        const projectName = document.getElementById('projectName');
        if (projectName) projectName.value = formData.projectName;
        
        const projectLocation = document.getElementById('projectLocation');
        if (projectLocation) projectLocation.value = formData.clientLocation;

        const quoteCurrency = document.getElementById('quoteCurrency');
        if (quoteCurrency) quoteCurrency.value = formData.currency;

        this.showNotification('Quotation form auto-filled with project data', 'success');
        this.populateQuotationPreview();
    }

    updateQuotationCurrency(newCurrency) {
        if (!this.currentData) return;
        
        // Update the current data object for consistency
        this.currentData.formData.currency = newCurrency;
        this.currentData.costResults.currency = newCurrency;
        this.currentData.costResults.exchangeRate = EXCHANGE_RATES[newCurrency] || 1;
        sessionStorage.setItem(APP_CONFIG.storageKeys.BUDGET_DATA, JSON.stringify(this.currentData));

        this.populateQuotationPreview();
        this.showNotification(`Quotation currency updated to ${newCurrency}`, 'info');
    }

    populateQuotationPreview() {
        if (!this.currentData) return;

        const { formData, calculationResults, costResults } = this.currentData;
        const currency = formData.currency;
        const exchangeRate = costResults.exchangeRate;

        // Populate header details
        this.setElementText('previewQuoteNumber', document.getElementById('quotationNumber')?.value || 'QUOT-001');
        this.setElementText('previewClientName', document.getElementById('clientName')?.value || 'Client Name Here');
        this.setElementText('previewProjectName', document.getElementById('projectName')?.value || formData.projectName);
        this.setElementText('previewDate', document.getElementById('quotationDate')?.value || new Date().toLocaleDateString());
        this.setElementText('previewValidUntil', document.getElementById('validUntil')?.value || '30 days');
        this.setElementText('previewCurrency', currency);

        // Define quotation BOQ items
        const quoteItems = [
            { 
                itemNo: '1', 
                description: 'FM-200 Clean Agent Fire Suppression System - Complete Solution (Turnkey)', 
                quantity: '1', 
                unit: 'system', 
                unitPriceUSD: costResults.totalUSD, 
                totalUSD: costResults.totalUSD 
            },
            { 
                itemNo: '1.1', 
                description: 'Supply of FM-200 HFC-227ea Clean Agent', 
                quantity: calculationResults.agentWeight, 
                unit: 'kg', 
                unitPriceUSD: costResults.agentCost / calculationResults.agentWeight, 
                totalUSD: costResults.agentCost 
            },
            { 
                itemNo: '1.2', 
                description: `Storage Cylinders (${calculationResults.cylinderSize}kg capacity) with valve assemblies`, 
                quantity: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPriceUSD: ((costResults.cylinderCost + costResults.valveCost) / calculationResults.cylinderCount), 
                totalUSD: (costResults.cylinderCost + costResults.valveCost) 
            },
            { 
                itemNo: '1.3', 
                description: 'Distribution System (Piping, Nozzles, Fittings, etc.)', 
                quantity: '1', 
                unit: 'lot', 
                unitPriceUSD: (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost + costResults.mountingCost),
                totalUSD: (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost + costResults.mountingCost)
            },
            { 
                itemNo: '1.4', 
                description: 'Detection & Control System (Panel, Detectors, Alarms, etc.)', 
                quantity: '1', 
                unit: 'lot', 
                unitPriceUSD: (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns),
                totalUSD: (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns)
            },
            { 
                itemNo: '2', 
                description: 'Installation, Testing & Commissioning Labor', 
                quantity: 1, 
                unit: 'lot', 
                unitPriceUSD: costResults.laborSubtotal, 
                totalUSD: costResults.laborSubtotal 
            }
            // Note: Factors are included in the Item 1 total, but can be added as line items if needed.
        ];

        // Render BOQ table
        const boqTable = document.getElementById('quotationBoqBody');
        boqTable.innerHTML = '';
        let subtotalUSD = 0;

        quoteItems.forEach(item => {
            const row = document.createElement('tr');
            const unitPriceConverted = item.unitPriceUSD * exchangeRate;
            const totalConverted = item.totalUSD * exchangeRate;
            
            row.innerHTML = `
                <td>${item.itemNo}</td>
                <td>${item.description}</td>
                <td class="text-right">${this.round(item.quantity, 2)}</td>
                <td>${item.unit}</td>
                <td class="text-right">${this.formatCurrency(unitPriceConverted, currency)}</td>
                <td class="text-right">${this.formatCurrency(totalConverted, currency)}</td>
            `;
            boqTable.appendChild(row);
            subtotalUSD += item.totalUSD;
        });

        // Calculate factors on the subtotal (Equipment + Labor)
        const factorSubtotalUSD = costResults.equipmentSubtotal + costResults.laborSubtotal;
        const totalFactorCostUSD = costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency;
        const finalTotalUSD = factorSubtotalUSD + totalFactorCostUSD;

        // Add Factor Rows
        const factorItems = [
            { description: `Installation Factor (${(COST_MULTIPLIERS.installationFactor * 100).toFixed(0)}% Markup)`, totalUSD: costResults.installationFactorCost },
            { description: `Engineering Factor (${(COST_MULTIPLIERS.engineeringFactor * 100).toFixed(0)}% Markup)`, totalUSD: costResults.engineeringFactorCost },
            { description: `Contingency (${(COST_MULTIPLIERS.contingencyFactor * 100).toFixed(0)}% Markup)`, totalUSD: costResults.contingency }
        ];

        factorItems.forEach((item, index) => {
            const row = document.createElement('tr');
            const totalConverted = item.totalUSD * exchangeRate;
            row.innerHTML = `
                <td></td>
                <td><em style="color: var(--primary);">${item.description}</em></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="text-right">${this.formatCurrency(totalConverted, currency)}</td>
            `;
            boqTable.appendChild(row);
        });

        // Add Total Row
        const totalRow = document.getElementById('quotationTotalRow');
        if (totalRow) {
            totalRow.innerHTML = `
                <td colspan="5" class="text-right"><strong>GRAND TOTAL BUDGETARY COST</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(finalTotalUSD * exchangeRate, currency)}</strong></td>
            `;
        }
    }

    initQuotationEventListeners() {
        const previewBtn = document.getElementById('previewQuotation');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.previewQuotation();
            });
        }

        // Generate PDF
        const pdfBtn = document.getElementById('generatePDF');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                this.generatePDFQuotation();
            });
        }

        // Generate Excel
        const excelBtn = document.getElementById('generateExcel');
        if (excelBtn) {
            excelBtn.addEventListener('click', () => {
                this.generateExcelQuotation();
            });
        }
    }

    // ============================================================================
    // PDF & EXCEL GENERATION FUNCTIONS
    // ============================================================================

    previewQuotation() {
        this.showNotification('Opening quotation preview...', 'info');

        // Force a re-render of the preview content before printing/previewing
        this.populateQuotationPreview();

        // Create a print-friendly version
        const printContent = document.getElementById('quotationBody').cloneNode(true);
        
        // Remove buttons and non-essential elements
        const elementsToRemove = printContent.querySelectorAll('.btn, .action-section, .notification');
        elementsToRemove.forEach(el => el.remove());

        // Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>FM-200 Quotation Preview</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 10pt; }
                    .quotation-container { max-width: 800px; margin: 0 auto; border: 1px solid #ccc; padding: 30px; }
                    .quotation-header h2 { text-align: center; color: #1a73e8; }
                    .quotation-details, .client-details, .sender-details { margin-bottom: 20px; padding: 10px; border: 1px solid #eee; }
                    .boq-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .boq-table th, .boq-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    .boq-table th { background-color: #f2f2f2; }
                    .text-right { text-align: right !important; }
                    .total-row { background-color: #ffe0b2; }
                    .total-row strong { font-size: 1.1em; }
                    .terms-section { margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; }
                    .terms-section h3 { margin-bottom: 10px; font-size: 1.1em; }
                </style>
            </head>
            <body>
                ${printContent.outerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    generatePDFQuotation() {
        if (!this.currentData || typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            this.showNotification('PDF generation libraries not loaded or no data available. Please check network/data.', 'error');
            return;
        }

        this.showNotification('Generating PDF... Please wait.', 'info');
        const buttons = document.querySelectorAll('#generatePDF, #generateExcel');
        buttons.forEach(btn => btn.disabled = true);
        
        // Ensure the preview is populated with the latest data
        this.populateQuotationPreview();

        const input = document.getElementById('quotationBody');
        const { formData } = this.currentData;
        const quoteNumber = document.getElementById('quotationNumber')?.value || 'QUOT001';
        const projectName = document.getElementById('projectName')?.value || 'FM200_Project';

        // Use a slight scale-up for better resolution, then scale down in the PDF.
        html2canvas(input, { scale: 2 }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate content height to ensure proper multi-page rendering
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            // Save PDF
            const fileName = `FM200_Quotation_${quoteNumber}_${projectName.replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);

            // Re-enable buttons
            buttons.forEach(btn => btn.disabled = false);
            this.showNotification('PDF quotation generated successfully!', 'success');
        }).catch(error => {
            console.error('PDF generation error:', error);
            this.showNotification('Error generating PDF: ' + error.message, 'error');
            buttons.forEach(btn => btn.disabled = false);
        });
    }

    generateExcelQuotation() {
        if (!this.currentData) {
            this.showNotification('No calculation data available for export', 'warning');
            return;
        }
        
        const { formData, calculationResults, costResults } = this.currentData;
        const currency = document.getElementById('quoteCurrency')?.value || formData.currency;
        const exchangeRate = EXCHANGE_RATES[currency] || 1;
        const quoteNumber = document.getElementById('quotationNumber')?.value || 'QUOT001';
        const projectName = document.getElementById('projectName')?.value || 'FM200_Project';
        const clientName = document.getElementById('clientName')?.value || 'Client Name';
        const contactEmail = document.getElementById('contactEmail')?.value || 'client@example.com';
        const validUntil = document.getElementById('validUntil')?.value || '30 days';

        // Prepare CSV content
        let csvContent = 'FM-200 CLEAN AGENT SYSTEM QUOTATION\r\n';
        csvContent += `Quotation Number:,${quoteNumber}\r\n`;
        csvContent += `Project:,${projectName}\r\n`;
        csvContent += `Client:,${clientName}\r\n`;
        csvContent += `Contact:,${contactEmail}\r\n`;
        csvContent += `Date:,${new Date().toISOString().split('T')[0]}\r\n`;
        csvContent += `Valid Until:,${validUntil}\r\n`;
        csvContent += `Currency:,${currency}\r\n`;
        csvContent += `Exchange Rate (1 USD):,${this.round(exchangeRate, 4)} ${currency}\r\n\r\n`;

        // BOQ Table Headers
        csvContent += 'ITEM NO,DESCRIPTION,QUANTITY,UNIT,UNIT PRICE (USD),TOTAL (USD),TOTAL (' + currency + ')\r\n';

        // Get BOQ items (re-run the logic from populateQuotationPreview for consistency)
        const boqItems = [
            { 
                itemNo: '1', 
                description: 'FM-200 Clean Agent Fire Suppression System - Complete Solution (Turnkey)', 
                quantity: 1, 
                unit: 'system', 
                unitPriceUSD: costResults.totalUSD, 
                totalUSD: costResults.totalUSD 
            },
            { 
                itemNo: '1.1', 
                description: 'Supply of FM-200 HFC-227ea Clean Agent', 
                quantity: calculationResults.agentWeight, 
                unit: 'kg', 
                unitPriceUSD: costResults.agentCost / calculationResults.agentWeight, 
                totalUSD: costResults.agentCost 
            },
            { 
                itemNo: '1.2', 
                description: `Storage Cylinders (${calculationResults.cylinderSize}kg capacity) with valve assemblies`, 
                quantity: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPriceUSD: ((costResults.cylinderCost + costResults.valveCost) / calculationResults.cylinderCount), 
                totalUSD: (costResults.cylinderCost + costResults.valveCost) 
            },
            { 
                itemNo: '1.3', 
                description: 'Distribution System (Piping, Nozzles, Fittings, etc.)', 
                quantity: 1, 
                unit: 'lot', 
                unitPriceUSD: (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost + costResults.mountingCost),
                totalUSD: (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost + costResults.mountingCost)
            },
            { 
                itemNo: '1.4', 
                description: 'Detection & Control System (Panel, Detectors, Alarms, etc.)', 
                quantity: 1, 
                unit: 'lot', 
                unitPriceUSD: (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns),
                totalUSD: (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns)
            },
            { 
                itemNo: '2', 
                description: 'Installation, Testing & Commissioning Labor', 
                quantity: 1, 
                unit: 'lot', 
                unitPriceUSD: costResults.laborSubtotal, 
                totalUSD: costResults.laborSubtotal 
            }
        ];

        boqItems.forEach(item => {
            const totalConverted = item.totalUSD * exchangeRate;
            csvContent += `"${item.itemNo}","${item.description}",${this.round(item.quantity, 2)},"${item.unit}",${this.round(item.unitPriceUSD, 2)},${this.round(item.totalUSD, 2)},${this.round(totalConverted, 2)}\r\n`;
        });
        
        // Add factor rows
        csvContent += ',"--- Cost Factors ---",,,\r\n';
        csvContent += `,"Installation Factor (${(COST_MULTIPLIERS.installationFactor * 100).toFixed(0)}% Markup)",,,,,,${this.round(costResults.installationFactorCost * exchangeRate, 2)}\r\n`;
        csvContent += `,"Engineering Factor (${(COST_MULTIPLIERS.engineeringFactor * 100).toFixed(0)}% Markup)",,,,,,${this.round(costResults.engineeringFactorCost * exchangeRate, 2)}\r\n`;
        csvContent += `,"Contingency (${(COST_MULTIPLIERS.contingencyFactor * 100).toFixed(0)}% Markup)",,,,,,${this.round(costResults.contingency * exchangeRate, 2)}\r\n`;

        // Add total row
        csvContent += ',"",,,,"GRAND TOTAL",,';
        csvContent += `${this.round(costResults.totalUSD, 2)},${this.round(costResults.totalConverted, 2)}\r\n`;
        
        // Add terms
        csvContent += '\r\n\r\nTERMS AND CONDITIONS\r\n';
        csvContent += '1. All prices are in the specified currency and USD equivalent\r\n';
        csvContent += `2. Quotation valid for ${validUntil} from date of issue\r\n`;
        csvContent += '3. Prices exclude local taxes and duties where applicable\r\n';
        csvContent += '4. Installation timeline: 6-8 weeks from order confirmation\r\n';
        csvContent += '5. Payment terms: 50% advance, 50% on completion\r\n';

        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `FM200_QUOTATION_${quoteNumber}_${projectName.replace(/\s+/g, '_')}.csv`;
        
        if (window.saveAs) {
            saveAs(blob, fileName);
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
        }
        this.showNotification('Excel/CSV file generated successfully!', 'success');
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    updateQuickPreview() {
        const preview = document.getElementById('quickPreviewMetrics');
        if (!preview) return;

        const length = parseFloat(document.getElementById('roomLength')?.value) || 0;
        const width = parseFloat(document.getElementById('roomWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('roomHeight')?.value) || 0;

        if (length > 0 && width > 0 && height > 0) {
            const volume = length * width * height;
            const area = length * width;
            this.setElementText('previewVolume', `${this.round(volume, 2)} m³`);
            this.setElementText('previewArea', `${this.round(area, 2)} m²`);
            preview.style.display = 'grid';
        } else {
            this.setElementText('previewVolume', '0.00 m³');
            this.setElementText('previewArea', '0.00 m²');
            preview.style.display = 'none';
        }
    }
    
    exportBOQToCSV() {
        if (!this.currentData) {
            this.showNotification('No data available for export', 'warning');
            return;
        }

        const { formData, calculationResults, costResults } = this.currentData;
        const currency = formData.currency;
        const exchangeRate = costResults.exchangeRate;
        const today = new Date().toISOString().split('T')[0];

        let csv = `FM-200 SYSTEM BILL OF QUANTITIES\r\n`;
        csv += `Project: ${formData.projectName}\r\n`;
        csv += `Location: ${formData.clientLocation}\r\n`;
        csv += `Date: ${today}\r\n`;
        csv += `Currency: ${currency}\r\n`;
        csv += `Exchange Rate: 1 USD = ${this.round(exchangeRate, 4)} ${currency}\r\n\r\n`;

        csv += 'ITEM,DESCRIPTION,QUANTITY,UNIT,UNIT PRICE (USD),TOTAL (USD),TOTAL (' + currency + ')\r\n';

        // Define BOQ items for export
        const exportItems = [
            // Equipment
            ['FM-200 Agent', 'HFC-227ea Clean Agent', calculationResults.agentWeight, 'kg', costResults.agentCost / calculationResults.agentWeight, costResults.agentCost, costResults.agentCost * exchangeRate],
            ['Storage Cylinders', `${calculationResults.cylinderSize}kg capacity`, calculationResults.cylinderCount, 'pcs', costResults.cylinderCost / calculationResults.cylinderCount, costResults.cylinderCost, costResults.cylinderCost * exchangeRate],
            ['Valve Assembly', 'Cylinder Valve/Actuator Head', calculationResults.cylinderCount, 'pcs', costResults.valveCost / calculationResults.cylinderCount, costResults.valveCost, costResults.valveCost * exchangeRate],
            ['Mounting Hardware', 'Cylinder Brackets/Racks', calculationResults.cylinderCount, 'set', costResults.mountingCost / calculationResults.cylinderCount, costResults.mountingCost, costResults.mountingCost * exchangeRate],
            ['Nozzles', 'Discharge Nozzles', calculationResults.nozzleCount, 'pcs', costResults.nozzleCost / calculationResults.nozzleCount, costResults.nozzleCost, costResults.nozzleCost * exchangeRate],
            ['Piping', 'Estimated Piping Length', calculationResults.pipingLength, 'm', costResults.pipingCost / calculationResults.pipingLength, costResults.pipingCost, costResults.pipingCost * exchangeRate],
            ['Fittings', 'Fittings & Flanges (Estimated)', 1, 'lot', costResults.fittingsCost, costResults.fittingsCost, costResults.fittingsCost * exchangeRate],
            ['Control Panel', 'Fire Suppression Control Panel', 1, 'pc', costResults.detectionCost, costResults.detectionCost, costResults.detectionCost * exchangeRate],
            ['Smoke Detectors', 'Primary Smoke Detection', costResults.smokeDetectors / COST_MULTIPLIERS.smokeDetector, 'pcs', COST_MULTIPLIERS.smokeDetector, costResults.smokeDetectors, costResults.smokeDetectors * exchangeRate],
            ['Heat Detectors', 'Secondary Heat Detection (Cross-Zone)', costResults.heatDetectors / COST_MULTIPLIERS.heatDetector, 'pcs', COST_MULTIPLIERS.heatDetector, costResults.heatDetectors, costResults.heatDetectors * exchangeRate],
            ['Manual Call Points', 'Manual Release Station', costResults.manualCallPoints / COST_MULTIPLIERS.manualCallPoint, 'pcs', COST_MULTIPLIERS.manualCallPoint, costResults.manualCallPoints, costResults.manualCallPoints * exchangeRate],
            ['Hooter & Strobe', 'Alarm and Warning Devices', costResults.hooterStrobes / COST_MULTIPLIERS.hooterStrobe, 'pcs', COST_MULTIPLIERS.hooterStrobe, costResults.hooterStrobes, costResults.hooterStrobes * exchangeRate],
            ['Warning Signs', 'Signage & Door Labels', 1, 'lot', costResults.warningSigns, costResults.warningSigns, costResults.warningSigns * exchangeRate],
            
            // Labor & Services
            ['Installation Labor', 'Estimated Labor Hours', costResults.installationLabor / COST_MULTIPLIERS.installationLaborPerHour, 'hr', COST_MULTIPLIERS.installationLaborPerHour, costResults.installationLabor, costResults.installationLabor * exchangeRate],
            ['Engineering Design', 'System Design & Calculations', 1, 'lot', costResults.engineeringDesign, costResults.engineeringDesign, costResults.engineeringDesign * exchangeRate],
            ['Commissioning', 'Testing & Commissioning', 1, 'lot', costResults.commissioningTesting, costResults.commissioningTesting, costResults.commissioningTesting * exchangeRate],
            ['Documentation', 'Manuals & Certifications', 1, 'lot', costResults.documentation, costResults.documentation, costResults.documentation * exchangeRate],

            // Factors
            ['Installation Factor', `${(COST_MULTIPLIERS.installationFactor * 100).toFixed(0)}% Markup on Equipment`, 1, 'lot', costResults.installationFactorCost, costResults.installationFactorCost, costResults.installationFactorCost * exchangeRate],
            ['Engineering Factor', `${(COST_MULTIPLIERS.engineeringFactor * 100).toFixed(0)}% Markup on Equipment`, 1, 'lot', costResults.engineeringFactorCost, costResults.engineeringFactorCost, costResults.engineeringFactorCost * exchangeRate],
            ['Contingency', `${(COST_MULTIPLIERS.contingencyFactor * 100).toFixed(0)}% Contingency`, 1, 'lot', costResults.contingency, costResults.contingency, costResults.contingency * exchangeRate]
        ];

        exportItems.forEach(item => {
            csv += `"${item[0]}","${item[1]}",${this.round(item[2], 2)},"${item[3]}",${this.round(item[4], 2)},${this.round(item[5], 2)},${this.round(item[6], 2)}\r\n`;
        });

        // Add Total Row
        csv += ',"",,,,"GRAND TOTAL",,';
        csv += `${this.round(costResults.totalUSD, 2)},${this.round(costResults.totalConverted, 2)}\r\n`;


        // Create and download CSV file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const fileName = `FM200_BOQ_${formData.projectName.replace(/\s+/g, '_')}_${today}.csv`;
        
        if (window.saveAs) {
            saveAs(blob, fileName);
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
        }
        this.showNotification('BOQ CSV file generated successfully!', 'success');
    }

    round(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    formatCurrency(amount, currency) {
        try {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            let formatted = formatter.format(amount);

            // Special handling for currencies like INR where the symbol is misplaced by default
            if (currency === 'INR') {
                formatted = '₹' + formatted.replace('₹', '');
            } else if (currency === 'AED') {
                formatted = formatted.replace('AED', 'AED ');
            }
            
            return formatted;
        } catch (error) {
            // Fallback formatting
            return `${currency} ${amount.toFixed(2)}`;
        }
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    generateProjectId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `FM200-${timestamp}-${random}`.toUpperCase();
    }

    showNotification(message, type = 'info') {
        // Use toastr if available
        if (window.toastr) {
            const options = {
                closeButton: true,
                progressBar: true,
                positionClass: 'toast-top-right',
                timeOut: 5000
            };
            switch (type) {
                case 'success':
                    toastr.success(message, 'Success', options);
                    break;
                case 'error':
                    toastr.error(message, 'Error', options);
                    break;
                case 'warning':
                    toastr.warning(message, 'Warning', options);
                    break;
                default:
                    toastr.info(message, 'Information', options);
            }
        } else {
            // Fallback to console log and basic alert for critical errors
            console.log(`[${type.toUpperCase()}] ${message}`);
            if (type === 'error' || type === 'warning') {
                // Not using alert for general info/success as it's disruptive
            }
        }
    }

    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.USER_PREFERENCES));
            return {
                theme: prefs?.theme || 'light',
                expertMode: prefs?.expertMode || false,
                lastCurrency: prefs?.lastCurrency || 'USD'
            };
        } catch (e) {
            console.error('Error loading preferences:', e);
            return { theme: 'light', expertMode: false, lastCurrency: 'USD' };
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.USER_PREFERENCES, JSON.stringify(this.userPrefs));
        } catch (e) {
            console.error('Error saving preferences:', e);
        }
    }

    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            this.setTheme(this.userPrefs.theme); // Apply saved theme
            
            toggleBtn.addEventListener('click', () => {
                const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
                this.setTheme(newTheme);
                this.userPrefs.theme = newTheme;
                this.savePreferences();
            });
        }
    }

    setTheme(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-mode');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    toggleExpertMode() {
        this.userPrefs.expertMode = !this.userPrefs.expertMode;
        this.savePreferences();

        const expertToggle = document.getElementById('expertMode');

        if (this.userPrefs.expertMode) {
            document.body.classList.add('expert-mode');
            if (expertToggle) {
                expertToggle.innerHTML = '<i class="fas fa-user-cog"></i> Expert Mode (ON)';
                expertToggle.classList.add('active');
            }
            this.showNotification('Expert Mode Activated. Advanced parameters are now visible.', 'info');
        } else {
            document.body.classList.remove('expert-mode');
            if (expertToggle) {
                expertToggle.innerHTML = '<i class="fas fa-user-cog"></i> Expert Mode (OFF)';
                expertToggle.classList.remove('active');
            }
            this.showNotification('Expert Mode Deactivated.', 'info');
        }
    }

    initGoogleTranslate() {
        // Simple function ensures proper styling
        const widget = document.getElementById('google_translate_element');
        if (widget) {
            widget.style.display = 'inline-block';
        }
    }

    initAffiliateLinks() {
        const affiliateLinks = document.querySelectorAll('.affiliate-link');
        affiliateLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Simple tracking or notification (in a real app, this would use an analytics service)
                console.log('Affiliate link clicked:', link.href);
                // No e.preventDefault() to allow navigation
            });
        });
    }

    initBuyMeCoffee() {
        const coffeeLinks = document.querySelectorAll('.coffee-link');
        coffeeLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Thank you for your support!', 'success');
                // In a real implementation, this would open the Buy Me a Coffee page
                setTimeout(() => {
                    window.open('https://www.buymeacoffee.com/firesafety', '_blank', 'noopener,noreferrer');
                }, 1000);
            });
        });
    }
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('FM-200 Calculator v3.0 - Initializing...');
    
    // Create global calculator instance
    window.fm200Calculator = new FM200Calculator();
    
    console.log('FM-200 Calculator v3.0 - Ready!');
});

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    if (window.fm200Calculator) {
        window.fm200Calculator.showNotification(
            `Application Error: ${event.reason.message || 'Unknown error'}`,
            'error'
        );
    }
});
