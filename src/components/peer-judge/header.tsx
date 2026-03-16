import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex h-16 items-center">
        <div className="flex w-full flex-col items-center text-center sm:flex-row sm:items-baseline sm:justify-start sm:gap-4 sm:text-left">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-primary"
          >
            PeerJudge
          </Link>
          <p className="text-sm text-muted-foreground">
            Join the judging room
          </p>
        </div>
      </div>
    </header>
  );
}
