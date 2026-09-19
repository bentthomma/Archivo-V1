# Archivo Web 2.2 — ohne Anmeldung

## Veröffentlichen

Diese ZIP ist eine eigenständige Web-Version, kein Update für Archivo.exe.
Bei Vercel Drop hochladen, Projektname wählen, Deploy. Keine Datenbank und keine
Umgebungsvariablen erforderlich. Archivo hat keinen Login. Ein Vercel-Konto wird
nur für die Veröffentlichung benötigt.

Projekt-Einstellungen, falls abgefragt:
- Framework: Other
- Build Command: leer (Override aktiv)
- Install Command: leer
- Output Directory: .
- Startseite: index.html

vercel.json ist enthalten. In der ZIP liegt index.html direkt in der Wurzel.
Keine alten EXE-Dateien, persönlichen Backups oder data-Ordner mit hochladen.
Für Updates dasselbe Vercel-Projekt verwenden: ein neuer Drop erzeugt ein neues
Projekt und damit möglicherweise eine andere Adresse mit leerem Browserspeicher.

## Speichern

Die App selbst arbeitet ohne Backend und ohne Anmeldung. Notizen, Ordner und
Anhänge werden in IndexedDB gespeichert — getrennt je Gerät, Browserprofil und
Website-Adresse. Kein automatischer Abgleich zwischen Handy und Computer.
Die Anwendung lädt keine Notizinhalte/Anhänge zu Vercel hoch. Personen mit Zugriff
auf dein entsperrtes Browserprofil können das Archiv lesen. Keine App-Verschlüsselung.
Die Oberfläche ist öffentlich; noindex ist kein Zugriffsschutz.

Warte auf „Im Browser gespeichert“. Normales Speichern passiert nach einer kurzen
Eingabepause automatisch. Unter „Speicher & Sicherungen“ kann dauerhafter Speicher
beim Browser angefragt werden. Die Entscheidung liegt beim Browser.

Die Daten sind NICHT in einem frei sichtbaren data-Ordner und NICHT in der Cloud.
Websitedaten nicht ohne Backup löschen, keinen privaten/Inkognito-Modus verwenden.
Regelmässig vollständige ZIP-/JSON-Backups ausserhalb des Browsers aufbewahren.
Bei Geräte-, Browser- oder Domainwechsel Datenbackup exportieren und importieren.

## Bestehende Notizen übernehmen

Aus der bisherigen EXE ein JSON- oder ZIP-DATENBACKUP exportieren und in der neuen
Web-Version über „Backup importieren“ laden. Nicht die Programm-ZIP importieren.
Der Import ERSETZT das Zielarchiv; er führt nicht zwei Archive zusammen. Der jetzige
Zielstand wird vorher lokal gesichert. Alte Originaldaten bis zur Kontrolle behalten.

## Handy / Offline

Website am Handy öffnen. Unter „Als App öffnen“ stehen Installationshinweise.
Manifest und Service Worker zum Bereithalten der Oberfläche sind enthalten.
Offline-Zugriff erst nach erfolgreichem ersten Laden über HTTPS möglich; im echten
Zielbrowser prüfen. Kein laufender PC-Server notwendig, keine native APK oder IPA.
Bei zukünftigen Code-Updates die CACHE-Version in sw.js erhöhen. Alte Tabs schliessen,
damit ein neuer Service Worker aktiv werden kann; während Eingaben kein erzwungenes Update.

## Grenzen

25 MiB pro Anhang, 100 MiB Anhänge pro Notiz, 100 Anhänge pro Notiz, 256 MiB Import.
Browser-Export maximal 180 MiB unterschiedliche Dateiinhalte. 20 lokale Snapshots,
auch manuelle zählen dazu. Alte Originaldateien bleiben zur Wiederherstellung
aufbewahrt und belegen weiterhin Speicher. Keine automatische Dateibereinigung.

## Vor produktiver Nutzung

Ordner + zwei Notizen + Bild/Datei speichern, Browser ganz schliessen, neu öffnen
und prüfen. Backup herunterladen und in einem separaten Test-Browser importieren.
Alte Daten und unabhängiges Backup behalten. Kein Live-Vercel- oder physischer
Smartphone-Test ausgeführt; siehe PRUEFBERICHT.md.

Vollständige Anleitung: briefing.html.
Quellcode: app.js (Oberfläche), storage.js (IndexedDB), zip.js (Datensicherungen).
Keine nachzuladenden Drittanbieter-Bibliotheken, keine Build-Installation nötig.

Offizielle Dokumentation, abgerufen am 19.09.2026:
https://vercel.com/docs/drop
https://vercel.com/docs/builds/configure-a-build
https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
