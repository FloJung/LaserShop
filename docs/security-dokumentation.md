# Security-Dokumentation

## 1. Zweck dieses Dokuments

Dieses Dokument beschreibt die sicherheitsrelevanten Mechanismen des Projekts. Der Schwerpunkt liegt auf:

- serverseitiger Validierung im Checkout
- Absicherung von Datei-Uploads
- Trennung zwischen Client-Input und vertrauenswuerdigen Serverdaten
- Rollen- und Zugriffslogik fuer Admin, Storefront und Firebase
- aktuellen Schutzmassnahmen gegen Preismanipulation, Produktmanipulation und Upload-Missbrauch
- Security Event Logging, Attack Detection und Admin-Alerts

Das Dokument beschreibt den aktuellen Stand des produktiven Codes.

## 2. Sicherheitsziele

Die zentrale Sicherheitsidee des Projekts lautet:

- Der Client ist niemals die Quelle der Wahrheit fuer sicherheitskritische Daten.
- Preise, Produktdaten, Variantenstatus und Upload-Freigaben werden serverseitig entschieden.
- Firestore und Storage werden so verwendet, dass reservierte Uploads, Checkout-Daten und Bestellungen nachvollziehbar und kontrollierbar bleiben.

Konkret soll nach dem aktuellen Stand gelten:

- keine Bestellung mit manipuliertem Produkt oder manipulierten Varianten
- keine Umgehung von Pflicht-Personalisierungen
- keine Preisberechnung auf Basis ungepruefter Clientdaten
- keine Verwendung von reservierten, unpassenden oder bereits verknuepften Uploads
- keine SVG-basierten XSS-Risiken ueber Uploads
- kein unbegrenzter Missbrauch von Checkout- oder Upload-Endpoints
- keine Mehrfachverwendung desselben Uploads durch parallele Requests
- Angriffe werden serverseitig sichtbar, gruppiert und im Admin dargestellt

## 3. Sicherheitsprinzipien im Projekt

### 3.1 Server ist die einzige Wahrheit

Sicherheitskritische Felder werden nicht aus dem Client vertraut uebernommen. Dazu gehoeren insbesondere:

- `price`
- `name`
- `subtitle`
- `configurations`
- `designJson`

Der Client darf Eingaben liefern, aber der Server entscheidet:

- welches Produkt existiert
- welche Variante aktiv ist
- welcher Preis gilt
- welche Optionen erforderlich sind
- welche Uploads verwendet werden duerfen

### 3.2 Shared Validation statt duplizierter Logik

Die zentrale Validierungslogik liegt in:

- `shared/catalog/security.ts`

Diese Datei wird sowohl von Next.js-Serverpfaden als auch von Firebase Functions verwendet. Dadurch ist sichergestellt, dass aktive und Legacy-Pfade dieselben Sicherheitsregeln anwenden.

### 3.3 Ablehnen statt reparieren

Sicherheitskritische Inkonsistenzen werden im Regelfall nicht stillschweigend korrigiert, sondern abgelehnt. Beispiele:

- unbekannte Produkte oder Varianten
- inaktive Varianten
- ausverkaufte Varianten
- fehlende Pflichtoptionen
- ungueltige Upload-Referenzen
- SVG-Dateien

## 4. Sicherheitsrelevante Komponenten

Die wichtigsten sicherheitsrelevanten Dateien sind:

- `shared/catalog/security.ts`
- `shared/catalog/schemas.ts`
- `shared/security-monitoring.ts`
- `lib/server/shopify.ts`
- `lib/server/security-monitoring.ts`
- `app/api/checkout/create/route.ts`
- `app/api/checkout/create-cart/route.ts`
- `functions/src/index.ts`
- `functions/src/lib/orders.ts`
- `functions/src/lib/security-monitoring.ts`
- `lib/firebase/uploads.ts`
- `storage.rules`
- `app/api/admin/products/[productId]/route.ts`
- `lib/server/catalog-source.ts`
- `app/admin/security/page.tsx`

## 5. Checkout-Sicherheit

## 5.1 Betroffene Checkout-Pfade

Es gibt zwei relevante Checkout-Welten:

1. Aktiver Shopify-Checkout
2. Legacy-Firebase-Checkout

Beide verwenden inzwischen die gemeinsame serverseitige Sicherheitsvalidierung.

### Aktiver Checkout

Relevante Dateien:

- `app/api/checkout/create/route.ts`
- `app/api/checkout/create-cart/route.ts`
- `lib/server/shopify.ts`

### Legacy-Checkout

