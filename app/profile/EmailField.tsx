"use client";

import { useState } from "react";

function mask(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return "•".repeat(Math.max(email.length, 6));
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.charAt(0);
  return `${visible}${"•".repeat(Math.max(local.length - 1, 3))}${domain}`;
}

export function EmailField({ email }: { email: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-400">Email</span>
      <div className="relative">
        <input
          type="text"
          value={visible ? email : mask(email)}
          disabled
          className="w-full rounded border border-white/5 bg-white/[0.02] px-3 py-2 pr-10 text-zinc-500"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide email" : "Show email"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-white"
        >
          {visible ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
