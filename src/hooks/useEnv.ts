function required(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

function normalizeCookiePath(value: string): string {
  const trimmed = value.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "/";
}

export const env = {
  pathText: String(import.meta.env.FRONT_PATH ?? "").replace(/^\/+|\/+$/g, ""),
  authUserPoolId: required("FRONT_AUTH_USER_POOL_ID"),
  authUserPoolWebClientId: required("FRONT_AUTH_USER_POOL_WEB_CLIENT_ID"),
  authDomain: required("FRONT_DOMAIN"),
  authPath: normalizeCookiePath(required("FRONT_PATH")),
  apiBaseUrl: required("API_COMMON_PATH").replace(/\/+$/g, ""),
  proxyBaseUrl: required("API_PROXY_PATH").replace(/\/+$/g, ""),
};

export function useEnv() {
  return env;
}