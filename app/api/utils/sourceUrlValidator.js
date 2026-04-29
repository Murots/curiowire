/* ============================================================================
app/api/utils/sourceUrlValidator.js

CurioWire: Shared source URL validation utilities
Used by article, list article, and question generation.
Now improved with:
- blocks weak homepage redirects from dead file URLs
- rejects file/document sources (pdf/doc/etc.)
- prefers direct HTML content pages
============================================================================ */

const DEFAULT_TIMEOUT_MS = Number(process.env.SOURCE_URL_TIMEOUT_MS || 8000);

function safe(v) {
  return String(v || "").trim();
}

export function cleanUrl(value) {
  const url = safe(value);

  if (!url) return "";

  return url.replace(/[)\].,;:]+$/, "");
}

export function isValidHttpUrl(value) {
  const url = cleanUrl(value);

  return /^https?:\/\/\S+$/i.test(url);
}

function getPathname(value) {
  try {
    return new URL(cleanUrl(value)).pathname || "/";
  } catch {
    return "/";
  }
}

function isHomepageUrl(value) {
  const path = getPathname(value);
  return path === "/" || path === "";
}

function isFileLikeUrl(value) {
  const path = getPathname(value).toLowerCase();

  return (
    path.endsWith(".pdf") ||
    path.endsWith(".doc") ||
    path.endsWith(".docx") ||
    path.endsWith(".xls") ||
    path.endsWith(".xlsx") ||
    path.endsWith(".ppt") ||
    path.endsWith(".pptx") ||
    path.endsWith(".zip") ||
    path.endsWith(".rar") ||
    path.endsWith(".txt") ||
    path.includes("/wp-content/uploads/")
  );
}

export function isBlockedSourceUrl(value) {
  const url = cleanUrl(value).toLowerCase();

  if (!url) return true;

  return (
    url.includes("reddit.com") ||
    url.includes("quora.com") ||
    url.includes("facebook.com") ||
    url.includes("x.com/") ||
    url.includes("twitter.com") ||
    url.includes("tiktok.com") ||
    url.includes("instagram.com") ||
    url.includes("pinterest.com") ||
    url.includes("threads.net") ||
    url.includes("medium.com") ||
    url.includes("substack.com")
  );
}

function looksNonEnglishUrl(value) {
  const url = cleanUrl(value).toLowerCase();

  return (
    url.includes("/ja/") ||
    url.includes("/jp/") ||
    url.includes("/fr/") ||
    url.includes("/de/") ||
    url.includes("/es/") ||
    url.includes("/it/") ||
    url.includes("/pt/") ||
    url.includes("/zh/") ||
    url.includes("/ko/")
  );
}

function buildEnglishUrlCandidates(value) {
  const url = cleanUrl(value);
  const candidates = new Set();

  try {
    const u = new URL(url);

    const replacements = [
      ["/ja/", "/en/"],
      ["/jp/", "/en/"],
      ["/fr/", "/en/"],
      ["/de/", "/en/"],
      ["/es/", "/en/"],
      ["/it/", "/en/"],
      ["/pt/", "/en/"],
      ["/zh/", "/en/"],
      ["/ko/", "/en/"],
    ];

    for (const [from, to] of replacements) {
      if (u.pathname.includes(from)) {
        const copy = new URL(u.toString());
        copy.pathname = copy.pathname.replace(from, to);
        candidates.add(copy.toString());
      }
    }

    const withLang = new URL(u.toString());
    withLang.searchParams.set("lang", "en");
    candidates.add(withLang.toString());
  } catch {
    return [];
  }

  return Array.from(candidates).filter((x) => x !== url);
}

export async function validateSourceUrl(value, options = {}) {
  const url = cleanUrl(value);
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);

  if (!isValidHttpUrl(url)) return null;
  if (isBlockedSourceUrl(url)) return null;
  if (isFileLikeUrl(url)) return null;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (compatible; CurioWireBot/1.0; +https://curiowire.com)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers,
    });

    if (!res.ok || res.status >= 400) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers,
      });
    }

    if (!res.ok || res.status >= 400) return null;

    const finalUrl = cleanUrl(res.url || url);

    if (!isValidHttpUrl(finalUrl)) return null;
    if (isBlockedSourceUrl(finalUrl)) return null;
    if (isFileLikeUrl(finalUrl)) return null;

    // If a deep article URL redirects to homepage, reject it.
    if (!isHomepageUrl(url) && isHomepageUrl(finalUrl)) {
      return null;
    }

    if (options.preferEnglish !== false && looksNonEnglishUrl(finalUrl)) {
      const englishCandidates = buildEnglishUrlCandidates(finalUrl);

      for (const candidate of englishCandidates) {
        const englishUrl = await validateSourceUrl(candidate, {
          ...options,
          preferEnglish: false,
        });

        if (englishUrl) {
          console.log(`🌐 English source version found: ${englishUrl}`);
          return englishUrl;
        }
      }
    }

    return finalUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateSourceUrls(values = [], options = {}) {
  const urls = Array.isArray(values) ? values : [];
  const seen = new Set();
  const valid = [];

  for (const value of urls) {
    const cleaned = cleanUrl(value);
    const key = cleaned.toLowerCase();

    if (!key || seen.has(key)) continue;
    seen.add(key);

    const verified = await validateSourceUrl(cleaned, options);

    if (verified) valid.push(verified);
  }

  return valid;
}
