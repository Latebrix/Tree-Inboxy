import { useState, useCallback, useRef } from "react";
import { fetchInbox, fetchNewEmails } from "../services/gmail.js";
import { groupEmails, getCount } from "../utils/grouping.js";
import { batchFetchFavicons } from "../services/favicon.js";
import { hashColor, hslToHex } from "../utils/colors.js";
import { saveEmails, loadEmails, saveMeta, loadMeta, hasStoredData, clearStorage } from "../services/storage.js";

/**
 * Orchestrates Gmail data fetching, persistence, and live updates.
 */
export function useGmail() {
    const [state, setState] = useState({
        status: "idle", // idle | restoring | fetching | processing | done | error
        progress: 0,
        progressPhase: "",
        emails: [],
        hierarchy: [],
        domainColors: new Map(),
        error: null,
    });

    const abortRef = useRef(false);

    /**
     * Restore cached data from IndexedDB.
     */
    const restoreData = useCallback(async () => {
        const hasData = await hasStoredData();
        if (!hasData) return false;

        setState((s) => ({ ...s, status: "restoring", progressPhase: "restoring" }));

        // grab cached treemap data if we have it - way faster than doing it from scratch
        const cachedHierarchy = await loadMeta("hierarchy");
        const cachedColorsArr = await loadMeta("domainColors");

        let emails = [];
        let hierarchy = [];
        let domainColors = new Map();

        if (cachedHierarchy) {
            hierarchy = cachedHierarchy;
            if (cachedColorsArr) {
                // we have colors cached, load them directly
                domainColors = new Map(cachedColorsArr);
            } else {
                // fallback if missing
                domainColors = initFallbackColors(hierarchy);
            }

            setState({
                status: "done",
                progressPhase: "",
                emails: [], // lazy load these so the big treemap pops up instantly
                hierarchy,
                domainColors,
                progress: 0,
                error: null,
            });

            // quietly load the actual emails in the background for later
            loadEmails().then(loadedEmails => {
                if (!abortRef.current) {
                    setState(s => ({ ...s, emails: loadedEmails, progress: loadedEmails.length }));
                }
            });

            return true;
        }

        // slow path: if no cached hierarchy, we gotta build it
        emails = await loadEmails();
        if (emails.length === 0) return false;

        hierarchy = groupEmails(emails);
        domainColors = initFallbackColors(hierarchy);

        setState({
            status: "done",
            progress: emails.length,
            progressPhase: "",
            emails,
            hierarchy,
            domainColors,
            error: null,
        });

        // let the favicons trickle in
        fetchTopFavicons(hierarchy, domainColors).then(async (updatedColors) => {
            if (updatedColors && !abortRef.current) {
                setState(s => ({ ...s, domainColors: updatedColors }));
                await saveMeta("domainColors", Array.from(updatedColors.entries()));
            }
        });

        // save the heavy lifting for next time
        await saveMeta("hierarchy", hierarchy);

        return true;
    }, []);

    /**
     * Full fetch with live streaming updates.
     * Hierarchy updates progressively as batches come in.
     */
    const fetchData = useCallback(async (accessToken) => {
        abortRef.current = false;
        setState((s) => ({ ...s, status: "fetching", progress: 0, progressPhase: "listing", error: null }));

        try {
            const emails = await fetchInbox(
                accessToken,
                // onProgress
                (count, phase) => {
                    if (!abortRef.current) {
                        setState((s) => ({ ...s, progress: count, progressPhase: phase }));
                    }
                },
                // onBatch — live update hierarchy as emails stream in
                (currentEmails) => {
                    if (!abortRef.current && currentEmails.length > 0) {
                        const liveHierarchy = groupEmails(currentEmails);
                        setState((s) => ({
                            ...s,
                            hierarchy: liveHierarchy,
                            emails: currentEmails,
                        }));
                    }
                }
            );

            if (abortRef.current) return;

            setState((s) => ({ ...s, status: "processing", progressPhase: "processing", emails }));

            // Persist
            await saveEmails(emails);
            const messageIds = emails.filter((e) => e.messageId).map((e) => e.messageId);
            await saveMeta("messageIds", messageIds);
            await saveMeta("lastFetch", Date.now());

            const hierarchy = groupEmails(emails);
            await saveMeta("hierarchy", hierarchy);

            const domainColors = initFallbackColors(hierarchy);

            if (abortRef.current) return;

            setState({
                status: "done",
                progress: emails.length,
                progressPhase: "",
                emails,
                hierarchy,
                domainColors,
                error: null,
            });

            // let the favicons trickle in
            fetchTopFavicons(hierarchy, domainColors).then(async (updatedColors) => {
                if (updatedColors && !abortRef.current) {
                    setState(s => ({ ...s, domainColors: updatedColors }));
                    await saveMeta("domainColors", Array.from(updatedColors.entries()));
                }
            });
        } catch (err) {
            if (!abortRef.current) {
                setState((s) => ({
                    ...s,
                    status: "error",
                    error: err.message === "AUTH_EXPIRED" ? "AUTH_EXPIRED" : err.message,
                }));
            }
        }
    }, []);

    /**
     * Incremental fetch — only new emails.
     */
    const fetchNewData = useCallback(async (accessToken) => {
        abortRef.current = false;
        setState((s) => ({ ...s, status: "fetching", progress: 0, progressPhase: "updating", error: null }));

        try {
            const existingIds = (await loadMeta("messageIds")) || [];
            const existingEmails = await loadEmails();

            const newEmails = await fetchNewEmails(accessToken, existingIds, (count, phase) => {
                if (!abortRef.current) {
                    setState((s) => ({ ...s, progress: count, progressPhase: phase }));
                }
            });

            const allEmails = [...newEmails, ...existingEmails];

            await saveEmails(allEmails);
            const allIds = allEmails.filter((e) => e.messageId).map((e) => e.messageId);
            await saveMeta("messageIds", allIds);
            await saveMeta("lastFetch", Date.now());

            const hierarchy = groupEmails(allEmails);
            await saveMeta("hierarchy", hierarchy);

            const cachedColorsArr = await loadMeta("domainColors");
            const currentColors = cachedColorsArr ? new Map(cachedColorsArr) : new Map();
            const domainColors = initFallbackColors(hierarchy, currentColors);

            if (abortRef.current) return;

            setState({
                status: "done",
                progress: allEmails.length,
                progressPhase: "",
                emails: allEmails,
                hierarchy,
                domainColors,
                error: null,
            });

            // let the favicons trickle in
            fetchTopFavicons(hierarchy, domainColors).then(async (updatedColors) => {
                if (updatedColors && !abortRef.current) {
                    setState(s => ({ ...s, domainColors: updatedColors }));
                    await saveMeta("domainColors", Array.from(updatedColors.entries()));
                }
            });
        } catch (err) {
            if (!abortRef.current) {
                setState((s) => ({
                    ...s,
                    status: "error",
                    error: err.message === "AUTH_EXPIRED" ? "AUTH_EXPIRED" : err.message,
                }));
            }
        }
    }, []);

    const reset = useCallback(async () => {
        abortRef.current = true;
        await clearStorage();
        setState({
            status: "idle",
            progress: 0,
            progressPhase: "",
            emails: [],
            hierarchy: [],
            domainColors: new Map(),
            error: null,
        });
    }, []);

    return { ...state, fetchData, fetchNewData, restoreData, reset };
}

