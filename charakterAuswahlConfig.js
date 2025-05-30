/**
 * Configuration constants for character selection
 */

// Total number of available sprites
export const TOTAL_SPRITES = 12;

// Team configuration limits
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 10;
export const MIN_FIGHTERS_PER_TEAM = 1;
export const MAX_FIGHTERS_PER_TEAM = 6;

// Team colors - duplicated from battle config for consistency
export const TEAM_COLORS = [
    '#e74c3c', // Red
    '#3498db', // Blue
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#34495e', // Dark Blue
    '#e67e22', // Dark Orange
    '#27ae60', // Dark Green
    '#c0392b'  // Dark Red
];

//Forcieren-Modi
export const FORCING_MODE_OPTIONS = [
    { value: 'always', text: 'Immer' },
    { value: 'once', text: 'Einmal' },
    { value: 'dynamic', text: 'Dynamisch' },
    { value: 'never', text: 'Nie' }
];

// Strategy options
export const STRATEGY_OPTIONS = [
    { value: 'aggressive', text: 'Aggressiv' },
    { value: 'defensive', text: 'Standhaft' },
    { value: 'fleeing', text: 'Fliehend' },
    { value: 'tricky', text: 'Tückisch' },
    { value: 'supporting', text: 'Unterstützend' },
    { value: 'reinforcing', text: 'Verstärkend' },
    { value: 'aiming', text: 'Zielend' },
    { value: 'opportunistic', text: 'Opportunistisch' }
];

