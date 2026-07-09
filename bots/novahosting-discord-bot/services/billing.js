const { client } = require("./featherpanel");

/**
 * Billing service — wraps the FeatherPanel Billing Core add-on endpoints.
 * Billing Core is a plugin, not part of FeatherPanel's base API, so exact
 * routes vary by installation/version. Endpoints below are placeholders
 * following the naming FeatherPanel Billing Core documentation uses at the
 * time of writing — verify against your installed plugin's API reference.
 */

/**
 * Get a user's current account balance/credits.
 * PLACEHOLDER: confirm path — likely
 * GET /api/application/billing/users/:id/balance
 */
async function getBalance(panelUserId) {
  const { data } = await client.get(`/api/application/billing/users/${panelUserId}/balance`);
  return data?.attributes || data;
}

/**
 * Add credits to a user's account.
 * PLACEHOLDER: confirm path — likely
 * POST /api/application/billing/users/:id/credits/add { amount, reason }
 */
async function addCredits(panelUserId, amount, reason) {
  const { data } = await client.post(
    `/api/application/billing/users/${panelUserId}/credits/add`,
    { amount, reason },
  );
  return data;
}

/**
 * Remove credits from a user's account.
 * PLACEHOLDER: confirm path — likely
 * POST /api/application/billing/users/:id/credits/remove { amount, reason }
 */
async function removeCredits(panelUserId, amount, reason) {
  const { data } = await client.post(
    `/api/application/billing/users/${panelUserId}/credits/remove`,
    { amount, reason },
  );
  return data;
}

/**
 * Issue a refund to a user's account.
 * PLACEHOLDER: confirm path — Billing Core may model refunds against a
 * specific invoice/transaction rather than a flat credit. Likely
 * POST /api/application/billing/users/:id/refund { amount, reason }
 * or POST /api/application/billing/transactions/:transactionId/refund
 */
async function refund(panelUserId, amount, reason) {
  const { data } = await client.post(
    `/api/application/billing/users/${panelUserId}/refund`,
    { amount, reason },
  );
  return data;
}

module.exports = {
  getBalance,
  addCredits,
  removeCredits,
  refund,
};
