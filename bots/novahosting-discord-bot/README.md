# NovaHosting Management — Discord Bot

A staff-only Discord bot for NovaHosting to manage customers and servers on a
FeatherPanel installation, without leaving Discord.

## Structure

```
bots/novahosting-discord-bot/
├── commands/        # One file per slash command
├── events/          # Discord.js client event handlers
├── services/        # FeatherPanel API clients (users, servers, billing)
├── config/          # Environment-driven configuration
├── utils/           # Embeds, permission checks, action logging
├── index.js         # Bot entrypoint
├── deployCommands.js  # Registers slash commands with Discord
└── .env.example     # Required environment variables
```

## Setup

1. Copy `.env.example` to `.env` (or set the equivalent Repl secrets) and fill in:
   - `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` — from the Discord Developer Portal
   - `DISCORD_GUILD_ID` (optional) — set during development for instant command updates
   - `FEATHERPANEL_URL` / `FEATHERPANEL_API_KEY` — your panel's base URL and an API key
     with admin permissions (see "FeatherPanel API integration" below for how to get one)
   - `STAFF_ROLE_ID` — the Discord role allowed to run staff commands
   - `LOG_CHANNEL_ID` — the channel where action logs are posted
2. Install dependencies: `pnpm --filter @workspace/novahosting-discord-bot install`
3. Register slash commands: `pnpm --filter @workspace/novahosting-discord-bot run deploy-commands`
4. Start the bot: `pnpm --filter @workspace/novahosting-discord-bot run start` (or use the `NovaHosting Discord Bot` workflow)

## Commands

**User Management**
- `/userinfo <user>` — Show a customer's FeatherPanel account details
- `/ban <user> <reason>` — Ban a customer's FeatherPanel account
- `/unban <user>` — Unban a customer's FeatherPanel account
- `/suspend <user>` — Suspend all of a customer's servers
- `/unsuspend <user>` — Lift a suspension on all of a customer's servers

**Billing Management (FeatherPanel Billing Core)**
- `/balance <user>` — Check a customer's account balance
- `/addcredits <user> <amount>` — Add credits to a customer's account
- `/removecredits <user> <amount>` — Remove credits from a customer's account
- `/refund <user> <amount> <reason>` — Issue a refund

**Server Management**
- `/serverinfo <server>` — Look up server details (static panel data)
- `/start <server>` — Start a server ⚠️ **not currently functional** — see below
- `/stop <server>` — Stop a server ⚠️ **not currently functional** — see below
- `/restart <server>` — Restart a server ⚠️ **not currently functional** — see below

All commands are restricted to members with the `STAFF_ROLE_ID` role (or
Discord Administrator permission), and every action is logged as an embed
in `LOG_CHANNEL_ID`.

## FeatherPanel API integration

`services/users.js`, `services/servers.js`, and `services/billing.js` wrap
FeatherPanel's REST API via a shared `axios` client (`services/featherpanel.js`).

This bot targets FeatherPanel's **native admin API** (not a plugin) —
confirmed directly against a live instance's route definitions under
`app/routes/admin/*.php`. Key facts about this API surface:

- **Auth**: `Authorization: Bearer <key>`, where `<key>` is either the
  public or private key of a personal API client. Generate one from the
  panel's account settings (Account → API Clients), using an account that
  has admin permissions — admin access is granted purely by the underlying
  account's permissions, not by any special "admin key" format.
- **Users are identified by UUID** (a string), not a numeric id.
  `GET /api/admin/users/external/:externalId` looks a user up by
  FeatherPanel's built-in `external_id` field — set each customer's
  `external_id` to their Discord user ID for `/userinfo`, `/ban`,
  `/suspend`, etc. to find them.
- **Servers are identified by numeric id.** `GET /api/admin/servers/owner/:ownerId`
  lists servers owned by a user.
- **Real account-level ban/unban exists**: `POST /api/admin/users/:uuid/ban`
  and `/unban`. `/ban` and `/unban` call these directly.
- **No account-level suspend** — only per-server suspension exists
  (`POST /api/admin/servers/:id/suspend` / `/unsuspend`). `/suspend` and
  `/unsuspend` apply this to every server the customer owns and report
  partial failures if some servers fail.
- **No admin-level power control (start/stop/restart)** — the only power
  route (`POST /api/user/servers/:uuidShort/power/:action`) is scoped to a
  customer's own logged-in session (`app/routes/user/server/power.php`),
  and there is no equivalent admin route anywhere under `app/routes/admin`.
  The `/start`, `/stop`, and `/restart` commands report this clearly rather
  than silently failing; wire in a real endpoint here if your panel ever
  adds one (e.g. a Wings-direct admin route).
- **No billing endpoints confirmed** — `services/billing.js` still targets
  a hypothetical Billing Core plugin with `PLACEHOLDER` paths (this panel
  does have `BillingCore`/`BillingResources` plugins installed based on its
  file layout, but their routes haven't been captured yet). To wire this up
  for real, find the plugin's actual routes the same way the admin API was
  found: `docker compose exec <backend-service> find app/Plugins/BillingCore -iname "*.php"`
  on the panel's VPS, then read the route files directly.

If FeatherPanel's route layout differs on another install (this is a
fast-moving, self-hosted project, not a fixed spec), don't guess — read the
actual routes the same way: SSH into the panel's VPS, find its
`docker-compose.yml`, and run
`docker compose exec <backend-service> php artisan route:list` if it's
Laravel-based, or `find app/routes -type f` + `cat` the relevant file if
it's this custom framework (no `artisan` binary).
