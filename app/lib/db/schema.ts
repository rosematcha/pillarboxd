import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * Films are cached TMDB metadata. `tmdbId` is the canonical identifier that
 * federated instances will agree on, so it is required and unique.
 */
export const films = pgTable(
  "films",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tmdbId: integer("tmdb_id").notNull(),
    imdbId: text("imdb_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    year: smallint("year"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    overview: text("overview"),
    runtimeMinutes: smallint("runtime_minutes"),
    directors: jsonb("directors").$type<string[]>().notNull().default([]),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("films_tmdb_id_idx").on(table.tmdbId)],
);

/**
 * A log entry is one watch/review of a film: diary entry, rating, review
 * text, liked flag. `uri` is the entry's globally unique ActivityPub object
 * id; it is assigned at creation so entries are federation-ready from day
 * one even though delivery lands in phase 2.
 */
export const logEntries = pgTable("log_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  uri: text("uri").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  filmId: uuid("film_id")
    .notNull()
    .references(() => films.id, { onDelete: "cascade" }),
  /** Date the film was watched; null = logged without a date. */
  watchedOn: date("watched_on"),
  /** Half-star ratings stored as 1–10 (0.5–5 stars); null = unrated. */
  rating: smallint("rating"),
  review: text("review"),
  liked: boolean("liked").notNull().default(false),
  rewatch: boolean("rewatch").notNull().default(false),
  containsSpoilers: boolean("contains_spoilers").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("tags_name_idx").on(table.name)],
);

export const logEntryTags = pgTable(
  "log_entry_tags",
  {
    logEntryId: uuid("log_entry_id")
      .notNull()
      .references(() => logEntries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.logEntryId, table.tagId] })],
);

/**
 * ActivityPub actor material for each user. Keys are minted at signup so
 * enabling federation later never requires a data migration.
 */
export const actors = pgTable("actors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  publicKeyPem: text("public_key_pem").notNull(),
  privateKeyPem: text("private_key_pem").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
