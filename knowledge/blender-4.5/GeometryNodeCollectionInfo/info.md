# Collection Info

Tento uzel přivede do Geometry Nodes obsah kolekce jako **instance**. Hodí se, když chceš řídit výslednou geometrii zvenku – například přehazovat kolekce, testovat varianty nebo rozsévat různé objekty bez přepojování node tree.

### Kdy to použít
- Když chceš do node tree posílat **sadu objektů** z kolekce.
- Když chceš přepínat varianty scény jen změnou kolekce.

### Důležité volby
- **Separate Children**: Každé dítě kolekce se stane samostatnou instancí (užitečné pro Pick Instance).
- **Reset Children**: Odstraní lokální transformace dětí, aby instance seděly přesně na bodech.
- **Transform Space**: Řídí, jestli se zachová původní offset kolekce nebo relativní pozice ve scéně.

### Příklad
Chceš rozsévat různé stromy? Dej všechny stromy do jedné kolekce, připoj ji přes Collection Info a v `Instance on Points` použij **Pick Instance**.
