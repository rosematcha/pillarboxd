import { Form, data, redirect } from "react-router";

import { Button } from "~/components/button";
import { Field, Input, Textarea } from "~/components/input";
import { Nav } from "~/components/nav";
import { PageShell } from "~/components/page-shell";
import { formString } from "~/lib/form";
import { requireSession } from "~/lib/auth/auth.server";
import { createList, createListInputSchema } from "~/lib/lists.server";
import type { Route } from "./+types/lists.new";

export function meta(_args: Route.MetaArgs): Route.MetaDescriptors {
  return [{ title: "New list | pillarboxd" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  return { user: { username: session.user.username ?? "" } };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireSession(request);
  const form = await request.formData();
  const parsed = createListInputSchema.safeParse({
    name: formString(form, "name"),
    description: (() => {
      const value = formString(form, "description").trim();
      return value === "" ? null : value;
    })(),
    ranked: form.get("ranked") === "on",
    public: form.get("public") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return data(
      { error: "Fix the highlighted fields and try again.", fieldErrors },
      { status: 400 },
    );
  }
  const list = await createList(session.user.id, parsed.data);
  return redirect(`/lists/${list.id}/edit`);
}

export default function ListsNew({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <>
      <Nav user={loaderData.user} />
      <PageShell>
        <h1 className="font-heading text-xl">New list</h1>
        <Form method="post" className="gap-block flex flex-col">
          <Field
            label="Name"
            htmlFor="name"
            error={actionData?.fieldErrors.name}
          >
            <Input id="name" name="name" required maxLength={200} />
          </Field>
          <Field
            label="Description"
            htmlFor="description"
            error={actionData?.fieldErrors.description}
          >
            <Textarea id="description" name="description" rows={3} />
          </Field>
          <div className="gap-section flex flex-wrap text-sm">
            <label className="gap-tight flex items-center">
              <input type="checkbox" name="ranked" defaultChecked /> Ranked
            </label>
            <label className="gap-tight flex items-center">
              <input type="checkbox" name="public" defaultChecked /> Public
            </label>
          </div>
          {actionData?.error !== undefined && (
            <p role="alert" className="text-error text-sm">
              {actionData.error}
            </p>
          )}
          <Button type="submit" className="self-start">
            Create list
          </Button>
        </Form>
      </PageShell>
    </>
  );
}
