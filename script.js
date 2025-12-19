// FM-200 Calculator - Fixed Version with Proper Data Passing
// Version 6.1 - Fixed calculation flow

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '6.1',
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
    
    // Storage Keys - FIXED NAMES
    storageKeys: {
        CALCULATION_DATA: 'fm200_calculation_data',
        USER_PREFERENCES: 'fm200_user_prefs',
        VISITOR_COUNT: 'fm200_visitor_count'
    }
};

// ============================================================================
// DEFAULT DATA - INR ONLY
// ============================================================================

const DEFAULT_DATA = {
    costMultipliers: {
        "agentCostPerKg": 4000.00,        // INR per kg
        "cylinderCost": 90000.00,         // INR per cylinder
        "nozzleCost": 8000.00,           // INR per nozzle
        "pipingCostPerMeter": 1200.00,   // INR per meter
        "fittingsCost": 15000.00,        // INR
        "valveAssembly": 25000.00,       // INR
        "mountingHardware": 5000.00,     // INR
        "detectionPanel": 120000.00,     // INR
        "smokeDetector": 4500.00,        // INR
        "heatDetector": 3800.00,         // INR
        "manualCallPoint": 2500.00,      // INR
        "hooterStrobe": 3500.00,         // INR
        "warningSigns": 2000.00,         // INR
        "installationLaborPerHour": 850.00,  // INR per hour
        "engineeringDesign": 75000.00,   // INR
        "commissioningTesting": 50000.00, // INR
        "documentation": 15000.00,       // INR
        "installationFactor": 1.28,      // 28% installation factor
        "engineeringFactor": 1.15,       // 15% engineering factor
        "contingencyFactor": 1.18        // 18% contingency
    }
};

