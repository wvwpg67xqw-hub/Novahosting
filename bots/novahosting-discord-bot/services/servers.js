const { client } = require("./featherpanel");

/**
 * Servers service — wraps the PterodactylPanelApi plugin's server-management
 * endpoints (confirmed against https://github.com/featherpanel-com/PterodactylPanelApi).
 *
 * Confirmed endpoints:
 *   GET    /api/application/servers                          list servers
 *   GET    /api/application/servers/:id                       server details by id
 *   GET    /api/application/servers/external/:external_id     server details by external id
 *   POST   /api/application/servers/:id/suspend                suspend
 *   POST   /api/application/servers/:id/unsuspend               unsuspend
 *   POST   /api/application/servers/:id/reinstall                reinstall
 *   DELETE /api/application/servers/:id                         delete
 *   PATCH  /api/application/servers/:id/details                 update details
 *   PATCH  /api/application/servers/:id/build                   update build
 *   PATCH  /api/application/servers/:id/startup                 update startup
 *
 * IMPORTANT: this plugin only implements Pterodactyl's *Application* API
 * (admin/management actions). Power control (start/stop/restart) lives on
 * Pterodactyl's separate *Client* API, which this plugin does not expose and
 * which normally requires a per-user client API key rather than the admin
 * key configured here. start/stop/restart are therefore NOT currently
 * possible through this integration — the command handlers report this
 * clearly rather than silently failing. If your panel later adds a client
 * API (or Wings-direct power endpoint), wire it in here.
 */

function unwrap(data) {
  return data?.attributes || data?.data?.attributes || data?.data || data;
}

/**
 * List ALL servers across every page (no documented filter query param, so
 * ownership filtering happens client-side). Pagination follows Pterodactyl's
 * convention of a `meta.pagination.total_pages` field; if that's absent we
 * stop after the first page (single-page response).
 */
async function listServers({ ownerId } = {}) {
  const list = [];
  let page = 1;
  // Safety cap so a malformed/never-ending pagination response can't loop
  // forever. If real data exceeds this, we throw rather than silently
  // truncate results (see check below).
  const MAX_PAGES = 100;
  for (;;) {
    const { data } = await client.get("/api/application/servers", {
      params: { per_page: 200, page },
    });
    const pageItems = data?.data?.map(unwrap) || [];
    list.push(...pageItems);

    const totalPages = data?.meta?.pagination?.total_pages;
    if (!totalPages || page >= totalPages || pageItems.length === 0) break;

    if (page >= MAX_PAGES) {
      throw new Error(
        `FeatherPanel server list exceeds ${MAX_PAGES} pages (${totalPages} reported) — refusing to truncate results silently. Raise MAX_PAGES in services/servers.js if this is expected.`,
      );
    }
    page += 1;
  }

  if (ownerId == null) return list;
  return list.filter((s) => String(s?.user) === String(ownerId));
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
    const { data } = await client.get(`/api/application/servers/external/${identifierOrId}`);
    return unwrap(data);
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
  const { data } = await client.get(`/api/application/servers/${panelId}`);
  return unwrap(data);
}

async function suspendServer(panelId) {
  const { data } = await client.post(`/api/application/servers/${panelId}/suspend`);
  return data;
}

async function unsuspendServer(panelId) {
  const { data } = await client.post(`/api/application/servers/${panelId}/unsuspend`);
  return data;
}

const POWER_ACTION_UNSUPPORTED_MESSAGE =
  "Power control (start/stop/restart) is not available through the currently installed FeatherPanel API plugin — it only exposes management actions, not Pterodactyl's Client API. Ask your panel admin about adding client API / Wings-direct power support before this command can work.";

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
