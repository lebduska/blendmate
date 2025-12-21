# <img src="../blendmate-app/src/assets/logo.svg" width="32" height="32" valign="middle"> Blendmate Connector (Blender Add-on)

Tento add-on slouží jako most mezi Blenderem a desktopovou aplikací Blendmate. Odesílá události z Blenderu (jako je výběr uzlu v Geometry Nodes) přes WebSockety.

## 🛠 Instalace

1.  **Stáhni/Zkopíruj složku:** Ujisti se, že máš v projektu složku `blendmate-addon/`.
2.  **Otevři Blender.**
3.  Jdi do `Edit` → `Preferences` → `Add-ons`.
4.  Klikni na **Install...** a vyber soubor `__init__.py` uvnitř složky `blendmate-addon/` (nebo celou složku, pokud tvůj Blender podporuje directory install).
5.  Zaškrtni **System: Blendmate Connector**.

## 📦 Správa závislostí (Vendoring)

Tento addon obsahuje své vlastní knihovny (např. `websocket-client`) ve složce `libs/`. Nemusíš tedy nic instalovat do systémového Pythonu Blenderu.

### Aktualizace knihoven (pro vývojáře)
Pokud chceš aktualizovat knihovny v addonu, uprav `requirements.txt` a spusť z kořene projektu:
```bash
./ops/update_addon_libs.sh
```

## 📡 Podporované události
Aktuálně addon odesílá tyto signály:
- `save_post`: Při uložení souboru.
- `load_post`: Při načtení souboru.
- `depsgraph_update_post`: Při jakékoliv změně scény (např. posun objektu).
- *Připravujeme:* Aktivní uzel v Geometry Nodes.

**Poznámka:** Všechny Blender event handlery, timery a msgbus subscriptions jsou centralizovány v modulu `events/registry.py` pro konzistentní správu a idempotentní registraci/unregistraci.

## 📝 Vývoj
Logy z addonu můžeš sledovat v systémové konzoli Blenderu (`Window` → `Toggle System Console` na Windows, nebo spuštěním Blenderu z terminálu na macOS/Linux).
