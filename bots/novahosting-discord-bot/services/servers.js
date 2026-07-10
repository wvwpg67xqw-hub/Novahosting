const { client } = require("./featherpanel");

/**
 * Servers service — wraps FeatherPanel's native admin server-management API,
 * confirmed directly against the live instance's route definitions
 * (app/routes/admin/servers.php).
 *
 * Confirmed endpoints:
 *   GET    /api/admin/servers                          list servers
 *   GET    /api/admin/servers/:id                       server details (numeric id)
 *   GET    /api/admin/servers/external/:externalId      server details by external id
 *   GET    /api/admin/servers/owner/:ownerId            servers owned by a user (numeric owner id —
 *                                                        NOT the same as a user's UUID; kept here for
 *                                                        completeness, but services/users.js#getOwnedServers
 *                                                        uses the UUID-keyed /api/admin/users/:uuid/servers
 *                                                        endpoint instead, since that's what the rest of
 *                                                        this bot works with)
 *   POST   /api/admin/servers/:id/suspend               suspend
 *   POST   /api/admin/servers/:id/unsuspend             unsuspend
 *
 * IMPORTANT: this panel's power-control route
 * (POST /api/user/servers/:uuidShort/power/:action) is registered as a
 * *user session* route (registerServerRoute), scoped to a customer's own
 * servers. There is no equivalent admin-level power route in this install
 * (confirmed: no "power" routes anywhere under app/routes/admin). Start/
 * stop/restart are therefore NOT possible through an admin API key here —
 * command handlers report this clearly rather than silently failing.
 */

// FeatherPanel wraps responses as { success, data, ... }. Lists may nest
// their array + pagination meta a couple of different ways depending on
// controller; this defensively unwraps the common shapes.
function unwrapItem(data) {
  return data?.data ?? data;
}

function unwrapList(data) {
  const body = data?.data ?? data;
  if (Array.isArray(body)) return { items: body, pagination: data?.pagination ?? body?.pagination };
  if (Array.isArray(body?.data)) return { items: body.data, pagination: body?.pagination ?? data?.pagination };
  if (Array.isArray(body?.servers)) return { items: body.servers, pagination: body?.pagination };
  return { items: [], pagination: null };
}

/**
 * List ALL servers across every page. Pagination shape isn't fully
 * documented here, so this checks common `pagination.total_pages` /
 * `pagination.last_page` conventions and otherwise stops after one page.
 */
async function listServers({ ownerId } = {}) {
  if (ownerId != null) {
    const { data } = await client.get(`/api/admin/servers/owner/${ownerId}`);
    return unwrapList(data).items;
  }

  const list = [];
  let page = 1;
  // Safety cap so a malformed/never-ending pagination response can't loop
  // forever. If real data exceeds this, throw rather than silently
  // truncate results.
  const MAX_PAGES = 100;
  for (;;) {
    const { data } = await client.get("/api/admin/servers", { params: { per_page: 200, page } });
    const { items, pagination } = unwrapList(data);
    list.push(...items);

    const totalPages = pagination?.total_pages ?? pagination?.last_page;
    if (!totalPages || page >= totalPages || items.length === 0) break;

    if (page >= MAX_PAGES) {
      throw new Error(
        `FeatherPanel server list exceeds ${MAX_PAGES} pages (${totalPages} reported) — refusing to truncate results silently. Raise MAX_PAGES in services/servers.js if this is expected.`,
      );
    }
    page += 1;
  }
  return list;
}

async function listServersByOwner(ownerId) {
  return listServers({ ownerId });
}

/**
 * Find a server by numeric panel id, external id, or short identifier/UUID.
 */
async function findServer(identifierOrId) {
  if (/^\d+$/.test(String(identifierOrId))) {
    try {
      return await getServerDetails(identifierOrId);
    } catch (err) {
      // Only a real 404 means "no server with this id" — anything else
      // (network error, timeout, 401/500, etc.) must propagate.
      if (err.status !== 404) throw err;
    }
  }

  try {
    const { data } = await client.get(`/api/admin/servers/external/${identifierOrId}`);
    return unwrapItem(data);
  } catch (err) {
    // Only a real 404 means "no server with this external id" — any other
    // failure (network error, timeout, 401/500, etc.) must propagate so it
    // isn't misreported as "not found".
    if (err.status !== 404) throw err;
  }

  // Fall back to scanning the server list for a matching short identifier/UUID.
  const list = await listServers();
  return (
    list.find(
      (s) =>
        s?.identifier === identifierOrId ||
        s?.uuid === identifierOrId ||
        s?.uuidShort === identifierOrId,
    ) || null
  );
}

/**
 * Fetch full details for a server by panel id.
 */
async function getServerDetails(panelId) {
  const { data } = await client.get(`/api/admin/servers/${panelId}`);
  return unwrapItem(data);
}

async function suspendServer(panelId) {
  const { data } = await client.post(`/api/admin/servers/${panelId}/suspend`);
  return data;
}

async function unsuspendServer(panelId) {
  const { data } = await client.post(`/api/admin/servers/${panelId}/unsuspend`);
  return data;
}

const POWER_ACTION_UNSUPPORTED_MESSAGE =
  "Power control (start/stop/restart) is not available through the admin API on this FeatherPanel install — the only power route (`/api/user/servers/:uuidShort/power/:action`) requires the customer's own logged-in session, and there's no admin-level equivalent. Ask your panel admin if a Wings-direct or admin power route can be added before this command can work.";

async function sendPowerAction() {
  const err = new Error(POWER_ACTION_UNSUPPORTED_MESSAGE);
  err.status = 501;
  throw err;
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
  listServers,
  listServersByOwner,
  findServer,
  getServerDetails,
  suspendServer,
  unsuspendServer,
  startServer,
  stopServer,
  restartServer,
};
