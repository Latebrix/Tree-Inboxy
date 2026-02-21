import { useState } from "react";
import { Home, ChevronRight, ChevronLeft, Filter, Globe, LogOut, LayoutGrid, List, RefreshCw, Menu, X } from "lucide-react";
import { t } from "../utils/i18n.js";
import Logo from "./Logo.jsx";
import "../styles/header.css";

export default function Header({
    lang,
    userProfile,
    filter,
    totalCount,
    breadcrumbs,
    path,
    viewMode,
    onViewModeChange,
    onBreadcrumbClick,
    onFilterChange,
    onLangChange,
    onSignOut,
    onSync,
}) {
    const isRtl = lang === "ar";
    const Chevron = isRtl ? ChevronLeft : ChevronRight;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="header">
            <div className="header-left">
                {/* Logo or User Profile */}
                <div className="header-panel" style={{ maxWidth: "250px" }}>
                    {userProfile ? (
                        <div className="header-user-profile">
                            <img src={userProfile.picture} alt="" className="header-user-avatar" referrerPolicy="no-referrer" />
                            <div className="header-user-info">
                                <span className="header-user-name">{userProfile.name}</span>
                                <span className="header-user-email">{userProfile.email}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="header-logo">
                            <Logo size={20} className="header-logo-svg" />
                            <span className="header-logo-text">{t(lang, "title")}</span>
                        </div>
                    )}
                </div>

                {/* Breadcrumbs */}
                <div className="header-panel breadcrumbs hide-scrollbar">
                    <button
                        className={`breadcrumb-home ${path.length === 0 ? "active" : ""}`}
                        onClick={() => onBreadcrumbClick(-1)}
                        title={t(lang, "home")}
                    >
                        <Home size={14} />
                    </button>

                    {breadcrumbs.map((crumb, idx) => (
                        <span key={crumb.id} style={{ display: "contents" }}>
                            <Chevron size={12} className="breadcrumb-chevron" />
                            <button
                                className={`breadcrumb-btn ${idx === breadcrumbs.length - 1 ? "active" : ""}`}
                                onClick={() => onBreadcrumbClick(idx)}
                            >
                                {crumb.name}
                            </button>
                        </span>
                    ))}
                </div>

                <button
                    className="header-panel mobile-menu-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
            </div>

            {/* Right controls */}
            <div className={`header-panel header-right ${isMenuOpen ? "mobile-open" : ""}`}>
                <button
                    className={`filter-btn ${filter === "unread" ? "active" : ""}`}
                    onClick={onFilterChange}
                >
                    <Filter size={12} />
                    <span className="filter-label">
                        {filter === "unread" ? t(lang, "unreadOnly") : t(lang, "allEmails")}
                    </span>
                </button>

                <div className="header-divider" />
                <span className="header-total">{totalCount.toLocaleString()}</span>
                <div className="header-divider" />

                <button className="header-icon-btn" onClick={onSync} title={t(lang, "fetchUpdating")}>
                    <RefreshCw size={15} />
                </button>

                {/* View mode toggle — hidden on mobile and sub-pages */}
                {path.length === 0 && (
                    <button
                        className="header-icon-btn view-toggle-btn"
                        onClick={onViewModeChange}
                        title={viewMode === "grid" ? t(lang, "listView") : t(lang, "gridView")}
                    >
                        {viewMode === "grid" ? <List size={15} /> : <LayoutGrid size={15} />}
                    </button>
                )}

                <button className="header-icon-btn" onClick={onLangChange} title="Language">
                    <Globe size={15} />
                    <span className="header-lang-label">{lang}</span>
                </button>

                <button className="header-icon-btn" onClick={onSignOut} title={t(lang, "signOut")}>
                    <LogOut size={15} />
                </button>
            </div>
        </div>
    );
}
