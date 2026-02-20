import { NextResponse } from "next/server";

const CATEGORIES = new Set([
  "science",
  "technology",
  "space",
  "nature",
  "health",
  "history",
  "culture",
  "sports",
  "products",
  "world",
  "crime",
  "mystery",
]);

export function middleware(req) {
  const url = req.nextUrl;
  const category = (url.searchParams.get("category") || "").toLowerCase();

  // Bare hvis vi faktisk har en gyldig kategori i query
  if (!category || category === "all" || !CATEGORIES.has(category)) {
    return NextResponse.next();
  }

  // Redirect kun når query kun er category (ingen q/sort/etc)
  const allowedKeys = new Set(["category"]);
  for (const key of url.searchParams.keys()) {
    if (!allowedKeys.has(key)) return NextResponse.next();
  }

  url.searchParams.delete("category");
  url.pathname = `/${category}`;

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
