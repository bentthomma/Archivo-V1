# Archivo Web 2.2 — Prüfbericht

Stand: 19. September 2026. Das Paket wurde erstellt, NICHT in einem Vercel-Konto veröffentlicht.

## Prüfmethodik und Grenzen

Der verwaltete Chromium-Browser blockiert echte Top-Level-URL-Navigation, auch auf
localhost. Diese Richtlinie wurde nicht verändert. agent-browser war nicht verfügbar;
ein Installationsversuch scheiterte an fehlender Netzwerkerreichbarkeit. Tests liefen
mit Node.js und Playwright/Chromium gegen einen bewusst begrenzten transaktionalen
IndexedDB-Testadapter. DOM und Anwendungscode wurden im Browser-Speicher geladen.
Für die opaque Test-Origin wurden Crypto-Digest und Browserpräferenzen im Test ersetzt;
Service-Worker-Registrierung wurde im Test ausgesetzt. Der ausgelieferte Code enthält
keine Testadapter, Testbrücke oder Mock-Daten.

Diese Tests belegen Anwendungsabläufe, Validierung, Konflikt- und Importlogik unter
simulierten Speichervorgängen. Sie belegen NICHT native IndexedDB-Dauerhaftigkeit,
reale Browser-Quota-Entscheidungen, Crash-/Stromausfall-Sicherheit, Live-CSP von Vercel,
Domain-/Browserwechsel, tatsächliche Installation oder Service-Worker-Offline-Betrieb.
Kein echter Windows-/Android-/iPhone-Gerätetest, kein unabhängiger Sicherheitstest.

## Speicher- und Archivtests — 22 bestanden

- Storage initializes empty, without login or network
- Folder and two notes retain their folder IDs
- Original attachment bytes, image and download metadata
- Editing without re-upload keeps attachment bytes
- Stale note revision rejected without replacing current note
- Concurrent same-revision writes: exactly one succeeds
- Folder self-cycle rejected atomically
- Quota failure leaves previous archive intact
- JSON and ZIP exports include all attachments
- JSON round-trip restores notes and binary attachments
- ZIP round-trip restores complete archive
- Corrupt or incomplete JSON import leaves archive unchanged
- Corrupt ZIP and wrong program ZIP rejected
- Manual snapshots restore previous contents
- Trash / restore / purge preserve other notes
- Deleting folder preserves notes in Unfiled
- Draft writes and expected-token deletion
- Version 1 legacy JSON import accepted
- Invalid folder reference in import rejected
- Independent module instance reopens same simulated database
- External URLs cannot be fetched through local storage adapter
- CRC32 standard reference vector

## Oberflächenprüfungen — 10 bestanden

- Opens directly without login or pairing
- Folder overview shows both saved note cards, not only badge
- Attachment and image retained after save and editor reopen
- Attachment download returns original bytes
- Search finds content inside saved notes
- Storage and backup dialog opens without server
- Mobile instructions have no pairing/login
- 390px mobile overview has no horizontal overflow
- Native browser DEFLATE decompression imports Python ZIP with checksums
- No HTTP data requests or uncaught JavaScript errors during these flows

Desktop-Ansicht bei 1440 px und mobile Ansicht bei 390 px wurden als Screenshots
kontrolliert. Keine ungefangenen JavaScript-Fehler in den geprüften Abläufen.
Keine HTTP-Datenanfragen während der simulierten Notiz-/Dateibearbeitung.
ZIP-Export zusätzlich mit Python zipfile geöffnet und dessen CRC-Prüfung bestanden.
Ein Python-DEFLATE-ZIP wurde mit nativer Browser-DecompressionStream-Implementierung
entpackt; dieser Teil verwendet keinen Dekompressionsmock. CRC32-Referenzvektor geprüft.

Syntaxprüfungen: app.js, storage.js, zip.js und sw.js ohne Befund.
Paket: flache statische Website, index.html und vercel.json in der ZIP-Wurzel,
keine EXE, keine persönlichen Archivdaten und keine ausgelieferten Testdaten.

## Erforderlicher Zieltest

Nach dem Upload an einer festen Produktionsadresse zwei Notizen in einem Ordner
anlegen, Bild/Datei hinzufügen, „Im Browser gespeichert“ abwarten, den Browser
vollständig beenden und wieder öffnen. Inhalte und Dateibytes prüfen. Vollständiges
Backup herunterladen, im separaten Browser importieren. Erst dann produktive Inhalte
übernehmen; Originaldaten und ein unabhängiges Backup weiter aufbewahren.