Relevante Dateien:

- `functions/src/index.ts`
- `functions/src/lib/orders.ts`

## 5.2 Zentrale Checkout-Validierung

Die zentrale Funktion ist:

- `validateCheckoutPayload(...)`

Fuer den Shopify-Checkout wird zusaetzlich verwendet:

- `validateShopifyCheckoutPayload(...)`

Beide Funktionen validieren serverseitig gegen Firestore-Produktdaten und gegen Upload-Dokumente.

## 5.3 Was im Checkout serverseitig validiert wird

Die Validierung deckt folgende Punkte ab:

- Produkt existiert
- Produkt ist aktiv
- Variante existiert
- Variante ist aktiv
- Variante ist auf Lager, sofern Lagerbestand getrackt wird
- Waehrung ist erlaubt
- Menge ist im erlaubten Rahmen
- Optionen existieren fuer das Produkt
- keine unbekannten oder doppelten Optionen pro Line
- Pflichtoptionen sind gesetzt
- Text-, Textarea-, Checkbox- und Select-Werte entsprechen dem erwarteten Typ
- Select-Werte sind nur gueltig, wenn sie aktiv und im Katalog vorhanden sind
- Upload-Referenzen existieren und sind gueltig
- Uploads sind noch nicht an eine Bestellung gebunden
- Preise werden serverseitig berechnet

## 5.4 Was aus dem Client nicht vertraut wird

Der Client darf keine sicherheitskritischen Bestelldaten bestimmen. Das betrifft insbesondere:

- Produktname
- Untertitel
- Preis
- Konfigurationsinhalt ohne Serverpruefung
- Designdaten als Quelle der Preis- oder Produktwahrheit

Im aktiven Shopify-Checkout werden deshalb nur validierte Zeilen weiterverarbeitet. Die Shopify-Erzeugung basiert auf serverseitig validierten Daten und serverseitigem Mapping.

## 5.5 Schutz gegen Pflicht-Option-Bypass

Pflicht-Personalisierungen werden serverseitig durchgesetzt. Wenn ein Produkt erforderliche Optionen hat und der Client diese nicht mitsendet, wird der Checkout abgelehnt.

Dadurch kann der Client Pflichtfelder im Frontend nicht einfach ueberspringen.

## 5.6 Schutz gegen Preismanipulation

Preise werden aus folgenden serverseitigen Quellen berechnet:

- Produktvariante
- Preisaufschlaege der Optionen
- Preisaufschlaege einzelner Select-Werte

Der Client darf keinen Endpreis vorgeben, der direkt akzeptiert wird.

## 5.7 Fehlerbehandlung

Sicherheitsrelevante Fehler werden als `CheckoutSecurityError` modelliert und von den Functions in kontrollierte `HttpsError`-Antworten ueberfuehrt.

Das Ziel ist:

- klare Fehlermeldungen fuer legitime Fehlerfaelle
- keine stillen Sicherheitsluecken
- konsistentes Verhalten zwischen Next.js-Serverpfaden und Firebase Functions

## 5.8 Rate Limiting fuer Checkout

Die aktiven Checkout-Routen besitzen serverseitiges Rate Limiting, das vor der eigentlichen Business-Logik greift.

Betroffene Routen:

- `app/api/checkout/create/route.ts`
- `app/api/checkout/create-cart/route.ts`

Aktuelle Limits:

- Checkout Buy Now: maximal 5 Requests pro Minute pro Identitaet
- Checkout Cart: maximal 5 Requests pro Minute pro Identitaet

Die Identitaet basiert primaer auf der IP-Adresse. Wenn spaeter eine User-ID in den Kontext gegeben wird, wird sie zusaetzlich in den Key aufgenommen.

Bei Ueberschreitung wird geantwortet mit:

- HTTP `429`
- `Too many requests. Please try again later.`

Wichtig: Das Next.js-Rate-Limit ist aktuell bewusst als In-Memory-Schutz umgesetzt. Das ist fuer den aktuellen Stand ein pragmatischer Basisschutz, aber kein voll verteilter Cluster-Schutz wie bei Redis.

## 6. Upload-Sicherheit

## 6.1 Grundprinzip

Dateien werden nicht direkt frei in Storage geschrieben. Stattdessen besteht der Upload-Prozess aus mehreren Schritten:

1. Client fordert eine Upload-Reservation an.
2. Der Server erstellt ein Upload-Dokument in Firestore.
3. Die Datei darf nur an den reservierten Storage-Pfad hochgeladen werden.
4. Storage Rules pruefen die Reservation gegen die Upload-Anfrage.
5. Vor Checkout oder Bestellverknuepfung wird die Datei serverseitig erneut geprueft.

