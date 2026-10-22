import { PdfViewer } from './pdfViewer.js?v=20261021b';
import { StickerManager } from './stickerManager.js?v=20261021b';
import { PdfExporter } from './pdfExporter.js?v=20261021b';
import { DocumentStorage } from './documentStorage.js?v=20261021c';

class App {
    constructor() {
        this.viewer = new PdfViewer();
        this.stickerManager = new StickerManager();

        this.dom = {
            dropZone: null,
            canvasArea: null,
            pdfPageImage: null,
            overlayContainer: null,
            pageContainer: null,
            mainWorkspace: null,
            fileInput: null,
            btnUploadTrigger: null,
            fileNameDisplay: null,
            btnPrevPage: null,
            btnNextPage: null,
            pageIndicator: null,
            btnZoomIn: null,
            btnZoomOut: null,
            btnResetZoom: null,
            btnPrint: null,
            btnDownloadPdf: null,
            btnRemoveDoc: null,
            chkShiftContent: null,
            printOnlyContainer: null,
            feedbackToast: null,
            feedbackMessage: null
        };

        this.toastTimeout = null;
    }

    async init() {
        this.cacheDom();
        this.viewer.attach({
            pageImage: this.dom.pdfPageImage,
            overlayContainer: this.dom.overlayContainer,
            pageContainer: this.dom.pageContainer
        });

        this.stickerManager.init();
        this.bindEvents();

        const restored = await this.restoreSessionDocument();
        if (!restored) {
            this.showEmptyState();
            await this.checkUrlForPdf();
        }
    }

    async restoreSessionDocument() {
        try {
            const saved = await DocumentStorage.getCurrentDoc();
            if (saved && saved.file) {
                await this.loadPdfFile(saved.file, false, saved.meta);
                return true;
            }
        } catch (e) {
            console.warn('Could not restore document from storage:', e);
        }
        return false;
    }

    cacheDom() {
        this.dom.dropZone = document.getElementById('pdfDropZone');
        this.dom.canvasArea = document.getElementById('canvasArea');
        this.dom.pdfPageImage = document.getElementById('pdfPageImage');
        this.dom.overlayContainer = document.getElementById('stickerOverlayContainer');
        this.dom.pageContainer = document.getElementById('pdfPageContainer');
        this.dom.mainWorkspace = document.getElementById('mainWorkspace');

        this.dom.fileInput = document.getElementById('pdfFileInput');
        this.dom.btnUploadTrigger = document.getElementById('btnUploadTrigger');
        this.dom.fileNameDisplay = document.getElementById('docFileName');
        this.dom.btnPrevPage = document.getElementById('btnPrevPage');
        this.dom.btnNextPage = document.getElementById('btnNextPage');
        this.dom.pageIndicator = document.getElementById('pageIndicator');
        this.dom.btnZoomIn = document.getElementById('btnZoomIn');
        this.dom.btnZoomOut = document.getElementById('btnZoomOut');
        this.dom.btnResetZoom = document.getElementById('btnResetZoom');
        this.dom.btnPrint = document.getElementById('btnPrintDocument');
        this.dom.btnDownloadPdf = document.getElementById('btnDownloadPdf');
        this.dom.btnRemoveDoc = document.getElementById('btnRemoveDoc');
        this.dom.chkShiftContent = document.getElementById('chkShiftContent');
        this.dom.printOnlyContainer = document.getElementById('printOnlyContainer');

        this.dom.feedbackToast = document.getElementById('feedbackToast');
        this.dom.feedbackMessage = document.getElementById('feedbackToastMsg');
    }

