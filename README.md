# ForecastHub

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.1.0.

## GitHub pages

Visit the site at [GitHub pages](https://signalerki.github.io/covid-forecasts)

## Aktuell

### TODO

#### Misc

- ~~axisLabel überlappen bei schmalem display~~
- ~~No forecasts available in legende datasource~~
- Die vertikalen Linien im Plot sollten immer auf den Samstagen liegen. _krieg ich nicht hin_
- ~~Die Farbsymbole in der Legende müssen besser sichtbar sein. Entschuldige das Hin und Her, aber wir würden gern mal sehen, wie es aussieht, wenn man die Punkte komplett in der jeweils dunklen (also nicht transparenten) Farbe ausfüllt. Die Unterscheidung Beobachtet vs Forecast ist dann halt nur durch grau vs farbig gegeben.~~
- ~~Null-Werte werden in Mousetips der Karte nicht gezeigt (z.B. inc death Brandenburg)~~
- ~~Etwas mehr vertikaler white space um "German and Polish COVID-19 ForecastHub" herum sowie zwischen den Map + Bedienelementen oben und Legende + Plot unten~~
- ~~Höhe des Plots ändert sich mit Target-Auswahl. Sollte besser konstant sein.~~
- Evtl. die Liste der Modelle scrollbar machen, damit man dafür nicht die gesamte Seite scrollen muss. Deswegen ändert sich vermutlich auch die Höhe des Plots? _auf kleinen displays muss eh gescrollt werden. dann hat man ne scrollbar in der scrollbar und das ist immer ziemlich hässlich. soll ich das trotzdem machen?_
- Replace the A in the small logo shown in the tab header by something else (F?) _das ist das angular standard icon_
- ~~Cum. Deaths / Inc. Deaths anstatt Death (Bei der Target-Auswahl und im Plot bei der Y-Achse). In den csv Files ist das ohne “s”, aber hier macht es mehr Sinn mit~~
- ~~“Prediction Interval” anstatt “Confidence Interval”~~
- ~~In der Tutorial-Variante sind manche Dinge etwas gestaucht~~
- ~~“Selection: None All Ensemble” linksbündig und “Selection” so schreiben wie die anderen Labels (Location etc), d.h. ohne Rahmen~~
- ~~Ersetze “Date: Oct 5, 2020” unten durch “Last update: Oct 5, 2020”.~~
- ~~Das Gelb (siehe Screenshot) ist zu hell, das muss aus der Farbpalette raus~~
- ~~Models originally based on jhu data bzw. ecdc data -> JHU data bzw. ECDC data.~~
- ~~“Shift models to” -> “Shift forecasts to”~~
- ~~“ECDC/RKI/MZ” und “JHU” -> “Truth ECDC/RKI/MZ” und “Truth JHU” (haben glaube ich im Gespräch letztes Mal erst entschieden, das “Truth” weg zu lassen, hätten es jetzt aber doch gern).~~
- ~~Außerdem wollen wir ungern das selbe grau verwenden wie bei den klickbaren Oberflächen. Vorschlag: gleicher Farbhintergrund wie bei „Models originally based on“ und dazu ein grauer Rahmen um die Zelle wie jetzt bei „Selection“~~
- ~~Wir sehen “Show forecasts by” eher als Experten-Feature und würden es deswegen vorziehen, wenn das Datum in der linken und “Show forecasts by” in der rechten Spalte gezeigt wird (selbst wenn das etwas gegen die Leserichtung geht).~~

## 09.10.20

### TODO

#### Misc

- ~~Polen bekommt population (gucken ob alles geht)~~
- ~~Settings in zwei Spalten auf großen Monitoren (siehe Layout googledoc)~~
- ~~Titel: Datum raus + 'German and Polish COVID-19 ForecastHub' + eigene Zeile~~
- ~~province drop down (none + 'national level')~~
- ~~umbennen province -> region~~
- ~~Footer mit Max ForecastDate als Stichtag~~
- ~~Ränder wieder rund~~
- ~~standard selection: all~~
- ~~Formatierung der Datenquellenname~~
  - ~~ECDC: ECDC/RKI/MZ~~
  - ~~jhu: JHU~~

#### Plot

- ~~Datumsformat im Plot YYYY-MM-DD~~
- ~~colorpalette für modelle = [palette](https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=11)~~
- ~~datazoom default = [MaxforeCastDate - 10 wochen, Ende];~~
- ~~YAchsenTitel = target~~
- ~~Bei horizon nur noch den target point (z.B. wk 3 ahead) anzeigen~~
- ~~Tooltip: Forecasts einrücken + hintergrund weniger opacity + shapes umranden?~~
  - ~~Bei horizon nur das '3wk ahead' (auswahl) anzeigen~~
- ~~Symbole im plot und legende dickerer Rand~~
- ~~Forecast Symbole im Plot weiß ausfüllen anstatt transparent~~
- ~~ForecastArea heller~~
- ~~observed ForecastPoints nur der letzte wird angezeigt~~

#### Map

- ~~email irgendwo anlegen und account auf stadia registrieren für tiles~~
- ~~Karte in Graustufen einfärben, nicht aktives Land nur umranden, ohne füllung~~
- ~~Karte ohne Legende und Caption mit Target und ist Observed~~
- Shapes mit in App
- ~~Tooltip mit `${Decimal(value, 4)} pro 100.000 Einwohner`~~

## 02.10.20

### Ideen

- Datasource data filtern nach forecastDate

### Fragen

- In welchem Format sollen Datumswerte dargestellt werden?
- Wonach sollen die Bundesländer/Provinzen eingefärbt werden? Aktuelle nach ECDC Datenquelle.
  - Alternativen: Auswahl Datenquelle (durch User), Mapping zwischen Land und Datenquelle
- Wenn StadiaTiles verwendet werden sollen, dann muss ein [Account](https://stadiamaps.com/pricing/) angelegt werden
- Welche Farben sollen die Modelle bekommen? Palette oder Regeln (name === 'xxx' => rot), Hybrid (erst regel, dann palette)?
- Soll der Zoom des Charts am anfang im [0-100] sein?

## 23.09.20 Meeting ForecastHub

### TODOs

- ~~Anzeige, wenn keine Daten vorhanden~~
- ~~Einfärbung der Karte nach gewähltem target (cum/inc cases/death) + Legende in Karte (Wünsche bezüglich der colorscale?)~~
  - ~~sowas wie inzidenz (durch einwohner)~~
  - ~~farben linear von gelb nach rot/dunkelrot~~
- ~~Tooltip Chart~~
- Forecast Evaluation
- ~~Play / Pause button to animate forecastDate~~
- ~~Responsiveness (small devices / look and feel)~~

### Offene Fragen

- ~~Sollen alle Modelle oder nur die mit Daten angezeigt werden (Legende)~~
  - ~~Modelle via target und location bestimmen. eingrauen, wenn keine daten da~~
- ~~Soll es weitere Seite geben? About, Contributors, Data, etc...~~
  - ~~Ja, eine mit Tutorial~~
  - ~~Team: Wir und Ihr zusammen ein Team~~
  - ~~Data: Quellen und Methoden~~
  - ~~Link Github repo im header und im footer~~
- ~~Gibt es eine preferierte Quelle für Geojsons/Shapes, sollen die von 'irgendwo' geladen werden oder mit ins repo gepackt?~~
  - ~~Mit ins Repo packen~~
- ~~Modelle einzeln shiften? NEIN golbaler schalter, geshiftete modelle bekommen symbol der datasource~~
- ~~Werden zukünftig noch weitere Datenquellen folgen, wenn ja: Soll das dynamisch bzw via config gehandelt werden oder kann jmd typescript/angular und passt das an?~~
  - ~~nur eine weitere Datenquelle DIVI~~
- ~~Habt ihr ein Logo oder Farben (corporate identity stuff)? NEIN~~
  - ~~Könnte die Seite auch in einem dunkel Theme sein?~~

### Wünsche

- ~~Drei knöpfe Original, JHU, ECDC. Modelle nicht einzeln mappen~~
- ~~Alle zahlen als Int anzeigen~~
- ~~Erklärungstexte evtl. Tour (js) wenn nicht zu aufwendig~~
- ~~Forecast-Punkte ohne fill, legende bleibt wie sie ist~~
- ~~Den Bereich vor der ForecastDate-Linie Grau hinterlegen~~
- ~~Linesymbols größer machen~~
- ~~Alle, None, Ensemable um Blacklisting der Modelle zu steuern~~

- ~~Location ist pflicht. NONE ist nicht erlaubt~~
  - ~~location via url steuerbar~~

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
