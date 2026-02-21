const SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";
const GIS_SRC = "https://accounts.google.com/gsi/client";

let tokenClient = null;
let accessToken = null;
let onTokenCallback = null;

// grab the google identity script and slap it in the document
function loadGisScript() {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = GIS_SRC;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
        document.head.appendChild(script);
    });
}

// sets up the oauth token client using our client id
export async function initAuth(clientId) {
    await loadGisScript();

    return new Promise((resolve) => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (response) => {
                if (response.error) {
                    onTokenCallback?.(null, response.error);
                    return;
                }
                accessToken = response.access_token;
                onTokenCallback?.(accessToken, null);
            },
        });
        resolve();
    });
}

// fires up the google login popup and hands back the token
export function signIn() {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Auth not initialized. Call initAuth() first."));
            return;
        }

        onTokenCallback = (token, error) => {
            if (error) reject(new Error(error));
            else resolve(token);
        };

        tokenClient.requestAccessToken();
    });
}

// kills the current token and logs them out
export function signOut() {
    if (accessToken) {
        window.google.accounts.oauth2.revoke(accessToken);
        accessToken = null;
    }
}

// grab current token
export function getAccessToken() {
    return accessToken;
}

// stash client id in local storage
export function saveClientId(clientId) {
    localStorage.setItem("smartinbox_client_id", clientId);
}

// pull client id out of storage
export function loadClientId() {
    return localStorage.getItem("smartinbox_client_id");
}

// nuke client id from storage
export function clearClientId() {
    localStorage.removeItem("smartinbox_client_id");
}

// hit google api to get the user's name, email, and pfp
export async function fetchUserProfile(token) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch user profile");
    return await res.json();
}

// save their basic info so we don't have to fetch it every time
export function saveUserProfile(profile) {
    localStorage.setItem("smartinbox_user_profile", JSON.stringify(profile));
}

// load up their cached info
export function loadUserProfile() {
    try {
        const json = localStorage.getItem("smartinbox_user_profile");
        return json ? JSON.parse(json) : null;
    } catch {
        return null;
    }
}

// wipe profile data
export function clearUserProfile() {
    localStorage.removeItem("smartinbox_user_profile");
}
