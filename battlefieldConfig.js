import { updateGridSize } from './config.js';

/**
 * Battlefield configuration management
 */

// Battlefield size presets
export const BATTLEFIELD_SIZES = {
    WINZIG: { name: "Winzig", size: 15 },
    KLEIN: { name: "Klein", size: 25 },
    MITTEL: { name: "Mittel", size: 40 },
    GROSS: { name: "Groß", size: 55 },
    RIESIG: { name: "Riesig", size: 80 }
};

// Battlefield scenario presets
export const BATTLEFIELD_SCENARIOS = {
    EBENE: { name: "Ebene", id: "ebene" },
    SEE: { name: "See", id: "see" },
    GEBIRGE: { name: "Gebirge", id: "gebirge" },
    WUESTE: { name: "Wüste", id: "wueste" },
    MEER: { name: "Meer", id: "meer" },
    VULKAN: { name: "Vulkan", id: "vulkan" },
    SUMPF: { name: "Sumpf", id: "sumpf" },
    EISWUESTE: { name: "Eiswüste", id: "eiswueste" },
    ZUFALLSMIX: { name: "Zufallsmix", id: "zufallsmix" }
};

// Current battlefield configuration (defaults)
let currentConfig = {
    size: BATTLEFIELD_SIZES.MITTEL.size,
    scenario: BATTLEFIELD_SCENARIOS.EBENE.id
};

/**
 * Get the current battlefield configuration
 * @returns {Object} - Current battlefield configuration
 */
export function getBattlefieldConfig() {
    return { ...currentConfig };
}

/**
 * Set the battlefield size
 * @param {string} sizeKey - Size key (from BATTLEFIELD_SIZES)
 */
export function setBattlefieldSize(sizeKey) {
    if (BATTLEFIELD_SIZES[sizeKey]) {
        currentConfig.size = BATTLEFIELD_SIZES[sizeKey].size;
        // Update the grid size in config.js
        updateGridSize(currentConfig.size);
    }
}

/**
 * Set the battlefield scenario
 * @param {string} scenarioId - Scenario ID
 */
export function setBattlefieldScenario(scenarioId) {
    // Find scenario by ID
    for (const key in BATTLEFIELD_SCENARIOS) {
        if (BATTLEFIELD_SCENARIOS[key].id === scenarioId) {
            currentConfig.scenario = scenarioId;
            return;
        }
    }
}

/**
 * Reset battlefield configuration to defaults
 */
export function resetBattlefieldConfig() {
    currentConfig = {
        size: BATTLEFIELD_SIZES.MITTEL.size,
        scenario: BATTLEFIELD_SCENARIOS.EBENE.id
    };
    // Update the grid size in config.js
    updateGridSize(currentConfig.size);
}