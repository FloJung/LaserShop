# Projektdokumentation Laser Shop

## 1. Projektueberblick

Laser Shop ist eine E-Commerce-Anwendung auf Basis von Next.js 15 mit App Router. Das Projekt kombiniert drei zentrale Bereiche:

- eine oeffentliche Storefront fuer Produkte, Kategorien, Kollektionen und Geschenkideen
- einen Admin-Bereich fuer Produktpflege, Taxonomien, Bilder, Veroeffentlichung und Bestellungen
- einen erweiterten Backend-Stack mit Firebase, Firestore, Storage, Cloud Functions und Shopify

Die Anwendung ist nicht nur ein klassischer Shop. Sie enthaelt zusaetzlich einen visuellen Untersetzer-Editor, mit dem Nutzer ein individuelles Design erstellen und als eigenes Warenkorb-Produkt speichern koennen.

## 2. Technologiestack

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- `lucide-react` fuer Icons
- `react-konva` und `konva` fuer den Design-Editor

### Backend / Integrationen

- Next.js Route Handlers als serverseitige API-Schicht
- Firebase Admin SDK fuer Firestore, Auth und Storage
- Firebase Client SDK fuer Auth, Storage und Cloud Functions im Browser
- Firebase Cloud Functions fuer Validierung, Upload-Reservierung und Bestelllogik
- Shopify als aktiver Checkout-Kanal

## 3. Gesamtarchitektur

Die Anwendung ist in vier Hauptschichten aufgebaut:

1. `app/`
   Enthaelt Seiten, Layouts und API-Routen des Next.js App Routers.

2. `components/`
   Enthaelt UI-Bausteine fuer Storefront, Warenkorb, Checkout, Admin und Editor.

3. `lib/` und `lib/server/`
   Beinhaltet Frontend-Hilfsfunktionen, Client-Utilities, Serverlogik, Datenquellen und Integrationen.

4. `functions/`
   Separates Firebase-Functions-Projekt fuer serverseitige Callable Functions.

Zusammengefasst:

- Die Storefront rendert primaer ueber Next.js.
- Produktdaten kommen bevorzugt aus Firestore.
- Wenn Firebase Admin nicht konfiguriert ist, faellt die Anwendung auf statische Produktdaten aus `lib/data/products.ts` zurueck.
- Der aktive Kaufpfad geht ueber Shopify.
- Shopify-Webhooks spiegeln Bestellungen wieder in Firestore, damit das Projekt intern weiterhin mit einer eigenen Order-Struktur arbeiten kann.

## 4. Wichtige Ordner und Verantwortung

### Root-Ebene

- `app/`  
  Seiten und API-Routen

- `components/`  
  Wiederverwendbare UI-Komponenten

- `lib/`  
  Gemeinsame Utilities, Typen, Clientlogik

- `lib/server/`  
  Server-only Logik fuer Admin, Katalog, Taxonomien, Shopify und Revalidation

- `shared/`  
  Gemeinsame Typen, Schemas und Business-Regeln fuer Frontend, Next-Server und Functions

- `functions/`  
  Firebase Cloud Functions

- `docs/`  
  Projektdokumentation und Backend-Dokumentation

- `scripts/`  
  Seeder und Admin-Bootstrap-Skripte

### Besonders wichtige Dateien

- `app/layout.tsx`  
  Globales Root-Layout mit Header, Footer und Providern

- `app/page.tsx`  
  Startseite

- `lib/shop.ts`  
  Oeffentliche Shop-Datenzugriffe und Filterfunktionen

- `lib/server/catalog-source.ts`  
  Laden des Katalogs aus Firestore mit statischem Fallback

- `components/cart-provider.tsx`  
  Globale Warenkorb-Verwaltung im Frontend

- `lib/server/shopify.ts`  
  Shopify-Checkout, Mapping, Webhook-Verarbeitung und Order-Mirroring

- `functions/src/index.ts`  
  Einstiegspunkt fuer Firebase Callable Functions

## 5. Seitenaufbau der Anwendung

