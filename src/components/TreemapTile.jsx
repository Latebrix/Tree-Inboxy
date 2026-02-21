import { t } from "../utils/i18n.js";
import { OTHERS_THRESHOLD_PERCENT } from "../utils/grouping.js";

export default function TreemapTile({
    item,
    totalCount,
    isZoomable,
    faviconUrl,
    onClick,
    lang,
    viewMode,
}) {
    const percentage = ((item.count / totalCount) * 100).toFixed(1);
    const isOthers = item.isOthers;
    const isList = viewMode === "list";

    const initials = item.name
        .replace(/\.\w+$/, "")
        .slice(0, 2)
        .toUpperCase();

    // list mode doesn't need absolute positioning, just a flex block
    if (isList) {
        return (
            <div className={`list-tile ${isZoomable ? "zoomable" : ""} ${isOthers ? "others-tile" : ""}`}
                onClick={onClick}
                style={{ backgroundColor: item.color || "#64748b" }}
            >
                <div className="tile-glass-overlay" />
                <div className="list-tile-inner">
                    <div className="list-tile-left">
                        {faviconUrl ? (
                            <img className="list-tile-favicon" src={faviconUrl} alt="" loading="lazy"
                                onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                            <div className="list-tile-logo">{isOthers ? "✱" : initials}</div>
                        )}
                        <div className="list-tile-info">
                            <span className="list-tile-name">{item.name}</span>
                            {isOthers && (
                                <span className="list-tile-others-note">
                                    * {t(lang, "othersExplanation", { percent: OTHERS_THRESHOLD_PERCENT })}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="list-tile-right">
                        <div className="list-tile-count-group">
                            <span className="list-tile-count">{item.count.toLocaleString()}</span>
                            <span className="list-tile-count-label">{t(lang, "messages")}</span>
                        </div>
                        <div className="list-tile-bar-wrap">
                            <div className="list-tile-bar-track">
                                <div className="list-tile-bar-fill" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="list-tile-bar-pct">{percentage}%</span>
                        </div>
                    </div>
                </div>

                {/* Hover cue for list mode */}
                {isZoomable && (
                    <div className="list-tile-hover-cue">
                        <span>{t(lang, "clickToExplore")}</span>
                    </div>
                )}
            </div>
        );
    }

    // normal grid mode - math dictates the size from computeTreemap
    return (
        <div
            className="treemap-tile-wrapper"
            style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
            }}
        >
            <div
                className={`treemap-tile ${isZoomable ? "zoomable" : ""} ${isOthers ? "others-tile" : ""}`}
                onClick={onClick}
                style={{ backgroundColor: item.color || "#64748b" }}
            >
                <div className="tile-glass-overlay" />

                <div className="tile-content">
                    {/* Header: favicon + name */}
                    <div className="tile-header">
                        {faviconUrl ? (
                            <img
                                className="tile-favicon"
                                src={faviconUrl}
                                alt=""
                                loading="lazy"
                                onError={(e) => { e.target.style.display = "none"; }}
                            />
                        ) : (
                            <div className="tile-logo-placeholder">
                                {isOthers ? "✱" : initials}
                            </div>
                        )}
                        <span className="tile-name">{item.name}</span>
                    </div>

                    {/* Others explanation */}
                    {isOthers && (
                        <p className="tile-others-note">
                            * {t(lang, "othersExplanation", { percent: OTHERS_THRESHOLD_PERCENT })}
                        </p>
                    )}

                    {/* Footer: count + bar */}
                    <div className="tile-footer">
                        <div className="tile-count-row">
                            <span className="tile-count">{item.count.toLocaleString()}</span>
                            <span className="tile-count-label">{t(lang, "messages")}</span>
                        </div>

                        <div className="tile-progress">
                            <div className="tile-progress-track">
                                <div className="tile-progress-fill" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="tile-progress-label">{percentage}%</span>
                        </div>
                    </div>
                </div>

                {/* Hover cue for grid mode */}
                {isZoomable && (
                    <div className="tile-hover-overlay">
                        <span className="tile-hover-label">{t(lang, "clickToExplore")}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
