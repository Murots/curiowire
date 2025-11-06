"use client";

import React, { Suspense } from "react";
import AnalyticsCore from "./AnalyticsCore";

export default function AnalyticsTracker({ GA_ID }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsCore GA_ID={GA_ID} />
    </Suspense>
  );
}
