# Čo sa stane s vodou, ak na časti Polo Fields vznikne dátové centrum?

> **Current demo: five chapters — Today → Foundations → Structure → Ready → Operating.** M0–M6 below are the seven original calculation stages, not seven selectable timeline points. The new Foundations checkpoint has no separately assessed water, fuel, electricity or runoff. Original M4 construction inventories cover foundations and structure together; they must not be split arbitrarily or counted twice. See the [five-chapter mapping in this packet](README.md#current-demo-and-calculation-stages) and the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).

Alternatívny model: 4-hektárový trávnatý výrez Polo Fields, Golden Gate Park, San Francisco.

Ide o hypotetické výučbové demo na skutočnom mieste, nie o ohlásený projekt. Plochu, pôdu, budovu a odbery sme zvolili pre scenár. Existujúce okrajové stromy a dráhy do zásahu nezahŕňame.

**Porovnávací dážď:** 86,4 mm · NOAA San Francisco Downtown · záznam 11. 12. 2014

Skutočný denný úhrn zo stanice približne 5,8 km východne od ihriska. Na každom stave zopakujeme ten istý dážď a predpoklad vlhkosti. Nie je to meranie na ihrisku ani rekonštrukcia odtoku historickej búrky.

Toto je obsahový náhľad kariet, nie implementovaný prototyp. Číselné štítky a ich časový základ patria do hlavného zobrazenia.

## M0 — Začíname na zavlažovanom trávniku.

Zatiaľ sa nestavia. Sledujeme rovnaké 4 ha, na ktorých budeme porovnávať ďalšie stavy.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Zostávajúci pôvodný trávnik | 4,0 ha | stav pozemku | Predpoklad scenára |
| Dážď na celom pozemku | 3,5 mil. litrov | pri porovnávacom daždi | Výpočet z merania NOAA a plochy scenára |
| Vzniknutý povrchový odtok | 0,5 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Pôvodná modelová závlaha | 12,0 mil. litrov | rok bez výstavby | Rozpočtový predpoklad, nie meranie ihriska |

**Predpoklady priamo pri číslach:**

- Závlaha: zvolených 300 mm dodanej vody ročne na 4 ha. Tento rozpočet nie je odvodený z ročných zrážok ani z merania spotreby.

**Prečo:** Trávnik a pôda ovplyvňujú odtok. Zavlažovanie má vlastnú vodnú potrebu aj pred stavbou.

**Čo to znamená:** Pôvodný stav nemá nulový odber vody. Jeho modelovú závlahu zohľadníme pri porovnaní prvého roka prevádzky.

**Hranica tvrdenia:** Pôdnu skupinu B a dobrý trávnatý kryt predpokladáme; nemáme pôdny test ani vodomer ihriska. Mestská stanica je klimatická referencia, nie meranie na mieste.

*Podklad pre animáciu:* Ukáž schematický 4 ha výrez vo vnútri trávnatého ihriska. Dráhy a stromy nechaj mimo výrezu. Oddeľ dážď a dodanú závlahu.

Zdroje: P03, P04, P05, P06, S07; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## M1 — Odstraňujeme 3,2 hektára trávnika.

Začíname prípravu staveniska. Trávnik ustupuje na ploche budúcej stavby a obslužných priestorov.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Odstránený trávnik pred zarovnaním | 3,2 ha | stav pozemku | Predpoklad scenára |
| Zostávajúci pôvodný trávnik | 0,8 ha | stav pozemku | Predpoklad scenára |
| Voda dodaná na stavenisko | 0,1 mil. litrov | spolu za tento krok | Rozpočtový výpočet z predpokladov |

**Prečo:** Odstránenie vegetačného krytu mení ochranu povrchu; ďalšie prejazdy môžu pôdu poškodiť.

**Čo to znamená:** Samotné odstránenie mačiny pred zarovnaním nevystihuje naša kategória pripraveného staveniska. Jeho odtok nevyčísľujeme.

**Hranica tvrdenia:** Nevyčíslený odtok neznamená nulový dopad. Voda na kropenie je pracovný rozpočet; nejde o automatický rozdiel les verzus ihrisko.

*Podklad pre animáciu:* Odober mačinu na 3,2 ha; 0,8 ha pôvodného trávnika zostáva. Neanimuj výrub ani hotové zarovnanie.

Zdroje: S07, S10, S11; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## M2 — Zarovnaná zem vytvára viac povrchového odtoku.

Na 3,2 ha je holá upravená zem. Zvyšných 0,8 ha zostáva trávnatých.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Pripravená holá plocha | 3,2 ha | stav pozemku | Predpoklad scenára |
| Vzniknutý povrchový odtok | 1,7 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Voda dodaná na stavenisko | 1,1 mil. litrov | spolu za tento krok | Rozpočtový výpočet z predpokladov |

Pri rovnakom daždi vzniklo na modelovom pôvodnom trávniku **0,5 mil. litrov** povrchového odtoku. Porovnanie sa týka vzniknutého odtoku pred zachytávaním.

**Prečo:** V zvolenom modeli má pripravený holý povrch vyšší odtokový potenciál. Voda môže odnášať uvoľnené častice.

**Čo to znamená:** Zmena cesty dažďa vzniká ešte pred betonážou. Kropenie zároveň potrebuje samostatnú dodávku vody.

**Hranica tvrdenia:** Neodhadujeme množstvo sedimentu, kvalitu konkrétneho jazera ani skutočný priebeh historickej búrky.

*Podklad pre animáciu:* Zarovnaj už odkrytých 3,2 ha a zopakuj referenčný dážď. Sediment znázorni ako riziko, nie vypočítané znečistenie jazera.

Zdroje: S07, S10, S11, P04; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## M3 — Zhutnenie má vlastnú etapu prác.

Pripravenú pôdu zhutňujeme a počas vybraných pracovných dní zvlhčujeme.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Pripravená holá plocha | 3,2 ha | stav pozemku | Predpoklad scenára |
| Vzniknutý povrchový odtok | 1,7 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Voda dodaná na stavenisko | 0,5 mil. litrov | spolu za tento krok | Rozpočtový výpočet z predpokladov |

Pri rovnakom daždi vzniklo na modelovom pôvodnom trávniku **0,5 mil. litrov** povrchového odtoku. Porovnanie sa týka vzniknutého odtoku pred zachytávaním.

**Prečo:** Zhutnenie môže znižovať vsakovanie. Náš hrubý model však už v M2 pracuje so spoločnou kategóriou upraveného holého povrchu.

**Čo to znamená:** Samostatná animácia neznamená, že smieme pripočítať druhý vymyslený nárast odtoku. Viditeľná je ďalšia dodaná stavebná voda.

**Hranica tvrdenia:** Rozpočtové zvlhčovanie nedokazuje dosiahnutie geotechnicky potrebnej vlhkosti.

*Podklad pre animáciu:* Zobraz zhutňovanie na tých istých 3,2 ha; žiadne nové odstraňovanie trávnika.

Zdroje: S07, S10, S11; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## M4 — Budova mení povrch aj vodný rozpočet.

Pribúdajú nepriepustné budovy. Vodu dodávame na práce, ošetrovanie betónu, umývanie a potreby pracovníkov.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Pôdorysná plocha budov | 1,2 ha | stav pozemku | Predpoklad scenára |
| Vzniknutý povrchový odtok | 2,1 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Voda dodaná na stavenisko | 2,0 mil. litrov | spolu za tento krok | Rozpočtový výpočet z predpokladov |
| Voda na miešanie betónu mimo staveniska | 1,1 mil. litrov | spolu za tento krok | Rozpočtový výpočet z predpokladov |

Pri rovnakom daždi vzniklo na modelovom pôvodnom trávniku **0,5 mil. litrov** povrchového odtoku. Porovnanie sa týka vzniknutého odtoku pred zachytávaním.

**Prečo:** Dážď pod novou budovou nevstupuje priamo do pôdy. Miešanie betónu navyše potrebuje vodu mimo staveniska.

**Čo to znamená:** Odber na stavbe a miešanie v betonárni ukazujeme oddelene. Vymývacia voda sa zachytáva a spravuje.

**Hranica tvrdenia:** Ide o vybraný stav výstavby a autorský rozpočet materiálov a vody. Nie je to výkaz reálnej stavby ani celá vodná stopa betónu.

*Podklad pre animáciu:* Postav 1,2 ha pôdorysu budov. Dva hektáre zostávajú v tomto okamihu holé a 0,8 ha trávnatých. Strechu a základy nepočítaj ako dve dažďové plochy.

Zdroje: S07, S12, S17; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## M5 — Hotový areál musí spravovať dážď.

Nepriepustných je 2,8 ha. Pred otvorením napĺňame systémy a robíme vybrané skúšky.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Vzniknutý povrchový odtok | 2,4 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Zachytené v pôvodne prázdnej strešnej nádrži | 0,2 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Voda smerujúca do spravovaného odvodnenia | 2,2 mil. litrov | pri porovnávacom daždi | Modelový výpočet |
| Voda dodaná na stavenisko | 0,2 mil. litrov | spolu za tento krok | Rozpočtový výpočet z predpokladov |

Pri rovnakom daždi vzniklo na modelovom pôvodnom trávniku **0,5 mil. litrov** povrchového odtoku. Porovnanie sa týka vzniknutého odtoku pred zachytávaním.

**Prečo:** Prázdna nádrž prijme časť strešného odtoku. Zvyšný objem potrebuje spravované odvodnenie.

**Čo to znamená:** Zásoba v nádrži sa nerovná odparenej vode ani ročnej úspore z vodovodu. Neurčili sme existujúce odtokové napojenie ihriska.

**Hranica tvrdenia:** Počítame objem jedného dažďa bez priebežného vyprázdňovania. Nemodelujeme špičkový prietok, kapacitu kanalizácie, povodeň ani schválený drenážny návrh. Dobré pokrytie obnovenej vegetácie je predpoklad tohto stavu.

*Podklad pre animáciu:* Dokonči 1,2 ha striech, 1,6 ha ciest a tvrdých plôch, 0,4 ha obnovenej vegetácie a 0,8 ha ponechaného trávnika. Strechy pripoj k 200 m³ nádrži.

Zdroje: S07, P10; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## M6 — Chladenie pridáva pravidelný odber; závlahy ubúda.

Spúšťame modelovú 10 MW IT prevádzku. Menšia zavlažovaná plocha znižuje vybraný závlahový rozpočet o 8,4 milióna litrov ročne, ale pribúda chladenie a bežná voda budovy.

| Údaj | Hodnota | Časový základ | Pôvod |
| --- | ---: | --- | --- |
| Dodaná chladiaca voda | 300 000 litrov | za priemerný prevádzkový deň | Modelový výpočet |
| Odparená chladiaca voda | 225 000 litrov | za priemerný prevádzkový deň | Modelový výpočet |
| Chladiaci odluh do splaškovej kanalizácie | 75 000 litrov | za priemerný prevádzkový deň | Modelový výpočet |
| Celková dodaná voda | 114,2 mil. litrov | prvý celý rok prevádzky | Modelový výpočet |
| Nárast dodanej vody zo všetkých zdrojov | 102,2 mil. litrov | prvý celý rok oproti roku bez výstavby | Výpočet zo zvolenej závlahy a prevádzky |

**Predpoklady priamo pri číslach:**

- Priemerný príkon serverov: 10 MW IT — zvolená kapacita, nie údaj odvodený zo 4 ha.
- Uzavretý vnútorný okruh a vonkajšie chladiče s odparovaním; predpoklad 1,25 l dodanej chladiacej vody/kWh IT prevzatý z návrhového pomeru SJ04. Nie je overený pre klímu San Francisca.
- CoC = 4, zanedbané úniky a odnos kvapiek. Chladenie a bežné potreby majú predpokladanú pitnú prípojku; zdroj parkovej závlahy nepoznáme.
- Rovnaký zvolený závlahový rozpočet 300 mm/rok na 4 ha pred stavbou a na 1,2 ha po stavbe: 12 oproti 3,6 milióna litrov ročne. Nie je to meranie ihriska.

**Prečo:** Časť chladiacej vody sa odparí, časť sa odvádza ako odluh kvôli minerálom.

**Čo to znamená:** Pokles závlahy odčítame pri porovnaní celkových dodaných objemov s rokom bez výstavby. Nevyplýva z toho čistá zmena odberu pitnej vody; zdroj závlahy nie je overený.

**Hranica tvrdenia:** Ide o prvý celý 365-dňový rok a denné priemery, nie letné špičky. Závlaha je predpoklad; vodná strata výparom zo závlahy ani čistá zmena spotreby všetkých zdrojov sa nepočítajú. Kapacita a prípojky sú neoverené.

*Podklad pre animáciu:* Rozlíš prívod chladiacej vody, odparovanie a odluh do predpokladaného riadeného splaškového napojenia. Vedľa ukáž závlahu pôvodných 4 ha a výsledných 1,2 ha; nevypúšťaj odluh do jazera.

Zdroje: S08, S09, P08, P09; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).

