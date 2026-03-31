import type { DesignerCollection, Product, ShopCategory } from "@/lib/types";

const glassImagePool = [
  "/images/glas/2er-set-weinglas-ringe-personalisiert-699d1e.jpg",
  "/images/glas/IMG_8978-768x1024.jpeg",
  "/images/glas/IMG_8981-768x1024.jpeg",
  "/images/glas/Weissweinglaser-Kristallglas-2-Stuck.webp",
  "/images/glas/weihnachts-weinglas-gravur-tannenbaum-trauzeugin-fragen.480.png",
  "/images/glas/wein_diva_hochzeit-2_600x600.jpg",
  "/images/glas/wein_daily_bordeaux_text_gerade_600x600.jpg",
  "/images/glas/Sektglaeser-Brautpaar-250x250.jpg",
  "/images/glas/60c3687e1b4c3966090c47f888755c47-1-full.jpg",
  "/images/glas/61yKJOFsUXL._AC_UF894,1000_QL80_.jpg",
  "/images/glas/51wyMQk7QEL._AC_UF894,1000_QL80_.jpg",
  "/images/glas/200106220-xmas-400px.jpg"
] as const;

const coasterImagePool = [
  "/images/untersetzer/Untersetzer-mit-Gravur-Kork-mit-Spruch-Mama-braucht-Kaffee.jpg",
  "/images/untersetzer/Untersetzer-mit-Logo-Gravur-Danke-f-r-alles-Kork.jpg",
  "/images/untersetzer/images.jpg"
] as const;

function getPoolImage(pool: readonly string[], index: number) {
  return pool[index % pool.length];
}

function getPoolGallery(pool: readonly string[], startIndex: number) {
  return [getPoolImage(pool, startIndex), getPoolImage(pool, startIndex + 1), getPoolImage(pool, startIndex + 2)];
}

export const collections: DesignerCollection[] = [
  {
    slug: "flo",
    name: "Flo's Designs",
    creator: "Flo",
    description: "Markante Gravuren mit urbanem Charakter für moderne Geschenkideen.",
    image: getPoolImage(glassImagePool, 0),
    accent: "from-amber-400 to-orange-500"
  },
  {
    slug: "andrea",
    name: "Andrea's Designs",
    creator: "Andrea",
    description: "Filigrane Linien und elegante Motive für stilvolle Momente.",
    image: getPoolImage(glassImagePool, 5),
    accent: "from-cyan-400 to-blue-500"
  },
  {
    slug: "studio",
    name: "Studio Kollektion",
    creator: "Studio",
    description: "Kuratiert für Premium-Anlässe mit reduzierter, zeitloser Formensprache.",
    image: getPoolImage(glassImagePool, 3),
    accent: "from-emerald-400 to-teal-500"
  }
];

export const shopCategories: ShopCategory[] = [
  {
    slug: "alle-glaeser",
    name: "Alle Gläser",
    description: "Das komplette Sortiment an gravierten Sekt-, Schnaps-, Bier- und Trinkgläsern."
  },
  {
    slug: "glasuntersetzer",
    name: "Glasuntersätzer",
    description: "Passende Untersetzer als stilvolle Ergänzung für Geschenksets und Tischbilder."
  },
  {
    slug: "bundle-angebote",
    name: "Bundle-Angebote",
    description: "Kuratiert gebuendelte Sets mit Preisvorteil für Geschenke und besondere Anlässe."
  }
];