    bindEvents() {
        if (this.dom.btnUploadTrigger) {
            this.dom.btnUploadTrigger.addEventListener('click', () => this.handleUploadTriggerClick());
        }
        if (this.dom.dropZone) {
            this.dom.dropZone.addEventListener('click', () => this.handleUploadTriggerClick());
        }
        if (this.dom.fileInput) {
            this.dom.fileInput.addEventListener('change', (e) => this.handleFileInputChange(e));
        }

        if (this.dom.chkShiftContent) {
            this.dom.chkShiftContent.addEventListener('change', (e) => this.handleShiftContentChange(e));
        }

        const dropTargets = [this.dom.dropZone, this.dom.mainWorkspace].filter(Boolean);
        dropTargets.forEach(target => {
            target.addEventListener('dragover', (e) => this.handleDragOver(e));
            target.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            target.addEventListener('drop', (e) => this.handleFileDrop(e));
        });

        if (this.dom.btnRemoveDoc) {
            this.dom.btnRemoveDoc.addEventListener('click', () => this.handleRemoveDocumentClick());
        }

        if (this.dom.btnPrevPage) {
            this.dom.btnPrevPage.addEventListener('click', () => this.handlePrevPageClick());
        }
        if (this.dom.btnNextPage) {
            this.dom.btnNextPage.addEventListener('click', () => this.handleNextPageClick());
        }

        if (this.dom.btnZoomIn) {
            this.dom.btnZoomIn.addEventListener('click', () => this.handleZoomInClick());
        }
        if (this.dom.btnZoomOut) {
            this.dom.btnZoomOut.addEventListener('click', () => this.handleZoomOutClick());
        }
        if (this.dom.btnResetZoom) {
            this.dom.btnResetZoom.addEventListener('click', () => this.handleResetZoomClick());
        }

        if (this.dom.btnPrint) {
            this.dom.btnPrint.addEventListener('click', () => this.handlePrintClick());
        }

        if (this.dom.btnDownloadPdf) {
            this.dom.btnDownloadPdf.addEventListener('click', () => this.handleExportPdf());
        }

        this.viewer.onDocumentLoaded = (info) => this.handleViewerDocumentLoaded(info);
        this.viewer.onPageChanged = (state) => this.handleViewerPageChanged(state);
    }

    handleUploadTriggerClick() {
        if (this.dom.fileInput) {
            this.dom.fileInput.click();
        }
    }

