"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { createCheckoutSessionUrl, getBillingErrorMessage } from "@/lib/billingClient"

declare global {
  interface Window {
    AOS?: {
      init: (options?: { duration?: number; once?: boolean }) => void
    }
    feather?: {
      replace: () => void
    }
  }
}

const FORM_ENDPOINT = "https://formspree.io/f/mzzanbqy"

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.body.appendChild(script)
  })

const loadStylesheet = (href: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve()
      return
    }

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
    document.head.appendChild(link)
  })

function attachEarlyFormListener() {
  const form = document.getElementById("early-form") as HTMLFormElement | null
  if (!form) return () => {}

  const statusEl = document.getElementById("form-status")
  const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement | null

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()

    if (!submitBtn || !statusEl) return

    statusEl.textContent = ""
    submitBtn.disabled = true
    submitBtn.style.opacity = "0.8"

    const fd = new FormData(form)
    if (fd.get("_gotcha")) {
      submitBtn.disabled = false
      submitBtn.style.opacity = ""
      return
    }

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      })

      if (response.ok) {
        form.reset()
        statusEl.textContent = "Thanks! Check your inbox soon."
      } else {
        statusEl.textContent = "Something went wrong. Please try again."
      }
    } catch (error) {
      console.error("Failed to submit early access form", error)
      statusEl.textContent = "Network error—please try again."
    } finally {
      submitBtn.disabled = false
      submitBtn.style.opacity = ""
    }
  }

  form.addEventListener("submit", handleSubmit)

  return () => {
    form.removeEventListener("submit", handleSubmit)
  }
}

interface LandingPageProps {
  onEnterApp: () => void
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const heroContainerRef = useRef<HTMLDivElement | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  const handleUpgradeToPro = useCallback(async () => {
    if (upgradeLoading) {
      return
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/billing/upgrade")}`)
      return
    }

    setUpgradeLoading(true)
    setUpgradeError(null)
    try {
      const token = await user.getIdToken()
      const checkoutUrl = await createCheckoutSessionUrl({
        idToken: token,
        returnPath: "/#pricing",
      })
      window.location.assign(checkoutUrl)
    } catch (error) {
      console.error("Failed to start checkout from landing", error)
      const errorCode = error instanceof Error ? error.message : "billing_session_failed"
      setUpgradeError(getBillingErrorMessage(errorCode))
      setUpgradeLoading(false)
    }
  }, [router, upgradeLoading, user])

  useEffect(() => {
    let isMounted = true
    let detachFormListener: (() => void) | undefined

    const initialise = async () => {
      try {
        await loadStylesheet("https://unpkg.com/aos@2.3.1/dist/aos.css")
        await loadScript("https://unpkg.com/aos@2.3.1/dist/aos.js")
        await loadScript("https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js")

        if (!isMounted) {
          return
        }

        if (window.AOS) {
          window.AOS.init({ duration: 700, once: true })
        }

        window.feather?.replace()
        detachFormListener = attachEarlyFormListener()
      } catch (error) {
        console.error("Failed to initialise landing page enhancements", error)
      }
    }

    initialise()

    return () => {
      isMounted = false
      detachFormListener?.()
    }
  }, [])

