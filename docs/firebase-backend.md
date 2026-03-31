# Firebase Backend fuer LaserShop

## Uebersicht

Der Shop verwendet jetzt eine gemeinsame Backend-Domaenenschicht fuer Next.js und Firebase Functions.

Implementiert:

- Firestore-Katalog mit `products`, `variants`, `images`, `options`, `orders`, `uploads`, `customers`
- Firebase Storage-Trennung fuer Produktbilder und Kundenuploads
- Firebase Authentication-Basis mit Custom Claims (`customer`, `admin`)
- Session-Cookie-Endpunkt fuer spaetere Admin-Seiten
- Cloud Functions fuer Cart-Validierung, Order-Erstellung, Status-Updates und Upload-Reservierungen
- Seed- und Admin-Bootstrap-Skripte

## Wichtige Ordner

- `shared/catalog/*`
  Gemeinsame Typen, Zod-Schemas und Preislogik
- `lib/firebase/*`
  Web/Admin-Firebase-Initialisierung fuer Next.js
- `lib/server/catalog-source.ts`
  Firestore-Katalog mit statischem Fallback
- `functions/src/*`
  Cloud Functions und serverseitige Bestelllogik
- `scripts/seed-firestore.ts`
  Seedet Produkte, Varianten, Bilder und Optionen in Firestore
- `scripts/set-admin-role.ts`
  Setzt einem Firebase-User die Admin-Claim

## Firestore-Struktur

### `products/{productId}`

- `title`
- `slug`
- `shortDescription`
- `longDescription`
- `category`
- `shopCategory`
- `glassType`
- `collection`
- `collectionSlug`
- `designer`
- `occasion`
- `badge`
- `featured`
- `care`
- `benefits`
- `rating`
- `reviews`
- `status`
- `isPersonalizable`
- `defaultVariantId`
- `createdAt`
- `updatedAt`

### `products/{productId}/variants/{variantId}`

- `sku`
- `name`
- `priceCents`
- `compareAtPriceCents`
- `currency`
- `stockMode`
- `stockQuantity`
- `isActive`
- `weightGrams`
- `productionTimeDays`
- `sortOrder`

### `products/{productId}/images/{imageId}`

- `storagePath`
- `url`
- `altText`
- `sortOrder`
- `isPrimary`

### `products/{productId}/options/{optionId}`

- `name`
- `code`
- `type`
- `isRequired`
- `helpText`
- `placeholder`
- `maxLength`
- `priceModifierCents`
- `pricingMode`
- `sortOrder`
- `isActive`
- `acceptedMimeTypes`

### `products/{productId}/options/{optionId}/values/{valueId}`

- `label`
- `value`
- `sortOrder`
- `priceModifierCents`
- `isActive`

### `orders/{orderId}`

- `orderNumber`
- `ownerUid`
- `customerEmail`
- `customerFirstName`
- `customerLastName`
- `customerPhone`
- `currency`
- `subtotalCents`
- `shippingTotalCents`
- `taxTotalCents`
- `discountTotalCents`
- `grandTotalCents`
- `paymentStatus`
- `orderStatus`
- `productionStatus`
- `productionDueDate`
- `shippingAddress`
- `billingAddress`
- `notesCustomer`
- `notesInternal`
- `itemCount`
- `maxProductionTimeDays`
- `createdAt`
- `updatedAt`

### `orders/{orderId}/items/{itemId}`

- `productId`
- `variantId`
- `skuSnapshot`
- `productTitleSnapshot`
- `variantNameSnapshot`
- `unitPriceSnapshotCents`
- `quantity`
- `lineSubtotalCents`
- `lineTotalCents`
- `isPersonalized`
- `designPreviewUrl`
- `customData`

### `orders/{orderId}/items/{itemId}/configurations/{configurationId}`

- `optionId`
- `optionCodeSnapshot`
- `optionNameSnapshot`
- `optionTypeSnapshot`
- `value`
- `renderedValue`
- `priceModifierSnapshotCents`
- `uploadId`

### `uploads/{uploadId}`

- `storagePath`
- `originalFilename`
- `mimeType`
- `fileSize`
- `linkedOrderId`
- `linkedOrderItemId`
- `linkedOptionId`
- `reviewStatus`
- `allowGuestUpload`
- `ownerUid`
- `createdByRole`
- `expiresAt`

### `customers/{uid}`

