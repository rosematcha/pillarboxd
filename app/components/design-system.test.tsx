import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Field, FieldError, Input, Select } from "./input";
import { PosterTile } from "./poster-tile";
import { SiteFooter } from "./site-footer";
import { StarRating } from "./star-rating";

describe("design system components", () => {
  it("exposes loading and validation states to assistive technology", () => {
    const markup = renderToStaticMarkup(
      <>
        <Button loading loadingLabel="Saving">
          Save
        </Button>
        <Field
          label="Email"
          htmlFor="email"
          error="Enter a valid email address."
          errorId="email-error"
        >
          <Input
            id="email"
            name="email"
            invalid
            aria-describedby="email-error"
          />
        </Field>
        <FieldError>Another error</FieldError>
        <Field label="Rating" htmlFor="rating">
          <Select id="rating" name="rating" defaultValue="">
            <option value="">No rating</option>
            <option value="8">4 ★</option>
          </Select>
        </Field>
      </>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Saving");
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('role="alert"');
  });

  it("pairs star graphics with a text rating", () => {
    const markup = renderToStaticMarkup(<StarRating rating={4.5} />);

    expect(markup).toContain("★★★★½");
    expect(markup).toContain("4.5 out of 5 stars");
  });

  it("renders poster, empty, and footer content without card chrome", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <PosterTile
          to="/film/1"
          title="The Long Goodbye"
          year={1973}
          posterUrl="/poster.jpg"
        />
        <EmptyState action={<Button>Log a film</Button>}>
          Your diary is empty.
        </EmptyState>
        <SiteFooter />
      </MemoryRouter>,
    );

    expect(markup).toContain("The Long Goodbye");
    expect(markup).toContain("Your diary is empty.");
    expect(markup).toContain("TMDB API");
    expect(markup).not.toContain("shadow");
  });
});
