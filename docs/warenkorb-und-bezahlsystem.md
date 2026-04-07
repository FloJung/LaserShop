# Warenkorb- und Bezahlsystem

## 1. Zweck dieses Dokuments

Dieses Dokument beschreibt das Warenkorb- und Bezahlsystem des Projekts im Detail. Der Fokus liegt auf:

- Aufbau und Verhalten des lokalen Warenkorbs
- Datenmodell der Cart-Items
- Personalisierung und Datei-Uploads
- aktivem Checkout ueber Shopify
- Legacy-Checkout ueber Firebase Functions
- Rueckfluss von Shopify-Bestellungen nach Firestore
- Preislogik, Statuslogik und wichtige technische Grenzen

Wichtig: Das Projekt besitzt aktuell zwei unterschiedliche Checkout-Welten.

1. Aktiver Live-Pfad:
   Shopify ist der produktive Checkout fuer Storefront-Kaeufe.

2. Interner Altpfad:
   Firebase Functions koennen weiterhin Warenkoerbe validieren und Bestellungen direkt in Firestore erzeugen. Dieser Pfad ist laut aktueller Storefront nicht der aktive Kaufpfad.

## 2. Systemuebersicht

Das System besteht aus vier Ebenen:

1. Frontend-Warenkorb im Browser
2. Checkout-Erzeugung ueber Next.js API-Routen
3. Shopify als Bezahl- und Checkout-Plattform
4. Firestore als internes System fuer Order-Mirroring, Upload-Verknuepfung und Admin-Auswertung

In der Praxis laeuft der Hauptpfad so:

1. Nutzer legt Produkte oder ein Custom-Design in den lokalen Warenkorb.
2. Beim Checkout sendet das Frontend den Warenkorb an eine Next.js API-Route.
3. Der Server mappt lokale Produkte auf Shopify-Varianten.
4. Der Server speichert einen Checkout-Kontext in Firestore.
5. Der Nutzer wird zu Shopify weitergeleitet.
6. Shopify erzeugt die eigentliche Bestellung und Zahlung.
7. Ein Webhook meldet die Bestellung zurueck.
8. Die Bestellung wird intern in Firestore gespiegelt.

## 3. Aktiver versus Legacy-Checkout

## 3.1 Aktiver Checkout

Der aktive Checkout verwendet:

- `components/product-purchase-panel.tsx`
- `components/cart-checkout-button.tsx`
- `app/api/checkout/create/route.ts`
- `app/api/checkout/create-cart/route.ts`
- `lib/server/shopify.ts`
- `app/api/webhooks/orders/route.ts`

Charakteristik:

- kein direkter Zahlungsprozess in Firebase
- kein direktes Erzeugen einer Firestore-Bestellung vor der Shopify-Zahlung
- stattdessen Speicherung eines Checkout-Kontexts
- die finale Bestellung kommt ueber Shopify-Webhooks zurueck

## 3.2 Legacy-Checkout

Der Legacy-Checkout verwendet:

- `app/checkout/page.tsx`
- `components/checkout-form.tsx`
- `lib/firebase/checkout.ts`
- `functions/src/index.ts`
- `functions/src/lib/orders.ts`

Charakteristik:

- serverseitige Preisvalidierung ueber Firebase Callable Functions
- direkte Bestellerzeugung in Firestore moeglich
- aktuell laut Seitenbeschreibung nicht der aktive Storefront-Kaufpfad

## 4. Warenkorb im Frontend

## 4.1 Zentrale Verwaltung

Der Warenkorb wird in `components/cart-provider.tsx` verwaltet.

Der `CartProvider` stellt global ueber React Context folgende Daten und Funktionen bereit:

- `items`
- `count`
- `subtotal`
- `addProduct(...)`
- `addCustomDesign(...)`
- `removeItem(...)`
- `updateQuantity(...)`
- `clearCart()`

Die Datenhaltung ist rein clientseitig.

## 4.2 Persistenz

Der Cart-State wird unter dem Key `laser-shop-cart` in `localStorage` gespeichert.

