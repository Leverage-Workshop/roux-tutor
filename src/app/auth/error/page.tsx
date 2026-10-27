import Link from "next/link";

export const metadata = { title: "Sign-in failed · Roux Tutor" };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Sign-in didn&apos;t work</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Google sign-in was cancelled or the link expired. You can try again, or keep using
        Roux Tutor without an account.
      </p>
      <Link
        href="/"
        className="flex min-h-12 items-center rounded-full bg-foreground px-6 font-semibold text-background"
      >
        Back to Roux Tutor
      </Link>
    </main>
  );
}