## 6.2 Upload-Reservation

Die Reservation wird in Firebase Functions erzeugt ueber:

- `createUploadReservation`
- `createUploadReservationDocument(...)`

Im Upload-Dokument werden unter anderem gespeichert:

- `storagePath`
- `originalFilename`
- `mimeType`
- `fileSize`
- `reviewStatus`
- `ownerUid`
- `allowGuestUpload`

## 6.3 Storage Rules

Die Firebase Storage Rules in `storage.rules` pruefen bei reservierten Uploads:

- `request.resource` ist vorhanden
- Dateigroesse stimmt exakt mit der Reservation ueberein
- Groesse liegt unter dem Hard Limit
- `request.resource.contentType` stimmt mit dem reservierten `mimeType` ueberein
- reservierter Storage-Pfad stimmt exakt
- Upload ist noch im Status `pending_upload`
- Upload ist noch keiner Bestellung zugeordnet
- Gast oder Eigentuemer ist zum Upload berechtigt

Damit kann ein Client nicht einfach eine andere Datei an einen beliebigen Pfad schreiben.

## 6.4 Serverseitige Integritaetspruefung

Vor der Verwendung eines Uploads wird serverseitig geprueft:

- Datei existiert tatsaechlich im Storage
- Storage-Metadaten enthalten den erwarteten MIME-Type
- Storage-Metadaten enthalten die erwartete Dateigroesse
- Dateisignatur passt bei PNG, JPEG und WEBP zum deklarierten Typ

Die serverseitige Integritaetspruefung ist wichtig, weil Storage Rules nur den Upload-Vorgang kontrollieren, aber nicht jede spaetere Verwendung automatisch absichern.

## 6.5 Uploads in Bestellungen

Ein Upload darf nicht mehrfach frei wiederverwendet werden. Vor einer Verknuepfung mit einer Bestellung wird geprueft:

- Upload existiert
- Upload ist konsistent
- Upload ist noch nicht mit einer bestehenden Bestellung verknuepft

Anschliessend wird der Upload in einen bestellungsbezogenen Storage-Pfad verschoben und mit Order-Referenzen versehen.

## 6.6 Rate Limiting fuer Upload-Reservationen

Die callable Function fuer Upload-Reservationen besitzt ebenfalls ein serverseitiges Rate Limit.

Betroffene Function:

- `createUploadReservation`

Aktuelles Limit:

- maximal 10 Requests pro Minute pro Identitaet

Die Identitaet basiert auf:

- IP-Adresse
- zusaetzlich User-ID, falls vorhanden

Im Gegensatz zu den Next.js-Routen wird dieses Limit ueber Firestore verwaltet, damit es auch bei parallelen Function-Instanzen konsistent bleibt.

Bei Ueberschreitung wird geantwortet mit:

- `resource-exhausted`
- `Too many requests. Please try again later.`

Ziel dieses Limits:

- Vermeidung von Firestore- und Storage-Kostenangriffen
- Reduktion von Massen-Reservationen
- Schutz vor unnoetiger Serverlast

## 6.7 Atomare Upload-Verknuepfung

Die eigentliche Verknuepfung eines Uploads mit einer Bestellung erfolgt jetzt nicht mehr nur ueber ein einfaches Pruefen von `linkedOrderId == null`, sondern mit einer Firestore-Transaktion und einem Lock-Feld.

Verwendetes Feld:

- `lockedAt`

Der Ablauf sieht vereinfacht so aus:

1. Transaktion liest das Upload-Dokument.
2. Wenn `linkedOrderId` bereits gesetzt ist, wird abgelehnt.
3. Wenn ein frischer Lock existiert, wird abgelehnt.
4. Die Transaktion setzt `lockedAt`.
5. Erst danach wird die Datei kopiert.
6. Eine zweite Transaktion finalisiert die Verknuepfung und setzt:
   `linkedOrderId`, `linkedOrderItemId`, `linkedOptionId`, `reviewStatus = "linked"`
7. Das Lock wird entfernt.

Dadurch kann derselbe Upload nicht mehr parallel von zwei Requests erfolgreich verwendet werden.

Wenn ein Upload bereits gebunden wurde, lautet die klare Fehlermeldung:

- `Upload has already been used.`

Wenn ein Fehler waehrend der Verknuepfung auftritt, wird das Lock kontrolliert wieder freigegeben, solange die Verknuepfung noch nicht final abgeschlossen wurde.

