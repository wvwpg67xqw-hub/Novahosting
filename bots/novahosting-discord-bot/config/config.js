require("dotenv").config();

function required(name) {
  return process.env[name] && process.env[name].trim().length > 0;
}

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
  },
  featherPanel: {
    url: (process.env.FEATHERPANEL_URL || "").replace(/\/+$/, ""),
    apiKey: process.env.FEATHERPANEL_API_KEY || "",
  },
  staffRoleId: process.env.STAFF_ROLE_ID || "",
  logChannelId: process.env.LOG_CHANNEL_ID || "",
  brand: {
    name: "NovaHosting",
    color: 0x5865f2,
    errorColor: 0xed4245,
    successColor: 0x57f287,
    warnColor: 0xfee75c,
    footer: "NovaHosting Management",
  },
};

config.isConfigured = {
  discord: required("DISCORD_TOKEN") && required("DISCORD_CLIENT_ID"),
  featherPanel: required("FEATHERPANEL_URL") && required("FEATHERPANEL_API_KEY"),
  staffRole: required("STAFF_ROLE_ID"),
  logChannel: required("LOG_CHANNEL_ID"),
};

module.exports = config;
