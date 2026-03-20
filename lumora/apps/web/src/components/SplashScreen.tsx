"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";

const DEFAULT_SHOW_MS = 1600;
const REDUCED_MOTION_SHOW_MS = 900;
const EXIT_MS = 500;
const REDUCED_MOTION_EXIT_MS = 180;

export default function SplashScreen({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"visible" | "exiting" | "hidden">("visible");
  const gradientId = useId().replace(/:/g, "");
  const maskId = useId().replace(/:/g, "");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showMs = reduceMotion ? REDUCED_MOTION_SHOW_MS : DEFAULT_SHOW_MS;
    const exitMs = reduceMotion ? REDUCED_MOTION_EXIT_MS : EXIT_MS;

    const exitTimer = window.setTimeout(() => {
      setPhase("exiting");
    }, showMs);

    const hideTimer = window.setTimeout(() => {
      setPhase("hidden");
    }, showMs + exitMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {children}
      {phase === "hidden" ? null : (
        <div
          aria-live="polite"
          aria-label="Loading Lumora"
          className={`fixed inset-0 z-[100] overflow-hidden transition-opacity ${
            phase === "exiting" ? "opacity-0 duration-500" : "opacity-100 duration-300"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-calm-50 via-white to-serene-50" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] h-[36rem] w-[36rem] rounded-full bg-serene-400/80 mix-blend-multiply blur-[80px] animate-blob" />
            <div className="absolute bottom-[-12%] left-[-8%] h-[40rem] w-[40rem] rounded-full bg-accent/60 mix-blend-multiply blur-[90px] animate-blob-delayed" />
            <div className="absolute top-[28%] right-[18%] h-[28rem] w-[28rem] rounded-full bg-calm-500/70 mix-blend-multiply blur-[70px] animate-blob-slow" />
          </div>

          <div className="relative flex min-h-screen items-center justify-center px-6">
            <div
              className={`flex items-center justify-center transition-all duration-700 ${
                phase === "exiting" ? "scale-[1.02] blur-[2px]" : "scale-100 blur-0"
              }`}
            >
              <div className="splash-lockup flex max-w-3xl flex-col items-center justify-center text-center">
                <div className="flex items-center justify-center gap-4 sm:gap-5">
                  <div className="splash-logo-track shrink-0" aria-hidden="true">
                    <svg className="splash-logo-svg" viewBox="0 0 100 100" role="presentation">
                      <defs>
                        <linearGradient id={gradientId} x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" stopColor="#fde047" />
                          <stop offset="52%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                          <rect width="100" height="100" fill="black" />
                          <circle cx="50" cy="50" r="50" fill="white" />
                          <circle className="splash-logo-mask-circle" cx="73" cy="40" r="34" fill="black">
                            <animate
                              attributeName="cx"
                              dur="920ms"
                              begin="160ms"
                              fill="freeze"
                              values="73;73;118"
                              keyTimes="0;0.4;1"
                              calcMode="spline"
                              keySplines="0 0 1 1;0.2 0.86 0.24 1"
                            />
                            <animate
                              attributeName="cy"
                              dur="920ms"
                              begin="160ms"
                              fill="freeze"
                              values="40;40;50"
                              keyTimes="0;0.4;1"
                              calcMode="spline"
                              keySplines="0 0 1 1;0.2 0.86 0.24 1"
                            />
                            <animate
                              attributeName="r"
                              dur="920ms"
                              begin="160ms"
                              fill="freeze"
                              values="34;34;16"
                              keyTimes="0;0.4;1"
                              calcMode="spline"
                              keySplines="0 0 1 1;0.2 0.86 0.24 1"
                            />
                          </circle>
                        </mask>
                      </defs>

                      <circle cx="50" cy="50" r="50" fill={`url(#${gradientId})`} mask={`url(#${maskId})`} />
                    </svg>
                  </div>

                  <div className="overflow-hidden pb-2">
                    <div className="splash-wordmark-track">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-[clamp(2.25rem,4.8vw,4rem)] font-bold leading-none tracking-[-0.03em] text-transparent">
                        Lumora
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span className="sr-only">Lumora is loading.</span>
        </div>
      )}
    </>
  );
}
