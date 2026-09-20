# Archivio — M2 Design & Motion

Version: `3.0.0-design.1` · Stand: 20.09.2026

**Interaktive Designstudie, kein produktives Archiv.**
Die freigegebenen Light-/Dark-Referenzen sind in eine bedienbare Oberfläche übertragen.
Nur die Theme-Einstellung wird unter `archivio-m2-theme` gespeichert. Alle Notizen,
Ordner, Favoriten, Checklisten und Anhänge sind synthetische Sitzungsdaten und werden
bei Neuladen zurückgesetzt. Keine IndexedDB, kein Zugriff auf das alte Archiv,
keine Verbindung zu Supabase, keine Uploads, keine externen Schriften oder Bildabrufe.

## Ausprobieren

- Hell/Dunkel oben rechts; Systemmodus in den Einstellungen.
- `Strg/⌘ + K`: Suche, Pfeiltasten, Enter, Escape.
- `Neu`: Auswahlmenü, Notiz- und Ordnerdialog.
- Auf ein Bild klicken: Vergrösserung aus der Ausgangskachel, weiterer Zoom, Rückkehr.
- Im Notizeditor `Fokusmodus`: Notizfläche vergrössern und wieder verkleinern.
- Einstellungen → Bewegung erleben: interaktiver Motion-Spielplatz.
- Mobil: Bottom Sheet am Griff nach unten ziehen; Listen und Detailansicht sind getrennt.
- Die Systemeinstellung „Bewegung reduzieren“ wird respektiert. Ein eigener Schalter
  kann Bewegung zusätzlich abschalten, aber keine aktive Systemeinstellung aufheben.

## Implementierung und Abgrenzung

M2 ist bewusst eine separat veröffentlichbare Design-/Interaktionsreferenz in HTML,
CSS und JavaScript mit nativer Web Animations API. Ein leicht gedämpfter, gesampelter
Federverlauf animiert Bild-/Panelgeometrie; Microinteractions verwenden CSS.
Es sind keine externen Laufzeitpakete erforderlich. Die in M1 geplante React/TypeScript-
Anwendungsarchitektur mit echter Datenhaltung ist damit **noch nicht umgesetzt**.
Der Prototyp ersetzt diese Architektur nicht, sondern fixiert Layout, Tokens,
Interaktionszustände und Motion-Verhalten vor dem funktionalen Ausbau.

Dateien:
- `index.html`: Dokumenthülle und Reihenfolge der lokalen Ressourcen.
- `theme.js`: frühe Darstellungsauswahl, ausschliesslich Theme-Präferenz.
- `design.css`: semantische Farbtokens, Responsive Layout, Dialoge, reduzierte Bewegung.
- `design.js`: Demo-Zustände, Ereignisse, Fokussteuerung und unterbrechbare Animationen.
- `artwork.js`: Bilddetails aus den vom Nutzer freigegebenen generierten Referenzen.
- `leaf.svg`: neu gezeichnetes Blattzeichen als Favicon.
- `vercel.json`: statische Veröffentlichung, CSP, keine Build-Abhängigkeiten.

PDF-Dateikarten, Versionen und zukünftige Archivfunktionen sind sichtbar als
Design-/Informationszustände gekennzeichnet, nicht als bereits fertige Speicherung.
Echte private Dateien sollen nicht in diesem Prototyp erfasst werden.

## Prüfung

16 Prüfgruppen bestanden in echtem Chromium-DOM, darunter zwei Demo-Notizen im neuen
Ordner, Suchnavigation, ungefährliche Textausgabe, Fokusvergrösserung/Rückkehr,
Bildzoom/Rückkehr, Tastatur-Fokuszyklus, sechs schnelle Öffnen/Schliessen-Sequenzen,
neun Bildschirmbreiten (320–1920 px), mobiler Sheet-Ziehgriff, reduzierte Bewegung.
Keine ungefangenen JavaScript-Fehler in diesen Abläufen.

Die verwaltete Browserumgebung blockiert URL-Navigation. Deshalb wurden **unveränderte
Release-Dateien** per `set_content`, `add_style_tag` und `add_script_tag` aus dem lokalen
Verzeichnis geladen. Keine Browserrichtlinie wurde verändert; kein Code wurde für den
Test durch eine vereinfachte Implementierung ersetzt. Die Testseiten verwenden keine
simulierte Speicherung. Sie prüfen die tatsächliche DOM- und Animationslogik, aber nicht
die vollständige Vercel-Auslieferung, reale Theme-Persistenz oder HTTP/CSP-Integration.

Kein Firefox-/WebKit-Test und kein Test auf einem physischen iPhone/Android-Gerät.
Kein garantierter 60/120-Hz-Leistungswert. Renderingqualität, Touch-Tastatur und reale
Frameraten müssen auf den Zielgeräten separat geprüft werden.

Die herunterladbare Quellcode-ZIP enthält `tests/`, Screenshots und `qa/results.json`.
Ein öffentliches Preview enthält nur die App-Ressourcen und diese Dokumentation.

## Veröffentlichung

Nur in einem separaten Testzweig. Keine Zusammenführung mit `Archivo-Vercel-2.2`.
Die Vercel-Git-Integration veröffentlicht den Testzweig automatisch. Der vorhandene
Vercel-Zugriffsschutz wird nicht verändert. Eine Preview-Freigabe ist keine Freigabe
für Änderungen an der bisherigen Live-App.

## Quellen für die Bewegungs- und Bedienungsprinzipien

- https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

Die konkreten Übergangsparameter sind eigene Designentscheidungen, keine exakte
Reproduktion von Apples internen Animationsparametern.
