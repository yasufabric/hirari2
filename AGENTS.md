# Agent workflow

This repo is a phone-first game. Playtest friction is the product.

## Ship when it is ready

- After a focused UX or game fix, run `npm test` and a phone-width check (about 390x844).
- If CI is green and the change does not regress taps, character visibility, or scoring, merge to `main` without waiting for a ping.
- Prefer one concern per PR. Squash-merge.

## Keep improving

- After each pass, name the next playtest issue (focus, readability, tap comfort, scoring feel) and start it.
- Do not wait for approval on obvious follow-ups. Propose them in the Slack/PR summary and implement the highest-value one next.
- Keep mid-playfield chrome quiet. Score ticks and hints must not steal the dodge path or stretch HUD frames.