## 6.8 Security Event Logging und Attack Detection

Das Projekt besitzt jetzt eine zusaetzliche Observability-Schicht fuer sicherheitsrelevante Vorgaenge.

Die zentrale Idee lautet:

- sicherheitsrelevante Vorfaelle werden nicht nur geblockt
- sie werden auch als Events in Firestore gespeichert
- wiederholte Muster werden zu Alerts aggregiert
- der Admin kann diese Muster direkt im Backend sehen

### Event Logging

Security-Events werden in der Collection `securityEvents` gespeichert.

Gespeichert werden unter anderem:

- Event-Typ
- gehashte IP
- optionale User-ID
- Request-Pfad
- User-Agent
- Grund
- Severity
- Zeitpunkt

Wichtig:

- IP-Adressen werden nicht im Klartext gespeichert
- stattdessen wird serverseitig ein SHA-256-Hash abgelegt

### Event-Typen

Aktuell werden insbesondere folgende Event-Typen erfasst:

- `rate_limit_hit`
- `checkout_security_error`
- `upload_rejected`
- `svg_upload_attempt`
- `invalid_product_attempt`
- `invalid_variant_attempt`
- `duplicate_upload_use`

### Wo Events entstehen

Die aktuelle Integration loggt Events unter anderem bei:

- Rate-Limit-Treffern in den Next.js-Checkout-Routen
- Checkout-Sicherheitsfehlern im aktiven Shopify-Checkout
- Checkout-Sicherheitsfehlern im Legacy-Firebase-Checkout
- SVG-Upload-Versuchen bei Upload-Reservationen
- Upload-bezogenen Sicherheitsfehlern
- Produkt- und Varianten-Manipulationsversuchen
- doppelter Upload-Verwendung

### Alert Engine

Wiederholte Events einer gehashten IP werden in `securityAlerts` aggregiert.

Die Engine verwendet aktuell folgende Regeln:

- `bruteforce_checkout`
  mehr als 10 `checkout_security_error` innerhalb von 5 Minuten
- `upload_abuse`
  mehr als 15 Upload-Events (`upload_rejected`, `svg_upload_attempt`) innerhalb von 10 Minuten
- `rate_limit_attack`
  mehr als 20 `rate_limit_hit` innerhalb von 2 Minuten

Ein bestehender Alert wird dabei aktualisiert statt mehrfach neu erstellt.

### Admin-Dashboard

Es gibt jetzt eine geschuetzte Admin-Seite:

- `/admin/security`

Die Seite zeigt:

- offene Alerts
- Top-Angreifer nach gehashter IP
- letzten Event-Feed

### Optionale Benachrichtigung

Wenn ein neuer Alert entsteht oder ein geschlossener Alert wieder geoeffnet wird, kann optional ein Discord-Webhook informiert werden.

Dafuer wird die Environment-Variable verwendet:

- `SECURITY_ALERT_DISCORD_WEBHOOK_URL`

## 7. SVG-Schutz

## 7.1 Hintergrund

SVG ist kein rein passives Bildformat. Es kann aktive Inhalte enthalten, zum Beispiel:

- Skripte
- Event-Handler wie `onload`
- externe Referenzen
- eingebettetes JavaScript

Wenn SVG spaeter unsicher gerendert wird, entsteht ein XSS-Risiko.

## 7.2 Aktuelle Entscheidung

Das Projekt verwendet die sichere Standardstrategie:

- SVG-Uploads sind komplett verboten.

Die zentrale Fehlermeldung lautet:

- `SVG uploads are not allowed for security reasons.`

## 7.3 Wo SVG blockiert wird

SVG wird an mehreren Stellen geblockt:

- bei der Upload-Reservation in Firebase Functions
- bei der serverseitigen Upload-Integritaetspruefung
- in den Storage Rules
- bei der Checkout-Validierung fuer alte oder manipulierte Upload-Referenzen
- in der Storefront-Ausgabe von `acceptedMimeTypes`
- in den Editor-Upload-Hinweisen und File-Inputs

Dadurch gilt:

- neue SVGs koennen nicht reserviert werden
- alte SVG-Reservations koennen nicht mehr hochgeladen werden
- alte SVG-Dokumente koennen nicht mehr in einem Checkout verwendet werden

## 8. Admin- und Katalog-Sicherheit

## 8.1 Admin-Zugriff

Admin-Routen werden serverseitig abgesichert. Fuer Admin-Endpunkte gilt:

