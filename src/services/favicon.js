const FAVICON_URL = "https://www.google.com/s2/favicons";
const FALLBACK_URL = "https://icon.horse/icon";
const cache = new Map();

/**
 * Get favicon URL and dominant color for a domain.
 * Returns { url: string, color: string } from cache or by fetching.
 */
export async function getFavicon(domain) {
    if (cache.has(domain)) return cache.get(domain);

    const url = `${FAVICON_URL}?domain=${domain}&sz=64`;
    const result = { url, color: null };

    try {
        const color = await extractDominantColor(url);
        result.color = color;
    } catch {
        // Try fallback service
        try {
            const fallbackUrl = `${FALLBACK_URL}/${domain}`;
            const color = await extractDominantColor(fallbackUrl);
            result.url = fallbackUrl;
            result.color = color;
        } catch {
            result.color = null;
        }
    }

    cache.set(domain, result);
    return result;
}

/**
 * Batch fetch favicons for multiple domains.
 * Returns Map<domain, { url, color }>.
 */
export async function batchFetchFavicons(domains) {
    const results = new Map();
    const uncached = domains.filter((d) => {
        if (cache.has(d)) {
            results.set(d, cache.get(d));
            return false;
        }
        return true;
    });

    // Fetch in parallel with concurrency limit
    const limit = 6;
    for (let i = 0; i < uncached.length; i += limit) {
        const batch = uncached.slice(i, i + limit);
        const batchResults = await Promise.allSettled(
            batch.map((domain) => getFavicon(domain))
        );

        batchResults.forEach((r, idx) => {
            const domain = batch[idx];
            if (r.status === "fulfilled") {
                results.set(domain, r.value);
            } else {
                results.set(domain, { url: null, color: null });
            }
        });
    }

    return results;
}

/**
 * Extract the dominant color from an image URL using canvas pixel analysis.
 */
function extractDominantColor(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const size = 32;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const imageData = ctx.getImageData(0, 0, size, size).data;
                const colorFreq = new Map();

                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const a = imageData[i + 3];

                    // Skip transparent and near-white/near-black pixels
                    if (a < 128) continue;
                    if (r > 240 && g > 240 && b > 240) continue;
                    if (r < 15 && g < 15 && b < 15) continue;

                    // Quantize to reduce noise
                    const qr = Math.round(r / 16) * 16;
                    const qg = Math.round(g / 16) * 16;
                    const qb = Math.round(b / 16) * 16;
                    const key = `${qr},${qg},${qb}`;

                    colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
                }

                if (colorFreq.size === 0) {
                    reject(new Error("No usable colors found"));
                    return;
                }

                let maxCount = 0;
                let dominant = "128,128,128";

                for (const [color, count] of colorFreq) {
                    if (count > maxCount) {
                        maxCount = count;
                        dominant = color;
                    }
                }

                const [r, g, b] = dominant.split(",").map(Number);
                const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                resolve(hex);
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageUrl;
    });
}
