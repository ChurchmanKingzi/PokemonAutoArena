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
    { value: 'fleeing', text: 'Fliehend' }
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
        buffedStats: ["Angriff"]
    },
    'schlitzer': {
        range: 1,
        kontakt: true
    },
};