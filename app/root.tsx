import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { ZodError } from "zod";

import { SiteFooter } from "~/components/site-footer";
import type { Route } from "./+types/root";
import "./app.css";

function envSetupMessage(error: ZodError): string {
  const keys = [
    ...new Set(
      error.issues
        .map((issue) => issue.path[0])
        .filter((key): key is string => typeof key === "string"),
    ),
  ];
  return `Set up your local environment first. Copy .env.example to .env and fill in: ${keys.join(", ")}. Start Postgres, then run: node scripts/migrate.js`;
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-bg text-text min-h-screen font-sans">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText !== ""
          ? error.statusText
          : details;
  } else if (error instanceof ZodError) {
    message = "Environment not configured";
    details = envSetupMessage(error);
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="gap-tight px-block mx-auto flex max-w-[42rem] flex-col py-16">
      <h1 className="font-heading text-xl">{message}</h1>
      <p className="text-muted max-w-[70ch] text-sm">{details}</p>
      {stack !== undefined && (
        <pre className="mt-block border-border pt-block text-faint w-full overflow-x-auto border-t text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
