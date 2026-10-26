// Shared "Patent Hub" wordmark — the actual Lextria Research seal plus a
// two-tone title — used on both the login screen and the main header so
// the two stay visually identical without duplicating markup.
function Brand() {
  return (
    <span className="brand-mark">
      <img className="brand-icon" src="/image.png" alt="" aria-hidden="true" />
      <span className="brand-text">
        Patent<span className="brand-text-accent"> Hub</span>
      </span>
    </span>
  );
}

export default Brand;
