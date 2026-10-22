export class BarcodeService {
    static render(target, value, options = {}) {
        if (!target) return false;
        const text = (value || '').trim();
        if (!text) return false;

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return false;

        if (typeof window.JsBarcode !== 'function') {
            console.error('JsBarcode library is not loaded.');
            return false;
        }

        try {
            const defaultOptions = {
                format: 'CODE128',
                width: 1.8,
                height: 32,
                displayValue: false,
                background: '#ffffff',
                lineColor: '#0f172a',
                margin: 2,
                ...options
            };

            window.JsBarcode(el, text, defaultOptions);
            return true;
        } catch (err) {
            console.error('Failed to generate barcode:', err);
            return false;
        }
    }
}
