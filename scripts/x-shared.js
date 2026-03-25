import crypto from "crypto";
import OAuth from "oauth-1.0a";

export const X_API_BASE = "https://api.x.com";

export function safeStr(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWhitespace(str) {
  return safeStr(str).replace(/\s+/g, " ").trim();
}

export function truncate(str, max = 280) {
  const s = normalizeWhitespace(str);
  if (!s) return "";
  if (s.length <= max) return s;

  const trimmed = s.slice(0, max + 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) return trimmed.slice(0, lastSpace).trim() + "…";
  return s.slice(0, max).trim() + "…";
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTrue(v) {
  return String(v || "").toLowerCase() === "true";
}

export function buildOAuthClient({ apiKey, apiKeySecret }) {
  return new OAuth({
    consumer: {
      key: apiKey || "",
      secret: apiKeySecret || "",
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

export function getOAuthHeader({
  url,
  method,
  apiKey,
  apiKeySecret,
  accessToken,
  accessTokenSecret,
}) {
  if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "Missing one or more X OAuth 1.0a credentials for user-context write",
    );
  }

  const oauth = buildOAuthClient({ apiKey, apiKeySecret });

  const authData = oauth.authorize(
    { url, method },
    {
      key: accessToken,
      secret: accessTokenSecret,
    },
  );

  return oauth.toHeader(authData);
}

export async function xGetWithBearer(path, params = {}, bearerToken) {
  if (!bearerToken) throw new Error("Missing X_BEARER_TOKEN");

  const url = new URL(`${X_API_BASE}${path}`);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `X GET failed: ${res.status} ${JSON.stringify(data).slice(0, 1000)}`,
    );
  }

  return data;
}

export async function xPostWithOAuth1({
  path,
  body,
  apiKey,
  apiKeySecret,
  accessToken,
  accessTokenSecret,
}) {
  const url = `${X_API_BASE}${path}`;
  const oauthHeader = getOAuthHeader({
    url,
    method: "POST",
    apiKey,
    apiKeySecret,
    accessToken,
    accessTokenSecret,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `X POST failed: ${res.status} ${JSON.stringify(data).slice(0, 1000)}`,
    );
  }

  return data;
}
