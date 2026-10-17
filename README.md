# BomBrno

Plošinovka pro 3 hráče na jedné klávesnici. Skáčete si po hlavách, házíte bomby a každé kolo
se hraje na jiném místě v Brně: od Petrova přes Zelný trh a Kraví horu až po noční rozjezd.
Každá mapa má vlastní specialitu podle brněnských pověstí a reálií.

## Spuštění

Otevřete `index.html` v prohlížeči. Nic se neinstaluje ani nestahuje.

Pokud prohlížeč soubory z disku blokuje, spusťte v adresáři hry malý server
(`python3 -m http.server 8000`) a otevřete http://localhost:8000.

## Ovládání

| Hráč | Doleva / doprava | Skok | Bomba |
|---|---|---|---|
| 1 | A / D | W | S |
| 2 | H / K | U | J |
| 3 | ← / → | ↑ | ↓ |

- Na začátku si každý vybere postavičku svými šipkami a potvrdí ji skokem. Bombou výběr zruší.
- Mezerník spustí hru ve dvou.
- Po kole: `R` = další kolo na nové mapě, `Esc` = výběr postav, `M` = zvuk zap/vyp.

Každý má 100 HP. Skok soupeři na hlavu ubere 25, bomba až 40. Vyhrává poslední, kdo zůstane naživu.

Levnější klávesnice neumí zaregistrovat víc kláves stisknutých najednou. Pokud některá kombinace
nefunguje, je to omezení hardwaru, ne hry. Klávesy jdou přemapovat v `src/config.js`.

## Technika

Čistý JavaScript a Canvas 2D, bez závislostí a bez buildu. Mapy jsou v `src/maps.js`; po každé
úpravě je zkontrolujte příkazem `node tools/check-maps.js`.

## Licence

MIT, viz `LICENSE`.
