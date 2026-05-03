"use client";

import Script from "next/script";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

export function LiveChat({ crispWebsiteId }: { crispWebsiteId?: string }) {
  const [open, setOpen] = useState(false);

  if (crispWebsiteId) {
    return (
      <Script
        id="crisp-chat"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.$crisp=[];window.CRISP_WEBSITE_ID="${crispWebsiteId}";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`,
        }}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open live chat"
        className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/40 hover:scale-105 transition-transform"
      >
        <MessageCircle className="size-6" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-[color:var(--border)] bg-[#0d1018] p-5 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Live support</div>
            <button onClick={() => setOpen(false)} className="text-xs text-[color:var(--muted)]">
              Close
            </button>
          </div>
          <div className="text-xs text-[color:var(--muted)]">
            Average response time: <span className="text-emerald-300">20 seconds</span>
          </div>
          <p className="mt-3 text-sm">
            Need help with an order, payment, or pro? Email us at{" "}
            <a href="mailto:support@proboost.gg" className="text-[color:var(--primary)] underline">
              support@proboost.gg
            </a>
            {" "}or open a ticket from your dashboard.
          </p>
          <a
            href="/dashboard"
            className="btn-primary mt-3 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold"
          >
            Go to dashboard
          </a>
        </div>
      )}
    </>
  );
}
