const { Events } = require("discord.js");
const config = require("../config/config");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[NovaHosting Management] Logged in as ${client.user.tag}`);

    if (!config.isConfigured.featherPanel) {
      console.warn(
        "[NovaHosting Management] FEATHERPANEL_URL / FEATHERPANEL_API_KEY are not set — FeatherPanel commands will fail until configured.",
      );
    }
    if (!config.isConfigured.staffRole) {
      console.warn(
        "[NovaHosting Management] STAFF_ROLE_ID is not set — staff commands will be blocked for everyone until configured.",
      );
    }
    if (!config.isConfigured.logChannel) {
      console.warn(
        "[NovaHosting Management] LOG_CHANNEL_ID is not set — action logs will only print to the console.",
      );
    }

    client.user.setPresence({
      activities: [{ name: "NovaHosting servers" }],
      status: "online",
    });
  },
};
