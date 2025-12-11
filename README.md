# FM-200 Room Flooding System Calculator

A professional web application for calculating FM-200 clean agent fire suppression system requirements, generating bill of quantities, and creating quotations.

## Version 4.0 Updates (Traffic & Design Enhancement)
- **Design Refinement**: Comprehensive updates to `style.css` to fix layout issues and ensure a clean, professional, and fully responsive design across all devices.
- **Affiliate & Traffic Integration**: Added new footer sections for affiliate links (Amazon, Buy Me a Coffee) and a dedicated 'Explore More Tools' section.
- **Analytics & Advertising**: Integrated Google AdSense (Auto-ads) and Google Analytics scripts for monetization and traffic analysis.
- **Enhanced Tool Links**: Added and described links to other specialized safety and utility calculators to drive user traffic.
- **Code Maintenance**: Updated version number and internal developer comments.

## Features

- **Complete FM-200 Calculation**: Uses NFPA 2001 standard formula with altitude and temperature corrections
- **Expert Mode**: Advanced parameters for professional engineers
- **Multi-Currency Support**: USD, EUR, INR, AED with real-time conversion
- **Enhanced Bill of Quantities**: Detailed equipment list with comprehensive pricing
- **PDF/Excel Generation**: Export quotations and BOQs
- **Responsive Design**: Optimized for all devices
- **Dark/Light Mode**: User preference support
- **Data Persistence**: Save calculations and templates
- **OEM Integration**: Links to major suppliers

## Pages

1. **Calculator Page** (`index.html`)
   - Input room dimensions and project details
   - Expert mode for advanced parameters
   - Real-time volume preview

2. **Results Page** (`results.html`)
   - Detailed calculation results
   - Interactive cost breakdown chart
   - Enhanced Bill of quantities table
   - Export options

3. **Quotation Page** (`quotation.html`)
   - Professional quotation form
   - PDF and Excel export with enhanced BOQ
   - Client/sender details

## Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier available)

### Steps (Updated for V4.0)

1. **Create GitHub Repository**
   - Create a new, empty repository on GitHub (e.g., `fm200-calculator-v4`).
   - Upload all 8 files (`index.html`, `results.html`, `quotation.html`, `script.js`, `style.css`, `data.json`, `vercel.json`, `README.md`) to the `main` branch of this repository.

2. **Import to Vercel**
   - Log in to your Vercel dashboard.
   - Click **"Add New..."** > **"Project"**.
   - Select your newly created GitHub repository (`fm200-calculator-v4`).
   - Vercel will auto-detect a static site project.
   - Click **"Deploy"**.

3. **Go Live**
   - Vercel will build and deploy the application. The Vercel URL is now your live estimation tool with enhanced features and design.

---
## Explore More Calculators & Tools

We highly recommend these expert resources for specialized safety and utility tools:

| Tool Name | Description | Link |
| :--- | :--- | :--- |
| **Fire Safety Tool** | Your central hub for professional fire protection resources and calculators. | [firesafetytool.com](https://www.firesafetytool.com) |
| **HSE Calculator** | Comprehensive suite of tools for Health, Safety, and Environment (HSE) management and compliance. | [hsecalculator.com](https://www.hsecalculator.com) |
| **Web Tools Daily** | A collection of simple, fast, and useful web-based utilities for daily tasks. | [webtoolsdaily.com](https://www.webtoolsdaily.com) |
| **Fire Extinguisher Audit Tool** | Streamline your fire extinguisher inspection and maintenance records. | [fire-extinguisher-audit-tool.vercel.app](https://fire-extinguisher-audit-tool.vercel.app) |
| **Fire Safety Assessment Tool** | A structured checklist and scoring system for site-specific fire risk evaluation. | [firesafetyassessmenttool.vercel.app](https://firesafetyassessmenttool.vercel.app) |
| **Ceiling Extinguisher Cost Estimator** | Calculate the cost for ceiling-mounted fire suppression solutions. | [ceiling-fire-extinguisher-cost-esti.vercel.app](https://ceiling-fire-extinguisher-cost-esti.vercel.app/) |
| **Fire Extinguisher Calculator** | Determine the correct type and number of fire extinguishers for any area based on fire class. | [fire-extinguisher-calculator.vercel.app](https://fire-extinguisher-calculator.vercel.app/) |
