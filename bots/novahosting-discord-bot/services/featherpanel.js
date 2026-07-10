const axios = require("axios");
const config = require("../config/config");

/**
 * Shared axios client for the FeatherPanel API.
 *
 * Confirmed against the live instance's own route definitions
 * (app/routes/admin/*.php, app/Middleware/AuthMiddleware.php) — this is
 * FeatherPanel's native admin API, not a third-party plugin.
 *
 * Auth: `Authorization: Bearer <key>` where <key> is either the public or
 * private key of a personal API client (Account -> API Clients in the
 * panel UI). Admin access is granted purely by whether the underlying
 * account has admin permissions — there is no separate "admin key" format.
 */
const client = axios.create({
  baseURL: config.featherPanel.url,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${config.featherPanel.apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error_message ||
      error.response?.data?.message ||
      error.message ||
      "Unknown FeatherPanel API error";
    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.original = error;
    return Promise.reject(wrapped);
  },
);

module.exports = { client };
