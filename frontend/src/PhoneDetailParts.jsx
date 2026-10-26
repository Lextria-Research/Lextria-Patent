import { useState } from 'react';

// Shared pieces of the phone detail pages (LR record page, Due detail page):
// the "< Back" button and a collapsible section of label / value rows. The
// classes (.rec-*) live in App.css under "record page on phones".

export function PhoneBackButton({ label, onBack }) {
  return (
    <button type="button" className="btn rec-back" onClick={onBack}>
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M10 3L5 8l5 5" />
      </svg>
      {label}
    </button>
  );
}

// `fields` is [[label, value]]; `value` is text or any React node. Each
// section keeps its own open state, so several can be open at once.
export function PhoneSection({ title, fields, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="rec-section">
      <button
        type="button"
        className="rec-section-head"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="rec-section-name">{title}</span>
        <span className="rec-section-count">{fields.length}</span>
        <svg
          className="rec-section-chevron"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
      {isOpen && (
        <div className="rec-rows">
          {fields.map(([key, value]) => (
            <div className="rec-row" key={key}>
              <div className="rec-key">{key}</div>
              <div className="rec-value">{value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