  useEffect(() => {
    const container = heroContainerRef.current
    if (!container) {
      return
    }

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches
    if (coarsePointer) {
      return
    }

    let rafId = 0
    const restX = 0.14
    const restY = 0.2
    const restHue = 228
    const restSat = 86
    const restAlpha = 0.22
    let targetX = restX
    let targetY = restY
    let smoothX = restX
    let smoothY = restY
    let targetHue = restHue
    let smoothHue = restHue
    let targetSat = restSat
    let smoothSat = restSat
    let targetAlpha = restAlpha
    let smoothAlpha = restAlpha

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
    const getColorFromPosition = (x: number, y: number) => {
      const dx = x - 0.5
      const dy = y - 0.45
      const angle = Math.atan2(dy, dx)
      const hue = ((angle * 180) / Math.PI + 360) % 360
      const distance = Math.min(1, Math.hypot(dx, dy) / 0.65)
      const saturation = 74 + distance * 24
      const alpha = 0.28 + distance * 0.18
      return { hue, saturation, alpha }
    }

    const updateVars = () => {
      container.style.setProperty("--mx", `${smoothX * 100}%`)
      container.style.setProperty("--my", `${smoothY * 100}%`)
      container.style.setProperty("--cursor-hue", smoothHue.toFixed(1))
      container.style.setProperty("--cursor-sat", smoothSat.toFixed(1))
      container.style.setProperty("--cursor-alpha", smoothAlpha.toFixed(3))
    }

    const animate = () => {
      smoothX += (targetX - smoothX) * 0.1
      smoothY += (targetY - smoothY) * 0.1
      const hueDelta = ((targetHue - smoothHue + 540) % 360) - 180
      smoothHue = (smoothHue + hueDelta * 0.12 + 360) % 360
      smoothSat += (targetSat - smoothSat) * 0.1
      smoothAlpha += (targetAlpha - smoothAlpha) * 0.1
      updateVars()
      rafId = window.requestAnimationFrame(animate)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      targetX = clamp01((event.clientX - rect.left) / rect.width)
      targetY = clamp01((event.clientY - rect.top) / rect.height)
      const { hue, saturation, alpha } = getColorFromPosition(targetX, targetY)
      targetHue = hue
      targetSat = saturation
      targetAlpha = alpha
    }

    const handlePointerLeave = () => {
      targetX = restX
      targetY = restY
      targetHue = restHue
      targetSat = restSat
      targetAlpha = restAlpha
    }

    updateVars()
    rafId = window.requestAnimationFrame(animate)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerleave", handlePointerLeave)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [])

  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-calm-50 via-white to-serene-50">
      <div ref={heroContainerRef} className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="landing-reactive-colors absolute inset-0" />
          <div className="landing-aurora absolute inset-0" />
          <div className="landing-grid absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white/80 via-white/20 to-transparent" />
        </div>

        <nav className="relative z-10 px-6 py-7 flex items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lumora
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 md:pt-28 md:pb-40 text-center">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 px-6 py-10 md:px-10 md:py-12">
            <h1
              className="text-5xl font-bold leading-tight text-foreground md:text-7xl text-balance"
              data-aos="fade-up"
              data-aos-delay="60"
            >
              Light for the mind
            </h1>
            <p
              className="max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed text-pretty"
              data-aos="fade-up"
              data-aos-delay="110"
            >
              A calm space designed to support your mental wellbeing anytime, anywhere.
            </p>
            <div
              className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5 mt-2"
              data-aos="fade-up"
              data-aos-delay="160"
            >
              <button
                type="button"
                onClick={onEnterApp}
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-serene-400 to-accent px-9 py-4 text-[15px] font-semibold text-white shadow-lg shadow-serene-400/30 transition-all hover:shadow-xl hover:shadow-serene-400/40 hover:scale-[1.02] active:scale-95"
              >
                Start Exploring
              </button>
            </div>
            <div
              className="flex flex-col items-center gap-5 pt-6 text-sm text-muted-foreground md:flex-row md:gap-8"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                From stress to support.
              </div>
              <div className="flex items-center gap-2.5">
                <i data-feather="shield" className="h-4 w-4 opacity-70" />
                Private by default, always.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-serene-50/40 via-accent/5 to-calm-50/40">
        <section id="features" className="relative z-10 -mt-16 bg-transparent py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center mb-16" data-aos="fade-up">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl text-balance">Features that care for you
</h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed text-pretty">
                An AI companion offers personalized support for your mental wellbeing
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-calm-200/60 p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] hover:border-serene-400/30"
                data-aos="fade-up"
              >
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-serene-400/15 to-accent/15 shadow-sm">
                  <i data-feather="message-circle" className="h-6 w-6 text-serene-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Always Available</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                            Get support whenever you need it, day or night, without waiting for appointments.
                </p>
              </div>

              <div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-calm-200/60 p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] hover:border-serene-400/30"
                data-aos="fade-up"
                data-aos-delay="80"
              >
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-serene-400/20 to-calm-500/20 shadow-sm">
                  <i data-feather="heart" className="h-6 w-6 text-serene-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Personalized Support</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                            Our AI learns about you and adapts to provide the most relevant support for your needs.
                </p>
              </div>

