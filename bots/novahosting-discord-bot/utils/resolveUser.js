const usersService = require("../services/users");
const { errorEmbed } = require("./embeds");

/**
 * Resolves a Discord user to their FeatherPanel account, replying with a
 * friendly error embed if no matching panel user is found or the lookup
 * fails. Returns null when resolution failed (caller should stop).
 */
async function reply(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}

async function resolvePanelUser(interaction, discordUser) {
  try {
    const panelUser = await usersService.findUser({ discordId: discordUser.id });
    if (!panelUser) {
      await reply(interaction, {
        embeds: [
          errorEmbed({
            title: "No linked FeatherPanel account",
            description: `${discordUser} does not have a FeatherPanel account linked to their Discord ID. Make sure the panel's Discord identifier field is set for this customer.`,
          }),
        ],
      });
      return null;
    }
    return panelUser;
  } catch (err) {
    await reply(interaction, {
      embeds: [
        errorEmbed({
          title: "FeatherPanel lookup failed",
          description: `Could not reach FeatherPanel: \`${err.message}\``,
        }),
      ],
    });
    return null;
  }
}

module.exports = { resolvePanelUser };
