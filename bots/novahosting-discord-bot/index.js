const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const config = require("./config/config");

if (!config.discord.token) {
  console.error(
    "[NovaHosting Management] DISCORD_TOKEN is not set. Add it to your environment (see .env.example) before starting the bot.",
  );
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir)) {
  if (!file.endsWith(".js")) continue;
  const command = require(path.join(commandsDir, file));
  if (command?.data?.name && typeof command.execute === "function") {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[NovaHosting Management] Skipping malformed command file: ${file}`);
  }
}

const eventsDir = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsDir)) {
  if (!file.endsWith(".js")) continue;
  const event = require(path.join(eventsDir, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(config.discord.token).catch((err) => {
  console.error("[NovaHosting Management] Failed to log in to Discord:", err.message);
  process.exit(1);
});
