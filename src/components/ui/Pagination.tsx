// Shared Prev/Next + numbered-page control — first built for /shop, now
// reused wherever a list is paged (admin tables, account history, etc).
// Server-rendered `<a>` links only, matching this app's URL-param-driven
// filtering pattern (no client JS): the caller owns building each page's
// href (so it can preserve its own filters) and just hands us the range.

export function Pagination({
  currentPage,
  totalPages,
  hrefForPage,
}: {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <PageLink page={currentPage - 1} href={hrefForPage(currentPage - 1)} disabled={currentPage === 1}>
        Prev
      </PageLink>
      {paginationRange(currentPage, totalPages).map((item, i) =>
        item === "..." ? (
          <span key={`ellipsis-${i}`} className="flex h-8 min-w-8 items-center justify-center text-sm text-navy-300">
            …
          </span>
        ) : (
          <PageLink key={item} page={item} href={hrefForPage(item)} active={item === currentPage}>
            {item}
          </PageLink>
        ),
      )}
      <PageLink page={currentPage + 1} href={hrefForPage(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </PageLink>
    </nav>
  );
}

// Windowed page list around the current page, plus the first/last page
// always shown — "..." marks a skipped gap. e.g. page 6 of 12 -> [1, "...",
// 5, 6, 7, "...", 12].
function paginationRange(current: number, total: number): (number | "...")[] {
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);

  const pages: (number | "...")[] = [1];
  if (windowStart > 2) pages.push("...");
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);
  if (windowEnd < total - 1) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

function PageLink({
  page,
  href,
  active,
  disabled,
  children,
}: {
  page: number;
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base = "flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-sm font-semibold";
  if (disabled) {
    return <span className={`${base} text-navy-100`}>{children}</span>;
  }
  if (active) {
    return (
      <span aria-current="page" className={`${base} bg-navy-900 text-white`}>
        {children}
      </span>
    );
  }
  return (
    <a href={href} className={`${base} text-navy-600 hover:bg-sand-100`}>
      {children}
    </a>
  );
}
