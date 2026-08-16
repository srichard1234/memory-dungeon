"use client";

import { useState } from "react";
import { useVersionCheck } from "@/lib/useVersionCheck";

export default function UpdateBanner() {
  const updateAvailable = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-[#2c2640] px-4 py-2 text-sm text-[#f5f2ff] shadow-lg"
    >
      <span>A new version of Memory Dungeon is available.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-[#ffd166] px-3 py-1 font-semibold text-[#1d1830] hover:bg-[#ffdd85] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
      >
        Reload now
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-md px-2 py-1 text-xs text-[#c9c0dd] underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
      >
        Not now
      </button>
    </div>
  );
}
