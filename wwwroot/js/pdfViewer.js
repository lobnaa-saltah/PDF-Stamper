const ENDPOINTS = {
    RENDER_PAGES: '/api/document/render-pages'
};

export class PdfViewer {
    constructor() {
        this.rawFile = null;
        this.fileName = '';
        this.pages = [];
        this.currentPageIndex = 0;
        this.scale = 1.25;
        this.shiftContent = true;
        this.headerShift = 180.0;

        this.pageImage = null;
        this.overlayContainer = null;
        this.pageContainer = null;

        this.onPageChanged = null;
        this.onDocumentLoaded = null;
    }

    attach({ pageImage, overlayContainer, pageContainer }) {
        this.pageImage = pageImage;
        this.overlayContainer = overlayContainer;
        this.pageContainer = pageContainer;
    }

    async setShiftContent(enabled) {
        if (this.shiftContent === enabled) return;
        this.shiftContent = enabled;
        if (this.rawFile) {
            await this.load(this.rawFile, this.fileName);
        }
    }

    getShiftContent() {
        return this.shiftContent;
    }

    getHeaderShift() {
        return this.headerShift;
    }

    async load(file, fileName = 'document.pdf') {
        this.rawFile = file;
        this.fileName = file.name || fileName;

        const formData = new FormData();
        formData.append('file', file, this.fileName);
        formData.append('shiftContent', this.shiftContent ? 'true' : 'false');
        formData.append('headerShift', this.headerShift.toString());
        formData.append('targetPageIndex', '0');

        const response = await fetch(ENDPOINTS.RENDER_PAGES, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMsg = 'فشل في معالجة ملف الـ PDF عبر الخادم.';
            try {
                const errData = await response.json();
                if (errData.errorMessage) errorMsg = errData.errorMessage;
            } catch {
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (!data.success || !data.pages || data.pages.length === 0) {
            throw new Error(data.errorMessage || 'لم يتم العثور على صفحات في الملف.');
        }

        this.pages = data.pages;
        this.currentPageIndex = 0;

        if (this.onDocumentLoaded) {
            this.onDocumentLoaded({
                fileName: this.fileName,
                totalPages: this.pages.length
            });
        }

        await this.renderCurrentPage();
    }

    async renderCurrentPage() {
        if (!this.pages || this.pages.length === 0 || !this.pageImage) return;

        const page = this.pages[this.currentPageIndex];
        if (!page) return;

        const displayWidth = Math.round(page.pointWidth * this.scale);
        const displayHeight = Math.round(page.pointHeight * this.scale);

        this.pageImage.src = page.imageBase64;
        this.pageImage.style.width = `${displayWidth}px`;
        this.pageImage.style.height = `${displayHeight}px`;

        if (this.pageContainer) {
            this.pageContainer.style.width = `${displayWidth}px`;
            this.pageContainer.style.height = `${displayHeight}px`;
        }
        if (this.overlayContainer) {
            this.overlayContainer.style.width = `${displayWidth}px`;
            this.overlayContainer.style.height = `${displayHeight}px`;
        }

        if (this.onPageChanged) {
            this.onPageChanged({
                currentPage: this.currentPageIndex + 1,
                totalPages: this.pages.length,
                scale: this.scale
            });
        }
    }

    async nextPage() {
        if (this.currentPageIndex < this.pages.length - 1) {
            this.currentPageIndex++;
            await this.renderCurrentPage();
        }
    }

    async prevPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            await this.renderCurrentPage();
        }
    }

    async goToPage(num) {
        const pageNum = parseInt(num, 10);
        if (pageNum >= 1 && pageNum <= this.pages.length) {
            this.currentPageIndex = pageNum - 1;
            await this.renderCurrentPage();
        }
    }

    async zoomIn() {
        if (this.scale < 3.0) {
            this.scale = Math.min(3.0, +(this.scale + 0.15).toFixed(2));
            await this.renderCurrentPage();
        }
    }

    async zoomOut() {
        if (this.scale > 0.6) {
            this.scale = Math.max(0.6, +(this.scale - 0.15).toFixed(2));
            await this.renderCurrentPage();
        }
    }

    async resetZoom() {
        this.scale = 1.25;
        await this.renderCurrentPage();
    }

    getRawFile() {
        return this.rawFile;
    }

    getFileName() {
        return this.fileName;
    }

    getCurrentPageIndex() {
        return this.currentPageIndex;
    }

    getCurrentPageNumber() {
        return this.currentPageIndex + 1;
    }

    getCurrentPageData() {
        return this.getPageData(this.currentPageIndex);
    }

    getPageData(pageIndex = 0) {
        if (!this.pages || this.pages.length === 0) return null;
        const targetIndex = Math.max(0, Math.min(pageIndex, this.pages.length - 1));
        const page = this.pages[targetIndex];
        const displayWidth = Math.round(page.pointWidth * this.scale);
        const displayHeight = Math.round(page.pointHeight * this.scale);
        return {
            pageIndex: targetIndex,
            pointWidth: page.pointWidth,
            pointHeight: page.pointHeight,
            displayWidth: displayWidth,
            displayHeight: displayHeight
        };
    }

    getFirstPageData() {
        return this.getPageData(0);
    }

    isLoaded() {
        return Boolean(this.rawFile && this.pages && this.pages.length > 0);
    }
}
