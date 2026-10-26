// Without VITE_API_URL, talk to the backend on whatever host served this
// page — localhost on the dev machine, the PC's LAN IP when opened from a
// phone — instead of a hardcoded address that goes stale.
export const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

const TOKEN_KEY = 'authToken';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Wraps fetch to attach the auth token and send the user back to the
// login screen if the server rejects it.
export async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['X-Auth-Token'] = token;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
  return res;
}
