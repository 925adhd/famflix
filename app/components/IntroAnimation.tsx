"use client";

import { useEffect, useState, type CSSProperties } from "react";

const DURATION_MS = 4500;

// 31 brush "fur" strokes, in DOM order from fur-31 (back) to fur-1 (front),
// matching the codepen source. Each is a thin red gradient strip.
type Fur = { left: number; width: number; stop1: number; stop2: number };
const FURS_BACK_TO_FRONT: Fur[] = [
  { left: 96.3, width: 3.7, stop1: 37, stop2: 100 },
  { left: 92.8, width: 3.5, stop1: 19, stop2: 100 },
  { left: 90.0, width: 2.8, stop1: 30, stop2: 100 },
  { left: 85.5, width: 4.5, stop1: 39, stop2: 100 },
  { left: 83.0, width: 2.5, stop1: 21, stop2: 100 },
  { left: 78.9, width: 4.1, stop1: 34, stop2: 100 },
  { left: 76.8, width: 2.1, stop1: 28, stop2: 100 },
  { left: 75.8, width: 1.0, stop1: 37, stop2: 100 },
  { left: 73.6, width: 2.2, stop1: 28, stop2: 92 },
  { left: 71.3, width: 2.3, stop1: 9, stop2: 100 },
  { left: 68.5, width: 2.8, stop1: 37, stop2: 100 },
  { left: 67.0, width: 1.5, stop1: 27, stop2: 95 },
  { left: 63.0, width: 4.0, stop1: 47, stop2: 100 },
  { left: 60.6, width: 2.4, stop1: 34, stop2: 100 },
  { left: 56.5, width: 4.1, stop1: 45, stop2: 100 },
  { left: 53.5, width: 3.0, stop1: 39, stop2: 95 },
  { left: 48.0, width: 5.5, stop1: 29, stop2: 100 },
  { left: 46.0, width: 2.0, stop1: 36, stop2: 100 },
  { left: 40.0, width: 6.0, stop1: 47, stop2: 100 },
  { left: 37.4, width: 2.6, stop1: 22, stop2: 95 },
  { left: 35.4, width: 2.0, stop1: 34, stop2: 95 },
  { left: 31.9, width: 3.5, stop1: 39, stop2: 95 },
  { left: 27.9, width: 4.0, stop1: 35, stop2: 95 },
  { left: 25.9, width: 2.0, stop1: 30, stop2: 100 },
  { left: 21.9, width: 4.0, stop1: 20, stop2: 100 },
  { left: 19.4, width: 2.5, stop1: 27, stop2: 89 },
  { left: 15.4, width: 4.0, stop1: 15, stop2: 86 },
  { left: 11.4, width: 4.0, stop1: 23, stop2: 100 },
  { left: 6.6, width: 4.8, stop1: 37, stop2: 100 },
  { left: 3.8, width: 2.8, stop1: 10, stop2: 62 },
  { left: 0.0, width: 3.8, stop1: 15, stop2: 81 },
];

// 28 lamps (light particles) with colors and positions.
type Lamp = { left: number; width: number; color: string };
const LAMPS: Lamp[] = [
  { left: 0.7, width: 1.0, color: "#ff0100" },
  { left: 2.2, width: 1.4, color: "#ffde01" },
  { left: 5.8, width: 2.1, color: "#ff00cc" },
  { left: 10.1, width: 2.0, color: "#04fd8f" },
  { left: 12.9, width: 1.4, color: "#ff0100" },
  { left: 15.3, width: 2.8, color: "#ff9600" },
  { left: 21.2, width: 2.5, color: "#0084ff" },
  { left: 25.0, width: 2.5, color: "#f84006" },
  { left: 30.5, width: 3.0, color: "#ffc601" },
  { left: 36.3, width: 3.0, color: "#ff4800" },
  { left: 41.0, width: 2.2, color: "#fd0100" },
  { left: 44.2, width: 2.6, color: "#01ffff" },
  { left: 51.7, width: 0.5, color: "#ffc601" },
  { left: 52.1, width: 1.8, color: "#ffc601" },
  { left: 53.8, width: 2.3, color: "#0078fe" },
  { left: 57.2, width: 2.0, color: "#0080ff" },
  { left: 62.3, width: 2.9, color: "#ffae01" },
  { left: 65.8, width: 1.7, color: "#ff00bf" },
  { left: 72.8, width: 0.8, color: "#a601f4" },
  { left: 74.3, width: 2.0, color: "#f30b34" },
  { left: 79.8, width: 2.0, color: "#ff00bf" },
  { left: 78.2, width: 2.0, color: "#04fd8f" },
  { left: 78.5, width: 2.0, color: "#01ffff" },
  { left: 85.3, width: 1.1, color: "#a201ff" },
  { left: 86.9, width: 1.1, color: "#ec0014" },
  { left: 88.8, width: 2.0, color: "#0078fe" },
  { left: 92.4, width: 2.4, color: "#ff0036" },
  { left: 96.2, width: 2.1, color: "#06f98c" },
];

// Deterministic pseudo-random 0..1.99 for stable lamp delays/positions.
function pr(i: number, seed: number) {
  return ((i * seed + 17) % 200) / 100;
}

function Brush() {
  return (
    <div className="effect-brush">
      {FURS_BACK_TO_FRONT.map((f, i) => (
        <span
          key={i}
          style={{
            left: `${f.left}%`,
            width: `${f.width}%`,
            background: `linear-gradient(to bottom, #e40913 0%, #e40913 ${f.stop1}%, rgba(0,0,0,0) ${f.stop2}%, rgba(0,0,0,0) 100%)`,
          }}
        />
      ))}
    </div>
  );
}

function Lumieres() {
  return (
    <div className="effect-lumieres">
      {LAMPS.map((lamp, i) => {
        const movesRight = i % 2 === 1;
        const animName = movesRight
          ? "nf-lumieres-moving-right"
          : "nf-lumieres-moving-left";
        const lampStyle: CSSProperties = {
          left: `${lamp.left}%`,
          width: `${lamp.width}%`,
          background: lamp.color,
          animationName: animName,
          animationDuration: "5s",
          animationFillMode: "forwards",
          animationDelay: `${pr(i, 73)}s`,
        };
        const trailStyle: CSSProperties = {
          left: `${pr(i, 91) * 100}%`,
          background: lamp.color,
          animationName: animName,
          animationDuration: "5.5s",
          animationFillMode: "forwards",
          animationDelay: `${pr(i, 53)}s`,
        };
        return (
          <span key={i} style={lampStyle}>
            <span style={trailStyle} />
          </span>
        );
      })}
    </div>
  );
}

export function IntroAnimation({ play }: { play: boolean }) {
  const [show, setShow] = useState(play);

  useEffect(() => {
    if (!play) return;

    // Strip ?welcome=1 so a refresh during/after the animation doesn't replay it.
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", url.toString());

    const id = setTimeout(() => setShow(false), DURATION_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black"
      style={{ animation: `nf-fade ${DURATION_MS}ms forwards` }}
    >
      <div className="netflix-intro">
        <div className="helper-1">
          <Brush />
          <Lumieres />
        </div>
        <div className="helper-2">
          <Brush />
        </div>
        <div className="helper-3">
          <Brush />
        </div>
      </div>
    </div>
  );
}
