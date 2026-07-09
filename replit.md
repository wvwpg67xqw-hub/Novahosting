# NovaHosting Management

A Discord bot that lets NovaHosting staff manage customers and FeatherPanel-hosted servers directly from Discord.

## Run & Operate

- `pnpm --filter @workspace/novahosting-discord-bot run deploy-commands` — register/update slash commands with Discord (run after adding/changing commands)
- `pnpm --filter @workspace/novahosting-discord-bot run start` — run the bot (also bound to the `NovaHosting Discord Bot` workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, currently unused by the bot)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required secrets (bot): `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `FEATHERPANEL_URL`, `FEATHERPANEL_API_KEY`, `STAFF_ROLE_ID`, `LOG_CHANNEL_ID`. Optional: `DISCORD_GUILD_ID` for instant command updates during development. See `bots/novahosting-discord-bot/.env.example`.

## Stack

- pnpm workspaces, Node.js, plain CommonJS (bot is not part of the TS project graph)
- Discord bot: Discord.js v14, axios, dotenv
- API: Express 5 (scaffolded, not used by the bot yet)
- DB: PostgreSQL + Drizzle ORM (scaffolded, not used by the bot yet)

## Where things live

- `bots/novahosting-discord-bot/` — the Discord bot (commands, events, FeatherPanel API services, config, utils)
- `bots/novahosting-discord-bot/services/` — FeatherPanel API wrappers split into `users.js`, `servers.js`, `billing.js`
- `bots/novahosting-discord-bot/commands/` — one file per slash command
- `bots/novahosting-discord-bot/README.md` — bot setup instructions and command reference

## Architecture decisions

- The bot lives under `bots/*` (added to the pnpm workspace globs) rather than `artifacts/*`, since it's a headless Discord process with no web/mobile preview — it doesn't fit any registered artifact type.
- FeatherPanel's exact REST paths (especially the Billing Core plugin and ban/suspend endpoints) vary by installation and aren't fully documented, so every uncertain endpoint in `services/*.js` is marked with a `PLACEHOLDER` comment describing what to verify before going live.
- User lookups assume FeatherPanel users have a custom field (e.g. `external_id`) storing their Discord ID; adjust `services/users.js#findUser` if your panel links accounts differently.
- Staff permission is role-based (`STAFF_ROLE_ID`) with a Discord Administrator override, checked in `utils/permissions.js` before every command runs.

## Product

Staff use slash commands in Discord to look up customers, manage bans/suspensions, adjust billing credits/refunds, and control (start/stop/restart) FeatherPanel servers — all actions are logged as embeds to a dedicated log channel.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Slash commands must be re-registered (`run deploy-commands`) any time a command is added or its options change.
- FeatherPanel Billing Core and ban/suspend endpoints are placeholders — confirm real paths against your panel's API docs before relying on `/ban`, `/suspend`, `/balance`, `/addcredits`, `/removecredits`, `/refund`.
- The bot workflow is not auto-started; it needs `DISCORD_TOKEN`/`DISCORD_CLIENT_ID` (and ideally the FeatherPanel + staff role + log channel values) configured first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `bots/novahosting-discord-bot/README.md` for full bot setup and command docs
