import { useState, useCallback, useRef } from "react";
import { fetchInbox, fetchNewEmails } from "../services/gmail.js";
import { groupEmails } from "../utils/grouping.js";
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

        const emails = await loadEmails();
        if (emails.length === 0) return false;

        const hierarchy = groupEmails(emails);
        const domainColors = await enrichWithFavicons(hierarchy);

        setState({
            status: "done",
            progress: emails.length,
            progressPhase: "",
            emails,
            hierarchy,
            domainColors,
            error: null,
        });

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
            const domainColors = await enrichWithFavicons(hierarchy);

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
            const domainColors = await enrichWithFavicons(hierarchy);

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

/**
 * Fetch favicons and build domain color map.
 */
async function enrichWithFavicons(hierarchy) {
    const domains = hierarchy.map((node) => node.id);
    const domainColors = new Map();

    try {
        const favicons = await batchFetchFavicons(domains);
        for (const [domain, info] of favicons) {
            if (info.color) {
                domainColors.set(domain, { color: info.color, faviconUrl: info.url });
            }
        }
    } catch {
        // Non-critical
    }

    for (const domain of domains) {
        if (!domainColors.has(domain)) {
            const fallback = hashColor(domain);
            domainColors.set(domain, { color: hslToHex(fallback), faviconUrl: null });
        }
    }

    return domainColors;
}
