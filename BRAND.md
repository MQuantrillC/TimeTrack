# TimeTrack — Brand Identity

> **Time tracking that feels calm, precise and human.**

The palette comes from a wildflower photograph: warm, natural, slightly nostalgic.
The product it dresses is serious professional software. The bridge between the two is
**restraint** — colour arrives in small, deliberate quantities against a warm neutral
field, the way it does in an editorial layout rather than a lifestyle brand.

Every token below is implemented in [`src/app/globals.css`](src/app/globals.css) and is
available as a Tailwind utility (`bg-olive`, `text-ink`, `border-line`, …).

---

## 1. Colour

### 1.1 Hierarchy

The single most important rule: **the six palette colours are not equal.**
Neutrals occupy roughly 90% of any screen.

| Role          | Colour  | Hex       | Where it appears                                          |
| ------------- | ------- | --------- | --------------------------------------------------------- |
| **Primary**   | Olive   | `#5E5C2D` | Navigation bar, PAUSE, committed actions, selected markers |
| **Secondary** | Sage    | `#999A57` | Status dots, rules, section labels                         |
| **Action**    | Orange  | `#FC9C51` | START, the running indicator — nothing else                |
| Supporting    | Peach   | `#FEC67C` | Selection highlight, gentle emphasis                       |
| Supporting    | Blush   | `#F9BDB0` | Destructive-confirm surfaces, cautionary states            |
| Supporting    | Mauve   | `#A16A84` | Destructive buttons, rare differentiation                  |

Orange is the product's scarcest resource. If it appears more than twice on a screen it
has stopped meaning "this is happening right now".

### 1.2 Neutrals

Warm throughout — every neutral carries a trace of olive. No cool grey anywhere.

| Token         | Hex       | Use                                     |
| ------------- | --------- | --------------------------------------- |
| `canvas`      | `#FAF7F0` | Page background — warm off-white        |
| `surface`     | `#FFFDF8` | Cards, panels, inputs                   |
| `sunken`      | `#F2EEE2` | Selected rows, inset areas, table heads |
| `line`        | `#E8E2D4` | Hairline borders                        |
| `line-strong` | `#D9D2BF` | Input borders, dividers with weight     |
| `ink`         | `#23261B` | Primary text — very dark olive charcoal |
| `ink-muted`   | `#6F7161` | Secondary text — soft warm grey         |
| `ink-subtle`  | `#83846F` | Placeholders, idle icons                |

### 1.3 Text-safe variants

Two palette colours are too light to carry small type on cream. Each has a darkened
sibling reserved for text; the bright original stays a **fill** colour.

| Fill colour        | Text sibling         | Contrast on canvas         |
| ------------------ | -------------------- | -------------------------- |
| Orange `#FC9C51`   | `ember` `#CE6F21`    | 3.3:1 — large display only |
| Orange `#FC9C51`   | `ember-deep``#A8551A`| 4.8:1 — labels, pills      |
| Sage `#999A57`     | `sage-deep` `#74753F`| 4.5:1 — section labels     |

Tints (`olive-tint` `#ECEAD9`, `orange-tint` `#FDF1E4`, `blush-tint` `#FDF0EC`) carry
pills and quiet backgrounds.

### 1.4 Verified contrast

| Pair                                | Ratio  |
| ----------------------------------- | ------ |
| Ink on canvas                       | 14.4:1 |
| Ink on orange (START button)        | 7.3:1  |
| Canvas on olive (nav, PAUSE)        | 6.5:1  |
| Ink-muted on surface                | 4.9:1  |
| Ember on canvas (running timer, 80px) | 3.3:1 |
| White on mauve (destructive)        | 4.3:1  |

---

## 2. Logo

### 2.1 Concept

A **"T" whose stem drops through a gap in an open ring.**

- The ring is time as a continuous cycle — never closed, always ongoing.
- The gap is the moment currently in progress.
- The stem is both the letterform and a hand resting at twelve.

No stopwatch, no clock face, no dial. Read at 16px it is simply a distinctive T;
read at 96px the timekeeping idea surfaces. Implemented in
[`src/components/Logo.tsx`](src/components/Logo.tsx).

### 2.2 Wordmark

`Time` in semibold, `Track` in regular at 80% opacity, tracked −0.02em. One word, two
weights — the split reads as "time" and "tracking" without a colour change or a divider.

### 2.3 Usage

- **Full lockup** — `<Logo />`. Mark at 22px, 10px gap to the wordmark.
- **Mark only** — `<LogoMark />` for the app icon, favicon, avatars, and widths under 360px.
- **Colour** — the mark draws in `currentColor`, so it inverts automatically. The stem
  renders in action orange in the full-colour lockup; pass `accent={false}` for
  single-colour reproduction (embossing, faxes, one-ink print).