Verhalten:

- beim Laden der App werden Cart-Items aus `localStorage` gelesen
- ungueltige oder kaputte Daten werden entfernt
- nach jeder Aenderung wird der Warenkorb erneut serialisiert gespeichert

Das bedeutet:

- der Warenkorb ist browsergebunden
- es gibt aktuell keine serverseitige Warenkorb-Synchronisation pro Nutzer
- ein Nutzerwechsel oder Geraetewechsel uebernimmt den Warenkorb nicht automatisch

## 4.3 Cart-Item-Typen

Das Cart-Modell liegt in `lib/cart.ts`.

Es gibt zwei Typen von Warenkorbpositionen:

1. `product`
   Normales Katalogprodukt

2. `custom-design`
   Individuell gestalteter Untersetzer aus dem Editor

Die Grundstruktur eines Cart-Items:

- `id`
- `lineType`
- `productId`
- `variantId`
- `name`
- `price`
- `quantity`
- `image`
- `previewImage`
- `subtitle`
- `configurations`
- `designJson`

## 4.4 Besonderheit bei Custom-Designs

Custom-Designs verwenden das interne Produkt:

- `productId: "gu-custom"`
- `variantId: "gu-custom-default"`

Definiert ist das in `lib/cart.ts` als `CUSTOM_COASTER_PRODUCT`.

Ein Custom-Design enthaelt zusaetzlich:

- `previewImage`
  PNG-Vorschau des Designs

- `designJson`
  komplette Editor-Struktur als JSON

Damit kann ein individuell gestalteter Untersetzer im gleichen Warenkorb wie normale Produkte behandelt werden.

## 4.5 Zusammenfuehren gleicher Positionen

Normale Produkte werden beim Hinzufuegen nicht immer als neue Zeile angelegt.

In `components/cart-provider.tsx` wird ueber `getCartItemMergeKey(...)` geprueft, ob bereits eine identische Position existiert.

Der Merge-Key basiert auf:

- `lineType`
- `productId`
- `variantId`
- Personalisierungskonfigurationen
- bei Custom-Designs auf Design-Metadaten

Wenn ein identisches normales Produkt bereits existiert:

- wird die Menge erhoeht

Wenn es kein identisches Item gibt:

- wird eine neue Position erzeugt

Custom-Designs sind wegen ihrer Designdaten in der Praxis meist eigenstaendige Positionen.

## 4.6 Berechnungen im Frontend

Die Frontend-Berechnungen in `lib/cart.ts` sind bewusst einfach:

- `calculateCartCount(items)`
- `calculateCartSubtotal(items)`

Der Warenkorb zeigt:

- Zwischensumme = Summe aller `price * quantity`
- Versand = `0 EUR` ab 69 EUR, sonst `4.90 EUR`
- Gesamt = Zwischensumme plus Versand

Wichtig:

- diese Anzeige ist eine Client-Vorschau
- die verbindliche serverseitige Preislogik liegt in `shared/catalog/pricing.ts` und in den Firebase Functions

## 5. Produkte in den Warenkorb legen

## 5.1 Normales Add-to-Cart

Die einfache Standardkomponente dafuer ist `components/add-to-cart-button.tsx`.

Sie:

- ruft `useCart().addProduct(product)` auf
- zeigt kurz den Zustand `Hinzugefuegt`

Diese Komponente ist die einfache Variante ohne Personalisierungslogik.

## 5.2 Aktive Produktdetailseite

Die eigentliche Produktdetailseite arbeitet ueber `components/product-purchase-panel.tsx`.

Diese Komponente ist deutlich umfangreicher und uebernimmt:

- Laden der Personalisierungsoptionen
- lokale Formularzustandsverwaltung
- Validierung der Eingaben
- Datei-Upload
- Add-to-Cart
- Buy-Now

## 5.3 Personalisierungsoptionen

Die Personalisierungslogik kommt aus `shared/catalog/storefront.ts`.

Unterstuetzte Optionstypen:

