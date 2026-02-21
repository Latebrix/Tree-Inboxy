const DB_NAME = "smartinbox";
const DB_VERSION = 1;
const STORE_NAME = "emails";
const META_STORE = "meta";

/**
 * Open the IndexedDB database.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save email data to IndexedDB.
 */
export async function saveEmails(emails) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.clear();
    for (let i = 0; i < emails.length; i++) {
        store.put({ id: i, ...emails[i] });
    }

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });

    db.close();
}

/**
 * Load all stored emails from IndexedDB.
 */
export async function loadEmails() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            db.close();
            resolve(request.result.map(({ id, ...rest }) => rest));
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

/**
 * Save metadata (last fetch timestamp, message count, etc.).
 */
export async function saveMeta(key, value) {
    const db = await openDB();
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put({ key, value });

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });

    db.close();
}

/**
 * Load a metadata value.
 */
export async function loadMeta(key) {
    const db = await openDB();
    const tx = db.transaction(META_STORE, "readonly");

    return new Promise((resolve, reject) => {
        const request = tx.objectStore(META_STORE).get(key);
        request.onsuccess = () => {
            db.close();
            resolve(request.result?.value ?? null);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

/**
 * Clear all stored data.
 */
export async function clearStorage() {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });

    db.close();
}

/**
 * Check if stored data exists.
 */
export async function hasStoredData() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");

    return new Promise((resolve, reject) => {
        const request = tx.objectStore(STORE_NAME).count();
        request.onsuccess = () => {
            db.close();
            resolve(request.result > 0);
        };
        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}
