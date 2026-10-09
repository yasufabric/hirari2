import dizzyUrl from '../assets/shiba/shiba-dizzy.png'
import idleUrl from '../assets/shiba/shiba-idle.png'
import leftUrl from '../assets/shiba/shiba-left.png'
import rightUrl from '../assets/shiba/shiba-right.png'
import type { PlayerPose, PlayerSprites } from './Player'

const URLS: Record<PlayerPose, string> = {
  idle: idleUrl,
  left: leftUrl,
  right: rightUrl,
  dizzy: dizzyUrl,
}

// Starts loading the muscular Shiba poses. Until an image is ready the
// player falls back to the vector lifter, so nothing waits on the network.
export function loadShibaSprites(): PlayerSprites {
  const sprites = {} as PlayerSprites
  for (const pose of Object.keys(URLS) as PlayerPose[]) {
    const img = new Image()
    img.decoding = 'async'
    img.src = URLS[pose]
    sprites[pose] = img
  }
  return sprites
}