## 5.1 Globales Layout

Das globale Layout wird in `app/layout.tsx` definiert.

Es stellt fuer alle Seiten bereit:

- Fonts ueber `next/font`
- globale Styles ueber `app/globals.css`
- `Providers` fuer globale Client-States
- `Header`
- `Footer`

Der Header bekommt seine Navigationsdaten serverseitig ueber `getFilterOptions()`. Damit sind Kollektionen und Shop-Kategorien zentral gesteuert und im Header wie im Footer konsistent.

## 5.2 Header und Navigation

Die Hauptnavigation liegt in `components/header.tsx`.

Wichtige Aufgaben:

- Desktop- und Mobile-Navigation
- Suchformular mit Weiterleitung nach `/shop`
- Einstieg in Kollektionen
- Einstieg in Kategorien
- Warenkorb-Zaehler ueber `useCart()`
- Mobile-Overlay-Menue mit eigenem State

Die Navigation ist also datengetrieben und basiert nicht auf hart codierten Einzelrouten.

## 5.3 Footer

Der Footer in `components/footer.tsx` spiegelt die wichtigsten Shop-Bereiche:

- Kategorien
- Kollektionen
- Service-Links
- rechtliche Seiten wie `Impressum` und `AGB`

## 5.4 Startseite

Die Startseite liegt in `app/page.tsx` und ist klar in Inhaltsbloecke gegliedert:

1. Hero-Bereich mit Hauptbotschaft und CTA
2. Designwelten / Kollektionen
3. Shop-Kategorien
4. Featured Products / Bestseller
5. Geschenkideen nach Anlass
6. Trust Strip
7. Testimonials
8. FAQ

Die Seite dient nicht nur der Praesentation, sondern leitet gezielt in die Kernpfade des Shops weiter:

- `/shop`
- `/collections/[slug]`
- `/category/[glassType]`

## 5.5 Shop-Seite

Die Shop-Uebersicht liegt in `app/shop/page.tsx`.

Merkmale:

- nutzt URL-basierte Filter ueber `searchParams`
- filtert nach:
  - Kategorie
  - Shop-Kategorie
  - Suchbegriff
  - Glasart
  - Kollektion
  - Anlass
- zeigt Ergebnisse ueber `ProductCard`

Die Filter-UI liegt in `components/filter-bar.tsx`. Dadurch bleibt die Filterlogik im Routing sichtbar und ist direkt verlinkbar.

## 5.6 Kollektionen

Kollektionen werden ueber `app/collections/[slug]/page.tsx` gerendert.

Die Seite kombiniert:

- ein Hero-Banner fuer die jeweilige Kollektion
- Filteroptionen innerhalb der Kollektion
- Produktgrid

Kollektionen sind damit eigenstaendige Einstiege innerhalb derselben Marke.

## 5.7 Kategorien und Glasarten

Die Route `app/category/[glassType]/page.tsx` bedient zwei Arten von Seiten:

- echte Shop-Kategorien wie `glasuntersetzer`
- Glasarten wie `Sektglaeser` oder `Bierglaeser`

Sonderfall:

- Fuer `glasuntersetzer` wird zusaetzlich ein Promo-Banner mit CTA zum Editor angezeigt.

## 5.8 Produktdetailseite

Die Produktdetailseite liegt in `app/products/[id]/page.tsx`.

Bestandteile:

- Produktgalerie
- Kerndaten wie Name, Preis, Kollektion, Designer, Anlass
- Bewertungen
- Personalisierungsoptionen
- Kaufmodul
- Pflegehinweise
- Benefits
- Vertrauenssignale
- aehnliche Produkte

Das Kaufmodul selbst liegt in `components/product-purchase-panel.tsx`.

## 5.9 Warenkorb

Die Warenkorb-Seite `app/cart/page.tsx` nutzt `components/cart-page.tsx`.

Funktionen:

- zeigt normale Produkte und Custom-Designs gemeinsam
- Mengen aendern
- Positionen entfernen
- gesamten Warenkorb leeren
- Checkout starten

