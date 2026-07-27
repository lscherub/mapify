import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="glass-panel max-w-lg rounded-[2rem] p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Offline mode
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">You are offline</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Mapify is still available, but live map tiles and fresh place data may be limited until
          you reconnect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