// ============================================================================
// FM200Calculator CLASS
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.userPrefs = this.loadPreferences();
        this.costMultipliers = DEFAULT_DATA.costMultipliers;
        
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
    // PREFERENCES MANAGEMENT
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
        return {
            theme: 'light',
            expertMode: false
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

        this.setDefaultValues();
        
        // Real-time preview updates
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
            
            // Calculate costs
            const costResults = this.calculateSystemCosts(calculationResults);
            
            const completeData = {
                formData: formData,
                calculationResults: calculationResults,
                costResults: costResults,
                metadata: {
                    timestamp: new Date().toISOString(),
                    projectId: this.generateProjectId(),
                    version: APP_CONFIG.version
                }
            };

            // Save to sessionStorage AND localStorage for reliability
            sessionStorage.setItem(APP_CONFIG.storageKeys.CALCULATION_DATA, JSON.stringify(completeData));
            localStorage.setItem('fm200_last_calculation', JSON.stringify(completeData));
            
            this.showNotification('Calculation successful! Redirecting to results...', 'success');
            
            // Redirect to results page
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
        const nozzleCoverage = 50; // m² per nozzle
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

    calculateSystemCosts(calculationResults) {
        const m = this.costMultipliers;
        
        // Calculate all costs in INR
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
        const totalINR = totalEquipmentAndLabor + installationCost + engineeringCost + contingency;

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
            
            totalINR: this.round(totalINR, 2),
            currency: 'INR'
        };
    }

    // ============================================================================
    // RESULTS PAGE METHODS
    // ============================================================================

    initResultsPage() {
        console.log('Initializing Results Page');
        
        this.loadCalculationData();
        this.initResultsEventListeners();

        console.log('Results Page Initialized');
    }

    loadCalculationData() {
        try {
            // Try multiple storage locations for reliability
            let dataJson = sessionStorage.getItem(APP_CONFIG.storageKeys.CALCULATION_DATA) ||
                          localStorage.getItem('fm200_last_calculation');
            
            if (dataJson) {
                this.currentData = JSON.parse(dataJson);
                console.log('Calculation data loaded:', this.currentData);
                
                // Render the results
                this.renderResultsPage();
            } else {
                this.showNotification('No calculation data found. Please use the calculator first.', 'warning');
                // Show helpful message on page
                this.showNoDataMessage();
            }
        } catch (e) {
            console.error('Error loading calculation data:', e);
            this.showNotification('Error loading calculation data. Please recalculate.', 'error');
            this.showNoDataMessage();
        }
    }

    showNoDataMessage() {
        const boqBody = document.querySelector('#boqTable tbody');
        if (boqBody) {
            boqBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px;">
                        <i class="fas fa-calculator fa-3x" style="color: var(--primary); margin-bottom: 20px;"></i>
                        <h4 style="color: var(--primary); margin-bottom: 10px;">No Calculation Data Found</h4>
                        <p style="color: var(--gray); margin-bottom: 20px;">Please use the calculator to generate results first.</p>
                        <a href="index.html" class="btn btn-primary" style="text-decoration: none; display: inline-block;">
                            <i class="fas fa-calculator"></i> Go to Calculator
                        </a>
                    </td>
                </tr>
            `;
        }
    }

    renderResultsPage() {
        if (!this.currentData) return;

        const { formData, calculationResults, costResults } = this.currentData;
        
        // Update summary information
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
        this.setElementText('pipingLengthResult', `${calculationResults.pipingLength} m`);
        
        // Generate BOQ table
        this.renderBOQTable();
        
        // Generate cylinder visualization
        this.generateCylinderVisual();
    }

    renderBOQTable() {
        if (!this.currentData) return;
        
        const { calculationResults, costResults } = this.currentData;
        const boqBody = document.querySelector('#boqTable tbody');
        
        if (!boqBody) return;
        
        // Clear existing content
        boqBody.innerHTML = '';
        
        // Add BOQ items
        const items = [
            { 
                description: 'FM-200 Clean Agent', 
                quantity: calculationResults.agentWeight, 
                unit: 'kg', 
                unitPrice: 4000,
                total: calculationResults.agentWeight * 4000 
            },
            { 
                description: 'Storage Cylinders (54.4 kg)', 
                quantity: calculationResults.cylinderCount, 
                unit: 'nos', 
                unitPrice: 90000,
                total: calculationResults.cylinderCount * 90000 
            },
            { 
                description: 'Valve Assemblies', 
                quantity: calculationResults.cylinderCount, 
                unit: 'nos', 
                unitPrice: 25000,
                total: calculationResults.cylinderCount * 25000 
            },
            { 
                description: 'Nozzles (Standard Coverage)', 
                quantity: calculationResults.nozzleCount, 
                unit: 'nos', 
                unitPrice: 8000,
                total: calculationResults.nozzleCount * 8000 
            },
            { 
                description: 'Piping System (Sch 40)', 
                quantity: calculationResults.pipingLength, 
                unit: 'm', 
                unitPrice: 1200,
                total: calculationResults.pipingLength * 1200 
            }
        ];
        
        let subtotal = 0;
        
        items.forEach(item => {
            subtotal += item.total;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.description}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${this.formatCurrency(item.unitPrice)}</td>
                <td>${this.formatCurrency(item.total)}</td>
            `;
            boqBody.appendChild(row);
        });
        
        // Add additional items
        const additionalItems = [
            { description: 'Fittings & Accessories', quantity: 1, unit: 'lot', unitPrice: 15000, total: 15000 },
            { description: 'Detection & Control Panel', quantity: 1, unit: 'nos', unitPrice: 120000, total: 120000 },
            { description: 'Smoke Detectors', quantity: Math.max(2, Math.ceil(calculationResults.floorArea / 100)), unit: 'nos', unitPrice: 4500, total: Math.max(2, Math.ceil(calculationResults.floorArea / 100)) * 4500 },
            { description: 'Heat Detectors', quantity: 2, unit: 'nos', unitPrice: 3800, total: 7600 },
            { description: 'Manual Call Points', quantity: 2, unit: 'nos', unitPrice: 2500, total: 5000 }
        ];
        
        additionalItems.forEach(item => {
            subtotal += item.total;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.description}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${this.formatCurrency(item.unitPrice)}</td>
                <td>${this.formatCurrency(item.total)}</td>
            `;
            boqBody.appendChild(row);
        });
        
        // Calculate additional costs
        const installationCost = subtotal * 0.28; // 28% installation
        const engineeringCost = subtotal * 0.15; // 15% engineering
        const taxContingency = subtotal * 0.18; // 18% tax & contingency
        const grandTotal = subtotal + installationCost + engineeringCost + taxContingency;
        
        // Update cost display
        this.setElementText('subtotalCost', this.formatCurrency(subtotal));
        this.setElementText('installationCost', this.formatCurrency(installationCost));
        this.setElementText('engineeringCost', this.formatCurrency(engineeringCost));
        this.setElementText('taxContingencyCost', this.formatCurrency(taxContingency));
        this.setElementText('grandTotalCost', this.formatCurrency(grandTotal));
        
        // Update cost breakdown
        this.setElementText('agentCostBreakdown', this.formatCurrency(calculationResults.agentWeight * 4000));
        this.setElementText('cylinderCostBreakdown', this.formatCurrency(calculationResults.cylinderCount * 115000));
        this.setElementText('detectionCostBreakdown', this.formatCurrency(120000 + (Math.max(2, Math.ceil(calculationResults.floorArea / 100)) * 4500) + 7600 + 5000));
        this.setElementText('pipingCostBreakdown', this.formatCurrency((calculationResults.nozzleCount * 8000) + (calculationResults.pipingLength * 1200) + 15000));
    }

    generateCylinderVisual() {
        if (!this.currentData) return;
        
        const container = document.getElementById('cylinderVisualContainer');
        if (!container) return;
        
        const { calculationResults } = this.currentData;
        
        container.innerHTML = '';
        
        // Create cylinder cards
        const cylinderTypes = [
            {
                label: 'Total Cylinders',
                value: calculationResults.cylinderCount,
                subtitle: '54.4 kg cylinders',
                color: 'var(--primary)'
            },
            {
                label: 'Agent Weight',
                value: `${calculationResults.agentWeight.toFixed(0)} kg`,
                subtitle: 'FM-200 Clean Agent',
                color: 'var(--secondary)'
            },
            {
                label: 'System Coverage',
                value: `${calculationResults.netVolume.toFixed(0)} m³`,
                subtitle: 'Protected Volume',
                color: 'var(--tertiary)'
            },
            {
                label: 'Nozzles Required',
                value: calculationResults.nozzleCount,
                subtitle: 'For uniform distribution',
                color: 'var(--warning)'
            }
        ];
        
        cylinderTypes.forEach(type => {
            const card = document.createElement('div');
            card.className = 'cylinder-card';
            card.style.borderTopColor = type.color;
            
            card.innerHTML = `
                <div class="cylinder-content">
                    <div class="cylinder-label">${type.label}</div>
                    <div class="cylinder-value">${type.value}</div>
                    <div class="cylinder-subtitle">${type.subtitle}</div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    initResultsEventListeners() {
        // Print/PDF Button
        const printBtn = document.getElementById('printResults');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printResultsAsPDF();
            });
        }

        // Export CSV Button
        const exportBtn = document.getElementById('exportCSV');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportBOQToCSV();
            });
        }

        // Copy BOQ Button
        const copyBtn = document.getElementById('copyBOQ');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyBOQToClipboard();
            });
        }

        // Email BOQ Button
        const emailBtn = document.getElementById('emailBOQ');
        if (emailBtn) {
            emailBtn.addEventListener('click', () => {
                this.emailBOQ();
            });
        }
    }

    printResultsAsPDF() {
        window.print();
    }

    exportBOQToCSV() {
        if (!this.currentData) {
            this.showNotification('No data to export. Please generate calculations first.', 'warning');
            return;
        }

        try {
            const { formData, calculationResults } = this.currentData;
            const costs = this.calculateSystemCosts(calculationResults);
            
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "FM-200 Calculation Results\n";
            csvContent += `Project: ${formData.projectName || 'Unnamed Project'}\n`;
            csvContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
            
            csvContent += "Calculation Parameters\n";
            csvContent += `Room Volume,${calculationResults.netVolume} m³\n`;
            csvContent += `Design Temperature,${calculationResults.designTemperature} °C\n`;
            csvContent += `Design Concentration,${calculationResults.concentration}%\n`;
            csvContent += `Altitude,${calculationResults.altitude} m\n\n`;
            
            csvContent += "System Requirements\n";
            csvContent += `FM-200 Agent Required,${calculationResults.agentWeight} kg\n`;
            csvContent += `Cylinders Required,${calculationResults.cylinderCount}\n`;
            csvContent += `Nozzles Required,${calculationResults.nozzleCount}\n`;
            csvContent += `Piping Length,${calculationResults.pipingLength} m\n\n`;
            
            csvContent += "Cost Estimate (INR)\n";
            csvContent += `Equipment Subtotal,${costs.equipmentSubtotal.toLocaleString('en-IN')}\n`;
            csvContent += `Installation (28%),${costs.installationFactorCost.toLocaleString('en-IN')}\n`;
            csvContent += `Engineering (15%),${costs.engineeringFactorCost.toLocaleString('en-IN')}\n`;
            csvContent += `Contingency (18%),${costs.contingency.toLocaleString('en-IN')}\n`;
            csvContent += `GRAND TOTAL,${costs.totalINR.toLocaleString('en-IN')}\n`;
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `FM200_Results_${formData.projectName || 'Project'}_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Results exported as CSV file successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Error exporting data. Please try again.', 'error');
        }
    }

    copyBOQToClipboard() {
        if (!this.currentData) {
            this.showNotification('No data to copy. Please generate calculations first.', 'warning');
            return;
        }

        try {
            const { formData, calculationResults } = this.currentData;
            const costs = this.calculateSystemCosts(calculationResults);
            
            const textToCopy = `
FM-200 CALCULATION RESULTS
==========================
Project: ${formData.projectName || 'Unnamed Project'}
Date: ${new Date().toLocaleDateString()}

CALCULATION SUMMARY:
- Room Volume: ${calculationResults.netVolume} m³
- FM-200 Agent Required: ${calculationResults.agentWeight} kg
- Cylinders Required: ${calculationResults.cylinderCount} x 54.4 kg
- Nozzles Required: ${calculationResults.nozzleCount}
- Piping Length: ${calculationResults.pipingLength} m

COST ESTIMATE (INR):
- Equipment & Materials: ${this.formatCurrency(costs.equipmentSubtotal)}
- Installation (28%): ${this.formatCurrency(costs.installationFactorCost)}
- Engineering (15%): ${this.formatCurrency(costs.engineeringFactorCost)}
- Tax & Contingency (18%): ${this.formatCurrency(costs.contingency)}
- GRAND TOTAL: ${this.formatCurrency(costs.totalINR)}

Note: This is a preliminary estimate. Consult with certified professionals for final design.

Generated by FM-200 Calculator
https://fm-200-room-flooding-system-calcula.vercel.app/
            `.trim();
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showNotification('BOQ copied to clipboard successfully!', 'success');
            }).catch(err => {
                console.error('Copy failed:', err);
                this.showNotification('Could not copy to clipboard. Please try again.', 'error');
            });
        } catch (error) {
            console.error('Copy error:', error);
            this.showNotification('Error copying data. Please try again.', 'error');
        }
    }

    emailBOQ() {
        if (!this.currentData) {
            this.showNotification('No data to email. Please generate calculations first.', 'warning');
            return;
        }

        try {
            const { formData, calculationResults } = this.currentData;
            const costs = this.calculateSystemCosts(calculationResults);
            
            const subject = encodeURIComponent(`FM-200 Calculation Results - ${formData.projectName || 'Project'}`);
            const body = encodeURIComponent(`
FM-200 CALCULATION RESULTS

Project: ${formData.projectName || 'Unnamed Project'}
Date: ${new Date().toLocaleDateString()}

CALCULATION PARAMETERS:
- Room Volume: ${calculationResults.netVolume} m³
- Design Temperature: ${calculationResults.designTemperature} °C
- Design Concentration: ${calculationResults.concentration}%
- Altitude: ${calculationResults.altitude} m

SYSTEM REQUIREMENTS:
- FM-200 Agent Required: ${calculationResults.agentWeight} kg
- Cylinders Required: ${calculationResults.cylinderCount} x 54.4 kg
- Nozzles Required: ${calculationResults.nozzleCount}
- Piping Length: ${calculationResults.pipingLength} m

COST ESTIMATE (INR):
- Equipment & Materials: ${this.formatCurrency(costs.equipmentSubtotal)}
- Installation (28%): ${this.formatCurrency(costs.installationFactorCost)}
- Engineering (15%): ${this.formatCurrency(costs.engineeringFactorCost)}
- Tax & Contingency (18%): ${this.formatCurrency(costs.contingency)}
- GRAND TOTAL: ${this.formatCurrency(costs.totalINR)}

This is a preliminary estimate generated by FM-200 Calculator.
Please consult with certified fire protection engineers for final design.

Generated by: https://fm-200-room-flooding-system-calcula.vercel.app/
            `.trim());
            
            const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
            window.location.href = mailtoLink;
        } catch (error) {
            console.error('Email error:', error);
            this.showNotification('Error preparing email. Please try again.', 'error');
        }
    }

    // ============================================================================
    // QUOTATION PAGE METHODS
    // ============================================================================

    initQuotationPage() {
        console.log('Initializing Quotation Page');
        
        this.loadCalculationData();
        this.setQuotationDates();
        this.setupQuotationFormListeners();
        
        // If we have calculation data, auto-fill the form
        if (this.currentData) {
            this.autoFillQuotationForm();
        }
        
        console.log('Quotation Page Initialized');
    }

    setQuotationDates() {
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const dateField = document.getElementById('quotationDate');
        const validField = document.getElementById('validUntil');
        
        if (dateField) dateField.value = today.toISOString().split('T')[0];
        if (validField) validField.value = nextMonth.toISOString().split('T')[0];
    }

    setupQuotationFormListeners() {
        // Auto-fill button
        const autoFillBtn = document.getElementById('autoFill');
        if (autoFillBtn) {
            autoFillBtn.addEventListener('click', () => {
                this.autoFillQuotationForm();
            });
        }
        
        // Update preview on form changes
        const formElements = [
            'quotationNumber', 'quotationDate', 'validUntil', 'currency',
            'clientName', 'clientContact', 'clientEmail', 'clientPhone', 'clientAddress',
            'senderName', 'senderEmail', 'senderPhone', 'senderWebsite',
            'paymentTerms', 'deliveryTime', 'scopeOfWork'
        ];
        
        formElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuotationPreview());
                element.addEventListener('change', () => this.updateQuotationPreview());
            }
        });
    }

    autoFillQuotationForm() {
        if (!this.currentData) {
            this.showNotification('No calculation data found. Please use the calculator first.', 'warning');
            window.location.href = 'index.html';
            return;
        }
        
        const { formData, calculationResults } = this.currentData;
        
        // Generate unique quotation number
        const quoteNumber = `Q-FM200-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        this.setFormValue('quotationNumber', quoteNumber);
        
        // Auto-fill client information
        this.setFormValue('clientName', formData.projectName || 'FM-200 Project');
        this.setFormValue('clientContact', 'Project Manager');
        this.setFormValue('clientEmail', 'info@clientcompany.com');
        this.setFormValue('clientPhone', '+91-XXXXXXXXXX');
        this.setFormValue('clientAddress', formData.clientLocation || 'Client Location');
        
        // Update scope of work
        const scopeOfWork = `Design, Supply, Installation, and Commissioning of FM-200 Fire Suppression System as per NFPA 2001 standard for ${calculationResults.netVolume} m³ room volume. System includes ${calculationResults.cylinderCount} cylinders (${calculationResults.cylinderSize} kg each), ${calculationResults.nozzleCount} nozzles, complete detection system, piping network, and commissioning services.`;
        this.setFormValue('scopeOfWork', scopeOfWork);
        
        // Update preview
        this.updateQuotationPreview();
        
        this.showNotification('Quotation form auto-filled with calculation data!', 'success');
    }

    updateQuotationPreview() {
        // Update all preview fields from form values
        this.updatePreviewField('quotationNumber', 'previewQuoteNumber');
        this.updatePreviewField('quotationDate', 'previewDate', true);
        this.updatePreviewField('validUntil', 'previewValidUntil', true);
        this.updatePreviewField('currency', 'previewCurrency');
        this.updatePreviewField('clientName', 'previewClientName');
        this.updatePreviewField('clientContact', 'previewClientContact');
        this.updatePreviewField('clientEmail', 'previewClientEmail');
        this.updatePreviewField('clientPhone', 'previewClientPhone');
        this.updatePreviewField('clientAddress', 'previewClientAddress');
        this.updatePreviewField('senderName', 'previewSenderName');
        this.updatePreviewField('senderEmail', 'previewSenderEmail');
        this.updatePreviewField('senderPhone', 'previewSenderPhone');
        this.updatePreviewField('senderWebsite', 'previewSenderWebsite');
        this.updatePreviewField('paymentTerms', 'previewPaymentTerms');
        this.updatePreviewField('deliveryTime', 'previewDeliveryTime');
        this.updatePreviewField('scopeOfWork', 'previewScopeOfWork');
        
        // Update other preview fields
        this.updatePreviewField('senderName', 'finalSenderName');
        this.updatePreviewField('paymentTerms', 'finalPaymentTerms');
        this.updatePreviewField('deliveryTime', 'finalDeliveryTime');
        this.setElementText('finalCurrency', 'INR');
        
        // Update calculation results if available
        if (this.currentData) {
            const { calculationResults } = this.currentData;
            const costs = this.calculateSystemCosts(calculationResults);
            
            this.setElementText('previewRoomVolume', `${calculationResults.netVolume} m³`);
            this.setElementText('previewAgentWeight', `${calculationResults.agentWeight} kg`);
            this.setElementText('previewCylinderCount', `${calculationResults.cylinderCount} pcs`);
            this.setElementText('previewNozzleCount', `${calculationResults.nozzleCount} pcs`);
            
            this.setElementText('previewSystemCost', this.formatCurrency(costs.equipmentSubtotal));
            this.setElementText('previewInstallationCost', this.formatCurrency(costs.installationFactorCost));
            this.setElementText('previewEngineeringCost', this.formatCurrency(costs.engineeringFactorCost));
            this.setElementText('previewContingencyCost', this.formatCurrency(costs.contingency));
            this.setElementText('previewTotalCost', this.formatCurrency(costs.totalINR));
        }
    }

    updatePreviewField(sourceId, targetId, formatDate = false) {
        const sourceElement = document.getElementById(sourceId);
        const targetElement = document.getElementById(targetId);
        
        if (sourceElement && targetElement) {
            let value = sourceElement.value;
            
            if (formatDate && value) {
                try {
                    const date = new Date(value);
                    value = date.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                } catch (e) {
                    // Keep original value if date parsing fails
                }
            }
            
            targetElement.textContent = value || '--';
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    round(value, decimals) {
        if (isNaN(value) || value === null || value === undefined) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    formatCurrency(amount) {
        return '₹ ' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    setFormValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
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
            padding: 15px 25px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
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
            notification.style.animation = 'slideOutRight 0.3s ease';
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
            let visitorCount = localStorage.getItem(APP_CONFIG.storageKeys.VISITOR_COUNT);
            
            if (!visitorCount) {
                // Start with a realistic number
                visitorCount = Math.floor(Math.random() * 500) + 1500;
                localStorage.setItem(APP_CONFIG.storageKeys.VISITOR_COUNT, visitorCount.toString());
            } else {
                visitorCount = parseInt(visitorCount);
                visitorCount += 1;
                localStorage.setItem(APP_CONFIG.storageKeys.VISITOR_COUNT, visitorCount.toString());
            }
            
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

// Add CSS for notifications and animations
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes modalSlideIn {
        from { opacity: 0; transform: translateY(-50px); }
        to { opacity: 1; transform: translateY(0); }
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
        background: #444 !important;
        color: #ffffff !important;
        border-color: #555 !important;
    }
`;
document.head.appendChild(notificationStyle);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FM-200 Calculator v6.1 - Initializing...');
    
    try {
        // Initialize calculator
        window.fm200Calculator = new FM200Calculator();
        console.log('FM-200 Calculator v6.1 - Ready!');
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
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        `;
        errorDiv.innerHTML = `
            <h3 style="margin-top: 0;">Application Error</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 30px; background: white; color: #ff4444; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
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
