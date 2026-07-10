import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { AuthShell } from "~/components/auth-shell";
import { Button } from "~/components/button";
import { Field, Input } from "~/components/input";
import { authClient } from "~/lib/auth/auth.client";
import { formString } from "~/lib/form";
import type { Route } from "./+types/register";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "Register | pillarboxd" }];
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
    <AuthShell
      title="Create an account"
      description="Start a diary on this instance."
    >
      <form
        method="post"
        className="gap-block flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        <Field
          label="Username"
          htmlFor="username"
          hint="Letters, numbers, underscores, and periods."
        >
          <Input
            id="username"
            name="username"
            required
            minLength={2}
            maxLength={30}
            pattern="[a-zA-Z0-9_.]+"
            autoComplete="username"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint="Use at least 10 characters."
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
        </Field>
        {error !== null && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}
        <Button type="submit" loading={pending} loadingLabel="Creating account">
          Register
        </Button>
      </form>
      <p className="text-muted text-sm">
        Already have an account?{" "}
        <Link to="/login" className="font-medium">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
