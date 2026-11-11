# Kulinna Artistic Tools

KAT ist eine Werkzeugsammlung von kulinna.art für Windows und den Browser. Jedes Werkzeug hat eine eigene Seite und eigene JavaScript-Module.

## Colors (KAT-C)

**Harmony Selector.** Greife den Rand der Scheibe und drehe ihn mit Maus oder Finger. Der Selektor rastet auf den zwölf Positionen des historischen RYB-Kreises ein. Fünf Harmonien, gleich große Fenster und der neutrale Vergleich helfen beim Vergleichen der sRGB-Annäherungen an die Pigmentfarbtöne. In der analogen Harmonie bleibt eine Primärfarbe der Anker.

**Freier Picker.** Setze die Pins auf den drei HSL-Bahnen für Farbton, Sättigung und Helligkeit. Für direkte Kanalwerte wechsle zu RGB. HEX bleibt verfügbar.

**Palette & Kontrast.** Bearbeite Hintergrund, Schrift, zwei Primärakzente und vier Diagrammfarben. Die kulinna.art-Palette ist die Ausgangsbasis. Tonstufen, Layout-Vorschau und Textkontrast zeigen, wie die Rollen zusammenwirken. Die Palette speichert sich im App-Profil und lässt sich als CSS-Variablen kopieren.

**kulinna.art-Picker.** Wähle Hintergrund, Schrift und einen ersten Akzent. Zwei Kandidaten bei +120° und −120° bieten denselben HSL-Sättigungs- und Helligkeitswert. Die Diagrammfarben liegen bei +30°, −30°, +60° und −60° mit gleicher Helligkeit und 20 Prozentpunkten weniger Sättigung. Der Mindestwert für Sättigung ist 0 %. Übergib das Ergebnis zur Vorschau an Palette & Kontrast.

## Windows

Öffne den letzten erfolgreichen Lauf unter [Windows x64](https://github.com/richardkulinna/kat/actions/workflows/windows.yml) und lade das Artefakt `KAT-Windows-x64` herunter. Entpacke das ZIP und starte `KAT-Windows-x64.exe`. Die portable App ist unsigniert.

## Oberfläche

Markenweiß und Navy bilden den Rahmen, Pink kennzeichnet Hauptüberschriften und Blau dient der Bedienung. Montserrat und Inter folgen der kulinna.art-Designvorgabe v1.9.0. Die Arbeitsfläche ordnet Scheibe und Bedienelemente auf breiten Ansichten nebeneinander und auf schmalen Ansichten untereinander. Ausgewählte Farben und ihre Werte bleiben auch ohne Farbsehen unterscheidbar.

## App öffnen und erweitern

Die Browser-Version benötigt keinen Build. Stelle das Repository über einen statischen HTTP-Server bereit und öffne dessen Startseite. In einer GitHub-Entwicklungsumgebung wie Codespaces kannst du im Repository `python -m http.server 8000` starten und den weitergeleiteten Port öffnen.

- `index.html` führt zu den Werkzeugen.
- `styles.css` und [DESIGN.md](DESIGN.md) definieren den gemeinsamen Rahmen.
- `colors/` enthält die Oberfläche und die Picker-Module. Weitere Picker erhalten dort ein eigenes Modul. Neue Werkzeuge erhalten ein eigenes Verzeichnis und einen Eintrag im Werkzeugverzeichnis.
- `node colors/harmony.test.mjs` prüft die Keyes-Winkel und die Orientierung der Fenster.

## Quellen

- [Arthur H. Keyes, Color chart, US2229025A](https://patents.google.com/patent/US2229025A/en)
- [Keyes & Co., Anzeige für den Color Harmony Selector in Warp & Weft](https://www2.cs.arizona.edu/patterns/weaving/periodicals/ww_03_11.pdf)