// Ranged weapon definitions
export const RANGED_WEAPON_TYPES = {
    'glut': {
        range: 5,
        kontakt: false,
        effect: "3+ Erfolge: Das Ziel wird verbrannt."
    },
    'aquaknarre': {
        range: 5,
        kontakt: false
    },
    'rankenhieb': {
        range: 2,
        kontakt: true,
        effect: "Kann zwei Ziele hintereinander treffen."
    },
    'donnerschock': {
        range: 4,
        effect: "3+ Erfolge: Das Ziel wird paralysiert."
    },
    'steinwurf': {
        range: 4,
        kontakt: false
    },
    'giftpuder': {
        range: 3,
        cone: 45,
        kontakt: false,
        effect: "Vergiftet alle Ziele in Reichweite."
    },
    'stachelspore': {
        range: 3,
        cone: 45,
        kontakt: false,
        effect: "Paralysiert alle Ziele in Reichweite."
    },
    'schlafpuder': {
        range: 3,
        cone: 45,
        kontakt: false,
        effect: "Schläfert alle Ziele in Reichweite ein."
    },
    'sandwirbel': {
        range: 3,
        cone: 60,
        kontakt: false,
        effect: "Senkt GENA aller Ziele in Reichweite um 1."
    },
    'schwerttanz': {
        range: 0,
        kontakt: false,
        effect: "Erhöht den Angriffswert um 2 Stufen.",
        buff: true,
        buffedStats: ["Angriff"],
        notOffensive: true
    },
    'schlitzer': {
        range: 1,
        kontakt: true,
        effect: "Erzielt Volltreffer bei einem Erfolg weniger.",
    },
    'kreuzschere': {
        range: 1,
        kontakt: true,
        effect: "Erzielt Volltreffer bei einem Erfolg weniger.",
    },
    'rasierblatt': {
        range: 4,
        cone: 45,
        kontakt: false,
        effect: "Erzielt Volltreffer bei einem Erfolg weniger."
    },
    'eissturm': {
        range: 4,
        cone: 60,
        kontakt: false,
        effect: "Verlangsamt getroffene Ziele um eine Stude."
    },
    'fadenschuss': {
        range: 5,
        kontakt: false,
        effect: "Verringert Initiative des Ziels und verhindert für eine Runde, dass es sich bewegt."
    },
    'panzerschutz': {
        range: 0,
        kontakt: false,
        effect: "Erhöht den Verteidigungswert um 1 Stufe.",
        buff: true,
        buffedStats: ["Verteidigung"],
        notOffensive: true
    },
    'eisenabwehr': {
        range: 0,
        kontakt: false,
        effect: "Erhöht den Verteidigungswert um 2 Stufen.",
        buff: true,
        buffedStats: ["Verteidigung"],
        notOffensive: true
    },
    'einigler': {
        range: 0,
        kontakt: false,
        effect: "Halbiert den Schaden einer eingehenden Attacke.",
        notOffensive: true,
        reaction: true
    },
    'walzer': {
        range: 10,
        kontakt: true,
        effect: "Rollt in einer geraden Linie über ein Ziel bis zum Rand der Arena. Wird mit jeder weiteren Nutzung und nach Einigler stärker."
    },
    'agilität': {
        range: 0,
        kontakt: false,
        effect: "Erhöht die Initiative um 2 Stufen.",
        buff: true,
        buffedStats: ["Initiative"],
        notOffensive: true
    },
    'explosion': {
        range: 6,
        cone: 360,
        kontakt: false,
        effect: "Das Pokemon detoniert und richtet massiven Schaden um sich herum an, besiegt sich dabei aber selbst."
    },
    'sonnentag': {
        range: 0,
        kontakt: false,
        effect: "Lässt für 5 Runden intensiv die Sonne scheinen.",
        notOffensive: true
    },
    'regentanz': {
        range: 0,
        kontakt: false,
        effect: "Lässt es für 5 Runden regnen.",
        notOffensive: true
    },
    'sandsturm': {
        range: 0,
        kontakt: false,
        effect: "Ruft für 5 Runden einen Sandsturm herbei!",
        notOffensive: true
    },
    'hagelsturm': {
        range: 0,
        kontakt: false,
        effect: "Ruft für 5 Runden einen Hagelsturm herbei!",
        notOffensive: true
    },
    'schneelandschaft': {
        range: 0,
        kontakt: false,
        effect: "Hüllt die ganze Arena für 5 Runden in Schnee.",
        notOffensive: true
    },
    'toxin': {
        range: 3,
        kontakt: false,
        effect: "Vergiftet das Ziel schwer."
    },
    'tackle': {
        range: 1,
        kontakt: true
    },
    'aromakur': {
        range: 6,
        cone: 360,
        kontakt: false,
        support: true,
        effect: "Heilt alle Ziele in Reichweite (inklusive den Anwender) von allen negativen Statuseffekten.",
        notOffensive: true
    },
    'blitzkanone': {
        range: 20,
        kontakt: false,
        effect: "Durchbohrt Ziele und trifft alles in einer Linie. Getroffene Ziele werden paralysiert. -2 Erfolge auf GENA-Probe."
    },
    'bohrschnabel': {
        range: 1,
        kontakt: true,
    },
    'flammenwurf': {
        range: 5,
        kontakt: false,
        effect: "Schießt eine große Menge Flammen grob in Blickrichtung. 3+ Erfolge: Getroffene Ziele werden verbrannt."
    },
    'blubbstrahl': {
        range: 5,
        kontakt: false,
        effect: "Schießt eine große Mengen Blasen grob in Blickrichtung. 3+ Erfolge: Getroffene Ziele werden um eine Stufe langsamer."
    },
    'donner': {
        range: 15,
        kontakt: false,
        effect: "Lässt einen Blitz aus heiterem Himmel auf ein 3x3 Felder großes Zielgebiet niedergehen. -1 automatischer Erfolg. 3+ Erfolge: Alle getroffenen Ziele werden paralysiert."
    },
    'eisstrahl': {
        range: 10,
        kontakt: false,
        strahl: true,
        effect: "Trifft alle Ziele in einer geraden Linie. 4+ Erfolge: Friert alle getroffenen Ziele ein."
    },
    'härtner': {
        range: 0,
        kontakt: false,
        effect: "REAKTION: Erhöht VERT um eine Stufe.",
        buff: true,
        buffedStats: ["Verteidigung"],
        notOffensive: true,
        reaction: true
    },
};