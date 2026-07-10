import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { authClient } from "~/lib/auth/auth.client";
import { formString } from "~/lib/form";
import type { Route } from "./+types/register";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Register — pillarboxd" }];
}

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (form: HTMLFormElement): Promise<void> => {
    const data = new FormData(form);
    const username = formString(data, "username");
    setPending(true);
    setError(null);
    const result = await authClient.signUp.email({
      email: formString(data, "email"),
      password: formString(data, "password"),
      name: username,
      username,
    });
    setPending(false);
    if (result.error !== null) {
      setError(result.error.message ?? "Registration failed.");
      return;
    }
    await navigate("/welcome");
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Create an account</h1>
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
            minLength={2}
            maxLength={30}
            pattern="[a-zA-Z0-9_.]+"
            autoComplete="username"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password (10+ characters)
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
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
          {pending ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
