# PDF Stamper 📄🔖

A robust, enterprise-grade web application built with **ASP.NET Core** and **Modular Modern JavaScript (ES6+)** designed for official document management, archiving, and dynamic transaction barcode stamping.

The platform provides a pixel-perfect workflow to inspect PDF documents, overlay customizable administrative transaction metadata stickers ("ملصق المعاملة والباركود"), and permanently stamp and download the final processed documents with zero font or layout distortion.

---

## 🌟 Key Features

- **100% Arabic Typography & Layout Fidelity**: Bypasses browser-level font shaping corruption by utilizing a backend rendering pipeline, ensuring Arabic ligatures and official document layouts remain razor-sharp and identical to the source.
- **Dynamic Barcode Generation**: Generates standard 1D Code 128 barcodes in real time using `JsBarcode`, linked dynamically to the document/transaction number.
- **Interactive Stamping Overlay**:
  - Free drag-and-drop placement over the PDF viewport.
  - Quick-preset alignment shortcuts (e.g., Top-Left / Top-Right).
  - Configurable transaction metadata (Incoming/Outgoing toggle, dual Hijri/Gregorian dates, attachments, and issuing department).
- **Client-to-Server PDF Stamping**: Converts layout coordinates precisely into PDF coordinate points (72 DPI) and bakes the sticker into the original PDF stream without altering underlying document vectors.
- **Clean Architecture & No Spaghetti Code**:
  - Modular frontend modules separated by single responsibilities (`pdfViewer`, `barcodeService`, `stickerManager`, `pdfExport`).
  - Strict separation of concerns between ASP.NET Core MVC controllers, services, and client-side logic.
  - Native RTL (Right-to-Left) Arabic user interface styled with the **Cairo** font family.

---

## 🛠️ Tech Stack

- **Backend**: ASP.NET Core (C#)
- **Frontend**: Vanilla JavaScript (ES6+ Modules), HTML5, CSS3
- **Libraries & Tools**:
  - `JsBarcode` (Code 128 Barcode Generation)
  - PDF manipulation & high-resolution page processing engines
- **Styling**: Responsive Custom CSS with CSS Variables, Flexbox/Grid, and native RTL support.

---

## 📁 Project Structure

```text
PDF-Stamper/
├── Controllers/         # API & MVC Controllers handling rendering & export endpoints
├── Models/              # Document request models & DTOs
├── Services/            # PDF parsing, stamping, and rasterization services
├── Views/               # Razor View templates (.cshtml)
├── wwwroot/             # Static client-side assets
│   ├── css/             # Scoped layout and component stylesheets
│   └── js/              # Modular ES6 JavaScript modules
│       ├── barcodeService.js
│       ├── pdfViewer.js
│       ├── stickerManager.js
│       └── app.js
├── Program.cs           # Application entry point & service registrations
└── LegalRequestForm.csproj
