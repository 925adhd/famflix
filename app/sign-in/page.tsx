import Image from "next/image";
import Link from "next/link";
import { signIn } from "./actions";
import { PasswordInput } from "@/app/components/PasswordInput";

const inputClass =
  "w-full rounded bg-zinc-800/80 px-4 py-4 text-base text-white placeholder:text-zinc-400 ring-1 ring-zinc-700 transition focus:bg-zinc-700/80 focus:outline-none focus:ring-zinc-400";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; demo?: string }>;
}) {
  const { error, demo } = await searchParams;
  const demoMode = demo === "1";

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1a0608] via-[#0e0407] to-black">
      <header className="border-b border-white/10 px-6 py-4 sm:px-12">
        <Link href={demoMode ? "/?demo=1" : "/"} aria-label="Famflix">
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
            Enter your info to sign in
          </h1>
          <p className="mt-3 text-base text-zinc-300 sm:text-lg">
            Or get started with a new account.
          </p>

          {error && (
            <p className="mt-6 rounded border border-orange-400/60 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
              {error}
            </p>
          )}

          <form action={signIn} className="mt-8 flex flex-col gap-3">
            {demoMode && <input type="hidden" name="demo" value="1" />}
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
              autoComplete="current-password"
              placeholder="Password"
              className={`${inputClass} pr-12`}
            />
            <button
              type="submit"
              className="mt-2 rounded bg-accent py-3.5 text-base font-semibold text-white transition hover:opacity-90"
            >
              Continue
            </button>
          </form>

          <p className="mt-10 text-base text-zinc-400">
            New to Famflix?{" "}
            <Link
              href={demoMode ? "/sign-up?demo=1" : "/sign-up"}
              className="text-white hover:underline"
            >
              Create an account
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
