# <img src="blendmate-app/src/assets/logo.svg" width="48" height="48" valign="middle"> blendmate

Osobní parťák pro vibe práci s Blenderem.

Blendmate je desktopová aplikace + Blender add-on, který posílá události z Blenderu přes WebSocket
a v aplikaci je zobrazuje jako event konzoli a kontextovou nápovědu pro Geometry Nodes.

---
## Co tady najdeš

- **Blender add-on** (`blendmate-addon/`) — běží uvnitř Blenderu, sleduje vybrané handlery a posílá normalizované eventy.
- **Desktop app** (`blendmate-app/`) — Tauri + React + TypeScript, lokální WebSocket server + UI pro eventy a node help.
- **Knowledge base** (`knowledge/`) — lokální znalostní báze pro Geometry Nodes a Blender 4.5 (metadata, markdown, preview obrázky).

Podrobnější architektura a protokol: `docs/ARCHITECTURE.md`, `docs/PROTOCOL_EVENTS.md`.

---
## Úkoly a stav vývoje

Tento projekt používá **GitHub Issues** jako jediný zdroj pravdy pro plánování a sledování úkolů.

- [Seznam otevřených úkolů](https://github.com/lebduska/blendmate/issues)
- [Aktuální priority (label `prio:p0`)](https://github.com/lebduska/blendmate/issues?q=is%3Aopen+is%3Aissue+label%3Aprio%3Ap0)

Aktuální směr a shrnutí projektu najdeš v [`CONTEXT.md`](./CONTEXT.md).

---
## Rychlý start (desktop app)

```bash
# 1) Nainstaluj závislosti (jednorázově)
cd blendmate-app && npm install

# 2) Spusť vývojovou verzi desktop app (Tauri + React)
npm run tauri dev
```

Tím se spustí lokální WebSocket server na `ws://127.0.0.1:32123` a otevře se Blendmate UI.

---
## Blender Add-on

Pro propojení s Blenderem je potřeba nainstalovat add-on z tohoto repozitáře.

Základní kroky:

1. Otevři Blender.
2. `Edit` → `Preferences` → `Add-ons`.
3. Klikni na `Install...`.
4. Vyber adresář `blendmate-addon/` (nebo soubor `blendmate-addon/__init__.py`, podle verze Blenderu).
5. Zaškrtni checkbox u **System: Blendmate Connector**.

Více informací najdeš v [`blendmate-addon/README.md`](./blendmate-addon/README.md).

---
## Ruční end‑to‑end test (Blender ↔ desktop app)

1. **Spusť Blendmate desktop app** (WebSocket server):
   ```bash
   cd blendmate-app && npm run tauri dev
   ```

2. **Nainstaluj a aktivuj add-on v Blenderu** (viz sekce výše).

3. **Ověř funkčnost tak, že v Blenderu vyvoláš různé akce:**
   - Ulož `.blend` soubor → event `save_post`
   - Nahraj `.blend` soubor → event `load_post`
   - Posuň frame → event `frame_change_post`
   - Spusť render → event `render_complete`
   - Změň scénu / pohni objektem → throttlovaný `depsgraph_update_post` (cca 2–5×/s)

4. **Zkontroluj přijaté události:**
   - v UI Blendmate (panel s poslední zprávou),
   - v konzoli, kam app loguje přijaté WebSocket payloady.

---
## Pro AI agenty

Pokud jsi AI agent (Cursor, Codex, jiné LLM), nejdříve si přečti [`AGENTS.md`](./AGENTS.md),
kde jsou pravidla pro práci v tomto repozitáři a očekávaný workflow.
