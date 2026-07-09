/**
 * Registers all slash commands with Discord.
 *
 * Run with: node deployCommands.js
 *
 * If DISCORD_GUILD_ID is set, commands are registered to that guild only
 * (updates apply instantly — recommended during development/testing).
 * Otherwise commands are registered globally (can take up to an hour to
 * propagate across all servers).
 */
const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");
const config = require("./config/config");

function loadCommands() {
  const commandsDir = path.join(__dirname, "commands");
  const commands = [];

  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith(".js")) continue;
    const command = require(path.join(commandsDir, file));
    if (command?.data) commands.push(command.data.toJSON());
  }

  return commands;
}

async function main() {
  if (!config.discord.token || !config.discord.clientId) {
    console.error(
      "Missing DISCORD_TOKEN or DISCORD_CLIENT_ID. Set them in your environment before deploying commands.",
    );
    process.exit(1);
  }

  const commands = loadCommands();
  const rest = new REST().setToken(config.discord.token);

  console.log(`Deploying ${commands.length} slash command(s)...`);

  if (config.discord.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands },
    );
    console.log(`Registered commands to guild ${config.discord.guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
    console.log("Registered commands globally (may take up to an hour to appear).");
  }
}

main().catch((err) => {
  console.error("Failed to deploy commands:", err);
  process.exit(1);
});
