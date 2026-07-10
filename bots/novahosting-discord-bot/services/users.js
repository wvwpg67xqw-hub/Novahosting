const { client } = require("./featherpanel");
const serversService = require("./servers");

/**
 * Users service — wraps FeatherPanel's native admin user-management API,
 * confirmed directly against the live instance's route definitions
 * (app/routes/admin/users.php).
 *
 * Confirmed endpoints:
 *   GET    /api/admin/users                          list users
 *   GET    /api/admin/users/:uuid                     view user by UUID
 *   GET    /api/admin/users/external/:externalId      view user by external id
 *   GET    /api/admin/users/:uuid/servers             servers owned by a user
 *   POST   /api/admin/users/:uuid/ban                 ban (real account-level ban!)
 *   POST   /api/admin/users/:uuid/unban                unban
 *
 * IMPORTANT: users here are identified by UUID (string), not a numeric id —
 * this differs from servers, which use numeric ids. Don't mix the two up.
 *
 * This panel has a genuine account-level ban, unlike the community plugin
 * this bot was originally built against — /ban and /unban call it directly.
 * /suspend and /unsuspend remain server-level actions (there's no separate
 * "suspend the account" concept here), applied across all of a user's
 * servers via services/servers.js.
 *
 * Discord-ID linkage: uses FeatherPanel's built-in "external_id" field via
 * the dedicated /external/:externalId endpoint. Set each customer's
 * external_id to their Discord user ID in FeatherPanel for lookups to work.
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
  if (Array.isArray(body?.users)) return { items: body.users, pagination: body?.pagination };
  return { items: [], pagination: null };
}

/**
 * Find a FeatherPanel user by Discord ID (external_id), username, or email.
 */
async function findUser({ discordId, username, email } = {}) {
  if (discordId) {
    try {
      const { data } = await client.get(`/api/admin/users/external/${discordId}`);
      return unwrapItem(data);
    } catch (err) {
      // Only a real 404 means "not linked" — any other failure (network
      // error, timeout, 401/500, etc.) must propagate as a real error.
      if (err.status === 404) return null;
      throw err;
    }
  }

  // No documented filter query params for username/email search, so list
  // (across all pages) and scan client-side.
  if (username || email) {
    const list = await listAllUsers();
    return (
      list.find(
        (u) =>
          (username && u?.username?.toLowerCase() === username.toLowerCase()) ||
          (email && u?.email?.toLowerCase() === email.toLowerCase()),
      ) || null
    );
  }

  return null;
}

/**
 * List ALL users across every page. Pagination shape isn't fully documented
 * here, so this checks common `pagination.total_pages` / `pagination.last_page`
 * conventions and otherwise stops after one page.
 */
async function listAllUsers() {
  const list = [];
  let page = 1;
  // Safety cap so a malformed/never-ending pagination response can't loop
  // forever. If real data exceeds this, throw rather than silently
  // truncate results.
  const MAX_PAGES = 100;
  for (;;) {
    const { data } = await client.get("/api/admin/users", { params: { per_page: 200, page } });
    const { items, pagination } = unwrapList(data);
    list.push(...items);

    const totalPages = pagination?.total_pages ?? pagination?.last_page;
    if (!totalPages || page >= totalPages || items.length === 0) break;

    if (page >= MAX_PAGES) {
      throw new Error(
        `FeatherPanel user list exceeds ${MAX_PAGES} pages (${totalPages} reported) — refusing to truncate results silently. Raise MAX_PAGES in services/users.js if this is expected.`,
      );
    }
    page += 1;
  }
  return list;
}

/**
 * Fetch full details for a single FeatherPanel user by UUID.
 */
async function getUserById(uuid) {
  const { data } = await client.get(`/api/admin/users/${uuid}`);
  return unwrapItem(data);
}

/**
 * List the servers owned by a user, by UUID, using the dedicated admin
 * endpoint (rather than filtering the global server list client-side).
 */
async function getOwnedServers(uuid) {
  const { data } = await client.get(`/api/admin/users/${uuid}/servers`);
  return unwrapList(data).items;
}

/**
 * Real account-level ban/unban — this panel supports it natively, unlike
 * the community plugin this bot was originally built against.
 */
async function banUser(uuid, reason) {
  const { data } = await client.post(`/api/admin/users/${uuid}/ban`, reason ? { reason } : {});
  return data;
}

async function unbanUser(uuid) {
  const { data } = await client.post(`/api/admin/users/${uuid}/unban`);
  return data;
}

/**
 * Runs an action against every server owned by a user (by UUID) and reports
 * which ones succeeded vs failed, instead of an all-or-nothing result — with
 * many servers, a single flaky request shouldn't hide the rest as if the
 * whole operation succeeded (or silently drop the failures).
 */
async function applyToAllServers(uuid, action) {
  const servers = await getOwnedServers(uuid);
  const results = await Promise.allSettled(servers.map((s) => action(s.id).then(() => s)));

  const succeeded = [];
  const failed = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      succeeded.push(servers[i]);
    } else {
      failed.push({ server: servers[i], error: result.reason });
    }
  });

  return { total: servers.length, succeeded, failed };
}

/**
 * Suspend every server owned by this user (numeric server ids under the
 * hood; the user itself is looked up by UUID). Returns
 * { total, succeeded, failed } — see applyToAllServers.
 */
async function suspendUser(uuid) {
  return applyToAllServers(uuid, (id) => serversService.suspendServer(id));
}

/**
 * Unsuspend every server owned by this user. Returns
 * { total, succeeded, failed } — see applyToAllServers.
 */
async function unsuspendUser(uuid) {
  return applyToAllServers(uuid, (id) => serversService.unsuspendServer(id));
}

module.exports = {
  findUser,
  getUserById,
  getOwnedServers,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
};