// prep the generic colors instantly so we don't hold up the line
function initFallbackColors(hierarchy, existingColors = new Map()) {
    const domainColors = new Map(existingColors);
    for (const node of hierarchy) {
        const domain = node.id;
        if (!domainColors.has(domain)) {
            const fallback = hashColor(domain);
            domainColors.set(domain, { color: hslToHex(fallback), faviconUrl: null });
        }
    }
    return domainColors;
}

// grab favicons for the biggest domains in the background
async function fetchTopFavicons(hierarchy, existingColors) {
    // sort to find the top 50 biggest domains so we don't overkill the network
    const sorted = [...hierarchy].sort((a, b) => getCount(b, "all") - getCount(a, "all"));
    const topDomains = sorted.slice(0, 50).map((n) => n.id);

    const domainColors = new Map(existingColors);

    try {
        const favicons = await batchFetchFavicons(topDomains);
        let changed = false;

        for (const [domain, info] of favicons) {
            if (info.color || info.url) {
                const current = domainColors.get(domain);
                const colorToUse = info.color || current?.color;

                domainColors.set(domain, { color: colorToUse, faviconUrl: info.url });
                changed = true;
            }
        }

        return changed ? domainColors : null;
    } catch {
        return null; // didn't work, just stick with fallbacks
    }
}