Custom-Designs enthalten zusaetzlich:

- PNG-Vorschau
- gespeichertes Design-JSON
- Link zur erneuten Bearbeitung im Editor

## 5.10 Untersetzer-Editor

Die Route `app/untersetzer-editor/page.tsx` laedt `components/editor/coaster-editor.tsx`.

Der Editor ist einer der komplexesten Frontend-Bereiche.

Funktionen:

- Text einfuegen
- Icons einfuegen
- Rahmen / Formen einfuegen
- Linien zeichnen
- Messwerkzeug mit Snap-Verhalten
- Bild-Upload und Umwandlung in Gravurvorschau
- Vorlagen anwenden
- JSON lokal speichern
- PNG exportieren
- Design als individuelles Warenkorb-Produkt ablegen

Wichtige technische Basis:

- `react-konva`
- `konva`
- `lib/design-tool.ts`

## 5.11 Checkout

Es gibt zwei Checkout-Pfade:

### Aktiver Checkout

Der aktive Kaufpfad geht ueber Shopify:

- `POST /api/checkout/create`
- `POST /api/checkout/create-cart`

Dieser Pfad wird von Produktdetailseiten und Warenkorb aktiv genutzt.

### Legacy-Checkout

Die Seite `app/checkout/page.tsx` existiert weiterhin als interner Altpfad fuer die bestehende Firebase-Orderlogik.

Sie ist nicht der aktive Storefront-Kaufpfad, bleibt aber erhalten fuer:

- Backend-Tests
- serverseitige Preisvalidierung
- direkte Order-Erstellung ueber Firebase Functions

## 5.12 Admin-Bereich

Der Admin-Bereich besteht aus:

- `app/admin/page.tsx`
- `app/admin/products/page.tsx`
- `app/admin/products/[productId]/page.tsx`
- `app/admin/orders/page.tsx`

Admin-Zugriff ist abgesichert ueber:

- Firebase Login
- Session-Cookie
- Custom Claims mit Rolle `admin`

## 5.13 Rechtliche Seiten

Vorhanden sind:

- `app/impressum/page.tsx`
- `app/agb/page.tsx`

## 6. Frontend-Architektur

## 6.1 Rendering-Modell

Das Frontend nutzt eine Mischung aus:

- Server Components fuer datengetriebene Seiten
- Client Components fuer interaktive Bereiche

Typische Server-Seiten:

- `app/page.tsx`
- `app/shop/page.tsx`
- `app/products/[id]/page.tsx`
- `app/collections/[slug]/page.tsx`
- `app/category/[glassType]/page.tsx`

Typische Client-Komponenten:

- `components/header.tsx`
- `components/cart-provider.tsx`
- `components/cart-page.tsx`
- `components/product-purchase-panel.tsx`
- kompletter Editor in `components/editor/*`
- Admin-Editor

## 6.2 State-Management

Zentrales Frontend-State-Management ist bewusst schlank gehalten:

- globaler Cart-State ueber React Context in `components/cart-provider.tsx`
- lokale Component States fuer Formulare, Menues, Editor und Admin
- Persistenz des Warenkorbs in `localStorage`
- Persistenz des Editor-Designs ebenfalls in `localStorage`

Der Warenkorb speichert:

- Standardprodukte
- Personalisierungen
- Custom-Design-Produkte
- Vorschaubilder
- Design-JSON

## 6.3 UI-Komponentenstruktur

Die Komponenten sind grob in Funktionsgruppen aufgeteilt:

### Allgemeine UI

- `button.tsx`
- `button-link.tsx`
- `section-heading.tsx`
- `logo.tsx`
- `rating.tsx`

### Storefront

- `product-card.tsx`
- `product-gallery.tsx`
- `product-purchase-panel.tsx`
- `filter-bar.tsx`
- `faq.tsx`
- `testimonials.tsx`
- `trust-strip.tsx`
- `category-promo-banner.tsx`
- `design-world-*`

### Cart / Checkout

