"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface GalleryImage {
  id: string;
  url: string;
}

export function ProductImageGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasMultiple = images.length > 1;

  function showPrev() {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }
  function showNext() {
    setActiveIndex((i) => (i + 1) % images.length);
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, images.length]);

  if (images.length === 0) {
    return <div className="aspect-square w-full rounded-xl2 border border-navy-100 bg-sand-50" />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl2 border border-navy-100 bg-sand-50"
        aria-label="Open full-size preview"
      >
        <Image
          src={images[activeIndex].url}
          alt={productName}
          fill
          sizes="600px"
          className="object-cover"
          priority
        />
      </button>

      {hasMultiple && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === activeIndex}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === activeIndex ? "border-atgblue-500" : "border-navy-100 hover:border-navy-300"
              }`}
            >
              <Image src={img.url} alt={productName} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close preview"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label="Next image"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-4"
              >
                ›
              </button>
            </>
          )}

          <div
            className="relative h-full max-h-[85vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={images[activeIndex].url} alt={productName} fill sizes="90vw" className="object-contain" />
          </div>

          {hasMultiple && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">
              {activeIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
