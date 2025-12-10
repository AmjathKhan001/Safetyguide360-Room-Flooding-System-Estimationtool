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

// Cost Multipliers (Base USD Prices)
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

// Exchange Rates (Updated regularly)
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
        // All calculations in USD first
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
        
        // 7. Engineering & Commissioning
        const engineeringDesign = m.engineeringDesign;
        const commissioningTesting = m.commissioningTesting;
        const documentation = m.documentation;
        
        // 8. Apply Factors
        const installationCost = equipmentSubtotal * (m.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1);
        const contingency = equipmentSubtotal * (m.contingencyFactor - 1);
        
        // 9. Calculate Totals
        const subtotalUSD = equipmentSubtotal + installationLabor + engineeringDesign + 
                          commissioningTesting + documentation;
        
        const totalUSD = subtotalUSD + installationCost + engineeringCost + contingency;
        
        // 10. Convert to selected currency
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
            
            // Labor & Services (USD)
            installationLabor: this.round(installationLabor, 2),
            engineeringDesign: this.round(engineeringDesign, 2),
            commissioningTesting: this.round(commissioningTesting, 2),
            documentation: this.round(documentation, 2),
            
            // Factors (USD)
            installationCost: this.round(installationCost, 2),
            engineeringCost: this.round(engineeringCost, 2),
            contingency: this.round(contingency, 2),
            
            // Subtotals (USD)
            equipmentSubtotal: this.round(equipmentSubtotal, 2),
            laborSubtotal: this.round(installationLabor + engineeringDesign + commissioningTesting + documentation, 2),
            factorsSubtotal: this.round(installationCost + engineeringCost + contingency, 2),
            subtotalUSD: this.round(subtotalUSD, 2),
            totalUSD: this.round(totalUSD, 2),
            
            // Converted Total
            totalConverted: this.round(totalConverted, 2),
            exchangeRate: exchangeRate,
            currency: currency
        };
    }

    // ============================================================================
    // RESULTS PAGE FUNCTIONS
    // ============================================================================

    initResultsPage() {
        console.log('Initializing Results Page');
        
        // Load calculation data from sessionStorage
        this.loadCalculationData();
        
        if (!this.currentData) {
            this.showNotification('No calculation data found. Please use the calculator first.', 'warning');
            
            // Show empty state with link to calculator
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-calculator"></i>
                <h3>No Calculation Data</h3>
                <p>Please perform a calculation first to view results</p>
                <a href="index.html" class="btn-primary">Go to Calculator</a>
            `;
            
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = '';
                mainContent.appendChild(emptyState);
            }
            return;
        }

        // Populate all result sections
        this.populateResults();
        this.populateBOQTable();
        this.initCostChart();
        this.loadOemSuppliersResults();
        
        // Initialize event listeners
        this.initResultsEventListeners();
        
        console.log('Results Page Initialized Successfully');
    }

    loadCalculationData() {
        const data = sessionStorage.getItem(APP_CONFIG.storageKeys.BUDGET_DATA);
        if (data) {
            try {
                this.currentData = JSON.parse(data);
                console.log('Calculation data loaded:', this.currentData);
            } catch (error) {
                console.error('Error parsing calculation data:', error);
                this.showNotification('Error loading calculation data', 'error');
            }
        }
    }

    populateResults() {
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
        
        // Budgetary Cost
        this.setElementText('totalCost', this.formatCurrency(costResults.totalConverted, formData.currency));
        this.setElementText('equipmentCost', this.formatCurrency(costResults.equipmentSubtotal * costResults.exchangeRate, formData.currency));
        this.setElementText('installationCost', this.formatCurrency(costResults.installationLabor * costResults.exchangeRate, formData.currency));
        this.setElementText('engineeringCost', this.formatCurrency(costResults.engineeringDesign * costResults.exchangeRate, formData.currency));
        this.setElementText('exchangeRate', costResults.exchangeRate.toFixed(4));
        this.setElementText('selectedCurrency', formData.currency);
        
        // Update currency selector
        const currencySelect = document.getElementById('resultsCurrency');
        if (currencySelect) {
            currencySelect.value = formData.currency;
            currencySelect.addEventListener('change', (e) => {
                this.updateCurrency(e.target.value);
            });
        }
    }

    populateBOQTable() {
        if (!this.currentData) return;
        
        const { calculationResults, costResults, formData } = this.currentData;
        const boqBody = document.getElementById('boqBody');
        const boqFooter = document.getElementById('boqFooter');
        const boqCurrency = document.getElementById('boqCurrency');
        
        if (!boqBody || !boqFooter) return;
        
        // Update currency display
        if (boqCurrency) {
            boqCurrency.textContent = formData.currency;
        }
        
        // BOQ Items Definition
        const boqItems = [
            {
                item: 'FM-200 Clean Agent',
                description: 'HFC-227ea, Zero ODP, stored pressure system',
                quantity: calculationResults.agentWeight,
                unit: 'kg',
                unitPriceUSD: costResults.agentCost / calculationResults.agentWeight,
                totalUSD: costResults.agentCost
            },
            {
                item: 'Storage Cylinders',
                description: `High-pressure carbon steel, ${calculationResults.cylinderSize}kg capacity, DOT approved`,
                quantity: calculationResults.cylinderCount,
                unit: 'pcs',
                unitPriceUSD: costResults.cylinderCost / calculationResults.cylinderCount,
                totalUSD: costResults.cylinderCost
            },
            {
                item: 'Valve Assemblies',
                description: 'Solenoid actuated with manual override',
                quantity: calculationResults.cylinderCount,
                unit: 'pcs',
                unitPriceUSD: costResults.valveCost / calculationResults.cylinderCount,
                totalUSD: costResults.valveCost
            },
            {
                item: 'Discharge Nozzles',
                description: 'Brass nozzles, UL/FM approved, adjustable pattern',
                quantity: calculationResults.nozzleCount,
                unit: 'pcs',
                unitPriceUSD: costResults.nozzleCost / calculationResults.nozzleCount,
                totalUSD: costResults.nozzleCost
            },
            {
                item: 'Piping System',
                description: 'Schedule 40 seamless steel pipe with fittings',
                quantity: calculationResults.pipingLength,
                unit: 'm',
                unitPriceUSD: costResults.pipingCost / calculationResults.pipingLength,
                totalUSD: costResults.pipingCost
            },
            {
                item: 'Detection & Control Panel',
                description: 'Addressable fire alarm control panel',
                quantity: 1,
                unit: 'set',
                unitPriceUSD: costResults.detectionCost,
                totalUSD: costResults.detectionCost
            },
            {
                item: 'Smoke Detectors',
                description: 'Addressable photoelectric smoke detectors',
                quantity: Math.max(2, Math.ceil(calculationResults.floorArea / 100)),
                unit: 'pcs',
                unitPriceUSD: 95.00,
                totalUSD: costResults.smokeDetectors
            },
            {
                item: 'Installation Labor',
                description: 'Professional installation and mounting',
                quantity: 1,
                unit: 'job',
                unitPriceUSD: costResults.installationLabor,
                totalUSD: costResults.installationLabor
            },
            {
                item: 'Engineering & Commissioning',
                description: 'System design, testing, and certification',
                quantity: 1,
                unit: 'job',
                unitPriceUSD: costResults.engineeringDesign + costResults.commissioningTesting,
                totalUSD: costResults.engineeringDesign + costResults.commissioningTesting
            }
        ];
        
        // Clear existing rows
        boqBody.innerHTML = '';
        
        // Add BOQ items
        boqItems.forEach((item, index) => {
            const row = document.createElement('tr');
            const unitPriceConverted = item.unitPriceUSD * costResults.exchangeRate;
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
            <tr class="subtotal-row">
                <td colspan="5" class="text-right"><strong>Labor & Services</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.laborSubtotal, 'USD')}</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.laborSubtotal * costResults.exchangeRate, formData.currency)}</strong></td>
            </tr>
            <tr class="subtotal-row">
                <td colspan="5" class="text-right"><strong>Engineering & Factors</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.factorsSubtotal, 'USD')}</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.factorsSubtotal * costResults.exchangeRate, formData.currency)}</strong></td>
            </tr>
            <tr class="total-row">
                <td colspan="5" class="text-right"><strong>GRAND TOTAL</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.totalUSD, 'USD')}</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costResults.totalConverted, formData.currency)}</strong></td>
            </tr>
        `;
    }

    initCostChart() {
        if (!this.currentData) return;
        
        const ctx = document.getElementById('costBreakdownChart');
        if (!ctx) return;
        
        const { costResults, formData } = this.currentData;
        const currency = formData.currency;
        const exchangeRate = costResults.exchangeRate;
        
        // Prepare chart data
        const data = {
            labels: [
                'Agent Cost',
                'Cylinder System',
                'Distribution System',
                'Detection & Control',
                'Installation Labor',
                'Engineering',
                'Contingency'
            ],
            datasets: [{
                data: [
                    costResults.agentCost * exchangeRate,
                    (costResults.cylinderCost + costResults.valveCost + costResults.mountingCost) * exchangeRate,
                    (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate,
                    (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + 
                     costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate,
                    costResults.installationLabor * exchangeRate,
                    (costResults.engineeringDesign + costResults.commissioningTesting + costResults.documentation) * exchangeRate,
                    costResults.contingency * exchangeRate
                ],
                backgroundColor: [
                    '#2c3e50', // Primary
                    '#3498db', // Accent
                    '#2ecc71', // Success
                    '#f39c12', // Warning
                    '#9b59b6', // Purple
                    '#1abc9c', // Teal
                    '#e74c3c'  // Danger
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 15
            }]
        };
        
        // Chart configuration
        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: document.body.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#333333',
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${this.formatCurrency(value, currency)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        };
        
        // Destroy existing chart if it exists
        if (this.costChart) {
            this.costChart.destroy();
        }
        
        // Create new chart
        this.costChart = new Chart(ctx.getContext('2d'), config);
    }

    initResultsEventListeners() {
        // Print Results
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
        
        // Update displayed costs
        this.setElementText('totalCost', this.formatCurrency(costResults.totalUSD * exchangeRate, newCurrency));
        this.setElementText('equipmentCost', this.formatCurrency(costResults.equipmentSubtotal * exchangeRate, newCurrency));
        this.setElementText('installationCost', this.formatCurrency(costResults.installationLabor * exchangeRate, newCurrency));
        this.setElementText('engineeringCost', this.formatCurrency(costResults.engineeringDesign * exchangeRate, newCurrency));
        this.setElementText('exchangeRate', exchangeRate.toFixed(4));
        this.setElementText('selectedCurrency', newCurrency);
        this.setElementText('boqCurrency', newCurrency);
        
        // Update BOQ table currency
        this.updateBOQCurrency(newCurrency, exchangeRate);
        
        // Update chart if it exists
        if (this.costChart) {
            this.updateChartCurrency(newCurrency, exchangeRate);
        }
        
        this.showNotification(`Currency updated to ${newCurrency}`, 'success');
    }

    updateBOQCurrency(newCurrency, exchangeRate) {
        if (!this.currentData) return;
        
        const boqBody = document.getElementById('boqBody');
        const boqFooter = document.getElementById('boqFooter');
        
        if (!boqBody || !boqFooter) return;
        
        // Update all total columns in BOQ body
        const totalCells = boqBody.querySelectorAll('td:nth-child(7)');
        totalCells.forEach(cell => {
            const usdAmount = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(usdAmount)) {
                const convertedAmount = usdAmount * exchangeRate;
                cell.textContent = this.formatCurrency(convertedAmount, newCurrency);
            }
        });
        
        // Update footer totals
        const footerCells = boqFooter.querySelectorAll('td:nth-child(7)');
        footerCells.forEach(cell => {
            const usdAmount = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(usdAmount)) {
                const convertedAmount = usdAmount * exchangeRate;
                cell.textContent = this.formatCurrency(convertedAmount, newCurrency);
            }
        });
    }

    updateChartCurrency(newCurrency, exchangeRate) {
        if (!this.costChart || !this.currentData) return;
        
        const { costResults } = this.currentData;
        
        // Update chart data with new currency
        this.costChart.data.datasets[0].data = [
            costResults.agentCost * exchangeRate,
            (costResults.cylinderCost + costResults.valveCost + costResults.mountingCost) * exchangeRate,
            (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate,
            (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + 
             costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate,
            costResults.installationLabor * exchangeRate,
            (costResults.engineeringDesign + costResults.commissioningTesting + costResults.documentation) * exchangeRate,
            costResults.contingency * exchangeRate
        ];
        
        // Update tooltip callback
        this.costChart.options.plugins.tooltip.callbacks.label = (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${this.formatCurrency(value, newCurrency)} (${percentage}%)`;
        };
        
        this.costChart.update();
    }

    // ============================================================================
    // QUOTATION PAGE FUNCTIONS
    // ============================================================================

    initQuotationPage() {
        console.log('Initializing Quotation Page');
        
        // Set default dates
        this.setQuotationDates();
        
        // Load calculation data
        this.loadCalculationData();
        
        // Initialize form and preview
        this.initQuotationForm();
        this.populateQuotationPreview();
        
        // Initialize event listeners
        this.initQuotationEventListeners();
        
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
        const projectLocation = document.getElementById('projectLocation');
        
        if (projectName) projectName.value = formData.projectName;
        if (projectLocation) projectLocation.value = formData.clientLocation;
        
        // Update quotation number with project reference
        const quoteNumber = document.getElementById('quotationNumber');
        if (quoteNumber) {
            const projectRef = formData.projectName.replace(/[^a-z0-9]/gi, '').substring(0, 8).toUpperCase();
            quoteNumber.value = `QUOT-FM200-${projectRef}-001`;
        }
        
        this.showNotification('Form auto-filled from calculation data', 'success');
    }

    populateQuotationPreview() {
        if (!this.currentData) return;
        
        const summaryContainer = document.getElementById('calculationSummary');
        if (!summaryContainer) return;
        
        const { formData, calculationResults } = this.currentData;
        
        // Remove placeholder if it exists
        const placeholder = summaryContainer.querySelector('.summary-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Create summary content
        summaryContainer.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-weight"></i>
                    </div>
                    <div class="summary-details">
                        <span class="summary-label">Agent Required</span>
                        <span class="summary-value">${calculationResults.agentWeight} kg</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="summary-details">
                        <span class="summary-label">Cylinders</span>
                        <span class="summary-value">${calculationResults.cylinderCount} × ${calculationResults.cylinderSize}kg</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-spray-can"></i>
                    </div>
                    <div class="summary-details">
                        <span class="summary-label">Nozzles</span>
                        <span class="summary-value">${calculationResults.nozzleCount} pcs</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-cube"></i>
                    </div>
                    <div class="summary-details">
                        <span class="summary-label">Protected Volume</span>
                        <span class="summary-value">${calculationResults.netVolume} m³</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="summary-details">
                        <span class="summary-label">Location</span>
                        <span class="summary-value">${formData.clientLocation}</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-calendar"></i>
                    </div>
                    <div class="summary-details">
                        <span class="summary-label">Calculation Date</span>
                        <span class="summary-value">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Populate BOQ table
        this.populateQuotationBOQ();
    }

    populateQuotationBOQ() {
        if (!this.currentData) return;
        
        const tableBody = document.getElementById('quoteTableBody');
        const tableFooter = document.getElementById('quoteTableFooter');
        
        if (!tableBody || !tableFooter) return;
        
        const { calculationResults, costResults, formData } = this.currentData;
        const currency = document.getElementById('quoteCurrency')?.value || formData.currency;
        const exchangeRate = EXCHANGE_RATES[currency] || 1;
        
        // Define quotation BOQ items
        const quoteItems = [
            {
                itemNo: '1',
                description: 'FM-200 Clean Agent Fire Suppression System - Complete Solution',
                quantity: '1',
                unit: 'system',
                unitPrice: costResults.totalUSD * exchangeRate,
                total: costResults.totalUSD * exchangeRate
            },
            {
                itemNo: '1.1',
                description: 'Supply of FM-200 HFC-227ea Clean Agent',
                quantity: calculationResults.agentWeight,
                unit: 'kg',
                unitPrice: (costResults.agentCost / calculationResults.agentWeight) * exchangeRate,
                total: costResults.agentCost * exchangeRate
            },
            {
                itemNo: '1.2',
                description: `Storage Cylinders (${calculationResults.cylinderSize}kg capacity) with valve assemblies`,
                quantity: calculationResults.cylinderCount,
                unit: 'pcs',
                unitPrice: ((costResults.cylinderCost + costResults.valveCost) / calculationResults.cylinderCount) * exchangeRate,
                total: (costResults.cylinderCost + costResults.valveCost) * exchangeRate
            },
            {
                itemNo: '1.3',
                description: 'Distribution System (Piping, Nozzles, Fittings)',
                quantity: '1',
                unit: 'lot',
                unitPrice: (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate,
                total: (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate
            },
            {
                itemNo: '1.4',
                description: 'Detection & Control System (Panel, Detectors, Alarms)',
                quantity: '1',
                unit: 'set',
                unitPrice: (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + 
                           costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate,
                total: (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + 
                       costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate
            },
            {
                itemNo: '2',
                description: 'Installation, Testing & Commissioning Services',
                quantity: '1',
                unit: 'job',
                unitPrice: (costResults.installationLabor + costResults.commissioningTesting) * exchangeRate,
                total: (costResults.installationLabor + costResults.commissioningTesting) * exchangeRate
            },
            {
                itemNo: '3',
                description: 'Engineering Design & Documentation',
                quantity: '1',
                unit: 'job',
                unitPrice: (costResults.engineeringDesign + costResults.documentation) * exchangeRate,
                total: (costResults.engineeringDesign + costResults.documentation) * exchangeRate
            }
        ];
        
        // Clear and populate table body
        tableBody.innerHTML = '';
        quoteItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.itemNo}</td>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td class="text-right">${this.formatCurrency(item.unitPrice, currency)}</td>
                <td class="text-right">${this.formatCurrency(item.total, currency)}</td>
            `;
            tableBody.appendChild(row);
        });
        
        // Calculate totals
        const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
        const taxRate = 0.05; // 5% tax
        const tax = subtotal * taxRate;
        const grandTotal = subtotal + tax;
        
        // Populate footer
        tableFooter.innerHTML = `
            <tr class="subtotal-row">
                <td colspan="5" class="text-right"><strong>Subtotal</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(subtotal, currency)}</strong></td>
            </tr>
            <tr class="tax-row">
                <td colspan="5" class="text-right">Tax (5%)</td>
                <td class="text-right">${this.formatCurrency(tax, currency)}</td>
            </tr>
            <tr class="total-row">
                <td colspan="5" class="text-right"><strong>GRAND TOTAL</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(grandTotal, currency)}</strong></td>
            </tr>
        `;
        
        // Update the grand total display
        const grandTotalElement = document.getElementById('quotationGrandTotal');
        if (grandTotalElement) {
            grandTotalElement.textContent = this.formatCurrency(grandTotal, currency);
        }
    }

    updateQuotationCurrency(newCurrency) {
        if (!this.currentData) return;
        
        this.populateQuotationBOQ();
        this.showNotification(`Quotation currency updated to ${newCurrency}`, 'success');
    }

    initQuotationEventListeners() {
        // Preview Quotation
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
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .card { border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .text-right { text-align: right; }
                    .total-row { background-color: #f2f2f2; font-weight: bold; }
                    h1 { color: #2c3e50; }
                    h2 { color: #3498db; }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    generatePDFQuotation() {
        if (!window.jspdf || !window.html2canvas) {
            this.showNotification('PDF generation libraries not loaded. Please try again.', 'error');
            return;
        }
        
        this.showNotification('Generating PDF quotation... This may take a moment.', 'info');
        
        const { jsPDF } = window.jspdf;
        const quotationElement = document.getElementById('quotationBody');
        const projectName = document.getElementById('projectName')?.value || 'FM200_Project';
        const quoteNumber = document.getElementById('quotationNumber')?.value || 'QUOT001';
        
        // Disable buttons during generation
        const buttons = document.querySelectorAll('#generatePDF, #generateExcel');
        buttons.forEach(btn => btn.disabled = true);
        
        html2canvas(quotationElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate image dimensions to fit page
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;
            
            // Add image to PDF
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            
            // Add page numbers
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(10);
                pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - 20, pdfHeight - 10);
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
        
        // Prepare CSV content
        let csvContent = 'FM-200 CLEAN AGENT SYSTEM QUOTATION\r\n';
        csvContent += `Quotation Number: ${quoteNumber}\r\n`;
        csvContent += `Project: ${projectName}\r\n`;
        csvContent += `Date: ${new Date().toLocaleDateString()}\r\n`;
        csvContent += `Currency: ${currency}\r\n`;
        csvContent += `Exchange Rate: 1 USD = ${exchangeRate} ${currency}\r\n\r\n`;
        
        csvContent += 'ITEM NO,DESCRIPTION,QUANTITY,UNIT,UNIT PRICE,TOTAL AMOUNT\r\n';
        
        // Add items
        const items = [
            [`1`, `FM-200 Clean Agent System - Complete Solution`, `1`, `system`, 
             costResults.totalUSD * exchangeRate, costResults.totalUSD * exchangeRate],
            [`1.1`, `FM-200 HFC-227ea Clean Agent`, calculationResults.agentWeight, `kg`,
             (costResults.agentCost / calculationResults.agentWeight) * exchangeRate, costResults.agentCost * exchangeRate],
            [`1.2`, `Storage Cylinders (${calculationResults.cylinderSize}kg) with valves`, calculationResults.cylinderCount, `pcs`,
             ((costResults.cylinderCost + costResults.valveCost) / calculationResults.cylinderCount) * exchangeRate, 
             (costResults.cylinderCost + costResults.valveCost) * exchangeRate],
            [`1.3`, `Distribution System (Piping, Nozzles, Fittings)`, `1`, `lot`,
             (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate,
             (costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * exchangeRate],
            [`1.4`, `Detection & Control System`, `1`, `set`,
             (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + 
              costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate,
             (costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + 
              costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * exchangeRate],
            [`2`, `Installation, Testing & Commissioning`, `1`, `job`,
             (costResults.installationLabor + costResults.commissioningTesting) * exchangeRate,
             (costResults.installationLabor + costResults.commissioningTesting) * exchangeRate],
            [`3`, `Engineering Design & Documentation`, `1`, `job`,
             (costResults.engineeringDesign + costResults.documentation) * exchangeRate,
             (costResults.engineeringDesign + costResults.documentation) * exchangeRate]
        ];
        
        items.forEach(item => {
            csvContent += item.join(',') + '\r\n';
        });
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + parseFloat(item[5]), 0);
        const tax = subtotal * 0.05;
        const grandTotal = subtotal + tax;
        
        csvContent += '\r\n';
        csvContent += `Subtotal,${this.formatCurrency(subtotal, currency, false)}\r\n`;
        csvContent += `Tax (5%),${this.formatCurrency(tax, currency, false)}\r\n`;
        csvContent += `GRAND TOTAL,${this.formatCurrency(grandTotal, currency, false)}\r\n\r\n`;
        
        // Add notes
        csvContent += 'NOTES:\r\n';
        csvContent += '1. All prices are estimates and subject to change\r\n';
        csvContent += '2. Quotation valid for 30 days from date of issue\r\n';
        csvContent += '3. Prices exclude local taxes and duties where applicable\r\n';
        csvContent += '4. Installation timeline: 6-8 weeks from order confirmation\r\n';
        csvContent += '5. Payment terms: 50% advance, 50% on completion\r\n';
        
        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `FM200_BOQ_${quoteNumber}_${projectName.replace(/\s+/g, '_')}.csv`;
        
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
            const volume = (length * width * height).toFixed(1);
            const area = (length * width).toFixed(1);
            
            // Simplified estimation for preview
            const estimatedAgent = (volume * 0.73).toFixed(1);

            preview.innerHTML = `
                <div class="preview-metrics">
                    <div class="preview-metric">
                        <div class="preview-value">${volume}</div>
                        <div class="preview-label">Room Volume (m³)</div>
                    </div>
                    <div class="preview-metric">
                        <div class="preview-value">${area}</div>
                        <div class="preview-label">Floor Area (m²)</div>
                    </div>
                    <div class="preview-metric">
                        <div class="preview-value">${estimatedAgent}</div>
                        <div class="preview-label">Est. Agent (kg)</div>
                    </div>
                </div>
                <div class="preview-note">
                    <i class="fas fa-info-circle"></i> Based on standard 7% concentration
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-calculator"></i>
                    <h3>Ready to Calculate</h3>
                    <p>Enter room dimensions to see instant preview</p>
                </div>
            `;
        }
    }

    loadOemSuppliers() {
        const container = document.getElementById('oemSuppliers');
        if (!container) return;
        
        container.innerHTML = OEM_SUPPLIERS.map(supplier => `
            <div class="supplier-card">
                <div class="supplier-header">
                    <h3>${supplier.name}</h3>
                    <span class="supplier-badge">OEM</span>
                </div>
                <div class="supplier-body">
                    <p class="supplier-description">${supplier.description}</p>
                    <div class="supplier-products">
                        <strong>Products:</strong> ${supplier.products.join(', ')}
                    </div>
                    <div class="supplier-regions">
                        <strong>Regions:</strong> ${supplier.regions.join(', ')}
                    </div>
                </div>
                <div class="supplier-footer">
                    <a href="${supplier.website}" target="_blank" rel="noopener" class="supplier-link">
                        <i class="fas fa-external-link-alt"></i> Visit Website
                    </a>
                </div>
            </div>
        `).join('');
    }

    loadOemSuppliersResults() {
        const container = document.getElementById('resultsOemSuppliers');
        if (!container) return;
        
        container.innerHTML = OEM_SUPPLIERS.map(supplier => `
            <div class="supplier-item">
                <div class="supplier-logo">
                    <i class="fas fa-industry"></i>
                </div>
                <div class="supplier-info">
                    <h4>${supplier.name}</h4>
                    <p>${supplier.description}</p>
                    <div class="supplier-contact">
                        <i class="fas fa-envelope"></i> ${supplier.contact}
                    </div>
                </div>
                <a href="${supplier.website}" target="_blank" rel="noopener" class="supplier-action">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `).join('');
    }

    searchGoogleMaps() {
        const location = this.currentData?.formData?.clientLocation || '';
        const searchQuery = encodeURIComponent(`FM-200 fire suppression suppliers near ${location}`);
        const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
        
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        this.showNotification('Opening Google Maps for local supplier search...', 'info');
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
        csv += `Exchange Rate: 1 USD = ${exchangeRate} ${currency}\r\n\r\n`;
        
        csv += 'ITEM,DESCRIPTION,QUANTITY,UNIT,UNIT PRICE (USD),TOTAL (USD),TOTAL (' + currency + ')\r\n';
        
        // Define BOQ items for export
        const exportItems = [
            ['FM-200 Agent', 'HFC-227ea Clean Agent', calculationResults.agentWeight, 'kg',
             costResults.agentCost / calculationResults.agentWeight, costResults.agentCost,
             costResults.agentCost * exchangeRate],
            ['Storage Cylinders', `${calculationResults.cylinderSize}kg capacity`, calculationResults.cylinderCount, 'pcs',
             costResults.cylinderCost / calculationResults.cylinderCount, costResults.cylinderCost,
             costResults.cylinderCost * exchangeRate],
            ['Valve Assemblies', 'Solenoid actuated valves', calculationResults.cylinderCount, 'pcs',
             costResults.valveCost / calculationResults.cylinderCount, costResults.valveCost,
             costResults.valveCost * exchangeRate],
            ['Discharge Nozzles', 'Brass nozzles', calculationResults.nozzleCount, 'pcs',
             costResults.nozzleCost / calculationResults.nozzleCount, costResults.nozzleCost,
             costResults.nozzleCost * exchangeRate],
            ['Piping System', 'Steel piping with fittings', calculationResults.pipingLength, 'm',
             costResults.pipingCost / calculationResults.pipingLength, costResults.pipingCost,
             costResults.pipingCost * exchangeRate],
            ['Detection Panel', 'Fire alarm control panel', 1, 'set',
             costResults.detectionCost, costResults.detectionCost,
             costResults.detectionCost * exchangeRate],
            ['Smoke Detectors', 'Addressable detectors', Math.max(2, Math.ceil(calculationResults.floorArea / 100)), 'pcs',
             95.00, costResults.smokeDetectors, costResults.smokeDetectors * exchangeRate],
            ['Installation Labor', 'Professional installation', 1, 'job',
             costResults.installationLabor, costResults.installationLabor,
             costResults.installationLabor * exchangeRate],
            ['Engineering', 'Design & commissioning', 1, 'job',
             costResults.engineeringDesign + costResults.commissioningTesting,
             costResults.engineeringDesign + costResults.commissioningTesting,
             (costResults.engineeringDesign + costResults.commissioningTesting) * exchangeRate]
        ];
        
        exportItems.forEach(item => {
            csv += item.join(',') + '\r\n';
        });
        
        // Add totals
        csv += '\r\n';
        csv += `Equipment Subtotal,,${costResults.equipmentSubtotal},${costResults.equipmentSubtotal * exchangeRate}\r\n`;
        csv += `Labor & Services,,${costResults.laborSubtotal},${costResults.laborSubtotal * exchangeRate}\r\n`;
        csv += `Engineering & Factors,,${costResults.factorsSubtotal},${costResults.factorsSubtotal * exchangeRate}\r\n`;
        csv += `GRAND TOTAL,,${costResults.totalUSD},${costResults.totalConverted}\r\n`;
        
        // Create and download file
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
        
        this.showNotification('BOQ exported to CSV successfully!', 'success');
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    round(value, decimals = 2) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    formatCurrency(amount, currency = 'USD', includeSymbol = true) {
        try {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            let formatted = formatter.format(amount);
            
            if (!includeSymbol) {
                formatted = formatted.replace(/[^\d.,-]/g, '');
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
                    toastr.info(message, 'Info', options);
            }
        } else {
            // Fallback to custom notification
            const notification = document.getElementById('appNotification');
            if (notification) {
                notification.textContent = message;
                notification.className = `notification show ${type}`;
                
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 5000);
            } else {
                alert(`${type.toUpperCase()}: ${message}`);
            }
        }
    }

    // ============================================================================
    // USER PREFERENCES & THEME MANAGEMENT
    // ============================================================================

    loadPreferences() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.USER_PREFERENCES);
            return saved ? JSON.parse(saved) : {
                theme: 'light',
                expertMode: false,
                lastCurrency: 'USD',
                notifications: true
            };
        } catch (error) {
            return {
                theme: 'light',
                expertMode: false,
                lastCurrency: 'USD',
                notifications: true
            };
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.USER_PREFERENCES, JSON.stringify(this.userPrefs));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;

        // Set initial theme
        document.body.setAttribute('data-theme', this.userPrefs.theme);
        toggleBtn.innerHTML = this.userPrefs.theme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            this.userPrefs.theme = newTheme;
            this.savePreferences();
            
            toggleBtn.innerHTML = newTheme === 'dark' ? 
                '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            
            // Update chart colors if chart exists
            if (this.costChart) {
                this.updateChartTheme();
            }
        });
    }

    updateChartTheme() {
        if (!this.costChart) return;
        
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#ffffff' : '#333333';
        
        this.costChart.options.plugins.legend.labels.color = textColor;
        this.costChart.update();
    }

    toggleExpertMode() {
        const isExpertMode = document.body.classList.toggle('expert-mode');
        this.userPrefs.expertMode = isExpertMode;
        this.savePreferences();

        const expertToggle = document.getElementById('expertMode');
        if (expertToggle) {
            expertToggle.innerHTML = isExpertMode ? 
                '<i class="fas fa-user-cog"></i> Expert Mode (ON)' : 
                '<i class="fas fa-user-cog"></i> Expert Mode';
            expertToggle.classList.toggle('active', isExpertMode);
        }
        
        this.showNotification(`Expert Mode ${isExpertMode ? 'enabled' : 'disabled'}`, 'info');
    }

    initGoogleTranslate() {
        // The widget is initialized by the external script
        // This function ensures proper styling
        const widget = document.getElementById('google_translate_element');
        if (widget) {
            widget.style.display = 'inline-block';
        }
    }

    initAffiliateLinks() {
        const affiliateLinks = document.querySelectorAll('.affiliate-link');
        affiliateLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Redirecting to recommended suppliers...', 'info');
                // In a real implementation, this would redirect to affiliate partners
                setTimeout(() => {
                    window.open('https://www.kiddefenwal.com', '_blank', 'noopener,noreferrer');
                }, 1000);
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
