"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameTitle } from "@/app/upload/actions";

export function TitleNameEditor({
  titleId,
  initialName,
  canEdit,
}: {
  titleId: string;
  initialName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!canEdit) {
    return <h1 className="text-3xl font-semibold">{name}</h1>;
  }

  function startEditing() {
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancel() {
    setName(initialName);
    setEditing(false);
    setError(null);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Title can't be empty.");
      return;
    }
    if (trimmed === initialName) {
      setEditing(false);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await renameTitle(titleId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName(result.name);
      setEditing(false);
      setError(null);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={name}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            maxLength={200}
            className="w-full min-w-0 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-3xl font-semibold outline-none focus:border-white/40 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="shrink-0 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="shrink-0 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-300">{error}</p>
        )}
      </div>
    );
  }

  return (
    <h1 className="text-3xl font-semibold">
      {name}
      <button
        type="button"
        onClick={startEditing}
        aria-label="Edit title"
        title="Edit title"
        className="ml-2 inline-flex h-7 w-7 shrink-0 translate-y-[-2px] items-center justify-center rounded-full align-middle text-zinc-400 hover:bg-white/10 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
    </h1>
  );
}
