"use client"

import { useEffect } from "react"
import Image from "next/image"

declare global {
  interface Window {
    AOS?: {
      init: (options?: { duration?: number; once?: boolean; easing?: string }) => void
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
  if (!form) return () => { }

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
  useEffect(() => {
    let isMounted = true
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let detachFormListener: (() => void) | undefined

    const initialise = async () => {
      try {
        await loadStylesheet("https://unpkg.com/aos@2.3.1/dist/aos.css")
        await loadScript("https://unpkg.com/aos@2.3.1/dist/aos.js")
        await loadScript("https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js")

        if (!isMounted) {
          return
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

      detachFormListener?.()
    }
  }, [])

  return (
    <div className="min-h-screen font-sans antialiased overflow-hidden bg-gradient-to-br from-calm-50 via-white to-serene-50">
      <div className="relative">
        {/* Calming animated CSS gradients replacing Vanta waves */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Using mix-blend-multiply for darker, deeply visible colors */}
          <div className="absolute top-[-16%] left-[-30%] h-[18rem] w-[18rem] rounded-full bg-serene-400/30 mix-blend-multiply blur-[78px] animate-blob md:top-[-10%] md:left-auto md:right-[-10%] md:h-[40rem] md:w-[40rem] md:bg-serene-400/80 md:blur-[80px]" />
          <div className="absolute bottom-[-18%] left-[-24%] h-[22rem] w-[22rem] rounded-full bg-accent/34 mix-blend-multiply blur-[88px] animate-blob-delayed md:bottom-[-10%] md:right-auto md:left-[-5%] md:h-[45rem] md:w-[45rem] md:bg-accent/60 md:blur-[90px]" />
          <div className="absolute top-[28%] right-[-28%] h-[18rem] w-[18rem] rounded-full bg-calm-500/28 mix-blend-multiply blur-[84px] animate-blob-slow md:top-[30%] md:left-auto md:right-[20%] md:h-[30rem] md:w-[30rem] md:bg-calm-500/70 md:blur-[70px]" />
        </div>

        <nav className="relative z-10 flex items-center px-5 py-5 sm:px-6 sm:py-7">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative h-10 w-10 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_32px_8px_rgba(147,112,219,0.24)] sm:h-12 sm:w-12 sm:shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                  Lumora
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-14 pb-24 text-center sm:px-6 sm:pt-20 sm:pb-32 md:pt-28 md:pb-40">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 sm:gap-7">
            <h1
              className="max-w-[10ch] text-4xl font-bold leading-[0.95] text-foreground sm:max-w-[12ch] sm:text-5xl sm:leading-tight md:max-w-none md:text-7xl text-balance"
              data-aos="fade-up"
              data-aos-delay="60"
            >
              Light for the mind.
            </h1>
            <p
              className="max-w-[20rem] text-base leading-8 text-muted-foreground sm:max-w-2xl sm:text-lg md:text-xl md:leading-relaxed text-pretty"
              data-aos="fade-up"
              data-aos-delay="110"
            >
              A calm space designed to support your mental wellbeing anytime, anywhere.
            </p>
            <div
              className="mt-3 flex flex-col items-center gap-4 sm:mt-2 sm:flex-row sm:gap-5"
              data-aos="fade-up"
              data-aos-delay="160"
            >
              <button
                type="button"
                onClick={onEnterApp}
                className="w-auto min-w-[15rem] rounded-full bg-gradient-to-r from-serene-400 to-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-serene-400/30 transition-all hover:shadow-xl hover:shadow-serene-400/40 hover:scale-[1.02] active:scale-95 sm:min-w-0 sm:px-9 sm:py-4 sm:text-[15px]"
              >
                Start Exploring
              </button>
            </div>
            <div
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 pt-5 text-[15px] text-muted-foreground sm:pt-6 sm:text-sm md:gap-8"
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
                  Express yourself freely in a safe and confidential space without fear of judgment.
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

              <div
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
