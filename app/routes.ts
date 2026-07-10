import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("welcome", "routes/welcome.tsx"),
  route("import", "routes/import.tsx"),
  route("api/auth/*", "routes/api.auth.tsx"),
  route("films/search", "routes/films.search.tsx"),
  route("film/:tmdbId", "routes/film.tsx"),
  route("film/:tmdbId/log", "routes/film.log.tsx"),
  route("entries/:entryId", "routes/entry.tsx"),
  route("u/:username", "routes/profile.tsx"),
  route("settings/data", "routes/settings.data.tsx"),
  route("export/json", "routes/export.json.tsx"),
  route("export/csv", "routes/export.csv.tsx"),
] satisfies RouteConfig;
