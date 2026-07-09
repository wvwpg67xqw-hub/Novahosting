const axios = require("axios");
const config = require("../config/config");

/**
 * Shared axios client for the FeatherPanel API.
 *
 * NOTE: FeatherPanel's exact REST surface depends on the panel version and
 * any installed add-ons (e.g. the Billing Core plugin). The paths below are
 * best-effort conventions modeled after Pterodactyl-style panels, which
 * FeatherPanel is derived from. Wherever an endpoint is uncertain, it is
 * clearly marked with a "PLACEHOLDER" comment describing what to verify
 * against your FeatherPanel instance's API docs before going live.
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
      error.response?.data?.errors?.[0]?.detail ||
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