- `text`
- `textarea`
- `select`
- `checkbox`
- `file`

Die Komponente validiert im Frontend:

- Pflichtfelder
- Textlaengen
- Auswahlfelder
- Datei-Pflicht

Danach werden Konfigurationen mit `buildPersonalizationConfigurations(...)` in eine persistierbare Form gebracht.

Diese Konfigurationen enthalten mehr als nur den Rohwert:

- `optionId`
- `optionCode`
- `optionName`
- `optionType`
- `value`
- `renderedValue`
- `priceModifierCents`

## 5.4 Datei-Uploads fuer Personalisierung

Datei-Uploads laufen ueber `lib/firebase/uploads.ts`.

Der Ablauf:

1. Frontend ruft die Firebase Callable Function `createUploadReservation` auf.
2. Die Function liefert:
   - `uploadId`
   - `storagePath`
   - `expiresAt`
3. Danach laedt das Frontend die Datei direkt in Firebase Storage hoch.
4. Im Warenkorb wird nur eine Upload-Referenz gespeichert:
   - `uploadId`
   - `originalFilename`

Wichtig:

- im Warenkorb landet nicht die ganze Datei
- im Warenkorb liegt nur eine logische Referenz
- die Datei selbst liegt in Firebase Storage

## 5.5 Upload-Validierung im Frontend

In `components/product-purchase-panel.tsx` werden bereits vor dem Upload geprueft:

- maximale Dateigroesse
- erlaubte MIME-Typen
- laufende Uploads als Blocker fuer Add-to-Cart und Buy-Now

Erst wenn alle Uploads abgeschlossen sind, darf der Checkout gestartet werden.

## 6. Der Warenkorb auf der Seite `/cart`

Die Seite verwendet `components/cart-page.tsx`.

Sie zeigt fuer jede Position:

- Bild oder Vorschau
- Name
- Untertitel
- Personalisierungswerte
- Einzelpreis und Zeilenpreis
- Mengensteuerung
- Entfernen-Funktion

Fuer `custom-design`-Positionen kommt hinzu:

- Hinweis, dass JSON- und PNG-Vorschau gespeichert sind
- Link zur Rueckkehr in den Editor

## 7. Aktiver Checkout ueber Shopify

## 7.1 Einstiegspunkte

Es gibt zwei aktive Shopify-Checkout-Einstiege:

1. Buy Now fuer genau eine Produktposition
2. Checkout aus dem gesamten Warenkorb

### Buy Now

Aktuell im Produktkaufpanel umgesetzt ueber:

- `components/product-purchase-panel.tsx`
- Endpoint `POST /api/checkout/create`

### Cart Checkout

Umgesetzt ueber:

- `components/cart-checkout-button.tsx`
- Endpoint `POST /api/checkout/create-cart`

## 7.2 Buy-Now-Flow

Der Ablauf in `components/product-purchase-panel.tsx`:

1. Produktoptionen validieren
2. Request an `/api/checkout/create`
3. Payload enthaelt:
   - `lineId`
   - `lineType`
   - `productId`
   - `variantId`
   - `quantity`
   - `name`
   - `price`
   - `image`
   - `subtitle`
   - `configurations`
4. API antwortet mit `checkoutUrl`
5. Browser wird auf Shopify weitergeleitet

## 7.3 Cart-Checkout-Flow

Der Ablauf in `components/cart-checkout-button.tsx`:

1. alle Cart-Items werden ungefiltert an `/api/checkout/create-cart` gesendet
2. der Server normalisiert und validiert die Checkout-Lines
3. API antwortet mit `checkoutUrl`
4. Browser wird auf Shopify weitergeleitet

## 7.4 Serverseitige API-Routen

### `POST /api/checkout/create`

Datei:

- `app/api/checkout/create/route.ts`

Aufgaben:

- JSON lesen
- `productId`, `variantId`, `quantity` validieren
- Kontextdaten entgegennehmen
- `createCheckoutSession(...)` aus `lib/server/shopify.ts` aufrufen
- `checkoutUrl` zurueckgeben

