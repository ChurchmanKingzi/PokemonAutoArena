/**
 * Item service for Pokemon items
 */

// Available items with their German names and effects
const POKEMON_ITEMS = {
    'fokus-band': {
        name: 'Fokus-Band',
        effect: 'Immer, wenn die KP eines Pokemon auf 0 fallen würden: 10%-Chance, dass sie stattdessen auf 1 fallen.'
    },
    'fokus-gurt': {
        name: 'Fokus-Gurt', 
        effect: 'Lässt das Pokemon einen Treffer mit 1 KP überleben, wenn die KP voll waren.'
    },
    'lebensorb': {
        name: 'Lebensorb',
        effect: 'Eigene Attacken fügen +50% Schaden zu, aber das Pokemon verliert bei jedem Angriff 10% max KP.'
    },
    'prunusbeere': {
        name: 'Prunusbeere',
        effect: 'Wird bei Status-Problem gegessen, um den Statuseffekt zu beheben.'
    },
    'wahlband': {
        name: 'Wahlband',
        effect: 'Erhöht den Angriff, aber nur eine Attacke kann verwendet werden.'
    },
    'wahlglas': {
        name: 'Wahlglas',
        effect: 'Erhöht den Spezial-Angriff, aber nur eine Attacke kann verwendet werden.'
    },
    'wahlschal': {
        name: 'Wahlschal',
        effect: 'Erhöht die Initiative, aber nur eine Attacke kann verwendet werden.'
    }
};

/**
 * Get all available items
 * @returns {Array} - Array of item objects with id, name, and effect
 */
export function getAvailableItems() {
    return Object.entries(POKEMON_ITEMS).map(([id, data]) => ({
        id,
        name: data.name,
        effect: data.effect
    }));
}

/**
 * Get item by ID
 * @param {string} itemId - The item ID
 * @returns {Object|null} - Item object or null if not found
 */
export function getItemById(itemId) {
    if (!itemId || !POKEMON_ITEMS[itemId]) {
        return null;
    }
    
    return {
        id: itemId,
        name: POKEMON_ITEMS[itemId].name,
        effect: POKEMON_ITEMS[itemId].effect
    };
}

/**
 * Get item name by ID
 * @param {string} itemId - The item ID
 * @returns {string} - Item name or empty string if not found
 */
export function getItemName(itemId) {
    const item = getItemById(itemId);
    return item ? item.name : '';
}

/**
 * Get item effect by ID
 * @param {string} itemId - The item ID
 * @returns {string} - Item effect or empty string if not found
 */
export function getItemEffect(itemId) {
    const item = getItemById(itemId);
    return item ? item.effect : '';
}