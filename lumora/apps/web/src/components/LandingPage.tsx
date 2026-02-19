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
    THREE?: unknown
    VANTA?: {
      WAVES: (options: Record<string, unknown>) => { destroy?: () => void }
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
  const vantaContainerRef = useRef<HTMLDivElement | null>(null)
  const vantaInstanceRef = useRef<{ destroy?: () => void } | null>(null)
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
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let detachFormListener: (() => void) | undefined

    const initialise = async () => {
      try {
        await loadStylesheet("https://unpkg.com/aos@2.3.1/dist/aos.css")
        await loadScript("https://unpkg.com/aos@2.3.1/dist/aos.js")
        await loadScript("https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js")

        if (!prefersReduced && !window.THREE) {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js")
        }

        if (!prefersReduced) {
          await loadScript("https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.waves.min.js")
        }

        if (!isMounted) {
          return
        }

        if (!prefersReduced && window.VANTA && window.THREE && vantaContainerRef.current && !vantaInstanceRef.current) {
          vantaInstanceRef.current = window.VANTA.WAVES({
            el: vantaContainerRef.current,
            color: 0xb8a9f5, // Soft lavender (lighter, less saturated purple)
            backgroundColor: 0xfdfbff, // Very light off-white with subtle warmth
            waveHeight: 15, // Slightly taller waves for more fluid motion
            shininess: 25, // Reduced shine for softer appearance
            waveSpeed: 0.5, // Slightly faster for more noticeable movement
            zoom: 0.9, // Slightly more zoomed for smoother waves
          })
        }

        if (!prefersReduced && window.AOS) {
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

      if (vantaInstanceRef.current) {
        vantaInstanceRef.current.destroy?.()
        vantaInstanceRef.current = null
      }

      detachFormListener?.()
    }
  }, [])

  return (
    <div className="min-h-screen font-sans antialiased bg-gradient-to-br from-calm-50 via-white to-serene-50">
      <div ref={vantaContainerRef} className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          {/* <div className="absolute inset-x-1/2 top-[-10%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-serene-400/30 via-accent/30 to-primary/20 opacity-60" /> */}
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-serene-400/20 via-white/10 to-transparent blur-3xl" />
          <div className="absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-accent/30 blur-[160px]" />
        </div>

        <nav className="relative z-10 px-6 py-7 flex items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lumora
                </h1>
                <span className="text-sm text-gray-500">(Beta)</span>
              </div>
              <p className="text-sm font-bold text-gray-500 hidden sm:block">Light for the mind</p>
            </div>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 md:pt-28 md:pb-40 text-center">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7">
            <h1
              className="text-5xl font-bold leading-tight text-foreground md:text-7xl text-balance"
              data-aos="fade-up"
              data-aos-delay="60"
            >
              Light for the mind.
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

      <div className="bg-gradient-to-b from-serene-50/30 via-accent/5 to-calm-50/40">
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

        <section id="pricing" className="relative z-10 bg-transparent py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center mb-10" data-aos="fade-up">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl text-balance">Pricing</h2>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                Start free. Upgrade when you need unlimited AI chat.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div
                className="rounded-3xl border border-calm-200/70 bg-white/80 p-8 shadow-sm"
                data-aos="fade-up"
                data-aos-delay="40"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Free</p>
                <p className="mt-3 text-3xl font-bold text-foreground">$0</p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <li>30 AI messages per calendar month</li>
                  <li>Cooldown after daily usage thresholds</li>
                  <li>Mood tracking, journal, and dashboard</li>
                </ul>
              </div>

              <div
                className="rounded-3xl border border-serene-300/70 bg-gradient-to-br from-serene-50 to-white p-8 shadow-sm"
                data-aos="fade-up"
                data-aos-delay="100"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-serene-700">Pro</p>
                <p className="mt-3 text-3xl font-bold text-foreground">Unlimited</p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <li>Unlimited AI chat messages</li>
                  <li>No cooldown restrictions</li>
                  <li>Weekly AI Reports</li>
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
              </div>
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
              <div>
                <p className="text-sm text-muted-foreground">Light for the mind.</p>
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
    </div>
  )
}

export default LandingPage
