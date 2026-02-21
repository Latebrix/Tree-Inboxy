const API_BASE = "https://www.googleapis.com/gmail/v1/users/me";
const BATCH_SIZE = 50;

/**
 * Fetch ALL inbox emails with streaming updates.
 * Calls onProgress(count, phase) as messages are fetched.
 * Calls onBatch(emails) with each batch of processed emails so the UI can update live.
 * Returns flat array of { from, name, unread, messageId }.
 */
export async function fetchInbox(accessToken, onProgress, onBatch) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const allMessages = [];
    let pageToken = null;

    // Phase 1: Collect ALL message IDs
    const messageIds = [];
    do {
        const url = new URL(`${API_BASE}/messages`);
        url.searchParams.set("maxResults", "500");
        url.searchParams.set("labelIds", "INBOX");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await fetchWithRetry(url.toString(), { headers });
        const data = await res.json();

        if (data.messages) {
            messageIds.push(...data.messages);
        }

        pageToken = data.nextPageToken || null;
        onProgress?.(messageIds.length, "listing");
    } while (pageToken);

    // Phase 2: Fetch message metadata in batches — stream results live
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map((msg) => fetchMessageMetadata(msg.id, headers))
        );

        const validResults = batchResults.filter(Boolean);
        allMessages.push(...validResults);

        onProgress?.(allMessages.length, "fetching");

        // Stream this batch to the UI for live updates
        if (onBatch && validResults.length > 0) {
            onBatch(allMessages);
        }
    }

    return allMessages;
}

/**
 * Fetch only NEW messages since a known set of message IDs.
 */
export async function fetchNewEmails(accessToken, existingIds, onProgress) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const existingSet = new Set(existingIds);
    const newMessages = [];
    let pageToken = null;
    let foundExisting = false;

    const newIds = [];
    do {
        const url = new URL(`${API_BASE}/messages`);
        url.searchParams.set("maxResults", "500");
        url.searchParams.set("labelIds", "INBOX");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await fetchWithRetry(url.toString(), { headers });
        const data = await res.json();

        if (data.messages) {
            for (const msg of data.messages) {
                if (existingSet.has(msg.id)) {
                    foundExisting = true;
                    break;
                }
                newIds.push(msg);
            }
        }

        pageToken = foundExisting ? null : (data.nextPageToken || null);
    } while (pageToken);

    if (newIds.length === 0) return [];

    for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
        const batch = newIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map((msg) => fetchMessageMetadata(msg.id, headers))
        );

        for (const result of batchResults) {
            if (result) newMessages.push(result);
        }

        onProgress?.(newMessages.length, "updating");
    }

    return newMessages;
}

/**
 * Fetch metadata for a single message.
 */
async function fetchMessageMetadata(messageId, headers) {
    try {
        const url = `${API_BASE}/messages/${messageId}?format=metadata&metadataHeaders=From`;
        const res = await fetchWithRetry(url, { headers });
        const data = await res.json();

        const fromHeader = data.payload?.headers?.find(
            (h) => h.name.toLowerCase() === "from"
        );
        if (!fromHeader) return null;

        const { email, name } = parseFromHeader(fromHeader.value);
        const isUnread = data.labelIds?.includes("UNREAD") || false;

        return { from: email, name, unread: isUnread, messageId };
    } catch {
        return null;
    }
}

/**
 * Parse a "From" header value.
 */
function parseFromHeader(raw) {
    const angleMatch = raw.match(/<([^>]+)>/);
    if (angleMatch) {
        const email = angleMatch[1].trim();
        const name = raw
            .slice(0, raw.indexOf("<"))
            .trim()
            .replace(/^["']|["']$/g, "");
        return { email, name: name || email };
    }
    const email = raw.trim();
    return { email, name: email };
}

/**
 * Fetch with exponential backoff.
 */
async function fetchWithRetry(url, options, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, options);
        if (res.ok) return res;
        if (res.status === 429 && attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise((r) => setTimeout(r, delay));
            continue;
        }
        if (res.status === 401) throw new Error("AUTH_EXPIRED");
        throw new Error(`Gmail API error: ${res.status}`);
    }
    throw new Error("Max retries exceeded");
}
