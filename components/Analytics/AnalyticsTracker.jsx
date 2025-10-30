"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function AnalyticsTracker({ GA_ID }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const url = `${pathname}${searchParams ? `?${searchParams}` : ""}`;
    window.gtag("config", GA_ID, { page_path: url });
  }, [pathname, searchParams, GA_ID]);

  return null;
}
