// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  type LoaderFunctionArgs,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilmSearch } from "./film-search";

const preview = {
  query: "alien",
  error: null,
  results: [
    {
      tmdbId: 348,
      title: "Alien",
      year: 1979,
      posterPath: "/alien.jpg",
    },
  ],
};

function renderSearch(
  previewLoader: (args: LoaderFunctionArgs) => unknown,
  defaultValue = "",
): void {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <FilmSearch defaultValue={defaultValue} submitLabel="Search" />
        ),
      },
      {
        path: "/films/search/preview",
        loader: previewLoader,
        element: null,
      },
      {
        path: "/films/search",
        element: <p>Full results</p>,
      },
      {
        path: "/film/:tmdbId",
        element: <p>Film details</p>,
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
}

describe("FilmSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("loads once after a settled query and does not poll", async () => {
    const loader = vi.fn(() => preview);
    renderSearch(loader);
    const input = screen.getByRole("combobox", { name: "Search films" });

    input.focus();
    fireEvent.change(input, { target: { value: "alien" } });
    expect(loader).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("option", { name: /Alien/ })).toBeDefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not preload a populated but unfocused search", async () => {
    const loader = vi.fn(() => preview);
    renderSearch(loader, "alien");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(loader).not.toHaveBeenCalled();
  });

  it("keeps settled results visible but inactive while updating", async () => {
    const loader = vi.fn(({ request }: LoaderFunctionArgs) => ({
      ...preview,
      query: new URL(request.url).searchParams.get("q") ?? "",
    }));
    renderSearch(loader);
    const input = screen.getByRole("combobox", { name: "Search films" });

    input.focus();
    fireEvent.change(input, { target: { value: "alien" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    fireEvent.change(input, { target: { value: "aliens" } });
    const previousOption = screen.getByRole("option", { name: /Alien/ });
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(previousOption).toHaveProperty("disabled", true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.getByRole("option", { name: /Alien/ })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("cancels an in-flight request when the query is cleared", async () => {
    let requestSignal: AbortSignal | undefined;
    const loader = vi.fn(
      ({ request }: LoaderFunctionArgs) =>
        new Promise<never>((_resolve, reject) => {
          requestSignal = request.signal;
          request.signal.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Canceled", "AbortError"));
            },
            { once: true },
          );
        }),
    );
    renderSearch(loader);
    const input = screen.getByRole("combobox", { name: "Search films" });

    input.focus();
    fireEvent.change(input, { target: { value: "alien" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(requestSignal?.aborted).toBe(false);

    fireEvent.change(input, { target: { value: "" } });
    expect(requestSignal?.aborted).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps focus in an accessible combobox while navigating options", async () => {
    renderSearch(() => preview);
    const input = screen.getByRole("combobox", { name: "Search films" });

    input.focus();
    fireEvent.change(input, { target: { value: "alien" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const listbox = screen.getByRole("listbox");
    const option = within(listbox).getByRole("option", { name: /Alien/ });
    expect(option.getAttribute("tabindex")).toBe("-1");
    expect(
      listbox.contains(screen.getByRole("button", { name: /See all results/ })),
    ).toBe(false);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-activedescendant")).toBe(option.id);

    fireEvent.keyDown(input, { key: "Escape" });
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });
});
