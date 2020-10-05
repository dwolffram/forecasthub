# ForecastHub

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.1.0.

## Aktuell

### TODO

#### Misc

- Polen bekommt population (gucken ob alles geht)
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

- Datumsformat im Plot YYYY-MM-DD
- colorpalette für modelle = [palette](https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=11)
- datazoom default = [MaxforeCastDate - 10 wochen, Ende];
- YAchsenTitel = target
- Tooltip mit `${Decimal(value, 4)} pro 100.000 Einwohner`
- Tooltip: Forecasts einrücken + hintergrund weniger opacity + shapes umranden?
  - Bei horizon nur das '3wk ahead' (auswahl) anzeigen
- Symbole im plot und legende dickerer Rand
- Forecast Symbole im Plot weiß ausfüllen anstatt transparent
- ForecastArea heller
- observed ForecastPoints nur der letzte wird angezeigt

#### Map

- email irgendwo anlegen und account auf stadia registrieren für tiles
- Karte in Graustufen einfärben, nicht aktives Land nur umranden, ohne füllung
- Karte ohne Legende und Caption mit Target und ist Observed
- Shapes mit in App

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
- Gibt es eine preferierte Quelle für Geojsons/Shapes, sollen die von 'irgendwo' geladen werden oder mit ins repo gepackt?
  - Mit ins Repo packen
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

## GitHub pages

Visit the site at [GitHub pages](https://signalerki.github.io/covid-forecasts)

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
