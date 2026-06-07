"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollableRow({
  children,
  padding = "compact",
}: {
  children: React.ReactNode;
  padding?: "compact" | "wide";
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.8 * direction, behavior: "smooth" });
  }

  const rafRef = useRef<number | null>(null);
  function startHoverScroll(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    if (rafRef.current !== null) return;
    const step = () => {
      if (!scrollerRef.current) return;
      scrollerRef.current.scrollLeft += direction * 8;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }
  function stopHoverScroll() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }
  useEffect(() => stopHoverScroll, []);

  const outerClass =
    padding === "wide"
      ? "group/row relative -mx-6 sm:-mx-12 lg:-mx-20"
      : "group/row relative -mx-6 sm:-mx-12";
  const innerClass =
    padding === "wide"
      ? "flex gap-2 overflow-x-auto px-6 pb-4 sm:px-12 lg:px-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      : "flex gap-2 overflow-x-auto px-6 pb-4 sm:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className={outerClass}>
      <div ref={scrollerRef} className={innerClass}>
        {children}
      </div>

      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          onMouseEnter={() => startHoverScroll(-1)}
          onMouseLeave={stopHoverScroll}
          onBlur={stopHoverScroll}
          aria-label="Scroll left"
          className="absolute left-2 top-[36%] z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-lg transition-opacity duration-200 hover:bg-black/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white group-hover/row:opacity-100 group-focus-within/row:opacity-100 sm:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          onMouseEnter={() => startHoverScroll(1)}
          onMouseLeave={stopHoverScroll}
          onBlur={stopHoverScroll}
          aria-label="Scroll right"
          className="absolute right-2 top-[36%] z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-lg transition-opacity duration-200 hover:bg-black/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white group-hover/row:opacity-100 group-focus-within/row:opacity-100 sm:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
