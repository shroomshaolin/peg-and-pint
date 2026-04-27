# The Peg & Pint 🍺

Warm banter. Sharp cribbage. A proper table.

The Peg & Pint is a Sapphire app for playing cribbage at a cozy tavern table with persona seats, voice support, teaching notes, and safe backend AI banter.

## Current features

- Real cribbage-style round flow: New Match, deal, discard to crib, cut card, pegging, hand scoring, and next round.
- Dealer and crib ownership rotate between rounds.
- Cut-card scoring includes his heels.
- Pegging includes proper count handling and scoring logic.
- Hand and crib scoring includes fifteens, pairs, runs, flushes, and nobs.
- Game-over latch at 121+ points.
- Winner banner and confetti celebration.
- Pause / Resume game button.
- Sound, voice, banter, teaching mode, and teaching voice toggles.
- Persona table with left/right players and voice selections.
- Safe backend AI banter route using Sapphire isolated chat instead of frontend `/api/chat`, preventing leakage into the visible chat.

## Notes

AI banter is generated through the plugin backend route:

`POST /api/plugin/peg-and-pint/banter`

This keeps Tavern persona responses inside the app instead of posting into the active Sapphire chat.

## Version

0.2.0
