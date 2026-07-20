"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const CLARITY_ID = "xpjlnkckwv";

export function MicrosoftClarity() {
  useEffect(() => {
    Clarity.init(CLARITY_ID);
  }, []);

  return null;
}
