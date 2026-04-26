"use client";

import { useState } from "react";

type Invite = {
  email: string;
  added_at: string;
  used_at: string | null;
};

function mask(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return "•".repeat(Math.max(email.length, 6));
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.charAt(0);
  return `${visible}${"•".repeat(Math.max(local.length - 1, 3))}${domain}`;
}

export function InvitesList({
  invites,
  removeInvite,
}: {
  invites: Invite[];
  removeInvite: (formData: FormData) => Promise<void>;
}) {
  const [visible, setVisible] = useState(false);

  if (invites.length === 0) {
    return (
      <div className="rounded border border-white/10">
        <p className="p-4 text-center text-sm text-zinc-500">
          No invites yet. Add an email above.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          {visible ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              Hide emails
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Show emails
            </>
          )}
        </button>
      </div>

      <div className="divide-y divide-white/5 rounded border border-white/10">
        {invites.map((inv) => (
          <div
            key={inv.email}
            className="flex items-center justify-between p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-100">
                {visible ? inv.email : mask(inv.email)}
              </p>
              <p className="text-xs text-zinc-500">
                {inv.used_at ? "Signed up" : "Pending"} ·{" "}
                {new Date(inv.added_at).toLocaleDateString()}
              </p>
            </div>
            <form action={removeInvite}>
              <input type="hidden" name="email" value={inv.email} />
              <button
                type="submit"
                className="ml-3 rounded bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-red-500/20 hover:text-red-300"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
