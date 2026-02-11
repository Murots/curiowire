// components/Analytics/AnalyticsCore.jsx
"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function AnalyticsCore({ GA_ID }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const url = useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!GA_ID) return;
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;

    // ✅ single, stable pageview per url change
    window.gtag("config", GA_ID, { page_path: url });
  }, [GA_ID, url]);

  return null;
}
