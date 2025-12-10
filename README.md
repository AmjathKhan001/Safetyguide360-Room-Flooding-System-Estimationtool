# FM-200 Room Flooding System Calculator

A professional web application for calculating FM-200 clean agent fire suppression system requirements, generating bill of quantities, and creating quotations.

## Version 2.0.2 Updates
- **Enhanced BOQ**: Added comprehensive line items including actuation devices, control panels, warning signs
- **Currency Fix**: Fixed currency conversion in BOQ tables
- **PDF Generation**: Improved PDF export with proper formatting
- **Responsive Design**: Better mobile experience
- **Validation**: Added input validation and error handling

## Features

- **Complete FM-200 Calculation**: Uses NFPA 2001 standard formula with altitude and temperature corrections
- **Expert Mode**: Advanced parameters for professional engineers
- **Multi-Currency Support**: USD, EUR, INR, AED with real-time conversion
- **Enhanced Bill of Quantities**: Detailed equipment list with comprehensive pricing
- **PDF/Excel Generation**: Export quotations and BOQs
- **Responsive Design**: Works on all devices
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

### Steps

1. **Create GitHub Repository**
   - Create a new, empty repository on GitHub (e.g., `fm200-calculator`).
   - Upload all 8 files (`index.html`, `results.html`, `quotation.html`, `script.js`, `style.css`, `data.json`, `vercel.json`, `README.md`) to the `main` branch of this repository.

2. **Import to Vercel**
   - Log in to your Vercel dashboard.
   - Click **"Add New..."** > **"Project"**.
   - Select your newly created GitHub repository (`fm200-calculator`).
   - Vercel will auto-detect a static site project.
   - Click **"Deploy"**.

3. **Go Live**
   - Vercel will build and deploy the application. The Vercel URL is now your live estimation tool.

## Key Improvements in v2.0.2

1. **BOQ Enhancement**: Added standard components from your requirements:
   - Actuation devices
   - Control panels
   - Warning signs
   - Installation labor
   - Documentation & certifications

2. **Currency Fix**: Proper exchange rate handling in all BOQ tables

3. **PDF Libraries**: Added html2canvas and jspdf for reliable PDF generation

4. **Input Validation**: Better validation for room dimensions and expert parameters

5. **Mobile Optimization**: Improved responsive design for all screen sizes