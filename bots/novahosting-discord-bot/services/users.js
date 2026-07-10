const { client } = require("./featherpanel");
const serversService = require("./servers");

/**
 * Users service — wraps the PterodactylPanelApi plugin's user-management
 * endpoints (confirmed against https://github.com/featherpanel-com/PterodactylPanelApi).
 *
 * Confirmed endpoints:
 *   GET    /api/application/users                        list users
 *   GET    /api/application/users/:id                     view user by id
 *   GET    /api/application/users/external/:external_id   view user by external id
 *   PATCH  /api/application/users/:id                     update user
 *   DELETE /api/application/users/:id                     delete user
 *
 * IMPORTANT: this plugin does not expose a per-user "ban" or "suspend"
 * endpoint — suspension is a per-SERVER action (see services/servers.js).
 * "Suspending a user" here means suspending every server they own, and
 * ban/unban are implemented the same way. This is the closest available
 * equivalent; adjust if your panel adds a real account-level flag later.
 *
 * Discord-ID linkage: uses FeatherPanel's built-in "external_id" field via
 * the dedicated /external/:external_id endpoint. Set each customer's
 * external_id to their Discord user ID in FeatherPanel for lookups to work.
 */

function unwrap(data) {
  return data?.attributes || data?.data?.attributes || data?.data || data;
}

/**
 * Find a FeatherPanel user by Discord ID (external_id), username, or email.
 */
async function findUser({ discordId, username, email } = {}) {
  if (discordId) {
    try {
      const { data } = await client.get(`/api/application/users/external/${discordId}`);
      return unwrap(data);
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
 * List ALL users across every page. Follows Pterodactyl's pagination
 * convention (`meta.pagination.total_pages`); stops after one page if that
 * field is absent (single-page response).
 */
async function listAllUsers() {
  const list = [];
  let page = 1;
  // Safety cap so a malformed/never-ending pagination response can't loop
  // forever. If real data exceeds this, throw rather than silently
  // truncate results.
  const MAX_PAGES = 100;
  for (;;) {
    const { data } = await client.get("/api/application/users", {
      params: { per_page: 200, page },
    });
    const pageItems = data?.data?.map(unwrap) || [];
    list.push(...pageItems);

    const totalPages = data?.meta?.pagination?.total_pages;
    if (!totalPages || page >= totalPages || pageItems.length === 0) break;

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
 * Fetch full details for a single FeatherPanel user by panel user id.
 */
async function getUserById(panelUserId) {
  const { data } = await client.get(`/api/application/users/${panelUserId}`);
  return unwrap(data);
}

/**
 * Runs an action against every server owned by a user and reports which
 * ones succeeded vs failed, instead of an all-or-nothing result — with
 * many servers, a single flaky request shouldn't hide the rest as if the
 * whole operation succeeded (or silently drop the failures).
 */
async function applyToAllServers(panelUserId, action) {
  const servers = await serversService.listServersByOwner(panelUserId);
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
 * Suspend every server owned by this user. Used to back both the /ban and
 * /suspend commands, since the plugin only supports suspension at the
 * server level. Returns { total, succeeded, failed } — see applyToAllServers.
 */
async function suspendAllServers(panelUserId) {
  return applyToAllServers(panelUserId, (id) => serversService.suspendServer(id));
}

/**
 * Unsuspend every server owned by this user. Returns
 * { total, succeeded, failed } — see applyToAllServers.
 */
async function unsuspendAllServers(panelUserId) {
  return applyToAllServers(panelUserId, (id) => serversService.unsuspendServer(id));
}

// Ban/unban are aliases of suspend/unsuspend at the server level — see the
// module comment above for why there's no separate account-level ban.
const banUser = suspendAllServers;
const unbanUser = unsuspendAllServers;
const suspendUser = suspendAllServers;
const unsuspendUser = unsuspendAllServers;

module.exports = {
  findUser,
  getUserById,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
};
