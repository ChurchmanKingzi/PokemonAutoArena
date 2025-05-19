/**
 * Pokemon Ability Service
 * Stellt Funktionen bereit, um Pokemon-Fähigkeiten abzurufen
 */

/**
 * Fähigkeitsfarben für visuelle Darstellung
 * Die Farben orientieren sich an Pokémon-Typen
 */
const ABILITY_COLORS = {
  // Typ-basierte Fähigkeiten
  "Chlorophyll": "#78C850",     // Pflanze-Grün
  "Großbrand": "#F08030",       // Feuer-Orange
  "Sturzbach": "#6890F0",       // Wasser-Blau
  "Statik": "#F8D030",          // Elektro-Gelb
  "Schwebe": "#A890F0",         // Psycho-Lila
  "Erzwinger": "#A8A878",       // Normal-Beige
  "Feuerfänger": "#F08030",     // Feuer-Orange
  "Flammkörper": "#F08030",     // Feuer-Orange
  "Notdünger": "#78C850",       // Pflanze-Grün
  "Blitzfänger": "#F8D030",     // Elektro-Gelb
  "Eishaut": "#98D8D8",         // Eis-Hellblau
  "Felskern": "#B8A038",        // Gestein-Braun
  "Facettenauge": "#A8B820",    // Käfer-Grün
  "Hexaplaga": "#A8B820",       // Käfer-Grün
  "Magnetfalle": "#B8B8D0",     // Stahl-Grau
  "Sandschleier": "#E0C068",    // Boden-Beige
  "Sandscharrer": "#E0C068",    // Boden-Beige
  "Sandgewalt": "#E0C068",      // Boden-Beige
  "Sandsturm": "#E0C068",       // Boden-Beige
  "Sandspeier": "#E0C068",      // Boden-Beige
  "Floraschild": "#78C850",     // Pflanze-Grün
  "Solarkraft": "#F8D030",      // Strahlend-Gelb
  "Wassertempo": "#6890F0",     // Wasser-Blau
  "Voltabsorber": "#F8D030",    // Elektro-Gelb
  "H2O-Absorber": "#6890F0",    // Wasser-Blau
  "Giftdorn": "#A040A0",        // Gift-Lila
  "Giftgriff": "#A040A0",       // Gift-Lila
  "Giftwahn": "#A040A0",        // Gift-Lila
  "Giftheilung": "#A040A0",     // Gift-Lila
  "Giftkette": "#A040A0",       // Gift-Lila
  "Giftpuppenspiel": "#A040A0", // Gift-Lila
  "Giftbelag": "#A040A0",       // Gift-Lila
  "Korrosion": "#A040A0",       // Gift-Lila
  "Pflanzengabe": "#78C850",    // Pflanze-Grün
  "Pflanzenpelz": "#78C850",    // Pflanze-Grün
  "Elektro-Erzeuger": "#F8D030",// Elektro-Gelb
  "Elektrohaut": "#F8D030",     // Elektro-Gelb
  "Nebel-Erzeuger": "#A890F0",  // Mystisch-Lila
  "Psycho-Erzeuger": "#F85888", // Psycho-Pink
  "Gras-Erzeuger": "#78C850",   // Pflanze-Grün
  "Drachenkiefer": "#7038F8",   // Drache-Lila
  "Scherentmacht": "#C03028",   // Rot für Stärke
  "Steinhaupt": "#B8A038",      // Gestein-Braun
  "Steinträger": "#B8A038",     // Gestein-Braun
  "Wutausbruch": "#C03028",     // Kampf-Rot
  "Wutpanzer": "#B8A038",       // Kampf-Rot mit Verteidigung
  "Duftnote": "#EE99AC",        // Süß-Rosa
  "Dufthülle": "#EE99AC",       // Süß-Rosa
  "Duftschwade": "#EE99AC",     // Süß-Rosa
  "Feenaura": "#EE99AC",        // Fee-Rosa
  "Feenschicht": "#EE99AC",     // Fee-Rosa
  "Rostlose Seele": "#705898",  // Geist-Lila
  "Dunkelaura": "#705848",      // Unlicht-Dunkelbraun
  
  // Kampf- und Stärke-Fähigkeiten
  "Adrenalin": "#C03028",       // Kampf-Rot
  "Bedroher": "#705848",        // Unlicht-Braun
  "Anspannung": "#705848",      // Unlicht-Braun
  "Bruchrüstung": "#B8A038",    // Gestein-Braun
  "Brustbieter": "#C03028",     // Kampf-Rot
  "Eisenfaust": "#B8B8D0",      // Stahl-Grau
  "Kraftkoloss": "#C03028",     // Kampf-Rot
  "Krallenwucht": "#C03028",    // Kampf-Rot
  "Felsenfest": "#B8A038",      // Gestein-Braun
  "Kampfpanzer": "#B8A038",     // Gestein-Braun
  "Hochmut": "#C03028",         // Kampf-Rot
  "Kurzschluss": "#F8D030",     // Elektro-Gelb mit Wut
  "Rauflust": "#C03028",        // Kampf-Rot
  "Rauhaut": "#E0C068",         // Boden-Beige
  "Rohe Gewalt": "#C03028",     // Kampf-Rot
  "Siegeswille": "#C03028",     // Kampf-Rot
  "Techniker": "#A8A878",       // Normal-Beige für Präzision
  "Titankiefer": "#B8B8D0",     // Stahl-Grau
  "Überbrückung": "#F85888",    // Psycho-Pink für Verbindung
  "Übereifer": "#C03028",       // Kampf-Rot
  "Unbeugsamkeit": "#C03028",   // Kampf-Rot
  "Achtlos": "#A8A878",         // Normal-Beige
  "Schildlos": "#A8A878",       // Normal-Beige
  
  // Defensive und Schutz-Fähigkeiten
  "Panzerhaut": "#B8A038",      // Gestein-Braun
  "Robustheit": "#B8A038",      // Gestein-Braun
  "Expidermis": "#B8A038",      // Gestein-Braun 
  "Filter": "#A890F0",          // Psycho-Lila
  "Magieschild": "#A890F0",     // Psycho-Lila
  "Magiespiegel": "#A890F0",    // Psycho-Lila
  "Speckschicht": "#A8A878",    // Normal-Beige
  "Schutzsverwandlung": "#A890F0", // Psycho-Lila
  "Multischuppe": "#7038F8",    // Drache-Lila
  "Notschutz": "#A890F0",       // Psycho-Lila
  "Zähigkeit": "#B8A038",       // Gestein-Braun
  "Magmapanzer": "#F08030",     // Feuer-Orange
  "Schneemantel": "#98D8D8",    // Eis-Hellblau
  "Schneeschauer": "#98D8D8",   // Eis-Hellblau
  "Hitzeschutz": "#F08030",     // Feuer-Orange
  "Neutraltorso": "#A8A878",    // Normal-Beige
  "Schwermetall": "#B8B8D0",    // Stahl-Grau
  "Leichtmetall": "#B8B8D0",    // Stahl-Grau
  "Immunität": "#A8A878",       // Normal-Beige
  "Hydration": "#6890F0",       // Wasser-Blau
  "Feuchtigkeit": "#6890F0",    // Wasser-Blau
  "Wackerer Schild": "#B8B8D0", // Stahl-Grau
  "Edelmut": "#EE99AC",         // Fee-Rosa
  "Partikelschutz": "#B8B8D0",  // Stahl-Grau
  "Phantomschutz": "#705898",   // Geist-Lila
  "Unheilskörper": "#705848",   // Unlicht-Dunkelbraun
  
  // Geschwindigkeit und Initiative
  "Temposchub": "#A890F0",      // Psycho-Lila
  "Rasanz": "#F8D030",          // Elektro-Gelb für Schnelligkeit
  "Starthilfe": "#F8D030",      // Elektro-Gelb für Boost
  "Wegsperre": "#C03028",       // Kampf-Rot
  "Schwebedurch": "#A890F0",    // Psycho-Lila
  "Windreiter": "#A890F0",      // Flug-Blau mit Wind
  "Taumelschritt": "#A8A878",   // Normal-Beige
  "Schnüffler": "#A8A878",      // Normal-Beige
  "Ausweglos": "#705848",       // Unlicht-Braun
  "Frühwecker": "#A8A878",      // Normal-Beige
  "Hasenfuß": "#A8A878",        // Normal-Beige
  "Angsthase": "#A8A878",       // Normal-Beige
  "Entlastung": "#A8A878",      // Normal-Beige
  "Reißaus": "#A8A878",         // Normal-Beige
  "Rückzug": "#A8A878",         // Normal-Beige
  
  // Mentale und Kognitive Fähigkeiten
  "Konzentrator": "#F85888",    // Psycho-Pink
  "Telepathie": "#F85888",      // Psycho-Pink
  "Vorahnung": "#F85888",       // Psycho-Pink
  "Synchro": "#F85888",         // Psycho-Pink
  "Zeitspiel": "#F85888",       // Psycho-Pink
  "Geistiges Auge": "#F85888",  // Psycho-Pink
  "Erfassen": "#F85888",        // Psycho-Pink
  "Download": "#F85888",        // Psycho-Pink
  "Analyse": "#F85888",         // Psycho-Pink
  "Mentalkraft": "#F85888",     // Psycho-Pink
  "Vorwarnung": "#F85888",      // Psycho-Pink
  "Tastfluch": "#705898",       // Geist-Lila
  "Strolch": "#705848",         // Unlicht-Braun
  "Wankelmut": "#A8A878",       // Normal-Beige
  "Unkenntnis": "#A8A878",      // Normal-Beige
  "Gleichmut": "#F85888",       // Psycho-Pink
  "Glückspilz": "#EE99AC",      // Fee-Rosa
  "Insomnia": "#705898",        // Geist-Lila
  "Dösigkeit": "#A8A878",       // Normal-Beige
  "Schnarchnase": "#A8A878",    // Normal-Beige
  "Munterkeit": "#F08030",      // Feuer-Orange für Energie
  "Langfinger": "#705848",      // Unlicht-Braun
  
  // Umgebungs- und Wetter-bezogene Fähigkeiten
  "Niesel": "#6890F0",          // Wasser-Blau
  "Dürre": "#F08030",           // Feuer-Orange
  "Klimaschutz": "#A8A878",     // Normal-Beige
  "Prognose": "#A890F0",        // Psycho-Lila
  "Wolke Sieben": "#A890F0",    // Psycho-Lila
  "Regengenuss": "#6890F0",     // Wasser-Blau
  "Sturmsog": "#6890F0",        // Wasser-Blau
  "Trockenheit": "#F08030",     // Feuer-Orange
  "Zenithaut": "#A890F0",       // Flug-Blau
  "Frostschicht": "#98D8D8",    // Eis-Hellblau
  "Orkanschwingen": "#A890F0",  // Flug-Blau
  
  // Besondere und Einzigartige Fähigkeiten
  "Variabilität": "#A8A878",    // Normal-Beige
  "Hadronen-Motor": "#F8D030",  // Elektro-Gelb
  "Farbwechsel": "#A8A878",     // Normal-Beige
  "Mimese": "#A8A878",          // Normal-Beige
  "Wandlungskunst": "#A8A878",  // Normal-Beige
  "Trugbild": "#A8A878",        // Normal-Beige
  "Lärmschutz": "#A8A878",      // Normal-Beige
  "Punk Rock": "#F8D030",       // Elektro-Gelb mit Attitude
  "Plus": "#F8D030",            // Elektro-Gelb
  "Minus": "#F8D030",           // Elektro-Gelb
  "Doppelgänger": "#A8A878",    // Normal-Beige
  "Chemiekraft": "#A040A0",     // Gift-Lila

  
  "Glaskörper": "##FFFFFF",    // Weiß


  // Kampf/Stärke
  "Affenfokus": "#C03028",      // Kampf-Rot
  "Dynamobeine": "#C03028",     // Kampf-Rot
  
  // Statuseffektbezogen
  "Alpha-System": "#A8A878",    // Normal-Beige für Anpassungsfähigkeit
  "Alptraum": "#705898",        // Geist-Lila
  "Aura-Umkehr": "#705848",     // Unlicht-Dunkelbraun
  "Boffel": "#A8A878",          // Normal-Beige
  "Batterie": "#F8D030",        // Elektro-Gelb
  "Beschattung": "#705848",     // Unlicht-Dunkelbraun
  "Bestien-Boost": "#7038F8",   // Drache-Lila für monströse Stärke
  
  // Elementar
  "Blütenhülle": "#78C850",     // Pflanze-Grün
  "Bodenschmaus": "#E0C068",    // Boden-Beige
  "Delta-Wind": "#A890F0",      // Flug-Blau
  "Dampfantrieb": "#F08030",    // Feuer-Orange mit Wasser-Einfluss
  
  // Spezielle Eigenschaften
  "Apport": "#A8A878",          // Normal-Beige
  "Buntkörper": "#EE99AC",      // Fee-Rosa für Anziehungskraft
  "Dauerschlaf": "#705898",     // Geist-Lila
  "Erinnerungskraft": "#F85888", // Psycho-Pink
  "Eisenstachel": "#B8B8D0",    // Stahl-Grau
  "Eisflügelstaub": "#98D8D8",  // Eis-Hellblau
  
  // Feldeffekte
  "Endland": "#F08030",         // Feuer-Orange für extreme Hitze
  "Feldherr": "#A8A878",        // Normal-Beige für Kommando
  "Fischschwarm": "#6890F0",    // Wasser-Blau
  
  // Verstärkungen
  "Freundschaftsakt": "#EE99AC", // Fee-Rosa für Freundschaft
  "Heilwandel": "#EE99AC",      // Fee-Rosa für Heilung
  "Heißhunger": "#A8A878",      // Normal-Beige
  "Helles Wiehern": "#A8A878",  // Normal-Beige für ermutigendes Geräusch
  
  // Königliche/Besondere
  "Kugelsicher": "#B8B8D0",     // Stahl-Grau für Schutz
  "Kühnes Schwert": "#B8B8D0",  // Stahl-Grau
  "Kuriose Arznei": "#A040A0",  // Gift-Lila für Medizin
  "Limitschild": "#B8A038",     // Gestein-Braun für Abwehr
  "Lockenkopf": "#A8A878",      // Normal-Beige
  
  // Schutz
  "Läutersalz": "#EE99AC",      // Fee-Rosa für Reinigung
  "Magenkrempler": "#A040A0",   // Gift-Lila für Mageninhalt
  "Majestät": "#A8A878",        // Normal-Beige für königliches Auftreten
  "Megawumme": "#A8A878",       // Normal-Beige für Wucht
  "Metallprotektor": "#B8B8D0", // Stahl-Grau
  
  // Mystisch
  "Mumie": "#705898",           // Geist-Lila
  "Myzelenkraft": "#78C850",    // Pflanze-Grün für Pilzpflanze
  "Orichalkum-Puls": "#F08030", // Feuer-Orange für Hitze
  "Paläosynthese": "#78C850",   // Pflanze-Grün
  "Pastellhülle": "#EE99AC",    // Fee-Rosa
  
  // Besondere Fähigkeiten
  "Plätscherstimme": "#6890F0", // Wasser-Blau
  "Prismarüstung": "#B8A038",   // Gestein-Braun für Schutz
  "Profiteur": "#A8A878",       // Normal-Beige
  "Quälerei": "#705848",        // Unlicht-Dunkelbraun für Sadismus
  "Quantenantrieb": "#F85888",  // Psycho-Pink für übernatürliche Geschwindigkeit
  
  // Spezialtypen
  "Receiver": "#F85888",        // Psycho-Pink für Empfangen
  "Schwächling": "#A8A878",     // Normal-Beige
  "Schweifrüstung": "#B8A038",  // Gestein-Braun für Abwehr
  "Seelenherz": "#705898",      // Geist-Lila
  
  // Tera-Typen
  "Tera-Panzer": "#B8A038",     // Gestein-Braun für Schutz
  "Tera-Wandel": "#A8A878",     // Normal-Beige für Wandel
  "Teraforming Null": "#A8A878", // Normal-Beige
  "Teravolt": "#F8D030",        // Elektro-Gelb
  "Thermowandel": "#F08030",    // Feuer-Orange
  "Tiefkühlkopf": "#98D8D8",    // Eis-Hellblau
  
  // Effektverstärker
  "Trance-Modus": "#F85888",    // Psycho-Pink für Trance
  "Transistor": "#F8D030",      // Elektro-Gelb
  "Triumphstern": "#A8A878",    // Normal-Beige mit Siegesgefühl
  "Turbobrand": "#F08030",      // Feuer-Orange
  
  // Wassertypen
  "Verklumpen": "#6890F0",      // Wasser-Blau
  "Viskosität": "#6890F0",      // Wasser-Blau
  "Wasserblase": "#6890F0",     // Wasser-Blau
  
  // Spezialhilfen
  "Wiederkäuer": "#A8A878",     // Normal-Beige
  "Windkraft": "#A890F0",       // Flug-Blau mit Wind
  "Wollflaum": "#A8A878",       // Normal-Beige für Wolle
  "Würggeschoss": "#B8A038",    // Gestein-Braun für Geschoss
  
  // Zusätzliche Spezialfähigkeiten
  "Zauberer": "#F85888",        // Psycho-Pink für magische Fähigkeiten
  "Zerebralmacht": "#F85888",   // Psycho-Pink für geistige Fähigkeiten
  "Zuckerhülle": "#EE99AC",     // Fee-Rosa für süßen Duft
  "Verborgene Faust": "#C03028", // Kampf-Rot
  "Kommandant": "#A8A878",      // Normal-Beige für Führung
  "Superwechsel": "#A8A878",    // Normal-Beige für Formwandel
  "Synchroauftritt": "#F85888", // Psycho-Pink für Synchronisierung
  "Taktikwechsel": "#A8A878",   // Normal-Beige für Taktik
  "Stählerner Wille": "#B8B8D0", // Stahl-Grau
  "Stahlprofi": "#B8B8D0",      // Stahl-Grau
  "Stahlrückgrat": "#B8B8D0",   // Stahl-Grau
  "Schnellschuss": "#A8A878",   // Normal-Beige für Schnelligkeit
  "Schraubflosse": "#6890F0",   // Wasser-Blau
  "Surf-Schweif": "#F8D030",    // Elektro-Gelb für elektrischen Surf
  "Süßer Nektar": "#EE99AC",    // Fee-Rosa für Süße
  "Symbiose": "#78C850",        // Pflanze-Grün für symbiotisches Verhalten
  "Unheilsgefäß": "#705848",    // Unlicht-Dunkelbraun
  "Unheilsjuwelen": "#705848",  // Unlicht-Dunkelbraun
  "Unheilsschwert": "#705848",  // Unlicht-Dunkelbraun
  "Unheilstafeln": "#705848",   // Unlicht-Dunkelbraun
  "Urmeer": "#6890F0",          // Wasser-Blau für Ur-Ozean
  "Libero": "#C03028",          // Kampf-Rot für Beweglichkeit
  "Scharwandel": "#A8A878",     // Normal-Beige für Wandel
  "Schneegscharrer": "#98D8D8", // Eis-Hellblau
  "Goldkörper": "#F8D030",      // Elektro-Gelb (goldfarben)
  "Kraftquelle": "#A8A878",     // Normal-Beige für Stärkung
  "Dunkles Wiehern": "#705848", // Unlicht-Dunkelbraun
  "Heranwachsen": "#78C850",    // Pflanze-Grün für Wachstum  

  // Kampf/Stärke bezogen
  "Adlerauge": "#A890F0",        // Flug-Blau
  "Affenfokus": "#C03028",       // Kampf-Rot
  "Barrikadax": "#B8A038",       // Gestein-Braun für Abwehr
  "Bissgnado": "#C03028",        // Kampf-Rot für Angriff
  "Dynamobeine": "#C03028",      // Kampf-Rot
  "Libero": "#C03028",           // Kampf-Rot für Beweglichkeit
  "Verborgene Faust": "#C03028", // Kampf-Rot
  
  // Elementar-Typen
  "Alpha-System": "#A8A878",     // Normal-Beige für Anpassungsfähigkeit
  "Alptraum": "#705898",         // Geist-Lila
  "Aura-Umkehr": "#705848",      // Unlicht-Dunkelbraun
  "Batterie": "#F8D030",         // Elektro-Gelb
  "Blütenhülle": "#78C850",      // Pflanze-Grün
  "Bodenschmaus": "#E0C068",     // Boden-Beige
  "Dampfantrieb": "#F08030",     // Feuer-Orange mit Wasser-Einfluss
  "Delta-Wind": "#A890F0",       // Flug-Blau
  "Eisenstachel": "#B8B8D0",     // Stahl-Grau
  "Eisflügelstaub": "#98D8D8",   // Eis-Hellblau
  "Endland": "#F08030",          // Feuer-Orange für extreme Hitze
  
  // Wasser/Eis-Typen
  "Fischschwarm": "#6890F0",     // Wasser-Blau
  "Plätscherstimme": "#6890F0",  // Wasser-Blau
  "Schraubflosse": "#6890F0",    // Wasser-Blau
  "Tiefkühlkopf": "#98D8D8",     // Eis-Hellblau
  "Urmeer": "#6890F0",           // Wasser-Blau für Ur-Ozean
  "Verklumpen": "#6890F0",       // Wasser-Blau
  "Viskosität": "#6890F0",       // Wasser-Blau
  "Wasserblase": "#6890F0",      // Wasser-Blau
  "Schneegscharrer": "#98D8D8",  // Eis-Hellblau
  
  // Psychische/Geistige Fähigkeiten
  "Beschattung": "#705848",      // Unlicht-Dunkelbraun
  "Dauerschlaf": "#705898",      // Geist-Lila
  "Erinnerungskraft": "#F85888", // Psycho-Pink
  "Läutersalz": "#EE99AC",       // Fee-Rosa für Reinigung
  "Mumie": "#705898",            // Geist-Lila
  "Quantenantrieb": "#F85888",   // Psycho-Pink für übernatürliche Geschwindigkeit
  "Receiver": "#F85888",         // Psycho-Pink für Empfangen
  "Seelenherz": "#705898",       // Geist-Lila
  "Synchroauftritt": "#F85888",  // Psycho-Pink für Synchronisierung
  "Trance-Modus": "#F85888",     // Psycho-Pink für Trance
  "Zauberer": "#F85888",         // Psycho-Pink für magische Fähigkeiten
  "Zerebralmacht": "#F85888",    // Psycho-Pink für geistige Fähigkeiten
  
  // Schutz/Verteidigung
  "Bestien-Boost": "#7038F8",    // Drache-Lila für monströse Stärke
  "Kugelsicher": "#B8B8D0",      // Stahl-Grau für Schutz
  "Limitschild": "#B8A038",      // Gestein-Braun für Abwehr
  "Metallprotektor": "#B8B8D0",  // Stahl-Grau
  "Prismarüstung": "#B8A038",    // Gestein-Braun für Schutz
  "Schweifrüstung": "#B8A038",   // Gestein-Braun für Abwehr
  "Tera-Panzer": "#B8A038",      // Gestein-Braun für Schutz
  
  // Spezialfähigkeiten
  "Apport": "#A8A878",           // Normal-Beige
  "Boffel": "#A8A878",           // Normal-Beige
  "Buntkörper": "#EE99AC",       // Fee-Rosa für Anziehungskraft
  "Feldherr": "#A8A878",         // Normal-Beige für Kommando
  "Freundschaftsakt": "#EE99AC", // Fee-Rosa für Freundschaft
  "Goldkörper": "#F8D030",       // Elektro-Gelb (goldfarben)
  "Heißhunger": "#A8A878",       // Normal-Beige
  "Helles Wiehern": "#A8A878",   // Normal-Beige für ermutigendes Geräusch
  "Dunkles Wiehern": "#705848",  // Unlicht-Dunkelbraun
  "Kommandant": "#A8A878",       // Normal-Beige für Führung
  "Kraftquelle": "#A8A878",      // Normal-Beige für Stärkung
  "Kühnes Schwert": "#B8B8D0",   // Stahl-Grau
  "Kuriose Arznei": "#A040A0",   // Gift-Lila für Medizin
  "Lockenkopf": "#A8A878",       // Normal-Beige
  "Magenkrempler": "#A040A0",    // Gift-Lila für Mageninhalt
  "Majestät": "#A8A878",         // Normal-Beige für königliches Auftreten
  "Megawumme": "#A8A878",        // Normal-Beige für Wucht
  
  // Pflanzenbezogen
  "Myzelenkraft": "#78C850",     // Pflanze-Grün für Pilzpflanze
  "Paläosynthese": "#78C850",    // Pflanze-Grün
  "Heranwachsen": "#78C850",     // Pflanze-Grün für Wachstum
  "Symbiose": "#78C850",         // Pflanze-Grün für symbiotisches Verhalten
  
  // Spezielle Elemente
  "Orichalkum-Puls": "#F08030",  // Feuer-Orange für Hitze
  "Pastellhülle": "#EE99AC",     // Fee-Rosa
  "Profiteur": "#A8A878",        // Normal-Beige
  "Quälerei": "#705848",         // Unlicht-Dunkelbraun für Sadismus
  
  // Transformationen und Wechsel
  "Scharwandel": "#A8A878",      // Normal-Beige für Wandel
  "Superwechsel": "#A8A878",     // Normal-Beige für Formwandel
  "Taktikwechsel": "#A8A878",    // Normal-Beige für Taktik
  "Tera-Wandel": "#A8A878",      // Normal-Beige für Wandel
  "Teraforming Null": "#A8A878", // Normal-Beige
  
  // Elektrisch/Feuer
  "Teravolt": "#F8D030",         // Elektro-Gelb
  "Thermowandel": "#F08030",     // Feuer-Orange
  "Transistor": "#F8D030",       // Elektro-Gelb
  "Turbobrand": "#F08030",       // Feuer-Orange
  "Surf-Schweif": "#F8D030",     // Elektro-Gelb für elektrischen Surf
  
  // Stählerne Fähigkeiten
  "Stählerner Wille": "#B8B8D0", // Stahl-Grau
  "Stahlprofi": "#B8B8D0",       // Stahl-Grau
  "Stahlrückgrat": "#B8B8D0",    // Stahl-Grau
  
  // Geschwindigkeitsbezogen
  "Schnellschuss": "#A8A878",    // Normal-Beige für Schnelligkeit
  
  // Süße/Heilung
  "Süßer Nektar": "#EE99AC",     // Fee-Rosa für Süße
  "Zuckerhülle": "#EE99AC",      // Fee-Rosa für süßen Duft
  "Heilwandel": "#EE99AC",       // Fee-Rosa für Heilung
  
  // Unlicht/Unheil
  "Unheilsgefäß": "#705848",     // Unlicht-Dunkelbraun
  "Unheilsjuwelen": "#705848",   // Unlicht-Dunkelbraun
  "Unheilsschwert": "#705848",   // Unlicht-Dunkelbraun
  "Unheilstafeln": "#705848",    // Unlicht-Dunkelbraun
  
  // Sonstige spezielle Fähigkeiten
  "Triumphstern": "#A8A878",     // Normal-Beige mit Siegesgefühl
  "Wiederkäuer": "#A8A878",      // Normal-Beige
  "Windkraft": "#A890F0",        // Flug-Blau mit Wind
  "Wollflaum": "#A8A878",        // Normal-Beige für Wolle
  "Würggeschoss": "#B8A038",     // Gestein-Braun für Geschoss
};

