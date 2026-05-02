import Image from "next/image";
import Link from "next/link";
import { signUp } from "./actions";
import { PasswordInput } from "@/app/components/PasswordInput";

const inputClass =
  "w-full rounded bg-zinc-800/80 px-4 py-4 text-base text-white placeholder:text-zinc-400 ring-1 ring-zinc-700 transition focus:bg-zinc-700/80 focus:outline-none focus:ring-zinc-400";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1a0608] via-[#0e0407] to-black">
      <header className="border-b border-white/10 px-6 py-4 sm:px-12">
        <Link href="/" aria-label="Famflix">
          <Image
            src="/loogo.png"
            alt="Famflix"
            width={238}
            height={85}
            priority
            className="h-9 w-auto sm:h-11"
          />
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-6 pt-10 sm:pt-16">
        <div className="w-full max-w-md">
          <h1 className="text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
            Create your account
          </h1>
          <p className="mt-3 text-base text-zinc-300 sm:text-lg">
            Join the family library.
          </p>

          {error && (
            <p className="mt-6 rounded border border-orange-400/60 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-6 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Account created. Check your email to confirm, then sign in.
            </p>
          )}

          <form action={signUp} className="mt-8 flex flex-col gap-3">
            <input
              type="text"
              name="display_name"
              required
              placeholder="Display name"
              className={inputClass}
            />
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Email"
              className={inputClass}
            />
            <PasswordInput
              name="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Password"
              className={`${inputClass} pr-12`}
            />
            <button
              type="submit"
              className="mt-2 rounded bg-accent py-3.5 text-base font-semibold text-white transition hover:opacity-90"
            >
              Create account
            </button>
          </form>

          <p className="mt-10 text-base text-zinc-400">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-white hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