### `POST /api/checkout/create-cart`

Datei:

- `app/api/checkout/create-cart/route.ts`

Aufgaben:

- `lines` lesen
- ungueltige Positionen verwerfen
- `createCartCheckoutSession(...)` aus `lib/server/shopify.ts` aufrufen
- `checkoutUrl` zurueckgeben

## 7.5 Shopify-Mapping lokaler Produkte

Bevor ein Checkout erzeugt werden kann, muessen lokale Produkte auf Shopify-Produkte gemappt sein.

Diese Logik liegt in `lib/server/shopify.ts`.

Wichtig:

- lokale `productId` und `variantId` reichen fuer Shopify nicht aus
- der Server liest das Mapping aus `shopifyProductMappings`
- daraus wird die echte `shopifyVariantId` bestimmt

Wenn kein Mapping existiert:

- kann kein Shopify-Checkout erstellt werden
- der Server wirft einen Fehler

## 7.6 Checkout-Kontext in Firestore

Vor der Weiterleitung zu Shopify speichert der Server einen Checkout-Kontext in Firestore.

Collection:

- `shopifyCheckoutContexts`

Der Kontexteintrag enthaelt unter anderem:

- `source`
  `buy_now` oder `cart`

- `status`
  anfangs `pending`

- `lineCount`
- `totalQuantity`
- `lineTypes`
- `hasConfigurations`
- `hasCustomDesigns`
- `shopifyLineSignature`
- `shopifyNote`
- `createdAt`
- `updatedAt`
- `expiresAt`

Zusatzlich wird pro Checkout-Line eine Subcollection `lines` gespeichert.

Diese Line-Dokumente enthalten:

- lokale Produkt- und Varianten-IDs
- Shopify-Produkt- und Varianten-IDs
- Mengen
- Kontextfelder wie Name, Bild, Untertitel
- Personalisierungen
- optional `customData`
- optional `designJson`
- optional `previewImage`

## 7.7 Warum der Checkout-Kontext wichtig ist

Der Checkout-Kontext ist der Schluessel fuer die spaetere Zuordnung einer Shopify-Bestellung zur lokalen Shop-Logik.

Ohne ihn wuesste das Backend spaeter nicht sicher:

- welche lokale Produkt-ID zur Shopify-Line gehoert
- welche Personalisierungswerte uebergeben wurden
- ob es sich um ein `custom-design` handelte
- welche Vorschau oder Design-Metadaten gespeichert werden sollen

## 7.8 Wie der Kontext an Shopify uebergeben wird

Die URL zum Shopify-Checkout wird in `lib/server/shopify.ts` mit Zusatzparametern erweitert.

Gesetzt werden:

- `attributes[ls_checkout_context] = <contextId>`
- `attributes[ls_checkout_source] = laser-shop`
- `note = LaserShop checkout context: <contextId>`
- `ref = <contextId>`

Damit existieren zwei spaetere Matching-Moeglichkeiten:

1. direkt ueber den gespeicherten Kontext-Identifier
2. indirekt ueber die Signatur der bestellten Varianten und Mengen

## 7.9 Was Shopify tatsaechlich macht

Shopify uebernimmt im aktiven Pfad:

- Checkout
- Zahlungsabwicklung
- finale Order-Erzeugung
- Rueckmeldung ueber Webhook

Das bedeutet:

- die eigentliche Zahlung wird nicht in Firebase verarbeitet
- Firestore ist im aktiven Pfad nicht das primaere Payment-System

## 8. Rueckfluss von Shopify-Bestellungen

## 8.1 Webhook-Endpunkt

Datei:

- `app/api/webhooks/orders/route.ts`

Der Endpoint:

1. liest den Raw-Body
2. prueft den Header `x-shopify-hmac-sha256`
3. validiert die Signatur ueber `verifyShopifyWebhookHmac(...)`
4. parsed das JSON
5. ruft `handleIncomingOrder(...)` auf

## 8.2 Matching zur lokalen Checkout-Session

