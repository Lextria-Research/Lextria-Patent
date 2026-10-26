import { useState } from 'react';

// Phone paging shared by the patent list tabs: 25 per page with
// Prev / Page X of Y / Next. Desktop and tablet never page these lists (they
// show every row) because one row per patent tops out around 2,300 rows. The
// Due dashboard is the exception — "All years" multiplies that by every due
// type across all time, so it pages on desktop too, just with a bigger page
// (see its call site). The current page is stored together with `filterKey`
// (a string of every filter, search, month and year that shapes the list),
// so changing any of them is back on page 1 without an effect.
//
//   const pager = usePhonePage(filterKey, filtered.length);   // call before any early return
//   pager.slice(filtered)                                     // this page's rows
//   <PhonePager pager={pager} />
const PHONE_PAGE_SIZE = 25;

export function usePhonePage(filterKey, itemCount, pageSize = PHONE_PAGE_SIZE) {
  const [state, setState] = useState({ key: '', page: 1 });
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = Math.min(state.key === filterKey ? state.page : 1, totalPages);
  return {
    page,
    totalPages,
    setPage: (next) => setState({ key: filterKey, page: Math.min(Math.max(1, next), totalPages) }),
    slice: (items) => items.slice((page - 1) * pageSize, page * pageSize),
  };
}

export function PhonePager({ pager }) {
  const { page, totalPages, setPage } = pager;
  return (
    <div className="pagination">
      <button className="btn" onClick={() => setPage(page - 1)} disabled={page === 1}>
        Prev
      </button>
      <span className="pagination-info">Page {page} of {totalPages}</span>
      <button className="btn" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
        Next
      </button>
    </div>
  );
}
