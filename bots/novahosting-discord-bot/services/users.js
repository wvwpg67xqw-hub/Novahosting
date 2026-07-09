const { client } = require("./featherpanel");

/**
 * Users service — wraps FeatherPanel user-management endpoints.
 *
 * FeatherPanel identifies accounts by an internal panel user id, but staff
 * will look users up by Discord user, email, or username. Where a Discord ID
 * lookup is not natively supported by the panel, this service assumes a
 * custom field/identifier (commonly configured as "discord_id") is present
 * on the panel user record. Adjust the query param name below to match your
 * panel's actual field.
 */

/**
 * Find a FeatherPanel user by Discord ID, panel username, or email.
 * PLACEHOLDER: confirm the search endpoint and query params against your
 * FeatherPanel API docs. Pterodactyl-style panels typically expose
 * GET /api/application/users?filter[external_id]=... or
 * GET /api/application/users?filter[email]=...
 */
async function findUser({ discordId, username, email } = {}) {
  const filters = {};
  if (discordId) filters["filter[external_id]"] = discordId; // PLACEHOLDER: field name for Discord ID linkage
  if (username) filters["filter[username]"] = username;
  if (email) filters["filter[email]"] = email;

  const { data } = await client.get("/api/application/users", {
    params: filters,
  });

  // PLACEHOLDER: response shape assumed to follow Pterodactyl's
  // { data: [{ attributes: {...} }] } convention. Adjust to match FeatherPanel.
  const record = data?.data?.[0]?.attributes || data?.data?.[0] || null;
  return record;
}

/**
 * Fetch full details for a single FeatherPanel user by panel user id.
 * PLACEHOLDER: confirm path — likely GET /api/application/users/:id
 */
async function getUserById(panelUserId) {
  const { data } = await client.get(`/api/application/users/${panelUserId}`);
  return data?.attributes || data;
}

/**
 * Ban a user's panel account.
 * PLACEHOLDER: FeatherPanel core does not document a dedicated "ban"
 * endpoint as of writing. Common implementations either:
 *   (a) suspend the account (see suspendUser), or
 *   (b) use a moderation/ban add-on with its own endpoint, e.g.
 *       POST /api/application/users/:id/ban { reason }
 * Wire this up to whichever your installation actually exposes.
 */
async function banUser(panelUserId, reason) {
  const { data } = await client.post(`/api/application/users/${panelUserId}/ban`, {
    reason,
  });
  return data;
}

/**
 * Unban a user's panel account.
 * PLACEHOLDER: mirror of banUser — confirm endpoint with your ban/moderation add-on.
 */
async function unbanUser(panelUserId) {
  const { data } = await client.post(`/api/application/users/${panelUserId}/unban`);
  return data;
}

/**
 * Suspend a user's panel account (blocks panel/API access but does not delete data).
 * PLACEHOLDER: confirm path — Pterodactyl-style panels expose this as a PATCH
 * to the user resource with a `suspended` flag, or a dedicated endpoint like
 * POST /api/application/users/:id/suspend
 */
async function suspendUser(panelUserId) {
  const { data } = await client.post(`/api/application/users/${panelUserId}/suspend`);
  return data;
}

/**
 * Lift a suspension on a user's panel account.
 * PLACEHOLDER: confirm path — see suspendUser.
 */
async function unsuspendUser(panelUserId) {
  const { data } = await client.post(`/api/application/users/${panelUserId}/unsuspend`);
  return data;
}

module.exports = {
  findUser,
  getUserById,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
};
