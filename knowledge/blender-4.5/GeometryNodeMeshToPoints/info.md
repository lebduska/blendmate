# Mesh to Points

Uzel převádí **mesh** na **point cloud**. Můžeš si vybrat, jestli chceš body na vrcholech, hranách, ploškách nebo rozích – a pak s nimi dál pracovat jako s klasickými body.

### Kdy to použít
- Když chceš ze sítě získat body pro instancing.
- Když potřebuješ převést plochy nebo hrany na body pro další operace.

### Důležité volby
- **Mode**: Volí, kde se body vytvoří (Vertices / Edges / Faces / Corners).
- **Selection**: Omezí, které části meshe se převedou.
- **Position / Radius**: Upraví polohu a velikost výsledných bodů.

### Příklad
Převod meshe na body → `Instance on Points` → rozsévání objektů přes povrch.
