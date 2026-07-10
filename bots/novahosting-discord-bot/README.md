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
   - `FEATHERPANEL_URL` / `FEATHERPANEL_API_KEY` — your panel's base URL and an API key with user/server/billing permissions
   - `STAFF_ROLE_ID` — the Discord role allowed to run staff commands
   - `LOG_CHANNEL_ID` — the channel where action logs are posted
2. Install dependencies: `pnpm --filter @workspace/novahosting-discord-bot install`
3. Register slash commands: `pnpm --filter @workspace/novahosting-discord-bot run deploy-commands`
4. Start the bot: `pnpm --filter @workspace/novahosting-discord-bot run start` (or use the `NovaHosting Discord Bot` workflow)

## Commands

**User Management**
- `/userinfo <user>` — Show a customer's FeatherPanel account details
- `/ban <user> <reason>` — Ban a customer by suspending all of their servers
- `/unban <user>` — Unban a customer by unsuspending all of their servers
- `/suspend <user>` — Suspend all of a customer's servers
- `/unsuspend <user>` — Lift a suspension on all of a customer's servers

> FeatherPanel (via the installed API plugin) has no separate account-level
> ban/suspend flag — suspension is a per-server action. `/ban` and `/suspend`
> are therefore implemented identically: they suspend every server the
> customer owns. See `services/users.js` for details.

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
the FeatherPanel REST API via a shared `axios` client (`services/featherpanel.js`).

FeatherPanel's core API by itself only exposes System/Redirects endpoints —
user, server, node, etc. management requires the community
[**PterodactylPanelApi**](https://github.com/featherpanel-com/PterodactylPanelApi)
plugin, which must be installed, enabled in Admin → Plugins, and the panel
restarted before its routes become live. `services/users.js` and
`services/servers.js` are written against that plugin's documented endpoints
(list/get/update/delete users, list/get/suspend/unsuspend/reinstall/delete
servers). Known limitations of that plugin:

- **No account-level ban/suspend** — only per-server suspension exists.
  `/ban` and `/suspend` suspend every server the customer owns instead.
- **No power control (start/stop/restart)** — that requires Pterodactyl's
  separate Client API (normally a per-user client key, not the admin key
  used here), which this plugin doesn't implement. The `/start`, `/stop`,
  and `/restart` commands report this clearly rather than silently failing;
  wire in a real endpoint here if your panel later adds one.
- **No billing endpoints** — `services/billing.js` still targets a
  hypothetical Billing Core plugin with `PLACEHOLDER` paths. If you use a
  different billing plugin, fetch its real routes the same way (its
  `/api/openapi.json` or a browser Network-tab capture of the admin UI) and
  update `services/billing.js` accordingly.

User lookups by Discord ID use FeatherPanel's built-in `external_id` field
via `GET /api/application/users/external/:external_id` — set each
customer's `external_id` to their Discord user ID in FeatherPanel for
`/userinfo`, `/ban`, `/suspend`, etc. to find them.
