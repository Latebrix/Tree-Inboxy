/**
 * Squarified treemap layout algorithm.
 * Produces rectangles with aspect ratios closer to 1:1 (more square-like).
 *
 * Input:  Array of { id, count, ... } sorted descending by count
 * Output: Same array with added { x, y, width, height } in percentages (0‑100)
 */
export function computeTreemap(items, w = 100, h = 100, x = 0, y = 0) {
    if (!items.length) return [];
    if (items.length === 1) {
        return [{ ...items[0], x, y, width: w, height: h }];
    }

    const total = items.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return [];

    const sorted = [...items].sort((a, b) => b.count - a.count);
    const isWide = w >= h;
    const side = isWide ? h : w;

    let best = layoutRow(sorted, 0, 1, side, total);
    for (let i = 2; i < sorted.length; i++) {
        const candidate = layoutRow(sorted, 0, i, side, total);
        if (worstAspectRatio(candidate) > worstAspectRatio(best)) break;
        best = candidate;
    }

    const rowCount = best.length;
    const rowTotal = sorted.slice(0, rowCount).reduce((s, d) => s + d.count, 0);
    const rowFraction = rowTotal / total;

    let rowX = x,
        rowY = y,
        rowW,
        rowH;
    let restX = x,
        restY = y,
        restW,
        restH;

    if (isWide) {
        rowW = w * rowFraction;
        rowH = h;
        restX = x + rowW;
        restW = w - rowW;
        restH = h;
    } else {
        rowW = w;
        rowH = h * rowFraction;
        restY = y + rowH;
        restW = w;
        restH = h - rowH;
    }

    const placed = placeRow(sorted.slice(0, rowCount), rowX, rowY, rowW, rowH, isWide);
    const remaining = sorted.slice(rowCount);

    return [...placed, ...computeTreemap(remaining, restW, restH, restX, restY)];
}

function layoutRow(items, start, count, side, total) {
    const slice = items.slice(start, start + count);
    const rowTotal = slice.reduce((s, d) => s + d.count, 0);
    const rowWidth = (rowTotal / total) * side;

    return slice.map((item) => {
        const h = (item.count / rowTotal) * side;
        return { w: rowWidth, h };
    });
}

function worstAspectRatio(row) {
    let worst = 0;
    for (const r of row) {
        const ratio = Math.max(r.w / r.h, r.h / r.w);
        if (ratio > worst) worst = ratio;
    }
    return worst;
}

function placeRow(items, x, y, width, height, isWide) {
    const total = items.reduce((s, d) => s + d.count, 0);
    const results = [];
    let offset = 0;

    for (const item of items) {
        const fraction = item.count / total;

        if (isWide) {
            const itemH = height * fraction;
            results.push({ ...item, x, y: y + offset, width, height: itemH });
            offset += itemH;
        } else {
            const itemW = width * fraction;
            results.push({ ...item, x: x + offset, y, width: itemW, height });
            offset += itemW;
        }
    }

    return results;
}