- `cart-page.tsx`
- `cart-checkout-button.tsx`
- `checkout-form.tsx`

### Admin

- `admin-products-table.tsx`
- `admin-products-overview.tsx`
- `admin-product-editor.tsx`
- `admin-product-image-manager.tsx`
- `admin-orders-view.tsx`
- `admin-login-form.tsx`

### Editor

- `editor-action-bar.tsx`
- `editor-sidebar.tsx`
- `editor-properties-panel.tsx`
- `coaster-stage.tsx`
- `coaster-editor.tsx`
- mehrere Dropdown- und Tool-Komponenten

## 6.4 Styling

Das Styling basiert auf:

- globalen CSS-Variablen in `app/globals.css`
- Tailwind-Klassen direkt in den Komponenten

Der visuelle Stil ist bewusst konsistent:

- helle Flaechen
- runde Karten und Buttons
- klare CTA-Hierarchie
- strukturierte Shop-Oberflaechen

## 6.5 Frontend-Datenquellen

Der Shop greift ueber `lib/shop.ts` auf die Storefront-Daten zu.

Diese Schicht kapselt:

- Featured Products
- Produkte nach Kollektion
- Produkte nach Kategorie oder Glasart
- Produktsuche
- Filterung
- Laden von Filteroptionen

Die eigentliche Datenquelle liegt in `lib/server/catalog-source.ts`.

Diese Datei entscheidet:

- Firestore lesen, wenn Firebase Admin konfiguriert ist
- sonst statischen Katalog verwenden

Das ist fuer lokale Entwicklung wichtig, weil die Storefront dadurch auch ohne aktive Firebase-Konfiguration weiter funktioniert.

## 7. Backend-Architektur

## 7.1 Backend-Schichten

Das Backend ist nicht monolithisch, sondern besteht aus mehreren Ebenen:

1. Next.js Serverlogik in `lib/server/*`
2. Next.js API-Routen in `app/api/*`
3. Firebase Cloud Functions in `functions/src/*`
4. Firestore / Storage / Auth als Infrastruktur
5. Shopify als Checkout- und Commerce-Integration

## 7.2 Firebase Admin und Client Initialisierung

Wichtige Dateien:

- `lib/firebase/admin.ts`
- `lib/firebase/client.ts`
- `lib/firebase/env.ts`

Aufgaben:

- Initialisierung des Firebase Admin SDK fuer Serverzugriffe
- Initialisierung des Firebase Client SDK fuer Browserzugriffe
- Zugriff auf Firestore, Auth, Functions und Storage
- zentrale Environment-Pruefung

## 7.3 Katalog und Produktdaten

Die Storefront verwendet Firestore als bevorzugte Quelle. Die Produktlogik ist so aufgebaut:

- `lib/server/catalog-source.ts`
  laedt Produkte, Varianten, Bilder und Optionen

- `shared/catalog/*`
  enthaelt Schemas, Typen und Preislogik

- `lib/server/product-taxonomies.ts`
  loest Kategorien, Glasarten, Anlaesse, Kollektionen und Designer auf

- `lib/server/product-publication.ts`
  entscheidet, ob ein Produkt fuer die Storefront sichtbar und veroeffentlichbar ist

Produktdaten bestehen aus:

- Hauptdokument `products/{productId}`
- Subcollections fuer:
  - `variants`
  - `images`
  - `options`
  - `options/{optionId}/values`

## 7.4 Taxonomien

Taxonomien sind als eigene Firestore-Sammlungen organisiert, zum Beispiel:

- `productCategories`
- `productShopCategories`
- `productGlassTypes`
- `productOccasions`
- `productCollections`
- `productDesigners`

Die zentrale Verwaltung liegt in `lib/server/product-taxonomies.ts`.

Wichtige Eigenschaften:

- automatische Seed-Logik bei leerer Datenbank
- Produktreferenzen koennen per ID oder Namens-/Slug-Fallback aufgeloest werden
- Aenderungen an Taxonomien koennen betroffene Produkte automatisch aktualisieren

## 7.5 Admin-Backend

