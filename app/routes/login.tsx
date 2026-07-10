import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { authClient } from "~/lib/auth/auth.client";
import { formString } from "~/lib/form";
import type { Route } from "./+types/login";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Log in — pillarboxd" }];
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (form: HTMLFormElement): Promise<void> => {
    const data = new FormData(form);
    setPending(true);
    setError(null);
    const result = await authClient.signIn.username({
      username: formString(data, "username"),
      password: formString(data, "password"),
    });
    setPending(false);
    if (result.error !== null) {
      setError(result.error.message ?? "Sign-in failed.");
      return;
    }
    const redirectTo = searchParams.get("redirectTo");
    await navigate(redirectTo?.startsWith("/") === true ? redirectTo : "/");
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Log in</h1>
      <form
        method="post"
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            name="username"
            required
            autoComplete="username"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        {error !== null && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        No account?{" "}
        <Link to="/register" className="underline">
          Register
        </Link>
      </p>
    </main>
  );
}
