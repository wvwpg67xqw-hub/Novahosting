const { client } = require("./featherpanel");

/**
 * Servers service — wraps FeatherPanel server-management endpoints.
 * Modeled after the Pterodactyl-derived client + application APIs that
 * FeatherPanel exposes for server lookup and power actions.
 */

/**
 * Find a server by its short identifier or UUID.
 * PLACEHOLDER: confirm path — Pterodactyl-style panels expose
 * GET /api/application/servers/:id (numeric id) or
 * GET /api/client/servers/:identifier (short identifier, client API).
 * This assumes the application API keyed by identifier; adjust as needed.
 */
async function findServer(identifierOrId) {
  const { data } = await client.get("/api/application/servers", {
    params: { "filter[uuidShort]": identifierOrId },
  });

  // PLACEHOLDER: response shape assumed to follow Pterodactyl's
  // { data: [{ attributes: {...} }] } convention. Adjust to match FeatherPanel.
  const record = data?.data?.[0]?.attributes || data?.data?.[0] || null;
  return record;
}

/**
 * Fetch full details + resource usage for a server.
 * PLACEHOLDER: resource usage typically lives on the client API, e.g.
 * GET /api/client/servers/:identifier/resources
 */
async function getServerDetails(identifierOrId) {
  const { data } = await client.get(`/api/application/servers/${identifierOrId}`);
  return data?.attributes || data;
}

/**
 * Fetch live resource usage (CPU/RAM/disk/state) for a server.
 * PLACEHOLDER: confirm path — likely GET /api/client/servers/:identifier/resources
 */
async function getServerResources(identifier) {
  const { data } = await client.get(`/api/client/servers/${identifier}/resources`);
  return data?.attributes || data;
}

/**
 * Send a power action to a server: "start" | "stop" | "restart" | "kill".
 * PLACEHOLDER: confirm path — Pterodactyl-style panels expose
 * POST /api/client/servers/:identifier/power { signal }
 */
async function sendPowerAction(identifier, signal) {
  const { data } = await client.post(`/api/client/servers/${identifier}/power`, {
    signal,
  });
  return data;
}

async function startServer(identifier) {
  return sendPowerAction(identifier, "start");
}

async function stopServer(identifier) {
  return sendPowerAction(identifier, "stop");
}

async function restartServer(identifier) {
  return sendPowerAction(identifier, "restart");
}

module.exports = {
  findServer,
  getServerDetails,
  getServerResources,
  startServer,
  stopServer,
  restartServer,
};