/**
 * Gibt die Farbe für eine Fähigkeit zurück
 * @param {string} abilityName - Der Name der Fähigkeit
 * @returns {string|null} - Die Farbe oder null, wenn keine definiert ist
 */
function getAbilityColor(abilityName) {
  return ABILITY_COLORS[abilityName] || null;
}

/**
 * Gibt ein Array mit dem Namen des Pokemon und zwei "Leer"-Einträgen zurück
 * @param {number} pokemonID - Die ID des Pokemon (1-1025)
 * @returns {string[]} Array mit dem Pokemon-Namen und zwei "Leer"-Einträgen
 */
export function getAbilities(pokemonID) {
  // Switch-Case für jede Pokemon-ID
  switch (pokemonID) {
    case 1:
      return["Notdünger", "Chlorophyll", "Pflanzengabe"];
    case 2:
      return["Notdünger", "Chlorophyll", "Pflanzengabe"];
    case 3:
      return["Notdünger", "Chlorophyll", "Pflanzengabe"];
    case 4:
      return["Großbrand", "Solarkraft", "Feuerfänger"];
    case 5:
      return["Großbrand", "Solarkraft", "Feuerfänger"];
    case 6:
      return["Großbrand", "Solarkraft", "Feuerfänger"];
    case 7:
      return["Sturzbach", "Regengenuss", "Wassertempo"];
    case 8:
      return["Sturzbach", "Regengenuss", "Wassertempo"];
    case 9:
      return["Sturzbach", "Regengenuss", "Wassertempo"];
    case 10:
      return["Facettenauge", "Angsthase", "Hexaplaga"];
    case 11:
      return["Expidermis", "Zähigkeit", "Hexaplaga"];
    case 12:
      return["Facettenauge", "Aufwertung", "Hexaplaga"];
    case 13:
      return["Facettenauge", "Angsthase", "Hexaplaga"];
    case 14:
      return["Expidermis", "Zähigkeit", "Hexaplaga"];
    case 15:
      return["Hexaplaga", "Superschütze", "Facettenauge"];
    case 16:
      return["Adlerauge", "Brustbieter", "Taumelschritt"];
    case 17:
      return["Adlerauge", "Brustbieter", "Taumelschritt"];
    case 18:
      return["Adlerauge", "Brustbieter", "Taumelschritt"];
    case 19:
      return["Angsthase", "Adrenalin", "Völlerei"];
    case 20:
      return["Angsthase", "Adrenalin", "Völlerei"];
    case 21:
      return["Adlerauge", "Superschütze", "Taumelschritt"];
    case 22:
      return["Adlerauge", "Superschütze", "Taumelschritt"];
    case 23:
      return["Bedroher", "Expidermis", "Anspannung"];
    case 24:
      return["Bedroher", "Expidermis", "Anspannung"];
    case 25:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 26:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 27:
      return["Sandschleier", "Sandgewalt", "Panzerhaut"];
    case 28:
      return["Sandschleier", "Sandgewalt", "Panzerhaut"];
    case 29:
      return["Giftdorn", "Rivalität", "Angsthase"];
    case 30:
      return["Giftdorn", "Rivalität", "Übereifer"];
    case 31:
      return["Majestät", "Rivalität", "Rohe Gewalt"];
    case 32:
      return["Giftdorn", "Rivalität", "Angsthase"];
    case 33:
      return["Giftdorn", "Rivalität", "Übereifer"];
    case 34:
      return["Majestät", "Rivalität", "Rohe Gewalt"];
    case 35:
      return["Charmebolzen", "Magieschild", "Tänzer"];
    case 36:
      return["Charmebolzen", "Magieschild", "Tänzer"];
    case 37:
      return["Feuerfänger", "Dürre", "Fellkleid"];
    case 38:
      return["Feuerfänger", "Dürre", "Fellkleid"];
    case 39:
      return["Charmebolzen", "Rivalität", "Freundeshut"];
    case 40:
      return["Charmebolzen", "Schnüffler", "Freundeshut"];
    case 41:
      return["Konzentrator", "Schwebedurch", "Insomnia"];
    case 42:
      return["Konzentrator", "Schwebedurch", "Insomnia"];
    case 43:
      return["Chlorophyll", "Angsthase", "Pflanzengabe"];
    case 44:
      return["Chlorophyll", "Sporenwirt", "Duftnote"];
    case 45:
      return["Chlorophyll", "Sporenwirt", "Duftnote"];
    case 46:
      return["Sporenwirt", "Trockenheit", "Puderabwehr"];
    case 47:
      return["Sporenwirt", "Trockenheit", "Puderabwehr"];
    case 48:
      return["Facettenauge", "Aufwertung", "Angsthase"];
    case 49:
      return["Facettenauge", "Puderabwehr", "Wunderhaut"];
    case 50:
      return["Sandschleier", "Sandscharrer", "Ausweglos"];
    case 51:
        //Dugtrio
        return["Sandschleier", "Sandscharrer", "Ausweglos"];
    case 52:
        //Mauzi
        return["Mitnahme", "Techniker", "Krallenwucht"];
    case 53:
        //Snobilikat
        return["Mitnahme", "Techniker", "Krallenwucht"];
    case 54:
        //Enton
        return["Feuchtigkeit", "Dösigkeit", "Wolke Sieben"];
    case 55:
        //Entoron
        return["Feuchtigkeit", "Wassertempo", "Wolke Sieben"];
    case 56:
        //Menki
        return["Munterkeit", "Kurzschluss", "Siegeswille"];
    case 57:
        //Rasaff
        return["Wutausbruch", "Kurzschluss", "Siegeswille"];
    case 58:
        //Fukano
        return["Bedroher", "Feuerfänger", "Wachhund"];
    case 59:
        //Arkani
        return["Bedroher", "Feuerfänger", "Wachhund"];
    case 60:
        //Quapsel
        return["Feuchtigkeit", "H2O-Absorber", "Wassertempo"];
    case 61:
        //Quaputzi
        return["Feuchtigkeit", "H2O-Absorber", "Wassertempo"];
    case 62:
        //Quappo
        return["Feuchtigkeit", "H2O-Absorber", "Wassertempo"];
    case 63:
        //Abra
        return["Konzentrator", "Magieschild", "Synchro"];
    case 64:
        //Kadabra
        return["Konzentrator", "Magieschild", "Synchro"];
    case 65:
        //Simsala
        return["Geistiges Auge", "Magieschild", "Synchro"];
    case 66:
        //Machollo
        return["Adrenalin", "Schildlos", "Felsenfest"];
    case 67:
        //Maschock
        return["Adrenalin", "Schildlos", "Felsenfest"];
    case 68:
        //Machomei
        return["Adrenalin", "Schildlos", "Kraftkoloss"];
    case 69:
        //Knofensa
        return["Chlorophyll", "Duftnote", "Völlerei"];
    case 70:
        //Ultrigaria
        return["Chlorophyll", "Duftnote", "Völlerei"];
    case 71:
        //Sarzenia
        return["Chlorophyll", "Duftnote", "Völlerei"];
    case 72:
        //Tentacha
        return["Kloakensoße", "Klebekörper", "Regengenuss"];
    case 73:
        //Tentoxa
        return["Kloakensoße", "Klebekörper", "Regengenuss"];
    case 74:
      //Kleinstein
      return["Felsenfest", "Robustheit", "Schwebe"];
    case 75:
        //Georok
        return["Felsenfest", "Robustheit", "Steinhaupt"];
    case 76:
        //Geowaz
        return["Felsenfest", "Robustheit", "Steinhaupt"];
    case 77:
        //Ponita
        return["Feuerfänger", "Flammkörper", "Angsthase"];
    case 78:
        //Gallopa
        return["Feuerfänger", "Flammkörper", "Reitgespann"];
    case 79:
        //Flegmon
        return["Dösigkeit", "Völlerei", "Belebekraft"];
    case 80:
        //Lahmus
        return["Dösigkeit", "Völlerei", "Belebekraft"];
    case 81:
        //Magnetilo
        return["Magnetfalle", "Robustheit", "Schwebe"];
    case 82:
        //Magneton
        return["Magnetfalle", "Robustheit", "Schwebe"];
    case 83:
        //Porenta
        return["Adlerauge", "Konzentrator", "Siegeswille"];
    case 84:
        //Dodu
        return["Adlerauge", "Frühwecker", "Angsthase"];
    case 85:
        //Dodri
        return["Adlerauge", "Frühwecker", "Kurzschluss"];
    case 86:
        //Jurob
        return["Speckschicht", "Hydration", "Eishaut"];
    case 87:
        //Jugong
        return["Speckschicht", "Hydration", "Eishaut"];
    case 88:
        //Sleima
        return["Klebekörper", "Giftgriff", "Duftnote"];
    case 89:
        //Sleimok
        return["Klebekörper", "Giftgriff", "Duftnote"];
    case 90:
        //Muschas
        return["Wertelink", "Panzerhaut", "Robustheit"];
    case 91:
        //Austos
        return["Wertelink", "Panzerhaut", "Robustheit"];
    case 92:
        //Nebulak
        return["Schwebe", "Reaktionsgas", "Rastlose Seele"];
    case 93:
        //Alpollo
        return["Schwebe", "Bedroher", "Phantomschutz"];
    case 94:
        //Gengar
        return["Schwebe", "Bedroher", "Phantomschutz"];
    case 95:
        //Onix
        return["Felskern", "Robustheit", "Steinhaupt"];
    case 96:
        //Traumato
        return["Insomnia", "Schnüffler", "Vorwarnung"];
    case 97:
        //Hypno
        return["Insomnia", "Schnüffler", "Vorwarnung"];
    case 98:
        //Krabby
        return["Scherenmacht", "Panzerhaut", "Rohe Gewalt"];
    case 99:
        //Kingler
        return["Scherenmacht", "Panzerhaut", "Rohe Gewalt"];
    case 100:
        //Voltobal
        return["Lärmschutz", "Statik", "Finalschlag"];
    case 101:
        //Lektrobal
        return["Lärmschutz", "Statik", "Finalschlag"];
    case 102:
        //Owei
        return["Chlorophyll", "Reiche Ernte", "Dösigkeit"];
    case 103:
        //Kokowei
        return["Chlorophyll", "Reiche Ernte", "Dösigkeit"];
    case 104:
        //Tragosso
        return["Steinhaupt", "Blitzfänger", "Kampfpanzer"];
    case 105:
        //Knogga
        return["Steinhaupt", "Blitzfänger", "Kampfpanzer"];
    case 106:
        //Kicklee
        return["Flexibilität", "Achtlos", "Schildlos"];
    case 107:
        //Nockchan
        return["Adlerauge", "Eisenfaust", "Konzentrator"];
    case 108:
        //Schlurp
        return["Speckschicht", "Dösigkeit", "Völlerei"];
    case 109:
        //Smogon
        return["Reaktionsgas", "Schwebe", "Duftnote"];
    case 110:
        //Smogmog
        return["Reaktionsgas", "Schwebe", "Duftnote"];
    case 111:
        //Rihorn
        return["Blitzfänger", "Steinhaupt", "Achtlos"];
    case 112:
        //Rizeros
        return["Blitzfänger", "Steinhaupt", "Achtlos"];
    case 113:
        //Chaneira
        return["Innere Kraft", "Edelmut", "Heilherz"];
    case 114:
        //Tangela
        return["Chlorophyll", "Floraschild", "Belebekraft"];
    case 115:
        //Kangama
        return["Frühwecker", "Rauflust", "Konzentrator"];
    case 116:
        //Seeper
        return["Wassertempo", "Superschütze", "Analyse"];
    case 117:
        //Seemon
        return["Wassertempo", "Superschütze", "Analyse"];
    case 118:
        //Goldini
        return["Wassertempo", "Blitzfänger", "Aquahülle"];
    case 119:
        //Golking
        return["Wassertempo", "Blitzfänger", "Aquahülle"];
    case 120:
        //Sterndu
        return["Geistiges Auge", "Belebekraft", "Erleuchtung"];
    case 121:
        //Starmie
        return["Geistiges Auge", "Belebekraft", "Erleuchtung"];
    case 122:
        //Pantimos
        return["Lärmschutz", "Filter", "Hemmungslos"];
    case 123:
        //Sichlor
        return["Hexaplaga", "Techniker", "Scharfkantig"];
    case 124:
        //Rossana
        return["Tänzer", "Vorahnung", "Eishaut"];
    case 125:
        //Elektek
        return["Statik", "Munterkeit", "Eisenfaust"];
    case 126:
        //Magmar
        return["Flammkörper", "Dösigkeit", "Magmapanzer"];
    case 127:
        //Pinsir
        return["Hexaplaga", "Hochmut", "Titankiefer"];
    case 128:
        //Tauros
        return["Bedroher", "Kurzschluss", "Rohe Gewalt"];
    case 129:
        //Karpador
        return["Wassertempo", "Hasenfuß", "Angsthase"];
    case 130:
        //Garados
        return["Bedroher", "Wassertempo", "Hochmut"];
    case 131:
        //Lapras
        return["Speckschicht", "Panzerhaut", "Hydration"];
    case 132:
        //Ditto
        return["Flexibilität", "Doppelhgänger", "Chemiekraft"];
    case 133:
        //Evoli
        return["Anpassung", "Angsthase", "Vorahnung"];
    case 134:
        //Aquana
        return["Wassertempo", "H2O-Absorber", "Hydration"];
    case 135:
        //Blitza
        return["Voltabsorber", "Rasanz", "Sandscharrer"];
    case 136:
        //Flamara
        return["Feuerfänger", "Flammkörper", "Magmapanzer"];
    case 137:
        //Porygon
        return["Erfassen", "Download", "Analyse"];
    case 138:
        //Amonitas
        return["Wassertempo", "Panzerhaut", "Bruchrüstung"];
    case 139:
        //Amoroso
        return["Wassertempo", "Panzerhaut", "Bruchrüstung"];
    case 140:
        //Kabuto
        return["Wassertempo", "Kampfpanzer", "Bruchrüstung"];
    case 141:
        //Kabutops
        return["Wassertempo", "Kampfpanzer", "Scharfkantig"];
    case 142:
        //Aerodactyl
        return["Steinhaupt", "Bedroher", "Erzwinger"];
    case 143:
        //Relaxo
        return["Immunität", "Speckschicht", "Völlerei"];
    case 144:
        //Arktos
        return["Erzwinger", "Orkanschwingen", "Schneemantel"];
    case 145:
        //Zapdos
        return["Erzwinger", "Orkanschwingen", "Statik"];
    case 146:
        //Lavados
        return["Erzwinger", "Orkanschwingen", "Flammkörper"];
    case 147:
        //Dratini
        return["Expidermis", "Notschutz", "Multischuppe"];
    case 148:
        //Dragonir
        return["Expidermis", "Notschutz", "Multischuppe"];
    case 149:
        //Dragoran
        return["Erzwinger", "Konzentrator", "Multischuppe"];
    case 150:
        //Mewtu
        return["Erzwinger", "Anspannung", "Schwebe"];
    case 151:
        //Mew
        return["Magieschild", "Schwebe", "Synchro"];
    case 152:
        //Endivie
        return["Notdünger", "Floraschild", "Vegetarier"];
    case 153:
        //Lorblatt
        return["Notdünger", "Floraschild", "Vegetarier"];
    case 154:
        //Meganie
        return["Notdünger", "Floraschild", "Vegetarier"];
    case 155:
        //Feurigel
        return["Großbrand", "Dösigkeit", "Feuerfänger"];
    case 156:
        //Igelavar
        return["Großbrand", "Munterkeit", "Feuerfänger"];
    case 157:
        //Tornupto
        return["Großbrand", "Rohe Gewalt", "Feuerfänger"];
    case 158:
        //Karnimani
        return["Sturzbach", "Titankiefer", "Rauhaut"];
    case 159:
        //Tyracroc
        return["Sturzbach", "Titankiefer", "Rauhaut"];
    case 160:
        //Impergator
        return["Sturzbach", "Titankiefer", "Rauhaut"];
    case 161:
        //Wiesor
        return["Adlerauge", "Angsthase", "Schnüffler"];
    case 162:
        //Wiesenior
        return["Adlerauge", "Angsthase", "Schnüffler"];
    case 163:
        //Hoothoot
        return["Adlerauge", "Insomnia", "Telepathie"];
    case 164:
        //Noctuh
        return["Adlerauge", "Insomnia", "Telepathie"];
    case 165:
        //Ledyba
        return["Hexaplaga", "Frühwecker", "Eisenfaust"];
    case 166:
        //Ledian
        return["Hexaplaga", "Frühwecker", "Eisenfaust"];
    case 167:
        //Webarak
        return["Hexaplaga", "Giftgriff", "Facettenauge"];
    case 168:
        //Ariados
        return["Hexaplaga", "Giftgriff", "Facettenauge"];
    case 169:
        //Iksbat
        return["Konzentrator", "Insomnia", "Schwebedurch"];
    case 170:
        //Lampi
        return["Voltabsorber", "Erleuchtung", "H2O-Absorber"];
    case 171:
        //Lanturn
        return["Voltabsorber", "Erleuchtung", "H2O-Absorber"];
    case 172:
        //Pichu
        return["Statik", "Blitzfänger", "Backentaschen"];
    case 173:
        //Pii
        return["Charmebolzen", "Magieschild", "Tänzer"];
    case 174:
        //Fluffeluff
      return["Charmebolzen", "Rivalität", "Freundeshut"];
    case 175:
        //Togepi
        return["Charmebolzen", "Glückspilz", "Edelmut"];
    case 176:
        //Togetic
        return["Charmebolzen", "Glückspilz", "Edelmut"];
    case 177:
        //Natu
        return["Synchro", "Frühwecker", "Magiespiegel"];
    case 178:
        //Xatu
        return["Synchro", "Frühwecker", "Magiespiegel"];
    case 179:
        //Voltilamm
        return["Statik", "Fellkleid", "Flauschigkeit"];
    case 180:
        //Waaty
        return["Statik", "Fellkleid", "Flauschigkeit"];
    case 181:
        //Ampharos
        return["Statik", "Plus", "Erleuchtung"];
    case 182:
        //Blubella
        return["Chlorophyll", "Tänzer", "Planzengabe"];
    case 183:
        //Marill
        return["Speckschicht", "Kraftkoloss", "Vegetarier"];
    case 184:
        //Azumarill
        return["Speckschicht", "Kraftkoloss", "Vegetarier"];
    case 185:
        //Mogelbaum
        return["Robustheit", "Steinhaupt", "Angsthase"];
    case 186:
        //Quaxo
        return["Feuchtigkeit", "Niesel", "Hydration"];
    case 187:
        //Hoppspross
        return["Chlorophyll", "Floraschild", "Schwebedurch"];
    case 188:
        //Hubelupf
        return["Chlorophyll", "Floraschild", "Schwebedurch"];
    case 189:
        //Papungha
        return["Chlorophyll", "Floraschild", "Schwebedurch"];
    case 190:
        //Griffel
        return["Langfinger", "Wertelink", "Angsthase"];
    case 191:
        //Sonnkern
        return["Chlorophyll", "Solarkraft", "Frühwecker"];
    case 192:
        //Sonnflora
        return["Chlorophyll", "Solarkraft", "Frühwecker"];
    case 193:
        //Yanma
        return["Facettenauge", "Temposchub", "Hexaplaga"];
    case 194:
        //Felino
        return["Feuchtigkeit", "H2O-Absorber", "Unkenntnis"];
    case 195:
        //Morlord
        return["Feuchtigkeit", "H2O-Absorber", "Unkenntnis"];
    case 196:
        //Psiana
        return["Synchro", "Magiespiegel", "Geistiges Auge"];
    case 197:
        //Nachtara
        return["Synchro", "Giftwahn", "Giftheilung"];
    case 198:
        //Kramurx
        return["Insomnia", "Vorahnung", "Strolch"];
    case 199:
        //Laschoking
        return["Gleichmut", "Vorahnung", "Belebekraft"];
    case 200:
        //Traunfugil
        return["Schwebe", "Rastlose Seele", "Bedroher"];
    case 201:
        //Icognito
        return["Schwebe", "Synchro", "Geistiges Auge"];
    case 202:
        //Woingenau
        return["Wegsperre", "Zähigkeit", "Telepathie"];
    case 203:
        //Girafarig
        return["Konzentrator", "Frühwecker", "Vegetarier"];
    case 204:
        //Tannza
        return["Robustheit", "Partikelschutz", "Finalschlag"];
    case 205:
        //Forstellka
        return["Robustheit", "Partikelschutz", "Giftbelag"];
    case 206:
        //Dummisel
        return["Immunität", "Hasenfuß", "Angsthase"];
    case 207:
        //Skorgla
        return["Scherenmacht", "Sandschleier", "Immunität"];
    case 208:
        //Stahlos
        return["Robustheit", "Sandsturm", "Rohe Gewalt"];
    case 209:
        //Snubbull
        return["Bedroher", "Rivalität", "Angsthase"];
    case 210:
        //Granbull
        return["Bedroher", "Rivalität", "Rasanz"];
    case 211:
        //Baldorfish
        return["Giftdorn", "Bedroher", "Wassertempo"];
    case 212:
        //Scherox
        return["Hexaplaga", "Techniker", "Leichtmetall"];
    case 213:
        //Pottrott
        return["Robustheit", "Völlerei", "Reiche Ernte"];
    case 214:
        //Skaraborn
        return["Hexaplaga", "Adrenalin", "Hochmut"];
    case 215:
        //Sniebel
        return["Eishaut", "Adlerauge", "Langfinger"];
    case 216:
        //Teddiursa
        return["Mitnahme", "Rasanz", "Honigmaul"];
    case 217:
        //Ursaring
        return["Adrenalin", "Rasanz", "Bedroher"];
    case 218:
        //Schneckmag
        return["Magmapanzer", "Flammkörper", "Feuerfänger"];
    case 219:
        //Magcargo
        return["Magmapanzer", "Flammkörper", "Bruchrüstung"];
    case 220:
        //Quiekel
        return["Speckschicht", "Schneemantel", "Dösigkeit"];
    case 221:
        //Keifel
        return["Speckschicht", "Schneemantel", "Schnüffler"];
    case 222:
        //Corasonn
        return["Innere Kraft", "Übereifer", "Belebekraft"];
    case 223:
        //Remoraid
        return["Wassertempo", "Superschütze", "Gefühlswippe"];
    case 224:
        //Octillery
        return["Saugnapf", "Superschütze", "Gefühlswippe"];
    case 225:
        //Botogel
        return["Munterkeit", "Übereifer", "Gastlichkeit"];
    case 226:
        //Mantax
        return["Speckschicht", "H2O-Absorber", "Wassertempo"];
    case 227:
        //Panzaeron
        return["Robustheit", "Adlerauge", "Bruchrüstung"];
    case 228:
        //Hunduster
        return["Frühwecker", "Feuerfänger", "Anspannung"];
    case 229:
        //Hundemon
        return["Feuerfänger", "Bedroher", "Anspannung"];
    case 230:
        //Seedraking
        return["Wassertempo", "Superschütze", "Analyse"];
    case 231:
        //Phanpy
        return["Speckschicht", "Sandschleier", "Sandgewalt"];
    case 232:
        //Donphan
        return["Speckschicht", "Robustheit", "Sandgewalt"];
    case 233:
        //Porygon2
        return["Erfassen", "Download", "Analyse"];
    case 234:
        //Damhirplex
        return["Bedroher", "Vegetarier", "Telepathie"];
    case 235:
        //Farbeagle
        return["Gleichmut", "Techniker", "Gefühlswippe"];
    case 236:
        //Rabauz
        return["Adrenalin", "Techniker", "Munterkeit"];
    case 237:
        //Kapoera
        return["Adrenalin", "Techniker", "Felsenfest"];
    case 238:
        //Kussilla
        return["Tänzer", "Vorahnung", "Eishaut"];
    case 239:
        //Elekid
        return["Statik", "Munterkeit", "Voltabsorber"];
    case 240:
        //Magby
        return["Flammkörper", "Dösigkeit", "Magmapanzer"];
    case 241:
        //Miltank
        return["Speckschicht", "Vegetarier", "Rauflust"];
    case 242:
        //Heiteira
        return["Innere Kraft", "Edelmut", "Heilherz"];
    case 243:
        //Raikou
        return["Erzwinger", "Voltabsorber", "Statik"];
    case 244:
        //Entei
        return["Erzwinger", "Feuerfänger", "Flammkörper"];
    case 245:
        //Suicune
        return["Erzwinger", "H2O-Absorber", "Konzentrator"];
    case 246:
        //Larvitar
        return["Sandsturm", "Sandschleier", "Adrenalin"];
    case 247:
        //Pupitar
        return["Expidermis", "Felskern", "Bruchrüstung"];
    case 248:
        //Despotar
        return["Sandsturm", "Bedroher", "Anspannung"];
    case 249:
        //Lugia
        return["Erzwinger", "Multischuppe", "Orkanschwingen"];
    case 250:
        //Ho-Oh
        return["Erzwinger", "Orkanschwingen", "Belebekraft"];
    case 251:
        //Celebi
        return["Belebekraft", "Heilherz", "Telepathie"];
    case 252:
        //Geckarbor
        return["Notdünger", "Saugnapf", "Entlastung"];
    case 253:
        //Reptain
        return["Notdünger", "Saugnapf", "Entlastung"];
    case 254:
        //Gewaldro
        return["Notdünger", "Saugnapf", "Entlastung"];
    case 255:
        //Flemmli
        return["Großbrand", "Feuerfänger", "Temposchub"];
    case 256:
        //Jungglut
        return["Großbrand", "Feuerfänger", "Temposchub"];
    case 257:
        //Lohgock
        return["Eisenfaust", "Feuerfänger", "Temposchub"];
    case 258:
        //Hydropi
        return["Sturzbach", "Wassertempo", "Feuchtigkeit"];
    case 259:
        //Moorabbel
        return["Sturzbach", "Wassertempo", "Feuchtigkeit"];
    case 260:
        //Sumpex
        return["Sturzbach", "Wassertempo", "Feuchtigkeit"];
    case 261:
        //Fiffyen
        return["Rasanz", "Angsthase", "Mitnahme"];
    case 262:
        //Magnayen
        return["Bedroher", "Rasanz", "Mitnahme"];
    case 263:
        //Zigzachs
        return["Mitnahme", "Rasanz", "Vegetarier"];
    case 264:
        //Geradaks
        return["Mitnahme", "Rasanz", "Völlerei"];
    case 265:
        //Waumpel
        return["Facettenauge", "Puderabwehr", "Hexaplaga"];
    case 266:
        //Schaloko
        return["Expidermis", "Hexaplaga", "Zähigkeit"];
    case 267:
        //Papinella
        return["Facettenauge", "Hexaplaga", "Rivalität"];
    case 268:
        //Panekon
        return["Expidermis", "Hexaplaga", "Zähigkeit"];
    case 269:
        //Pudox
        return["Facettenauge", "Hexaplaga", "Puderabwehr"];
    case 270:
        //Loturzel
        return["Wassertempo", "Regengenuss", "Chlorophyll"];
    case 271:
        //Lombrero
        return["Wassertempo", "Regengenuss", "Chlorophyll"];
    case 272:
        //Kappalores
        return["Tänzer", "Regengenuss", "Chlorophyll"];
    case 273:
        //Samurzel
        return["Chlorophyll", "Panzerhaut", "Frühwecker"];
    case 274:
        //Blanas
        return["Chlorophyll", "Langfinger", "Frühwecker"];
    case 275:
        //Tengulist
        return["Chlorophyll", "Langfinger", "Windreiter"];
    case 276:
        //Schwalbini
        return["Adrenalin", "Rauflust", "Temposchub"];
    case 277:
        //Schwalboss
        return["Adrenalin", "Rauflust", "Temposchub"];
    case 278:
        //Wingull
        return["Niesel", "Adlerauge", "Regengenuss"];
    case 279:
        //Pelipper
        return["Niesel", "Adlerauge", "Regengenuss"];
    case 280:
        //Trasla
        return["Synchro", "Vorahnung", "Telepathie"];
    case 281:
        //Kirlia
        return["Synchro", "Vorahnung", "Telepathie"];
    case 282:
        //Guardevoir
        return["Synchro", "Vorahnung", "Telepathie"];
    case 283:
        //Gehweiher
        return["Wassertempo", "Hexaplaga", "Regengenuss"];
    case 284:
        //Maskeregen
        return["Hexaplaga", "Bedroher", "Schwebedurch"];
    case 285:
        //Knilz
        return["Sporenwirt", "Giftheilung", "Rasanz"];
    case 286:
        //Kapilz
        return["Sporenwirt", "Giftheilung", "Temposchub"];
    case 287:
        //Bummelz
        return["Schnarchnase", "Kraftkoloss", "Krallenwucht"];
    case 288:
        //Muntier
        return["Munterkeit", "Rasanz", "Krallenwucht"];
    case 289:
        //Letarking
        return["Schnarchnase", "Kraftkoloss", "Rohe Gewalt"];
    case 290:
        //Nincada
        return["Facettenauge", "Hexaplaga", "Angsthase"];
    case 291:
        //Ninjask
        return["Temposchub", "Hexaplaga", "Schwebedurch"];
    case 292:
        //Ninjatom
        return["Wunderwache", "Schwebe", "Erzwinger"];
    case 293:
        //Flurmel
        return["Lärmschutz", "Hasenfuß", "Punk Rock"];
    case 294:
        //Krakeelo
        return["Lärmschutz", "Rauflust", "Punk Rock"];
    case 295:
        //Krawumms
        return["Lärmschutz", "Rohe Gewalt", "Punk Rock"];
    case 296:
        //Makuhita
        return["Speckschicht", "Adrenalin", "Rohe Gewalt"];
    case 297:
        //Hariyama
        return["Speckschicht", "Adrenalin", "Rohe Gewalt"];
    case 298:
        //Azurill
        return["Speckschicht", "Kraftkoloss", "Vegetarier"];
    case 299:
        //Nasgnet
        return["Robustheit", "Magnetfalle", "Sandgewalt"];
    case 300:
        //Eneco
        return["Charmebolzen", "Regulierung", "Mitnahme"];
    case 301:
        //Enekoro
        return["Charmebolzen", "Regulierung", "Mitnahme"];
    case 302:
        //Zobiris
        return["Strolch", "Zeitspiel", "Adlerauge"];
    case 303:
        //Flunkifer
        return["Scherenmacht", "Bedroher", "Kraftkoloss"];
    case 304:
        //Stollunior
        return["Robustheit", "Steinhaupt", "Achtlos"];
    case 305:
        //Stollrak
        return["Robustheit", "Steinhaupt", "Achtlos"];
    case 306:
        //Stolloss
        return["Robustheit", "Steinhaupt", "Rohe Gewalt"];
    case 307:
        //Meditie
        return["Schwebe", "Telepathie", "Mentalkraft"];
    case 308:
        //Meditalis
        return["Konzentrator", "Telepathie", "Mentalkraft"];
    case 309:
        //Frizelbliz
        return["Statik", "Blitzfänger", "Minus"];
    case 310:
        //Voltenso
        return["Statik", "Blitzfänger", "Minus"];
    case 311:
        //Plusle
        return["Plus", "Statik", "Backentaschen"];
    case 312:
        //Minun
        return["Minus", "Statik", "Backentaschen"];
    case 313:
        //Volbeat
        return["Erleuchtung", "Hexaplaga", "Strolch"];
    case 314:
        //Illumise
        return["Erleuchtung", "Dösigkeit", "Strolch"];
    case 315:
        //Roselia
        return["Innere Kraft", "Giftdorn", "Floraschild"];
    case 316:
        //Schluppuck
        return["Kloakensoße", "Klebekörper", "Völlerei"];
    case 317:
        //Schlukwech
        return["Kloakensoße", "Klebekörper", "Völlerei"];
    case 318:
        //Kanivanha
        return["Rauhaut", "Wassertempo", "Temposchub"];
    case 319:
        //Tohaido
        return["Rauhaut", "Titankiefer", "Temposchub"];
    case 320:
        //Wailmer
        return["Speckschicht", "Aquahülle", "Dösigkeit"];
    case 321:
        //Wailord
        return["Speckschicht", "Aquahülle", "Dösigkeit"];
    case 322:
        //Camaub
        return["Dösigkeit", "Wankelmut", "Magmapanzer"];
    case 323:
        //Camerupt
        return["Felskern", "Kurzschluss", "Magmapanzer"];
    case 324:
        //Qurtel
        return["Pulverrauch", "Dürre", "Panzerhaut"];
    case 325:
        //Spoink
        return["Speckschicht", "Vorahnung", "Gleichmut"];
    case 326:
        //Groink
        return["Speckschicht", "Vorahnung", "Völlerei"];
    case 327:
        //Pandir
        return["Gleichmut", "Taumelschritt", "Tänzer"];
    case 328:
        //Knacklion
        return["Scherenmacht", "Ausweglos", "Sandschleier"];
    case 329:
        //Vibrava
        return["Schwebe", "Sandschleier", "Facettenauge"];
    case 330:
        //Libelldra
        return["Schwebe", "Sandschleier", "Facettenauge"];
    case 331:
        //Tuska
        return["H2O-Absorber", "Sandschleier", "Giftdorn"];
    case 332:
        //Noktuska
        return["H2O-Absorber", "Sandschleier", "Strolch"];
    case 333:
        //Wablu
        return["Innere Kraft", "Flauschigkeit", "Wolke Sieben"];
    case 334:
        //Altaria
        return["Innere Kraft", "Flauschigkeit", "Wolke Sieben"];
    case 335:
        //Sengo
        return["Immunität", "Adrenalin", "Giftwahn"];
    case 336:
        //Vipitis
        return["Expidermis", "Bedroher", "Titankiefer"];
    case 337:
        //Lunastein
        return["Schwebe", "Telepathie", "Geistiges Auge"];
    case 338:
        //Sonnfel
        return["Schwebe", "Telepathie", "Dürre"];
    case 339:
        //Schmerbe
        return["Dösigkeit", "Vorahnung", "Hydration"];
    case 340:
        //Welsar
        return["Dösigkeit", "Vorahnung", "Hydration"];
    case 341:
        //Krebscorps
        return["Panzerhaut", "Scherenmacht", "Anpassung"];
    case 342:
        //Krebutack
        return["Panzerhaut", "Scherenmacht", "Anpassung"];
    case 343:
        //Puppance
        return["Schwebe", "Vorahnung", "Tastfluch"];
    case 344:
        //Lepumentas
        return["Schwebe", "Vorahnung", "Tastfluch"];
    case 345:
        //Liliep
        return["Saugnapf", "Sturmsog", "Giftheilung"];
    case 346:
        //Wielie
        return["Saugnapf", "Sturmsog", "Giftheilung"];
    case 347:
        //Anorith
        return["Kampfpanzer", "Scherenmacht", "Wassertempo"];
    case 348:
        //Armaldo
        return["Kampfpanzer", "Bedroher", "Krallenwucht"];
    case 349:
        //Barschwa
        return["Dösigkeit", "Wassertempo", "Hydration"];
    case 350:
        //Milotic
        return["Multischuppe", "Notschutz", "Unbeugsamkeit"];
    case 351:
        //Formeo
        return["Prognose", "Schwebe", "Klimaschutz"];
    case 352:
        //Kecleon
        return["Farbwechsel", "Saugnapf", "Wandlungskunst"];
    case 353:
        //Shuppet
        return["Insomnia", "Schwebe", "Tastfluch"];
    case 354:
        //Banette
        return["Schwebe", "Bedroher", "Tastfluch"];
    case 355:
        //Zwirrlicht
        return["Schwebe", "Tastfluch", "Schnüffler"];
    case 356:
        //Zwirrklop
        return["Erzwinger", "Tastfluch", "Schnüffler"];
    case 357:
        //Tropius
        return["Chlorophyll", "Solarkraft", "Reiche Ernte"];
    case 358:
        //Palimpalim
        return["Synchro", "Telepathie", "Schwebe"];
    case 359:
        //Absol
        return["Vorahnung", "Glückspilz", "Redlichkeit"];
    case 360:
        //Isso
        return["Wegsperre", "Zähigkeit", "Telepathie"];
    case 361:
        //Schneppke
        return["Konzentrator", "Eishaut", "Gefühlswippe"];
    case 362:
        //Firnontor
        return["Konzentrator", "Eishaut", "Frostschicht"];
    case 363:
        //Seemops
        return["Speckschicht", "Hydration", "Eishaut"];
    case 364:
        //Seejong
        return["Speckschicht", "Hydration", "Eishaut"];
    case 365:
        //Walraisa
        return["Speckschicht", "Titankiefer", "Eishaut"];
    case 366:
        //Perlu
        return["Panzerhaut", "Robustheit", "Hydration"];
    case 367:
        //Aalabyss
        return["Wassertempo", "Aquahülle", "Hydration"];
    case 368:
        //Saganabyss
        return["Wassertempo", "Multischuppe", "Hydration"];
    case 369:
        //Relicanth
        return["Robustheit", "Steinhaupt", "Wassertempo"];
    case 370:
        //Liebiskus
        return["Wassertempo", "Hydration", "Charmebolzen"];
    case 371:
        //Kindwurm
        return["Steinhaupt", "Rohe Gewalt", "Wutausbruch"];
    case 372:
        //Draschel
        return["Steinhaupt", "Expidermis", "Partikelschutz"];
    case 373:
        //Brutalanda
        return["Bedroher", "Hochmut", "Orkanschwingen"];
    case 374:
        //Tanhel
        return["Neutraltorso", "Leichtmetall", "Schwebe"];
    case 375:
        //Metang
        return["Neutraltorso", "Leichtmetall", "Schwebe"];
    case 376:
        //Metagross
        return["Neutraltorso", "Leichtmetall", "Telepathie"];
    case 377:
        //Regirock
        return["Neutraltorso", "Steinhaupt", "Robustheit"];
    case 378:
        //Regice
        return["Neutraltorso", "Eishaut", "Frostschicht"];
    case 379:
        //Registeel
        return["Neutraltorso", "Schwermetall", "Leichtmetall"];
    case 380:
        //Latias
        return["Schwebe", "Magieschild", "Edelmut"];
    case 381:
        //Latios
        return["Schwebe", "Magieschild", "Edelmut"];
    case 382:
        //Kyogre
        return["Niesel", "Erzwinger", "Aquahülle"];
    case 383:
        //Groudon
        return["Dürre", "Erzwinger", "Solarkraft"];
    case 384:
        //Rayquaza
        return["Klimaschutz", "Erzwinger", "Zenithaut"];
    case 385:
        //Jirachi
        return["Edelmut", "Geistiges Auge", "Schwebe"];
    case 386:
        //Deoxys
        return["Erzwinger", "Schwebe", "Synchro"];
    case 387:
        //Chelast
        return["Notdünger", "Panzerhaut", "Chlorophyll"];
    case 388:
        //Chelcarain
        return["Notdünger", "Panzerhaut", "Chlorophyll"];
    case 389:
        //Chelterrar
        return["Notdünger", "Panzerhaut", "Chlorophyll"];
    case 390:
        //Panflam
        return["Großbrand", "Eisenfaust", "Munterkeit"];
    case 391:
        //Panpyro
        return["Großbrand", "Eisenfaust", "Munterkeit"];
    case 392:
        //Panferno
        return["Großbrand", "Eisenfaust", "Munterkeit"];
    case 393:
        //Plinfa
        return["Sturzbach", "Siegeswille", "Unbeugsamkeit"];
    case 394:
        //Pliprin
        return["Sturzbach", "Siegeswille", "Unbeugsamkeit"];
    case 395:
        //Impoleon
        return["Sturzbach", "Siegeswille", "Unbeugsamkeit"];
    case 396:
        //Staralili
        return["Adlerauge", "Achtlos", "Taumelschritt"];
    case 397:
        //Staravia
        return["Adlerauge", "Achtlos", "Taumelschritt"];
    case 398:
        //Staraptor
        return["Adlerauge", "Achtlos", "Bedroher"];
    case 399:
        //Bidiza
        return["Wankelmut", "Unkenntnis", "Gefühlswippe"];
    case 400:
        //Bidifas
        return["Wankelmut", "Unkenntnis", "Gefühlswippe"];
    case 401:
        //Zirpurze
        return["Hexaplaga", "Expidermis", "Angsthase"];
    case 402:
        //Zirpeise
        return["Hexaplaga", "Punk Rock", "Techniker"];
    case 403:
        //Sheinux
        return["Rivalität", "Bedroher", "Adrenalin"];
    case 404:
        //Luxio
        return["Rivalität", "Bedroher", "Adrenalin"];
    case 405:
        //Luxtra
        return["Rivalität", "Bedroher", "Adrenalin"];
    case 406:
        //Knospi
        return["Innere Kraft", "Giftdorn", "Floraschild"];
    case 407:
        //Roserade
        return["Innere Kraft", "Giftdorn", "Techniker"];
    case 408:
        //Koknodon
        return["Überbrückung", "Steinhaupt", "Rohe Gewalt"];
    case 409:
        //Rameidon
        return["Überbrückung", "Steinhaupt", "Rohe Gewalt"];
    case 410:
        //Schilterus
        return["Robustheit", "Lärmschutz", "Steinhaupt"];
    case 411:
        //Bollterus
        return["Robustheit", "Lärmschutz", "Steinhaupt"];
    case 412:
        //Burmy
        return["Expidermis", "Partikelschutz", "Hexaplaga"];
    case 413:
        //Burmadame
        return["Vorahnung", "Partikelschutz", "Hexaplaga"];
    case 414:
        //Moterpel
        return["Hexaplaga", "Facettenauge", "Aufwertung"];
    case 415:
        //Wadribie
        return["Honigmaul", "Hexaplaga", "Übereifer"];
    case 416:
        //Honweisel
        return["Erzwinger", "Hexaplaga", "Anspannung"];
    case 417:
        //Pachirisu
        return["Backentaschen", "Mitnahme", "Voltabsorber"];
    case 418:
        //Bamelin
        return["Wassertempo", "Hydration", "Aquahülle"];
    case 419:
        //Bojelin
        return["Wassertempo", "Hydration", "Aquahülle"];
    case 420:
        //Kikugi
        return["Chlorophyll", "Reiche Ernte", "Edelmut"];
    case 421:
        //Kinoso
        return["Chlorophyll", "Pflanzengabe", "Edelmut"];
    case 422:
        //Schalellos
        return["Klebekörper", "Sturmsog", "Belebekraft"];
    case 423:
        //Gastrodon
        return["Klebekörper", "Sturmsog", "Belebekraft"];
    case 424:
        //Ambidiffel
        return["Techniker", "Langfinger", "Wertelink"];
    case 425:
        //Driftlon
        return["Finalschlag", "Entlastung", "Hitzewahn"];
    case 426:
        //Drifzepeli
        return["Finalschlag", "Entlastung", "Hitzewahn"];
    case 427:
        //Haspiror
        return["Angsthase", "Charmebolzen", "Tollpatsch"];
    case 428:
        //Schlapor
        return["Charmebolzen", "Tollpatsch", "Flexibilität"];
    case 429:
        //Traunmagil
        return["Schwebe", "Tastfluch", "Rastlose Seele"];
    case 430:
        //Kramshef
        return["Insomnia", "Vorahnung", "Hochmut"];
    case 431:
        //Charmian
        return["Flexibilität", "Charmebolzen", "Mitnahme"];
    case 432:
        //Shnurgarst
        return["Speckschicht", "Siegeswille", "Rauflust"];
    case 433:
        //Klingplim
        return["Synchro", "Telepathie", "Schwebe"];
    case 434:
        //Skunkapuh
        return["Duftnote", "Giftdorn", "Adlerauge"];
    case 435:
        //Skuntank
        return["Duftnote", "Giftdorn", "Adlerauge"];
    case 436:
        //Bronzel
        return["Schwebe", "Hitzeschutz", "Schwermetall"];
    case 437:
        //Bronzong
        return["Schwebe", "Hitzeschutz", "Schwermetall"];
    case 438:
        //Mobai
        return["Robustheit", "Steinhaupt", "Hasenfuß"];
    case 439:
        //Pantimimi
        return["Filter", "Lärmschutz", "Telepathie"];
    case 440:
        //Wonneira
        return["Innere Kraft", "Edelmut", "Freundeshut"];
    case 441:
        //Plaudagei
        return["Adlerauge", "Taumelschritt", "Brustbieter"];
    case 442:
        //Kryppuk
        return["Erzwinger", "Bedroher", "Unheilskörper"];
    case 443:
        //Kaumalat
        return["Sandschleier", "Rauhaut", "Titankiefer"];
    case 444:
        //Knarksel
        return["Sandscharrer", "Rauhaut", "Titankiefer"];
    case 445:
        //Knakrack
        return["Sandscharrer", "Rauhaut", "Titankiefer"];
    case 446:
        //Mampfaxo
        return["Mitnahme", "Speckschicht", "Völlerei"];
    case 447:
        //Riolu
        return["Konzentrator", "Redlichkeit", "Strolch"];
    case 448:
        //Lucario
        return["Konzentrator", "Redlichkeit", "Telepathie"];
    case 449:
        //Hippopotas
        return["Sandsturm", "Sandspeier", "Sandschleier"];
    case 450:
        //Hippoterus
        return["Sandsturm", "Sandspeier", "Sandschleier"];
    case 451:
        //Pionskora
        return["Hexaplaga", "Superschütze", "Kampfpanzer"];
    case 452:
        //Piondragi
        return["Giftgriff", "Superschütze", "Kampfpanzer"];
    case 453:
        //Glibunkel
        return["Trockenheit", "Giftgriff", "Vorahnung"];
    case 454:
        //Toxiquak
        return["Trockenheit", "Giftgriff", "Vorahnung"];
    case 455:
        //Venuflibis
        return["Schwebe", "Korrosion", "Völlerei"];
    case 456:
        //Finneon
        return["Sturmsog", "Wassertempo", "H2O-Absorber"];
    case 457:
        //Lumineon
        return["Sturmsog", "Wassertempo", "H2O-Absorber"];
    case 458:
        //Mantirps
        return["Aquahülle", "Wassertempo", "H2O-Absorber"];
    case 459:
        //Shnebedeck
        return["Schneemantel", "Schneeschauer", "Lärmschutz"];
    case 460:
        //Rexblisar
        return["Schneemantel", "Schneeschauer", "Bedroher"];
    case 461:
        //Snibunna
        return["Techniker", "Krallenwucht", "Eishaut"];
    case 462:
        //Magnezone
        return["Magnetfalle", "Robustheit", "Schwebe"];
    case 463:
        //Schlurplek
        return["Speckschicht", "Dösigkeit", "Völlerei"];
    case 464:
        //Rihornior
        return["Felskern", "Blitzfänger", "Achtlos"];
    case 465:
        //Tangoloss
        return["Chlorophyll", "Floraschild", "Belebekraft"];
    case 466:
        //Elevoltek
        return["Starthilfe", "Munterkeit", "Eisenfaust"];
    case 467:
        //Magbrant
        return["Flammkörper", "Magmapanzer", "Dösigkeit"];
    case 468:
        //Togekiss
        return["Charmebolzen", "Glückspilz", "Edelmut"];
    case 469:
        //Yanmega
        return["Facettenauge", "Temposchub", "Hexaplaga"];
    case 470:
        //Folipurba
        return["Chlorophyll", "Floraschild", "Anpassung"];
    case 471:
        //Glaziola
        return["Schneemantel", "Eishaut", "Anpassung"];
    case 472:
        //Skorgro
        return["Scherenmacht", "Sandschleier", "Immunität"];
    case 473:
        //Mamutel
        return["Speckschicht", "Eishaut", "Schnüffler"];
    case 474:
        //Porygon-Z
        return["Erfassen", "Download", "Analyse"];
    case 475:
        //Galagladi
        return["Scharfkantig", "Redlichkeit", "Brustbieter"];
    case 476:
        //Voluminas
        return["Robustheit", "Magnetfalle", "Sandgewalt"];
    case 477:
        //Zwirrfinst
        return["Erzwinger", "Tastfluch", "Unheilskörper"];
    case 478:
        //Frosdedje
        return["Schneemantel", "Schneeschauer", "Tastfluch"];
    case 479:
        //Rotom
        return["Schwebe", "Hadronen-Motor", "Starthilfe"];
    case 480:
        //Selfe
        return["Schwebe", "Telepathie", "Erleuchtung"];
    case 481:
        //Vesprit
        return["Schwebe", "Telepathie", "Erleuchtung"];
    case 482:
        //Tobutz
        return["Schwebe", "Telepathie", "Erleuchtung"];
    case 483:
        //Dialga
        return["Erzwinger", "Bedroher", "Zeitspiel"];
    case 484:
        //Palkia
        return["Erzwinger", "Bedroher", "Anspannung"];
    case 485:
        //Heatran
        return["Feuerfänger", "Flammkörper", "Magmapanzer"];
    case 486:
        //Regigigas
        return["Saumselig", "Rohe Gewalt", "Kraftkoloss"];
    case 487:
        //Giratina
        return["Erzwinger", "Schwebe", "Unheilskörper"];
    case 488:
        //Cresselia
        return["Schwebe", "Edelmut", "Heilherz"];
    case 489:
        //Phione
        return["Schwebe", "Hydration", "Aquahülle"];
    case 490:
        //Manaphy
        return["Schwebe", "Hydration", "Aquahülle"];
    case 491:
        //Darkrai
        return["Alptraum", "Schwebe", "Unheilskörper"];
    case 492:
        //Shaymin
        return["Innere Kraft", "Edelmut", "Heilherz"];
    case 493:
        //Arceus
        return["Variabilität", "Erzwinger", "Geistiges Auge"];
    case 494:
        //Victini
        return["Schwebe", "Telepathie", "Triumphstern"];
    case 495:
        //Serpifeu
        return["Notdünger", "Umkehrung", "Chlorophyll"];
    case 496:
        //Efoserp
        return["Notdünger", "Umkehrung", "Chlorophyll"];
    case 497:
        //Serpiroyal
        return["Notdünger", "Umkehrung", "Chlorophyll"];
    case 498:
        //Floink
        return["Großbrand", "Schnüffler", "Speckschicht"];
    case 499:
        //Ferkokel
        return["Großbrand", "Felsenfest", "Speckschicht"];
    case 500:
        //Flambirex
        return["Großbrand", "Achtlos", "Speckschicht"];
    case 501:
      return ["Sturzbach", "Wassertempo", "Scharfkantig"];
    case 502:
      return ["Sturzbach", "Wassertempo", "Scharfkantig"];
    case 503:
      return ["Sturzbach", "Panzerhaut", "Scharfkantig"];
    case 504:
      return ["Adlerauge", "Angsthase", "Analyse"];
    case 505:
      return ["Adlerauge", "Angsthase", "Analyse"];
    case 506:
      return ["Mitnahme", "Munterkeit", "Wachhund"];
    case 507:
      return ["Bedroher", "Rauflust", "Wachhund"];
    case 508:
      return ["Bedroher", "Rauflust", "Wachhund"];
    case 509:
      return ["Flexibilität", "Entlastung", "Strolch"];
    case 510:
      return ["Flexibilität", "Entlastung", "Strolch"];
    case 511:
      return ["Chlorophyll", "Völlerei", "Notdünger"];
    case 512:
      return ["Chlorophyll", "Völlerei", "Notdünger"];
    case 513:
      return ["Flammkörper", "Völlerei", "Großbrand"];
    case 514:
      return ["Flammkörper", "Völlerei", "Großbrand"];
    case 515:
      return ["Hydration", "Völlerei", "Sturzbach"];
    case 516:
      return ["Hydration", "Völlerei", "Sturzbach"];
    case 517:
      return ["Vorwarnung", "Synchro", "Telepathie"];
    case 518:
      return ["Vorwarnung", "Synchro", "Telepathie"];
    case 519:
      return ["Brustbieter", "Taumelschritt", "Adlerauge"];
    case 520:
      return ["Brustbieter", "Rivalität", "Adlerauge"];
    case 521:
      return ["Brustbieter", "Rivalität", "Adlerauge"];
    case 522:
      return ["Blitzfänger", "Vegetarier", "Starthilfe"];
    case 523:
      return ["Blitzfänger", "Vegetarier", "Starthilfe"];
    case 524:
      return ["Robustheit", "Bruchrüstung", "Felskern"];
    case 525:
      return ["Robustheit", "Bruchrüstung", "Felskern"];
    case 526:
      return ["Robustheit", "Sandsturm", "Felskern"];
    case 527:
      return ["Unkenntnis", "Tollpatsch", "Wankelmut"];
    case 528:
      return ["Unkenntnis", "Tollpatsch", "Wankelmut"];
    case 529:
      return ["Sandscharrer", "Sandgewalt", "Krallenwucht"];
    case 530:
      return ["Sandscharrer", "Sandgewalt", "Krallenwucht"];
    case 531:
      return ["Heilherz", "Belebekraft", "Tollpatsch"];
    case 532:
      return ["Adrenalin", "Rohe Gewalt", "Eisenfaust"];
    case 533:
      return ["Adrenalin", "Rohe Gewalt", "Eisenfaust"];
    case 534:
      return ["Adrenalin", "Rohe Gewalt", "Eisenfaust"];
    case 535:
      return ["Wassertempo", "Hydration", "H2O-Absorber"];
    case 536:
      return ["Wassertempo", "Hydration", "H2O-Absorber"];
    case 537:
      return ["Wassertempo", "Giftgriff", "H2O-Absorber"];
    case 538:
      return ["Adrenalin", "Konzentrator", "Überbrückung"];
    case 539:
      return ["Robustheit", "Konzentrator", "Überbrückung"];
    case 540:
      return ["Hexaplaga", "Chlorophyll", "Partikelschutz"];
    case 541:
      return ["Floraschild", "Chlorophyll", "Partikelschutz"];
    case 542:
      return ["Hexaplaga", "Chlorophyll", "Tänzer"];
    case 543:
      return ["Giftdorn", "Hexaplaga", "Temposchub"];
    case 544:
      return ["Giftdorn", "Hexaplaga", "Temposchub"];
    case 545:
      return ["Giftdorn", "Hexaplaga", "Temposchub"];
    case 546:
      return ["Schwebedurch", "Schwebe", "Chlorophyll"];
    case 547:
      return ["Schwebedurch", "Schwebe", "Strolch"];
    case 548:
      return ["Chlorophyll", "Gleichmut", "Floraschild"];
    case 549:
      return ["Chlorophyll", "Gleichmut", "Floraschild"];
    case 550:
      return ["Achtlos", "Wassertempo", "Hasenfuß"];
    case 551:
      return ["Bedroher", "Hochmut", "Kurzschluss"];
    case 552:
      return ["Bedroher", "Hochmut", "Kurzschluss"];
    case 553:
      return ["Bedroher", "Hochmut", "Kurzschluss"];
    case 554:
      return ["Übereifer", "Konzentrator", "Rasanz"];
    case 555:
      return ["Rohe Gewalt", "Trance-Modus", "Eisenfaust"];
    case 556:
      return ["H2O-Absorber", "Chlorophyll", "Sturmsog"];
    case 557:
      return ["Robustheit", "Panzerhaut", "Bruchrüstung"];
    case 558:
      return ["Robustheit", "Panzerhaut", "Bruchrüstung"];
    case 559:
      return ["Expidermis", "Hochmut", "Strolch"];
    case 560:
      return ["Expidermis", "Hochmut", "Bedroher"];
    case 561:
      return ["Wunderhaut", "Magieschild", "Magiespiegel"];
    case 562:
      return ["Mumie", "Rastlose Seele", "Schwebe"];
    case 563:
      return ["Mumie", "Rastlose Seele", "Immunität"];
    case 564:
      return ["Felskern", "Robustheit", "Wassertempo"];
    case 565:
      return ["Felskern", "Robustheit", "Wassertempo"];
    case 566:
      return ["Schwächling", "Adlerauge", "Rauflust"];
    case 567:
      return ["Schwächling", "Adlerauge", "Rauflust"];
    case 568:
      return ["Duftnote", "Klebekörper", "Finalschlag"];
    case 569:
      return ["Duftnote", "Bruchrüstung", "Finalschlag"];
    case 570:
      return ["Trugbild", "Adrenalin", "Strolch"];
    case 571:
      return ["Trugbild", "Adrenalin", "Strolch"];
    case 572:
      return ["Charmebolzen", "Techniker", "Wertelink"];
    case 573:
      return ["Charmebolzen", "Techniker", "Wertelink"];
    case 574:
      return ["Schnüffler", "Vorahnung", "Unbeugsamkeit"];
    case 575:
      return ["Schnüffler", "Vorahnung", "Wegsperre"];
    case 576:
      return ["Schnüffler", "Vorahnung", "Wegsperre"];
    case 577:
      return ["Partikelschutz", "Magieschild", "Belebekraft"];
    case 578:
      return ["Partikelschutz", "Magieschild", "Belebekraft"];
    case 579:
      return ["Partikelschutz", "Magieschild", "Belebekraft"];
    case 580:
      return ["Adlerauge", "Brustbieter", "Hydration"];
    case 581:
      return ["Adlerauge", "Brustbieter", "Hydration"];
    case 582:
      return ["Eishaut", "Frostschicht", "Schneemantel"];
    case 583:
      return ["Eishaut", "Frostschicht", "Schneemantel"];
    case 584:
      return ["Eishaut", "Frostschicht", "Schneemantel"];
    case 585:
      return ["Chlorophyll", "Vegetarier", "Edelmut"];
    case 586:
      return ["Chlorophyll", "Vegetarier", "Edelmut"];
    case 587:
      return ["Statik", "Starthilfe", "Backentaschen"];
    case 588:
      return ["Hexaplaga", "Expidermis", "Schildlos"];
    case 589:
      return ["Hexaplaga", "Panzerhaut", "Partikelschutz"];
    case 590:
      return ["Sporenwirt", "Belebekraft", "Glückspilz"];
    case 591:
      return ["Sporenwirt", "Belebekraft", "Glückspilz"];
    case 592:
      return ["Schwebe", "Tastfluch", "H2O-Absorber"];
    case 593:
      return ["Schwebe", "Tastfluch", "H2O-Absorber"];
    case 594:
      return ["Heilherz", "Belebekraft", "Wassertempo"];
    case 595:
      return ["Facettenauge", "Anspannung", "Hexaplaga"];
    case 596:
      return ["Facettenauge", "Anspannung", "Hexaplaga"];
    case 597:
      return ["Eisenstachel", "Robustheit", "Rauhaut"];
    case 598:
      return ["Eisenstachel", "Robustheit", "Rauhaut"];
    case 599:
      return ["Schwebe", "Plus", "Minus"];
    case 600:
      return ["Schwebe", "Plus", "Minus"];
    case 601:
      return ["Schwebe", "Plus", "Minus"];
    case 602:
      return ["Schwebe", "Dynamo", "Statik"];
    case 603:
      return ["Schwebe", "Dynamo", "Statik"];
    case 604:
      return ["Schwebe", "Dynamo", "Statik"];
    case 605:
      return ["Telepathie", "Synchro", "Analyse"];
    case 606:
      return ["Telepathie", "Synchro", "Analyse"];
    case 607:
      return ["Erleuchtung", "Feuerfänger", "Flammkörper"];
    case 608:
      return ["Erleuchtung", "Feuerfänger", "Schwebe"];
    case 609:
      return ["Erleuchtung", "Feuerfänger", "Schwebe"];
    case 610:
      return ["Rivalität", "Überbrückung", "Anspannung"];
    case 611:
      return ["Rivalität", "Überbrückung", "Anspannung"];
    case 612:
      return ["Rivalität", "Überbrückung", "Bedroher"];
    case 613:
      return ["Schneemantel", "Schneescharrer", "Hasenfuß"];
    case 614:
      return ["Schneemantel", "Schneescharrer", "Bedroher"];
    case 615:
      return ["Schwebe", "Eishaut", "Frostschicht"];
    case 616:
      return ["Hexaplaga", "Panzerhaut", "Partikelschutz"];
    case 617:
      return ["Hydration", "Klebekörper", "Temposchub"];
    case 618:
      return ["Statik", "Flexibilität", "Sandschleier"];
    case 619:
      return ["Konzentrator", "Belebekraft", "Achtlos"];
    case 620:
      return ["Konzentrator", "Belebekraft", "Achtlos"];
    case 621:
      return ["Rauhaut", "Rohe Gewalt", "Überbrückung"];
    case 622:
      return ["Eisenfaust", "Tollpatsch", "Schildlos"];
    case 623:
      return ["Eisenfaust", "Tollpatsch", "Schildlos"];
    case 624:
      return ["Siegeswille", "Konzentrator", "Erzwinger"];
    case 625:
      return ["Siegeswille", "Konzentrator", "Erzwinger"];
    case 626:
      return ["Achtlos", "Vegetarier", "Kurzschluss"];
    case 627:
      return ["Adlerauge", "Rohe Gewalt", "Übereifer"];
    case 628:
      return ["Adlerauge", "Rohe Gewalt", "Siegeswille"];
    case 629:
      return ["Brustbieter", "Partikelschutz", "Bruchrüstung"];
    case 630:
      return ["Brustbieter", "Partikelschutz", "Bruchrüstung"];
    case 631:
      return ["Völlerei", "Feuerfänger", "Pulverrauch"];
    case 632:
      return ["Hexaplaga", "Übereifer", "Partikelschutz"];
    case 633:
      return ["Übereifer", "Anspannung", "Drachenkiefer"];
    case 634:
      return ["Übereifer", "Anspannung", "Drachenkiefer"];
    case 635:
      return ["Schwebe", "Bedroher", "Drachenkiefer"];
    case 636:
      return ["Flammkörper", "Hexaplaga", "Dürre"];
    case 637:
      return ["Flammkörper", "Hexaplaga", "Dürre"];
    case 638:
      return ["Redlichkeit", "Neutraltorso", "Reitgespann"];
    case 639:
      return ["Redlichkeit", "Robustheit", "Reitgespann"];
    case 640:
      return ["Redlichkeit", "Temposchub", "Reitgespann"];
    case 641:
      return ["Strolch", "Siegeswille", "Niesel"];
    case 642:
      return ["Strolch", "Siegeswille", "Niesel"];
    case 643:
      return ["Turbobrand", "Erzwinger", "Bedroher"];
    case 644:
      return ["Teravolt", "Erzwinger", "Bedroher"];
    case 645:
      return ["Strolch", "Siegeswille", "Dürre"];
    case 646:
      return ["Erzwinger", "Eishaut", "Frostschicht"];
    case 647:
      return ["Redlichkeit", "Hydration", "Reitgespann"];
    case 648:
      return ["Edelmut", "Tänzer", "Plätscherstimme"];
    case 649:
      return ["Download", "Analyse", "Neutraltorso"];
    case 650:
      return ["Notdünger", "Kugelsicher", "Strolch"];
    case 651:
      return ["Notdünger", "Kugelsicher", "Speckschicht"];
    case 652:
      return ["Notdünger", "Kugelsicher", "Edelmut"];
    case 653:
      return ["Großbrand", "Zauberer", "Fellkleid"];
    case 654:
      return ["Großbrand", "Zauberer", "Telepathie"];
    case 655:
      return ["Großbrand", "Zauberer", "Telepathie"];
    case 656:
      return ["Sturzbach", "Wandlungskunst", "Wassertempo"];
    case 657:
      return ["Sturzbach", "Wandlungskunst", "Wassertempo"];
    case 658:
      return ["Sturzbach", "Wandlungskunst", "Wassertempo"];
    case 659:
      return ["Sandscharrer", "Backentaschen", "Kraftkoloss"];
    case 660:
      return ["Rohe Gewalt", "Backentaschen", "Kraftkoloss"];
    case 661:
      return ["Adlerauge", "Brustbieter", "Orkanschwingen"];
    case 662:
      return ["Adlerauge", "Brustbieter", "Orkanschwingen"];
    case 663:
      return ["Adlerauge", "Brustbieter", "Orkanschwingen"];
    case 664:
      return ["Puderabwehr", "Facettenaugen", "Freundeshut"];
    case 665:
      return ["Puderabwehr", "Expidermis", "Freundeshut"];
    case 666:
      return ["Puderabwehr", "Facettenaugen", "Freundeshut"];
    case 667:
      return ["Rivalität", "Anspannung", "Hochmut"];
    case 668:
      return ["Rivalität", "Bedroher", "Hochmut"];
    case 669:
      return ["Blütenhülle", "Symbiose", "Schwebe"];
    case 670:
      return ["Blütenhülle", "Symbiose", "Schwebe"];
    case 671:
      return ["Blütenhülle", "Symbiose", "Schwebe"];
    case 672:
      return ["Vegetarier", "Pflanzenpelz", "Chlorophyll"];
    case 673:
      return ["Vegetarier", "Pflanzenpelz", "Reitgespann"];
    case 674:
      return ["Eisenfaust", "Überbrückung", "Rauflust"];
    case 675:
      return ["Eisenfaust", "Überbrückung", "Rauflust"];
    case 676:
      return ["Fellkleid", "Wachhund", "Flexibilität"];
    case 677:
      return ["Adlerauge", "Vorahnung", "Vorwarnung"];
    case 678:
      return ["Strolch", "Vorahnung", "Vorwarnung"];
    case 679:
      return ["Schildlos", "Schwebe", "Tastfluch"];
    case 680:
      return ["Schildlos", "Schwebe", "Tastfluch"];
    case 681:
      return ["Schwebe", "Unheilskörper", "Taktikwechsel"];
    case 682:
      return ["Duftnote", "Dufthülle", "Schnüffler"];
    case 683:
      return ["Duftnote", "Dufthülle", "Schnüffler"];
    case 684:
      return ["Zuckerhülle", "Entlastung", "Schwebe"];
    case 685:
      return ["Zuckerhülle", "Entlastung", "Völlerei"];
    case 686:
      return ["Umkehrung", "Saugnapf", "Schwebe"];
    case 687:
      return ["Umkehrung", "Saugnapf", "Schwebe"];
    case 688:
      return ["Krallenwucht", "Superschütze", "Langfinger"];
    case 689:
      return ["Krallenwucht", "Superschütze", "Langfinger"];
    case 690:
      return ["Giftdorn", "Giftgriff", "Schwebe"];
    case 691:
      return ["Giftdorn", "Giftgriff", "Schwebe"];
    case 692:
      return ["Megawumme", "Wassertempo", "Schwerenmacht"];
    case 693:
      return ["Megawumme", "Wassertempo", "Schwerenmacht"];
    case 694:
      return ["Trockenheit", "Sandschleier", "Solarkraft"];
    case 695:
      return ["Trockenheit", "Sandschleier", "Solarkraft"];
    case 696:
      return ["Titankiefer", "Robustheit", "Anspannung"];
    case 697:
      return ["Titankiefer", "Robustheit", "Bedroher"];
    case 698:
      return ["Eishaut", "Edelmut", "Hochmut"];
    case 699:
      return ["Eishaut", "Edelmut", "Hochmut"];
    case 700:
      return ["Charmebolzen", "Feenschicht", "Edelmut"];
    case 701:
      return ["Flexibilität", "Entlastung", "Überbrückung"];
    case 702:
      return ["Backentaschen", "Mitnahme", "Statik"];
    case 703:
      return ["Schwebe", "Neutraltorso", "Robustheit"];
    case 704:
      return ["Klebekörper", "Viskosität", "Hydration"];
    case 705:
      return ["Klebekörper", "Viskosität", "Hydration"];
    case 706:
      return ["Klebekörper", "Viskosität", "Hydration"];
    case 707:
      return ["Strolch", "Zauberer", "Schwebe"];
    case 708:
      return ["Schwebe", "Schnüffler", "Reiche Ernte"];
    case 709:
      return ["Alptraum", "Tastfluch", "Bedroher"];
    case 710:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 711:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 712:
      return ["Eishaut", "Frostschicht", "Robustheit"];
    case 713:
      return ["Eishaut", "Frostschicht", "Robustheit"];
    case 714:
      return ["Schnüffler", "Schwebedurch", "Telepathie"];
    case 715:
      return ["Schnüffler", "Schwebedurch", "Telepathie"];
    case 716:
      return ["Feenaura", "Erzwinger", "Heilherz"];
    case 717:
      return ["Dunkelaura", "Erzwinger", "Bedroher"];
    case 718:
      return ["Aura-Umkehr", "Scharwandel", "Erzwinger"];
    case 719:
      return ["Neutraltorso", "Schwebe", "Edelmut"];
    case 720:
      return ["Zauberer", "Schwebe", "Strolch"];
    case 721:
      return ["H2O-Absorber", "Pulverrauch", "Magmapanzer"];
    case 722:
      return ["Notdünger", "Langstrecke", "Taumelschritt"];
    case 723:
      return ["Notdünger", "Langstrecke", "Taumelschritt"];
    case 724:
      return ["Notdünger", "Langstrecke", "Adlerauge"];
    case 725:
      return ["Großbrand", "Bedroher", "Flexibilität"];
    case 726:
      return ["Großbrand", "Bedroher", "Krallenwucht"];
    case 727:
      return ["Großbrand", "Bedroher", "Krallenwucht"];
    case 728:
      return ["Sturzbach", "Schnüffler", "Plätscherstimme"];
    case 729:
      return ["Sturzbach", "WWassertempo", "Plätscherstimme"];
    case 730:
      return ["Sturzbach", "WWassertempo", "Plätscherstimme"];
    case 731:
      return ["Adlerauge", "Wertelink", "Taumelschritt"];
    case 732:
      return ["Adlerauge", "Wertelink", "Taumelschritt"];
    case 733:
      return ["Adlerauge", "Wertelink", "Rohe Gewalt"];
    case 734:
      return ["Beschattung", "Titankiefer", "Anpassung"];
    case 735:
      return ["Beschattung", "Titankiefer", "Anpassung"];
    case 736:
      return ["Hexaplaga", "Facettenauge", "Titankiefer"];
    case 737:
      return ["Hexaplaga", "Batterie", "Statik"];
    case 738:
      return ["Hexaplaga", "Schwebe", "Batterie"];
    case 739:
      return ["Scherenmacht", "Eisenfaust", "Kurzschluss"];
    case 740:
      return ["Scherenmacht", "Eisenfaust", "Kurzschluss"];
    case 741:
      return ["Tänzer", "Adlerauge", "Taumelschritt"];
    case 742:
      return ["Schwebe", "Puderabwehr", "Honigmaul"];
    case 743:
      return ["Schwebe", "Puderabwehr", "Honigmaul"];
    case 744:
      return ["Felsenfest", "Munterkeit", "Wachhund"];
    case 745:
      return ["Felsenfest", "Munterkeit", "Wachhund"];
    case 746:
      return ["Fischschwarm", "Wassertempo", "Angsthase"];
    case 747:
      return ["Quälerei", "Giftdorn", "Belebekraft"];
    case 748:
      return ["Quälerei", "Giftdorn", "Belebekraft"];
    case 749:
      return ["GLeichmut", "Zähigkeit", "Vegetarier"];
    case 750:
      return ["Konzentrator", "Zähigkeit", "Vegetarier"];
    case 751:
      return ["Wasserblase", "H2O-Absorber", "Heilherz"];
    case 752:
      return ["Wasserblase", "H2O-Absorber", "Heilherz"];
    case 753:
      return ["Floraschild", "Umkehrung", "Chlorophyll"];
    case 754:
      return ["Floraschild", "Umkehrung", "Chlorophyll"];
    case 755:
      return ["Erleuchtung", "Sporenwirt", "Regengenuss"];
    case 756:
      return ["Erleuchtung", "Sporenwirt", "Regengenuss"];
    case 757:
      return ["Korrosion", "Dösigkeit", "Rivalität"];
    case 758:
      return ["Korrosion", "Dösigkeit", "Rivalität"];
    case 759:
      return ["Flauschigkeit", "Tollpatsch", "Charmebolzen"];
    case 760:
      return ["Flauschigkeit", "Tollpatsch", "Anspannung"];
    case 761:
      return ["Floraschild", "Reiche Ernte", "Zuckerhülle"];
    case 762:
      return ["Floraschild", "Reiche Ernte", "Zuckerhülle"];
    case 763:
      return ["Floraschild", "Majestät", "Zuckerhülle"];
    case 764:
      return ["Blütenhülle", "Heilwandel", "Innere Kraft"];
    case 765:
      return ["Konzentrator", "Telepathie", "Symbiose"];
    case 766:
      return ["Receiver", "Siegeswille", "Rasanz"];
    case 767:
      return ["Reißaus", "Angsthase", "Hasenfuß"];
    case 768:
      return ["Rückzug", "Bedroher", "Rohe Gewalt"];
    case 769:
      return ["Verklumpen", "Sandschleier", "Sandgewalt"];
    case 770:
      return ["Verklumpen", "Sandschleier", "Sandgewalt"];
    case 771:
      return ["Magenkrempler", "Unkenntnis", "Giftdorn"];
    case 772:
      return ["Kampfpanzer", "Anpassung", "Anspannung"];
    case 773:
      return ["Kampfpanzer", "Alpha-System", "Anpassung"];
    case 774:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 775:
      return ["Dauerschlaf", "Konzentrator", "Vegetarier"];
    case 776:
      return ["Panzerhaut", "Magmapanzer", "Superschütze"];
    case 777:
      return ["Eisenstachel", "Blitzfänger", "Robustheit"];
    case 778:
      return ["Kostümspuk", "Bedroher", "Tastfluch"];
    case 779:
      return ["Buntkörper", "Titankiefer", "Wunderhaut"];
    case 780:
      return ["Wutausbruch", "Schwebe", "Wolke Sieben"];
    case 781:
      return ["Stahlprofi", "Tastfluch", "Immunität"];
    case 782:
      return ["Kugelsicher", "Lärmschutz", "Partikelschutz"];
    case 783:
      return ["Kugelsicher", "Lärmschutz", "Partikelschutz"];
    case 784:
      return ["Kugelsicher", "Lärmschutz", "Partikelschutz"];
    case 785:
      return ["Elektro-Erzeuger", "Schwebe", "Telepathie"];
    case 786:
      return ["Psycho-Erzeuger", "Schwebe", "Telepathie"];
    case 787:
      return ["Gras-Erzeuger", "Schwebe", "Telepathie"];
    case 788:
      return ["Nebel-Erzeuger", "Schwebe", "Telepathie"];
    case 789:
      return ["Schwebe", "Unkenntnis", "Strolch"];
    case 790:
      return ["Schwebe", "Unkenntnis", "Robustheit"];
    case 791:
      return ["Metallprotektor", "Bedroher", "Erzwinger"];
    case 792:
      return ["Phantomschutz", "Schwebe", "Erzwinger"];
    case 793:
      return ["Bestien-Boost", "Schwebe", "Giftbelag"];
    case 794:
      return ["Bestien-Boost", "Rohe Gewalt", "Adrenalin"];
    case 795:
      return ["Bestien-Boost", "Charmebolzen", "Rivalität"];
    case 796:
      return ["Bestien-Boost", "Flexibilität", "Immunität"];
    case 797:
      return ["Bestien-Boost", "Leichtmetall", "Schwermetall"];
    case 798:
      return ["Bestien-Boost", "Schwebe", "Scharfkantig"];
    case 799:
      return ["Bestien-Boost", "Völlerei", "Erzwinger"];
    case 800:
      return ["Prismarüstung", "Erzwinger", "Telepathie"];
    case 801:
      return ["Seelenherz", "Robustheit", "Feenschicht"];
    case 802:
      return ["Techniker", "Phantomschutz", "Eisenfaust"];
    case 803:
      return ["Bestien-Boost", "Schwebe", "Heilwandel"];
    case 804:
      return ["Bestien-Boost", "Schwebe", "Heilwandel"];
    case 805:
      return ["Bestien-Boost", "Robustheit", "Analyse"];
    case 806:
      return ["Bestien-Boost", "Finalschlag", "Tänzer"];
    case 807:
      return ["Voltabsorber", "Rasanz", "Eisenfaust"];
    case 808:
      return ["Magnetfalle", "Viskosität", "Giftgriff"];
    case 809:
      return ["Magnetfalle", "Eisenfaust", "Robustheit"];
    case 810:
      return ["Notdünger", "Gras-Erzeuger", "Strolch"];
    case 811:
      return ["Notdünger", "Gras-Erzeuger", "Konzentrator"];
    case 812:
      return ["Notdünger", "Gras-Erzeuger", "Eisenfaust"];
    case 813:
      return ["Großbrand", "Libero", "Übereifer"];
    case 814:
      return ["Großbrand", "Libero", "Temposchub"];
    case 815:
      return ["Großbrand", "Libero", "Temposchub"];
    case 816:
      return ["Sturzbach", "Superschütze", "Angsthase"];
    case 817:
      return ["Sturzbach", "Superschütze", "Hydration"];
    case 818:
      return ["Sturzbach", "Superschütze", "Hydration"];
    case 819:
      return ["Backentaschen", "Völlerei", "Speckschicht"];
    case 820:
      return ["Backentaschen", "Völlerei", "Speckschicht"];
    case 821:
      return ["Adlerauge", "Brustbieter", "Anspannung"];
    case 822:
      return ["Adlerauge", "Brustbieter", "Anspannung"];
    case 823:
      return ["Adlerauge", "Anspannung", "Spiegelrüstung"];
    case 824:
      return ["Hexaplaga", "Facettenauge", "Telepathie"];
    case 825:
      return ["Hexaplaga", "Facettenauge", "Telepathie"];
    case 826:
      return ["Hexaplaga", "Schnüffler", "Telepathie"];
    case 827:
      return ["Angsthase", "Mitnahme", "Beschattung"];
    case 828:
      return ["Angsthase", "Mitnahme", "Beschattung"];
    case 829:
      return ["Wollflaum", "Schwebe", "Sporenwirt"];
    case 830:
      return ["Wollflaum", "Schwebe", "Sporenwirt"];
    case 831:
      return ["Flauschigkeit", "Angsthase", "Kugelsicher"];
    case 832:
      return ["Flauschigkeit", "Felsenfest", "Kugelsicher"];
    case 833:
      return ["Titankiefer", "Panzerhaut", "Wassertempo"];
    case 834:
      return ["Titankiefer", "Panzerhaut", "Wassertempo"];
    case 835:
      return ["Apport", "Wachhund", "Statik"];
    case 836:
      return ["Titankiefer", "Wachhund", "Statik"];
    case 837:
      return ["Dampantrieb", "Hitzeschutz", "Feuerfänger"];
    case 838:
      return ["Dampantrieb", "Feuerfänger", "Feuerfänger"];
    case 839:
      return ["Dampantrieb", "Feuerfänger", "Feuerfänger"];
    case 840:
      return ["Heranreifen", "Völlerei", "Kugelsicher"];
    case 841:
      return ["Heranreifen", "Völlerei", "Übereifer"];
    case 842:
      return ["Heranreifen", "Völlerei", "Speckschicht"];
    case 843:
      return ["Sandspeier", "Expidermis", "Sandschleier"];
    case 844:
      return ["Sandspeier", "Expidermis", "Sandschleier"];
    case 845:
      return ["Würggeschoss", "Adlerauge", "Brustbieter"];
    case 846:
      return ["Wassertempo", "Schraubflosse", "Titankiefer"];
    case 847:
      return ["Wassertempo", "Schraubflosse", "Titankiefer"];
    case 848:
      return ["Hasenfuß", "Statik", "Tollpatsch"];
    case 849:
      return ["Punk Rock", "Techniker", "Statik"];
    case 850:
      return ["Feuerfänger", "Pulverrauch", "Flammkörper"];
    case 851:
      return ["Feuerfänger", "Pulverrauch", "Flammkörper"];
    case 852:
      return ["Flexibilität", "Techniker", "Eisenfaust"];
    case 853:
      return ["Flexibilität", "Techniker", "Eisenfaust"];
    case 854:
      return ["Bruchrüstung", "Tastfluch", "Gastlichkeit"];
    case 855:
      return ["Bruchrüstung", "Tastfluch", "Gastlichkeit"];
    case 856:
      return ["Heilherz", "Vorahnung", "Magiespiegel"];
    case 857:
      return ["Heilherz", "Vorahnung", "Magiespiegel"];
    case 858:
      return ["Heilherz", "Vorahnung", "Magiespiegel"];
    case 859:
      return ["Strolch", "Schnüffler", "Langfinger"];
    case 860:
      return ["Strolch", "Schnüffler", "Langfinger"];
    case 861:
      return ["Strolch", "Schnüffler", "Langfinger"];
    case 862:
      return ["Adrenalin", "Siegeswille", "Ausweglos"];
    case 863:
      return ["Kampfpanzer", "Krallenwucht", "Stählerner Wille"];
    case 864:
      return ["Bruchrüstung", "Unheilskörper", "Tastfluch"];
    case 865:
      return ["Felsenfest", "Rauflust", "Redlichkeit"];
    case 866:
      return ["Taumelschritt", "Hemmungslos", "Eishaut"];
    case 867:
      return ["Rastlose Seele", "Tastfluch", "Anspannung"];
    case 868:
      return ["Zuckerhülle", "Dufthülle", "Heilherz"];
    case 869:
      return ["Zuckerhülle", "Dufthülle", "Heilherz"];
    case 870:
      return ["Kampfpanzer", "Siegeswille", "Freundeshut"];
    case 871:
      return ["Blitzfänger", "Elektro-Erzeuger", "Eisenstachel"];
    case 872:
      return ["Puderabwehr", "Eisflügelstaub", "Hexaplaga"];
    case 873:
      return ["Puderabwehr", "Eisflügelstaub", "Hexaplaga"];
    case 874:
      return ["Kraftquelle", "Felskern", "Vorahnung"];
    case 875:
      return ["Tiefkühlkopf", "Eishaut", "Frostschicht"];
    case 876:
      return ["Synchro", "Psycho-Erzeuger", "Konzentrator"];
    case 877:
      return ["Heißhunger", "Backentaschen", "Statik"];
    case 878:
      return ["Rohe Gewalt", "Schwermetall", "Robustheit"];
    case 879:
      return ["Rohe Gewalt", "Schwermetall", "Robustheit"];
    case 880:
      return ["Voltabsorber", "Übereifer", "Elektro-Erzeuger"];
    case 881:
      return ["Voltabsorber", "Statik", "Schneescharrer"];
    case 882:
      return ["H2O-Absorber", "Titankiefer", "Sandscharrer"];
    case 883:
      return ["H2O-Absorber", "Eishaut", "Schneescharrer"];
    case 884:
      return ["Leichtmetall", "Stahlrückgrat", "Robustheit"];
    case 885:
      return ["Schwebe", "Schwebedurch", "Neutraltorso"];
    case 886:
      return ["Schwebe", "Schwebedurch", "Neutraltorso"];
    case 887:
      return ["Schwebe", "Schwebedurch", "Neutraltorso"];
    case 888:
      return ["Kühnes Schwert", "Erzwinger", "Redlichkeit"];
    case 889:
      return ["Wackerer Schild", "Erzwinger", "Redlichkeit"];
    case 890:
      return ["Erzwinger", "Schwebe", "Bedroher"];
    case 891:
      return ["Konzentrator", "Schildlos", "Techniker"];
    case 892:
      return ["Verborgene Faust", "Techniker", "Eisenfaust"];
    case 893:
      return ["Floraschild", "Krallenwucht", "Rohe Gewalt"];
    case 894:
      return ["Transistor", "Schwebe", "Voltabsorber"];
    case 895:
      return ["Drachenkiefer", "Titankiefer", "Neutraltorso"];
    case 896:
      return ["Helles Wiehern", "Reitgespann", "Eishaut"];
    case 897:
      return ["Dunkles Wiehern", "Reitgespann", "Tastfluch"];
    case 898:
      return ["Anspannung", "Reitgespann", "Majestät"];
    case 899:
      return ["Bedroher", "Schnüffler", "Vorahnung"];
    case 900:
      return ["Hexaplaga", "Rohe Gewalt", "Scharfkantig"];
    case 901:
      return ["Adrenalin", "Bedroher", "Kugelsicher"];
    case 902:
      return ["Wassertempo", "Anspannung", "Überbrückung"];
    case 903:
      return ["Erzwinger", "Giftgriff", "Krallenwucht"];
    case 904:
      return ["Giftdorn", "Wassertempo", "Bedroher"];
    case 905:
      return ["Heilherz", "Charmebolzen", "Umkehrung"];
    case 906:
      return ["Notdünger", "Strolch", "Chlorophyll"];
    case 907:
      return ["Notdünger", "Krallenwucht", "Chlorophyll"];
    case 908:
      return ["Notdünger", "Wandlungskunst", "Chlorophyll"];
    case 909:
      return ["Großbrand", "Unkenntnis", "Titankiefer"];
    case 910:
      return ["Großbrand", "Unkenntnis", "Titankiefer"];
    case 911:
      return ["Großbrand", "Unkenntnis", "Titankiefer"];
    case 912:
      return ["Sturzbach", "Hochmut", "Hydration"];
    case 913:
      return ["Sturzbach", "Hochmut", "Tänzer"];
    case 914:
      return ["Sturzbach", "Hochmut", "Tänzer"];
    case 915:
      return ["Dufthülle", "Völlerei", "Speckschicht"];
    case 916:
      return ["Duftschwade", "Völlerei", "Speckschicht"];
    case 917:
      return ["Insomnia", "Beschattung", "Hexaplaga"];
    case 918:
      return ["Insomnia", "Beschattung", "Hexaplaga"];
    case 919:
      return ["Hexaplaga", "Aufwertung", "Reißaus"];
    case 920:
      return ["Hexaplaga", "Aufwertung", "Rasanz"];
    case 921:
      return ["Statik", "Innere Kraft", "Aufwertung"];
    case 922:
      return ["Voltabsorber", "Innere Kraft", "Eisenfaust"];
    case 923:
      return ["Voltabsorber", "Innere Kraft", "Eisenfaust"];
    case 924:
      return ["Angsthase", "Backentaschen", "Freundeshut"];
    case 925:
      return ["Backentaschen", "Techniker", "Freundeshut"];
    case 926:
      return ["Gleichmut", "Tollpatsch", "Wachhund"];
    case 927:
      return ["Knusperkruste", "Dufthülle", "Wachhund"];
    case 928:
      return ["Frühwecker", "Reiche Ernte", "Chlorophyll"];
    case 929:
      return ["Frühwecker", "Reiche Ernte", "Chlorophyll"];
    case 930:
      return ["Frühwecker", "Reiche Ernte", "Streusaat"];
    case 931:
      return ["Bedroher", "Übereifer", "Rohe Gewalt"];
    case 932:
      return ["Läutersalz", "Robustheit", "Neutraltorso"];
    case 933:
      return ["Läutersalz", "Robustheit", "Neutraltorso"];
    case 934:
      return ["Läutersalz", "Robustheit", "Neutraltorso"];
    case 935:
      return ["Feuerfänger", "Flammkörper", "Unbeugsamkeit"];
    case 936:
      return ["Feuerfänger", "Flammkörper", "Unbeugsamkeit"];
    case 937:
      return ["Feuerfänger", "Bruchrüstung", "Unbeugsamkeit"];
    case 938:
      return ["Dynamo", "Statik", "Feuchtigkeit"];
    case 939:
      return ["Dynamo", "Statik", "Feuchtigkeit"];
    case 940:
      return ["Windkraft", "Orkanschwingen", "Voltabsorber"];
    case 941:
      return ["Windkraft", "Orkanschwingen", "Voltabsorber"];
    case 942:
      return ["Bedroher", "Angsthase", "Titankiefer"];
    case 943:
      return ["Bedroher", "Wachhund", "Titankiefer"];
    case 944:
      return ["Entlastung", "Langfinger", "Strolch"];
    case 945:
      return ["Entlastung", "Giftgriff", "Strolch"];
    case 946:
      return ["Windreiter", "Schwebedurch", "Schwebe"];
    case 947:
      return ["Windreiter", "Schwebedurch", "Schwebe"];
    case 948:
      return ["Myzelienkraft", "Rasanz", "Flexibilität"];
    case 949:
      return ["Myzelienkraft", "Heilwandel", "Flexibilität"];
    case 950:
      return ["Wutpanzer", "Panzerhaut", "Scherenmacht"];
    case 951:
      return ["Chlorophyll", "Tollpatsch", "Strolch"];
    case 952:
      return ["Chlorophyll", "Insomnia", "Gefühlswippe"];
    case 953:
      return ["Facettenauge", "Expidermis", "Mitnahme"];
    case 954:
      return ["Synchro", "Telepathie", "Mitnahme"];
    case 955:
      return ["Vorahnung", "Schnüüffler", "Schwebe"];
    case 956:
      return ["Profiteur", "Schnüffler", "Temposchub"];
    case 957:
      return ["Überbrückung", "Gleichmut", "Siegeswille"];
    case 958:
      return ["Überbrückung", "Rohe Gewalt", "Siegeswille"];
    case 959:
      return ["Überbrückung", "Kraftkoloss", "Siegeswille"];
    case 960:
      return ["Viskosität", "Hasenfuß", "Sandschleier"];
    case 961:
      return ["Viskosität", "Hasenfuß", "Sandschleier"];
    case 962:
      return ["Brustbieter", "Adlerauge", "Steinträger"];
    case 963:
      return ["Aquahülle", "Wassertempo", "Hydration"];
    case 964:
      return ["Superwechsel", "Wassertempo", "Siegeswille"];
    case 965:
      return ["Partikelschutz", "Filter", "Temposchub"];
    case 966:
      return ["Partikelschutz", "Filter", "Temposchub"];
    case 967:
      return ["Expidermis", "Belebekraft", "Drachenkiefer"];
    case 968:
      return ["Bodenschmaus", "Sandschleier", "Sandscharrer"];
    case 969:
      return ["Giftbelag", "Korrosion", "Schwebe"];
    case 970:
      return ["Giftbelag", "Korrosion", "Schwebe"];
    case 971:
      return ["Erleuchtung", "Flauschigkeit", "Tastfluch"];
    case 972:
      return ["Sandscharrer", "Flauschigkeit", "Tastfluch"];
    case 973:
      return ["Rauflust", "Taumelschritt", "Synchroauftritt"];
    case 974:
      return ["Speckschicht", "Schneemantel", "Rohe Gewalt"];
    case 975:
      return ["Speckschicht", "Schneemantel", "Rohe Gewalt"];
    case 976:
      return ["Überbrücking", "Scharfkantig", "Wassertempo"];
    case 977:
      return ["Unkenntnis", "Dösigkeit", "Aquahülle"];
    case 978:
      return ["Kommandant", "Sturmsog", "Wassertempo"];
    case 979:
      return ["Munterkeit", "Kurzschluss", "Wutausbruch"];
    case 980:
      return ["Giftdorn", "H2O-Absorber", "Unkenntnis"];
    case 981:
      return ["Wiederkäuer", "Schweifrüstung", "Vegetarier"];
    case 982:
      return ["Edelmut", "Angsthase", "Hasenfuß"];
    case 983:
      return ["Siegeswille", "Feldherr", "Erzwinger"];
    case 984:
      return ["Paläosynthese", "Robustheit", "Speckschicht"];
    case 985:
      return ["Paläosynthese", "Punk Rock", "Charmebolzen"];
    case 986:
      return ["Paläosynthese", "Sporenwirt", "Belebekraft"];
    case 987:
      return ["Paläosynthese", "Schwebe", "Rastlose Seele"];
    case 988:
      return ["Paläosynthese", "Dürre", "Facettenauge"];
    case 989:
      return ["Paläosynthese", "Magnetfalle", "Robustheit"];
    case 990:
      return ["Quantenantrieb", "Robustheit", "Rasanz"];
    case 991:
      return ["Quantenantrieb", "Übereifer", "Insomnia"];
    case 992:
      return ["Quantenantrieb", "Adrenalin", "Rohe Gewalt"];
    case 993:
      return ["Quantenantrieb", "Bedroher", "Anspannung"];
    case 994:
      return ["Quantenantrieb", "Schwebe", "Dürre"];
    case 995:
      return ["Quantenantrieb", "Robustheit", "Sandsturm"];
    case 996:
      return ["Thermowandel", "Eishaut", "Frostschicht"];
    case 997:
      return ["Thermowandel", "Eishaut", "Scharfkantig"];
    case 998:
      return ["Thermowandel", "Eishaut", "Scharfkantig"];
    case 999:
      return ["Hasenfuß", "Angsthase", "Mitnahme"];
    case 1000:
      return ["Goldkörper", "Mitnahme", "Majestät"];
    case 1001:
      return ["Unheilstafeln", "Viskosität", "Kloakensoße"];
    case 1002:
      return ["Unheilsschwert", "Scharfkantig", "Eishaut"];
    case 1003:
      return ["Unheilsgefäß", "Erzwinger", "Rohe Gewalt"];
    case 1004:
      return ["Unheilsjuwelen", "Schwebe", "Flammkörper"];
    case 1005:
      return ["Paläosynthese", "Schwebe", "Drachenkiefer"];
    case 1006:
      return ["Quantenantrieb", "Siegeswille", "Scharfkantig"];
    case 1007:
      return ["Orichalkum-Puls", "Rasanz", "Paläosynthese"];
    case 1008:
      return ["Hadronen-Motor", "Rasanz", "Schwebe"];
    case 1009:
      return ["Paläosynthese", "Hydration", "Bedroher"];
    case 1010:
      return ["Quantenantrieb", "Scharfkantig", "Redlichkeit"];
    case 1011:
      return ["Süßer Nektar", "Völlerei", "Klebekörper"];
    case 1012:
      return ["Gastlichkeit", "Hitzeschutz", "Tastfluch"];
    case 1013:
      return ["Gastlichkeit", "Hitzeschutz", "Tastfluch"];
    case 1014:
      return ["Giftkette", "Wachhund", "Rohe Gewalt"];
    case 1015:
      return ["Giftkette", "Schnüffler", "Vorahnung"];
    case 1016:
      return ["Giftkette", "Techniker", "Hochmut"];
    case 1017:
      return ["Siegeswille", "Überbrückung", "Robustheit"];
    case 1018:
      return ["Zähigkeit", "Stahlrückgrat", "Robustheit"];
    case 1019:
      return ["Süßer Nektar", "Belebekraft", "Klebekörper"];
    case 1020:
      return ["Paläosynthese", "Bedroher", "Magmapanzer"];
    case 1021:
      return ["Paläosynthese", "Blitzfänger", "Voltabsorber"];
    case 1022:
      return ["Quantenantrieb", "Rohe Gewalt", "Scharfkantig"];
    case 1023:
      return ["Quantenantrieb", "Redlichkeit", "Scharfkantig"];
    case 1024:
      return ["Tera-Wandel", "Tera-Panzer", "Teraforming Null"];
    case 1025:
      return ["Giftpuppenspiel", "Giftbelag", "Giftdorn"];

      
    case 10001:
      return["Erzwinger", "Schwebe", "Synchro"];
    case 10002:
      return["Erzwinger", "Schwebe", "Synchro"];
    case 10003:
      return["Erzwinger", "Schwebe", "Synchro"];
    case 10004:
      return ["Vorahnung", "Partikelschutz", "Sandschleier"];
    case 10005:
      return ["Vorahnung", "Partikelschutz", "Robustheit"];
    case 10006:
      return ["Innere Kraft", "Edelmut", "Reiche Ernte"];
    case 10007:
      return ["Erzwinger", "Anspannung", "Schwebe"];
    case 10008:
      return ["Hitzewahn", "Schwebe", "Flammkörper"];
    case 10009:
      return ["Hydration", "Schwebe", "H2O-Absorber"];
    case 10010:
      return ["Frostschicht", "Schwebe", "Immunität"];
    case 10011:
      return ["Windkraft", "Schwebe", "Blitzableiter"];
    case 10012:
      return ["Vegetarier", "Schwebe", "Scharfkantig"];
    case 10013:
      return ["Prognose", "Schwebe", "Flammkörper"];
    case 10014:
      return ["Prognose", "Schwebe", "Regengenuss"];
    case 10015:
      return ["Prognose", "Schwebe", "Eishaut"];
    case 10016:
      return ["Achtlos", "Wassertempo", "Hasenfuß"];
    case 10017:
      return ["Felskern", "Trance-Modus", "Robustheit"];
    case 10018:
      return ["Edelmut", "Tänzer", "Plätscherstimme"];
    case 10019:
      return ["Erzwinger", "Siegeswille", "Belebekraft"];
    case 10020:
      return ["Erzwinger", "Siegeswille", "Voltabsorber"];
    case 10021:
      return ["Erzwinger", "Siegeswille", "Bedroher"];
    case 10022:
      return ["Erzwinger", "Eishaut", "Teravolt"];
    case 10023:
      return ["Erzwinger", "Eishaut", "Teravolt"];
    case 10024:
      return ["Redlichkeit", "Scharfkantig", "Reitgespann"];
    case 10025:
      return ["Unbeugsamkeit", "Vorahnung", "Vorwarnung"];
    case 10026:
      return ["Schildlos", "Scharfkantig", "Taktikwechsel"];
    case 10027:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 10028:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 10029:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 10030:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 10031:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 10032:
      return ["Reiche Ernte", "Insomnia", "Anspannung"];
    case 10033:
      return["Notdünger", "Speckschicht", "Pflanzengabe"];
    case 10034:
      return["Großbrand", "Solarkraft", "Krallenwucht"];
    case 10035:
      return["Großbrand", "Solarkraft", "Dürre"];
    case 10036:
      return["Sturzbach", "Megawumme", "Wassertempo"];
    case 10037:
      return["Geistiges Auge", "Magieschild", "Erfassen"];
    case 10038:
      return["Wegsperre", "Bedroher", "Phantomschutz"];
    case 10039:
      return["Frühwecker", "Rauflust", "Familienbande"];
    case 10040:
      return["Zenithaut", "Hochmut", "Titankiefer"];

      
    case 10041:
      return["Bedroher", "Überbrückung", "Hochmut"];
    case 10042:
      return["Steinhaupt", "Krallenwucht", "Erzwinger"];
    case 10043:
      return["Erzwinger", "Anspannung", "Felsenfest"];
    case 10044:
      return["Erzwinger", "Insomnia", "Schwebe"];
    case 10045:
      return["Überbrückung", "Plus", "Erleuchtung"];
    case 10046:
      return["Hexaplaga", "Techniker", "Scherenmacht"];
    case 10047:
      return["Hexaplaga", "Wertelink", "Hochmut"];
    case 10048:
      return["Feuerfänger", "Bedroher", "Solarkraft"];
    case 10049:
      return["Sandsturm", "Kampfpanzer", "Anspannung"];
    case 10050:
      return["Eisenfaust", "Achtlos", "Temposchub"];
    case 10051:
      return["Synchro", "Feenschicht", "Telepathie"];
    case 10052:
      return["Scherenmacht", "Rohe Gewalt", "Kraftkoloss"];
    case 10053:
      return["Robustheit", "Filter", "Rohe Gewalt"];
    case 10054:
      return["Schildlos", "Telepathie", "Mentalkraft"];
    case 10055:
      return["Statik", "Blitzfänger", "Fellkleid"];
    case 10056:
      return["Schwebe", "Strolch", "Tastfluch"];
    case 10057:
      return["Magiespiegel", "Glückspilz", "Redlichkeit"];
    case 10058:
      return["Scharfkantig", "Rauhaut", "Titankiefer"];
    case 10059:
      return["Anpassung", "Redlichkeit", "Telepathie"];
    case 10060:
      return["Schneemantel", "Schneeschauer", "Eishaut"];
    case 10061:
      return ["Blütenhülle", "Symbiose", "Schwebe"];
    case 10062:
      return["Schwebe", "Magieschild", "Reitgespann"];
    case 10063:
      return["Schwebe", "Magieschild", "Reitgespann"];
    case 10064:
      return["Sturzbach", "Wassertempo", "Rohe Gewalt"];
    case 10065:
      return["Notdünger", "Blitzfänger", "Entlastung"];
    case 10066:
      return["Strolch", "Magiespiegel", "Adlerauge"];
    case 10067:
      return["Innere Kraft", "Flauschigkeit", "Feenschicht"];
    case 10068:
      return["Scharfkantig", "Redlichkeit", "Konzentrator"];
    case 10069:
      return ["Heilherz", "Belebekraft", "Edelmut"];
    case 10070:
      return["Wassertempo", "Titankiefer", "Temposchub"];
    case 10071:
      return["Dösigkeit", "Panzerhaut", "Belebekraft"];
    case 10072:
      return["Robustheit", "Sandscharrer", "Rohe Gewalt"];
    case 10073:
      return["Adlerauge", "Schildlos", "Taumelschritt"];
    case 10074:
      return["Titankiefer", "Eishaut", "Frostschicht"];
    case 10075:
      return ["Neutraltorso", "Schwebe", "Magiespiegel"];

      
    case 10076:
      return["Neutraltorso", "Leichtmetall", "Krallenwucht"];
    case 10077:
      return["Urmeer", "Erzwinger", "Aquahülle"];
    case 10078:
      return["Endland", "Erzwinger", "Solarkraft"];
    case 10079:
      return["Delta-Wind", "Erzwinger", "Zenithaut"];
    case 10080:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10081:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10082:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10083:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10084:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10085:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10086:
      return ["Zauberer", "Schwebe", "Erzwinger"];
    case 10087:
      return["Rohe Gewalt", "Kurzschluss", "Magmapanzer"];
    case 10088:
      return["Charmebolzen", "Rauflust", "Flexibilität"];
    case 10089:
      return["Zenithaut", "Hochmut", "Orkanschwingen"];
    case 10090:
      return["Anpassung", "Superschütze", "Facettenauge"];
    case 10091:
      return["Übereifer", "Speckschicht", "Völlerei"];
    case 10092:
      return["Übereifer", "Speckschicht", "Völlerei"];
    case 10093:
      return["Übereifer", "Speckschicht", "Völlerei"];
    case 10094:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10095:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10096:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10097:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10098:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10099:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10100:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10101:
      return["Schneescharrer", "Schneemantel", "Panzerhaut"];
    case 10102:
      return["Schneescharrer", "Schneemantel", "Panzerhaut"];
    case 10103:
      return ["Schneemantel", "Schneeschauer", "Fellkleid"];
    case 10104:
      return ["Schneemantel", "Schneeschauer", "Fellkleid"];
    case 10105:
      return["Sandschleier", "Sandscharrer", "Lockenkopf"];
    case 10106:
      return["Sandschleier", "Sandscharrer", "Lockenkopf"];
    case 10107:
      return["Mitnahme", "Techniker", "Hasenfuß"];
    case 10108:
      return["Fellkleid", "Techniker", "Hasenfuß"];
    case 10109:
      return ["Magnetfalle", "Robustheit", "Elektrohaut"];
    case 10110:
      return ["Magnetfalle", "Robustheit", "Elektrohaut"];
    case 10111:
      return ["Magnetfalle", "Robustheit", "Elektrohaut"];
    case 10112:
      return ["Duftnote", "Giftgriff", "Chemiekraft"];
    case 10113:
      return ["Duftnote", "Giftgriff", "Chemiekraft"];
    case 10114:
      return ["Chlorophyll", "Schnüffler", "Reiche Ernte"];
    case 10115:
      return ["Steinhaupt", "Blitzfänger", "Tänzer"];
    case 10116:
      return ["Sturzbach", "Wandlungskunst", "Freundschaftsakt"];
    case 10117:
      return ["Sturzbach", "Wandlungskunst", "Freundschaftsakt"];
    case 10118:
      return ["Aura-Umkehr", "Scharwandel", "Erzwinger"];
    case 10119:
      return ["Aura-Umkehr", "Scharwandel", "Erzwinger"];
    case 10120:
      return ["Aura-Umkehr", "Bedroher", "Erzwinger"];
    case 10121:
      return ["Beschattung", "Titankiefer", "Anpassung"];
    case 10122:
      return ["Hexaplaga", "Schwebe", "Batterie"];
    case 10123:
      return ["Tänzer", "Adlerauge", "Taumelschritt"];
    case 10124:
      return ["Tänzer", "Adlerauge", "Taumelschritt"];
    case 10125:
      return ["Tänzer", "Adlerauge", "Taumelschritt"];
    case 10126:
      return ["Adlerauge", "Schildlos", "Munterkeit"];
    case 10127:
      return ["Fischschwarm", "Wassertempo", "Bedroher"];
    case 10128:
      return ["Floraschild", "Umkehrung", "Chlorophyll"];
    case 10129:
      return ["Korrosion", "Dösigkeit", "Rivalität"];
    case 10130:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10131:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10132:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10133:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10134:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10135:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10136:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10137:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10138:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10139:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10140:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10141:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10142:
      return ["Limitschild", "Felskern", "Bruchrüstung"];
    case 10143:
      return ["Kostümspuk", "Bedroher", "Tastfluch"];
    case 10144:
      return ["Kostümspuk", "Bedroher", "Tastfluch"];
    case 10145:
      return ["Kostümspuk", "Bedroher", "Tastfluch"];
    case 10146:
      return ["Kugelsicher", "Lärmschutz", "Partikelschutz"];
    case 10147:
      return ["Seelenherz", "Robustheit", "Feenschicht"];
    case 10148:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10149:
      return ["Steinhaupt", "Blitzfänger", "Tänzer"];
    case 10150:
      return ["Schwebe", "Puderabwehr", "Honigmaul"];
    case 10151:
      return ["Felsenfest", "Gleichmut", "Wachhund"];
    case 10152:
      return ["Felsenfest", "Munterkeit", "Krallenwucht"];
    case 10153:
      return ["Wasserblase", "H2O-Absorber", "Heilherz"];
    case 10154:
      return ["Eisenstachel", "Blitzfänger", "Robustheit"];
    case 10155:
      return ["Prismarüstung", "Erzwinger", "Metallprotektor"];
    case 10156:
      return ["Prismarüstung", "Erzwinger", "Phantomschutz"];
    case 10157:
      return ["Prismarüstung", "Erzwinger", "Zerebralmacht"];
    case 10158:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10159:
      return["Anpassung", "Angsthase", "Vorahnung"];
    case 10160:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10161:
      return ["Mitnahme", "Krallenwucht", "Anspannung"];
    case 10162:
      return ["Angsthase", "Pastellhülle", "Vorahnung"];
    case 10163:
      return ["Reitgespann", "Pastellhülle", "Vorahnung"];
    case 10164:
      return ["Völlerei", "Gleichmut", "Belebekraft"];
    case 10165:
      return ["Schnellschuss", "Gleichmut", "Belebekraft"];
    case 10166:
      return ["Adlerauge", "Felsenfest", "Rauflust"];
    case 10167:
      return ["Schwebe", "Reaktionsgas", "Nebel-Erzeuger"];
    case 10168:
      return ["Munterkeit", "Hemmungslos", "Eishaut"];
    case 10169:
      return ["Erzwinger", "Schneemantel", "Unbeugsamkeit"];
    case 10170:
      return ["Erzwinger", "Blitzfänger", "Siegeswille"];
    case 10171:
      return ["Erzwinger", "Flammkörper", "Wutausbruch"];
    case 10172:
      return ["Kuriose Arznei", "Gleichmut", "Belebekraft"];
    case 10173:
      return ["Übereifer", "Bruchrüstung", "Tastfluch"];
    case 10174:
      return ["Mitnahme", "Völlerei", "Rasanz"];
    case 10175:
      return ["Mitnahme", "Völlerei", "Rasanz"];
    case 10176:
      return ["Übereifer", "Konzentrator", "Rasanz"];
    case 10177:
      return ["Rohe Gewalt", "Affenfokus", "Trance-Modus"];
    case 10178:
      return ["Eishaut", "Telepathie", "Trance-Modus"];
    case 10179:
      return ["Mumia", "Rastlose Seele", "Schwebe"];
    case 10180:
      return ["Mimese", "Titankiefer", "Flexibilität"];
    case 10181:
      return ["Aura-Umkehr", "Scharwandel", "Erzwinger"];
    case 10182:
      return ["Würggeschoss", "Adlerauge", "Brustbieter"];
    case 10183:
      return ["Würggeschoss", "Adlerauge", "Brustbieter"];
    case 10184:
      return ["Punk Rock", "Techniker", "Minus"];
    case 10185:
      return ["Wassertempo", "Eishaut", "Frostschicht"];
    case 10186:
      return ["Synchro", "Psycho-Erzeuger", "Gleichmut"];
    case 10187:
      return ["Heißhunger", "Backentaschen", "Statik"];
    case 10188:
      return ["Kühnes Schwert", "Erzwinger", "Redlichkeit"];
    case 10189:
      return ["Wackerer Schild", "Erzwinger", "Redlichkeit"];
    case 10190:
      return ["Erzwinger", "Schwebe", "Bedroher"];
    case 10191:
      return ["Verborgene Faust", "Techniker", "Eisenfaust"];
    case 10192:
      return ["Floraschild", "Krallenwucht", "Rohe Gewalt"];
    case 10193:
      return ["Anspannung", "Reitgespann", "Majestät"];
    case 10194:
      return ["Anspannung", "Reitgespann", "Majestät"];
    case 10195:
      return["Notdünger", "Chlorophyll", "Pflanzengabe"];
    case 10196:
      return["Großbrand", "Solarkraft", "Feuerfänger"];
    case 10197:
      return["Sturzbach", "Regengenuss", "Wassertempo"];
    case 10198:
      return ["Facettenauge", "Aufwertung", "Hexaplaga"];
    case 10199:
      return["Statik", "Blitzfänger", "Backentaschen"];
    case 10200:
      return ["Mitnahme", "Techniker", "Krallenwucht"];
    case 10201:
      return ["Adrenalin", "Schildlos", "Kraftkoloss"];
    case 10202:
      return ["Schwebe", "Bedroher", "Phantomschutz"];
    case 10203:
      return ["Scherenmacht", "Panzerhaut", "Rohe Gewalt"];
    case 10204:
      return ["Speckschicht", "Panzerhaut", "Hydration"];
    case 10205:
      return ["Anpassung", "Angsthase", "Verahnung"];
    case 10206:
      return ["Immunität", "Speckschicht", "Völlerei"];
    case 10207:
      return ["Duftnote", "Bruchrüstung", "Finalschlag"];
    case 10208:
      return ["Magnetfalle", "Eisenfaust", "Robustheit"];
    case 10209:
      return ["Notdünger", "Gras-Erzeuger", "Eisenfaust"];
    case 10210:
      return ["Großbrand", "Libero", "Temposchub"];
    case 10211:
      return ["Sturzbach", "Superschütze", "Hydration"];
    case 10212:
      return ["Adlerauge", "Anspannung", "Spiegelrüstung"];
    case 10213:
      return ["Hexaplaga", "Schnüffler", "Telepathie"];
    case 10214:
      return ["Titankiefer", "Panzerhaut", "Wassertempo"];
    case 10215:
      return ["Dampantrieb", "Feuerfänger", "Feuerfänger"];
    case 10216:
      return ["Heranreifen", "Völlerei", "Übereifer"];
    case 10217:
      return ["Heranreifen", "Völlerei", "Speckschicht"];
    case 10218:
      return ["Sandspeier", "Expidermis", "Sandschleier"];
    case 10219:
      return ["Punk Rock", "Techniker", "Plus"];
    case 10220:
      return ["Feuerfänger", "Pulverrauch", "Flammkörper"];
    case 10221:
      return ["Heilherz", "Vorahnung", "Magiespiegel"];
    case 10222:
      return ["Strolch", "Schnüffler", "Langfinger"];
    case 10223:
      return ["Zuckerhülle", "Dufthülle", "Heilherz"];
    case 10224:
      return ["Rohe Gewalt", "Schwermetall", "Robustheit"];
    case 10225:
      return ["Leichtmetall", "Stahlrückgrat", "Robustheit"];
    case 10226:
      return ["Verborgene Faust", "Techniker", "Eisenfaust"];
    case 10227:
      return ["Verborgene Faust", "Techniker", "Eisenfaust"];
    case 10228:
      return ["Punk Rock", "Techniker", "Minus"];
    case 10229:
      return ["Feuerfänger", "Wachhund", "Steinhaupt"];
    case 10230:
      return ["Feuerfänger", "Wachhund", "Steinhaupt"];
    case 10231:
      return ["Lärmschutz", "Statik", "Finalschlag"];
    case 10232:
      return ["Lärmschutz", "Statik", "Finalschlag"];
    case 10233:
      return ["Großbrand", "Feuerfänger", "Schnüffler"];
    case 10234:
      return ["Giftdorn", "Wassertempo", "Bedroher"];
    case 10235:
      return ["Adlerauge", "Giftgriff", "Langfinger"];
    case 10236:
      return ["Sturzbach", "Panzerhaut", "Scharfkantig"];
    case 10237:
      return ["Chlorophyll", "Übereifer", "Floraschild"];
    case 10238:
      return ["Trugbild", "Adrenalin", "Strolch"];
    case 10239:
      return ["Trugbild", "Adrenalin", "Strolch"];
    case 10240:
      return ["Rohe Gewalt", "Siegeswille", "Aufwertung"];
    case 10241:
      return ["Vegetarier", "Panzerhaut", "Viskosität"];
    case 10242:
      return ["Vegetarier", "Panzerhaut", "Viskosität"];
    case 10243:
      return ["Titankiefer", "Eishaut", "Robustheit"];
    case 10244:
      return ["Notdünger", "Langstrecke", "Rauflust"];
    case 10245:
      return["Erzwinger", "Bedroher", "Zeitspiel"];
    case 10246:
      return["Erzwinger", "Bedroher", "Anspannung"];
    case 10247:
      return ["Achtlos", "Wassertempo", "Hasenfuß"];
    case 10248:
      return ["Wassertempo", "Anspannung", "Überbrückung"];
    case 10249:
      return ["Heilherz", "Charmebolzen", "Partikelschutz"];
    case 10250:
      return ["Bedroher", "Kurzschluss", "Wiederkäuer"];
    case 10251:
      return ["Bedroher", "Kurzschluss", "Wiederkäuer"];
    case 10252:
      return ["Bedroher", "Kurzschluss", "Wiederkäuer"];
    case 10253:
      return ["Giftdorn", "H2O-Absorber", "Unkenntnis"];
    case 10254:
      return ["Dufthülle", "Völlerei", "Speckschicht"];
    case 10255:
      return ["Edelmut", "Angsthase", "Hasenfuß"];
    case 10256:
      return ["Superwechsel", "Wassertempo", "Siegeswille"];
    case 10257:
      return ["Backentaschen", "Techniker", "Freundeshut"];
    case 10258:
      return ["Kommandant", "Sturmsog", "Wassertempo"];
    case 10259:
      return ["Kommandant", "Sturmsog", "Wassertempo"];
    case 10260:
      return ["Bedroher", "Übereifer", "Rohe Gewalt"];
    case 10261:
      return ["Bedroher", "Übereifer", "Rohe Gewalt"];
    case 10262:
      return ["Bedroher", "Übereifer", "Rohe Gewalt"];
    case 10263:
      return ["Hasenfuß", "Angsthase", "Mitnahme"];
    case 10264:
      return ["Orichalkum-Puls", "Rasanz", "Paläosynthese"];
    case 10265:
      return ["Orichalkum-Puls", "Rasanz", "Paläosynthese"];
    case 10266:
      return ["Orichalkum-Puls", "Rasanz", "Paläosynthese"];
    case 10267:
      return ["Orichalkum-Puls", "Rasanz", "Paläosynthese"];
    case 10268:
      return ["Hadronen-Motor", "Rasanz", "Schwebe"];
    case 10269:
      return ["Hadronen-Motor", "Rasanz", "Schwebe"];
    case 10270:
      return ["Hadronen-Motor", "Rasanz", "Schwebe"];
    case 10271:
      return ["Hadronen-Motor", "Rasanz", "Schwebe"];
    case 10272:
      return ["Adrenalin", "Geistiges Auge", "Kugelsicher"];
    case 10273:
      return ["Siegeswille", "Überbrückung", "Robustheit"];
    case 10274:
      return ["Siegeswille", "Überbrückung", "Robustheit"];
    case 10275:
      return ["Siegeswille", "Überbrückung", "Robustheit"];
    case 10276:
      return ["Tera-Wandel", "Tera-Panzer", "Teraforming Null"];
    case 10277:
      return ["Tera-Wandel", "Tera-Panzer", "Teraforming Null"];


      
    case 90001:
      return ["Glaskörper", "Bruchrüstung", "Flammkörper"];
    case 90002:
      return ["Tastfluch", "Tollpatsch", "Angsthase"];
    case 90003:
      return ["Angsthase", "Tastfluch", "Bedroher"];

    
    default:
      // Standardfall für nicht erfasste IDs
      return [`Pokemon ${pokemonID}`, "Leer", "Leer"];
  }
}

