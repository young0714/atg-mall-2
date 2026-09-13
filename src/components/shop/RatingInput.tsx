import { Fragment } from "react";

// A pure-CSS 1-5 star rating picker for a plain <form> — no client JS.
// Radios are rendered highest-value-first as siblings of their labels and
// laid out with flex-row-reverse, so the standard ":checked ~ label"
// (and ":hover ~ label") sibling trick lights up every star from the
// selected/hovered one down to 1.
const STARS = [5, 4, 3, 2, 1] as const;

export function RatingInput({
  name = "rating",
  defaultValue,
  idPrefix,
}: {
  name?: string;
  defaultValue?: number;
  /** Disambiguates ids when multiple RatingInputs render on one page (e.g. one per row in a list) — defaults to `name`, which is only unique if there's just one on the page. */
  idPrefix?: string;
}) {
  const prefix = idPrefix ?? name;
  return (
    <div className="flex w-fit flex-row-reverse items-center justify-end gap-0.5">
      {STARS.map((value) => (
        <Fragment key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            id={`${prefix}-star-${value}`}
            defaultChecked={defaultValue === value}
            required
            className="peer sr-only"
          />
          <label
            htmlFor={`${prefix}-star-${value}`}
            className="cursor-pointer text-3xl text-navy-200 transition-colors peer-checked:text-gold-400 peer-hover:text-gold-400"
          >
            ★
          </label>
        </Fragment>
      ))}
    </div>
  );
}
