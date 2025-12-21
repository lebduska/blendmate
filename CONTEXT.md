# Blendmate — Project Context

Tento soubor je rychlé „přistávací místo“ pro lidi i agenty:
co Blendmate je, v jakém je stavu a na co se má práce soustředit.

---
## What this project is (1–2 sentences)

Blendmate je **kontextový asistent pro Blender**, který poslouchá Blender eventy přes WebSocket
(a addon uvnitř Blenderu) a v desktopové appce nabízí event konzoli a znalostní nápovědu
pro Geometry Nodes nad lokální knowledge base.

---
## Current state (high‑level)

- **Blender WebSocket add‑on** existuje a posílá vybrané handler eventy do lokálního serveru.
- **Tauri/React desktop app** má minimální shell (header + workspace + footer) a umí se připojit k WS serveru a zobrazit stav připojení.
- **Knowledge layer pro Blender 4.5** je rozpracovaná (`knowledge/blender-4.5/...`).
- **Workflow & dokumentace**: existují základní soubory (`WORKFLOW.md`, `AGENTS.md`, `CONTEXT.md`) a GitHub issue štítky/prioritizace.
- **CI/CD a releasy**: zatím nejsou, buildy se dělají lokálně.

Pro detailní architekturu viz `docs/ARCHITECTURE.md` a `docs/PROTOCOL_EVENTS.md`.

---
## How to run (desktop app + addon)

```bash
# 1) Install dependencies (once per clone)
cd blendmate-app && npm install

# 2) Run desktop app in development (Tauri + React)
npm run tauri dev
```

**Install the Blender add‑on:**
- `Edit` → `Preferences` → `Add-ons` → `Install...` → vyber adresář `blendmate-addon/`
- povol "System: Blendmate Connector".

Tohle je minimální setup pro ruční end‑to‑end test (viz také hlavní `README.md`).

---
## Direction & near‑term focus

Namísto pevně daného seznamu issue ber aktuální prioritu z GitHubu
(label `prio:p0` v repozitáři `lebduska/blendmate`). Typicky se práce točí okolo těchto oblastí:

1. **Node help view** — UI, které z knowledge base načte a zobrazí markdown + preview + tipy/pitfalls pro GN node.
2. **Knowledge base loader** — spolehlivé načítání dat podle `node_id` (metadata, info markdown, obrázky).
3. **Blender knowledge extraction pipeline** — nástroje pro automatické získání handlerů a API inventáře
   do `knowledge/<source>-<version>/`.

Při práci vždy preferuj konkrétní otevřená issue před „obecným pocitem“ priority.

---
## Known pitfalls / constraints

- Práce na UI předpokládá stabilní WebSocket protokol a rozumné throttling/disconnect chování.
- Nezačínej nové feature úkoly, pokud nejsou dořešené/odblokované top priority (viz `prio:p0`).
- Agenti i CLI workflow spoléhají na aktuální a konzistentní `CONTEXT.md` + `AGENTS.md`.

---
## Things we are explicitly NOT doing right now

- Žádné autonomní commity nebo přímé pushe na `main` od agentů.
- Žádné automatizované testy (zatím); testování je manuální.
- Žádná integrovaná AI přímo uvnitř Blender UI (asistent běží jako externí appka).

---
## Tools & environment

- **Frontend:** Tauri + React + TypeScript
- **Backend / protocol:** WebSocket server v Tauri backendu
- **Blender:** Python add‑on registrující handlery
- **CLI / automation:** GitHub CLI + lokální ops skripty
- **Lokální vývoj:** macOS (Apple Silicon ověřeno)

---
## Base URLs & settings

- WebSocket server (desktop app): `ws://127.0.0.1:32123`
- React dev UI: zobrazované uvnitř Tauri okna

Pokud změníš tyto hodnoty nebo chování připojení, **aktualizuj tento soubor**.
