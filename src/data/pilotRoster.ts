export interface PilotInfo {
  name: string;
  callsign: string;
  rank: string;
  id: string;
  contact: string;
  awards: string[];
}

export const PILOT_ROSTER: Record<string, PilotInfo> = {
  GE01: { name: "Major Erik Lindberg",    callsign: "VIPER",  rank: "Major (OF-3)",      id: "550421-1234", contact: "Karin Lindberg · +46 70 321 4567",  awards: ["FM Förtjänstmedalj i guld", "NATO Article 5 Medal", "Baltic Air Policing 2024"] },
  GE02: { name: "Kapten Sara Björkman",   callsign: "WOLF",   rank: "Kapten (OF-2)",     id: "880915-5678", contact: "Johan Björkman · +46 73 445 8812",   awards: ["FM Förtjänstmedalj i silver", "Nordic DCA 2023"] },
  GE03: { name: "Löjtnant Jonas Ek",      callsign: "HAWK",   rank: "Löjtnant (OF-1)",   id: "940302-2210", contact: "Maria Ek · +46 72 900 1123",          awards: ["Flygvapnets Merit 2025"] },
  GE04: { name: "Major Anna Strand",      callsign: "STORM",  rank: "Major (OF-3)",      id: "760518-9988", contact: "Peter Strand · +46 70 555 3344",      awards: ["FM Förtjänstmedalj i guld", "Utlandstjänst ISAF"] },
  GE05: { name: "Kapten Marcus Nordin",   callsign: "BLADE",  rank: "Kapten (OF-2)",     id: "870204-7761", contact: "Lisa Nordin · +46 73 221 6690",       awards: ["Nordic DCA 2022"] },
  GE06: { name: "Major David Lund",       callsign: "RAVEN",  rank: "Major (OF-3)",      id: "720630-4453", contact: "Astrid Lund · +46 70 887 2201",       awards: ["FM Förtjänstmedalj i silver", "Baltic Air Policing 2023"] },
  GE07: { name: "Kapten Lena Svensson",   callsign: "LYNX",   rank: "Kapten (OF-2)",     id: "910122-3344", contact: "Karl Svensson · +46 76 334 9900",     awards: ["Flygvapnets Merit 2024"] },
  GE08: { name: "Löjtnant Erik Petersen", callsign: "DART",   rank: "Löjtnant (OF-1)",   id: "960808-1122", contact: "Ingrid Petersen · +46 73 009 4455",   awards: [] },
  GE09: { name: "Major Hans Karlsson",    callsign: "BULL",   rank: "Major (OF-3)",      id: "680415-6677", contact: "Britta Karlsson · +46 70 712 3388",   awards: ["FM Förtjänstmedalj i guld", "Utlandstjänst Kosovo"] },
  GE10: { name: "Kapten Sofia Berg",      callsign: "NOVA",   rank: "Kapten (OF-2)",     id: "850920-8843", contact: "Anders Berg · +46 76 558 7712",       awards: ["Nordic DCA 2024"] },
  GE11: { name: "Major Thomas Qvist",     callsign: "IRON",   rank: "Major (OF-3)",      id: "710311-5590", contact: "Helena Qvist · +46 70 330 6621",      awards: ["FM Förtjänstmedalj i silver", "Baltic Air Policing 2022"] },
  GE12: { name: "Löjtnant Nina Åberg",    callsign: "FROST",  rank: "Löjtnant (OF-1)",   id: "981205-0033", contact: "Ulla Åberg · +46 73 667 1100",        awards: [] },
  GF01: { name: "Major Carl Ström",       callsign: "VENOM",  rank: "Major (OF-3)",      id: "750625-2211", contact: "Petra Ström · +46 70 443 9988",       awards: ["FM Förtjänstmedalj i guld", "EW Excellence Award 2023"] },
  GF02: { name: "Kapten Eva Lindén",      callsign: "COBRA",  rank: "Kapten (OF-2)",     id: "900112-8870", contact: "Lars Lindén · +46 76 112 4450",       awards: ["Flygvapnets Merit 2025"] },
  GF03: { name: "Löjtnant Mikael Dahl",   callsign: "SPIKE",  rank: "Löjtnant (OF-1)",   id: "970520-3345", contact: "Ingmar Dahl · +46 73 778 0011",       awards: [] },
  GF04: { name: "Major Petra Holm",       callsign: "SABRE",  rank: "Major (OF-3)",      id: "730808-4412", contact: "Fredrik Holm · +46 70 990 7723",      awards: ["FM Förtjänstmedalj i silver", "Nordic EA 2022"] },
  GF05: { name: "Kapten Anders Falk",     callsign: "RAPTOR", rank: "Kapten (OF-2)",     id: "881117-6634", contact: "Maja Falk · +46 73 556 2290",         awards: ["Nordic DCA 2023"] },
  GF06: { name: "Löjtnant Karin Lund",    callsign: "ARROW",  rank: "Löjtnant (OF-1)",   id: "000303-9910", contact: "Sven Lund · +46 76 889 3340",         awards: [] },
};
