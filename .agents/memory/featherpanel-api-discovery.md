---
name: FeatherPanel API discovery
description: How to find a self-hosted FeatherPanel instance's real API surface when building an integration against it, instead of guessing from docs/plugins.
---

FeatherPanel is a fast-moving, self-hosted, fork-friendly panel project. Different installs can have
completely different API surfaces — one instance had none of the third-party "PterodactylPanelApi"
plugin's routes at all, but instead had a large **native** admin API (`/api/admin/users`,
`/api/admin/servers`, etc.) with capabilities the plugin doesn't have (e.g. a real account-level
ban at `POST /api/admin/users/{uuid}/ban`, vs. the plugin's server-only suspend).

**Why:** Trusting a plugin's GitHub README, a generic Pterodactyl-API assumption, or the panel's
auto-generated `/api/openapi.json` (which can be empty/misleading even when routes work) led to
building an integration against endpoints that returned 404/401 against the real instance. The
truth is only in the actual installed code.

**How to apply:** When integrating with a self-hosted panel like this, don't guess from docs. SSH into
the panel's VPS and read its real route definitions directly:
1. Find the compose file: `find / -maxdepth 4 -iname "docker-compose*.yml"`.
2. Get real service names (not container names) from `docker compose ps` run in that directory —
   `docker compose exec <container-name>` fails with "service is not running" if you use the wrong name.
3. List route files: `docker compose exec <service> find app/routes -type f` (or `php artisan route:list`
   if it's Laravel-based — this fork is a custom framework with no `artisan` binary, just a `cli` folder).
4. `cat` the specific route file for the resource you need (e.g. `app/routes/admin/users.php`) to get
   exact paths, HTTP methods, and required permissions straight from the source.
5. Check the auth middleware (e.g. `app/Middleware/AuthMiddleware.php`) to learn the real auth scheme —
   in this case, `Authorization: Bearer <key>` where `<key>` is a personal API client's public *or*
   private key (from Account → API Clients), and admin access is just a permission flag on that
   account, not a special key format. A key with an unfamiliar prefix (e.g. `fp_...`) that returns
   `INVALID_API_KEY` (401) is not a valid API-client key at all — regenerate one from the real
   API-client UI/endpoint.
6. To find out if a capability (e.g. admin-level power control) exists at all, grep the routes
   directory instead of assuming: `grep -rli "power" app/routes/admin` — an empty result is a real,
   confirmed answer, not a guess.