`handleIncomingOrder(...)` in `lib/server/shopify.ts` versucht zuerst, den Checkout-Kontext eindeutig zu finden.

Strategie:

1. direkter Match ueber:
   - Note Attribute `ls_checkout_context`
   - oder `note` mit Prefix `LaserShop checkout context:`

2. Fallback ueber Signatur:
   - Kombination aus Shopify-Variant-ID und Menge

Moegliche Faelle:

- `direct`
  eindeutiger Direktmatch

- `signature_fallback`
  kein direkter Kontext, aber genau eine passende Signatur

- `ambiguous_signature`
  mehrere moegliche Kontexte

- `missing`
  kein passender Kontext gefunden

## 8.3 Spiegelung in interne Order-Struktur

Wenn ein passender Kontext existiert, wird die Shopify-Bestellung in die kanonische Firestore-Orderstruktur gespiegelt.

Collection:

- `orders`

Order-ID:

- `shopify-<shopifyOrderId>`

Dabei werden uebernommen oder berechnet:

- Kundendaten
- Versandadresse
- Rechnungsadresse
- Zeilenpositionen
- Personalisierungskonfigurationen
- Produktionszeit
- Summen
- Zahlungsstatus
- Orderstatus
- Produktionsstatus

## 8.4 Mapping der Zahlungsstatus

Der Shopify-Finanzstatus wird auf interne Statuswerte gemappt.

Beispiele:

- `authorized` -> `authorized`
- `paid` -> `paid`
- `partially_refunded` -> `partially_refunded`
- `refunded` -> `refunded`
- `voided` -> `failed`
- `pending` -> `pending`

Die internen erlaubten Payment-Status sind in `shared/catalog/constants.ts` definiert:

- `pending`
- `authorized`
- `paid`
- `partially_refunded`
- `refunded`
- `failed`

## 8.5 Mapping von Order- und Produktionsstatus

Bei gespiegelten Shopify-Bestellungen gilt:

- stornierte oder fehlgeschlagene Orders -> `orderStatus = cancelled`
- erfuellte Shopify-Orders -> `orderStatus = fulfilled`
- sonst standardmaessig -> `orderStatus = placed`

Produktionsstatus:

- stornierte Orders -> `cancelled`
- erfuellte Orders -> `shipped`
- sonst -> `queued`

## 8.6 Speicherung in `shopifyOrders`

Zusatzlich wird die eingehende Shopify-Bestellung in `shopifyOrders` protokolliert.

Dort liegen unter anderem:

- Rohinformationen zur Shopify-Order
- gematchter Checkout-Kontext
- Match-Strategie
- Ergebnis des Firestore-Mirrorings
- Referenz auf die kanonische interne Order

Diese Sammlung ist wichtig fuer Debugging und Nachvollziehbarkeit.

## 9. Legacy-Checkout ueber Firebase Functions

## 9.1 Frontend-Seite

Datei:

- `components/checkout-form.tsx`

Die Seite sammelt:

- E-Mail
- Vorname
- Nachname
- Telefon
- Lieferadresse
- optionale Hinweise

Sie arbeitet nicht mit Shopify, sondern mit Firebase Callable Functions.

## 9.2 Clientfunktionen

Datei:

- `lib/firebase/checkout.ts`

Verfuegbare Aufrufe:

- `validateCartWithBackend(payload)`
- `createOrderWithBackend(payload)`

## 9.3 Request-Struktur

Die Request-Struktur ist in `shared/catalog/models.ts` und `shared/catalog/schemas.ts` definiert.

Ein `CheckoutValidationRequest` enthaelt:

- `source`
- `currency`
- `customer`
- `shippingAddress`
- `billingAddress`
- `notesCustomer`
- `lines`

Jede Line enthaelt:

- `lineId`
- `productId`
- `variantId`
- `quantity`
- `configurations`
- `designPreviewUrl`
- `customData`

## 9.4 Serverseitige Validierung

Die zentrale Logik liegt in `functions/src/lib/orders.ts`.

