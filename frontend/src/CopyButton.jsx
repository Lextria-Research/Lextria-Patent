import { useState } from 'react';

// Click/tap an application number to copy it — no separate icon (that ate
// space in an already-tight cell); the number itself is the click target,
// which also gives a bigger, easier tap area on phones. Briefly swaps the
// text for "Copied" instead, then reverts — no layout shift either way.
//
// Used everywhere an application number is shown — table cells, mobile
// card footers, detail page rows. `empty` is the fallback for a blank
// value (nothing to copy then, so it's plain text, not clickable); it
// defaults to the em dash most tables/cards use, and is overridden to a
// plain hyphen on the couple of detail pages whose other fields use that.
//
// A <span role="button">, not a real <button>: MobileCard renders the
// whole card as a <button>, and a <button> can't nest inside one.
export function AppNoValue({ value, empty = '—' }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <>{empty}</>;

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(String(value)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      },
      // Clipboard access can be blocked (permissions, non-HTTPS, etc.) —
      // fail silently rather than throw; the number is still there to
      // select by hand.
      () => {}
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') handleCopy(e);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      className={`appno-value ${copied ? 'is-copied' : ''}`}
      title={copied ? 'Copied' : 'Click to copy'}
      aria-label={copied ? 'Copied' : `Copy application number ${value}`}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
    >
      {copied ? 'Copied' : value}
    </span>
  );
}

export default AppNoValue;
