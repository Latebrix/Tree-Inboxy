import { t } from "../utils/i18n.js";
import "../styles/loading.css";

export default function LoadingScreen({ lang, progress, phase }) {
    const isRtl = lang === "ar";

    const phaseText = phase === "listing"
        ? t(lang, "fetchListing")
        : phase === "updating"
            ? t(lang, "fetchUpdating")
            : phase === "restoring"
                ? t(lang, "fetchRestoring")
                : t(lang, "loadingDetail");

    return (
        <div className="loading-screen" dir={isRtl ? "rtl" : "ltr"}>
            <div className="loading-card">
                <div className="loading-grid">
                    <span /><span /><span /><span />
                </div>

                <h2 className="loading-title">{t(lang, "title")}</h2>
                <p className="loading-subtitle">{phaseText}</p>

                {progress > 0 && (
                    <p className="loading-progress">
                        {t(lang, "fetchProgress", { count: progress.toLocaleString() })}
                    </p>
                )}

                <div className="loading-bar-track">
                    <div className="loading-bar-fill loading-bar-indeterminate" />
                </div>
            </div>
        </div>
    );
}
