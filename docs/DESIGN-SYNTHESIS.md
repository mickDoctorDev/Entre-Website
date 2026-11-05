# Design Synthesis — "Make it modern, not mono-tone"

**Method:** synthesis of the product owner's feedback across the build sessions (no user interviews or analytics yet).
**Participants:** 1 (product owner). Treat every point below as a hypothesis to confirm with real event visitors.

## What was asked (observations)
| # | Feedback | Source |
|---|----------|--------|
| 1 | Home should feel like a playful, gamified map (floating pins, glass cards) — shared a 3D-style reference | Reference screenshot |
| 2 | Map must stay uncluttered: bottom UI smaller, cards only after tapping a truck, map pannable | "เมนูข้างล่างทำให้เล็กลง… เลื่อนไปตำแหน่งอื่นได้" |
| 3 | Sorting bins are only on trucks → one kind of pin, not two | "ตำแหน่งแยกขยะเป็นตำแหน่งเดียวกับ Truck" |
| 4 | "นำทาง" should show the route inside the web, animated | latest request |
| 5 | Admin should look futuristic | earlier request |
| 6 | Redesign more modern, **not mono-tone** (current = green/white only) | latest request |

## Themes → design decisions
1. **Map is the product.** Everything else floats over it and stays out of the way (sheet on demand, small nav).
2. **Colour should carry meaning, not decoration.** Green-only made status, water, parks, CTAs and rewards look alike.
3. **Delight where the task happens.** Route drawing and the coin/T Point moment are the two places for motion.

## Palette (eco stays the base, colour adds meaning)
| Role | Colour | Used for |
|------|--------|----------|
| Eco green | `#10B26C` / deep `#067647` | brand, "available", primary buttons |
| Sky | `#2F9BFF` | water, routes, "you are here", info |
| Sun | `#FFC83D` | T Point coin, nearest-truck highlight, rewards |
| Coral | `#FF7A66` | offline / errors |
| Teal | `#0FA3B1` | gradients with green, wallet card |
| Lilac | `#7C6CFF` (sparingly) | map buildings tint, admin accent |
| Ink | `#12202B` | text (blue-black, not green-black) |

Map buildings use a pastel set (peach, butter, sky, lilac, mint) so the city reads as colourful but calm. Text colours keep ≥ 4.5:1 contrast; status never relies on colour alone (label + icon stay).

## Risks / open questions
- Is the sun-yellow T coin confusing next to the amber "busy" status? Test with visitors.
- Route line is a **stylised** path (vertical + horizontal legs), not real road routing. Real routing needs a routing API — decide if worth it.
- Colour-blind check and outdoor sunlight legibility haven't been tested.