## Voliteľné otázky

**Je Polo Fields menšie než náš pôvodný pozemok?**

Oficiálny zoznam uvádza 24,64 akra, približne 10 hektárov za celé miesto. Pre túto alternatívu sme si zvolili 4 hektáre trávnika. Nie je to geodeticky určená stavebná parcela.

**Bude trávnaté ihrisko pri výstavbe potrebovať oveľa viac vody na prach než les?**

Taký násobiteľ nemáme podložený. Prašnosť závisí od vlhkosti, jemných častíc, vetra, dopravy a činností. Po odstránení krytu môže prášiť aj bývalý les. Naše dva stavebné rozpočty sa líšia plochou a programom prác, nie preukázanou výhodou lesa.

**Prečo nepočítame celú pôvodnú závlahu ako úsporu pitnej vody?**

Nemáme overený zdroj ani vodomer Polo Fields. Park využíva viacero vodných zdrojov a pripravuje prechod na recyklovanú vodu. Vieme porovnať modelové dodané objemy, ale z tohto porovnania nevyplýva čistá zmena odberu pitnej vody.

**Môže dátové centrum automaticky chladiť recyklovanou vodou z parku?**

Nie je overená jeho prípojka ani pridelená kapacita. Pri kontrole 24. 10. 2026 SFPUC stále uvádzal výstavbu recyklačného projektu s dokončením koncom roka 2026. V deme je pitná chladiaca prípojka iba predpoklad.

**Nezníži chladnejšie San Francisco spotrebu chladenia?**

Môže ju ovplyvniť, ale potrebovali by sme hodinové počasie a návrh technológie. Zatiaľ držíme rovnaký predpoklad 1,25 l/kWh IT ako pri San José. Nižší celkový odber tu spôsobuje zvolených 10 namiesto 20 MW IT.

**Je všetka voda, ktorá neodtečie po povrchu, doplnenou podzemnou vodou?**

Nie. Model zvyšok nerozdeľuje medzi vodu na povrchu, v pôde, vegetácii a neskorší výpar. Nepočíta doplnenie podzemnej vody.

**Vyrieši nádrž ročnú potrebu chladiacej vody?**

Vypočítame iba zber pri jednom daždi do nádrže, ktorá je na začiatku prázdna. Bez ročného časového modelu z odberu chladenia neodpočítavame žiadnu úsporu z dažďa.