- **On light** — ink or olive mark on canvas.
- **On dark** — canvas mark on olive. This is the primary presentation, used in the nav.
- **Clear space** — the height of the mark on all four sides.
- **Minimum sizes** — 16px mark alone, 100px for the full lockup.

Do not: recolour the ring, close the gap, add a second hand, set the wordmark in a serif,
outline it, or place it on a photograph without a solid backing shape.

---

## 3. Typography

| Role        | Face                      | Treatment                                    |
| ----------- | ------------------------- | -------------------------------------------- |
| UI          | **Geist Sans**            | 400 / 500 / 600. Headings tracked −0.02em.   |
| Numerals    | **Geist Mono**            | Tabular figures for every duration           |
| Marketing   | *Reserved for a serif*    | Instrument Serif or Fraunces, display sizes only |

The interface stays sans-serif. A refined serif may appear on a marketing site or a cover
page; it never enters the product UI, which would tip the brand toward "traditional law
firm" — precisely the register this identity avoids.

**Scale** — 80px light (timer) · 22px semibold (page and project titles) · 15px mono
(stat values) · 14px (body) · 13px (secondary) · 11px semibold, 0.14em tracking, uppercase
(section labels) · 10px (stat labels).

Durations are always mono and always tabular, so digits never shift width as they tick.

---

## 4. Interface language

Warm off-white ground. Olive navigation. Cream cards with a single hairline border and a
1px shadow at 4% — enough to lift, never enough to float. Corners at 8px for controls and
12px for cards: rounded, not bubbled. Generous whitespace; the timer card breathes at
56px of vertical padding.

Avoid: gradients, glassmorphism, neon, heavy shadows, decorative flourishes, and any cool
blue-grey. The identity's warmth comes from the neutrals themselves, not from effects
layered on top.

---

## 5. Buttons

| Action        | Treatment                                    | Rationale                              |
| ------------- | -------------------------------------------- | -------------------------------------- |
| **START**     | Orange `#FC9C51` fill, ink label              | The one full-strength orange moment     |
| **PAUSE**     | Olive `#5E5C2D` fill, canvas label            | Committed, calm, unmistakably brand     |
| **NEW**       | Surface fill, `line-strong` border            | Present but never competing             |
| Ghost         | No fill, `ink-muted` label                    | Cancel, tertiary navigation             |
| Destructive   | Mauve `#A16A84` fill, white label             | Warm caution rather than a siren red    |

Orange carries **ink** rather than white text — white on `#FC9C51` reaches only 2.2:1.
The dark label is also more editorial, and reads as a considered choice rather than a
default CTA.

---

## 6. The timer

The centrepiece: 80px, mono, weight 300, tabular, tightly tracked.

| State   | Digits              | Indicator                                  |
| ------- | ------------------- | ------------------------------------------ |
| Paused  | Ink `#23261B`       | Olive pill, sage dot                       |
| Running | Ember `#CE6F21`     | Orange-tint pill, orange dot breathing at 2.6s |
| Empty   | `line-strong`       | "No project"                               |

The running cue is a change of temperature, not of volume — warm digits, a soft pill and
one slow-breathing dot. The animation is disabled under `prefers-reduced-motion`.

---

## 7. Status and lists

- **Running** — orange `#FC9C51`
- **Paused** — olive `#5E5C2D`
- **Secondary information** — sage `#999A57` (text: `sage-deep`)
- **Caution / destructive** — blush surface `#FDF0EC` with a mauve action

Project rows are neutral by default. The selected row takes a sunken background and a 3px
left rule — olive when paused, orange when running. Projects are never assigned individual
colours: the list stays scannable because only *state* is coloured, and a running project
is the only thing on screen wearing orange.

---

## 8. Iconography

24px grid, 1.75 stroke, round caps and joins, minimal detail — the Lucide idiom, drawn
in-house in [`src/components/icons.tsx`](src/components/icons.tsx) so no dependency is
needed. Icons inherit `currentColor` and sit at 14–16px beside labels. Play and pause are
filled at 2.4 stroke so they read as solid glyphs at small sizes.

No illustrated flowers, no skeuomorphic clocks, no duotone.

---

## 9. Imagery

If photography is ever used, it follows the source wildflower frame: natural light, warm
cast, shallow depth, muted and slightly imperfect, composed like an editorial spread.
Never stock imagery of handshakes, courtrooms, gavels or boardrooms — the professionalism
is carried by the design system, not by props.

---

## 10. The one rule

Build a hierarchy, not a rainbow. Olive, cream, dark text and a single orange accent do
almost all of the work. Peach, blush and mauve exist for the rare moment that genuinely
needs them. The result should read as sophisticated and recognisable rather than colourful.