export function getAbilityDescription(Name){
  switch(Name){
    case "Achtlos":
        return "+50% Schaden für Attacken mit Rückstoß oder negativen Effekten.";

    case "Adlerauge":
        return "GENA kann nicht sinken und GENA-Proben nicht erschwert werden. +1 automatischer Erfolg auf Sinnesschärfe mit Augen.";

    case "Adrenalin":
        return "Solange das Pokemon einen Status-Effekt hat: ANG x2 und es ist sehr aggressiv.";

    case "Affenfokus":
        return "Das Pokemon hat eine klare Lieblings-Attacke, die es immer einsetzen will und die automatisch +2 Erfolge bei GENA-Proben hat.";

    case "Alpha-System":
        return "Das Pokemon kann seinen Typ mittels Discs ändern.";

    case "Alptraum":
        return "Alle schlafenden Pokemon in Reichweite (10x LV Meter) verlieren jede Runde 10% max KP und haben furchtbare Alpträume.";

    case "Analyse":
        return "+1 automatischer GENA-Erfolg gegen Ziele, die diese Runde bereits agiert haben.";

    case "Angsthase":
      return "Nach jeder eigenen Runde erhält das Pokemon eine zusätzliche Bewegung, die es aber nur nutzen kann, um sich von einem Gegner wegzubewegen.";

    case "Anpassung":
        return "STAB-Attacken haben +2W6 Grundschaden.";

    case "Anspannung":
        return "+1 automatischer Erfolg auf Einschüchtern. Gegner können nichts essen.";

    case "Apport":
        return "+2 automatische Erfolge auf Suchen von runden Gegenständen oder von Objekten, die man zuvor besessen hat.";

    case "Aquahülle":
        return "Das Pokemon ist immun gegen Verbrennung und sondert durchgehend trinkbares Wasser ab.";

    case "Aufwertung":
        return "Nicht sehr effektive Attacken werden nicht halbiert (oder halbiert statt geviertelt).";

    case "Aura-Umkehr":
        return "In der Nähe des Pokemon fühlen sich gute Lebewesen gezwungen, bösartig zu handeln, und böse, gutartig zu handeln.";

    case "Ausweglos":
        return "Wenn ein Ziel versucht, sich aus der Nahkampf-Reichweite des Pokemon zu bewegen, kann das Pokemon sofort eine Nahkampf-Attacke als zusätzliche Aktion gegen es ausführen.";

    case "Backentaschen":
        return "Das Pokemon kann zwei Items gleichzeitig tragen, solange beide in je eine Backentasche passen.";

    case "Batterie":
        return "Immer, wenn das Pokemon eine Elektro-Attacke einsetzt: Es und andere Elektro-Pokemon in der Nähe (0.5xLV Meter) erhalten +LV SP ANG.";

    case "Bedroher":
        return "Wenn Gegner das Pokemon wahrnehmen: Es kann eine Einschüchtern-Probe würfeln. Bei Erfolg: Die Gegner verlieren LV ANG.";

    case "Belebekraft":
        return "Das Pokemon regeneriert passiv jede Runde (alle 10 Sekunden) 5% max KP. Eine Nacht Schlaf heilt eine seiner Wunden.";

    case "Beschattung":
        return "Wenn das Pokemon ein Ziel trifft, das es nicht bemerkt, fügt es doppelten Schaden zu.";

    case "Bestien-Boost":
        return "Am Ende jeder Runde: Das Pokemon erhält +LV ANG und SP ANG.";

    case "Blitzfänger":
        return "Elektro-Attacken treffen das Pokemon automatisch, auch, wenn eigentlich ein anderes Pokemon getroffen oder sie verfehlen würde.";

    case "Blütenhülle":
        return "Das Pokemon und alle Pflanzen-Pokemon in der Nähe sind immun gegen Statuswert-Senkung. Das Pokemon riecht sehr stark nach Blumen und ist leicht wahrzunehmen. -2 Erfolge auf Schleichen/Verstecken.";

    case "Bodenschmaus":
        return "Attacken, die aus Erd- oder Gesteinsprojektilen bestehen (z.B. Steinwurf, Lehmschelle) heilen, statt Schaden zuzufügen.";

    case "Bruchrüstung":
        return "Physischer Schaden zerstört Teile des Pokemon, macht es leichter und senkt VERT um LV, während die erwürfelte Initiative um LV erhöht wird.";

    case "Brustbieter":
        return "Das Pokemon ist extrem mutig. Es ist immun gegen Einschüchtern und sein ANG kann nicht gesenkt werden. Es kann seine Reaktion nutzen, um eine Attacke, die ein anderes Ziel treffen würde, mit seinem Körper abzufangen.";

    case "Buntkörper":
        return "Das Pokemon ist sehr bunt und abschreckend anzusehen. +1 automatischer Erfolg auf Einschüchtern, -5 auf Schleichen/Verstecken. Gegner müssen das Pokemon als primäres Angriffsziel wählen, falls möglich, aber GENA-Proben gegen es erhalten +2 Würfel.";

    case "Charmebolzen":
        return "+1 automatischer Erfolg auf Betören. Das Pokemon kann seine Aktion nutzen, um eine Betören-Probe gegen einen Gegner zu versuchen und ihn zu seinem Freund zu machen.";

    case "Chemiekraft":
        return "Kann Körper besiegter Pokemon assimilieren, um eine zufällige ihrer Fähigkeiten zu kopieren. Wird nach einer Stunde ausgeschieden.";

    case "Chlorophyll":
        return "Kann sich von Sonne ernähren. Bei Sonnenschein: Gewürfelte Initiative + LV";

    case "Dampfantrieb":
        return "Kann sich von Feuer und Wasser ernähren. Wenn es von einer Feuer-/Wasser-Attacke getroffen wird: Gewürfelte INIT + 2xLV.";

    case "Dauerschlaf":
        return "Das Pokemon schläft durchgehend und kann nicht aufwachen. Es kann im Schlaf agieren, denken, sich bewegen und angreifen. Es regeneriert nach vier Stunden Ruhe seine vollen KP.";

    case "Delta-Wind":
        return "Erzeugt durchgehend heftige Winde um sich herum, die alles andere Wetter überschreiben. Ziele müssen je nach ihrer Größe und ihrem Gewicht jede Runde KÖ-Proben bestehen oder werden weggeweht oder bewegt.";

    case "Doppelgänger":
        return "Das Pokemon kann sich als Reaktion in eine Kopie eines Ziels verwandeln. Es kopiert so dessen Attacken, aber NICHT Statuswerte oder Buffs.";

    case "Dösigkeit":
        return "Das Pokemon ist immun gegen jede Form von Ablenkung (Betören, Einschüchtern, Aggro ziehen usw.). Das schließt auch Attacken wie Folterknecht und Verhöhner ein.";

    case "Download":
        return "TMs können auf das Pokemon gespielt werden. Das Pokemon lernt so eine beliebige Attacke, egal, ob es sie sonst lernen könnte, aber die TM wird zerstört.";

    case "Drachenkiefer":
        return "Alle Biss-Attacken des Pokemon gelten zusätzlich als Drachen-Attacken und haben +4W6 Grundschaden.";

    case "Dufthülle":
        return "Das Pokemon riecht extrem stark. Ziele in der Nähe wachen sofort auf und können nicht einschlafen, da der Geruch zu penetrant ist. Es kann sich niemals verstecken.";

    case "Duftnote":
        return "Das Pokemon stinkt erbärmlich. Ziele müssen eine Widerstand-Probe bestehen, um es mit einer Attacke mit dem Mund anzugreifen (Biss, Schlecker etc.). 3+ Erfolge mit einer Kontakt-Attacke lassen das Ziel zurückschrecken. Es kann sich niemals verstecken.";

    case "Duftschwade":
        return "Das Pokemon sondert seltsame Gerüche ab, die alle, die sie einatmen, benebeln. Jedes Ziel in der Nähe (LV Meter) muss nach jeder seiner Runden eine Widerstand-Probe schaffen oder wird verwirrt.";

    case "Dunkelaura":
        return "Das Pokemon gibt durchgehend starke negative Schwingungen ab. Alle Ziele in seiner Nähe (10xLV Meter) fühlen sich gezwungen, destruktive Aktionen durchzuführen und können nicht zwischen Freund und Feind unterscheiden. Unlicht-Attacken des Pokemon fügen doppelten Schaden zu.";

    case "Dunkles Wiehern":
        return "Immer, wenn das Pokemon ein Ziel besiegt, stößt es ein gruseliges Wiehern aus. Alle Ziele in Hörweite müssen eine Widerstand-Probe bestehen oder ihre nächste Aktion nutzen, um möglichst weit vom Anwender zu fliehen.";

    case "Dürre":
        return "Das Pokemon stößt abartig viel Hitze aus und erzeugt trockene Luftströme um sich. Ist es mindestens eine Stunde draußen, verändert es passiv das Wetter und sorgt für Sonnenschein. In seiner Nähe funktionieren Attacken wie Regentanz nicht.";

    case "Dynamo":
        return "Immer, wenn das Pokemon von einer Attacke getroffen wird, wird die nächste Elektro-Attacke, die es einsetzt, aufgeladen. Ihr Schaden wird um den Schaden, den dieses Pokemon genommen hat, erhöht.";

    case "Edelmut":
        return "Zusatzeffekte von Attacken passieren bei einem Erfolg weniger.";

    case "Eisenfaust":
        return "Die Fäuste des Pokemon sind extrem hart und können fast unmöglich Schaden nehmen. Schlag-Attacken des Pokemon richten +50% Schaden an.";

    case "Eisenstachel":
        return "Ziele, die das Pokemon berühren, verlieren 10% ihrer max KP. Stahl- und Gestein-Pokemon sind immun.";

    case "Eisflügelstaub":
        return "Das Pokemon ist ständig von dünnem Schneepuder umgeben. Es nimmt halben Schaden von Feuer-Attacken und kann nicht einfrieren. In seiner direkten Nähe ist es ständig unangenehm kalt.";

    case "Eishaut":
        return "Die Oberfläche des Pokemon ist extrem kalt. Eis-Attacken und Hagel heilen es und es ist immun gegen Einfrieren, aber es nimmt 50% mehr Schaden von Feuer-Attacken.";

    case "Elektro-Erzeuger":
        return "Um das Pokemon herum ist durchgehend ein Elektrofeld, das sich immer mit dem Pokemon mitbewegt.";

    case "Elektrohaut":
        return "Das Pokemon steht durchgehend unter elektrischer Spannung. Von ihm gehen kleine Blitze aus und es zu berühren kann Stromschläge bedeuten. Alle physischen Nahkampf-Attacken des Pokemon sind zusätzlich Typ Elektro.";

    case "Endland":
        return "Von dem Pokemon gehen extrem starke und heiße Winde aus, die alles um es herum verbrennen und wegwehen. Jedes Ziel, das sich auf 10xLV Meter nähert, wird verbrannt. Es herrscht ständig Sonnenschein, der nicht geändert werden kann. Wasser- und Eis-Attacken, die in die Nähe kommen, verdampfen wirkungslos.";

    case "Entlastung":
        return "Wenn das Pokemon leichter wird (z.B., weil es aufhört, einen schweren Gegenstand zu tragen), verdoppelt sich seine INIT für 5 Minuten.";

    case "Erfassen":
        return "Das Pokemon kann eine Aktion nutzen, um einen Gegner genau zu analysieren. Es erfährt so, welche Fähigkeiten und Attacken das Pokemon beherrscht und auch, welche Attacke es (Stand jetzt) als nächstes einsetzen wird.";

    case "Erinnerungskraft":
        return "Wenn das Pokemon einen Gegenstand berührt, der einen großen emotionalen Wert für es hat, erhöht sich für einen Kampf einer seiner Werte nach Wahl.";

    case "Erleuchtung":
        return "Von dem Pokemon geht starkes Licht aus, wie von einer sehr starken Laterne. Viele Pokemon finden das Licht sehr anziehend. Das Licht kann auch gedimmt, aber nicht ganz ausgeschaltet werden.";

    case "Erzwinger":
        return "Ziele müssen eine Widerstand-Probe bestehen, um das Pokemon angreifen zu können; anderenfalls sind sie starr vor Angst.";

    case "Expidermis":
        return "Das Pokemon kann eine Aktion oder Reaktion nutzen, um sich zu häuten. So heilt es sich von allen Statuseffekten sowie 50% seiner max KP. Einmal pro Tag!";

    case "Facettenauge":
        return "GENA-Proben des Pokemon erhalten +1 automatischen Erfolg.";

    case "Familienbande":
        return "Die Kinder des Pokemon sind sehr wehrhaft und kämpfen mit ihm zusammen. Sie schlpfen mit Lv 10.";

    case "Farbwechsel":
        return "Das Pokemon kann seine Farbe beliebig ändern und sogar unsichtbar werden. Von seiner Farbe ist sein aktueller Typ abhängig. Unsichtbar ist es typenlos.";

    case "Feenaura":
        return "Das Pokemon gibt durchgehend starke positive Schwingungen ab. Alle Ziele in seiner Nähe (10xLV Meter) fühlen sich gezwungen, positive, helfende und nicht schädliche Aktionen durchzuführen und können nicht zwischen Freund und Feind unterscheiden. Feen-Attacken des Pokemon fügen doppelten Schaden zu.";

    case "Feenschicht":
        return "Das Pokemon ist ständig von einer dünnen Schicht Feenstaub umgeben, die es ihm erlaubt, für kurze Zeit am Stück zu schweben und es immun gegen alle Statuseffekte macht.";

    case "Feldherr":
        return "Das Pokemon kann schwächere Pokemon als seine Soldaten rekrutieren und sie befehligen. Es nimmt effektiv selbst die Rolle eines Trainers an und muss seine Aktion nutzen, um seine bis zu 10% LV Soldaten zu kommandieren.";

    case "Fellkleid":
        return "Das Fell des Pokemon ist extrem dick und dicht. Es ist nahezu immun gegen Kälte und kann nicht einfrieren. Physische Nahkampf-Angriffe fügen ihm nur halben Schaden zu (aufgerundet). Das Fell kann verlorengehen, z.B. indem man das Pokemon schert.";

    case "Felsenfest":
        return "Wenn das Pokemon zurückschrecken würde: Stattdessen erhält es sofort eine zusätzliche Aktion und seine Initiative verdoppelt sich. Dieser Effekt kann einmal pro Kampf mit einer Einschüchtern-Probe von einem Verbündeten ausgelöst werden.";

    case "Felskern":
        return "Das Pokemon ist sehr hart und robust. Die Grundstärke sehr effektiver Attacken ist um 2W6 verringert (auf ein Minimum von 1W6).";

    case "Feuchtigkeit":
        return "Das Pokemon sondert durchgehend feuchte Luft ab, um es herrscht starke Luftfeuchtigkeit. Feuer-Attacken in der Nähe (0.5xLV Meter) haben ihre Grundstärke um 2W6 verringert und Explosions-Attacken können in der Nähe nicht eingesetzt werden.";

    case "Feuerfänger":
        return "Feuer-Attacken fügen dem Pokemon keinen Schaden zu, sondern setzen stattdessen seinen Körper in einen für es harmlosen Brand. In diesem Zustand kann es jede Runde 2 Aktionen ausführen, muss aber dann beide für Feuer-Attacken nutzen. Solange es in diesem Zustand ist, ist es extrem wild und kampflustig. Wasser- und Eis-Attacken entfernen den Zustand, sonst hält er eine Minute (6 Runden) an.";

    case "Filter":
        return "Das Pokemon filtert Attacken, die es treffen würden, automatisch und lässt sehr effektive nicht richtig an sich ran. Die Grundstärke sehr effektiver Attacken ist um 2W6 verringert (auf ein Minimum von 1W6).";

    case "Finalschlag":
        return "Wenn das Pokemon bewusstlos wird, explodiert es automatisch und fügt jedem Ziel in seiner Nähe (0.5xLV Meter) 0.5xLV W6 Schaden zu. Dieser Effekt passiert immer und kann nicht manuell verhindert/abgeschaltet werden.";

    case "Fischschwarm":
        return "Pokemon dieser Spezies fühlen sich motiviert, an der Seite von anderen zu kämpfen und können gemeinsam stärkere Formen bilden.";

    case "Flammkörper":
        return "Der Körper des Pokemon ist extrem heiß. Bei Berührung jeder Art muss ein Ziel eine Widerstand-Probe bestehen oder wird verbrannt. Außerdem nimmt es halben Schaden von Eis-Attacken und kann nicht eingefroren werden.";

    case "Flauschigkeit":
        return "Physische Nahkampf-Attacken fügen halben Schaden zu, aber Feuer-Attacken fügen doppelten Schaden zu und verbrennen das Fell, sodass diese Fähigkeit verlorengeht.";

    case "Flexibilität":
        return "Das Pokemon ist extrem geschickt. +1 automatischen Erfolg auf Akrobatik und PA-Proben.";

    case "Floraschild":
        return "Im Sonnenschein ist das Pokemon sehr aktiv, voller Energie und immun gegen Statuseffekte.";

    case "Freundeshut":
        return "Das Pokemon kann seine Reaktion nutzen, um sich vor eine Attacke zu werfen, die sonst einen Verbündeten treffen würde. Es nimmt von dieser Attacke nur halben Schaden (aufgerundet).";

    case "Freundschaftsakt":
        return "Einmal pro Kampf, wenn es einen Gegner besiegt, erhält das Pokemon +1 Freundschaft.";

    case "Frostschicht":
        return "Die Oberfläche des Pokemon ist extrem kalt. Alle seine Attacken haben den zusätzlichen Typ Eis.";

    case "Frühwecker":
        return "Das Pokemon braucht nur 4 Stunden Schlaf pro Nacht. Im Kampf wacht es immer nach einer Runde auf.";

    case "Gastlichkeit":
        return "Das Pokemon kann eine Aktion nutzen, um die KP eines Verbündeten direkt neben sich um LVx2 zu heilen.";

    case "Gefühlswippe":
        return "Die Stimmung des Pokemon ändert sich ständig. Im Kampf erhöht sich zu Beginn jeder Runde ein zufälliger Wert um LV, aber es setzt jede Runde eine zufällige Attacke ein.";

    case "Geistiges Auge":
        return "Das Pokemon kann einmal am Tag eine Vision der Zukunft sehen. Es muss dazu eine bestimmte Frage stellen (z.B. was passieren würde, wenn man durch eine bestimmte Tür geht oder eine Höhle betritt) und erhält einen Flash, der mehrere Sekunden dieser möglichen Zukunft zeigt.";

    case "Giftbelag":
        return "Immer, wenn das Pokemon physischen Schaden nimmt, verteilt es um seine aktuelle Position herum Giftspitzen.";

    case "Giftdorn":
        return "Ziele, die das Pokemon berühren, müssen eine Widerstand-Probe würfeln oder werden vergiftet.";

    case "Giftgriff":
        return "Ziele, die von den Händen des Pokemon berührt werden, müssen eine Widerstand-Probe bestehen oder werden vergiftet.";

    case "Giftheilung":
        return "Gift heilt das Pokemon statt ihm zu schaden. Es kann sich von Gift ernähren.";

    case "Giftkette":
        return "Ziele, die von dem Pokemon mit einer physischen Attacke getroffen werden, werden schwer vergiftet.";

    case "Giftpuppenspiel":
        return "Alle Pokemon in der Nähe (10xLV Meter), die vergiftet werden, werden auch verwirrt und bleiben es, solange sie vergiftet sind.";

    case "Giftwahn":
        return "Solange das Pokemon vergiftet ist, fügt es doppelten Schaden mit physischen Nahkampf-Angriffen zu und ist extrem aggressiv.";

    case "Gleichmut":
        return "Das Pokemon kann nicht verwirrt oder dazu gebracht werden, etwas zu tun. Es ist immun gegen Effekte wie Zugabe und Verhöhner.";

    case "Glückspilz":
        return "Das Pokemon kann einmal pro Kampf und außerhalb von Kämpfen einmal pro Tag eine Probe wiederholen, als hätte es einen Glücks-Token eingesetzt.";

    case "Goldkörper":
        return "Das Pokemon sondert pro Tag Goldmünzen im Wert von 100xLV Pokedollar ab.";

    case "Gras-Erzeuger":
        return "Um das Pokemon herum ist durchgehend ein Grasfeld, das sich immer mit dem Pokemon mitbewegt.";

    case "Großbrand":
        return "Wenn das Pokemon wütend wird oder seine KP unter 25% fallen, beginnt es, durchgehend Feuer abzusondern. Seine Feuer-Attacken sind in diesem Zustand 50% stärker.";

    case "H2O-Absorber":
        return "Der Körper des Pokemon kann Wasser absorbieren. Es kann sich davon ernähren und heilt in sauberem Süßwasser binnen einer Minute seine KP komplett. Wasser-Attacken heilen es, statt Schaden zuzufügen.";

    case "Hadronen-Motor":
        return "Um das Pokemon herum ist durchgehend ein Elektrofeld, das sich immer mit dem Pokemon mitbewegt. Im Elektrofeld ist die INIT des Pokemon verdoppelt.";

    case "Hasenfuß":
        return "Das Pokemon ist sehr ängstlich. Wenn es Schaden nimmt, kann es sofort eine zusätzliche Bewegung durchführen.";

    case "Heilherz":
        return "Das Pokemon kann eine Aktion nutzen, um ein Ziel, das es berührt, von allen negativen Statuseffekten zu heilen.";

    case "Heilwandel":
        return "Das Pokemon heilt sich um 50% allen Schadens, den es mit allen Attacken anrichtet.";

    case "Heißhunger":
        return "Das Pokemon braucht dreimal so viel Nahrung. Solange es hungrig ist, sind seine VERT und SP VERT halbiert und ANG/SP ANG um diese Werte erhöht.";

    case "Helles Wiehern":
        return "Immer, wenn das Pokemon ein Ziel besiegt, stößt es ein triumphierendes Wiehern aus. Alle Verbündeten in der Nähe (10xLV Meter) erhalten einen Moral-Schub und können sofort eine zusätzliche Aktion durchführen.";

    case "Hemmungslos":
        return "Das Pokemon kann Schilde (Lichtschild, Schutzschild, Auroraschleier usw.) klar sehen und eine Aktion nutzen, um sie sich nutzbar zu machen. Es kann diese Effekte von anderen Pokemon stehlen und für sich selbst nehmen, sodass die Schilde vor es bewegt werden.";

    case "Heranwachsen":
        return "Beeren, die in Kontakt mit dem Pokemon kommen, werden viel größer und reifer. Ihre Effekte werden verdoppelt und sie stillen hunger deutlich besser, sind aber auch viel größer.";

    case "Hexaplaga":
        return "Für jedes verbündete Käfer-Pokemon bekommt das Pokemon +1 Würfel bei GENA-Proben.";

    case "Hitzeschutz":
        return "Das Pokemon ist hitzeabweisend. Es nimmt halben Schaden von Feuer-Attacken und ist immun gegen Verbrennen.";

    case "Hitzewahn":
        return "Solange das Pokemon verbrannt  ist, kann es pro Runde 2 Aktionen durchführen. Es nimmt nach jeder Aktion Verbrennungsschaden. In diesem Zustand ist es extrem panisch!";

    case "Hochmut":
        return "Wenn das Pokemon ein Ziel besiegt, erhält es +LV ANG und SP ANG.";

    case "Honigmaul":
        return "Das Pokemon produziert Honig, solange es sich in der Nähe von Blumen befindet. Es produziert pro Tag LV/10 Einheiten Honig. Eine Einheit Honig ist genug, um ein Pokemon für einen Tag zu ernähren, kann aber auch genutzt werden, um Pokemon anzulocken oder mit ihnen zu verhandeln.";

    case "Hydration":
        return "Solange die Haut des Pokemon feucht ist (im Regen, in Süßwasser, wenn es von Wasser-Attacken getroffen wird), ist es immun gegen negative Statuseffekte und sie werden geheilt, falls es schon welche hat.";

    case "Immunität":
        return "Das Pokemon ist komplett immun gegen jede Form von Gift und Krankheit.";

    case "Innere Kraft":
        return "Das Pokemon kann sich durch Meditation heilen. In 5 Minuten heilt es seine KP vollständig, in 4 Stunden eine Wunde.";

    case "Insomnia":
        return "Das Pokemon braucht nur eine Stunde Schlaf pro Nacht und kann nicht zum Einschlafen gebracht werden.";

    case "Kampfpanzer":
        return "Das Pokemon kann nicht kritisch getroffen werden.";

    case "Klebekörper":
        return "Das Pokemon ist extrem klebrig. Bei Berührung müssen Ziele eine KÖ-Probe bestehen, um sich von ihm loszureißen.";

    case "Klimaschutz":
        return "Das Pokemon ist immun gegen alle Wettereffekte.";

    case "Kloakensoße":
        return "Der Körper des Pokemon ist voller Giftstoffe. Versuche, ihm KP abzuziehen, um sich zu heilen, führen zu Schaden. Wer es anleckt, wird vergiftet.";

    case "Knusperkruste":
        return "Feuer-Attacken fügen keinen Schaden zu, sondern verhärten den Körper des Pokemon. Seine Initiative wird dadurch halbiert, aber seine VERT verdoppelt.";

    case "Kommandant":
        return "Das Pokemon kann seine Aktion nutzen, um ein verbündetes Pokemon eine zusätzliche Aktion ausführen zu lassen.";

    case "Konzentrator":
        return "Das Pokemon kann nicht zurückschrecken. ";

    case "Korrosion":
        return "Gift, das das Pokemon absondert, wirkt ätzend. Es trifft Stahl-Pokemon sehr effektiv und kann sie vergiften.";

    case "Kostümspuk":
        return "Das Kostüm, in dem das Pokemon steckt, fängt den ersten Angriff ab, der es treffen würde. Passiert das, wird das Pokemon sehr wütend.";

    case "Kraftkoloss":
        return "Das Pokemon ist extrem stark. Physische Nahkampf-Attacken fügem 2W6 zusätzlichen Schaden zu.";

    case "Kraftquelle":
        return "Das Pokemon inspiriert seine Verbündeten und erhöht, solange es aktiv am Kampf teilnimmt, ihren ANG und SP ANG je und 0.5x Level.";

    case "Krallenwucht":
        return "Die Krallen des Pokemon wachsen extrem schnell nach. Attacken mit den Krallen fügen 50% mehr Schaden zu.";

    case "Kugelsicher":
        return "Das Pokemon hat eine starke schützende Schicht um sich, die es immun gegen manche Attacken macht (z.B. Aura-Sphäre, Kugelsaat, Blitzkanone und Octazooka).";

    case "Kühnes Schwert":
        return "Der Angriffswert des Pokemon ist verdoppelt, solange es ein Schwert trägt.";

    case "Kuriose Arznei":
        return "Das Pokemon kann Hyperheiler aus einem Sekret herstellen, das es ausstößt. Pro Tag kann es einen Hyperheiler herstellen.";

    case "Kurzschluss":
        return "Das Pokemon wird extrem schnell wütend. Passiert das (im Kampf z.B., wenn es von einer sehr effektiven Attacke oder einem Volltreffer getroffen wird), wird sein Angriff verdoppelt.";

    case "Langfinger":
        return "Das Pokemon kann immer, wenn es mit einer Attacke Körperkontakt herstellt, eine Stehlen-Probe ablegen, um als zusätzliche Aktion das Item des Ziels zu stehlen.";

    case "Langstrecke":
        return "Das Pokemon stellt bei seinen Attacken nie Körperkontakt her, wenn es das nicht will.";

    case "Lärmschutz":
        return "Das Pokemon ist immun gegen Schall-Attacken. Es kann bei Bedarf sein Gehör komplett ausschalten.";

    case "Läutersalz":
        return "Das Pokemon ist von Natur aus schädlich für Geist-Pokemon. Es nimmt keinen Schaden von Geist-Attacken, Geist-Pokemon haben instinktiv Angst vor ihm, und sie nehmen 10% ihrer max KP als Schaden, wenn sie das Pokemon berühren.";

    case "Leichtmetall":
        return "Das Pokemon kann sein Gewicht anpassen und sich sehr leicht (1% seines Gewichts) machen. Es nimmt dann keinen Schaden von Attacken, die schweren Pokemon mehr Schaden zufügen, aber maximalen Schaden von Attacken, die leichteren Pokemon mehr Schaden zufügen.";

    case "Libero":
        return "Projektil-Attacken des Pokemon, die mit dem Fuß geschossen werden, erfordern keine GENA-Probe und treffen immer.";

    case "Limitschild":
        return "Wenn das Pokemon eine Wunde nimmt, werden sein ANG und SP ANG für den Rest des Kampfes verdoppelt.";

    case "Lockenkopf":
        return "Die Haare des Pokemon sind sehr lang und fest und wickeln sich leicht um alles herum. Bei Kontakt muss ein Ziel eine Akrobatik-Probe schaffen oder verwickelt sich in den Haaren und kann sich nicht mehr wegbewegen.";

    case "Magenkrempler":
        return "Wenn das Pokemon besiegt wird, speit es reflexiv seinen Mageninhalt bis zu LV Meter weit aus (GENA-Probe). Trifft der Mageninhalt ein Ziel, nimmt dieses Schaden in Höhe von 50% der max KP des Pokemon. Das Pokemon wird anschließend sehr hungrig und muss etwas essen, bevor es diese Fähigkeit erneut nutzen kann.";

    case "Magieschild":
        return "Das Pokemon ist immun gegen indirekten Schaden (Gift, Stachler, Hagel usw.).";

    case "Magiespiegel":
        return "Status-Attacken, die das Pokemon treffen würden, werden von ihm aus auf ein zufälliges anderes Ziel in Reichweite umgelenkt.";

    case "Magmapanzer":
        return "Das Pokemon hat eine extrem hohe Körpertemperatur. Es kann nicht einfrieren und Wasser-Attacken fügen ihm nur halben Schaden, Eis-Attacken dafür doppelten Schaden zu.";

    case "Magnetfalle":
        return "Das Pokemon kann sich beliebig stark magnetisieren. Es kann so an Eisenwänden festhängen wie reingeschraubt oder Stahl-Pokemon daran hindern, sich von ihm zu entfernen.";

    case "Majestät":
        return "Die Präsenz des Pokemon ist einschüchternd. Es kann zu Beginn jeder Runde eine Einschüchtern-Probe ablegen, um alle Gegner in dieser Runde daran zu hindern, eine Prio-Attacke einzusetzen.";

    case "Megawumme":
        return "Projektil-Attacken des Pokemon (z.B. Aquawelle, Aura-Sphäre) sind ungewöhnlich groß, schnell und stark. Paraden gegen sie brauchen einen Erfolg mehr und sie fügen 50% mehr Schaden zu.";

    case "Mentalkraft":
        return "Physische Nahkampf-Attacken des Pokemon fügen 2W6 zusätzlichen Schaden zu.";

    case "Metallprotektor":
        return "Das Pokemon nimmt keinen Schaden von physischen Attacken, außer von Volltreffern.";

    case "Mimese":
        return "Der Typ des Pokemon ändert sich je nach Umgebung (im Fluss Typ Wasser, im Wald Typ Pflanze usw.).";

    case "Minus":
        return "Bekommt +LV auf alle Statuswerte, solange ein Pokemon mit der Fähigkeit Plus im Team mitkämpft.";

    case "Mitnahme":
        return "Das Pokemon erhält +3 automatische Erfolge auf Suchen von Dingen, die es selbst haben will (z.B. Essen).";

    case "Multischuppe":
        return "Die Schuppen des Pokemon sind wunderschön, wertvoll, aber auch hart und stark. Solange seine KP voll sind, nimmt es nur halben Schaden.";

    case "Mumie":
        return "Jedes Ziel, das das Pokemon berührt, muss eine Widerstand-Probe schaffen oder wird verflucht.";

    case "Munterkeit":
        return "Das Pokemon braucht nur eine Stunde Schlaf pro Nacht und kann nicht zum Einschlafen gebracht werden.";

    case "Myzelenkraft":
        return "Das Pokemon kann Ziele ungeachtet aller Immunitäten immer mit Statuseffekten belegen und umgeht Dinge wie Magiespiegel.";

    case "Nebel-Erzeuger":
        return "Um das Pokemon herum ist durchgehend ein Nebelfeld, das sich immer mit dem Pokemon mitbewegt.";

    case "Neutraltorso":
        return "Die Statuswerte des Pokemon können nicht verringert werden.";

    case "Niesel":
        return "Das Pokemon stößt enorm viel Feuchtigkeit aus und erzeugt kalte, feuchte Luftströme um sich. Ist es mindestens eine Stunde draußen, verändert es passiv das Wetter und sorgt für heftigen Regen. In seiner Nähe funktionieren Attacken wie Sonnentag nicht.";

    case "Notdünger":
        return "Das Pokemon hat stets genug Nährstoffe für den Notfall gebunkert. Es kommt im Notfall eine Woche ohne Nahrung aus. Im Kampf fügen seine Pflanzen-Attacken 50% mehr Schaden zu, solange seine KP unter 25% liegen. So verstärkte Attacken einzusetzen, reduzieren aber die Zeit, die das Pokemon keine Nahrung braucht.";

    case "Notschutz":
        return "Solange das Pokemon einen negativen Statuseffekt hat, nimmt es nur halben Schaden.";

    case "Orichalkum-Puls":
        return "Das Pokemon stößt abartig viel Hitze aus und erzeugt trockene Luftströme um sich. Binnen weniger Sekunden verändert es passiv das Wetter und sorgt für Sonnenschein. In seiner Nähe funktionieren Attacken wie Regentanz nicht.";

    case "Orkanschwingen":
        return "Das Pokemon hat extrem starke Flügel und kann unerwartet viel Gewicht tragen. Es kann so schnell fliegen, dass seine Flug-Attacken im Kampf Priorität haben.";

    case "Paläosynthese":
        return "Bei Sonnenschein fügt das Pokemon doppelten Schaden zu.";

    case "Panzerhaut":
        return "Die Oberfläche des Pokemon ist extrem hart. Es nimmt keinen zusätzlichen Schaden von Volltreffern.";

    case "Partikelschutz":
        return "Das Pokemon ist immun gegen Puder, Pulver und Schaden durch Hagel oder Sandsturm.";

    case "Pastellhülle":
        return "Das Pokemon sondert ständig Feen-Partikel ab, die es und Pokemon in der Nähe (0.5xLV Meter) immun gegen Gift machen.";

    case "Pflanzengabe":
        return "Das Pokemon sondert bei Sonnenschein reine Energie aus, die seinen SP ANG und den aller Verbündeten in der Nähe (LV Meter) um LV erhöhen.";

    case "Pflanzenpelz":
        return "Erhöht VERT, solange das Pokemon auf einem Grasfeld ist oder sich in einem dichten Wald befindet.";

    case "Phantomschutz":
        return "Das Pokemon ist von wabernden Schatten umgeben, solange seine KP voll sind oder es dunkel ist. In diesem Zustand ist seine Form kaum zu erkennen und GENA-Proben gegen es haben einen Erfolg weniger.";

    case "Plätscherstimme":
        return "Ton-basierte Attacken des Pokemon können Wasser erzeugen. Sie erhalten den zusätzlichen Typ Wasser.";

    case "Plus":
        return "Bekommt +LV auf alle Statuswerte, solange ein Pokemon mit der Fähigkeit Minus im Team mitkämpft.";

    case "Prismarüstung":
        return "Die Grundstärke aller Attacken, die das Pokemon treffen, ist um 2W6 verringert (auf ein Minimum von 1W6).";

    case "Profiteur":
        return "Wenn ein Statuswert eines Pokemon in der Nähe (0.5xLV Meter) sich erhöht, erhöht sich der gleiche Wert des Pokemon um LVx0.5.";

    case "Prognose":
        return "Der Typ und die Form des Pokemon ändern sich abhängig vom Wetter.";

    case "Psycho-Erzeuger":
        return "Um das Pokemon herum ist durchgehend ein Psychofeld, das sich immer mit dem Pokemon mitbewegt.";

    case "Puderabwehr":
        return "Um das Pokemon herum sind immer Puder in der Luft. Jedes Ziel in Nahkampf-Reichweite muss jede Runde eine Widerstand-Probe bestehen, oder es erleidet zufäällig Vergiftung, Paralyse oder Schlaf. Das Pokemon kann die Puderabwehr manuell ein- und ausschalten, das Wiedereinschalten dauert eine Runde.";

    case "Pulverrauch":
        return "Wenn das Pokemon Schaden nimmt, stößt es eine Rauchwolke aus. Jedes Ziel in Nahkampfreichweite muss dann eine PA-Probe bestehen oder seine GENA wird um 1 verringert.";

    case "Punk Rock":
        return "Eigene Lärm-Attacken (Schallwelle, Säuselstimme usw.) richten 50% mehr Schaden an. Das Pokemon ist sehr, sehr laut.";

    case "Quälerei":
        return "Attacken gegen vergiftete Ziele landen immer Volltreffer, wenn sie treffen. Das Pokemon ist extrem sadistisch und liebt es, Schmerz zuzufügen.";

    case "Quantenantrieb":
        return "Am Ende jeder Runde erhöht sich ein zufälliger Statuswert um LV.";

    case "Rasanz":
        return "Immer, wenn das Pokemon Schaden nimmt, erhält es +0.5 Initiative.";

    case "Rastlose Seele":
        return "Das Pokemon kann in ein anderes einfahren und es kontrollieren. Das Ziel kann jede Runde eine Widerstand-Probe würfeln, um das Pokemon abzustoßen, ansonsten wird es komplett von ihm kontrolliert. Das Pokemon kann dasselbe Ziel nur einmal pro Tag in Besitz nehmen.";

    case "Rauflust":
        return "Normal- und Kampf-Attacken des Pokemon treffen jedes Pokemon mindestens normal effektiv.";

    case "Rauhaut":
        return "Die Oberfläche des Pokemon ist sehr hart und rau, es zu berührenist auch mit größter Vorsicht schmerzhaft. Wird es von einem Kontakt-Angriff getroffen, nimmt der Angreifer 10% seiner max KP als Schaden.";

    case "Reaktionsgas":
        return "Das Pokemon stößt ständig Gas aus, das extrem brennbar und explosiv ist.";

    case "Receiver":
        return "Das erste Mal in jedem Kampf, wenn ein verbündetes Pokemon besiegt wird, erhält dieses Pokemon alle Fähigkeiten des besiegten Pokemon, indem es seinen Kampfgeist channelt.";

    case "Redlichkeit":
        return "Wird das Pokemon von einer Unlicht-Attacke getroffen, erhält es +LV ANG. Es hat einen starken Gerechtigkeitssinn.";

    case "Regengenuss":
        return "Das Pokemon kann sich von klarem Wasser ernähren. Im Regen oder in klarem Süßwasser regeneriert es jede Runde 10% max KP.";

    case "Regulierung":
        return "Das Pokemon kann Attacken regulieren. Es kann den Schaden seiner Attacken beliebig reduzieren und so \"non lethal\" ansagen, um ein Pokemon garantiert bei einem KP zu belassen. Außerdem kann es allen Attacken den zusätzlichen Typ Normal geben.";

    case "Reiche Ernte":
        return "Das Pokemon produziert in oder an seinem Körper Früchte, Kräute oder ähnliches.";

    case "Reißaus":
        return "Wenn das Pokemon Schaden nimmt, bewegt es sich sofort so weit wie möglich von der Schadensquelle weg. Wenn es eine Wunde im Kampf nimmt, versucht es, in seinen Pokeball zu fliehen.";

    case "Reitgespann":
        return "Solange das Pokemon ein anderes reitet/geritten wird, erhält es dessen Fähigkeiten zusätzlich zu den eigenen.";

    case "Rivalität":
        return "Das Pokemon fügt anderen desselben Geschlechts 50% mehr Schaden zu.";

    case "Robustheit":
        return "Das Pokemon ist sehr hart. Solange seine KP voll sind, kann es nicht mit einer Attacke besiegt werden.";

    case "Rohe Gewalt":
        return "Attacken des Pokemon, die zusätzlich zu Schaden noch einen Effekt hätten, verlieren diesen Effekt, fügen aber 50% mehr Schaden zu.";

    case "Rückzug":
        return "Wenn das Pokemon Schaden nimmt, bewegt es sich sofort so weit wie möglich von der Schadensquelle weg. Wenn es eine Wunde im Kampf nimmt, versucht es, in seinen Pokeball zu fliehen.";

    case "Sandgewalt":
        return "Setzt das Pokemon drei Runden lang Sand-Attacken (Sandwirben, Sandgrab etc.) ein, entsteht ein Standsturm.";

    case "Sandscharrer":
        return "Das Pokemon kann extrem schnell graben. Es kann seine Reaktion nutzen, um sich einzugraben, auszugraben, oder grabend eine zusätzliche Bewegung durchzuführen.";

    case "Sandschleier":
        return "Solange ein Sandsturm herrscht, sind GENA-Proben gegen das Pokemon um 2 Stufen erschwert.";

    case "Sandspeier":
        return "Wenn das Pokemon Schaden von einer Attacke nimmt, spuckt es große Mengen Sand aus und erzeugt einen Sandsturm.";

    case "Sandsturm":
        return "Der Körper des Pokemon stößt passiv Sand aus. Ist es eine Minute lang draußen, entsteht um es herum ein großer Sandsturm, der sich mit ihm mitbewegt. Das Pokemon kann diese Fähigkeit nach Belieben abschalten.";

    case "Saugnapf":
        return "Das Pokemon kann nicht bewegt werden und sich an senkrechten Flächen oder Decken bewegen.";

    case "Saumselig":
        return "Für die ersten 5 Runden des Kampfes sind alle Statuswerte des Pokemon um 90% reduziert.";

    case "Scharfkantig":
        return "Schnitt-Attacken des Pokemon fügen 50% mehr Schaden zu.";

    case "Scharwandel":
        return "Fallen die KP des Pokemon unter 50%, nimmt es seine ultimative Form an.";

    case "Scherenmacht":
        return "Der ANG-Wert des Pokemon kann niemals sinken, weder durch gegnerische Attacken/Effekte noch durch eigene.";

    case "Schildlos":
        return "Alle Attacken des Pokemon und die gegen das Pokemon eingesetzt werden treffen es immer, unabhängig von der GENA-Probe.";

    case "Schnarchnase":
        return "Das Pokemon schläft nach jeder eigenen Runde ein.";

    case "Schneemantel":
        return "Solange ein Hagelsturm herrscht, sind GENA-Proben gegen das Pokemon um 2 Stufen erschwert.";

    case "Schneescharrer":
        return "Das Pokemon kann in Schnee schwimmen und tauchen wie in Wasser. Es hat zwei zusätzliche Reaktionen, solange es in tiefem Schnee ist und kann auch mehrere Reaktionen nutzen, um derselben Attacke auszuweichen.";

    case "Schneeschauer":
        return "Der Körper des Pokemon stößt passiv Schnee aus. Ist es eine Stunde lang draußen, entsteht um es herum ein großer Hagensturm, der sich mit ihm mitbewegt.";

    case "Schnellschuss":
        return "Zu Beginn jeder Kampfrunde würfelt das Pokemon eine Akrobatik-Probe. Bei Erfolg hat es in dieser Runde Priorität.";

    case "Schnüffler":
        return "Das Pokemon kann extem gut riechen. Sinnesschärfe-Proben, die auf Geruch basieren, haben +2 automatische Erfolge. Außerdem kann es zu Beginn des Kampfes am Geruch erkennen, ob ein gegnerisches Pokemon mindestens eine Attacke eines vorher festgelegten Typs beherrscht.";

    case "Schraubflosse":
        return "Das Pokemon kann extrem präzise schwimmen. Im Wasser erhält es +2 automatische Erfolge auf PA-Proben.";

    case "Schwächling":
        return "Immer, wenn das Pokemon Schaden nimmt, verliert es 0.5xLV ANG, DEF, SP ANG und SP DEF.";

    case "Schwebe":
        return "Das Pokemon schwebt in der Regel durchgehend und ist immun gegen bestimmte Attacken.";

    case "Schwebedurch":
        return "Das Pokemon kann Fernkampf-Attacken durch Hindernisse wie Barrieren, aber auch Glasscheiben hindurch schießen.";

    case "Schweifrüstung":
        return "Das Pokemon kann mit seinem Schweif sehen und nicht überrascht werden. Es ist immun gegen zurückschrecken und Priorität-Attacken, die es als Ziel wählen, verlieren ihre Priorität.";

    case "Schwermetall":
        return "Das Pokemon kann sein Gewicht anpassen und sich sehr schwer (Gewicht x100) machen. Es nimmt dann keinen Schaden von Attacken, die leichten Pokemon mehr Schaden zufügen, aber maximalen Schaden von Attacken, die schweren Pokemon mehr Schaden zufügen.";

    case "Seelenherz":
        return "Immer, wenn ein Pokemon in der Nähe (LVx10 Meter) besiegt wird, heilt das Pokemon 50% seiner max KP.";

    case "Siegeswille":
        return "Wird ein Statuswert des Pokemon verringert: Es erhält +2xLV ANG. Wenn der ANG-Wert gesenkt wurde: Es erhält diesen Bonus zweimal.";

    case "Solarkraft":
        return "Im Sonnenschein fügt das Pokemon doppelten Schaden mit Attacken zu, nimmt aber jede Runde 20% seiner max KP als Schaden.";

    case "Speckschicht":
        return "Das Pokemon hat genug Fett, um einen Monat ohne Nahrung auszukommen. Solange es Speck hat, nimmt es halben Schaden von Feuer- und Eis-Attacken.";

    case "Spiegelrüstung":
        return "Alle Attacken, deren Effekte beinhalten, einen Statuswert des Pokemon zu verringern, werden auf einen zufälligen anderen Kampfteilnehmer in Reichweite umgelenkt.";

    case "Sporenwirt":
        return "Immer, wenn das Pokemon Schaden nimmt, stößt es schädliche Sporen ab. Alle Ziele in Nahkampfreichweite müssen dann eine Widerstand-Probe bestehen oder werden zufällig mit Paralyse, Schlaf oder Gift belegt.";

    case "Stählerner Wille":
        return "Die Statuswerte des Pokemon können nicht durch gegnerische Effekte verringert werden.";

    case "Stahlprofi":
        return "Das Pokemon kennt sich hervorragend mit Metall aus. Seine Stahl-Attacken richten 50% mehr Schaden an.";

    case "Stahlrückgrat":
        return "Das Pokemon ist komplett immun gegen die meisten Attacken, die es von hinten treffen würden.";

    case "Starthilfe":
        return "Elektro-Attacken fügen dem Pokemon keinen Schaden zu, sondern erhöhen seine Initiative um sein LV.";

    case "Statik":
        return "Jedes Ziel, das das Pokemon berührt, muss eine Widerstand-Probe bestehen oder wird paralysiert.";

    case "Steinhaupt":
        return "Das Pokemon nimmt keinen Rückstoßschaden und seine Statuswerte können nicht durch seine eigenen Attacken verringert werden.";

    case "Steinträger":
        return "Wenn das Pokemon ein Stein-Projektil bei sich trägt, darf es zu Beginn des Kampfes als zusätzliche Aktion sofort die Attacke Steinwurf mit diesem Stein einsetzen.";

    case "Streusaat":
        return "Das Pokemon trägt etliche Samen mit sich herum und hinterlässt einen Teppich aus Setzlingen. Es kann im Kampf eine Aktion nutzen, um ein Grasfeld auszulösen.";

    case "Strolch":
        return "Status-Attacken des Pokemon haben erhöhte Priorität.";

    case "Sturmsog":
        return "Das Pokemon saugt alle Wasser-Attacken in seiner Nähe zu sich hin (0.5xLV Meter). Wasser-Attacken fügen ihm keinen Schaden zu.";

    case "Sturzbach":
        return "Wenn das Pokemon gestresst oder verängstigt ist (z.B. wenn seine KP unter 25% fallen), schwitzt es große Mengen klaren Wassers. In diesem Zustand sind seine Wasser-Attacken um 50% verstärkt.";

    case "Superschütze":
        return "Das Pokemon landet schon bei 3 Erfolgen Volltreffer.";

    case "Superwechsel":
        return "Wenn das Pokemon aus- und wieder eingewechselt wird, nimmt es seine wahre Gestalt an.";

    case "Surf-Schweif":
        return "Das Pokemon kann auf seinem Schwanz surfen und schweben, solange es sich auf metallenem Untergrund oder im Elektrofeld befindet. In diesem Zustand ist es immun gegen manche Attacken und seine INIT ist verdoppelt.";

    case "Süßer Nektar":
        return "Das Pokemon riecht extrem süß. Wilde Pokemon werden es mit Priorität angreifen. PA-Proben sind für alle Kampfteilnehmer, die das Pokemon riechen können, um 1 erschwert.";

    case "Symbiose":
        return "Wenn das Pokemon in der Nähe eines Verbündeten ist, kann es als zusätzliche Aktion sein Item mit dessen Item austauschen ODER, wenn nicht beide ein Item tragen, sein Item weitergeben/das Item des Pokemon nehmen.";

    case "Synchro":
        return "Wenn das Pokemon von einem negativen Statuseffekt betroffen wird, müssen alle anderen Pokemon in der Nähe (0.5xLV Meter) eine Widerstand-Probe bestehen oder werden vom selben Status betroffen.";

    case "Synchroauftritt":
        return "Das Pokemon kann seine Aktion nutzen, um alle Statuserhöhungen eines anderen Pokemon in Sichtweite zu kopieren.";

    case "Taktikwechsel":
        return "Das Pokemon wechselt bei jeder offensiven Attacke sowie Schutzschild oder Königsschild seine Form.";

    case "Tänzer":
        return "Immer, wenn ein anderes Pokemon eine Tanz-Attacke einsetzt (außer durch den Effekt von Tänzer), erhält dieses Pokemon sofort eine zusätzliche Aktion, die es für eine Tanz-Attacke nutzen muss.";

    case "Tastfluch":
        return "Jedes Ziel, das das Pokemon berührt, muss eine Widerstand-Probe bestehen, oder eine zufällige seiner Attacken wird für den Rest des Kampfes blockiert.";

    case "Taumelschritt":
        return "Das Pokemon hat keine negativen Effekte von Verwirrung. Solange es verwirrt ist, kostet es es keine Reaktion, einer Attacke auszuweichen.";

    case "Techniker":
        return "Das Pokemon ist extrem geschickt.Seine Attacken mit weniger als 6W6 Basis-Schaden haben stattdessen 6W6 Basis-Schaden.";

    case "Telepathie":
        return "Das Pokemon kann telepathisch mit seinem Trainer sowie anderen Pokemon seines Trainers kommunizieren. Es kann seinem Trainer Bilder in den Kopf schicken, aber keine Worte, die er versteht.";

    case "Temposchub":
        return "Am Ende jeder Runde erhält das Pokemon +LV Initiative.";

    case "Tera-Panzer":
        return "Alle Attacken, die das Pokemon treffen, gelten als nicht sehr effektiv.";

    case "Tera-Wandel":
        return "Das Pokemon kann jede Runde seinen Typ beliebig ändern.";

    case "Teraforming Null":
        return "Immer, wenn sich der Typ des Pokemon ändert, werden alle Felder, Fallen und Effekte der Umgebung negiert.";

    case "Teravolt":
        return "Attacken des Pokemon treffen jedes Pokemon immer mindestens normal effektiv, unabhängig von Typen oder Fähigkeiten.";

    case "Thermowandel":
        return "Wenn das Pokemon Schaden durch Feuer nimmt, erhält es +LV ANG. Es kann nicht verbrannt werden.";

    case "Tiefkühlkopf":
        return "Der erste physische Treffer gegen den Kopf des Pokemon wird negiert, wodurch der Eisblock am Kopf zerstört wird. Das Pokemon kann ihn bei großer Kälte in einer Stunde wiederherstellen.";

    case "Titankiefer":
        return "Das Pokemon kann extrem stark beißen. Seine Biss-Attacken richten 50% mehr Schaden an.";

    case "Tollpatsch":
        return "Immer, wenn das Pokemon patzt, erhält es einen Glücks-Token. Es kann maximal so viele haben wie sein GL-Wert.";

    case "Trance-Modus":
        return "Das Pokemon kann zwischen zwei Formen wechseln.";

    case "Transistor":
        return "Elektro-Attacken des Pokemon fügen dreifachen Schaden zu.";

    case "Triumphstern":
        return "Wenn das Pokemon besiegt werden würde, regenerieren sich seine KP stattdessen sofort vollständig.";

    case "Trockenheit":
        return "Die Haut des Pokemon ist sehr trocken. Wasser-Attacken und Regen heilen es, Feuer-Attacken fügen ihm doppelten Schaden zu und es nimmt jede Runde 10% Schaden in der Sonne.";

    case "Trugbild":
        return "Das Pokemon kann die Gestalt von anderen Pokemon oder Menschen annehmen, die es schon einmal gesehen hat.";

    case "Turbobrand":
        return "Attacken des Pokemon treffen jedes Pokemon immer mindestens normal effektiv, unabhängig von Typen oder Fähigkeiten.";

    case "Überbrückung":
        return "Attacken des Pokemon können jedes Pokemon treffen, unabhängig von Typen oder Fähigkeiten.";

    case "Übereifer":
        return "GENA-Proben des Pokemon sind um 1 erschwert, aber Attacken des Pokemon haben +2W6 Grundschaden.";

    case "Umkehrung":
        return "Status-Erhöhungen und -Verringerungen sind vertauscht.";

    case "Unbeugsamkeit":
        return "Wird ein Statuswert des Pokemon verringert: Es erhält +2xLV SP ANG. Wenn der SP ANG-Wert gesenkt wurde: Es erhält diesen Bonus zweimal.";

    case "Unheilsgefäß":
        return "Absorbiert jede Runde passiv einen Teil der Seelen aller anderen Kampfteilnehmer, was alle ihre Statuswerte um LV verringert.";

    case "Unheilsjuwelen":
        return "Absorbiert jede Runde passiv einen Teil der Seelen aller anderen Kampfteilnehmer, was alle ihre Statuswerte um LV verringert.";

    case "Unheilskörper":
        return "Wird das Pokemon berührt, belegt es denjenigen mit einem starken Fluch, der das Ziel in drei Runden besiegen wird. Dies kann nur verhindert werden, wenn das Pokemon den Fluch freiwillig aufhebt oder das Ziel sich weiter als 5xLV Meter vom Pokemon wegbewegt.";

    case "Unheilsschwert":
        return "Absorbiert jede Runde passiv einen Teil der Seelen aller anderen Kampfteilnehmer, was alle ihre Statuswerte um LV verringert.";

    case "Unheilstafeln":
        return "Absorbiert jede Runde passiv einen Teil der Seelen aller anderen Kampfteilnehmer, was alle ihre Statuswerte um LV verringert.";

    case "Unkenntnis":
        return "Das Pokemon ist sehr dumm. Es ignoriert beim Angreifen Erhöhungen und Senkungen der gegnerischen VERT/SP VERT und ignoriert wenn es getroffen wird Erhöhungen des gegnerischen ANG/SP ANG.";

    case "Urmeer":
        return "Das Pokemon produziert unfassbare Mengen an Nässe und Sturm. In seiner Anwesenheit entstehen sofort gewaltige Stürme, was zu Regen führt, der durch keine Attacken aufgehoben werden kann.";

    case "Variabilität":
        return "Das Pokemon kann jeden Typ und jede Kombination von Typen zu jeder Zeit annehmen.";

    case "Vegetarier":
        return "Wenn das Pokemon von einer Pflanzen-Attacke getroffen wird, heilt es sich, statt Schaden zu nehmen.";

    case "Verborgene Faust":
        return "Schlag-Attacken des Pokemon ignorieren alle Effekte, die vor Attacken schützen würden (Scanner, Schutzschild etc.).";

    case "Verklumpen":
        return "Wenn das Pokemon von einer Wasser-Attacke getroffen oder sehr nass wird, erhält es +2xLV VERT.";

    case "Viskosität":
        return "Wenn ein Ziel das Pokemon berührt, muss es eine KÖ-Probe bestehen oder bleibt an ihm kleben.";

    case "Völlerei":
        return "Das Pokemon kann seine Beere jederzeit essen und erhält doppelte Heilung von Beeren.";

    case "Voltabsorber":
        return "Das Pokemon wird von Elektro-Attacken geheilt, statt Schaden zu nehmen.";

    case "Vorahnung":
        return "Zu Beginn des Kampfes erfährt das Pokemon je eine zufällige Attacke jedes Gegners in Sicht und teilt diese Information seinem Trainer mit.";

    case "Vorwarnung":
        return "Zu Beginn des Kampfes erfährt das Pokemon instinktiv, ob und welche gegnerischen Pokemon sehr effektive Attacken gegen es beherrschen.";

    case "Wachhund":
        return "Das Pokemon ist immun gegen Einschüchtern. Effekte, die seinen ANG verringern würden, erhöhen ihn stattdessen. Es kann nicht gezwungen werden zu fliehen.";

    case "Wackerer Schild":
        return "Die erste Attacke, die das Pokemon jede Runde treffen würde, prallt gegen den Schild und wird abgewehrt.";

    case "Wandlungskunst":
        return "Das Pokemon kann seinen Typ jede Runde entsprechend dem Typ seiner Attacke ändern.";

    case "Wankelmut":
        return "Immer, wenn sich ein Statuswert des Pokemon erhöhen oder verringern würde, wird diese Veränderung ein zusätzliches Mal ausgeführt.";

    case "Wasserblase":
        return "Das Pokemon kann Verbündete, die sich in seiner Wasserblase aufhalten, jede Runde um 25% ihrer max KP heilen.";

    case "Wassertempo":
        return "Im Wasser ist die Initiative des Pokemon verdreifacht.";

    case "Wegsperre":
        return "Wenn ein Ziel versucht, sich aus der Nahkampf-Reichweite des Pokemon zu bewegen, kann das Pokemon sofort eine Nahkampf-Attacke als zusätzliche Aktion gegen es ausführen.";

    case "Wertelink":
        return "Multihit-Attacken des Pokemon treffen immer die maximale Anzahl an Male (max 5 mal).";

    case "Wiederkäuer":
        return "Wenn das Pokemon eine Beere isst, käut es sie am Ende der nächsten Runde wieder und erhält ihren Effekt erneut.";

    case "Windkraft":
        return "Immer, wenn das Pokemon von einer Wind-Attacke getroffen wird, richtet seine nächste Elektro-Attacke doppelten Schaden an.";

    case "Windreiter":
        return "Das Pokemon ist immun gegen Wind-Attacken. Wird es von einer solchen getroffen, kann es sofort eine zusätzliche Bewegung und Aktion (in dieser Reihenfolge) durchführen.";

    case "Wolke Sieben":
        return "In der Nähe des Pokemon werden alle Wetterlagen so stark gedämpft, dass sie keinen Effekt auf den Kampf nehmen.";

    case "Wollflaum":
        return "Wenn das Pokemon Schaden nimmt, verteilt es seine Wolle in der Nähe. Ziele in Nahkampf-Reichweite müssen eine Akrobatik-Probe bestehen oder ihre Initiative sinkt um LV.";

    case "Wunderhaut":
        return "Immer, wenn das Pokemon eine Widerstand-Probe würfelt, darf es diese zweimal würfeln.";

    case "Wunderwache":
        return "Nur sehr effekte Attacken haben einen Effekt auf das Pokemon.";

    case "Würggeschoss":
        return "Das Pokemon beginnt den Kampf mit einem Geschoss im Mund. Zu Beginn des Kampfes kann es sofort eine zusätzliche Aktion ausführen, um ein Ziel damit für 5W6 physischen Schaden anzugreifen. Bewegt sich das Pokemon im Wasser, kann es mit einer Schwimmen-Probe ein neues Geschoss fangen.";

    case "Wutausbruch":
        return "Immer, wenn das Pokemon eine Wunde nimmt, wird es unglaublich wütend. Sein ANG wird verdoppelt, aber es kann nicht mehr zwischen Freund und Feind unterscheiden.";

    case "Wutpanzer":
        return "Immer, wenn das Pokemon eine Wunde nimmt, wird es unglaublich wütend und zieht sich in seinen Panzer zurück. In diesem Zustand will es nicht mehr rauskommen und aller Schaden gegen es wird halbiert.";

    case "Zähigkeit":
        return "Immer, wenn das Pokemon Schaden nimmt, erhält es +LV VERT.";

    case "Zauberer":
        return "Wenn das Pokemon ein Ziel mit einer Attacke trifft, kann es eine Schauspiel-Probe ablegen. Gelingt diese, stiehlt es dem Ziel sein Item, unabhängig von der Distanz.";

    case "Zeitspiel":
        return "Das Pokemon agiert im Kampf immer als letztes. Würde sich der INIT-Wert des Pokemon be einem Levelup erhöhen, kannst du stattdessen wählen, welcher Wert erhöht werden soll.";

    case "Zenithaut":
        return "Die Haut des Pokemon ist mit Ozon beschichtet. Es kann problemlos irre schnell fliegen und alle seine physischen Nahkampf-Attacken erhalten zusätzlich den Typ Flug.";

    case "Zerebralmacht":
        return "Sehr effektive Attacken des Pokemon fügen zehnfachen Schaden zu.";

    case "Zuckerhülle":
        return "Das Pokemon riecht extrem süß. Ziele in der Nähe wachen sofort auf und können nicht einschlafen, da der Geruch zu penetrant ist. Es kann sich niemals verstecken.";

    case "Glaskörper":
        return "Der Körper des Pokemon besteht komplett aus Glas. Seine Beweglichkeit ist stark eingeschränkt. Physische Angriffe fügen vierfachen, spezielle geviertelten Schaden zu.";
  }
}

window.getAbilities = getAbilities;
window.getAbilityDescription = getAbilityDescription;
window.getAbilityColor = getAbilityColor;

// Exportiere Module für Node.js-Umgebungen, falls benötigt
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAbilities, 
    getAbilityDescription,
    getAbilityColor
  };
}