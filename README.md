# blendmate

Osobní parťák pro vibe práci s Blenderem.

Side-app, která běží vedle Blenderu a ukazuje kontextový help (primárně Geometry Nodes),
včetně ukázek, poznámek a časem i diagnostiky.

> Working title. Primárně vzniká pro mě. Název i forma se mohou časem změnit.

## Ruční testování (Blender add-on WS události)

1. **Spusť Blendmate aplikaci** (WebSocket server):
   ```bash
   cd blendmate-app && npm run tauri dev
   ```

2. **Nainstaluj addon v Blenderu**:
   - Otevři Blender
   - `Edit` → `Preferences` → `Add-ons`
   - Klikni `Install...`
   - Vyber adresář `addon/` z tohoto repozitáře
   - Zaškrtni checkbox u "Blendmate" v seznamu addonů

3. **Ověř funkčnost**:
   - Ulož `.blend` soubor → event `save_post`
   - Nahraj soubor → event `load_post`
   - Posuň frame → event `frame_change_post`
   - Spusť render → event `render_complete`
   - Změň scénu → throttlovaný `depsgraph_update_post` (cca 2–5x/s)

4. **Zkontroluj události**:
   - V UI Blendmate (poslední zpráva)
   - V konzoli, kam app loguje přijaté WS payloady