              <div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-calm-200/60 p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] hover:border-serene-400/30"
                data-aos="fade-up"
                data-aos-delay="160">
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success/20 to-success/10 shadow-sm">
                  <i data-feather="shield" className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Judgment-Free Zone</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                            Express yourself freely in a safe, confidential space without fear of judgment.
                </p>
              </div>

               <div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-calm-200/60 p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] hover:border-serene-400/30"
                data-aos="fade-up"
                data-aos-delay="160">
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-serene-400/15 to-accent/15 shadow-sm">
                  <i data-feather="activity" className="h-6 w-6 text-serene" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Mood Tracking</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                    Track your emotional patterns and receive insights to better understand your wellbeing.
                </p>
              </div>

              <div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-calm-200/60 p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] hover:border-serene-400/30"
                data-aos="fade-up"
                data-aos-delay="160">
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-serene-400/20 to-success/10 shadow-sm">
                  <i data-feather="book" className="h-6 w-6 text-serene" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Journaling</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  Reflect on your feelings with daily journaling prompts that help you process emotions and track growth.                </p>
              </div>

               {/* <div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-calm-200/60 p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] hover:border-serene-400/30"
                data-aos="fade-up"
                data-aos-delay="160">
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success/20 to-success/10 shadow-sm">
                  <i data-feather="command" className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Human Connection</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  Book appointments or reach out directly to licensed therapists from within the app.
                </p>
              </div> */}
            </div>
          </div>
        </section>

        <section id="pricing" className="relative z-10 bg-transparent py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center mb-12" data-aos="fade-up">
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl text-balance">
                Start free, upgrade when you are ready
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Everything you need to journal, track moods, and chat. Pro removes limits.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <article
                  className="rounded-[1.4rem] border border-calm-200/80 bg-white/90 p-7 shadow-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:border-serene-400/30"
                  data-aos="fade-up"
                  data-aos-delay="40"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Free</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Default
                    </span>
                  </div>
                  <p className="mt-4 text-4xl font-bold text-foreground">$0</p>
                  <p className="mt-1 text-sm text-slate-500">Perfect to get started</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      AI chat with monthly free usage
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Mood tracking and journaling tools
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Personal dashboard and history
                    </li>
                  </ul>
                </article>

                <article
                  className="relative overflow-hidden rounded-[1.4rem] border border-indigo-300/70 bg-gradient-to-br from-indigo-50/90 via-white to-rose-50/80 p-7 shadow-[0_24px_60px_-36px_rgba(99,102,241,0.55)] transition-all hover:scale-[1.02] hover:shadow-[0_28px_72px_-34px_rgba(99,102,241,0.65)] hover:border-indigo-400/80"
                  data-aos="fade-up"
                  data-aos-delay="100"
                >
                  <div className="absolute right-4 top-4 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                    Most popular
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Pro</p>
                  <p className="mt-4 text-4xl font-bold text-foreground">$9</p>
                  <p className="mt-1 text-sm text-slate-600">per month</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      Unlimited AI chat
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      No cooldown restrictions
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      All free features included
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => void handleUpgradeToPro()}
                    disabled={upgradeLoading}
                    className="mt-7 rounded-full bg-gradient-to-r from-serene-400 to-accent px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {upgradeLoading ? "Opening..." : "Upgrade to Pro"}
                  </button>
                  {upgradeError ? <p className="mt-3 text-sm text-rose-600">{upgradeError}</p> : null}
                </article>
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-calm-200/60 bg-white/80 backdrop-blur-sm py-16">
          <div className="max-w-7xl mx-auto flex flex-col gap-10 px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
            <div className="flex flex-col items-center leading-tight">
              <h1 className="text-l font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Lumora
              </h1>
            </div>
          </div>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <a
                target="_blank"
                rel="noreferrer"
                href="https://linkedin.com/company/lumorawellness/"
                className="flex items-center gap-2.5 text-muted-foreground transition-all hover:text-serene-600 hover:scale-105"
                aria-label="LinkedIn"
              >
                <i data-feather="linkedin" className="h-4 w-4" />
                LinkedIn
              </a>
              <a
                href="mailto:lumoraahelp@gmail.com"
                className="flex items-center gap-2.5 text-muted-foreground transition-all hover:text-serene-600 hover:scale-105"
              >
                <i data-feather="mail" className="h-4 w-4" />
                Say hello
              </a>
            </div>
          </div>
          <p className="mt-10 text-center text-xs text-muted-foreground">© 2025 Lumora. All rights reserved. </p>
        </footer>
      </div>
      <style jsx global>{`
        .landing-reactive-colors {
          opacity: 0.8;
          background: radial-gradient(
            29rem 29rem at var(--mx, 50%) var(--my, 42%),
            hsla(var(--cursor-hue, 240), calc(var(--cursor-sat, 88) * 1%), 68%, var(--cursor-alpha, 0.34)) 0%,
            hsla(var(--cursor-hue, 240), calc(var(--cursor-sat, 88) * 1%), 71%, calc(var(--cursor-alpha, 0.34) * 0.62)) 30%,
            hsla(var(--cursor-hue, 240), calc(var(--cursor-sat, 88) * 0.9%), 73%, calc(var(--cursor-alpha, 0.34) * 0.26)) 54%,
            transparent 72%
          );
          filter: blur(24px) saturate(1.2);
          animation: reactiveBreath 8s ease-in-out infinite alternate;
          will-change: background;
        }

        .landing-aurora {
          opacity: 0.42;
          background:
            radial-gradient(38% 42% at 15% 20%, rgba(160, 183, 255, 0.46), transparent 72%),
            radial-gradient(34% 42% at 85% 24%, rgba(255, 186, 214, 0.38), transparent 74%),
            radial-gradient(44% 46% at 50% 80%, rgba(176, 165, 255, 0.34), transparent 75%);
          filter: blur(2px);
        }

        .landing-grid {
          opacity: 0.24;
          background-image:
            linear-gradient(to right, rgba(124, 139, 255, 0.09) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(124, 139, 255, 0.09) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at 50% 36%, rgba(0, 0, 0, 0.95), transparent 82%);
        }

        @keyframes reactiveBreath {
          0% {
            opacity: 0.72;
          }
          100% {
            opacity: 0.86;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-reactive-colors {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default LandingPage
