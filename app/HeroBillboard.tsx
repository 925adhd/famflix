"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type FeaturedTitle = {
  id: string;
  name: string;
  year: number | null;
  kind: string;
  overview: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
};

function FamflixBadge({ kind }: { kind: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.35em]">
      <span className="text-3xl font-black leading-none text-accent">F</span>
      <span className="text-white/90">
        {kind === "movie" ? "ORIGINAL FILM" : "SERIES"}
      </span>
    </div>
  );
}

type FallbackSlide = { src: string; position?: string };

const INTERVAL_MS = 6000;

export function HeroBillboard({
  titles,
  fallbackSlides,
  canUpload,
}: {
  titles: FeaturedTitle[];
  fallbackSlides: FallbackSlide[];
  canUpload: boolean;
}) {
  const cycleTitles = titles.filter((t) => t.backdrop_url);
  const hasTitles = cycleTitles.length > 0;
  const slides: FallbackSlide[] = hasTitles
    ? cycleTitles.map((t) => ({ src: t.backdrop_url! }))
    : fallbackSlides;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearTimeout(id);
  }, [slides.length, index]);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (startX === null || startY === null || slides.length <= 1) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    setIndex((i) =>
      dx < 0
        ? (i + 1) % slides.length
        : (i - 1 + slides.length) % slides.length
    );
  };

  const current = hasTitles ? cycleTitles[index % cycleTitles.length] : null;

  return (
    <section
      className="relative flex min-h-[85vh] flex-col items-start justify-end gap-4 overflow-hidden px-6 pb-24 pt-20 sm:px-12 sm:pb-32 lg:px-20"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 -z-20 overflow-hidden bg-black">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${slide.src})`,
              backgroundSize: "cover",
              backgroundPosition: slide.position ?? "center",
              opacity: i === index ? 1 : 0,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[60%] bg-gradient-to-t from-black via-black/50 to-transparent" />

      {current ? (
        <>
          {current.tmdb_id ? (
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Featured · {current.kind === "movie" ? "Film" : "Series"}
            </span>
          ) : (
            <FamflixBadge kind={current.kind} />
          )}
          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight drop-shadow-2xl sm:text-7xl">
            {current.name}
          </h1>
          {current.year && (
            <p className="text-sm font-medium text-zinc-300">{current.year}</p>
          )}
          {current.overview && (
            <p className="max-w-xl text-base text-zinc-200 drop-shadow sm:text-lg">
              {current.overview.length > 240
                ? current.overview.slice(0, 240) + "…"
                : current.overview}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/title/${current.id}`}
              className="flex items-center gap-2 rounded bg-white px-8 py-3 text-base font-semibold text-black transition hover:bg-white/90"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </Link>
            <Link
              href={`/title/${current.id}`}
              className="flex items-center gap-2 rounded bg-zinc-600/70 px-8 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-zinc-500/70"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" />
              </svg>
              More Info
            </Link>
          </div>

          {cycleTitles.length > 1 && (
            <div className="mt-6 flex gap-2">
              {cycleTitles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide ${i + 1}`}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? "w-10 bg-white" : "w-5 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight drop-shadow-2xl sm:text-7xl">
            Your family library.
          </h1>
          <p className="max-w-xl text-lg text-zinc-200 drop-shadow">
            A private collection, just for us.
          </p>
          {canUpload && (
            <Link
              href="/upload"
              className="mt-4 flex w-fit items-center gap-2 rounded bg-white px-8 py-3 text-base font-semibold text-black transition hover:bg-white/90"
            >
              Upload the first title
            </Link>
          )}
        </>
      )}
    </section>
  );
}
