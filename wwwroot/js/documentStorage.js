const DB_NAME = 'LegalRequestFormDB';
const DB_VERSION = 1;
const STORE_NAME = 'active_document';

export class DocumentStorage {
    static openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async saveCurrentDoc(file, meta = {}) {
        try {
            const db = await this.openDB();
            const arrayBuffer = await file.arrayBuffer();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put({
                    id: 'current_file',
                    name: file.name,
                    type: file.type || 'application/pdf',
                    data: arrayBuffer,
                    meta: meta,
                    timestamp: Date.now()
                });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('Failed to save document to IndexedDB:', err);
            return false;
        }
    }

    static async getCurrentDoc() {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get('current_file');
                req.onsuccess = () => {
                    const record = req.result;
                    if (!record || !record.data) {
                        resolve(null);
                        return;
                    }
                    const file = new File([record.data], record.name, {
                        type: record.type,
                        lastModified: record.timestamp
                    });
                    resolve({ file, meta: record.meta || {} });
                };
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            console.warn('Failed to get document from IndexedDB:', err);
            return null;
        }
    }

    static async clearCurrentDoc() {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete('current_file');
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('Failed to clear document from IndexedDB:', err);
            return false;
        }
    }
}
