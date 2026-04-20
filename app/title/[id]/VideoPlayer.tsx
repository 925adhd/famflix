"use client";

import { useEffect, useRef } from "react";
import { saveWatchProgress } from "./actions";

const SAVE_EVERY_SECONDS = 10;
const COMPLETE_THRESHOLD = 0.95;

export function VideoPlayer({
  src,
  titleId,
  initialPositionSeconds,
}: {
  src: string;
  titleId: string;
  initialPositionSeconds: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const hasSeekedRef = useRef(false);

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
  }, [titleId, initialPositionSeconds]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      className="aspect-video w-full bg-black"
      src={src}
    />
  );
}
