// Configuration and Data Management
const APP_CONFIG = {
    version: '2.0.2', // Updated version
    lastUpdated: '2024-01-16',
    defaultCurrency: 'USD',
    calculationMethod: 'NFPA2001',
    units: {
        volume: 'm³',
        weight: 'kg',
        temperature: '°C',
        length: 'm'
    }
};

// Data Storage Keys
const STORAGE_KEYS = {
    BUDGET_DATA: 'fm200_budget_data',
    USER_PREFERENCES: 'fm200_user_prefs',
    SAVED_TEMPLATES: 'fm200_saved_templates'
};

// Initialize Application
class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.configData = null;
        this.userPreferences = this.loadPreferences();
        this.costChart = null;
        this.initializeApp();
    }

    // Initialize application
    async initializeApp() {
        // Load configuration data
        await this.loadConfigData();
        
        // Initialize based on current page
        if (document.getElementById('budgetForm')) {
            this.initInputPage();
        } else if (document.getElementById('calculationResults')) {
            this.initResultsPage();
        } else if (document.getElementById('quotationForm')) {
            this.initQuotationPage();
        }
        
        // Initialize common features
        this.initThemeToggle();
        this.initExpertMode();
        this.initTooltips();
        this.initQuickPreview();
    }

    // Load configuration data from data.json
    async loadConfigData() {
        try {
            const response = await fetch('data.json');
            this.configData = await response.json();
            console.log('Configuration data loaded successfully');
        } catch (error) {
            console.error('Failed to load config data:', error);
            // Fallback to default data
            this.configData = {
                exchangeRates: { USD: 1, EUR: 0.92, INR: 83.5, AED: 3.67 },
                costMultipliers: {
                    agentCostPerKg: 48.5,
                    cylinderCost: 1250,
                    nozzleCost: 175,
                    pipingCostPerMeter: 45,
                    detectionSystem: 1800,
                    actuationDevice: 450,
                    controlPanel: 2200,
                    warningSigns: 85,
                    installationLabor: 3200,
                    documentation: 450,
                    installationFactor: 1.28,
                    engineeringFactor: 1.15
                }
            };
        }
    }

    // Load user preferences
    loadPreferences() {
        const prefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        return prefs ? JSON.parse(prefs) : {
            theme: 'light',
            expertMode: false,
            currency: 'USD',
            autoSave: true
        };
    }

    // Save user preferences
    savePreferences() {
        localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(this.userPreferences));
    }

    // Initialize input page
    initInputPage() {
        const form = document.getElementById('budgetForm');
        const resetBtn = document.getElementById('resetBtn');
        const saveTemplateBtn = document.getElementById('saveTemplate');

        // Set default values from preferences
        if (this.userPreferences.currency) {
            document.getElementById('currency').value = this.userPreferences.currency;
        }

        // Load saved template if exists
        this.loadSavedTemplate();

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Reset button
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all inputs?')) {
                form.reset();
                sessionStorage.removeItem(STORAGE_KEYS.BUDGET_DATA);
                this.updateQuickPreview();
            }
        });

        // Save template button
        saveTemplateBtn.addEventListener('click', () => {
            this.saveAsTemplate();
        });

        // Real-time input validation
        ['roomLength', 'roomWidth', 'roomHeight'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => {
                this.validateInput(input);
                this.updateQuickPreview();
            });
        });

        // Expert mode toggle
        const expertToggle = document.getElementById('expertMode');
        if (expertToggle) {
            expertToggle.addEventListener('click', () => {
                this.toggleExpertMode();
            });

            // Initialize expert mode state
            if (this.userPreferences.expertMode) {
                document.body.classList.add('expert-mode');
                expertToggle.innerHTML = '<i class="fas fa-user-cog"></i> Expert Mode (ON)';
                expertToggle.classList.add('active');
            }
        }

        // Initialize quick preview
        this.updateQuickPreview();
    }

    // Handle form submission
    handleFormSubmit() {
        try {
            const formData = this.collectFormData();
            const calculationResults = this.calculateFM200(formData);
            const costResults = this.calculateCosts(calculationResults, formData.currency);

            // Store all data
            this.currentData = {
                formData,
                calculationResults,
                costResults,
                timestamp: new Date().toISOString(),
                projectId: this.generateProjectId()
            };

            // Save to session storage
            sessionStorage.setItem(STORAGE_KEYS.BUDGET_DATA, JSON.stringify(this.currentData));

            // Update user preferences
            this.userPreferences.currency = formData.currency;
            this.savePreferences();

            // Show success message and redirect
            this.showNotification('Calculation completed successfully!', 'success');
            
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 1000);

        } catch (error) {
            console.error('Calculation error:', error);
            this.showNotification('Error in calculation. Please check your inputs.', 'error');
        }
    }

    // Collect form data
    collectFormData() {
        const formData = {
            roomLength: parseFloat(document.getElementById('roomLength').value),
            roomWidth: parseFloat(document.getElementById('roomWidth').value),
            roomHeight: parseFloat(document.getElementById('roomHeight').value),
            equipmentVolume: parseFloat(document.getElementById('equipmentVolume')?.value) || 0,
            minTemperature: parseFloat(document.getElementById('minTemperature').value),
            altitude: parseFloat(document.getElementById('altitude')?.value) || 0,
            projectName: document.getElementById('projectName').value || 'FM-200 Project',
            clientLocation: document.getElementById('clientLocation').value,
            currency: document.getElementById('currency').value,
            safetyFactor: parseInt(document.getElementById('safetyFactor').value) / 100,
            cylinderSize: parseFloat(document.getElementById('cylinderSize').value)
        };

        // Validate required fields
        if (!formData.roomLength || !formData.roomWidth || !formData.roomHeight || !formData.clientLocation) {
            throw new Error('Please fill all required fields');
        }

        // Validate dimensions
        if (formData.roomLength <= 0 || formData.roomWidth <= 0 || formData.roomHeight <= 0) {
            throw new Error('Room dimensions must be greater than zero');
        }

        return formData;
    }

    // Core FM-200 Calculation
    calculateFM200(formData) {
        const { roomLength, roomWidth, roomHeight, equipmentVolume, minTemperature, altitude, safetyFactor, cylinderSize } = formData;

        // Calculate volumes
        const grossVolume = roomLength * roomWidth * roomHeight;
        const netVolume = Math.max(0, grossVolume - equipmentVolume);

        // Calculate specific vapor volume (S) - NFPA 2001 formula
        const specificVaporVolume = 0.1269 + (0.0005 * minTemperature);

        // Calculate agent weight using NFPA formula
        const concentration = this.configData?.technicalSpecs?.nfpaRequirements?.minConcentration || 7.0;
        let agentWeight = (netVolume / specificVaporVolume) * (concentration / (100 - concentration));

        // Apply altitude correction
        if (altitude > 500) {
            const altitudeFactor = 1 + (altitude / 10000);
            agentWeight *= altitudeFactor;
        }

        // Apply safety factor
        agentWeight *= safetyFactor;

        // Calculate cylinder count
        const cylinderCount = Math.ceil(agentWeight / cylinderSize);

        // Calculate number of nozzles (based on coverage area)
        const floorArea = roomLength * roomWidth;
        const nozzleCoverage = 50; // m² per nozzle (adjustable)
        const nozzleCount = Math.max(2, Math.ceil(floorArea / nozzleCoverage));

        // Calculate piping length (estimated)
        const pipingLength = (roomLength + roomWidth) * 2 + roomHeight * 2;

        return {
            agentWeight: parseFloat(agentWeight.toFixed(2)),
            netVolume: parseFloat(netVolume.toFixed(2)),
            grossVolume: parseFloat(grossVolume.toFixed(2)),
            cylinderCount,
            nozzleCount,
            cylinderSize: cylinderSize,
            pipingLength: parseFloat(pipingLength.toFixed(2)),
            specificVaporVolume: parseFloat(specificVaporVolume.toFixed(4)),
            concentration,
            floorArea: parseFloat(floorArea.toFixed(2))
        };
    }

    // Calculate Costs
    calculateCosts(calculationResults, currency) {
        const multipliers = this.configData.costMultipliers;

        // Base costs in USD
        const agentCost = calculationResults.agentWeight * multipliers.agentCostPerKg;
        const cylinderCost = calculationResults.cylinderCount * multipliers.cylinderCost;
        const nozzleCost = calculationResults.nozzleCount * multipliers.nozzleCost;
        const pipingCost = calculationResults.pipingLength * multipliers.pipingCostPerMeter;
        const detectionCost = multipliers.detectionSystem;
        const actuationCost = calculationResults.cylinderCount * multipliers.actuationDevice;
        const controlPanelCost = multipliers.controlPanel;
        const warningSignsCost = multipliers.warningSigns;
        const installationLaborCost = multipliers.installationLabor;
        const documentationCost = multipliers.documentation;

        // Subtotal
        const equipmentSubtotal = agentCost + cylinderCost + nozzleCost + pipingCost + 
                                 detectionCost + actuationCost + controlPanelCost + warningSignsCost;

        // Add installation and engineering
        const installationCost = (equipmentSubtotal + installationLaborCost) * (multipliers.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (multipliers.engineeringFactor - 1);

        // Total in USD
        const totalCostUSD = equipmentSubtotal + installationCost + engineeringCost + 
                           installationLaborCost + documentationCost;

        // Convert to selected currency
        const exchangeRate = this.configData.exchangeRates[currency] || 1;
        const totalCostConverted = totalCostUSD * exchangeRate;

        return {
            agentCost: parseFloat(agentCost.toFixed(2)),
            cylinderCost: parseFloat(cylinderCost.toFixed(2)),
            nozzleCost: parseFloat(nozzleCost.toFixed(2)),
            pipingCost: parseFloat(pipingCost.toFixed(2)),
            detectionCost: parseFloat(detectionCost.toFixed(2)),
            actuationCost: parseFloat(actuationCost.toFixed(2)),
            controlPanelCost: parseFloat(controlPanelCost.toFixed(2)),
            warningSignsCost: parseFloat(warningSignsCost.toFixed(2)),
            installationLaborCost: parseFloat(installationLaborCost.toFixed(2)),
            documentationCost: parseFloat(documentationCost.toFixed(2)),
            equipmentSubtotal: parseFloat(equipmentSubtotal.toFixed(2)),
            installationCost: parseFloat(installationCost.toFixed(2)),
            engineeringCost: parseFloat(engineeringCost.toFixed(2)),
            totalCostUSD: parseFloat(totalCostUSD.toFixed(2)),
            totalCostConverted: parseFloat(totalCostConverted.toFixed(2)),
            exchangeRate: exchangeRate // Critical for currency conversion
        };
    }

    // Utility to generate unique ID
    generateProjectId() {
        return `FM200-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    }

    // Utility to show notification
    showNotification(message, type = 'info') {
        let notification = document.getElementById('appNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'appNotification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        let icon = '';
        if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
        else if (type === 'error') icon = '<i class="fas fa-times-circle"></i>';
        else if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';
        else icon = '<i class="fas fa-info-circle"></i>';

        notification.innerHTML = `${icon} ${message}`;
        notification.className = `notification show ${type}`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Initialize theme toggle
    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            const currentTheme = this.userPreferences.theme;
            document.body.setAttribute('data-theme', currentTheme);
            toggleBtn.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

            toggleBtn.addEventListener('click', () => {
                const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.body.setAttribute('data-theme', newTheme);
                this.userPreferences.theme = newTheme;
                this.savePreferences();
                toggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                
                // Update chart colors if exists
                if (this.costChart) {
                    this.updateChartTheme();
                }
            });
        }
    }

    // Update chart theme
    updateChartTheme() {
        if (!this.costChart) return;
        
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        this.costChart.options.plugins.legend.labels.color = isDark ? '#ededed' : '#212529';
        this.costChart.update();
    }

    // Toggle expert mode
    toggleExpertMode() {
        const expertToggle = document.getElementById('expertMode');
        const isExpertMode = document.body.classList.toggle('expert-mode');
        this.userPreferences.expertMode = isExpertMode;
        this.savePreferences();

        if (expertToggle) {
            expertToggle.innerHTML = isExpertMode ? '<i class="fas fa-user-cog"></i> Expert Mode (ON)' : '<i class="fas fa-user-cog"></i> Expert Mode';
            expertToggle.classList.toggle('active', isExpertMode);
        }
    }

    // Initialize tooltips
    initTooltips() {
        const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
        tooltipTriggers.forEach(trigger => {
            const title = trigger.getAttribute('title');
            if (title) {
                trigger.addEventListener('mouseenter', (e) => {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = title;
                    tooltip.style.position = 'absolute';
                    tooltip.style.background = 'var(--primary-color)';
                    tooltip.style.color = 'white';
                    tooltip.style.padding = '0.5rem';
                    tooltip.style.borderRadius = '4px';
                    tooltip.style.fontSize = '0.875rem';
                    tooltip.style.zIndex = '10000';
                    tooltip.style.maxWidth = '300px';
                    
                    const rect = trigger.getBoundingClientRect();
                    tooltip.style.left = rect.left + 'px';
                    tooltip.style.top = (rect.top - 40) + 'px';
                    
                    document.body.appendChild(tooltip);
                    
                    trigger._tooltip = tooltip;
                });
                
                trigger.addEventListener('mouseleave', () => {
                    if (trigger._tooltip) {
                        trigger._tooltip.remove();
                        delete trigger._tooltip;
                    }
                });
            }
        });
    }

    // Validation
    validateInput(inputElement) {
        const value = parseFloat(inputElement.value);
        if (isNaN(value) || value <= 0) {
            inputElement.style.borderColor = 'var(--danger-color)';
            return false;
        }
        inputElement.style.borderColor = '';
        return true;
    }

    // Quick Preview Update
    updateQuickPreview() {
        const preview = document.getElementById('quickPreviewMetrics');
        if (!preview) return;

        const length = parseFloat(document.getElementById('roomLength')?.value) || 0;
        const width = parseFloat(document.getElementById('roomWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('roomHeight')?.value) || 0;

        if (length > 0 && width > 0 && height > 0) {
            const volume = (length * width * height).toFixed(2);
            const area = (length * width).toFixed(2);
            
            // Simplified agent estimation for preview (NFPA standard requires more complexity)
            const estimatedAgent = (volume * 0.73).toFixed(2); 

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
                </div>
                <div class="preview-note">
                    <i class="fas fa-info-circle"></i> Estimated agent requirement: ${estimatedAgent} kg
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-ruler-combined"></i> Enter dimensions to see preview
                </div>
            `;
        }
    }

    // Initialize results page
    initResultsPage() {
        this.loadCurrentData();
        if (!this.currentData) return;

        const { formData, calculationResults, costResults } = this.currentData;
        const currency = formData.currency;

        this.populateCalculationSpecs(formData, calculationResults);
        this.populateBillOfQuantities(calculationResults, costResults, currency);
        this.updateCostChart(costResults, currency);
        this.initPrintButton();
        this.initShareButton(formData, calculationResults);
    }

    // Load data from session storage
    loadCurrentData() {
        const data = sessionStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
        if (data) {
            this.currentData = JSON.parse(data);
        } else {
            // Handle case where no data is present
            this.showNotification('No calculation data found. Redirecting to calculator.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    // Populate the calculation specification section
    populateCalculationSpecs(formData, calculationResults) {
        document.getElementById('displayProjectName').textContent = formData.projectName;
        document.getElementById('displayLocation').textContent = formData.clientLocation;
        document.getElementById('grossVolume').textContent = `${calculationResults.grossVolume} m³`;
        document.getElementById('netVolume').textContent = `${calculationResults.netVolume} m³`;
        document.getElementById('agentQuantity').textContent = `${calculationResults.agentWeight} kg`;
        document.getElementById('cylinderCount').textContent = `${calculationResults.cylinderCount} pcs`;
        document.getElementById('nozzleCount').textContent = `${calculationResults.nozzleCount} pcs`;
        document.getElementById('pipingLength').textContent = `${calculationResults.pipingLength} m`;
        document.getElementById('minConcentration').textContent = `${calculationResults.concentration}%`;
        document.getElementById('minTemp').textContent = `${formData.minTemperature}°C`;
        document.getElementById('altitudeM').textContent = `${formData.altitude} m`;
        document.getElementById('specificVolume').textContent = `${calculationResults.specificVaporVolume} m³/kg`;
        document.getElementById('calculationTimestamp').textContent = `Calculated on: ${new Date(this.currentData.timestamp).toLocaleString()}`;
        
        // Display cylinder size
        const cylinderSizeElem = document.getElementById('cylinderSizeDisplay');
        if (cylinderSizeElem) {
            cylinderSizeElem.textContent = `${calculationResults.cylinderSize} kg`;
        }
    }

    // Populate the Bill of Quantities (BOQ) - Enhanced version
    populateBillOfQuantities(calculationResults, costResults, currency) {
        const boqBody = document.getElementById('boqBody');
        const boqFooter = document.getElementById('boqFooter');
        boqBody.innerHTML = '';
        boqFooter.innerHTML = '';

        // Enhanced BOQ items based on your requirements
        const boqItems = [
            { 
                item: 'FM-200 Agent (HFC-227ea)', 
                desc: 'Zero ODP Clean Agent, stored pressure', 
                qty: calculationResults.agentWeight, 
                unit: 'kg', 
                unitPriceUSD: costResults.agentCost / calculationResults.agentWeight,
                total: costResults.agentCost
            },
            { 
                item: 'Storage Cylinders', 
                desc: `${calculationResults.cylinderSize} kg capacity, PESO/DOT approved`, 
                qty: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPriceUSD: costResults.cylinderCost / calculationResults.cylinderCount,
                total: costResults.cylinderCost 
            },
            { 
                item: 'Actuation Devices', 
                desc: 'Solenoid actuators with manual pull stations', 
                qty: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPriceUSD: costResults.actuationCost / calculationResults.cylinderCount,
                total: costResults.actuationCost 
            },
            { 
                item: 'Discharge Nozzles', 
                desc: 'UL/FM approved brass nozzles', 
                qty: calculationResults.nozzleCount, 
                unit: 'pcs', 
                unitPriceUSD: costResults.nozzleCost / calculationResults.nozzleCount,
                total: costResults.nozzleCost 
            },
            { 
                item: 'Piping & Fittings', 
                desc: 'Schedule 40 seamless steel pipe and fittings', 
                qty: calculationResults.pipingLength, 
                unit: 'm', 
                unitPriceUSD: costResults.pipingCost / calculationResults.pipingLength,
                total: costResults.pipingCost 
            },
            { 
                item: 'Detection System', 
                desc: 'Smoke/heat detectors with cross-zoning', 
                qty: 1, 
                unit: 'set', 
                unitPriceUSD: costResults.detectionCost,
                total: costResults.detectionCost
            },
            { 
                item: 'Control Panel', 
                desc: 'Dedicated fire alarm and release panel', 
                qty: 1, 
                unit: 'set', 
                unitPriceUSD: costResults.controlPanelCost,
                total: costResults.controlPanelCost
            },
            { 
                item: 'Warning Signs', 
                desc: '"Gas Release In Progress" signage', 
                qty: 1, 
                unit: 'set', 
                unitPriceUSD: costResults.warningSignsCost,
                total: costResults.warningSignsCost
            }
        ];
        
        // Render items
        boqItems.forEach(item => {
            const row = document.createElement('tr');
            const unitPriceConverted = item.unitPriceUSD * costResults.exchangeRate;
            const totalConverted = item.total * costResults.exchangeRate;

            row.innerHTML = `
                <td>${item.item}</td>
                <td>${item.desc}</td>
                <td>${item.qty.toFixed(item.unit === 'kg' || item.unit === 'm' ? 2 : 0)}</td>
                <td>${item.unit}</td>
                <td class="text-right">${this.formatCurrency(unitPriceConverted, currency)}</td>
                <td class="text-right">${this.formatCurrency(totalConverted, currency)}</td>
            `;
            boqBody.appendChild(row);
        });

        // Render subtotal/totals
        boqFooter.innerHTML = `
            <tr>
                <td colspan="5" class="text-right summary-label">Equipment Subtotal</td>
                <td class="text-right summary-value">${this.formatCurrency(costResults.equipmentSubtotal * costResults.exchangeRate, currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right summary-label">Installation Labor</td>
                <td class="text-right summary-value">${this.formatCurrency(costResults.installationLaborCost * costResults.exchangeRate, currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right summary-label">Engineering & Commissioning</td>
                <td class="text-right summary-value">${this.formatCurrency((costResults.engineeringCost + costResults.installationCost) * costResults.exchangeRate, currency)}</td>
            </tr>
            <tr>
                <td colspan="5" class="text-right summary-label">Documentation & Certifications</td>
                <td class="text-right summary-value">${this.formatCurrency(costResults.documentationCost * costResults.exchangeRate, currency)}</td>
            </tr>
            <tr class="total-row">
                <td colspan="5" class="text-right total-label">Grand Total (${currency})</td>
                <td class="text-right total-value">${this.formatCurrency(costResults.totalCostConverted, currency)}</td>
            </tr>
        `;
    }

    // Initialize print button
    initPrintButton() {
        const printBtn = document.getElementById('printResults');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                // Add print-specific styling
                const style = document.createElement('style');
                style.innerHTML = `
                    @media print {
                        body > *:not(#calculationResults):not(.main-footer) {
                            display: none !important;
                        }
                        .main-content {
                            padding: 0 !important;
                        }
                        .card {
                            box-shadow: none !important;
                            border: 1px solid #000 !important;
                        }
                        .btn, .page-header > div {
                            display: none !important;
                        }
                        .page-header h1 {
                            font-size: 24px !important;
                        }
                        .footer-note {
                            display: block !important;
                        }
                    }
                `;
                document.head.appendChild(style);
                
                window.print();
                
                // Remove style after printing
                setTimeout(() => {
                    document.head.removeChild(style);
                }, 100);
            });
        }
    }

    // Initialize share button
    initShareButton(formData, calculationResults) {
        const shareBtn = document.getElementById('shareResults');
        if (!shareBtn || typeof navigator.share === 'undefined') return;
        
        shareBtn.style.display = 'inline-flex';
        shareBtn.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: `FM-200 Calculation Results - ${formData.projectName}`,
                    text: `FM-200 System: ${calculationResults.agentWeight}kg agent, ${calculationResults.cylinderCount} cylinders required for ${formData.clientLocation}`,
                    url: window.location.href
                });
            } catch (error) {
                console.log('Sharing cancelled:', error);
            }
        });
    }

    // Initialize quotation page
    initQuotationPage() {
        this.loadQuotationData();
        this.initQuotationForm();
        this.initPDFGeneration();
        this.initExcelGeneration();
    }

    // Load quotation data
    loadQuotationData() {
        const data = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.BUDGET_DATA));
        if (!data) {
            this.showNotification('No calculation data found. Please start from the calculator.', 'warning');
            return;
        }
        this.currentData = data;
        this.populateQuotationPreview(data);
    }

    // Initialize quotation form
    initQuotationForm() {
        const form = document.getElementById('quotationForm');
        const today = new Date().toISOString().split('T')[0];
        // Set default date
        document.getElementById('quotationDate').value = today;
        document.getElementById('validUntil').value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        this.loadQuotationFormData(); // Load saved data
        
        // Save quotation form data on change
        ['senderName', 'senderEmail', 'clientName', 'quotationRef', 'quotationDate', 'validUntil'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.saveQuotationFormData();
                });
            }
        });
    }

    // Populate quotation preview
    populateQuotationPreview(data) {
        const { formData, costResults } = data;
        const currency = formData.currency;
        
        document.getElementById('quoteProjectName').textContent = formData.projectName;
        document.getElementById('quoteClientLocation').textContent = formData.clientLocation;
        
        // Populate the BOQ table within the quotation view
        this.populateQuotationTable(data);
    }
    
    // Populate the BOQ table within the quotation view
    populateQuotationTable(data) {
        const { formData, calculationResults, costResults } = data;
        const currency = formData.currency;
        const tableBody = document.getElementById('quotationTableBody');
        const totalElement = document.getElementById('quotationGrandTotal');
        tableBody.innerHTML = '';

        // Enhanced BOQ items for quotation
        const boqItems = [
            { 
                item: 'FM-200 Agent (HFC-227ea)', 
                desc: 'Zero ODP Clean Agent, stored pressure', 
                qty: calculationResults.agentWeight, 
                unit: 'kg', 
                unitPriceUSD: costResults.agentCost / calculationResults.agentWeight,
                total: costResults.agentCost
            },
            { 
                item: 'Storage Cylinders', 
                desc: `${calculationResults.cylinderSize} kg capacity, PESO/DOT approved`, 
                qty: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPriceUSD: costResults.cylinderCost / calculationResults.cylinderCount,
                total: costResults.cylinderCost 
            },
            { 
                item: 'Actuation Devices', 
                desc: 'Solenoid actuators with manual pull stations', 
                qty: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPriceUSD: costResults.actuationCost / calculationResults.cylinderCount,
                total: costResults.actuationCost 
            },
            { 
                item: 'Discharge Nozzles', 
                desc: 'UL/FM approved brass nozzles, adjustable', 
                qty: calculationResults.nozzleCount, 
                unit: 'pcs', 
                unitPriceUSD: costResults.nozzleCost / calculationResults.nozzleCount,
                total: costResults.nozzleCost 
            },
            { 
                item: 'Piping & Fittings', 
                desc: 'Schedule 40 seamless steel pipe and fittings', 
                qty: calculationResults.pipingLength, 
                unit: 'm', 
                unitPriceUSD: costResults.pipingCost / calculationResults.pipingLength,
                total: costResults.pipingCost 
            },
            { 
                item: 'Detection & Control System', 
                desc: 'Addressable panel with smoke/heat detectors', 
                qty: 1, 
                unit: 'set', 
                unitPriceUSD: costResults.detectionCost + costResults.controlPanelCost,
                total: costResults.detectionCost + costResults.controlPanelCost
            },
            { 
                item: 'Warning Signs & Markings', 
                desc: 'Safety signage and cylinder markings', 
                qty: 1, 
                unit: 'set', 
                unitPriceUSD: costResults.warningSignsCost,
                total: costResults.warningSignsCost
            },
            { 
                item: 'Installation Labor', 
                desc: 'Complete system installation and mounting', 
                qty: 1, 
                unit: 'job', 
                unitPriceUSD: costResults.installationLaborCost,
                total: costResults.installationLaborCost
            },
            { 
                item: 'Engineering & Commissioning', 
                desc: 'NFPA 2001 compliance design and testing', 
                qty: 1, 
                unit: 'job', 
                unitPriceUSD: costResults.engineeringCost + costResults.installationCost,
                total: costResults.engineeringCost + costResults.installationCost
            },
            { 
                item: 'Documentation & Certifications', 
                desc: 'OEM certificates and compliance documentation', 
                qty: 1, 
                unit: 'set', 
                unitPriceUSD: costResults.documentationCost,
                total: costResults.documentationCost
            }
        ];
        
        // Render items
        boqItems.forEach(item => {
            const row = document.createElement('tr');
            const unitPriceConverted = item.unitPriceUSD * costResults.exchangeRate;
            const totalConverted = item.total * costResults.exchangeRate;

            row.innerHTML = `
                <td>${item.item}</td>
                <td>${item.desc}</td>
                <td>${item.qty.toFixed(item.unit === 'kg' || item.unit === 'm' ? 2 : 0)}</td>
                <td>${item.unit}</td>
                <td class="text-right">${this.formatCurrency(unitPriceConverted, currency)}</td>
                <td class="text-right">${this.formatCurrency(totalConverted, currency)}</td>
            `;
            tableBody.appendChild(row);
        });

        // Update the grand total element
        totalElement.textContent = this.formatCurrency(costResults.totalCostConverted, currency);
    }

    // Initialize PDF generation
    initPDFGeneration() {
        const pdfBtn = document.getElementById('generatePDF');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                this.generatePDF();
            });
        }
    }

    // Generate PDF
    generatePDF() {
        const pdfBtn = document.getElementById('generatePDF');
        if (!this.currentData) {
            this.showNotification('No data to generate PDF.', 'error');
            return;
        }

        // Check if PDF libraries are available
        if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            this.showNotification('PDF libraries are missing. Please ensure html2canvas and jspdf are loaded.', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const quotationBody = document.getElementById('quotationBody');
        const projectName = document.getElementById('quoteProjectName').textContent;
        const quoteRef = document.getElementById('quotationRef').value || 'QUOTATION-001';
        const fileName = `${quoteRef.replace(/[^a-z0-9]/gi, '_')}_${projectName.replace(/[^a-z0-9]/gi, '_')}_Quotation.pdf`;

        this.showNotification('Generating PDF, please wait...', 'info');
        pdfBtn.disabled = true;

        // Add temporary styling for PDF generation
        const originalStyles = quotationBody.getAttribute('style');
        quotationBody.style.padding = '20px';
        quotationBody.style.background = 'white';

        window.html2canvas(quotationBody, {
            scale: 2,
            useCORS: true,
            logging: false
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Add image to PDF
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
            
            // Add page number
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(10);
                pdf.text(`Page ${i} of ${pageCount}`, pdfWidth - 20, pdf.internal.pageSize.getHeight() - 10);
            }

            pdf.save(fileName);
            
            // Restore original styles
            if (originalStyles) {
                quotationBody.setAttribute('style', originalStyles);
            } else {
                quotationBody.removeAttribute('style');
            }
            
            this.showNotification('PDF generated successfully!', 'success');
            pdfBtn.disabled = false;
        }).catch(error => {
            console.error('Error generating PDF:', error);
            this.showNotification('Failed to generate PDF. Check console for details.', 'error');
            pdfBtn.disabled = false;
            
            // Restore original styles
            if (originalStyles) {
                quotationBody.setAttribute('style', originalStyles);
            } else {
                quotationBody.removeAttribute('style');
            }
        });
    }

    // Initialize Excel generation
    initExcelGeneration() {
        const excelBtn = document.getElementById('generateExcel');
        if (excelBtn) {
            excelBtn.addEventListener('click', () => {
                this.generateExcel();
            });
        }
    }

    // Generate Excel/CSV
    generateExcel() {
        if (!this.currentData) return;
        const { formData, calculationResults, costResults } = this.currentData;
        const projectName = formData.projectName.replace(/[^a-z0-9]/gi, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        
        const boqItems = [
            { item: 'FM-200 Agent (HFC-227ea)', desc: 'Zero ODP Clean Agent, stored pressure', qty: calculationResults.agentWeight, unit: 'kg', unitPrice: costResults.agentCost / calculationResults.agentWeight, total: costResults.agentCost },
            { item: 'Storage Cylinders', desc: `${calculationResults.cylinderSize} kg capacity, PESO/DOT approved`, qty: calculationResults.cylinderCount, unit: 'pcs', unitPrice: costResults.cylinderCost / calculationResults.cylinderCount, total: costResults.cylinderCost },
            { item: 'Actuation Devices', desc: 'Solenoid actuators with manual pull stations', qty: calculationResults.cylinderCount, unit: 'pcs', unitPrice: costResults.actuationCost / calculationResults.cylinderCount, total: costResults.actuationCost },
            { item: 'Discharge Nozzles', desc: 'UL/FM approved brass nozzles', qty: calculationResults.nozzleCount, unit: 'pcs', unitPrice: costResults.nozzleCost / calculationResults.nozzleCount, total: costResults.nozzleCost },
            { item: 'Piping & Fittings', desc: 'Schedule 40 seamless steel pipe and fittings', qty: calculationResults.pipingLength, unit: 'm', unitPrice: costResults.pipingCost / calculationResults.pipingLength, total: costResults.pipingCost },
            { item: 'Detection System', desc: 'Smoke/heat detectors with cross-zoning', qty: 1, unit: 'set', unitPrice: costResults.detectionCost, total: costResults.detectionCost },
            { item: 'Control Panel', desc: 'Dedicated fire alarm and release panel', qty: 1, unit: 'set', unitPrice: costResults.controlPanelCost, total: costResults.controlPanelCost },
            { item: 'Warning Signs', desc: '"Gas Release In Progress" signage', qty: 1, unit: 'set', unitPrice: costResults.warningSignsCost, total: costResults.warningSignsCost },
            { item: 'Installation Labor', desc: 'Complete system installation', qty: 1, unit: 'job', unitPrice: costResults.installationLaborCost, total: costResults.installationLaborCost },
            { item: 'Engineering & Commissioning', desc: 'NFPA 2001 compliance design and testing', qty: 1, unit: 'job', unitPrice: costResults.engineeringCost + costResults.installationCost, total: costResults.engineeringCost + costResults.installationCost },
            { item: 'Documentation & Certifications', desc: 'OEM certificates and compliance documentation', qty: 1, unit: 'set', unitPrice: costResults.documentationCost, total: costResults.documentationCost }
        ];

        // Create CSV content
        let csv = `FM-200 TOTAL FLOODING SYSTEM QUOTATION\n`;
        csv += `Project: ${formData.projectName}\n`;
        csv += `Client Location: ${formData.clientLocation}\n`;
        csv += `Date: ${timestamp}\n`;
        csv += `Base Currency: USD | Selected Currency: ${formData.currency}\n`;
        csv += `Exchange Rate: 1 USD = ${costResults.exchangeRate} ${formData.currency}\n\n`;
        csv += 'Item,Description,Quantity,Unit,Unit Price (USD),Total (USD)\n';
        
        let subtotalUSD = 0;
        boqItems.forEach(item => {
            csv += `"${item.item}","${item.desc}",${item.qty},${item.unit},${item.unitPrice.toFixed(2)},${item.total.toFixed(2)}\n`;
            subtotalUSD += item.total;
        });
        
        csv += `\nEquipment Subtotal,${subtotalUSD.toFixed(2)}\n`;
        csv += `Grand Total (USD),${costResults.totalCostUSD.toFixed(2)}\n`;
        csv += `Grand Total (${formData.currency}),${costResults.totalCostConverted.toFixed(2)}\n`;
        csv += `\nThis quotation is valid until: ${document.getElementById('validUntil')?.value || '30 days from date'}\n`;
        csv += `\nNOTE: Prices are for budgetary estimation only. Final design must be performed by qualified fire protection engineers.\n`;

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${projectName}_FM200_Quotation_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        this.showNotification('Quotation exported to CSV successfully!', 'success');
    }

    // Save quotation form data
    saveQuotationFormData() {
        const formData = {
            senderName: document.getElementById('senderName').value,
            senderEmail: document.getElementById('senderEmail').value,
            clientName: document.getElementById('clientName').value,
            quotationRef: document.getElementById('quotationRef').value,
            quotationDate: document.getElementById('quotationDate').value,
            validUntil: document.getElementById('validUntil').value
        };
        localStorage.setItem('quotation_form_data', JSON.stringify(formData));
    }

    // Load quotation form data
    loadQuotationFormData() {
        const saved = localStorage.getItem('quotation_form_data');
        if (!saved) return;
        const formData = JSON.parse(saved);
        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = formData[key];
            }
        });
    }

    // Format currency
    formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Initialize Chart.js Donut Chart
    initCostChart(currency) {
        const ctx = document.getElementById('costBreakdownChart');
        if (!ctx || !this.currentData) return;

        const { costResults } = this.currentData;
        const data = [
            costResults.agentCost,
            costResults.cylinderCost,
            costResults.nozzleCost + costResults.pipingCost,
            costResults.detectionCost + costResults.controlPanelCost,
            costResults.installationCost + costResults.engineeringCost + costResults.installationLaborCost
        ];

        this.costChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [
                    'Agent Cost',
                    'Cylinder Cost',
                    'Nozzles & Piping',
                    'Detection & Control',
                    'Installation & Engineering'
                ],
                datasets: [{
                    data: data.map(val => val * costResults.exchangeRate),
                    backgroundColor: [
                        '#2c3e50', // Primary
                        '#3498db', // Accent
                        '#2ecc71', // Success
                        '#f39c12', // Warning
                        '#e74c3c'  // Danger
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: document.body.getAttribute('data-theme') === 'dark' ? '#ededed' : '#212529',
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${this.formatCurrency(value, this.currentData?.formData?.currency || 'USD')} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // Update cost chart data
    updateCostChart(costResults, currency) {
        const ctx = document.getElementById('costBreakdownChart');
        if (!ctx) return;
        
        // Re-initialize chart if it doesn't exist
        if (!this.costChart) {
            this.initCostChart(currency);
            return;
        }

        // Update data array with converted currency values
        this.costChart.data.datasets[0].data = [
            costResults.agentCost * costResults.exchangeRate,
            costResults.cylinderCost * costResults.exchangeRate,
            (costResults.nozzleCost + costResults.pipingCost) * costResults.exchangeRate,
            (costResults.detectionCost + costResults.controlPanelCost) * costResults.exchangeRate,
            (costResults.installationCost + costResults.engineeringCost + costResults.installationLaborCost) * costResults.exchangeRate
        ];

        // Update tooltip callback
        this.costChart.options.plugins.tooltip.callbacks.label = (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${this.formatCurrency(value, currency)} (${percentage}%)`;
        };
        
        this.costChart.update();
    }
    
    // Load saved template data from local storage
    loadSavedTemplate() {
        const savedTemplates = localStorage.getItem(STORAGE_KEYS.SAVED_TEMPLATES);
        if (!savedTemplates) return;

        const templates = JSON.parse(savedTemplates);
        if (templates.length === 0) return;

        // For simplicity, load the last saved template
        const lastTemplate = templates[templates.length - 1];
        
        Object.keys(lastTemplate.formData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = lastTemplate.formData[key];
            }
        });
        
        this.updateQuickPreview();
        this.showNotification(`Loaded saved template: ${lastTemplate.formData.projectName}`, 'info');
    }

    // Save current form data as a template
    saveAsTemplate() {
        try {
            const formData = this.collectFormData();
            const template = {
                id: this.generateProjectId(),
                timestamp: new Date().toISOString(),
                formData: formData
            };
            
            let savedTemplates = localStorage.getItem(STORAGE_KEYS.SAVED_TEMPLATES);
            let templates = savedTemplates ? JSON.parse(savedTemplates) : [];
            
            // Limit to 5 templates
            if (templates.length >= 5) {
                templates.shift(); // Remove the oldest one
            }
            templates.push(template);

            localStorage.setItem(STORAGE_KEYS.SAVED_TEMPLATES, JSON.stringify(templates));
            this.showNotification(`Template "${formData.projectName}" saved successfully!`, 'success');

        } catch (error) {
            this.showNotification('Error saving template. Please fill all required fields.', 'error');
        }
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    new FM200Calculator();
});