// FM-200 Calculator - Simplified Version
// Version 5.1 - Standalone with no external dependencies

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '5.1',
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
// DEFAULT DATA
// ============================================================================

const DEFAULT_DATA = {
    exchangeRates: {
        "USD": 1.00,
        "EUR": 0.92,
        "INR": 83.50,
        "AED": 3.67
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

// ============================================================================
// FM200Calculator CLASS - FIXED VERSION
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.costChart = null;
        this.userPrefs = this.loadPreferences();  // This should work now
        
        // Use default data directly (no external loading needed)
        this.costMultipliers = DEFAULT_DATA.costMultipliers;
        this.exchangeRates = DEFAULT_DATA.exchangeRates;
        
        this.initializeApp();
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    initializeApp() {
        console.log('Initializing FM-200 Calculator v' + APP_CONFIG.version);
        
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 800);

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
        this.updateVisitorCounter();
        
        console.log('Application initialized successfully');
    }

    // ============================================================================
    // PREFERENCES MANAGEMENT - FIXED METHOD
    // ============================================================================

    loadPreferences() {
        try {
            const prefs = localStorage.getItem(APP_CONFIG.storageKeys.USER_PREFERENCES);
            if (prefs) {
                return JSON.parse(prefs);
            }
        } catch (e) {
            console.warn('Error loading preferences:', e);
        }
        // Return default preferences
        return {
            theme: 'light',
            expertMode: false,
            lastCurrency: 'USD'
        };
    }

    savePreferences() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.USER_PREFERENCES, JSON.stringify(this.userPrefs));
        } catch (e) {
            console.warn('Error saving preferences:', e);
        }
    }

    // ============================================================================
    // CALCULATOR PAGE
    // ============================================================================

    initCalculatorPage() {
        console.log('Initializing Calculator Page');
        
        const form = document.getElementById('fm200Form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all inputs to default values?')) {
                    this.resetForm();
                }
            });
        }

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.openSaveModal();
            });
        }

        const expertToggle = document.getElementById('expertModeToggle');
        if (expertToggle) {
            expertToggle.checked = this.userPrefs.expertMode;
            expertToggle.addEventListener('change', () => this.toggleExpertMode());
            
            const expertPanel = document.getElementById('expertModePanel');
            if (expertPanel) {
                expertPanel.style.display = this.userPrefs.expertMode ? 'block' : 'none';
            }
        }

        // Set default values
        this.setDefaultValues();
        
        // Initialize real-time preview
        ['room-length', 'room-width', 'room-height', 'room-temperature', 'hazard-class'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuickPreview());
            }
        });

        this.updateQuickPreview();
        this.initAccordion();
        
        console.log('Calculator Page Initialized');
    }

    setDefaultValues() {
        const today = new Date();
        const projectName = document.getElementById('project-name');
        if (projectName && !projectName.value) {
            projectName.value = `FM-200 Project ${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
        }
    }

    resetForm() {
        const form = document.getElementById('fm200Form');
        if (form) {
            form.reset();
            this.setDefaultValues();
            this.updateQuickPreview();
            this.showNotification('Form reset to default values', 'success');
        }
    }

    updateQuickPreview() {
        try {
            const length = parseFloat(document.getElementById('room-length')?.value) || 10;
            const width = parseFloat(document.getElementById('room-width')?.value) || 8;
            const height = parseFloat(document.getElementById('room-height')?.value) || 3;
            const temp = parseFloat(document.getElementById('room-temperature')?.value) || 20;
            const concentration = parseFloat(document.getElementById('hazard-class')?.value) || 7.5;

            const volume = length * width * height;
            const specificVolume = APP_CONFIG.SPECIFIC_VAPOR_BASE + (APP_CONFIG.SPECIFIC_VAPOR_TEMP_FACTOR * temp);
            const agentMass = (volume / specificVolume) * (concentration / (100 - concentration));

            this.setElementText('displayVolume', `${this.round(volume, 2)} m³`);
            this.setElementText('displaySpecificVolume', `${this.round(specificVolume, 4)} m³/kg`);
            this.setElementText('displayConcentration', `${concentration}%`);
            this.setElementText('displayAgentMass', `${this.round(agentMass, 2)} kg`);
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }

    initAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const content = header.nextElementSibling;
                
                item.classList.toggle('active');
                
                if (item.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.style.padding = '15px';
                } else {
                    content.style.maxHeight = '0';
                    content.style.padding = '0 15px';
                }
            });
        });
    }

    openSaveModal() {
        const modal = document.getElementById('saveModal');
        if (modal) {
            modal.style.display = 'flex';
            const closeBtn = modal.querySelector('.close-modal');
            const confirmBtn = document.getElementById('confirmSaveBtn');
            
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.style.display = 'none';
                };
            }
            
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    this.saveCalculation();
                    modal.style.display = 'none';
                };
            }
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    saveCalculation() {
        const saveName = document.getElementById('saveName')?.value || 'My Calculation';
        const formData = this.collectFormData();
        
        if (formData) {
            try {
                const savedCalculations = JSON.parse(localStorage.getItem('fm200SavedCalculations') || '[]');
                savedCalculations.push({
                    name: saveName,
                    data: formData,
                    timestamp: new Date().toISOString()
                });
                
                localStorage.setItem('fm200SavedCalculations', JSON.stringify(savedCalculations));
                this.showNotification('Calculation saved successfully!', 'success');
            } catch (e) {
                this.showNotification('Error saving calculation: ' + e.message, 'error');
            }
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
            projectName: getValue('project-name') || 'FM-200 Project',
            clientLocation: getValue('location') || 'Not Specified',
            
            roomLength: getNumber('room-length', 10),
            roomWidth: getNumber('room-width', 8),
            roomHeight: getNumber('room-height', 3),
            
            designTemperature: getNumber('room-temperature', 20),
            altitude: getNumber('altitude', 0),
            concentration: getNumber('hazard-class', 7.5)
        };

        // Validation
        const errors = [];
        
        if (formData.roomLength <= 0 || formData.roomWidth <= 0 || formData.roomHeight <= 0) {
            errors.push('Room dimensions must be greater than zero');
        }
        
        if (formData.concentration < 7.0 || formData.concentration > 10.5) {
            errors.push('Concentration must be between 7.0% and 10.5%');
        }

        if (errors.length > 0) {
            this.showNotification(errors.join(', '), 'error');
            return null;
        }

        return formData;
    }

    handleFormSubmission() {
        try {
            const formData = this.collectFormData();
            if (!formData) return;
            
            const calculationResults = this.performNFPA2001Calculation(formData);
            
            const completeData = {
                formData: formData,
                calculationResults: calculationResults,
                metadata: {
                    timestamp: new Date().toISOString(),
                    projectId: this.generateProjectId(),
                    version: APP_CONFIG.version
                }
            };

            sessionStorage.setItem(APP_CONFIG.storageKeys.BUDGET_DATA, JSON.stringify(completeData));

            this.showNotification('Calculation successful! Redirecting to results...', 'success');
            
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 1500);

        } catch (error) {
            console.error('Calculation Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    // ============================================================================
    // CORE CALCULATION
    // ============================================================================

    performNFPA2001Calculation(formData) {
        const { roomLength, roomWidth, roomHeight, designTemperature, altitude, concentration } = formData;

        // 1. Calculate volumes
        const grossVolume = roomLength * roomWidth * roomHeight;
        const netVolume = grossVolume;
        
        // 2. Calculate Specific Vapor Volume (S) per NFPA 2001
        const specificVaporVolume = APP_CONFIG.SPECIFIC_VAPOR_BASE + 
                                   (APP_CONFIG.SPECIFIC_VAPOR_TEMP_FACTOR * designTemperature);

        // 3. Calculate Agent Weight using NFPA 2001 formula
        let agentWeight = (netVolume / specificVaporVolume) * (concentration / (100 - concentration));

        // 4. Apply altitude correction (if altitude > 500m)
        if (altitude > 500) {
            const altitudeFactor = 1 + ((altitude - 500) / 300) * 0.01;
            agentWeight *= altitudeFactor;
        }

        // 5. Calculate cylinder count (assuming 54.4kg cylinders)
        const cylinderSize = 54.4;
        const cylinderCount = Math.ceil(agentWeight / cylinderSize);

        // 6. Calculate number of nozzles
        const floorArea = roomLength * roomWidth;
        const nozzleCoverage = 50;
        const nozzleCount = Math.max(2, Math.ceil(floorArea / nozzleCoverage));

        // 7. Estimate piping length
        const pipingLength = (roomLength + roomWidth) * 2 + (roomHeight * 2);

        // 8. Return all calculation results
        return {
            agentWeight: this.round(agentWeight, 2),
            cylinderCount: cylinderCount,
            nozzleCount: nozzleCount,
            cylinderSize: cylinderSize,
            
            grossVolume: this.round(grossVolume, 2),
            netVolume: this.round(netVolume, 2),
            floorArea: this.round(floorArea, 2),
            pipingLength: this.round(pipingLength, 2),
            
            specificVaporVolume: this.round(specificVaporVolume, 4),
            concentration: concentration,
            designTemperature: designTemperature,
            altitude: altitude,
            
            calculationMethod: 'NFPA 2001 Standard Formula',
            units: APP_CONFIG.units
        };
    }

    // ============================================================================
    // RESULTS PAGE
    // ============================================================================

    initResultsPage() {
        console.log('Initializing Results Page');
        
        this.loadCalculationData();
        this.renderResultsPage();
        this.initResultsEventListeners();

        console.log('Results Page Initialized');
    }

    loadCalculationData() {
        try {
            const dataJson = sessionStorage.getItem(APP_CONFIG.storageKeys.BUDGET_DATA);
            if (dataJson) {
                this.currentData = JSON.parse(dataJson);
                console.log('Calculation data loaded');
                
                // Calculate costs
                const costResults = this.calculateSystemCosts(this.currentData.calculationResults, 'USD');
                this.currentData.costResults = costResults;
                
                // Update BOQ table
                setTimeout(() => this.renderBOQTable(), 100);
            } else {
                this.showNotification('No previous calculation found. Please use the calculator page first.', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        } catch (e) {
            console.error('Error loading calculation data:', e);
            this.showNotification('Error loading calculation data. Please recalculate.', 'error');
        }
    }

    renderResultsPage() {
        if (!this.currentData) return;

        const { formData, calculationResults } = this.currentData;
        
        this.setElementText('displayProjectName', formData.projectName);
        this.setElementText('agentMassResult', `${calculationResults.agentWeight} kg`);
        this.setElementText('cylinderCountResult', `${calculationResults.cylinderCount} x ${calculationResults.cylinderSize} kg cylinders`);
        this.setElementText('roomVolumeResult', `${calculationResults.netVolume} m³`);
        this.setElementText('designTempResult', `${calculationResults.designTemperature} °C`);
        this.setElementText('altitudeResult', `${calculationResults.altitude} m`);
        this.setElementText('concentrationResult', `${calculationResults.concentration}%`);
        this.setElementText('specificVolumeResult', `${calculationResults.specificVaporVolume} m³/kg`);
        this.setElementText('nozzleCoverageResult', `${calculationResults.floorArea} m²`);
        this.setElementText('nozzleCountResult', calculationResults.nozzleCount);
    }

    calculateSystemCosts(calculationResults, currency) {
        const m = this.costMultipliers;
        
        // Calculate all costs
        const agentCost = calculationResults.agentWeight * m.agentCostPerKg;
        const cylinderCost = calculationResults.cylinderCount * m.cylinderCost;
        const valveCost = calculationResults.cylinderCount * m.valveAssembly;
        const mountingCost = calculationResults.cylinderCount * m.mountingHardware;
        const nozzleCost = calculationResults.nozzleCount * m.nozzleCost;
        const pipingCost = calculationResults.pipingLength * m.pipingCostPerMeter;
        const fittingsCost = m.fittingsCost;
        const detectionCost = m.detectionPanel;
        const smokeDetectors = Math.max(2, Math.ceil(calculationResults.floorArea / 100)) * m.smokeDetector;
        const heatDetectors = 2 * m.heatDetector;
        const manualCallPoints = 2 * m.manualCallPoint;
        const hooterStrobes = 4 * m.hooterStrobe;
        const warningSigns = m.warningSigns;
        
        // Equipment Subtotal
        const equipmentSubtotal = agentCost + cylinderCost + valveCost + mountingCost +
                                 nozzleCost + pipingCost + fittingsCost +
                                 detectionCost + smokeDetectors + heatDetectors +
                                 manualCallPoints + hooterStrobes + warningSigns;

        // Installation Labor
        const installationHours = 40 + (calculationResults.cylinderCount * 4) + 
                                 (calculationResults.nozzleCount * 2) + 
                                 (calculationResults.pipingLength * 0.5);
        const installationLabor = installationHours * m.installationLaborPerHour;

        const laborSubtotal = installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        
        // Apply Factors
        const installationCost = equipmentSubtotal * (m.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1);
        const contingency = equipmentSubtotal * (m.contingencyFactor - 1);

        const totalEquipmentAndLabor = equipmentSubtotal + installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        const totalUSD = totalEquipmentAndLabor + installationCost + engineeringCost + contingency;

        // Convert to selected currency
        const exchangeRate = this.exchangeRates[currency] || 1;
        const totalConverted = totalUSD * exchangeRate;
        
        return {
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
            
            installationLabor: this.round(installationLabor, 2),
            engineeringDesign: this.round(m.engineeringDesign, 2),
            commissioningTesting: this.round(m.commissioningTesting, 2),
            documentation: this.round(m.documentation, 2),

            equipmentSubtotal: this.round(equipmentSubtotal, 2),
            laborSubtotal: this.round(laborSubtotal, 2),
            installationFactorCost: this.round(installationCost, 2),
            engineeringFactorCost: this.round(engineeringCost, 2),
            contingency: this.round(contingency, 2),
            
            totalUSD: this.round(totalUSD, 2),
            totalConverted: this.round(totalConverted, 2),
            exchangeRate: this.round(exchangeRate, 4),
            currency: currency
        };
    }

    initResultsEventListeners() {
        const printBtn = document.getElementById('printResults');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printResultsAsPDF();
            });
        }

        const exportBtn = document.getElementById('exportBOQ');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportBOQToCSV();
            });
        }

        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                this.updateResultsCurrency(e.target.value);
            });
        }
    }

    updateResultsCurrency(newCurrency) {
        if (!this.currentData) return;
        
        const exchangeRate = this.exchangeRates[newCurrency] || 1;
        const costResults = this.calculateSystemCosts(this.currentData.calculationResults, newCurrency);
        this.currentData.costResults = costResults;
        
        this.setElementText('exchangeRateDisplay', `${this.round(exchangeRate, 4)} ${newCurrency}`);
        this.renderBOQTable();
    }

    renderBOQTable() {
        if (!this.currentData) return;
        
        const { costResults } = this.currentData;
        const currency = costResults.currency;
        const exchangeRate = costResults.exchangeRate;
        const boqBody = document.querySelector('#boqTable tbody');
        
        if (!boqBody) return;
        
        boqBody.innerHTML = '';
        
        const boqItems = [
            { 
                item: 'FM-200 Agent', 
                qty: this.currentData.calculationResults.agentWeight, 
                unit: 'kg', 
                unitPrice: costResults.agentCost / this.currentData.calculationResults.agentWeight 
            },
            { 
                item: 'Storage Cylinders', 
                qty: this.currentData.calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPrice: costResults.cylinderCost / this.currentData.calculationResults.cylinderCount 
            },
            { 
                item: 'Nozzles', 
                qty: this.currentData.calculationResults.nozzleCount, 
                unit: 'pcs', 
                unitPrice: costResults.nozzleCost / this.currentData.calculationResults.nozzleCount 
            },
            { 
                item: 'Piping', 
                qty: this.currentData.calculationResults.pipingLength, 
                unit: 'm', 
                unitPrice: costResults.pipingCost / this.currentData.calculationResults.pipingLength 
            }
        ];
        
        let subtotal = 0;
        
        boqItems.forEach(item => {
            const total = item.unitPrice * item.qty;
            subtotal += total;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.item}</td>
                <td>${this.round(item.qty, 2)} ${item.unit}</td>
                <td>${this.formatCurrency(item.unitPrice * exchangeRate, currency)}</td>
                <td>${this.formatCurrency(total * exchangeRate, currency)}</td>
            `;
            boqBody.appendChild(row);
        });
        
        const factorTotal = costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency;
        const grandTotal = subtotal + factorTotal;
        
        this.setElementText('subtotalCost', this.formatCurrency(subtotal * exchangeRate, currency));
        this.setElementText('factorCost', this.formatCurrency(factorTotal * exchangeRate, currency));
        this.setElementText('grandTotalCost', this.formatCurrency(grandTotal * exchangeRate, currency));
        
        const installPercent = (this.costMultipliers.installationFactor - 1) * 100;
        const engineerPercent = (this.costMultipliers.engineeringFactor - 1) * 100;
        this.setElementText('installFactor', `${installPercent.toFixed(0)}%`);
        this.setElementText('engineerFactor', `${engineerPercent.toFixed(0)}%`);
    }

    // ============================================================================
    // QUOTATION PAGE
    // ============================================================================

    initQuotationPage() {
        console.log('Initializing Quotation Page');
        
        this.setQuotationDates();
        this.loadCalculationData();
        
        const autoFillBtn = document.getElementById('autoFill');
        if (autoFillBtn) {
            autoFillBtn.addEventListener('click', () => {
                this.autoFillQuotationForm();
            });
        }

        if (this.currentData) {
            this.autoFillQuotationForm();
        }

        console.log('Quotation Page Initialized');
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

    autoFillQuotationForm() {
        if (!this.currentData) {
            this.showNotification('No calculation data available for auto-fill', 'warning');
            return;
        }
        
        const { formData } = this.currentData;

        const clientName = document.getElementById('clientName');
        if (clientName) clientName.value = formData.projectName;
        
        const clientAddress = document.getElementById('clientAddress');
        if (clientAddress) clientAddress.value = formData.clientLocation;

        this.showNotification('Quotation form auto-filled with project data', 'success');
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    round(value, decimals) {
        if (isNaN(value) || value === null || value === undefined) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    formatCurrency(amount, currency) {
        try {
            let symbol = '';
            let formattedAmount = amount.toFixed(2);
            
            switch(currency) {
                case 'USD': symbol = '$'; break;
                case 'EUR': symbol = '€'; break;
                case 'INR': symbol = '₹'; break;
                case 'AED': symbol = 'AED '; break;
                default: symbol = currency + ' ';
            }
            
            formattedAmount = formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return symbol + formattedAmount;
        } catch (error) {
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

    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            // Set initial theme
            if (this.userPrefs.theme === 'dark') {
                document.body.classList.add('dark-mode');
                toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.body.classList.remove('dark-mode');
                toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
            
            // Toggle theme
            toggleBtn.addEventListener('click', () => {
                if (document.body.classList.contains('dark-mode')) {
                    document.body.classList.remove('dark-mode');
                    toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
                    this.userPrefs.theme = 'light';
                } else {
                    document.body.classList.add('dark-mode');
                    toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
                    this.userPrefs.theme = 'dark';
                }
                this.savePreferences();
            });
        }
    }

    initExpertMode() {
        const expertToggle = document.getElementById('expertModeToggle');
        if (expertToggle) {
            expertToggle.checked = this.userPrefs.expertMode;
            
            const expertPanel = document.getElementById('expertModePanel');
            if (expertPanel) {
                expertPanel.style.display = this.userPrefs.expertMode ? 'block' : 'none';
            }
        }
    }

    toggleExpertMode() {
        const expertToggle = document.getElementById('expertModeToggle');
        const expertPanel = document.getElementById('expertModePanel');
        
        if (expertToggle && expertPanel) {
            this.userPrefs.expertMode = expertToggle.checked;
            expertPanel.style.display = expertToggle.checked ? 'block' : 'none';
            this.savePreferences();
            
            const message = expertToggle.checked ? 
                'Expert Mode Activated. Advanced parameters are now visible.' : 
                'Expert Mode Deactivated.';
            this.showNotification(message, 'info');
        }
    }

    updateVisitorCounter() {
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FM-200 Calculator v5.1 - Initializing...');
    
    try {
        // Initialize calculator
        window.fm200Calculator = new FM200Calculator();
        console.log('FM-200 Calculator v5.1 - Ready!');
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
    console.error('Unhandled error:', e.message);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
});
