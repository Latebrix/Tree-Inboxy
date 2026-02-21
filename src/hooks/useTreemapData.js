import { useMemo } from "react";
import { computeTreemap } from "../utils/treemap.js";
import { getCount, aggregateOthers, findNodeById } from "../utils/grouping.js";
import { t } from "../utils/i18n.js";

// keep tiles big enough to click
const MIN_TILE_PERCENT = 1.5;

// churns the raw fetched data into nice visual blocks
// also manages jumping into the grouped 'others' bucket.
export function useTreemapData(hierarchy, domainColors, path, filter, lang) {
    return useMemo(() => {
        let currentNodes = hierarchy;
        let parentColor = null;
        const crumbs = [];

        for (const nodeId of path) {
            // the "others" bucket acts like a fake folder here
            if (nodeId === "__others__") {
                const othersLabel = t(lang, "others");
                const aggregated = aggregateOthers(currentNodes, filter, othersLabel);
                const othersNode = aggregated.find((n) => n.id === "__others__");
                if (othersNode) {
                    crumbs.push({ id: othersNode.id, name: othersNode.name });
                    currentNodes = othersNode.children || [];
                    continue;
                }
            }

            const found = currentNodes.find((n) => n.id === nodeId);
            if (found) {
                crumbs.push({ id: found.id, name: found.name });
                currentNodes = found.children || [];
                const dc = domainColors?.get(found.id);
                if (dc?.color) parentColor = dc.color;
                else if (found.color) parentColor = found.color;
            }
        }

        // only group stuff up at the top level so deep drilling works
        const othersLabel = t(lang, "others");
        const displayNodes = path.length === 0
            ? aggregateOthers(currentNodes, filter, othersLabel)
            : currentNodes;

        const processed = displayNodes
            .map((node) => {
                const count = getCount(node, filter);
                const dc = domainColors?.get(node.id);
                const color = dc?.color || node.color || parentColor || "#64748b";
                const faviconUrl = dc?.faviconUrl || null;

                return { ...node, count, color, faviconUrl };
            })
            .filter((n) => n.count > 0)
            .sort((a, b) => b.count - a.count);

        const total = processed.reduce((sum, n) => sum + n.count, 0);

        // blow up tiny items so the user can still tap them
        const adjustedProcessed = processed.map((item) => {
            const naturalPercent = total > 0 ? (item.count / total) * 100 : 0;
            if (naturalPercent < MIN_TILE_PERCENT && processed.length > 1) {
                const inflatedCount = Math.ceil((MIN_TILE_PERCENT / 100) * total);
                return { ...item, visualCount: Math.max(item.count, inflatedCount) };
            }
            return { ...item, visualCount: item.count };
        });

        const layoutInput = adjustedProcessed.map((item) => ({
            ...item,
            count: item.visualCount,
        }));

        const rawItems = computeTreemap(layoutInput);

        // put the actual numbers back after we stretched them visually
        const items = rawItems.map((layoutItem) => {
            const original = adjustedProcessed.find((p) => p.id === layoutItem.id);
            return {
                ...layoutItem,
                count: original ? original.count : layoutItem.count,
                // keep the others flag alive so clicking it doesn't break
                isOthers: original?.isOthers || false,
                children: original?.children || layoutItem.children,
            };
        });

        return { items, totalCount: total, breadcrumbs: crumbs };
    }, [hierarchy, domainColors, path, filter, lang]);
}
