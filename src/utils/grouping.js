export const OTHERS_THRESHOLD = 0.02; // 2% of total
export const OTHERS_THRESHOLD_PERCENT = Math.round(OTHERS_THRESHOLD * 100);

/**
 * Extract root domain from an email address.
 * "alice@mail.noreply.github.com" → "github.com"
 */
export function extractRootDomain(email) {
    const atIndex = email.lastIndexOf("@");
    if (atIndex === -1) return email;

    const full = email.slice(atIndex + 1).toLowerCase();
    const parts = full.split(".");

    if (parts.length <= 2) return full;

    const last2 = parts.slice(-2).join(".");
    const knownDoubleTlds = ["co.uk", "co.jp", "com.au", "com.br", "co.in", "co.za"];
    if (knownDoubleTlds.includes(last2)) {
        return parts.slice(-3).join(".");
    }

    return parts.slice(-2).join(".");
}

/**
 * Extract subdomain from an email address.
 * "alice@mail.noreply.github.com" → "mail.noreply.github.com"
 */
export function extractFullDomain(email) {
    const atIndex = email.lastIndexOf("@");
    return atIndex === -1 ? email : email.slice(atIndex + 1).toLowerCase();
}

/**
 * Build a 3-level hierarchy from a flat list of emails.
 */
export function groupEmails(emails) {
    const domainMap = new Map();

    for (const email of emails) {
        const rootDomain = extractRootDomain(email.from);
        const fullDomain = extractFullDomain(email.from);
        const senderKey = email.from.toLowerCase();

        if (!domainMap.has(rootDomain)) {
            domainMap.set(rootDomain, new Map());
        }

        const subdomainMap = domainMap.get(rootDomain);
        if (!subdomainMap.has(fullDomain)) {
            subdomainMap.set(fullDomain, new Map());
        }

        const senderMap = subdomainMap.get(fullDomain);
        if (!senderMap.has(senderKey)) {
            senderMap.set(senderKey, {
                id: senderKey,
                name: email.name || senderKey,
                unread: 0,
                read: 0,
            });
        }

        const sender = senderMap.get(senderKey);
        if (email.unread) {
            sender.unread++;
        } else {
            sender.read++;
        }
    }

    const hierarchy = [];

    for (const [rootDomain, subdomainMap] of domainMap) {
        const children = [];

        for (const [subdomain, senderMap] of subdomainMap) {
            const senders = Array.from(senderMap.values());
            children.push({
                id: subdomain,
                name: subdomain,
                children: senders,
            });
        }

        hierarchy.push({
            id: rootDomain,
            name: rootDomain,
            children,
        });
    }

    return hierarchy;
}

/**
 * Recursively count emails in a tree node.
 */
export function getCount(node, filter) {
    if (node.children) {
        return node.children.reduce((sum, child) => sum + getCount(child, filter), 0);
    }
    return filter === "unread" ? node.unread : node.unread + node.read;
}

/**
 * Merge small nodes (below threshold) into an "Others" bucket.
 * The Others node is clickable and contains all grouped children.
 */
export function aggregateOthers(nodes, filter, othersLabel = "Others") {
    const total = nodes.reduce((sum, n) => sum + getCount(n, filter), 0);
    if (total === 0) return nodes;

    const main = [];
    const othersChildren = [];

    for (const node of nodes) {
        const count = getCount(node, filter);
        const ratio = count / total;
        if (ratio < OTHERS_THRESHOLD && nodes.length > 3) {
            othersChildren.push(node);
        } else {
            main.push(node);
        }
    }

    if (othersChildren.length === 0) return main;
    if (othersChildren.length === 1) return [...main, ...othersChildren];

    const othersNode = {
        id: "__others__",
        name: othersLabel,
        isOthers: true,
        children: othersChildren,
    };

    return [...main, othersNode];
}

/**
 * Find a node by id recursively.
 */
export function findNodeById(nodes, id) {
    for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
            const found = findNodeById(n.children, id);
            if (found) return found;
        }
    }
    return null;
}