Fuer Admin-Seiten existiert eine eigene serverseitige Zugriffsschicht:

- `lib/server/admin-session.ts`
- `lib/server/admin-products.ts`
- `lib/server/admin-orders.ts`
- weitere Admin-Utilities in `lib/server/admin-*`

Funktionen:

- Session pruefen
- Admin-Zugriff erzwingen
- Produkte inkl. Varianten, Bildern und Optionen laden
- Bestellungen mit Unterpositionen und Konfigurationen laden

## 7.6 Next.js API-Routen

Die Next-API ist in mehrere Bereiche getrennt.

### Auth

- `/api/auth/session`
  erstellt oder entfernt Admin-Session-Cookies

- `/api/auth/callback`
  verarbeitet den Shopify-OAuth-Callback

### Shop / Checkout

- `/api/shop/filters`
  liefert Filteroptionen

- `/api/checkout/create`
  erstellt einen Shopify Checkout fuer "Jetzt kaufen"

- `/api/checkout/create-cart`
  erstellt einen Shopify Checkout aus dem gesamten Warenkorb

### Shopify Webhooks

- `/api/webhooks/orders`
  verarbeitet eingehende Shopify-Bestellungen, prueft HMAC und startet die interne Weiterverarbeitung

### Admin-Produkte

- `/api/admin/products`
  neues Produkt anlegen

- `/api/admin/products/[productId]`
  Produkt laden, speichern, loeschen

- `/api/admin/products/status`
- `/api/admin/products/[productId]/status`
  Status-Wechsel

- `/api/admin/products/delete`
  expliziter Delete-Pfad

- `/api/admin/products/[productId]/featured`
  Featured-Status aendern

- `/api/admin/products/[productId]/images`
- `/api/admin/products/[productId]/images/[imageId]`
- `/api/admin/products/[productId]/images/reorder`
  Bildverwaltung

- `/api/admin/products/[productId]/shopify-sync`
  manuelle Shopify-Synchronisation

### Admin-Taxonomien

- `/api/admin/product-taxonomies`
- `/api/admin/product-taxonomies/[kind]/[taxonomyId]`

## 7.7 Shopify-Integration

Die Shopify-Logik ist sehr zentral fuer das Projekt und liegt hauptsaechlich in `lib/server/shopify.ts`.

Sie uebernimmt:

- Zugriff auf Shopify Admin API
- Produkt-Synchronisation zwischen lokalem Katalog und Shopify
- Speicherung von Produkt-Mappings in Firestore
- Erzeugen von Checkout-Kontexten fuer Buy-Now und Cart-Checkout
- Zuordnung spaeterer Shopify-Bestellungen zu lokalen Checkout-Kontexten
- Spiegelung von Shopify-Bestellungen in die kanonische Firestore-Order-Struktur

Wichtige Firestore-Hilfssammlungen in diesem Zusammenhang:

- `shopifyProductMappings`
- `shopifyCheckoutContexts`
- `shopifyOrders`

Wichtig fuer das Verstaendnis:

- Shopify ist das aktive Verkaufssystem im Checkout
- Firestore bleibt das interne System fuer Katalog, Admin und kanonische Bestellspiegelung

## 7.8 Firebase Cloud Functions

Die Functions liegen im separaten Projekt `functions/`.

Einstiegspunkt:

- `functions/src/index.ts`

Verfuegbare Callable Functions:

- `validateCart`
  validiert Warenkorb und berechnet serverseitige Totals

- `createOrderFromCart`
  erstellt eine Bestellung im Firebase-Backend

- `createUploadReservation`
  reserviert sichere Upload-Metadaten und Storage-Pfade

- `updateOrderStatus`
  erlaubt Admin-Statuswechsel fuer Orders

- `setUserRole`
  setzt Rollen fuer Firebase-User

Diese Schicht ist besonders fuer den Legacy-Checkout und fuer Upload-/Order-Sicherheit relevant.

## 7.9 Auth und Rollenmodell

Die Anwendung verwendet Firebase Authentication mit Rollen ueber Custom Claims.

