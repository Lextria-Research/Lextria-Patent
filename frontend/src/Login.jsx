import { useState } from 'react';
import { setToken, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import Brand from './Brand';

// On phones, autofocus would pop the keyboard over the page on load.
const isPhone = window.matchMedia('(max-width: 720px)').matches;

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(await serverErrorMessage(res, 'Login failed'));
        return;
      }
      const body = await res.json();
      setToken(body.token);
      onLogin();
    } catch (err) {
      setError(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title"><Brand /></h1>
        <p className="login-subtitle">Sign in to continue</p>
        {error && <div className="login-error">{error}</div>}
        <label className="login-field">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus={!isPhone}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
          />
        </label>
        <label className="login-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            enterKeyHint="go"
          />
        </label>
        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default Login;