`validateCheckoutPayload(...)` prueft:

- Request-Schema
- erlaubte Waehrung
- Existenz des Produkts
- Existenz der Variante
- Produktstatus `active`
- Variantenstatus `isActive`
- Lagerbestand bei `tracked`
- bekannte und gueltige Optionen
- Pflichtoptionen
- Upload-Referenzen
- Datei-MIME-Typen

Danach berechnet der Server pro Zeile:

- `unitPriceCents`
- `lineSubtotalCents`
- `lineTotalCents`
- `isPersonalized`
- `productionTimeDays`

Und global:

- `subtotalCents`
- `shippingTotalCents`
- `taxTotalCents`
- `discountTotalCents`
- `grandTotalCents`
- `maxProductionTimeDays`

## 9.5 Serverseitige Preislogik

Die Preislogik liegt in `shared/catalog/pricing.ts`.

Wichtige Regeln:

- Waehrung ist fest `EUR`
- kostenloser Versand ab `6900` Cent
- Standardversand sonst `490` Cent
- Steueranteil basiert auf `19%`
- `pricesIncludeTax = true`

Wichtig:

- Steuer wird als enthaltene Steuer behandelt
- sie wird nicht einfach auf den Nettobetrag aufgeschlagen

## 9.6 Order-Erzeugung in Firestore

`createOrderFromValidatedCheckout(...)` erstellt:

- ein Dokument in `orders`
- Unterdokumente in `orders/{orderId}/items`
- Konfigurationen in `orders/{orderId}/items/{itemId}/configurations`

Standardstatus beim Erstellen:

- `paymentStatus = pending`
- `orderStatus = placed`
- `productionStatus = queued`

Ausserdem:

- wird eine fortlaufende Bestellnummer reserviert
- wird `productionDueDate` berechnet
- wird optional das Kundenprofil aktualisiert

## 9.7 Upload-Verknuepfung in der Legacy-Order

Wenn eine Konfiguration einen Datei-Upload enthaelt:

1. wird die Upload-Referenz geprueft
2. wird kontrolliert, ob die Datei im Storage existiert
3. wird die Datei vom Pending-Pfad auf einen finalen Order-Pfad kopiert
4. der Pending-Upload wird entfernt
5. das Upload-Dokument bekommt:
   - `linkedOrderId`
   - `linkedOrderItemId`
   - `linkedOptionId`
   - neuen `storagePath`

Damit ist sichergestellt, dass Uploads nach der Bestellung eindeutig einer Order zugeordnet sind.

## 10. Preis- und Konfigurationslogik

## 10.1 Preisaufschlaege durch Optionen

Die Personalisierung kann Preisaufschlaege erzeugen.

Unterstuetzte Modi:

- `none`
- `fixed`
- `per_character`

Verhalten:

- `checkbox`
  bei `fixed` nur bei `true`

- `select`
  Basismodifier plus optional Modifier des ausgewaehlten Werts

- `text` und `textarea`
  bei `per_character` pro Zeichen
  bei `fixed` einmalig

- `file`
  optional fixer Aufpreis

## 10.2 Frontend versus Backend bei Preisaufschlaegen

Wichtig fuer das Verstaendnis:

- das Frontend speichert `priceModifierCents` in der Personalisierung
- die verbindliche Pruefung liegt aber serverseitig

Der Server berechnet die Werte aus den echten Produktoptionen neu. Das verhindert, dass manipulierte Frontend-Werte ungeprueft uebernommen werden.

## 11. Sicherheit und Validierung

## 11.1 Im Warenkorb

Der Browser-Warenkorb ist nicht vertrauenswuerdig.

Deshalb werden serverseitig bei den robusteren Pfaden immer erneut geprueft:

- Produkt existiert
- Variante ist aktiv
- Menge ist gueltig
- Lager reicht aus
- Optionen sind bekannt
- Pflichtfelder sind vorhanden
- Upload-Referenzen sind echt

## 11.2 Beim Shopify-Checkout

