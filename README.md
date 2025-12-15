# blendmate

Osobní parťák pro vibe práci s Blenderem.

Side-app, která běží vedle Blenderu a ukazuje kontextový help (primárně Geometry Nodes),
včetně ukázek, poznámek a časem i diagnostiky.

> Working title. Primárně vzniká pro mě. Název i forma se mohou časem změnit.

## Ruční testování (Blender add-on WS události)
- Spusť Blendmate aplikaci (WebSocket server) přes `cd blendmate-app && npm run tauri dev`.
- V Blenderu nainstaluj/enable add-on z adresáře `addon/`.
- Akce k ověření: ulož `.blend` (event `save_post`), nahraj soubor (event `load_post`), posuň frame (event `frame_change_post`), spusť render (event `render_complete`), změň scénu (throttlovaný `depsgraph_update_post` cca 2–5x/s).
- Události uvidíš v UI Blendmate (poslední zpráva) nebo v konzoli, kam app loguje přijaté WS payloady.
