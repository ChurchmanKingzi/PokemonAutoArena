/**
 * Angler catches system - determines what Pokemon are caught when fishing
 */

import { getCharacterTemplate, enhanceCharacterWithMoves } from '../characterManager.js';
import { initializeCharacter } from '../teamManager.js';

// Define rarity categories with German Pokemon names
const ANGLER_CATCHES = {
    COMMON: [
        'Tentacha', 'Seeper', 'Jurob', 'Sterndu', 'Kabuto', 'Lampi', 'Felino', 'Remoraid',
        'Hydropi', 'Loturzel', 'Kanivanha', 'Schmerbe', 'Perlu', 'Finneon', 'Schallquap',
        'Galapaflos', 'Scampisto', 'Robball', 'Karpador', 'Barschwa', 'Normifin', 'Quapsel',
        'Muschas', 'Goldini', 'Amonitas', 'Karnimani', 'Corasonn', 'Mantirps', 'Wailmer',
        'Schalellos', 'Barschuft', 'Krabby', 'Krebscorps'
    ],
    UNCOMMON: [
        'Tentoxa', 'Seemon', 'Jugong', 'Lanturn', 'Octillery', 'Tohaido', 'Welsar', 'Aalabyss',
        'Saganabyss', 'Lumineon', 'Mebrana', 'Karippas', 'Mamolida', 'Wummer', 'Knirfish',
        'Delfinator', 'Nigiragi', 'Quaputzi', 'Kingler', 'Golking', 'Tyracroc', 'Baldorfish',
        'Krebutak', 'Liebiskus'
    ],
    RARE: [
        'Starmie', 'Kabutops', 'Branawarz', 'Garados', 'Milotic', 'Quappo', 'Quaxo', 'Austos',
        'Amoroso', 'Gorgasonn', 'Mantax', 'Wailord', 'Relicanth', 'Gastrodon'
    ],
    VERY_RARE: [
        'Seedraking', 'Phione', 'Quajutsu', 'Heerashai'
    ],
    LEGENDARY: [
        'Tohaido (Mega)', 'Garados (Mega)', 'Kyogre', 'Manaphy', 'Suicune', 'Palkia'
    ]
};

// Rarity chances (cumulative percentages)
const RARITY_CHANCES = {
    COMMON: 40,      // 1-40
    UNCOMMON: 70,    // 41-70  
    RARE: 90,        // 71-90
    VERY_RARE: 98,   // 91-98
    LEGENDARY: 100   // 99-100
};

/**
 * Roll for a Pokemon catch and return the Pokemon object
 * @param {number} teamIndex - Index of the team that's fishing (for team-specific bonuses later)
 * @returns {Promise<Object|null>} - Promise that resolves to the caught Pokemon object or null if failed
 */
export async function rollAnglerCatch(teamIndex = 0) {
    try {
        // Roll 1-100 for rarity
        const rarityRoll = Math.floor(Math.random() * 100) + 1;
        
        // Determine rarity based on roll
        let selectedRarity;
        if (rarityRoll <= RARITY_CHANCES.COMMON) {
            selectedRarity = 'COMMON';
        } else if (rarityRoll <= RARITY_CHANCES.UNCOMMON) {
            selectedRarity = 'UNCOMMON';
        } else if (rarityRoll <= RARITY_CHANCES.RARE) {
            selectedRarity = 'RARE';
        } else if (rarityRoll <= RARITY_CHANCES.VERY_RARE) {
            selectedRarity = 'VERY_RARE';
        } else {
            selectedRarity = 'LEGENDARY';
        }
                
        // Get the Pokemon list for this rarity
        const pokemonList = ANGLER_CATCHES[selectedRarity];
        if (!pokemonList || pokemonList.length === 0) {
            return null;
        }
        
        // Randomly select a Pokemon from the rarity list
        const randomIndex = Math.floor(Math.random() * pokemonList.length);
        const selectedPokemonName = pokemonList[randomIndex];
                
        // Find the Pokemon in the loaded Pokemon cache by German name
        const pokemonTemplate = await findPokemonByGermanName(selectedPokemonName);
        if (!pokemonTemplate) {
            console.error(`Could not find Pokemon template for: ${selectedPokemonName}`);
            return null;
        }
        
        // Create the Pokemon object following the same process as team builder
        const pokemon = await createAnglerPokemon(pokemonTemplate);
                return pokemon;
        
    } catch (error) {
        return null;
    }
}

/**
 * Find a Pokemon template by its German name
 * @param {string} germanName - German name of the Pokemon
 * @returns {Promise<Object|null>} - Pokemon template or null if not found
 */
async function findPokemonByGermanName(germanName) {
    try {
        // Import the Pokemon cache
        const { getAvailableTemplates } = await import('../characterManager.js');
        const templates = await getAvailableTemplates();
        
        // Get the full Pokemon data to access German names
        const { loadPokemon } = await import('../characterManager.js');
        const pokemonCache = await loadPokemon();
        
        // Find Pokemon by German name in the cache
        const foundPokemon = pokemonCache.find(pokemon => 
            pokemon.name === germanName || 
            pokemon.name.includes(germanName) ||
            // Handle Mega forms
            (germanName.includes('(Mega)') && pokemon.name.includes('(Mega)') && 
             pokemon.name.includes(germanName.replace(' (Mega)', '')))
        );
        
        if (foundPokemon) {
            return getCharacterTemplate(foundPokemon.id);
        }
        
        console.warn(`Pokemon not found in cache: ${germanName}`);
        return null;
        
    } catch (error) {
        console.error(`Error finding Pokemon by German name: ${germanName}`, error);
        return null;
    }
}

