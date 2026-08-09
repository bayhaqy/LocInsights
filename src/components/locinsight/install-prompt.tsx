'use client'

/**
 * InstallPrompt — PWA "Install App" button for the header.
 *
 * Listens for the `beforeinstallprompt` event (Chrome/Edge/Android)
 * and shows an "Install" button. When clicked, triggers the native
 * install prompt. On iOS Safari (which doesn't fire beforeinstallprompt),
 * the button is hidden — iOS users install via Share → Add to Home Screen
 * (documented in the About page).
 *
 * Also detects if already running as installed PWA (display-mode: standalone)
 * and hides the button in that case.
 */

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-provider'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const { t } = useLanguage()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Detect if already running as installed PWA
    const checkStandalone = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setInstalled(true)
      }
      // iOS Safari
      if ((window.navigator as any).standalone === true) {
        setInstalled(true)
      }
    }
    checkStandalone()

    const onBeforeInstall = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Don't render if already installed or no install prompt available
  if (installed || !deferredPrompt) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--brand-red)] text-white text-[12px] font-medium hover:bg-[var(--brand-red-dark)] transition-colors"
      title={t('header.install_app')}
      aria-label={t('header.install_app')}
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{t('common.install_app')}</span>
    </button>
  )
}