- Session muss vorhanden sein
- Rolle muss Admin sein

Dadurch koennen Produktdaten, Taxonomien oder Bestellungen nicht allein ueber Client-Navigation manipuliert werden.

## 8.2 Produktoptionen und erlaubte MIME-Types

Upload-MIME-Types fuer Produktoptionen koennen zwar administrativ gepflegt werden, aber der Server bereinigt diese Daten zusaetzlich.

SVG wird beim Speichern und beim Ausliefern des Katalogs herausgefiltert. Das verhindert:

- versehentliches erneutes Freigeben von SVG im Admin
- inkonsistente Frontend-Inputs
- unterschiedliche Sicherheitsregeln zwischen Admin, Storefront und Checkout

## 9. Authentifizierung und Autorisierung

Die wichtigsten Rollenkonzepte sind:

- Gast
- Kunde
- Admin

Relevante Unterschiede:

- Gast-Uploads sind nur im Rahmen reservierter Uploads moeglich
- Admins duerfen Produktbilder und Produktdaten verwalten
- bestellbezogene Upload-Pfade sind nicht frei beschreibbar

Die eigentliche Rollenpruefung erfolgt serverseitig und in Firebase-Regeln, nicht nur im UI.

## 10. Bekannte Grenzen

Trotz der aktuellen Haertungen bleiben ein paar grundsaetzliche Grenzen bestehen:

- Diese Doku behandelt vor allem Business-, Upload- und Monitoring-Sicherheit, aber nicht vollstaendig Themen wie DDoS-Schutz auf Infrastruktur-Ebene oder Secret-Management.
- Das Checkout-Rate-Limit in Next.js ist aktuell In-Memory-basiert und daher bewusst als Basisschutz zu verstehen.
- Produktbilder fuer den Admin folgen einem separaten Pfad und sind nicht Teil der reservierten Kunden-Upload-Logik.
- Sicherheitsniveau haengt weiterhin davon ab, dass Firestore-, Storage- und Shopify-Konfiguration korrekt deployed sind.

## 11. Operative Checkliste

Nach sicherheitsrelevanten Aenderungen sollte geprueft werden:

1. `npm run typecheck` ist erfolgreich.
2. Checkout fuer normale Produkte funktioniert weiterhin.
3. Pflicht-Personalisierungen koennen nicht umgangen werden.
4. Manipulierte Produkt- oder Varianten-IDs werden abgelehnt.
5. Upload mit falschem MIME-Type wird abgelehnt.
6. SVG-Upload wird mit der vorgesehenen Fehlermeldung abgelehnt.
7. Alte Upload-Referenzen koennen nicht doppelt verwendet werden.
8. Wiederholte Checkout-Requests laufen in `429` oder `resource-exhausted`.
9. Parallele Upload-Verwendungen schlagen sauber fehl.
10. Security-Events werden in `securityEvents` geschrieben.
11. Wiederholte Angriffsmuster erzeugen Eintraege in `securityAlerts`.
12. `/admin/security` zeigt Alerts und Event-Feed korrekt an.
13. Storage Rules und Functions sind im Zielsystem deployed.

## 12. Empfohlene Weiterentwicklung

Sinnvolle naechste Sicherheitsmassnahmen fuer spaetere Iterationen waeren:

- gezielte Integrationstests fuer Checkout-Manipulationen
- automatisierte Tests fuer Upload-MIME-Mismatch und SVG-Blockierung
- automatisierte Tests fuer Rate Limiting und parallele Upload-Verknuepfung
- automatisierte Tests fuer Alert-Erzeugung und Dashboard-Abfragen
- Benachrichtigungen an weitere Systeme wie E-Mail, Slack oder SIEM
- regelmaessige Review der Admin-Endpunkte und Webhook-Validierung

## 13. Kurzfazit

Der aktuelle Sicherheitsansatz des Projekts basiert auf einem klaren Muster:

- Eingabe kommt vom Client
- Validierung erfolgt serverseitig
- nur validierte Daten werden verarbeitet

Gerade fuer Checkout und Uploads ist das entscheidend. Durch die gemeinsame Shared-Validation, die gehaerteten Storage Rules und das komplette SVG-Verbot ist die wichtigste verbleibende Angriffsoberflaeche in diesen Bereichen deutlich reduziert.

Mit dem zusaetzlichen Security-Monitoring ist das System ausserdem nicht mehr blind gegen wiederholte Angriffe. Verdachtige Muster werden jetzt nicht nur geblockt, sondern auch als Events und Alerts sichtbar gemacht.
