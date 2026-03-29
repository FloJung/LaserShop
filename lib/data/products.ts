import type { DesignerCollection, Product, ShopCategory } from "@/lib/types";

export const collections: DesignerCollection[] = [
  {
    slug: "flo",
    name: "Flo's Designs",
    creator: "Flo",
    description: "Markante Gravuren mit urbanem Charakter fuer moderne Geschenkideen.",
    image:
      "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&w=1200&q=80",
    accent: "from-amber-400 to-orange-500"
  },
  {
    slug: "andrea",
    name: "Andrea's Designs",
    creator: "Andrea",
    description: "Filigrane Linien und elegante Motive fuer stilvolle Momente.",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
    accent: "from-cyan-400 to-blue-500"
  },
  {
    slug: "studio",
    name: "Studio Kollektion",
    creator: "Studio",
    description: "Kuratiert fuer Premium-Anlaesse mit reduzierter, zeitloser Formensprache.",
    image:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80",
    accent: "from-emerald-400 to-teal-500"
  }
];

export const shopCategories: ShopCategory[] = [
  {
    slug: "alle-glaeser",
    name: "Alle Glaeser",
    description: "Das komplette Sortiment an gravierten Sekt-, Schnaps-, Bier- und Trinkglaesern."
  },
  {
    slug: "glasuntersetzer",
    name: "Glasuntersaetzer",
    description: "Passende Untersetzer als stilvolle Ergaenzung fuer Geschenksets und Tischbilder."
  },
  {
    slug: "bundle-angebote",
    name: "Bundle-Angebote",
    description: "Kuratiert gebuendelte Sets mit Preisvorteil fuer Geschenke und besondere Anlaesse."
  }
];