export const products: Product[] = [
  {
    id: "sg-001",
    name: "Sektglas Aurora Ring",
    price: 24.9,
    image: getPoolImage(glassImagePool, 0),
    gallery: getPoolGallery(glassImagePool, 0),
    glassType: "Sektgläser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Hochzeit",
    description: "Vorgraviertes Sektglas mit feinem Ringmotiv für besondere Toast-Momente.",
    badge: "Bestseller",
    featured: true,
    care: "Spuelmaschinengeeignet im Schonprogramm.",
    benefits: ["Präzise Lasergravur", "Kristallklares Glas", "Geschenkfertig verpackbar"],
    rating: 4.8,
    reviews: 126
  },
  {
    id: "sg-002",
    name: "Sektglas Pure Line",
    price: 22.9,
    image: getPoolImage(glassImagePool, 1),
    gallery: getPoolGallery(glassImagePool, 1),
    glassType: "Sektgläser",
    shopCategory: "alle-glaeser",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Elegant",
    description: "Minimalistische Gravur mit ruhiger Typografie und klarer Linienfuehrung.",
    featured: true,
    care: "Handwäsche empfohlen, um den Glanz dauerhaft zu erhalten.",
    benefits: ["Zeitloses Design", "Sanft abgerundeter Rand", "Ideal für Dinner"],
    rating: 4.7,
    reviews: 89
  },
  {
    id: "sg-003",
    name: "Schnapsglas Cheers Shot",
    price: 14.9,
    image: getPoolImage(glassImagePool, 2),
    gallery: getPoolGallery(glassImagePool, 2),
    glassType: "Schnapsgläser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Lustig",
    description: "Kompaktes Shotglas mit dynamischer Gravur für Partys und Geburtstage.",
    badge: "Neu",
    featured: true,
    care: "Spuelmaschinengeeignet bis 55 Grad.",
    benefits: ["Scharfer Gravurkontrast", "Standfeste Form", "Perfekt für Sets"],
    rating: 4.6,
    reviews: 64
  },
  {
    id: "sg-004",
    name: "Schnapsglas Heritage",
    price: 16.9,
    image: getPoolImage(glassImagePool, 3),
    gallery: getPoolGallery(glassImagePool, 3),
    glassType: "Schnapsgläser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Jubiläum",
    description: "Klassisches Motiv mit modernem Schliff für besondere Sammlerstücke.",
    featured: false,
    care: "Handwäsche für dauerhafte Brillanz empfohlen.",
    benefits: ["Hochdichte Gravur", "Massive Bodenplatte", "Edle Geschenkoption"],
    rating: 4.9,
    reviews: 42
  },
  {
    id: "sg-005",
    name: "Bierglas Hop Crest",
    price: 29.9,
    image: getPoolImage(glassImagePool, 4),
    gallery: getPoolGallery(glassImagePool, 4),
    glassType: "Biergläser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Geburtstag",
    description: "Voluminoeses Bierglas mit kraftvollem Wappen-Design und klaren Konturen.",
    badge: "Top Geschenk",
    featured: true,
    care: "Spuelmaschinengeeignet, nicht für aggressive Reiniger.",
    benefits: ["Robustes Glas", "Schaumfreundliche Form", "Hochwertige Gravur"],
    rating: 4.8,
    reviews: 171
  },
  {
    id: "sg-006",
    name: "Bierglas Craft Signature",
    price: 27.9,
    image: getPoolImage(glassImagePool, 5),
    gallery: getPoolGallery(glassImagePool, 5),
    glassType: "Biergläser",
    shopCategory: "alle-glaeser",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Elegant",
    description: "Matte Gravur mit eleganter Schrift für ein stilvolles Bar-Feeling zuhause.",
    featured: false,
    care: "Schonprogramm bei maximal 50 Grad empfohlen.",
    benefits: ["Feine Liniengravur", "Balanciertes Gewicht", "Lange Haltbarkeit"],
    rating: 4.5,
    reviews: 58
  },
  {
    id: "sg-007",
    name: "Trinkglas Daily Monogram",
    price: 19.9,
    image: getPoolImage(glassImagePool, 6),
    gallery: getPoolGallery(glassImagePool, 6),
    glassType: "Trinkgläser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    description: "Alltagsglas mit markanter Monogramm-Gravur für persoenlichen Charakter.",
    featured: true,
    care: "Spuelmaschinengeeignet und temperaturbestaendig.",
    benefits: ["Alltagstauglich", "Klarer Auftritt", "Beliebtes Set-Produkt"],
    rating: 4.7,
    reviews: 134
  },
  {
    id: "sg-008",
    name: "Trinkglas Fine Arc",
    price: 21.9,
    image: getPoolImage(glassImagePool, 7),
    gallery: getPoolGallery(glassImagePool, 7),
    glassType: "Trinkgläser",
    shopCategory: "alle-glaeser",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Hochzeit",
    description: "Leicht gebogene Gravur für modern-romantische Tischarrangements.",
    featured: false,
    care: "Handwäsche oder Schonprogramm für lange Oberflächenqualitaet.",
    benefits: ["Filigrane Details", "Feine Haptik", "Geschenkbereit"],
    rating: 4.6,
    reviews: 77
  },
  {
    id: "sg-009",
    name: "Sektglas Velvet Toast",
    price: 26.9,
    image: getPoolImage(glassImagePool, 8),
    gallery: getPoolGallery(glassImagePool, 8),
    glassType: "Sektgläser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Elegant",
    description: "Samtene Optik in der Gravurlinie für Events mit Premium-Anspruch.",
    featured: true,
    care: "Nur Schonprogramm, keine Stahlwolle verwenden.",
    benefits: ["Premium Finish", "Harmonische Silhouette", "Edle Geschenkidee"],
    rating: 4.9,
    reviews: 93
  },
  {
    id: "sg-010",
    name: "Schnapsglas Urban Pulse",
    price: 15.9,
    image: getPoolImage(glassImagePool, 9),
    gallery: getPoolGallery(glassImagePool, 9),
    glassType: "Schnapsgläser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    description: "Kräftige Gravurbalken für ein junges, modernes Party-Statement.",
    featured: false,
    care: "Spuelmaschinengeeignet.",
    benefits: ["Starke Lesbarkeit", "Widerstandsfaehig", "Schnelle Geschenkloesung"],
    rating: 4.4,
    reviews: 49
  },
  {
    id: "sg-011",
    name: "Bierglas Barrel Mark",
    price: 31.9,
    image: getPoolImage(glassImagePool, 10),
    gallery: getPoolGallery(glassImagePool, 10),
    glassType: "Biergläser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Jubiläum",
    description: "Maskuline Gravur für Bar-Liebhaber mit Hang zu klassischer Typografie.",
    featured: true,
    care: "Schonprogramm empfohlen.",
    benefits: ["Stabile Wandstaerke", "Intensiver Gravurkontrast", "Limitierte Auflage"],
    rating: 4.8,
    reviews: 113
  },
  {
    id: "sg-012",
    name: "Trinkglas Studio Calm",
    price: 23.9,
    image: getPoolImage(glassImagePool, 11),
    gallery: getPoolGallery(glassImagePool, 11),
    glassType: "Trinkgläser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Elegant",
    description: "Ruhiges Signaturmotiv für hochwertige Everyday-Tabletops.",
    featured: true,
    care: "Spuelmaschinengeeignet im Glasprogramm.",
    benefits: ["Harmonisches Design", "Robuste Alltagstauglichkeit", "Klarer Premium-Look"],
    rating: 4.9,
    reviews: 81
  },
  {
    id: "gu-001",
    name: "Untersetzer Slate Signature",
    price: 18.9,
    image: getPoolImage(coasterImagePool, 0),
    gallery: getPoolGallery(coasterImagePool, 0),
    glassType: "Glasuntersätzer",
    shopCategory: "glasuntersetzer",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Elegant",
    description: "Vierer-Set aus dunklem Schiefer mit feiner Gravur für ruhige, elegante Table-Settings.",
    badge: "Neu",
    featured: true,
    care: "Mit feuchtem Tuch reinigen und trocken lagern.",
    benefits: ["Rutschhemmende Unterseite", "Edle Natursteinoptik", "Perfekt für Geschenksets"],
    rating: 4.8,
    reviews: 36
  },
  {
    id: "gu-002",
    name: "Untersetzer Oak Crest",
    price: 16.9,
    image: getPoolImage(coasterImagePool, 1),
    gallery: getPoolGallery(coasterImagePool, 1),
    glassType: "Glasuntersätzer",
    shopCategory: "glasuntersetzer",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    description: "Warme Holzoptik mit markanter Gravur als laessige Ergänzung für Hausbar und Dinner-Tisch.",
    featured: false,
    care: "Trocken abwischen und nicht dauerhaft im Wasser liegen lassen.",
    benefits: ["Natuerliche Haptik", "Schnell verschenkt", "Schuetzt empfindliche Flächen"],
    rating: 4.6,
    reviews: 28
  },
  {
    id: "ba-001",
    name: "Cheers Set Hochzeit",
    price: 49.9,
    image: getPoolImage(glassImagePool, 0),
    gallery: [getPoolImage(glassImagePool, 0), getPoolImage(glassImagePool, 7), getPoolImage(coasterImagePool, 0)],
    glassType: "Bundle-Angebote",
    shopCategory: "bundle-angebote",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Hochzeit",
    description: "Geschenkset aus zwei Sektgläsern und passenden Untersetzern mit sichtbarem Preisvorteil.",
    badge: "Bundle Deal",
    featured: true,
    care: "Gläser im Schonprogramm, Untersetzer trocken reinigen.",
    benefits: ["Preisvorteil im Set", "Direkt geschenkfaehig", "Hochwertiger Anlass-Look"],
    rating: 4.9,
    reviews: 52
  },
  {
    id: "ba-002",
    name: "Bar Bundle Signature",
    price: 59.9,
    image: getPoolImage(glassImagePool, 4),
    gallery: [getPoolImage(glassImagePool, 4), getPoolImage(glassImagePool, 10), getPoolImage(coasterImagePool, 1)],
    glassType: "Bundle-Angebote",
    shopCategory: "bundle-angebote",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Jubiläum",
    description: "Bierglas- und Shotglas-Set mit abgestimmten Untersetzern für eine starke Geschenkloesung.",
    badge: "Spare 12 EUR",
    featured: true,
    care: "Gläser im Glasprogramm reinigen, Untersetzer nur feucht abwischen.",
    benefits: ["Sofort einsatzbereit", "Markanter Set-Charakter", "Ideal für Hausbar und Feiern"],
    rating: 4.7,
    reviews: 41
  }
];

export const glassTypes = [
  "Sektgläser",
  "Schnapsgläser",
  "Biergläser",
  "Trinkgläser",
  "Glasuntersätzer",
  "Bundle-Angebote"
] as const;
export const occasions = ["Hochzeit", "Geburtstag", "Jubiläum", "Lustig", "Elegant"] as const;

