const config = require("../config/config");
const { errorEmbed } = require("./embeds");

/**
 * Returns true if the interacting member holds the configured staff role.
 * Server admins/owners are also allowed through Discord's Administrator
 * permission so the bot never locks out the guild owner.
 */
function isStaff(interaction) {
  if (!interaction.inGuild() || !interaction.member) return false;
  if (interaction.member.permissions?.has("Administrator")) return true;
  if (!config.staffRoleId) return false;
  const roles = interaction.member.roles;
  if (!roles) return false;
  return typeof roles.cache?.has === "function"
    ? roles.cache.has(config.staffRoleId)
    : Array.isArray(roles) && roles.includes(config.staffRoleId);
}

/**
 * Guard helper for command handlers. Replies with an error embed and
 * returns false if the invoking member is not staff.
 */
async function requireStaff(interaction) {
  if (!config.staffRoleId) {
    await interaction.reply({
      embeds: [
        errorEmbed({
          title: "Staff role not configured",
          description:
            "`STAFF_ROLE_ID` is not set. Ask an administrator to configure it before staff commands can be used.",
        }),
      ],
      ephemeral: true,
    });
    return false;
  }

  if (!isStaff(interaction)) {
    await interaction.reply({
      embeds: [
        errorEmbed({
          title: "Permission denied",
          description: "You need the NovaHosting staff role to use this command.",
        }),
      ],
      ephemeral: true,
    });
    return false;
  }

  return true;
}

module.exports = { isStaff, requireStaff };
