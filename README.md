# Kulinna Artistic Tools

KAT ist eine Werkzeugsammlung von kulinna.art. Die statische HTML-App verwendet gemeinsame Typografie, Farben und Navigation. Jedes Werkzeug erhält eine eigene Seite und eigene JavaScript-Module.

## Colors (KAT-C)

**Harmony Selector.** Der Farbkreis nach Arthur H. Keyes ordnet zwölf Pigmentfarbtöne im Abstand von je 30 Grad. Wähle eine Harmonie und drehe die Auswahl schrittweise. Gleich große Fenster zeigen nur die ausgewählten Töne in ihrer relativen Lage. Die übrigen Töne bleiben verdeckt. Eine neutrale Vergleichsansicht stellt die ausgewählten Farben direkt nebeneinander. Die HEX-Werte sind digitale sRGB-Annäherungen an die benannten Pigmentfarbtöne.

**Freier Picker.** Wähle eine beliebige sRGB-Farbe oder gib ihren HEX-Wert ein. Die App zeigt HEX und RGB und ermöglicht das Kopieren.

## Oberfläche

Markenweiß und Navy bilden den Rahmen, Pink kennzeichnet Hauptüberschriften und Blau dient der Bedienung. Montserrat und Inter folgen der kulinna.art-Designvorgabe v1.9.0. Die Arbeitsfläche ordnet Scheibe und Bedienelemente auf breiten Ansichten nebeneinander und auf schmalen Ansichten untereinander. Ausgewählte Farben und ihre Werte bleiben auch ohne Farbsehen unterscheidbar.

## App öffnen und erweitern

Die App benötigt keinen Build. Stelle das Repository über einen statischen HTTP-Server bereit und öffne dessen Startseite. In einer GitHub-Entwicklungsumgebung wie Codespaces kannst du im Repository `python -m http.server 8000` starten und den weitergeleiteten Port öffnen.

- `index.html` führt zu den Werkzeugen.
- `styles.css` und [DESIGN.md](DESIGN.md) definieren den gemeinsamen Rahmen.
- `colors/` enthält die Oberfläche und die beiden Picker-Module. Weitere Picker erhalten dort ein eigenes Modul. Neue Werkzeuge erhalten ein eigenes Verzeichnis und einen Eintrag im Werkzeugverzeichnis.
- `node colors/harmony.test.mjs` prüft die Keyes-Winkel und die Orientierung der Fenster.

## Quellen

- [Arthur H. Keyes, Color chart, US2229025A](https://patents.google.com/patent/US2229025A/en)
- [Keyes & Co., Anzeige für den Color Harmony Selector in Warp & Weft](https://www2.cs.arizona.edu/patterns/weaving/periodicals/ww_03_11.pdf)
