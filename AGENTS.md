# AGENTS.md

Project: **blendmate** — personal companion app for Blender.

MVP: *Active GN node in Blender → WebSocket → app shows node help from local knowledge base.*

Treat this file as an **agent contract**: stručná sada pravidel pro AI agenty (Cursor / Codex / jiné LLM),
aby byly běhy opakovatelné, auditovatelné a zarovnané s cíli projektu.

---
## 1. Workflow rules (větve, dokumentace)

- **Větve:** `{topic}-{summary}` (např. `ui-layout`, `fix-camera-animation`).
- **Clean desk:** Před koncem session nesmí zůstat neuklizený working tree (buď commit, nebo zahodit).
- **Bez dokumentace není hotovo:** Změníš-li chování, aktualizuj `CONTEXT.md` (a případně další související soubory).
- **Session resume:** Na konci session aktualizuj `.ai-workspace/issues/Blendmate/coding-vibe-resume.md` se shrnutím změn.

---
## 2. Execution model (CLI‑first)

- Projekt se typicky ovládá přes **lokální CLI běhy agentů** v reálném TTY.
- Důraz na **determinismus, reprodukovatelnost a auditovatelnost** u všech netriviálních úkolů.
- Webové běhy (např. v prohlížeči) jsou v pořádku pro malé, nízkorizikové změny.

(Platí pro prostředí agentů, není to návod pro ruční práci lidí.)

---
## 3. Task discovery

- Před prací si agent přečte relevantní dokumenty:
  - `.ai-workspace/coding-vibe-resume.md` — kontext z předchozí session
  - `CONTEXT.md` — aktuální stav projektu
  - `blendmate-identity.md` — filosofie produktu
- Agent nesmí domýšlet nebo vymýšlet nové požadavky mimo zadání uživatele.
- Pokud jsou požadavky nejasné, agent se má zastavit a zeptat se uživatele.

---
## 4. Knowledge extraction & protocol layer

- Extrakční úkoly musí produkovat **strojově čitelné artefakty**.
- Všechny znalostní artefakty patří pod:

  - `knowledge/<source>-<version>/`  
    např. `knowledge/blender-4.5/handlers.json`

- `knowledge/` je verzovaný adresář, změny se commitují do gitu.
- **Neregeneruj** existující knowledge artefakty, pokud to není výslovně požadováno v issue.

### Sources of truth

- Preferuj oficiální dokumentaci (Blender, API docs) jako primární zdroj pravdy.
- Zdrojový kód používej pro upřesnění chování nebo doplnění detailů.
- Nevymýšlej nové API, handlery nebo eventy, které nejsou explicitně zdokumentované.

---
## 5. Output & logging

### Output

- Výstupy mají být **deterministické a snadno reviewovatelné**.
- Preferované formáty: JSON, Markdown nebo jiná strukturovaná podoba.
- JSON musí být validní a parsovatelný před commitem.

### Run logs

Cíl: umožnit zpětnou analýzu běhů (prompty, chování agentů, throughput).

- Pro netriviální úkoly (protokol, knowledge, addon, app) se doporučuje logovat běhy do `logs/`.
- Formát: „1 běh = 1 Markdown log“.
- Logy jsou append‑only a lze je commitnout nebo přiložit k PR dle potřeby.

Minimální obsah logu:
- čas start/end + trvání,
- typ agenta (cursor/codex/jiný) + použitý příkaz,
- Git kontext (repo, větev, HEAD commit),
- reference na issue (URL + krátký výstřižek `gh issue view <N>`),
- použitý prompt / instrukce,
- klíčové příkazy a jejich výstupy,
- stručné shrnutí výsledku (které soubory se změnily, odkaz na diff/PR).

---
## 6. Agent behavior guidelines

- Tato smlouva je pro agenty; není to user‑facing dokumentace.
- Necrawlovať velké externí repozitáře bez explicitního zadání.
- Když chybí klíčové informace, **zastav se a ptej se**, nehádej.
- U protokolů a API se vyhýbej „best guess“ implementacím – raději konzervativní chování.

---
## 7. Cíl projektu

Blendmate buduje znovupoužitelnou **knowledge + protocol vrstvu nad Blenderem**,
aby umožnil kontextovou nápovědu, AI reasoning a UI asistenci
bez duplikování interní logiky Blenderu.
