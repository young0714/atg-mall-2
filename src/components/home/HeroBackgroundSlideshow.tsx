"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDE_INTERVAL_MS = 5000;

// Renders only when the homepage has admin-approved hero photos (see
// isHeroEligible on Product) — callers fall back to the plain gradient hero
// when this has nothing to show, so this component never needs an empty state.
export function HeroBackgroundSlideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0" aria-hidden>
      {images.map((url, i) => (
        <Image
          key={url}
          src={url}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className="object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/60 via-navy-900/75 to-navy-900" />
    </div>
  );
}
