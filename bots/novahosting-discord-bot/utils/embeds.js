const { EmbedBuilder } = require("discord.js");
const config = require("../config/config");

function baseEmbed() {
  return new EmbedBuilder()
    .setFooter({ text: config.brand.footer })
    .setTimestamp();
}

function successEmbed({ title, description, fields }) {
  const embed = baseEmbed().setColor(config.brand.successColor).setTitle(title);
  if (description) embed.setDescription(description);
  if (fields) embed.addFields(fields);
  return embed;
}

function infoEmbed({ title, description, fields }) {
  const embed = baseEmbed().setColor(config.brand.color).setTitle(title);
  if (description) embed.setDescription(description);
  if (fields) embed.addFields(fields);
  return embed;
}

function warnEmbed({ title, description, fields }) {
  const embed = baseEmbed().setColor(config.brand.warnColor).setTitle(title);
  if (description) embed.setDescription(description);
  if (fields) embed.addFields(fields);
  return embed;
}

function errorEmbed({ title = "Something went wrong", description }) {
  return baseEmbed().setColor(config.brand.errorColor).setTitle(title).setDescription(description || "An unexpected error occurred.");
}

module.exports = { successEmbed, infoEmbed, warnEmbed, errorEmbed };
