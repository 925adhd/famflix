"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWatchProgress } from "./actions";
import { markCreditsStart } from "@/app/upload/actions";
import { useDemoHref } from "@/app/components/demoHref";

const SAVE_EVERY_SECONDS = 10;
const COMPLETE_THRESHOLD = 0.95;
const COUNTDOWN_SECONDS = 30;
const CREDITS_HEURISTIC_FRACTION = 0.92;

type NextUp = { id: string; name: string; poster_url: string | null };

export function VideoPlayer({
  src,
  titleId,
  initialPositionSeconds,
  nextUp,
  autoPlay,
  creditsStartSeconds,
  canEdit,
}: {
  src: string;
  titleId: string;
  initialPositionSeconds: number;
  nextUp: NextUp | null;
  autoPlay: boolean;
  creditsStartSeconds: number | null;
  canEdit: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const hasSeekedRef = useRef(false);
  const dismissedRef = useRef(false);
  const router = useRouter();
  const withDemo = useDemoHref();

  const [showNext, setShowNext] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [credits, setCredits] = useState<number | null>(creditsStartSeconds);
  const [markStatus, setMarkStatus] = useState<string | null>(null);
  const [, startMarkTransition] = useTransition();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function seekToStart() {
      if (hasSeekedRef.current) return;
      if (initialPositionSeconds > 2 && v!.duration > initialPositionSeconds + 5) {
        v!.currentTime = initialPositionSeconds;
      }
      hasSeekedRef.current = true;
    }

    function persist(position: number, completed: boolean) {
      void saveWatchProgress(titleId, position, completed).catch(() => {});
    }

    function onTimeUpdate() {
      const pos = v!.currentTime;
      const dur = v!.duration;
      if (!Number.isFinite(pos) || !Number.isFinite(dur) || dur === 0) return;

      const trigger =
        credits !== null && credits > 0
          ? credits
          : dur * CREDITS_HEURISTIC_FRACTION;
      if (nextUp && pos >= trigger && !dismissedRef.current) {
        setShowNext((prev) => {
          if (prev) return prev;
          setCountdown(COUNTDOWN_SECONDS);
          return true;
        });
      }
      if (pos < trigger - 5) {
        dismissedRef.current = false;
      }

      const nearEnd = pos / dur >= COMPLETE_THRESHOLD;
      if (nearEnd) {
        if (!lastSavedRef.current || lastSavedRef.current < pos - 1) {
          persist(pos, true);
          lastSavedRef.current = pos;
        }
        return;
      }

      if (pos - lastSavedRef.current >= SAVE_EVERY_SECONDS) {
        persist(pos, false);
        lastSavedRef.current = pos;
      }
    }

    function onPause() {
      const pos = v!.currentTime;
      const dur = v!.duration;
      if (!Number.isFinite(pos)) return;
      const completed =
        Number.isFinite(dur) && dur > 0 && pos / dur >= COMPLETE_THRESHOLD;
      persist(pos, completed);
      lastSavedRef.current = pos;
    }

    function onEnded() {
      persist(v!.duration || v!.currentTime, true);
      if (nextUp && !dismissedRef.current) {
        setShowNext((prev) => {
          if (prev) return prev;
          setCountdown(COUNTDOWN_SECONDS);
          return true;
        });
      }
    }

    v.addEventListener("loadedmetadata", seekToStart);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("loadedmetadata", seekToStart);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [titleId, initialPositionSeconds, nextUp, credits]);

  useEffect(() => {
    if (!showNext) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [showNext]);

  useEffect(() => {
    if (!showNext || !nextUp) return;
    if (countdown <= 0) {
      router.push(withDemo(`/title/${nextUp.id}?autoplay=1`));
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [showNext, countdown, nextUp, router, withDemo]);

  useEffect(() => {
    if (!autoPlay) return;
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    };
    if (v.readyState >= 2) tryPlay();
    else {
      v.addEventListener("loadeddata", tryPlay, { once: true });
      return () => v.removeEventListener("loadeddata", tryPlay);
    }
  }, [autoPlay, src]);

  function playNow() {
    if (!nextUp) return;
    router.push(withDemo(`/title/${nextUp.id}?autoplay=1`));
  }

  function cancel() {
    dismissedRef.current = true;
    setShowNext(false);
  }

  function formatTime(seconds: number) {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  }

  function markNow() {
    const v = videoRef.current;
    if (!v) return;
    const pos = Math.round(v.currentTime);
    setMarkStatus(null);
    startMarkTransition(async () => {
      const res = await markCreditsStart(titleId, pos);
      if (!res.ok) {
        setMarkStatus(`Save failed: ${res.error}`);
        return;
      }
      dismissedRef.current = false;
      setCredits(res.seconds);
      setMarkStatus(`Saved at ${formatTime(pos)}.`);
    });
  }

  function clearCredits() {
    setMarkStatus(null);
    startMarkTransition(async () => {
      const res = await markCreditsStart(titleId, null);
      if (!res.ok) {
        setMarkStatus(`Save failed: ${res.error}`);
        return;
      }
      dismissedRef.current = false;
      setCredits(null);
      setMarkStatus("Credits mark cleared.");
    });
  }

  return (
    <div>
      <div className="relative">
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
          src={src}
        />

        {showNext && nextUp && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-end bg-black/60 p-4 sm:p-8">
            <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-zinc-900/95 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center">
              <div
                className="hidden aspect-[2/3] w-20 shrink-0 overflow-hidden rounded bg-zinc-800 sm:block"
                style={
                  nextUp.poster_url
                    ? {
                        backgroundImage: `url(${nextUp.poster_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Next up · {countdown}s
                </p>
                <p className="truncate text-lg font-semibold text-white">
                  {nextUp.name}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={playNow}
                    className="flex items-center gap-1.5 rounded bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play Now
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    className="rounded bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <button
            type="button"
            onClick={markNow}
            className="rounded bg-white/10 px-3 py-1 text-white hover:bg-white/20"
          >
            Mark credits start
          </button>
          {credits !== null && (
            <>
              <span>
                Credits at <span className="text-zinc-200">{formatTime(credits)}</span>
              </span>
              <button
                type="button"
                onClick={clearCredits}
                className="rounded bg-white/10 px-2 py-0.5 text-white hover:bg-white/20"
              >
                Clear
              </button>
            </>
          )}
          {markStatus && <span className="text-zinc-300">{markStatus}</span>}
        </div>
      )}
    </div>
  );
}
