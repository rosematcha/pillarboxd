import {
  boolean,
  date,
  index,
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
    genres: jsonb("genres").$type<string[]>().notNull().default([]),
    cast: jsonb("cast")
      .$type<{ name: string; character: string | null }[]>()
      .notNull()
      .default([]),
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
 * Per-user film state independent of diary entries: watched, liked,
 * watchlisted, and a standing rating.
 */
export const filmStates = pgTable(
  "film_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    watched: boolean("watched").notNull().default(false),
    liked: boolean("liked").notNull().default(false),
    watchlisted: boolean("watchlisted").notNull().default(false),
    /** Half-star ratings stored as 1–10; null = unrated. */
    rating: smallint("rating"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("film_states_user_film_idx").on(table.userId, table.filmId),
    index("film_states_user_watchlisted_idx").on(
      table.userId,
      table.watchlisted,
    ),
    index("film_states_user_watched_idx").on(table.userId, table.watched),
    index("film_states_user_liked_idx").on(table.userId, table.liked),
  ],
);

export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    ranked: boolean("ranked").notNull().default(true),
    public: boolean("public").notNull().default(true),
    uri: text("uri").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("lists_user_id_idx").on(table.userId)],
);

export const listEntries = pgTable(
  "list_entries",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    notes: text("notes"),
  },
  (table) => [
    primaryKey({ columns: [table.listId, table.filmId] }),
    index("list_entries_list_position_idx").on(table.listId, table.position),
  ],
);

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_following_id_idx").on(table.followingId),
  ],
);

/** Up to four favorite films pinned on a profile, ordered by position 0–3. */
export const profileFavorites = pgTable(
  "profile_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.position] })],
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    importedCount: integer("imported_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("import_jobs_user_id_idx").on(table.userId)],
);

export interface ImportFilmCandidate {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
}

export type ImportUnmatchedKind =
  "diary" | "rating" | "liked" | "watchlist" | "list";

export const importUnmatched = pgTable(
  "import_unmatched",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    year: smallint("year"),
    watchedOn: date("watched_on"),
    rating: smallint("rating"),
    review: text("review"),
    rewatch: boolean("rewatch").notNull().default(false),
    liked: boolean("liked").notNull().default(false),
    containsSpoilers: boolean("contains_spoilers").notNull().default(false),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    candidates: jsonb("candidates")
      .$type<ImportFilmCandidate[]>()
      .notNull()
      .default([]),
    kind: text("kind").$type<ImportUnmatchedKind>().notNull().default("diary"),
    listId: uuid("list_id").references(() => lists.id, {
      onDelete: "cascade",
    }),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("import_unmatched_job_id_idx").on(table.jobId)],
);

/** Optional profile fields beyond better-auth's user row. */
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
