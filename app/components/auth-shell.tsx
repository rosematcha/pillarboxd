import { Link } from "react-router";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}): React.ReactElement {
  return (
    <main className="gap-step px-block py-step mx-auto grid min-h-[calc(100vh-8rem)] max-w-[64rem] items-center md:grid-cols-[1fr_24rem]">
      <div className="gap-section hidden max-w-md flex-col md:flex">
        <Link
          to="/"
          className="font-heading text-text text-xl tracking-[-0.02em]"
        >
          pillarboxd
        </Link>
        <p className="text-muted text-lg leading-relaxed">
          Keep a film diary that stays yours.
        </p>
        <p className="text-faint max-w-[46ch] text-sm leading-relaxed">
          Log what you watch, bring your Letterboxd history, and follow people
          across independent instances.
        </p>
      </div>
      <section className="gap-section flex flex-col">
        <header className="gap-tight flex flex-col">
          <Link
            to="/"
            className="mb-block font-heading text-text text-lg md:hidden"
          >
            pillarboxd
          </Link>
          <h1 className="font-heading text-xl">{title}</h1>
          <p className="text-muted text-sm">{description}</p>
        </header>
        {children}
      </section>
    </main>
  );
}
