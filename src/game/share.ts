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
