export function StarRating({
  rating,
  reviewCount,
  size = "md",
}: {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
}) {
  const rounded = Math.round(rating * 2) / 2;
  const dim = size === "sm" ? 12 : 15;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={dim} height={dim} viewBox="0 0 20 20" fill={i <= rounded ? "#DBA934" : "#E7DDC9"}>
            <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
          </svg>
        ))}
      </div>
      <span className={size === "sm" ? "text-xs text-navy-400" : "text-sm text-navy-500"}>
        {rating.toFixed(1)}
        {typeof reviewCount === "number" && ` (${reviewCount})`}
      </span>
    </div>
  );
}
