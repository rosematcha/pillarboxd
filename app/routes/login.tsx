import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthShell } from "~/components/auth-shell";
import { Button } from "~/components/button";
import { Field, Input } from "~/components/input";
import { authClient } from "~/lib/auth/auth.client";
import { formString } from "~/lib/form";
import type { Route } from "./+types/login";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Log in | pillarboxd" }];
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
    const isSafePath =
      redirectTo?.startsWith("/") === true &&
      !redirectTo.startsWith("//") &&
      !redirectTo.startsWith("/\\");
    await navigate(isSafePath ? redirectTo : "/");
  };

  return (
    <AuthShell title="Log in" description="Return to your diary.">
      <form
        method="post"
        className="gap-block flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        <Field label="Username" htmlFor="username">
          <Input
            id="username"
            name="username"
            required
            autoComplete="username"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {error !== null && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}
        <Button type="submit" loading={pending} loadingLabel="Signing in">
          Log in
        </Button>
      </form>
      <p className="text-muted text-sm">
        No account?{" "}
        <Link to="/register" className="font-medium">
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
