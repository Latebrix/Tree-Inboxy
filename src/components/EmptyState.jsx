import { t } from "../utils/i18n.js";

export default function EmptyState({ lang }) {
    return (
        <div className="treemap-empty">
            <p>{t(lang, "noResults")}</p>
        </div>
    );
}