Der Shopify-Checkout verwendet einen serverseitig gespeicherten Kontext. Das reduziert das Risiko, dass lokale Kontextdaten verloren gehen.

Wichtig ist aber:

- die eigentliche Zahlungsabwicklung findet ausserhalb von Firebase statt
- die Firestore-Bestellung entsteht erst nach erfolgreichem Shopify-Rueckfluss

## 11.3 Beim Webhook

Der Webhook ist ueber HMAC abgesichert.

Ohne gueltige Signatur:

- wird die Order nicht akzeptiert

## 11.4 Bei Uploads

Uploads werden nicht blind akzeptiert.

Geprueft werden:

- Upload-Reservierung
- Dateiexistenz
- MIME-Type
- spaetere Verknuepfung mit einer echten Bestellung

## 12. Wichtige technische Grenzen und Besonderheiten

## 12.1 Der Browser-Warenkorb ist lokal

Es gibt aktuell:

- keine serverseitige Warenkorb-Tabelle
- keine Benutzerbindung des Warenkorbs
- keine Cross-Device-Synchronisation

## 12.2 Die Storefront erzeugt nicht immer direkt Firestore-Orders

Im aktiven Pfad wird zuerst nur ein Shopify-Checkout erzeugt.

Eine Firestore-Order entsteht dort erst:

- nach erfolgreichem Shopify-Webhook
- und nur dann sauber, wenn der Checkout-Kontext wieder gematcht werden kann

## 12.3 Produkt-Mappings zu Shopify sind Pflicht

Ohne `shopifyProductMappings` kann kein aktiver Shopify-Checkout erzeugt werden.

## 12.4 Preview-Bilder koennen weggelassen werden

In `lib/server/shopify.ts` gibt es eine Begrenzung fuer inline gespeicherte Vorschauen.

Wenn `previewImage` zu gross ist:

- wird es fuer den Checkout-Kontext nicht vollstaendig gespeichert
- der Kontext merkt sich nur, dass die Vorschau ausgelassen wurde

## 12.5 Der Legacy-Checkout ist weiterhin fachlich relevant

Auch wenn er nicht der aktive Kaufpfad ist, enthaelt er weiterhin:

- die robusteste serverseitige Validierungslogik
- die saubere Upload-Verknuepfung
- die kanonische Firestore-Bestellstruktur

## 13. Relevante Dateien

### Frontend

- `components/cart-provider.tsx`
- `components/cart-page.tsx`
- `components/cart-checkout-button.tsx`
- `components/product-purchase-panel.tsx`
- `components/checkout-form.tsx`
- `components/add-to-cart-button.tsx`
- `components/buy-now-button.tsx`
- `lib/cart.ts`
- `lib/firebase/uploads.ts`
- `lib/firebase/checkout.ts`

### Next.js API

- `app/api/checkout/create/route.ts`
- `app/api/checkout/create-cart/route.ts`
- `app/api/webhooks/orders/route.ts`

### Server

- `lib/server/shopify.ts`

### Shared Domain

- `shared/catalog/constants.ts`
- `shared/catalog/models.ts`
- `shared/catalog/schemas.ts`
- `shared/catalog/pricing.ts`
- `shared/catalog/storefront.ts`

### Firebase Functions

- `functions/src/index.ts`
- `functions/src/lib/orders.ts`

## 14. Zusammenfassung

Das Warenkorb- und Bezahlsystem ist zweistufig aufgebaut:

1. lokal im Frontend fuer Geschwindigkeit und UX
2. serverseitig ueber Shopify und Firebase fuer Validierung, Checkout-Kontext und Bestellpersistenz

Der wichtigste Punkt fuer die Architektur ist:

- der sichtbare Warenkorb lebt im Browser
- die aktive Bezahlung laeuft ueber Shopify
- die interne Bestellwelt lebt weiterhin in Firestore

Dadurch ist das System flexibel, aber nur dann gut nachvollziehbar, wenn man Cart, Checkout-Kontext, Webhook und Order-Mirroring als zusammenhaengenden Fluss betrachtet.