    async handleFileInputChange(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            await this.loadPdfFile(files[0]);
        }
    }

    async handleShiftContentChange(event) {
        try {
            const isChecked = event.target.checked;
            await this.viewer.setShiftContent(isChecked);
            this.showToast(
                isChecked
                    ? 'تم تفريغ مساحة علوية وبداية النص من أسفل الباركود'
                    : 'تم استرجاع تخطيط النص الأصلي',
                'info'
            );
        } catch (err) {
            console.error('Failed to change shiftContent mode:', err);
            this.showToast('فشل في تعديل تخطيط الصفحة', 'error');
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.dom.dropZone) {
            this.dom.dropZone.classList.add('drag-active');
        }
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.dom.dropZone) {
            this.dom.dropZone.classList.remove('drag-active');
        }
    }

    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.dom.dropZone) {
            this.dom.dropZone.classList.remove('drag-active');
        }
        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            this.loadPdfFile(event.dataTransfer.files[0]);
        }
    }

    async handleRemoveDocumentClick() {
        await DocumentStorage.clearCurrentDoc();
        this.showEmptyState();
        if (this.dom.fileInput) {
            this.dom.fileInput.value = '';
        }
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        this.showToast('تم إغلاق المستند بنجاح', 'info');
    }

    async handlePrevPageClick() {
        await this.viewer.prevPage();
    }

    async handleNextPageClick() {
        await this.viewer.nextPage();
    }

    async handleZoomInClick() {
        await this.viewer.zoomIn();
    }

    async handleZoomOutClick() {
        await this.viewer.zoomOut();
    }

    async handleResetZoomClick() {
        await this.viewer.resetZoom();
    }

    handlePrintClick() {
        if (!this.viewer.isLoaded()) {
            this.showToast('يرجى استيراد ملف PDF أولاً قبل الطباعة', 'warning');
            return;
        }
        const prepared = this.preparePrintPages();
        if (!prepared) {
            this.showToast('فشل في تجهيز صفحات الطباعة', 'error');
            return;
        }
        const originalTitle = document.title;
        document.title = ' ';
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    }

    handleViewerDocumentLoaded(info) {
        if (this.dom.fileNameDisplay) {
            this.dom.fileNameDisplay.textContent = info.fileName;
            this.dom.fileNameDisplay.title = info.fileName;
        }
        this.updatePaginationUI(1, info.totalPages);
        this.stickerManager.setVisible(true);
        this.showLoadedState();
        this.showToast('تم تحميل المستند العربي بدقة عالية 100%', 'success');
    }

    handleViewerPageChanged(state) {
        this.updatePaginationUI(state.currentPage, state.totalPages);
        const isFirstPage = state.currentPage === 1;
        this.stickerManager.setVisible(isFirstPage);
    }

    async loadPdfFile(file, saveToStorage = true, meta = null) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            this.showToast('عذراً، النظام يدعم ملفات PDF حصراً لضمان أعلى دقة وسلامة للمستند', 'error');
            return;
        }

        try {
            this.setButtonLoading(this.dom.btnUploadTrigger, true, 'جارِ التحميل...');
            await this.viewer.load(file, file.name);

            if (saveToStorage) {
                await DocumentStorage.saveCurrentDoc(file, {
                    preset: this.stickerManager.state.preset || 'top-left'
                });
            }

            if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            if (meta && meta.preset) {
                this.stickerManager.setPositionPreset(meta.preset);
                this.stickerManager.syncPresetButtonsUI(meta.preset);
            } else if (!meta && !this.stickerManager.state.preset) {
                this.stickerManager.setPositionPreset('top-left');
                this.stickerManager.syncPresetButtonsUI('top-left');
            }
        } catch (err) {
            console.error('Error loading PDF file:', err);
            this.showToast('حدث خطأ أثناء تحميل ملف PDF. يرجى التأكد من سلامة الملف', 'error');
        } finally {
            this.setButtonLoading(this.dom.btnUploadTrigger, false);
        }
    }

    async checkUrlForPdf() {
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        if (fileParam) {
            try {
                const res = await fetch(fileParam);
                if (res.ok) {
                    const blob = await res.blob();
                    const fileName = fileParam.split('/').pop() || 'document.pdf';
                    const file = new File([blob], fileName, { type: 'application/pdf' });
                    await this.loadPdfFile(file, true);
                }
            } catch (err) {
                console.warn('Could not auto-load file from URL:', err);
            }
        }
    }

    async handleExportPdf() {
        if (!this.viewer.isLoaded()) {
            this.showToast('يرجى استيراد ملف PDF أولاً لإتمام التصدير', 'warning');
            return;
        }

        try {
            this.setButtonLoading(this.dom.btnDownloadPdf, true, 'جارِ تثبيت الملصق...');

            await PdfExporter.export({
                rawFile: this.viewer.getRawFile(),
                stickerElement: this.stickerManager.getStickerElement(),
                pageData: this.viewer.getFirstPageData(),
                shiftContent: this.viewer.getShiftContent(),
                headerShift: this.viewer.getHeaderShift(),
                originalFileName: this.viewer.getFileName()
            });

            this.showToast('تم تصدير وتنزيل ملف PDF المعتمد بنجاح!', 'success');
        } catch (err) {
            console.error('Failed to export PDF:', err);
            this.showToast('حدث خطأ أثناء تصدير ملف PDF: ' + err.message, 'error');
        } finally {
            this.setButtonLoading(this.dom.btnDownloadPdf, false);
        }
    }

    preparePrintPages() {
        let printContainer = this.dom.printOnlyContainer || document.getElementById('printOnlyContainer');
        if (!printContainer) {
            printContainer = document.createElement('div');
            printContainer.id = 'printOnlyContainer';
            printContainer.className = 'print-only-container';
            document.body.appendChild(printContainer);
            this.dom.printOnlyContainer = printContainer;
        }
        printContainer.innerHTML = '';

        const pages = this.viewer.pages;
        if (!pages || pages.length === 0) return false;

        const stickerElement = this.stickerManager.getStickerElement();
        let stickerClone = null;
        if (stickerElement) {
            stickerClone = stickerElement.cloneNode(true);
            stickerClone.id = 'stickerCard_print';
            const handle = stickerClone.querySelector('.sticker-drag-handle-pill');
            if (handle) handle.remove();
            stickerClone.style.pointerEvents = 'none';

            const containerW = this.dom.pageContainer ? this.dom.pageContainer.offsetWidth : 744;
            const containerH = this.dom.pageContainer ? this.dom.pageContainer.offsetHeight : 1052;

            if (containerW > 0 && containerH > 0) {
                const leftPct = (stickerElement.offsetLeft / containerW) * 100;
                const topPct = (stickerElement.offsetTop / containerH) * 100;
                const widthPct = (stickerElement.offsetWidth / containerW) * 100;

                stickerClone.style.left = `${leftPct.toFixed(2)}%`;
                stickerClone.style.top = `${topPct.toFixed(2)}%`;
                stickerClone.style.width = `${widthPct.toFixed(2)}%`;
            }
            stickerClone.style.boxShadow = 'none';
        }

        pages.forEach((page, index) => {
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'print-page-wrapper';

            const img = document.createElement('img');
            img.className = 'print-page-img';
            img.src = page.imageBase64;
            img.alt = `صفحة ${index + 1}`;
            pageWrapper.appendChild(img);

            if (index === 0 && stickerClone) {
                const overlay = document.createElement('div');
                overlay.className = 'print-page-overlay';
                overlay.appendChild(stickerClone);
                pageWrapper.appendChild(overlay);
            }

            printContainer.appendChild(pageWrapper);
        });

        return true;
    }

    updatePaginationUI(current, total) {
        if (this.dom.pageIndicator) {
            this.dom.pageIndicator.textContent = `صفحة ${current} من ${total}`;
        }
        if (this.dom.btnPrevPage) {
            this.dom.btnPrevPage.disabled = current <= 1;
        }
        if (this.dom.btnNextPage) {
            this.dom.btnNextPage.disabled = current >= total;
        }
    }

    showEmptyState() {
        if (this.dom.dropZone) this.dom.dropZone.style.display = 'flex';
        if (this.dom.canvasArea) this.dom.canvasArea.style.display = 'none';
        if (this.dom.fileNameDisplay) this.dom.fileNameDisplay.textContent = 'لم يتم اختيار ملف بعد';
        if (this.dom.btnRemoveDoc) this.dom.btnRemoveDoc.style.display = 'none';
        if (this.dom.btnDownloadPdf) this.dom.btnDownloadPdf.disabled = true;
        if (this.dom.btnPrint) this.dom.btnPrint.disabled = true;
        if (this.dom.btnPrevPage) this.dom.btnPrevPage.disabled = true;
        if (this.dom.btnNextPage) this.dom.btnNextPage.disabled = true;
    }

    showLoadedState() {
        if (this.dom.dropZone) this.dom.dropZone.style.display = 'none';
        if (this.dom.canvasArea) this.dom.canvasArea.style.display = 'block';
        if (this.dom.btnRemoveDoc) this.dom.btnRemoveDoc.style.display = 'inline-flex';
        if (this.dom.btnDownloadPdf) this.dom.btnDownloadPdf.disabled = false;
        if (this.dom.btnPrint) this.dom.btnPrint.disabled = false;
    }

    setButtonLoading(button, isLoading, text = '') {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalHtml = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
                <span class="btn-spinner"></span>
                <span>${text}</span>
            `;
        } else {
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
            }
            button.disabled = false;
        }
    }

    showToast(message, type = 'info') {
        if (!this.dom.feedbackToast || !this.dom.feedbackMessage) return;
        this.dom.feedbackMessage.textContent = message;

        this.dom.feedbackToast.className = `feedback-toast toast-${type} show`;
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            if (this.dom.feedbackToast) {
                this.dom.feedbackToast.classList.remove('show');
            }
        }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.__docApp = app;
});
