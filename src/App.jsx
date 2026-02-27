import { useState, useCallback, useMemo, useEffect } from "react";
import { useGmail } from "./hooks/useGmail.js";
import { useTreemapData } from "./hooks/useTreemapData.js";
import { initAuth, signIn, signOut as authSignOut, saveClientId, loadClientId, fetchUserProfile, saveUserProfile, loadUserProfile, clearUserProfile } from "./services/auth.js";
import SetupPopup from "./components/SetupPopup.jsx";
import Header from "./components/Header.jsx";
import Treemap from "./components/Treemap.jsx";
import { t } from "./utils/i18n.js";

export default function App() {
    const [lang, setLang] = useState("en");
    const [screen, setScreen] = useState("init"); // init, setup, or treemap
    const [userProfile, setUserProfile] = useState(null);
    const [filter, setFilter] = useState("all");
    const [path, setPath] = useState([]);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [userViewMode, setUserViewMode] = useState("grid"); // what the user picked

    const gmail = useGmail();

    const hierarchy = gmail.hierarchy;
    const domainColors = useMemo(() => gmail.domainColors, [gmail.domainColors]);

    // subfolders always use list view so it's readable - 
    const viewMode = path.length > 0 ? "list" : userViewMode;

    const { items, totalCount, breadcrumbs } = useTreemapData(
        hierarchy,
        domainColors,
        path,
        filter,
        lang
    );

    // checking if we're still grabbing emails from google
    const isLoading = gmail.status === "fetching" || gmail.status === "processing" || gmail.status === "restoring";

    // on mount: load cache if we have it, else show the setup popup
    useEffect(() => {
        async function init() {
            const clientId = loadClientId();
            if (!clientId) {
                setScreen("setup");
                return;
            }

            const restored = await gmail.restoreData();
            if (restored) {
                const p = loadUserProfile();
                if (p) setUserProfile(p);
                setScreen("treemap");
                // init auth here so if they click sync later, it works without jumping
                try {
                    await initAuth(clientId);
                } catch {
                    // Ignore
                }
            } else {
                setScreen("setup");
            }
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSignIn = useCallback(async (clientId) => {
        setError(null);
        try {
            saveClientId(clientId);
            await initAuth(clientId);
            const token = await signIn();
            const profile = await fetchUserProfile(token);
            saveUserProfile(profile);
            setUserProfile(profile);

            // jump right to the treemap - the tiles will pop in live
            setScreen("treemap");
            await gmail.fetchData(token);
        } catch (err) {
            setError(err.message);
            setScreen("setup");
        }
    }, [gmail]);

    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleSync = useCallback(async () => {
        setError(null);
        try {
            const token = await signIn();
            const profile = await fetchUserProfile(token);

            if (userProfile && profile.email !== userProfile.email) {
                // whoops, wrong account. kill the token and warn them
                showToast(t(lang, "accountMismatch"));
                authSignOut();
                return;
            }

            saveUserProfile(profile);
            setUserProfile(profile);
            gmail.fetchNewData(token);
        } catch (err) {
            showToast(err.message);
        }
    }, [gmail, userProfile, lang, showToast]);

    const handleSignOut = useCallback(async () => {
        authSignOut();
        clearUserProfile();
        setUserProfile(null);
        await gmail.reset();
        setPath([]);
        setError(null);
        window.location.reload();
    }, [gmail]);

    const handleBreadcrumbClick = useCallback((index) => {
        setPath((prev) => (index === -1 ? [] : prev.slice(0, index + 1)));
    }, []);

    const handleTileClick = useCallback((nodeId) => {
        setPath((prev) => [...prev, nodeId]);
    }, []);

    const isRtl = lang === "ar";

    // initial cache check state
    if (screen === "init") {
        return (
            <div className="app-root" dir={isRtl ? "rtl" : "ltr"} style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="inline-loading-popup">
                    <div className="inline-loading-spinner" />
                    <span>{t(lang, "fetchRestoring")}</span>
                </div>
            </div>
        );
    }


    // main treemap view. the little loader popup shows at the bottom if needed
    return (
        <div
            className="app-root"
            dir={isRtl ? "rtl" : "ltr"}
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
            <Header
                lang={lang}
                userProfile={userProfile}
                filter={filter}
                totalCount={totalCount}
                breadcrumbs={breadcrumbs}
                path={path}
                viewMode={viewMode}
                onViewModeChange={() => setUserViewMode((m) => (m === "grid" ? "list" : "grid"))}
                onBreadcrumbClick={handleBreadcrumbClick}
                onFilterChange={() => setFilter((f) => (f === "all" ? "unread" : "all"))}
                onLangChange={() => setLang((l) => (l === "en" ? "ar" : "en"))}
                onSync={handleSync}
                onSignOut={handleSignOut}
            />

            <Treemap
                items={items}
                totalCount={totalCount}
                hierarchy={hierarchy}
                lang={lang}
                viewMode={viewMode}
                onTileClick={handleTileClick}
            />

            {screen === "setup" && (
                <SetupPopup
                    lang={lang}
                    onSignIn={handleSignIn}
                    error={error}
                />
            )}

            {/* Inline loading popup at bottom */}
            {isLoading && (
                <div className="inline-loading-overlay">
                    <div className="inline-loading-popup">
                        <div className="inline-loading-spinner" />
                        <span>
                            {gmail.progressPhase === "listing"
                                ? t(lang, "fetchListing")
                                : gmail.progressPhase === "updating"
                                    ? t(lang, "fetchUpdating")
                                    : gmail.progressPhase === "processing"
                                        ? t(lang, "fetchProcessing")
                                        : gmail.progressPhase === "restoring"
                                            ? t(lang, "fetchRestoring")
                                            : t(lang, "fetchProgress", { count: gmail.progress.toLocaleString() })}
                        </span>
                        {gmail.progress > 0 && gmail.progressPhase !== "updating" && gmail.progressPhase !== "processing" && (
                            <span className="inline-loading-count">
                                {gmail.progress.toLocaleString()} {t(lang, "messages")}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* toast for errors */}
            {toast && (
                <div className="app-toast">
                    {toast}
                </div>
            )}
        </div>
    );
}

// secret demo mode for testing UI without real emails
if (typeof window !== "undefined") {
    window.__smartinbox_demo = async () => {
        const { DEMO_HIERARCHY, getDemoDomainColors } = await import("./data/demo.js");
        console.log("Demo data loaded.");
        return { hierarchy: DEMO_HIERARCHY, colors: getDemoDomainColors() };
    };
}
