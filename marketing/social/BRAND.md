# Kart Connect social posts: rules

Source: Kart Connect Brand Guidelines v1.0 (September 2026), plus the owner's feedback on the first posts.
Follow these on every post. Where the owner's rules and the guidelines differ, the owner's rules win.

## Owner's rules (from review of the first posts)

- **Every slide is white.** No purple or grey slide backgrounds. Colour is used only for small accents.
- **No track or circuit names**, anywhere: slides, captions, screenshots. Cover any that appear in a screenshot.
- **Keep setup talk general.** Name the parts (axle, bumpers, brakes, engine, tyre pressures) but no specific values, settings or tuning advice.
- **Don't talk about comparing sessions yet.**
- **No Privacy post and no AI Setup Advisor post** until the owner supplies a real Advisor screenshot.
- **Weather**: say "live weather data" or "filled in automatically". Do not say "Met Office".
- **Real app screenshots beat mock-ups.** Use files in `assets/shots/` where they fit; never invent UI that looks like a screenshot.
- 3 to 4 slides per post unless the series plan says otherwise. Short topics get 3.
- Every post gets two caption options (A and B).

## Design (already built into slides.css and build.py)

- 1080×1350 portrait. White background, 6px gradient bar top and bottom (yellow left, purple right), never text on it.
- Inter only. Headings 800 weight, tight letter-spacing. Labels uppercase, 600, purple, letter-spaced.
- Colours: purple `#7B5EA7` for labels, numbers and emphasis; yellow `#F5C842` for dashes, callouts and the Privateer tier; green `#5CC85A` for "Saved" or success chips (ink text on it, never white).
- Logo as supplied (`assets/logo.png`), never recoloured or redrawn. Slide 1 top-left, last slide bottom-right.
- Mostly white and grey. Colour is the punctuation, not the sentence.

Useful classes for slide bodies (see `examples/`): `h1`, `h2`, `p`, `.label`, `.spacer` (pushes content down),
`.card`, `.row` (label/value row inside a card), `.chip.green`, `.chip.yellow`, `.callout` (yellow-tint note),
`ul.dash` (yellow-dash list), `.step` + `.n` (numbered purple circle) or `.ico` (tinted icon box), `.pill` / `.pill.on`, `.tier`.

## Voice (Guidelines section 6)

- Write like a good mechanic talks: specific, calm, certain. Short sentences. Real terms. No hype.
- **Direct**: lead with the action or the fact.
- **Honest about limits**: "try", "usually", never "will" or "guaranteed". Nothing is a performance guarantee.
- British English: tyre, colour, organise, licence.
- No exclamation marks. No emoji.
- Write **Kart Connect**, two words, capitalised. Tier names are proper nouns: Privateer, Team, Pro Team. Never "Pro".
- If prices appear, show all three tiers (£12.99, £29.99, £49.99 per month; annual billing two months free; Privateer has a 30-day free trial).
- Descriptor: "Kart Connect — setup management for drivers and teams."
- Hashtags: two or three from #karting #kartracing #kartsetup #motorsport #raceweekend.
