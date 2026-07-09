const config = require("../config/config");
const { infoEmbed } = require("./embeds");

/**
 * Posts an action-log entry to the configured LOG_CHANNEL_ID.
 * Falls back to console output if the log channel isn't configured/reachable
 * so staff actions are never silently dropped.
 */
async function logAction(client, { actor, action, target, details, color }) {
  const fields = [
    { name: "Staff Member", value: actor ? `${actor}` : "Unknown", inline: true },
    { name: "Action", value: action, inline: true },
  ];
  if (target) fields.push({ name: "Target", value: `${target}`, inline: true });
  if (details) fields.push({ name: "Details", value: `${details}` });

  const embed = infoEmbed({ title: "NovaHosting Action Log", fields });
  if (color) embed.setColor(color);

  console.log(`[action-log] ${action} by ${actor} on ${target || "n/a"}${details ? ` — ${details}` : ""}`);

  if (!config.logChannelId) return;

  try {
    const channel = await client.channels.fetch(config.logChannelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error("[action-log] failed to post to LOG_CHANNEL_ID:", err.message);
  }
}

module.exports = { logAction };
