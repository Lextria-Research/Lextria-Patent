// A fetch() rejection with no HTTP response (connection refused, backend
// down, DNS failure, etc.) surfaces as a TypeError in the browser.
export function isNetworkError(err) {
  return err instanceof TypeError;
}

export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection or that the backend is running.";

// Reads the backend's { error: '...' } body when a response comes back
// with a non-2xx status, falling back to a status-coded message.
export async function serverErrorMessage(res, fallback) {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    // response wasn't JSON or was empty
  }
  return `${fallback} (server responded with status ${res.status})`;
}