export const products: Product[] = [
  {
    id: "sg-001",
    name: "Sektglas Aurora Ring",
    price: 24.9,
    image:
      "https://images.unsplash.com/photo-1524594154908-edd6d5f6f410?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1524594154908-edd6d5f6f410?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Sektglaeser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Hochzeit",
    description: "Vorgraviertes Sektglas mit feinem Ringmotiv fuer besondere Toast-Momente.",
    badge: "Bestseller",
    featured: true,
    care: "Spuelmaschinengeeignet im Schonprogramm.",
    benefits: ["Praezise Lasergravur", "Kristallklares Glas", "Geschenkfertig verpackbar"],
    rating: 4.8,
    reviews: 126
  },
  {
    id: "sg-002",
    name: "Sektglas Pure Line",
    price: 22.9,
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1524594154908-edd6d5f6f410?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Sektglaeser",
    shopCategory: "alle-glaeser",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Elegant",
    description: "Minimalistische Gravur mit ruhiger Typografie und klarer Linienfuehrung.",
    featured: true,
    care: "Handwaesche empfohlen, um den Glanz dauerhaft zu erhalten.",
    benefits: ["Zeitloses Design", "Sanft abgerundeter Rand", "Ideal fuer Dinner"],
    rating: 4.7,
    reviews: 89
  },
  {
    id: "sg-003",
    name: "Schnapsglas Cheers Shot",
    price: 14.9,
    image:
      "https://images.unsplash.com/photo-1568637445382-2714f7cbf2c0?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1568637445382-2714f7cbf2c0?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Schnapsglaeser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Lustig",
    description: "Kompaktes Shotglas mit dynamischer Gravur fuer Partys und Geburtstage.",
    badge: "Neu",
    featured: true,
    care: "Spuelmaschinengeeignet bis 55 Grad.",
    benefits: ["Scharfer Gravurkontrast", "Standfeste Form", "Perfekt fuer Sets"],
    rating: 4.6,
    reviews: 64
  },
  {
    id: "sg-004",
    name: "Schnapsglas Heritage",
    price: 16.9,
    image:
      "https://images.unsplash.com/photo-1471421298428-1513ab720a8e?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1471421298428-1513ab720a8e?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1568637445382-2714f7cbf2c0?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Schnapsglaeser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Jubilaeum",
    description: "Klassisches Motiv mit modernem Schliff fuer besondere Sammlerstücke.",
    featured: false,
    care: "Handwaesche fuer dauerhafte Brillanz empfohlen.",
    benefits: ["Hochdichte Gravur", "Massive Bodenplatte", "Edle Geschenkoption"],
    rating: 4.9,
    reviews: 42
  },
  {
    id: "sg-005",
    name: "Bierglas Hop Crest",
    price: 29.9,
    image:
      "https://images.unsplash.com/photo-1514361892635-eae31ec16bbf?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1514361892635-eae31ec16bbf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Bierglaeser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Geburtstag",
    description: "Voluminoeses Bierglas mit kraftvollem Wappen-Design und klaren Konturen.",
    badge: "Top Geschenk",
    featured: true,
    care: "Spuelmaschinengeeignet, nicht fuer aggressive Reiniger.",
    benefits: ["Robustes Glas", "Schaumfreundliche Form", "Hochwertige Gravur"],
    rating: 4.8,
    reviews: 171
  },
  {
    id: "sg-006",
    name: "Bierglas Craft Signature",
    price: 27.9,
    image:
      "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1514361892635-eae31ec16bbf?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Bierglaeser",
    shopCategory: "alle-glaeser",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Elegant",
    description: "Matte Gravur mit eleganter Schrift fuer ein stilvolles Bar-Feeling zuhause.",
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
    image:
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1524594154908-edd6d5f6f410?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Trinkglaeser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    description: "Alltagsglas mit markanter Monogramm-Gravur fuer persoenlichen Charakter.",
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
    image:
      "https://images.unsplash.com/photo-1578425570266-d85ae6f0d7ed?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1578425570266-d85ae6f0d7ed?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Trinkglaeser",
    shopCategory: "alle-glaeser",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Hochzeit",
    description: "Leicht gebogene Gravur fuer modern-romantische Tischarrangements.",
    featured: false,
    care: "Handwaesche oder Schonprogramm fuer lange Oberflaechenqualitaet.",
    benefits: ["Filigrane Details", "Feine Haptik", "Geschenkbereit"],
    rating: 4.6,
    reviews: 77
  },
  {
    id: "sg-009",
    name: "Sektglas Velvet Toast",
    price: 26.9,
    image:
      "https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1524594154908-edd6d5f6f410?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Sektglaeser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Elegant",
    description: "Samtene Optik in der Gravurlinie fuer Events mit Premium-Anspruch.",
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
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1568637445382-2714f7cbf2c0?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1471421298428-1513ab720a8e?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Schnapsglaeser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    description: "Kräftige Gravurbalken fuer ein junges, modernes Party-Statement.",
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
    image:
      "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1514361892635-eae31ec16bbf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Bierglaeser",
    shopCategory: "alle-glaeser",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Jubilaeum",
    description: "Maskuline Gravur fuer Bar-Liebhaber mit Hang zu klassischer Typografie.",
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
    image:
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1578425570266-d85ae6f0d7ed?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Trinkglaeser",
    shopCategory: "alle-glaeser",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Elegant",
    description: "Ruhiges Signaturmotiv fuer hochwertige Everyday-Tabletops.",
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
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Glasuntersaetzer",
    shopCategory: "glasuntersetzer",
    collection: "Andrea's Designs",
    collectionSlug: "andrea",
    designer: "Andrea",
    occasion: "Elegant",
    description: "Vierer-Set aus dunklem Schiefer mit feiner Gravur fuer ruhige, elegante Table-Settings.",
    badge: "Neu",
    featured: true,
    care: "Mit feuchtem Tuch reinigen und trocken lagern.",
    benefits: ["Rutschhemmende Unterseite", "Edle Natursteinoptik", "Perfekt fuer Geschenksets"],
    rating: 4.8,
    reviews: 36
  },
  {
    id: "gu-002",
    name: "Untersetzer Oak Crest",
    price: 16.9,
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Glasuntersaetzer",
    shopCategory: "glasuntersetzer",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Geburtstag",
    description: "Warme Holzoptik mit markanter Gravur als laessige Ergaenzung fuer Hausbar und Dinner-Tisch.",
    featured: false,
    care: "Trocken abwischen und nicht dauerhaft im Wasser liegen lassen.",
    benefits: ["Natuerliche Haptik", "Schnell verschenkt", "Schuetzt empfindliche Flaechen"],
    rating: 4.6,
    reviews: 28
  },
  {
    id: "ba-001",
    name: "Cheers Set Hochzeit",
    price: 49.9,
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1524594154908-edd6d5f6f410?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Bundle-Angebote",
    shopCategory: "bundle-angebote",
    collection: "Studio Kollektion",
    collectionSlug: "studio",
    designer: "Studio",
    occasion: "Hochzeit",
    description: "Geschenkset aus zwei Sektglaesern und passenden Untersetzern mit sichtbarem Preisvorteil.",
    badge: "Bundle Deal",
    featured: true,
    care: "Glaeser im Schonprogramm, Untersetzer trocken reinigen.",
    benefits: ["Preisvorteil im Set", "Direkt geschenkfaehig", "Hochwertiger Anlass-Look"],
    rating: 4.9,
    reviews: 52
  },
  {
    id: "ba-002",
    name: "Bar Bundle Signature",
    price: 59.9,
    image:
      "https://images.unsplash.com/photo-1514361892635-eae31ec16bbf?auto=format&fit=crop&w=1000&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1514361892635-eae31ec16bbf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80"
    ],
    glassType: "Bundle-Angebote",
    shopCategory: "bundle-angebote",
    collection: "Flo's Designs",
    collectionSlug: "flo",
    designer: "Flo",
    occasion: "Jubilaeum",
    description: "Bierglas- und Shotglas-Set mit abgestimmten Untersetzern fuer eine starke Geschenkloesung.",
    badge: "Spare 12 EUR",
    featured: true,
    care: "Glaeser im Glasprogramm reinigen, Untersetzer nur feucht abwischen.",
    benefits: ["Sofort einsatzbereit", "Markanter Set-Charakter", "Ideal fuer Hausbar und Feiern"],
    rating: 4.7,
    reviews: 41
  }
];

export const glassTypes = [
  "Sektglaeser",
  "Schnapsglaeser",
  "Bierglaeser",
  "Trinkglaeser",
  "Glasuntersaetzer",
  "Bundle-Angebote"
] as const;
export const occasions = ["Hochzeit", "Geburtstag", "Jubilaeum", "Lustig", "Elegant"] as const;