Verwendete Rollen:

- `guest`
- `customer`
- `admin`

Der Admin-Flow sieht so aus:

1. Nutzer meldet sich per Firebase Auth an
2. `POST /api/auth/session` erzeugt einen Session-Cookie
3. geschuetzte Admin-Seiten pruefen die Session serverseitig
4. Zugriff wird nur mit Rolle `admin` gewaehrt

## 8. Wichtige Datenfluesse

## 8.1 Laden der Storefront

1. Seite ruft Funktionen aus `lib/shop.ts` auf
2. `lib/shop.ts` verwendet `lib/server/catalog-source.ts`
3. `catalog-source` prueft, ob Firebase Admin verfuegbar ist
4. falls ja:
   - Firestore-Produkte laden
   - Varianten, Bilder und Optionen laden
   - Taxonomien aufloesen
   - Veroeffentlichungsstatus pruefen
5. falls nein:
   - statische Produktdaten aus `lib/data/products.ts` verwenden

## 8.2 Produkt in den Warenkorb

1. Nutzer waehlt Produktoptionen im `ProductPurchasePanel`
2. optionale Uploads werden ueber Firebase Storage vorbereitet
3. Personalisierungswerte werden validiert
4. Produkt wird ueber `CartProvider` in den lokalen Warenkorb geschrieben
5. Warenkorb wird in `localStorage` persistiert

## 8.3 Custom-Design in den Warenkorb

1. Nutzer erstellt Design im Untersetzer-Editor
2. Design wird als JSON gespeichert
3. Vorschau wird als PNG erzeugt
4. Editor legt ein `custom-design`-Cart-Item an
5. Item wird im gleichen Cart-State wie normale Produkte gespeichert

## 8.4 Buy Now / Cart Checkout

### Buy Now

1. Produktdetailseite ruft `/api/checkout/create` auf
2. Server erzeugt einen Shopify Checkout
3. Browser wird auf Shopify weitergeleitet

### Cart Checkout

1. Warenkorb sendet alle Lines an `/api/checkout/create-cart`
2. Server erstellt Checkout-Session fuer mehrere Positionen
3. Browser wird auf Shopify weitergeleitet

## 8.5 Shopify-Bestellung zur internen Order

1. Shopify sendet Order-Webhook an `/api/webhooks/orders`
2. HMAC wird geprueft
3. `handleIncomingOrder()` wird aufgerufen
4. Checkout-Kontext wird zur Bestellung gematcht
5. Bestellung wird in `shopifyOrders` protokolliert
6. Bestellung wird nach `orders/{orderId}` gespiegelt
7. Cashflow-Informationen werden aktualisiert

Dadurch bleibt intern eine saubere Firestore-Orderstruktur erhalten, obwohl der eigentliche Checkout ueber Shopify lief.

## 8.6 Legacy Firebase Checkout

1. Nutzer geht auf `/checkout`
2. Formular baut ein `CheckoutValidationRequest`
3. Client ruft Firebase Callable Functions auf
4. Server validiert Preise und erstellt optional eine Order

Dieser Pfad ist aktuell nicht der Standard fuer die Storefront, aber backendseitig weiter vorhanden.

## 8.7 Admin-Produktpflege

1. Admin meldet sich an
2. Produktdaten werden serverseitig geladen
3. Admin aendert Basisdaten, Varianten, Bilder, Optionen und Taxonomien
4. `PUT /api/admin/products/[productId]` speichert den kompletten Payload
5. Produkt wird erneut validiert
6. Shopify-Sync wird angestossen
7. Storefront-Revalidation wird ausgefuehrt

## 9. Datenmodell in Kurzform

Die wichtigsten Collections sind:

- `products`
- `products/{productId}/variants`
- `products/{productId}/images`
- `products/{productId}/options`
- `products/{productId}/options/{optionId}/values`
- `orders`
- `orders/{orderId}/items`
- `orders/{orderId}/items/{itemId}/configurations`
- `uploads`
- `customers`
- `shopifyProductMappings`
- `shopifyCheckoutContexts`
- `shopifyOrders`