- `email`
- `firstName`
- `lastName`
- `role`
- `createdAt`
- `updatedAt`

## Storage-Struktur

- `products/{productId}/...`
  Produktbilder, oeffentlich lesbar
- `customer-uploads/pending/{uploadId}/{filename}`
  Temporäre Kundenuploads vor Order-Verknuepfung
- `customer-uploads/{orderId}/{itemId}/{uploadId}-{filename}`
  Finale, private Uploads pro Bestellposition

## Cloud Functions

### `validateCart`

- validiert Produkt, Variante, Menge und Optionen
- berechnet Preise serverseitig in Cent
- gibt serverseitig gepruefte Totals zurueck

### `createOrderFromCart`

- validiert das Cart erneut serverseitig
- erstellt `orders`, `items`, `configurations`
- speichert saubere Snapshots
- berechnet `orderNumber`
- verknuepft reservierte Uploads mit Bestellpositionen

### `createUploadReservation`

- erzeugt einen Upload-Metadatensatz
- reserviert einen sicheren Pending-Storage-Pfad
- erlaubt spaeteren direkten Upload in Storage

### `updateOrderStatus`

- nur fuer Admins
- erzwingt definierte Status-Transitionen

### `setUserRole`

- nur fuer Admins
- setzt `customer` oder `admin` als Custom Claim

## Auth und Rollen

Quelle der Wahrheit fuer Rollen:

- Firebase Custom Claims
- `request.auth.token.role`

Verwendete Rollen:

- `guest`
- `customer`
- `admin`

Admin-Bootstrap:

1. Einen Firebase-User erzeugen
2. `npm run firebase:set-admin -- --email admin@example.com`
   Alternativ `--uid <uid>`
3. Danach kann derselbe User ueber Session-Cookies fuer Admin-Seiten verwendet werden

Session-Endpunkt:

- `POST /api/auth/session` mit `{ "idToken": "..." }`
- `DELETE /api/auth/session` zum Logout

## Sicherheitsregeln

`firestore.rules`

- Produkte oeffentlich lesbar, Schreiben nur Admin
- Orders nicht direkt vom Client schreibbar
- Orders nur fuer Besitzer und Admin lesbar
- Upload-Metadaten nicht direkt vom Client schreibbar
- `customers` nur fuer Besitzer/Admin lesbar

`storage.rules`

- Produktbilder oeffentlich lesbar
- Pending-Uploads nur mit passender Reservierung beschreibbar
- finale Kundenuploads nur fuer Admin lesbar

## Environment Variablen

Siehe `.env.example`.

Pflicht fuer Next-Frontend:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION`

Pflicht fuer Admin-Skripte / Server:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Alternativ:

- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Lokale Befehle

```bash
npm run typecheck
npm run build
npm run functions:build
```

Seed und Admin:

```bash
npm run firebase:seed
npm run firebase:set-admin -- --email admin@example.com
```

Functions lokal:

```bash
npm --prefix functions run serve
```

## Seed-Verhalten

Der Seeder:

- uebernimmt die bestehenden Shop-Produkte
- legt pro Produkt mindestens eine kaufbare Variante an
- erzeugt Produktbilder als Subcollection-Daten
- erzeugt optionale Personalisierungsoptionen fuer Gravur, Geschenkoptionen und Uploads
- legt das Editor-Produkt `gu-custom` fuer den Untersetzer-Editor an

Hinweis:

- Die aktuelle Storefront sammelt noch nicht alle Produktoptionen im UI ein.
- Die Backend-Struktur unterstuetzt Pflichtfelder trotzdem bereits.
- Im Seed sind die Optionen deshalb standardmaessig optional, damit der bestehende Shop sofort checkout-faehig bleibt.

## Verifikation

Lokal erfolgreich geprueft:

- `npm run typecheck`
- `npm --prefix functions run build`
- `npm run build`

## Naechste Firebase-Schritte

Sobald dein Firebase-Projekt existiert:

1. Firebase-Projekt anlegen
2. Firestore, Authentication und Storage aktivieren
3. Web App registrieren und `NEXT_PUBLIC_FIREBASE_*` eintragen
4. Service Account fuer `FIREBASE_SERVICE_ACCOUNT_JSON` anlegen
5. `npm run firebase:seed`
6. `npm run firebase:set-admin -- --email <deine-admin-mail>`
7. `firebase deploy --only firestore:rules,firestore:indexes,storage,functions`
