const ENDPOINTS = {
    STAMP_BARCODE: '/api/document/stamp-barcode'
};

export class PdfExporter {
    static async export({
        rawFile,
        stickerElement,
        pageData,
        shiftContent = true,
        headerShift = 180.0,
        originalFileName = 'document.pdf'
    }) {
        if (!rawFile || !stickerElement || !pageData) {
            throw new Error('بيانات تصدير ملف الـ PDF غير مكتملة.');
        }

        if (typeof window.html2canvas === 'undefined') {
            throw new Error('مكتبة التقاط الملصق (html2canvas) غير متوفرة.');
        }

        const prevDisplay = stickerElement.style.display;
        if (prevDisplay === 'none') {
            stickerElement.style.display = 'block';
        }

        let stickerCanvas;
        try {
            stickerCanvas = await window.html2canvas(stickerElement, {
                scale: 3,
                backgroundColor: null,
                logging: false,
                useCORS: true
            });
        } finally {
            if (prevDisplay === 'none') {
                stickerElement.style.display = 'none';
            }
        }

        const stickerBase64 = stickerCanvas.toDataURL('image/png');

        const displayWidth = pageData.displayWidth || 600;
        const displayHeight = pageData.displayHeight || 800;
        const pointWidth = pageData.pointWidth || 595.28;
        const pointHeight = pageData.pointHeight || 841.89;

        const scaleX = pointWidth / displayWidth;
        const scaleY = pointHeight / displayHeight;

        const stickerLeft = stickerElement.offsetLeft;
        const stickerTop = stickerElement.offsetTop;
        const stickerWidth = stickerElement.offsetWidth;
        const stickerHeight = stickerElement.offsetHeight;

        const pdfX = stickerLeft * scaleX;
        const pdfY = stickerTop * scaleY;
        const pdfWidth = stickerWidth * scaleX;
        const pdfHeight = stickerHeight * scaleY;

        const formData = new FormData();
        formData.append('file', rawFile, originalFileName);
        formData.append('stickerBase64', stickerBase64);
        formData.append('pageIndex', '0');
        formData.append('x', pdfX.toFixed(2));
        formData.append('y', pdfY.toFixed(2));
        formData.append('width', pdfWidth.toFixed(2));
        formData.append('height', pdfHeight.toFixed(2));
        formData.append('shiftContent', shiftContent ? 'true' : 'false');
        formData.append('headerShift', headerShift.toString());

        const response = await fetch(ENDPOINTS.STAMP_BARCODE, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMsg = 'فشل في تثبيت الملصق على الـ PDF عبر الخادم.';
            try {
                const errJson = await response.json();
                if (errJson.errorMessage) errorMsg = errJson.errorMessage;
            } catch {
            }
            throw new Error(errorMsg);
        }

        const blob = await response.blob();
        this.triggerDownload(blob, originalFileName);

        return true;
    }

    static triggerDownload(blob, originalFileName) {
        const cleanName = (originalFileName || 'document.pdf').replace(/\.pdf$/i, '');
        const outputFileName = `${cleanName}_stamped.pdf`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
}
