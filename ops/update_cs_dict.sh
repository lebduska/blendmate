#!/usr/bin/env bash
# Skript stáhne český Hunspell slovník z LibreOffice a vytvoří projektový IntelliJ slovník
# Použití: z kořene repozitáře spustit `bash ops/update_cs_dict.sh`

set -euo pipefail

OUT_DIR=".idea/dictionaries"
TMP="/tmp/cs_CZ.dic.$$"
URL="https://raw.githubusercontent.com/LibreOffice/dictionaries/master/cs_CZ/cs_CZ.dic"

mkdir -p "$OUT_DIR"

echo "Stahuji slovník z $URL..."
curl -L -s -o "$TMP" "$URL"
if [ ! -s "$TMP" ]; then
  echo "Chyba: stáhnutý soubor je prázdný nebo neexistuje" >&2
  exit 1
fi

echo "Zpracovávám slovník a ukládám do $OUT_DIR/cs.dic..."
# Odebereme první řádek (počet položek), odstraníme affix flags (za '/'), prázdné řádky, normalizujeme UTF-8 a deduplikujeme
tail -n +2 "$TMP" > "${TMP}.noheader"
sed 's#/.*##' "${TMP}.noheader" | awk 'NF' | iconv -f UTF-8 -t UTF-8 -c | sort -u > "$OUT_DIR/cs.dic"

rm -f "$TMP" "${TMP}.noheader"

echo "Hotovo. Vytvořeno: $OUT_DIR/cs.dic (řádků: $(wc -l < "$OUT_DIR/cs.dic"))"

echo "Doporučení: Otevřete IntelliJ a pokud se změny neprojevily, proveďte: File -> Invalidate Caches / Restart... -> Invalidate and Restart"

