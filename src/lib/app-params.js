// Base44 used this to bootstrap { appId, token, appBaseUrl } from the URL/
// localStorage. Supabase auth manages its own session storage, so there is no
// equivalent "app token" anymore — this stub only exists so pages that still
// reference appParams.token/appId (PinGate, EmployeePortal, the Base44-MCP-only
// OAuthConsent page) don't crash. Those checks now always see no token.
export const appParams = {
  appId: null,
  token: null,
  appBaseUrl: null,
};
