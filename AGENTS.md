# AGENTS.md

Project: **blendmate** — personal companion app for Blender.

MVP: *Active GN node in Blender → WebSocket → app shows node help from local knowledge base.*

Treat this file as an **agent contract**: stručná sada pravidel pro AI agenty (Cursor / Codex / jiné LLM),
aby byly běhy opakovatelné, auditovatelné a zarovnané s cíli projektu.

---
## 1. Workflow rules (issues, větve, dokumentace)

- **Single source of truth (SSOT):** GitHub Issues v repu `lebduska/blendmate`.
- **1 Issue = 1 PR:** Každý úkol má vlastní větev i Pull Request.
- **Větve:** `{id}-{summary}` (např. `23-ui-layout`).
- **Propojení:** V popisu PR vždy uveď `Fixes #<id>`.
- **Komentář do issue:** Po dokončení práce přidej krátký komentář, co se změnilo + odkaz na PR.
- **Clean desk:** Před koncem session nesmí zůstat neuklizený working tree (buď commit, nebo zahodit).
- **Bez dokumentace není hotovo:** Změníš-li chování, aktualizuj `CONTEXT.md` (a případně další související soubory).

---
## 2. Execution model (CLI‑first)

- Projekt se typicky ovládá přes **lokální CLI běhy agentů** v reálném TTY.
- Důraz na **determinismus, reprodukovatelnost a auditovatelnost** u všech netriviálních úkolů.
- Webové běhy (např. v prohlížeči) jsou v pořádku pro malé, nízkorizikové změny.

(Platí pro prostředí agentů, není to návod pro ruční práci lidí.)

---
## 3. Issue & task discovery

- Aktivní práce se vždy váže ke konkrétnímu issue.
- Před jakoukoli prací nad issue číslo `N` agent **MUSÍ** načíst detaily:

  ```bash
  gh issue view <N> --repo lebduska/blendmate --json title,body,url,labels
  ```

- Text issue (včetně checklistů) je **autoritativní zadání**.
- Agent nesmí domýšlet nebo vymýšlet nové požadavky mimo issue.
- Pokud jsou požadavky nejasné nebo chybí, agent se má zastavit a vyžádat si upřesnění komentářem v issue.
- Agent **nesmí** hádat obsah issue ani hledat čísla issue v souborech repozitáře.

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
