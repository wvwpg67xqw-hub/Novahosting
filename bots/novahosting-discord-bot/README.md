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
- `/ban <user> <reason>` — Ban a customer's panel account
- `/unban <user>` — Unban a customer's panel account
- `/suspend <user>` — Suspend a customer's panel account
- `/unsuspend <user>` — Lift a suspension

**Billing Management (FeatherPanel Billing Core)**
- `/balance <user>` — Check a customer's account balance
- `/addcredits <user> <amount>` — Add credits to a customer's account
- `/removecredits <user> <amount>` — Remove credits from a customer's account
- `/refund <user> <amount> <reason>` — Issue a refund

**Server Management**
- `/serverinfo <server>` — Look up server details and live state
- `/start <server>` — Start a server
- `/stop <server>` — Stop a server
- `/restart <server>` — Restart a server

All commands are restricted to members with the `STAFF_ROLE_ID` role (or
Discord Administrator permission), and every action is logged as an embed
in `LOG_CHANNEL_ID`.

## FeatherPanel API integration

`services/users.js`, `services/servers.js`, and `services/billing.js` wrap
the FeatherPanel REST API via a shared `axios` client (`services/featherpanel.js`).

FeatherPanel's exact endpoint paths vary by version and installed add-ons
(the Billing Core module is a plugin, not part of the base API). Every
function that calls an endpoint whose exact path isn't guaranteed is marked
with a `PLACEHOLDER` comment explaining what to verify and where to look
(FeatherPanel API docs / Billing Core plugin docs) before going live.
Search the `services/` folder for `PLACEHOLDER` to find every endpoint that
needs confirming against your specific FeatherPanel installation.

User lookups by Discord ID also assume your FeatherPanel users have a
custom identifier field (e.g. `external_id`) populated with their Discord
ID — update `services/users.js#findUser` if your panel links accounts
differently (e.g. by email tied to your Discord verification flow).
