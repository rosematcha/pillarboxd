/** Read a text field from FormData, treating missing values and files as "". */
export function formString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