/**
 * Create an angler Pokemon object following the same process as team builder
 * @param {Object} pokemonTemplate - Base Pokemon template
 * @returns {Promise<Object>} - Fully initialized Pokemon object
 */
async function createAnglerPokemon(pokemonTemplate) {
    try {
        // Initialize character abilities, strategy, etc. (same as team builder)
        initializeCharacter(pokemonTemplate);
        
        // Enhance with moves data
        const enhancedPokemon = await enhanceCharacterWithMoves(pokemonTemplate);
        
        // Assign random moves (same as team builder)
        await assignRandomMovesToAnglerPokemon(enhancedPokemon);
        
        // Set default strategy for wild Pokemon
        enhancedPokemon.strategy = 'aggressive';
        enhancedPokemon.forcingMode = 'always';
        
        // Mark as angler-caught Pokemon (for potential special handling)
        enhancedPokemon.isAnglerCatch = true;
        enhancedPokemon.originalTeam = null; // No original team
        
        // Generate a unique ID for this specific instance
        enhancedPokemon.uniqueId = `angler_${pokemonTemplate.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        return enhancedPokemon;
        
    } catch (error) {
        console.error('Error creating angler Pokemon:', error);
        throw error;
    }
}

/**
 * Assign random moves to an angler Pokemon (similar to team builder randomization)
 * @param {Object} pokemon - The Pokemon to assign moves to
 */
async function assignRandomMovesToAnglerPokemon(pokemon) {
    try {
        // Import the required functions
        const { RANGED_WEAPON_TYPES } = await import('../charakterAuswahlConfig.js');
        const { shuffleArray } = await import('../utils.js');
        
        if (!pokemon || !pokemon.availableMoves || pokemon.availableMoves.length === 0) {
            return;
        }
        
        // Initialize selected moves array if not present
        if (!pokemon.selectedMoves) {
            pokemon.selectedMoves = [null, null, null, null];
        }
        
        // Get moves from RANGED_WEAPON_TYPES that this Pokemon can learn
        const validMoves = pokemon.availableMoves.filter(move => {
            // Check if the move exists in RANGED_WEAPON_TYPES
            const normalizedMoveName = move.name.toLowerCase();
            return RANGED_WEAPON_TYPES[normalizedMoveName] !== undefined;
        });
        
        // Shuffle the valid moves
        const shuffledMoves = shuffleArray(validMoves);
        
        // Select up to 4 moves
        const numMovesToAssign = Math.min(4, shuffledMoves.length);
        
        // Clear existing moves
        pokemon.selectedMoves = [null, null, null, null];
        
        // Assign the moves to the Pokemon
        for (let i = 0; i < numMovesToAssign; i++) {
            pokemon.selectedMoves[i] = shuffledMoves[i];
        }
        
        // Convert selectedMoves to actual attacks for the character
        updateCharacterAttacks(pokemon);        
    } catch (error) {
        console.error('Error assigning moves to angler Pokemon:', error);
    }
}

/**
 * Update a character's attacks based on selected moves (copied from teamManager.js)
 * @param {Object} character - The character to update
 */
function updateCharacterAttacks(character) {
    if (!character) return;
    
    // Create attacks array if it doesn't exist
    if (!character.attacks) {
        character.attacks = [];
    }
    
    // Reset attacks array with just the basic Verzweifler attack
    character.attacks = [{
        type: 'melee',
        weaponName: "Verzweifler",
        damage: 5,
        range: 1,
        category: 'physisch'
    }];
    
    // Add selected moves as attacks
    if (character.selectedMoves && Array.isArray(character.selectedMoves)) {
        character.selectedMoves.forEach(move => {
            if (!move) return; // Skip null moves
            
            // Add as an attack with required properties
            character.attacks.push({
                type: move.range > 1 ? 'ranged' : 'melee',
                weaponName: move.name,
                damage: typeof move.strength === 'number' ? move.strength : 1,
                range: move.range || 0,
                pp: move.pp || 0,
                currentPP: move.pp || 0, 
                moveType: move.type, 
                moveTypeDe: move.typeDe,
                category: move.category || 'Physisch', 
                accuracy: move.accuracy,
                cone: move.cone || undefined,
                buff: move.buff || undefined,
                buffedStats: move.buffedStats
            });
        });
    }
    
    // Update the character's max range
    let maxRange = 0;
    character.attacks.forEach(attack => {
        if (attack.range > maxRange) {
            maxRange = attack.range;
        }
    });
    character.range = maxRange;
}

/**
 * Get readable rarity name for logging
 * @param {number} roll - The rarity roll (1-100)
 * @returns {string} - Human readable rarity name
 */
export function getRarityName(roll) {
    if (roll <= RARITY_CHANCES.COMMON) return 'Häufig';
    if (roll <= RARITY_CHANCES.UNCOMMON) return 'Selten';
    if (roll <= RARITY_CHANCES.RARE) return 'Rar';
    if (roll <= RARITY_CHANCES.VERY_RARE) return 'Sehr Rar';
    return 'Legendär';
}