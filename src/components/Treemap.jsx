import { findNodeById } from "../utils/grouping.js";
import TreemapTile from "./TreemapTile.jsx";
import EmptyState from "./EmptyState.jsx";
import "../styles/treemap.css";

export default function Treemap({
    items,
    totalCount,
    hierarchy,
    lang,
    viewMode,
    onTileClick,
}) {
    const handleClick = (item) => {
        // the others tile acts special so people can click into it
        if (item.isOthers && item.children?.length > 0) {
            onTileClick(item.id);
            return;
        }
        // normal tiles just check if they got kids in the actual data
        const original = findNodeById(hierarchy, item.id);
        if (original?.children?.length > 0) {
            onTileClick(item.id);
        }
    };

    if (items.length === 0) {
        return (
            <div className="treemap-area custom-scrollbar">
                <div className="treemap-container">
                    <EmptyState lang={lang} />
                </div>
            </div>
        );
    }

    const isList = viewMode === "list";

    return (
        <div className={`treemap-area custom-scrollbar ${isList ? "list-mode" : "grid-mode"}`}>
            <div className={`treemap-container ${isList ? "treemap-list" : ""}`}>
                {items.map((item) => {
                    // always let folks click into the others bucket
                    let isZoomable = false;
                    if (item.isOthers) {
                        isZoomable = item.children?.length > 0;
                    } else {
                        const original = findNodeById(hierarchy, item.id);
                        isZoomable = original?.children?.length > 0;
                    }

                    return (
                        <TreemapTile
                            key={item.id}
                            item={item}
                            totalCount={totalCount}
                            isZoomable={isZoomable}
                            faviconUrl={item.faviconUrl}
                            onClick={() => handleClick(item)}
                            lang={lang}
                            viewMode={viewMode}
                        />
                    );
                })}
            </div>
        </div>
    );
}
