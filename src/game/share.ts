export const ITCH_URL = 'https://yasufabric.itch.io/muscle-hirari'
export const SHARE_HASHTAG = 'マッスルひらり'

/** Post body: "マッスルひらりで123点！ <itch url> #マッスルひらり" */
export function shareText(score: number): string {
  const points = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0
  return `マッスルひらりで${points}点！ ${ITCH_URL} #${SHARE_HASHTAG}`
}

/** X web intent that opens the composer prefilled with the run score. */
export function xShareUrl(score: number): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(shareText(score))}`
}

/**
 * Payload for the native share sheet. The whole post (link and hashtag included) goes in
 * `text` only, so the X composer reads exactly like the intent; a separate `url` field would
 * be appended by the receiving app after the hashtag.
 */
export function nativeShareData(score: number): { text: string } {
  return { text: shareText(score) }
}

/** How the share button behaves: OS share sheet, or the plain X web-intent link. */
export type ShareMode = 'native' | 'intent'

export type ShareEnv = {
  /** `navigator.share` exists. */
  hasShare: boolean
  /** `navigator.canShare(data)` is true (or canShare is absent). */
  canShare: boolean
  /** Phone/tablet: the share sheet lists installed apps (X) there. */
  mobile: boolean
  /** Running inside an iframe (e.g. the itch.io embed). */
  framed: boolean
  /** Permissions Policy answer for "web-share", or null when the browser cannot tell us. */
  framePolicy: boolean | null
}

/** Prefer the native share sheet on mobile (hands off to the logged-in X app); else the intent link. */
export function shareMode(env: ShareEnv): ShareMode {
  if (!env.hasShare || !env.canShare || !env.mobile) return 'intent'
  if (env.framed && env.framePolicy === false) return 'intent'
  return 'native'
}

/** What to do when `navigator.share` rejects: a user cancel is final, anything else falls back to X. */
export function shareFailure(errorName: string | undefined): 'cancelled' | 'fallback' {
  return errorName === 'AbortError' ? 'cancelled' : 'fallback'
}

/** Phone/tablet check from UA hints. iPadOS reports a Mac UA, so touch points break the tie. */
export function isMobileDevice(ua: string, maxTouchPoints: number, uaDataMobile?: boolean): boolean {
  if (uaDataMobile === true) return true
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true
  return /Macintosh/.test(ua) && maxTouchPoints > 1
}

export function shareLabel(mode: ShareMode): string {
  return mode === 'native' ? 'スコアをシェア' : 'スコアをXでシェア'
}
