const { SlashCommandBuilder } = require("discord.js");
const usersService = require("../services/users");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { infoEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Look up a customer's FeatherPanel account details")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to look up").setRequired(true),
    ),

  async execute(interaction) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    let full = panelUser;
    if (panelUser.uuid) {
      try {
        full = await usersService.getUserById(panelUser.uuid);
      } catch {
        // fall back to the summary record already fetched
      }
    }

    const embed = infoEmbed({
      title: `Account: ${full.username || full.email || target.username}`,
      fields: [
        { name: "Discord User", value: `${target}`, inline: true },
        { name: "Panel User UUID", value: `${full.uuid ?? "Unknown"}`, inline: true },
        { name: "Email", value: full.email || "Unknown", inline: true },
        { name: "Status", value: full.suspended ? "Suspended" : "Active", inline: true },
        {
          name: "2FA Enabled",
          value: typeof full["2fa"] === "boolean" ? (full["2fa"] ? "Yes" : "No") : "Unknown",
          inline: true,
        },
        { name: "Root Admin", value: full.root_admin ? "Yes" : "No", inline: true },
      ],
    });

    await interaction.editReply({ embeds: [embed] }).catch(async () => {
      await interaction.followUp({
        embeds: [errorEmbed({ description: "Failed to send account details." })],
      });
    });
  },
};
