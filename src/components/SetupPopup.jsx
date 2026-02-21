import { useState } from "react";
import { Shield, ChevronDown, Key } from "lucide-react";
import { t } from "../utils/i18n.js";
import "../styles/setupPopup.css";

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

export default function SetupPopup({ lang, onSignIn, error }) {
    const [clientId, setClientId] = useState(() => localStorage.getItem("smartinbox_client_id") || "");
    const [showHelp, setShowHelp] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignIn = async () => {
        if (!clientId.trim()) return;
        setLoading(true);
        try {
            await onSignIn(clientId.trim());
        } catch {
            setLoading(false);
        }
    };

    return (
        <div className="setup-popup-overlay" dir={lang === "ar" ? "rtl" : "ltr"}>
            <div className="setup-popup-card">
                <div className="setup-popup-header">
                    <h2 className="setup-popup-title">{t(lang, "setupTitle")}</h2>
                    <span className="setup-popup-subtitle">{t(lang, "setupGateway")}</span>
                </div>

                {error && <div className="setup-popup-error">{error}</div>}

                <div className="setup-popup-input-group">
                    <label className="setup-popup-label" htmlFor="client-id-input">
                        {t(lang, "clientIdLabel")}
                    </label>
                    <div className="setup-popup-input-wrapper">
                        <input
                            id="client-id-input"
                            className="setup-popup-input"
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder={t(lang, "clientIdPlaceholder")}
                            dir="ltr"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <Key className="setup-popup-input-icon" size={16} />
                    </div>
                </div>

                <button
                    className="setup-popup-primary-btn"
                    onClick={handleSignIn}
                    disabled={!clientId.trim() || loading}
                >
                    {loading ? "..." : (
                        <>
                            <span className="setup-popup-google-icon-wrapper">
                                <GoogleIcon />
                            </span>
                            {t(lang, "signIn")}
                        </>
                    )}
                </button>

                <div className="setup-popup-help-container">
                    <button
                        className="setup-popup-help-toggle"
                        onClick={() => setShowHelp(!showHelp)}
                    >
                        {t(lang, "clientIdHelp")}
                        <ChevronDown
                            size={14}
                            style={{
                                transform: showHelp ? "rotate(180deg)" : "none",
                                transition: "transform 0.2s",
                            }}
                        />
                    </button>
                    {showHelp && (
                        <div className="setup-popup-help-steps">
                            <ol>
                                {t(lang, "clientIdSteps").map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>

                <div className="setup-popup-footer">
                    <span className="setup-popup-privacy">
                        <Shield size={14} /> {t(lang, "privacyNote")}
                    </span>
                </div>
            </div>
        </div>
    );
}
