"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-muted/70 border-b border-border/60 shrink-0">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="bg-background/50 border border-border/50 rounded-md px-3 py-0.5 text-xs text-muted-foreground w-48 text-center truncate">
          {url}
        </div>
      </div>
    </div>
  );
}

export function Screenshot({
  src,
  alt,
  browser = false,
  url,
  className = "",
}: {
  src: string;
  alt: string;
  browser?: boolean;
  url?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group block w-full text-left rounded-xl border border-border/60 bg-muted/40 overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        aria-label={`View larger: ${alt}`}
      >
        {browser && <BrowserChrome url={url ?? "dashboard.sitehaus.dev"} />}
        <Image
          src={src}
          alt={alt}
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto transition-opacity duration-200 group-hover:opacity-90"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 rounded-full bg-background/80 p-2 text-foreground hover:bg-background transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="rounded-xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {browser && <BrowserChrome url={url ?? "dashboard.sitehaus.dev"} />}
            <Image
              src={src}
              alt={alt}
              width={0}
              height={0}
              sizes="90vw"
              className="w-[90vw] h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
