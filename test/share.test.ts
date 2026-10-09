import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ITCH_URL, shareText, xShareUrl } from '../src/game/share'

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
