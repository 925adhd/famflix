import Link from "next/link";
import { signIn } from "./actions";
import { PasswordInput } from "@/app/components/PasswordInput";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-6 text-4xl font-black tracking-tight text-accent sm:text-5xl"
      >
        FAMFLIX
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-black/60 p-8 backdrop-blur">
        <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

        {error && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <form action={signIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Password</span>
            <PasswordInput name="password" autoComplete="current-password" />
          </label>
          <button
            type="submit"
            className="mt-2 rounded bg-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-400">
          New to the family?{" "}
          <Link href="/sign-up" className="text-white underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
