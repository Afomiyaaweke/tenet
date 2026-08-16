"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export function MicrosoftClarity() {
  useEffect(() => {
    // Use the provided Clarity project ID, fall back to env var if set
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || "y3c26jfrzu";
    if (clarityId) {
      Clarity.init(clarityId);
    }
  }, []);

  return null;
}
