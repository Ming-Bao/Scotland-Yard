# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ENGR489 capstone project: a web-based multiplayer Scotland Yard game overlaid on a real-world map of the Wellington region. Players are assigned roles (Mr X or Detectives), move between graph nodes on the Wellington map using transport tickets, and win by catching or evading each other over 24 rounds.

The repo is currently in the design and evaluation phase. Implementation has not yet started — the codebase contains only documentation, planning artefacts, and map API evaluation tooling.

## Running the Map API Benchmark

The timing benchmark compares Google Maps, Leaflet, and MapLibre GL render performance:

```bash
cd documentation/test_map_api
python3 time_maps.py
```

Requires Firefox (snap path `/snap/firefox/current/usr/lib/firefox/firefox`), geckodriver, and `selenium`. Results are written to `timing_results.json`.

To include Google Maps: create `documentation/test_map_api/googlemaps/env` containing:
```
GOOGLE_MAPS_API_KEY=your_key_here
```

## Architecture (Planned)

**Client–server, real-time WebSocket communication.**

- **Backend**: game engine enforcing Scotland Yard rules — player roles, turn management, movement validation, ticket tracking, win conditions, session management.
- **Frontend**: browser-based map UI allowing players to view available moves, select transport, and track game state.
- **Map layer**: GeoJSON-backed (not routing-API-based). API routing was ruled out early — too costly and too slow for the number of edges required. Pre-computed paths stored as GeoJSON are served statically.

## Game State Machine

Documented in `documentation/plans/states-diagrams.md`:

- **Game phases**: `Idle → Lobby → InProgress → (Paused | DetectivesWin | MrXWins | GameAborted)`
- **InProgress sub-phases**: `MrXTurn → DetectiveTurn → RoundEnd → MrXTurn` (cycles 24 rounds)
- **Disconnection handling**: `InProgress → Paused` on any disconnect; reconnect within grace period resumes, otherwise `GameAborted`
- **Mr X turn flow**: reveal check (rounds 3, 8, 13, 18, 24) → fetch valid moves → select node + ticket → optional double-ticket second move → server validates → broadcast
- **Detective turn flow**: fetch valid moves → select node + ticket → submit → server catch-check → advance to next detective or increment round

## Key Design Decisions

- **Map library**: Under evaluation (Google Maps, Leaflet, MapLibre GL). Decision to be driven by render-time benchmarks and licensing.
- **Routing**: GeoJSON pre-computed paths preferred over live routing APIs — APIs are too expensive per-request and too slow for hundreds of node-to-node edges.
- **Turn timers**: Server-side auto-skip on `TurnTimerExpired` so gameplay advances even if a player is idle.

## OpenAPI Spec — MANDATORY SYNC RULE

**`documentation/openapi.yaml` must be updated in the same change as any modification to the API surface — REST or WebSocket.**

### REST changes (backend `@RestController`)
Update whenever you:
- Add, remove, or rename an endpoint
- Change a request body or response shape
- Add a new enum variant to `GamePhase`, `TurnPhase`, `Role`, or `TicketType`

→ Update the matching `paths:` entry and `components/schemas:` section.

### WebSocket changes (backend broadcasts or frontend subscriptions)
Update whenever you:
- Add a new STOMP topic the server publishes to (backend `messaging.convertAndSend(...)`)
- Add a new STOMP subscription in any frontend view or composable (`.subscribe(...)`)
- Change the payload schema of an existing topic
- Add new client-side reactions to an existing topic (e.g. a new `phase` value triggers a new navigation)
- Remove a topic or subscription

→ Update the matching `webhooks:` entry in `openapi.yaml`. Each STOMP topic has one `webhooks` entry. Document: the topic path, what triggers a publish, and what the client is expected to do on receipt.

### Every change
Bump the patch version in `info.version` (e.g. `0.1.2` → `0.1.3`).

Do **not** skip this step even for small changes. The OpenAPI file is the single source of truth for the full API surface — REST and real-time.

## Documentation Layout

- `documentation/openapi.yaml` — OpenAPI 3.1.0 spec (keep in sync with controllers)
- `documentation/plans/` — state diagrams and game flowcharts (Mermaid)
- `documentation/test_map_api/` — map library benchmarks, timing results, per-library notes
- `documentation/project_proposal/` — original proposal (LaTeX source + PDFs)
- `documentation/spec.md` — living spec

## Planned Evaluation Methods

Unit, mock, lifecycle, integration, functional, performance testing of game logic and multiplayer sync; user evaluation via SUS questionnaire. Meta-testing: coverage, mutation, fuzz, and property-based testing.
