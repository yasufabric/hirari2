import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ITCH_URL,
  isMobileDevice,
  nativeShareData,
  shareFailure,
  shareLabel,
  shareMode,
  shareText,
  xShareUrl,
} from '../src/game/share'

test('share text reads score, itch link, hashtag', () => {
  assert.equal(
    shareText(123),
    'マッスルひらりで123点！ https://yasufabric.itch.io/muscle-hirari #マッスルひらり',
  )
})

test('share text floors and clamps odd scores', () => {
  assert.equal(shareText(123.9), shareText(123))
  assert.equal(shareText(-5), shareText(0))
  assert.equal(shareText(Number.NaN), shareText(0))
})

test('x intent url encodes the whole post into text', () => {
  const url = xShareUrl(123)
  assert.ok(url.startsWith('https://x.com/intent/post?text='))
  assert.ok(!url.includes('github.io'))
  assert.ok(url.includes('%23')) // hashtag is encoded, not a URL fragment
  assert.ok(!url.includes(' '))
  const parsed = new URL(url)
  assert.equal(parsed.hash, '')
  assert.equal(
    parsed.searchParams.get('text'),
    'マッスルひらりで123点！ https://yasufabric.itch.io/muscle-hirari #マッスルひらり',
  )
  assert.ok(parsed.searchParams.get('text')?.includes(ITCH_URL))
})

const mobileTop = { hasShare: true, canShare: true, mobile: true, framed: false, framePolicy: null }

test('native share payload carries the exact post text and no separate url', () => {
  const data = nativeShareData(42)
  assert.deepEqual(data, {
    text: 'マッスルひらりで42点！ https://yasufabric.itch.io/muscle-hirari #マッスルひらり',
  })
  assert.equal('url' in data, false)
})

test('share mode prefers the native sheet on mobile', () => {
  assert.equal(shareMode(mobileTop), 'native')
  assert.equal(shareMode({ ...mobileTop, framed: true, framePolicy: true }), 'native')
  // Safari exposes no policy API: try native, the reject handler falls back
  assert.equal(shareMode({ ...mobileTop, framed: true, framePolicy: null }), 'native')
})

test('share mode falls back to the X intent link', () => {
  assert.equal(shareMode({ ...mobileTop, hasShare: false }), 'intent')
  assert.equal(shareMode({ ...mobileTop, canShare: false }), 'intent')
  assert.equal(shareMode({ ...mobileTop, mobile: false }), 'intent')
  assert.equal(shareMode({ ...mobileTop, framed: true, framePolicy: false }), 'intent')
})

test('share failure: cancel stays cancelled, other errors fall back', () => {
  assert.equal(shareFailure('AbortError'), 'cancelled')
  assert.equal(shareFailure('NotAllowedError'), 'fallback')
  assert.equal(shareFailure('TypeError'), 'fallback')
  assert.equal(shareFailure(undefined), 'fallback')
})

test('mobile detection covers iPhone, Android and iPadOS', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
  const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36'
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
  const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'
  assert.equal(isMobileDevice(iphone, 5), true)
  assert.equal(isMobileDevice(android, 5), true)
  assert.equal(isMobileDevice(mac, 5), true) // iPadOS desktop-class UA
  assert.equal(isMobileDevice(mac, 0), false)
  assert.equal(isMobileDevice(win, 0), false)
  assert.equal(isMobileDevice(win, 0, true), true)
})

test('button label names X only for the intent link', () => {
  assert.equal(shareLabel('native'), 'スコアをシェア')
  assert.equal(shareLabel('intent'), 'スコアをXでシェア')
})
