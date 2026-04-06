export const legalTemplateNotice =
  "Alle Angaben mit [PLATZHALTER: ...] muessen vor der Veroeffentlichung durch echte Firmendaten ersetzt oder, wenn nicht relevant, entfernt werden.";

export const legalCompanyPlaceholders = {
  companyName: "[PLATZHALTER: Musterfirma e.U.]",
  ownerName: "[PLATZHALTER: Max Mustermann]",
  street: "[PLATZHALTER: Musterstrasse 1]",
  postalCode: "[PLATZHALTER: 1010]",
  city: "[PLATZHALTER: Wien]",
  country: "Oesterreich",
  phone: "[PLATZHALTER: +43 1 2345678]",
  email: "[PLATZHALTER: hallo@musterfirma.at]",
  website: "[PLATZHALTER: https://www.musterfirma.at]",
  businessPurpose: "[PLATZHALTER: Handel mit gravierten Geschenkartikeln und personalisierten Produkten]",
  uidNumber: "[PLATZHALTER: ATU12345678 - nur eintragen, falls vorhanden]",
  companyRegisterNumber: "[PLATZHALTER: FN 123456 a - nur eintragen, falls Firmenbucheintrag vorhanden]",
  companyRegisterCourt: "[PLATZHALTER: Handelsgericht Wien - nur eintragen, falls Firmenbucheintrag vorhanden]",
  supervisoryAuthority:
    "[PLATZHALTER: Zustaendige Bezirkshauptmannschaft oder zustaendiger Magistrat - nur falls relevant]",
  chamber: "[PLATZHALTER: Wirtschaftskammer ... - nur falls relevant]",
  professionalTitle: "[PLATZHALTER: Berufsbezeichnung - nur falls relevant]",
  awardingState: "[PLATZHALTER: Mitgliedstaat der Verleihung - nur falls relevant]",
  professionalRules: "[PLATZHALTER: GewO 1994 oder spezielle Berufsregeln - nur falls relevant]",
  editorialLine:
    "[PLATZHALTER: Informationen zu Produkten, Leistungen und Neuigkeiten des Unternehmens.]",
  returnShippingCosts:
    "[PLATZHALTER: Kunde oder Unternehmen - vor Veroeffentlichung festlegen, wer die unmittelbaren Ruecksendekosten traegt]",
  placeOfJurisdiction: "[PLATZHALTER: zB Wien - nur fuer zulaessige Unternehmergeschaefte verwenden]"
} as const;