Eine ausfuehrlichere Beschreibung des Firebase-Backends steht in:

- `docs/firebase-backend.md`

## 10. Frontend vs. Backend Verantwortungen

## Frontend

Das Frontend ist verantwortlich fuer:

- Darstellung aller Shop-Seiten
- Navigation und Filter-UX
- lokalen Warenkorb
- Personalisierungsformulare
- Editor fuer Custom-Untersetzer
- Admin-Oberflaeche
- Weiterleitung in den Checkout

## Backend

Das Backend ist verantwortlich fuer:

- Laden und Validieren der Produktdaten
- Schutz der Admin-Zugaenge
- Firestore- und Storage-Zugriffe
- Produkt-, Bild- und Taxonomiepflege
- Shopify-Anbindung
- Webhook-Verarbeitung
- interne Bestellspiegelung
- serverseitige Preis- und Orderlogik in Cloud Functions

## 11. Wichtige Besonderheiten des Projekts

### 1. Doppelte Commerce-Logik

Das Projekt hat bewusst zwei Commerce-Ebenen:

- Shopify als aktiver Checkout
- Firebase / Firestore als internes Daten- und Order-System

Das ist wichtig, weil man sonst leicht annimmt, dass alle Bestellungen direkt nur in Firestore entstehen. Das stimmt fuer den aktiven Kaufpfad nicht mehr.

### 2. Statischer Fallback

Wenn Firebase Admin lokal nicht konfiguriert ist, bleibt die Storefront ueber statische Produktdaten lauffaehig.

### 3. Editor als eigenstaendiger Produktkanal

Der Untersetzer-Editor erzeugt kein normales Produkt aus dem Katalog, sondern ein eigenes `custom-design`-Warenkorb-Item auf Basis des Produktes `gu-custom`.

### 4. Admin-Editor ist sehr umfassend

Der Admin-Produkteditor pflegt nicht nur Texte, sondern:

- Varianten
- Medien
- Personalisierungsoptionen
- Publish-Status
- Featured-Status
- Shopify-Sync-Zustand
- Taxonomien

## 12. Lokale Entwicklung und wichtige Befehle

Wichtige NPM-Skripte aus dem Root-Projekt:

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run functions:build
npm run firebase:seed
npm run firebase:set-admin -- --email admin@example.com
```

Wichtige Hinweise:

- fuer echte Firestore- und Admin-Funktionen muessen Firebase-Umgebungsvariablen gesetzt sein
- ohne Firebase-Konfiguration funktioniert die Storefront ueber statische Daten weiter
- der aktive Checkout benoetigt die Shopify-Konfiguration auf Serverseite

## 13. Empfohlener Einstieg fuer neue Entwickler

Fuer einen schnellen Projekteinstieg in sinnvoller Reihenfolge:

1. `app/layout.tsx`
2. `app/page.tsx`
3. `app/shop/page.tsx`
4. `app/products/[id]/page.tsx`
5. `components/cart-provider.tsx`
6. `lib/shop.ts`
7. `lib/server/catalog-source.ts`
8. `lib/server/shopify.ts`
9. `functions/src/index.ts`
10. `components/admin-product-editor.tsx`

## 14. Fazit

Laser Shop ist architektonisch kein einfacher statischer Shop, sondern eine kombinierte Commerce-Plattform mit:

- datengetriebener Next.js-Storefront
- lokalem interaktivem Warenkorb
- individuellem Design-Editor
- Admin-Backoffice
- Firestore als Daten- und Verwaltungsbasis
- Shopify als aktivem Checkout-System
- Firebase Functions fuer serverseitige Fachlogik

Fuer die Weiterentwicklung sind besonders wichtig:

- die Trennung zwischen Storefront, Admin und Backend
- das Zusammenspiel von Firestore und Shopify
- der statische Fallback des Katalogs
- die Sonderrolle des Untersetzer-Editors im Warenkorb- und Bestellfluss
