/* AIS Payroll - settings read when the app opens in the browser.
 *
 * apiBase: the address of the payroll API (back end). Change it here on the server
 * if the API moves; no rebuild is needed. Used by the built (production) app only -
 * while developing, .env.development decides.
 */
window.AIS_CONFIG = {
  apiBase: "https://payroll-back.phvtech.com",
};
