/**
 * Utility functions for the battle system
 */

import { TEAM_COLORS } from './config.js';
import { getCharacterTemplate, getAvailableTemplates, enhanceCharacterWithMoves } from './characterManager.js';
import { updateFightButtonState } from './arenaBuilder.js';
import { initializeCharacter } from './teamManager.js';
import { updateCharacterAttacks } from './teamManager.js';
import { updateTeamSlots } from './teamManager.js';
import { applyTypeBuff } from './teamManager.js';

import { STRATEGY_OPTIONS, FORCING_MODE_OPTIONS, RANGED_WEAPON_TYPES } from './charakterAuswahlConfig.js';
import { getAvailableItems, getItemById } from './itemService.js';
import { getTrainerClasses, getTrainerClassDescription, getAvailableTrainerIcons } from './classService.js';

const moveDropdownInstances = new Map();

// German Pokemon types
export const GERMAN_POKEMON_TYPES = [
    { id: 'normal', name: 'Normal' },
    { id: 'fire', name: 'Feuer' },
    { id: 'water', name: 'Wasser' },
    { id: 'electric', name: 'Elektro' },
    { id: 'grass', name: 'Pflanze' },
    { id: 'ice', name: 'Eis' },
    { id: 'fighting', name: 'Kampf' },
    { id: 'poison', name: 'Gift' },
    { id: 'ground', name: 'Boden' },
    { id: 'flying', name: 'Flug' },
    { id: 'psychic', name: 'Psycho' },
    { id: 'bug', name: 'Käfer' },
    { id: 'rock', name: 'Gestein' },
    { id: 'ghost', name: 'Geist' },
    { id: 'dragon', name: 'Drache' },
    { id: 'dark', name: 'Unlicht' },
    { id: 'steel', name: 'Stahl' },
    { id: 'fairy', name: 'Fee' }
];

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} - The shuffled array
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Get text representation of a strategy
 * @param {string} strategy - The strategy code
 * @returns {string} - Human-readable strategy text
 */
export function getStrategyText(strategy) {
    switch (strategy) {
        case 'aggressive': return 'Aggressiv';
        case 'defensive': return 'Standhaft';
        case 'fleeing': return 'Fliehend';
        case 'tricky': return 'Tückisch';
        case 'supporting': return 'Unterstützend';
        case 'reinforcing': return 'Verstärkend';
        case 'aiming': return 'Zielend';
        case 'opportunistic': return 'Opportunistisch';
        default: return 'Aggressiv';
    }
}

/**
 * Get border style for a character based on their strategy
 * @param {string} strategy - The strategy code
 * @returns {Object} - Border style properties
 */
export function getStrategyBorderStyle(strategy) {
    switch (strategy) {
        case 'aggressive': 
            return { style: 'solid', width: '3px' }; // Bold solid border for aggressive
        case 'defensive': 
            return { style: 'double', width: '3px' }; // Double border for defensive
        case 'fleeing': 
            return { style: 'dashed', width: '2px' }; // Dashed border for fleeing
        case 'tricky': 
            return { style: 'dotted', width: '3px' }; // Dotted border for tricky
        case 'supporting': 
            return { style: 'ridge', width: '3px' }; // Ridge border for supporting
        case 'reinforcing': 
            return { style: 'groove', width: '3px' }; // Groove border for reinforcing
        case 'aiming': 
            return { style: 'outset', width: '3px' }; // Outset border for aiming
        case 'opportunistic': 
            return { style: 'inset', width: '3px' }; // Inset border for opportunistic
        default: 
            return { style: 'solid' };
    }
}

/**
 * Get a color for a team
 * @param {number} teamIndex - The team index
 * @returns {string} - CSS color value
 */
export function getTeamColor(teamIndex) {
    // Import here to avoid circular dependencies
    
    // Return the color based on team index, cycle through colors if more teams than colors
    return TEAM_COLORS[teamIndex % TEAM_COLORS.length];
}

/**
 * Convert hex color to rgba
 * @param {string} hex - Hex color code
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {string} - RGBA color string
 */
export function hexToRgba(hex, opacity) {
    let r = 0, g = 0, b = 0;
    
    // Handle 3-digit hex
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } 
    // Handle 6-digit hex
    else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Blend two colors together
 * @param {string} baseColor - Base color (hex or rgb)
 * @param {string} overlayColor - Overlay color (rgba)
 * @returns {string} - Resulting blended color
 */
export function blendColors(baseColor, overlayColor) {
    // For simplicity, we'll just return the overlay color
    // A more accurate blend would require converting both colors to rgba and calculating the blend
    return overlayColor;
}

/**
 * Get current KP (hit points) for a character
 * @param {Object} character - Character data
 * @returns {number} - Current KP
 */
export function getCurrentKP(character) {
    // Special case: if currentKP is explicitly set to 0, this value should be kept
    // So we need to check for undefined or null, not falsey values
    if (character.currentKP === undefined || character.currentKP === null) {
        // Initialize with max KP if not set
        if (character.combatStats && character.combatStats.kp) {
            character.currentKP = parseInt(character.combatStats.kp, 10);
        } else {
            character.currentKP = 10; // Default
        }
    } else {
        // Make sure currentKP is a number, not a string
        character.currentKP = parseInt(character.currentKP, 10);
    }
    
    // Store max KP if not already set
    if (character.maxKP === undefined || character.maxKP === null) {
        if (character.combatStats && character.combatStats.kp) {
            character.maxKP = parseInt(character.combatStats.kp, 10);
        } else {
            character.maxKP = 10; // Default
        }
    }
    
    return character.currentKP;
}

/**
 * Apply strategy-specific buffs to a character
 * @param {Object} character - The character to buff
 * @param {string} strategy - The strategy to apply
 */
export function applyStrategyBuffs(character, strategy) {
    // First, remove any existing strategy buffs
    removeStrategyBuffs(character);
    
    // Store original stats if not already stored
    if (!character.originalStatsBeforeStrategyBuff) {
        character.originalStatsBeforeStrategyBuff = {
            bw: character.combatStats?.bw || 0,
            pa: character.combatStats?.pa || 0,
            gena: character.combatStats?.gena || 0
        };
        
        // Store original base stats if they exist
        if (character.statsDetails && character.statsDetails.statsGerman) {
            character.originalBaseStatsBeforeStrategyBuff = { 
                ...character.statsDetails.statsGerman,
                // Store combat stats explicitly
                angriff: character.combatStats?.angriff || character.statsDetails.statsGerman['Angriff'] || 0,
                spAngriff: character.combatStats?.spAngriff || character.statsDetails.statsGerman['Spezial-Angriff'] || 0,
                verteidigung: character.combatStats?.verteidigung || character.statsDetails.statsGerman['Verteidigung'] || 0,
                spVerteidigung: character.combatStats?.spVerteidigung || character.statsDetails.statsGerman['Spezial-Verteidigung'] || 0
            };
        }
    }
    
    // Apply buffs based on strategy
    switch(strategy) {
        case 'aggressive':
            // BW x2
            if (character.combatStats && character.originalStatsBeforeStrategyBuff) {
                character.combatStats.bw = character.originalStatsBeforeStrategyBuff.bw * 2;
            }
            break;
            
        case 'defensive':
            // BW /2, VERT and SP VERT x1.5
            if (character.combatStats && character.originalStatsBeforeStrategyBuff) {
                character.combatStats.bw = Math.ceil(character.originalStatsBeforeStrategyBuff.bw / 2);
                
                // Apply defense buffs if we have the stats available
                if (character.statsDetails && character.statsDetails.statsGerman && character.originalBaseStatsBeforeStrategyBuff) {
                    // Apply to base stats
                    if (character.statsDetails.statsGerman['Verteidigung']) {
                        character.statsDetails.statsGerman['Verteidigung'] = Math.ceil(
                            character.originalBaseStatsBeforeStrategyBuff.verteidigung * 1.5
                        );
                    }
                    
                    if (character.statsDetails.statsGerman['Spezial-Verteidigung']) {
                        character.statsDetails.statsGerman['Spezial-Verteidigung'] = Math.ceil(
                            character.originalBaseStatsBeforeStrategyBuff.spVerteidigung * 1.5
                        );
                    }
                    
                    // Apply to combat stats if they exist
                    if (character.combatStats.verteidigung) {
                        character.combatStats.verteidigung = Math.ceil(
                            character.originalBaseStatsBeforeStrategyBuff.verteidigung * 1.5
                        );
                    }
                    
                    if (character.combatStats.spVerteidigung) {
                        character.combatStats.spVerteidigung = Math.ceil(
                            character.originalBaseStatsBeforeStrategyBuff.spVerteidigung * 1.5
                        );
                    }
                }
            }
            break;
            
        case 'fleeing':
            // PA +3
            if (character.combatStats && character.originalStatsBeforeStrategyBuff) {
                character.combatStats.pa = character.originalStatsBeforeStrategyBuff.pa + 3;
            }
            break;
            
        case 'tricky':
            // +2 GENA
            if (character.combatStats && character.originalStatsBeforeStrategyBuff) {
                character.combatStats.gena = character.originalStatsBeforeStrategyBuff.gena + 2;
            }
            break;
            
        case 'supporting':
            // ANG and SP ANG /2
            if (character.statsDetails && character.statsDetails.statsGerman && character.originalBaseStatsBeforeStrategyBuff) {
                // Apply to base stats
                if (character.statsDetails.statsGerman['Angriff']) {
                    character.statsDetails.statsGerman['Angriff'] = Math.ceil(
                        character.originalBaseStatsBeforeStrategyBuff.angriff / 2
                    );
                }
                
                if (character.statsDetails.statsGerman['Spezial-Angriff']) {
                    character.statsDetails.statsGerman['Spezial-Angriff'] = Math.ceil(
                        character.originalBaseStatsBeforeStrategyBuff.spAngriff / 2
                    );
                }
                
                // Apply to combat stats if they exist
                if (character.combatStats.angriff) {
                    character.combatStats.angriff = Math.ceil(
                        character.originalBaseStatsBeforeStrategyBuff.angriff / 2
                    );
                }
                
                if (character.combatStats.spAngriff) {
                    character.combatStats.spAngriff = Math.ceil(
                        character.originalBaseStatsBeforeStrategyBuff.spAngriff / 2
                    );
                }
            }
            break;
            
        case 'aiming':
            // BW /4
            if (character.combatStats && character.originalStatsBeforeStrategyBuff) {
                character.combatStats.bw = Math.ceil(character.originalStatsBeforeStrategyBuff.bw / 4);
            }
            break;
            
        // No buffs for 'reinforcing' and 'opportunistic'
    }
    
    // Mark character as having strategy buffs applied
    character.hasStrategyBuffs = true;
    character.currentStrategy = strategy;
}

/**
 * Remove strategy-specific buffs from a character (IMPROVED VERSION)
 * @param {Object} character - The character to remove buffs from
 */
export function removeStrategyBuffs(character) {
    if (!character.hasStrategyBuffs) {
        return;
    }
    
    // If we don't have stored original stats, recalculate them
    if (!character.originalStatsBeforeStrategyBuff) {
        const originalStats = calculateOriginalStatsFromBase(character);
        character.originalStatsBeforeStrategyBuff = {
            bw: originalStats.bw,
            pa: originalStats.pa,
            gena: originalStats.gena
        };
        
        if (character.statsDetails && character.statsDetails.statsGerman) {
            character.originalBaseStatsBeforeStrategyBuff = { 
                ...originalStats.baseStats,
                angriff: originalStats.baseStats['Angriff'] || 0,
                spAngriff: originalStats.baseStats['Spezial-Angriff'] || 0,
                verteidigung: originalStats.baseStats['Verteidigung'] || 0,
                spVerteidigung: originalStats.baseStats['Spezial-Verteidigung'] || 0
            };
        }
    }
    
    // Restore original stats
    if (character.combatStats && character.originalStatsBeforeStrategyBuff) {
        // Restore BW, PA, GENA
        if (character.originalStatsBeforeStrategyBuff.bw !== undefined) {
            character.combatStats.bw = character.originalStatsBeforeStrategyBuff.bw;
        }
        
        if (character.originalStatsBeforeStrategyBuff.pa !== undefined) {
            character.combatStats.pa = character.originalStatsBeforeStrategyBuff.pa;
        }
        
        if (character.originalStatsBeforeStrategyBuff.gena !== undefined) {
            character.combatStats.gena = character.originalStatsBeforeStrategyBuff.gena;
        }
        
        // Restore combat attack/defense stats if they exist
        if (character.originalBaseStatsBeforeStrategyBuff) {
            if (character.combatStats.angriff !== undefined && character.originalBaseStatsBeforeStrategyBuff.angriff !== undefined) {
                character.combatStats.angriff = character.originalBaseStatsBeforeStrategyBuff.angriff;
            }
            
            if (character.combatStats.spAngriff !== undefined && character.originalBaseStatsBeforeStrategyBuff.spAngriff !== undefined) {
                character.combatStats.spAngriff = character.originalBaseStatsBeforeStrategyBuff.spAngriff;
            }
            
            if (character.combatStats.verteidigung !== undefined && character.originalBaseStatsBeforeStrategyBuff.verteidigung !== undefined) {
                character.combatStats.verteidigung = character.originalBaseStatsBeforeStrategyBuff.verteidigung;
            }
            
            if (character.combatStats.spVerteidigung !== undefined && character.originalBaseStatsBeforeStrategyBuff.spVerteidigung !== undefined) {
                character.combatStats.spVerteidigung = character.originalBaseStatsBeforeStrategyBuff.spVerteidigung;
            }
        }
    }
    
    // Restore base stats if they exist
    if (character.statsDetails && character.statsDetails.statsGerman && character.originalBaseStatsBeforeStrategyBuff) {
        if (character.originalBaseStatsBeforeStrategyBuff['Angriff'] !== undefined) {
            character.statsDetails.statsGerman['Angriff'] = character.originalBaseStatsBeforeStrategyBuff['Angriff'];
        }
        
        if (character.originalBaseStatsBeforeStrategyBuff['Spezial-Angriff'] !== undefined) {
            character.statsDetails.statsGerman['Spezial-Angriff'] = character.originalBaseStatsBeforeStrategyBuff['Spezial-Angriff'];
        }
        
        if (character.originalBaseStatsBeforeStrategyBuff['Verteidigung'] !== undefined) {
            character.statsDetails.statsGerman['Verteidigung'] = character.originalBaseStatsBeforeStrategyBuff['Verteidigung'];
        }
        
        if (character.originalBaseStatsBeforeStrategyBuff['Spezial-Verteidigung'] !== undefined) {
            character.statsDetails.statsGerman['Spezial-Verteidigung'] = character.originalBaseStatsBeforeStrategyBuff['Spezial-Verteidigung'];
        }
    }
    
    // Clear strategy buff flags but don't clear stored original stats
    // (Keep them for potential future strategy changes)
    character.hasStrategyBuffs = false;
    character.currentStrategy = null;
}

/**
 * Generate a random team for the specified team index
 * @param {number} teamIndex - The index of the team to randomize
 */
export async function generateRandomTeam(teamIndex, trainers, teamAssignments) {
    try {
        // Show a loading indicator for the affected team
        const teamElement = document.querySelector(`.team[data-team="${teamIndex}"]`);
        if (teamElement) {
            teamElement.classList.add('team-refresh-animation');
            setTimeout(() => {
                teamElement.classList.remove('team-refresh-animation');
            }, 1000);
        }
        
        // Randomize trainer attributes FIRST
        await randomizeTrainer(teamIndex, trainers);
        
        // Get the number of fighters per team
        const fightersPerTeam = parseInt(document.getElementById('fighters-per-team').value);
        
        // Get all available Pokemon templates
        const templates = await getAvailableTemplates();
        
        if (!templates || templates.length === 0) {
            console.error("No Pokemon templates available");
            return;
        }

        // --- Get detailed Pokemon data for all templates ---
        const detailedPokemon = [];
        
        for (const template of templates) {
            // Get the full Pokemon template with all details
            const pokemon = getCharacterTemplate(template.id);
            if (pokemon && pokemon.statsDetails) {
                // Add to our detailed collection
                detailedPokemon.push({
                    template: template,
                    details: pokemon
                });
            }
        }
        
        // --- Filter Pokemon based on requirements ---
        
        // 1. Get fully evolved Pokemon (base stat total > 350)
        const fullyEvolved = detailedPokemon.filter(p => {
            return p.details.statsDetails && 
                   p.details.statsDetails.baseStatTotal > 350;
        });
        
        // 2. Identify legendary Pokemon (base stat total > 580)
        const legendaries = fullyEvolved.filter(p => 
            p.details.statsDetails && 
            p.details.statsDetails.baseStatTotal > 580
        );
        
        // 3. Identify Mega Pokemon (name contains "Mega")
        const megaPokemon = fullyEvolved.filter(p => 
            p.details.name && p.details.name.includes("(Mega)")
        );
        
        // 4. Regular Pokemon (not legendary or mega)
        const regularPokemon = fullyEvolved.filter(p => {
            const isLegendary = p.details.statsDetails && 
                                p.details.statsDetails.baseStatTotal > 580;
            const isMega = p.details.name && p.details.name.includes("(Mega)");
            return !isLegendary && !isMega;
        });
        
        // Clear current team
        teamAssignments[teamIndex] = [];
        for (let i = 0; i < fightersPerTeam; i++) {
            teamAssignments[teamIndex][i] = null;
        }
        
        // Create a pool of Pokemon to select from
        let selectedPokemon = [];
        
        // If 4+ team members, include 1 legendary and 1 mega
        if (fightersPerTeam >= 4) {
            // Add 1 random legendary
            if (legendaries.length > 0) {
                const legendaryIndex = Math.floor(Math.random() * legendaries.length);
                selectedPokemon.push(legendaries[legendaryIndex]);
            }
            
            // Add 1 random mega
            if (megaPokemon.length > 0) {
                const megaIndex = Math.floor(Math.random() * megaPokemon.length);
                selectedPokemon.push(megaPokemon[megaIndex]);
            }
        } else {
            // For smaller teams, maybe add a legendary or mega
            // 50% chance to add a legendary if available
            if (legendaries.length > 0 && Math.random() > 0.5) {
                const legendaryIndex = Math.floor(Math.random() * legendaries.length);
                selectedPokemon.push(legendaries[legendaryIndex]);
            }
            // 50% chance to add a mega if available and we didn't already pick one
            else if (megaPokemon.length > 0 && Math.random() > 0.5) {
                const megaIndex = Math.floor(Math.random() * megaPokemon.length);
                selectedPokemon.push(megaPokemon[megaIndex]);
            }
        }
        
        // Fill the rest with regular Pokemon
        while (selectedPokemon.length < fightersPerTeam) {
            if (regularPokemon.length === 0) break;
            
            const regularIndex = Math.floor(Math.random() * regularPokemon.length);
            selectedPokemon.push(regularPokemon[regularIndex]);
            
            // Remove selected Pokemon to avoid duplicates
            regularPokemon.splice(regularIndex, 1);
        }
        
        // Shuffle the selected Pokemon for random order
        selectedPokemon = shuffleArray(selectedPokemon);
        
        // Prepare items for random assignment - ensure each Pokemon gets a different item
        const availableItems = getAvailableItems();
        const shuffledItems = shuffleArray([...availableItems]);
        
        // Add the selected Pokemon to the team
        // Process each Pokemon sequentially to avoid race conditions
        for (let slotIndex = 0; slotIndex < selectedPokemon.length; slotIndex++) {
            const pokemonData = selectedPokemon[slotIndex];
            
            // We already have the template data in our selection
            if (pokemonData && pokemonData.template) {
                // Get the Pokemon template by ID
                const templateId = pokemonData.template.id;
                const template = getCharacterTemplate(templateId);
                
                if (template) {
                    // Initialize character abilities, strategy, etc.
                    initializeCharacter(template);
                    
                    // Enhance with moves data and wait for it to complete
                    const enhancedPokemon = await enhanceCharacterWithMoves(template);
                    
                    // Assign valid random moves to the Pokemon
                    await assignRandomMoves(enhancedPokemon);
                    
                    // Assign a unique item to each Pokemon (70% chance)
                    // This ensures variety and no two Pokemon have the same item
                    if (Math.random() < 0.7 && shuffledItems.length > 0) {
                        // Take the next available item from our shuffled list
                        const assignedItem = shuffledItems.shift();
                        enhancedPokemon.selectedItem = assignedItem;
                    }
                    
                    // Add to team
                    teamAssignments[teamIndex][slotIndex] = enhancedPokemon;
                }
            }
        }
        
        // APPLY TYPE BUFFS AFTER ALL POKEMON ARE ADDED
        const trainer = trainers[teamIndex];
        if (trainer && trainer.favoriteType) {
            // Check each Pokemon in the team and apply buffs if they match the favorite type
            teamAssignments[teamIndex].forEach(pokemon => {
                if (!pokemon) return;
                
                // Check if Pokemon has the trainer's favorite type
                const hasType = pokemon.pokemonTypes && pokemon.pokemonTypes.some(type => 
                    type.toLowerCase() === trainer.favoriteType.toLowerCase()
                );
                
                if (hasType) {
                    applyTypeBuff(pokemon, teamIndex);
                }
            });
        }
        
        // Update the UI to show the new team
        updateTeamSlots();

        // Apply type coloring to ALL teams (not just the randomized one)
        for (let teamIdx = 0; teamIdx < teamAssignments.length; teamIdx++) {
            if (teamAssignments[teamIdx]) {
                teamAssignments[teamIdx].forEach((pokemon, slotIndex) => {
                    if (pokemon) {
                        // Small delay to ensure DOM is updated
                        setTimeout(() => {
                            applyMoveTypeColoring(teamIdx, slotIndex, pokemon);
                        }, 100);
                    }
                });
            }
        }
        
        // Update fight button state
        updateFightButtonState();
        
    } catch (error) {
        console.error("Error generating random team:", error);
    }
}



/**
 * Randomize trainer attributes for a team
 * @param {number} teamIndex - The index of the team to randomize
 */
async function randomizeTrainer(teamIndex, trainers) {
    try {
        // Randomize trainer name
        const trainerNames = [
            'Alex', 'Ama', 'Asher', 'Baylee', 'Branden', 'Celia', 'Clemens', 'Cyrus', 'Dante', 'Eberhard', 'Ed', 'Eliza', 'Eloise', 'Fimo', 'Freya', 'Fiona', 'Gemma', 'Georgie',
            'Gary', 'Hedda', 'Heinz', 'Helio', 'Hiro', 'Jago', 'Jessica', 'Joy', 'Kai', 'Kevin', 'Klara', 'Layla', 'Lector', 'Leona', 'Lilia', 'Livvie', 'Lucius', 'Magnus', 'Maisie', 'Marina', 'Merino', 'Miles', 'Mikoto', 'Mimi', 'Mona', 'Monia',
            'Nathan', 'Ophelia', 'Ra', 'Rudolph', 'Stitches', 'Tessa', 'Tim', 'Toby', 'Toras', 'Victor', 'Viktoria', 'Willas', 'Zane'
        ];
        
        const randomName = trainerNames[Math.floor(Math.random() * trainerNames.length)];
        trainers[teamIndex].name = randomName;
        
        // Randomize trainer class
        const trainerClasses = getTrainerClasses();
        const randomClass = trainerClasses[Math.floor(Math.random() * trainerClasses.length)];
        trainers[teamIndex].class = randomClass.id;

        // Randomize Lieblingstyp
        const randomType = GERMAN_POKEMON_TYPES[Math.floor(Math.random() * GERMAN_POKEMON_TYPES.length)];
        trainers[teamIndex].favoriteType = randomType.id;
        
        // Randomize trainer icon
        try {
            const availableIcons = await getAvailableTrainerIcons();
            const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
            trainers[teamIndex].icon = randomIcon;
        } catch (error) {
            console.error('Error loading trainer icons for randomization:', error);
            // Fallback to numbered icons
            const fallbackIcons = [];
            for (let i = 1; i <= 12; i++) {
                fallbackIcons.push(`trainer${i}.png`);
            }
            const randomIcon = fallbackIcons[Math.floor(Math.random() * fallbackIcons.length)];
            trainers[teamIndex].icon = randomIcon;
        }
        
    } catch (error) {
        console.error("Error randomizing trainer:", error);
    }
}

/**
 * Assign random moves to a Pokemon from available moves in RANGED_WEAPON_TYPES
 * @param {Object} pokemon - The Pokemon to assign moves to
 */
async function assignRandomMoves(pokemon) {
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
}

/**
 * Unified Custom Dropdown System
 * Supports tooltips, search, and consistent styling across all dropdown types
 */

// Replace your entire UnifiedCustomDropdown class in utils.js with this complete version

class UnifiedCustomDropdown {
    constructor(config) {
        this.config = {
            placeholder: 'Auswählen...',
            searchable: false,
            showTooltips: false,
            tooltipFunction: null,
            options: [],
            currentValue: '',
            onChange: null,
            className: 'unified-custom-dropdown',
            ...config
        };
        
        this.isOpen = false;
        this.tooltip = null;
        this.dropdown = null;
        this.init();
    }
    
    init() {
        this.createDropdown();
        this.createTooltip();
        this.attachEvents();
    }
    
    createDropdown() {
        // Main wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = `${this.config.className}-wrapper`;
        
        // Dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = this.config.className;
        
        // Trigger button
        this.trigger = document.createElement('div');
        this.trigger.className = `${this.config.className}__trigger`;
        this.trigger.setAttribute('role', 'button');
        this.trigger.setAttribute('aria-haspopup', 'listbox');
        this.trigger.setAttribute('tabindex', '0');
        
        // Set initial trigger text
        this.updateTriggerText();
        
        // Options container
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = `${this.config.className}__options`;
        this.optionsContainer.setAttribute('role', 'listbox');
        
        // Add search if enabled
        if (this.config.searchable) {
            this.createSearchInput();
        }
        
        // Create options
        this.createOptions();
        
        // Assemble
        this.dropdown.appendChild(this.trigger);
        this.dropdown.appendChild(this.optionsContainer);
        this.wrapper.appendChild(this.dropdown);
    }
    
    createSearchInput() {
        const searchContainer = document.createElement('div');
        searchContainer.className = `${this.config.className}__search-container`;
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = `${this.config.className}__search-input`;
        this.searchInput.placeholder = 'Suchen...';
        
        searchContainer.appendChild(this.searchInput);
        this.optionsContainer.appendChild(searchContainer);
        
        // Add search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });
    }
    
    createOptions() {
        this.config.options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = `${this.config.className}__option`;
            optionElement.setAttribute('role', 'option');
            optionElement.setAttribute('data-value', option.value);
            optionElement.textContent = option.text;
            
            // Handle disabled options
            if (option.disabled) {
                optionElement.classList.add('disabled');
                optionElement.setAttribute('aria-disabled', 'true');
                optionElement.style.cursor = 'not-allowed';
            }
            
            // Mark as selected if current value
            if (option.value === this.config.currentValue) {
                optionElement.classList.add('selected');
                optionElement.setAttribute('aria-selected', 'true');
            }
            
            // Add tooltip events if enabled
            if (this.config.showTooltips && this.config.tooltipFunction) {
                optionElement.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e.target, option);
                });
                
                optionElement.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
            }
            
            // Add click handler only for enabled options
            if (!option.disabled) {
                optionElement.addEventListener('click', () => {
                    this.selectOption(option);
                });
            }
            
            this.optionsContainer.appendChild(optionElement);
        });
    }
    
    createTooltip() {
        if (this.config.showTooltips) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = `${this.config.className}__tooltip`;
            this.tooltip.style.display = 'none';
            document.body.appendChild(this.tooltip);
        }
    }
    
    attachEvents() {
        // Toggle dropdown
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Keyboard support
        this.trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.dropdown.classList.add('open');
        this.trigger.setAttribute('aria-expanded', 'true');
        this.positionOptions();
        
        // Focus search input if available
        if (this.searchInput) {
            setTimeout(() => this.searchInput.focus(), 50);
        }
    }
    
    close() {
        this.isOpen = false;
        this.dropdown.classList.remove('open');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.hideTooltip();
        
        // Clear search
        if (this.searchInput) {
            this.searchInput.value = '';
            this.filterOptions('');
        }
    }
    
    positionOptions() {
        const triggerRect = this.trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const optionsHeight = this.optionsContainer.scrollHeight;
        
        // Reset positioning
        this.optionsContainer.style.top = '';
        this.optionsContainer.style.bottom = '';
        
        // Check if there's space below
        if (triggerRect.bottom + optionsHeight > viewportHeight - 20) {
            // Position above
            this.optionsContainer.style.bottom = '100%';
            this.optionsContainer.classList.add('positioned-above');
        } else {
            // Position below
            this.optionsContainer.style.top = '100%';
            this.optionsContainer.classList.remove('positioned-above');
        }
    }
    
    selectOption(option) {
        // Don't select disabled options
        if (option.disabled) return;
        
        // Update current value
        this.config.currentValue = option.value;
        
        // Update UI
        this.updateTriggerText();
        this.updateSelectedOption();
        
        // Call onChange callback
        if (this.config.onChange) {
            this.config.onChange(option.value, option);
        }
        
        // Close dropdown
        this.close();
    }
    
    updateTriggerText() {
        const selectedOption = this.config.options.find(opt => opt.value === this.config.currentValue);
        this.trigger.textContent = selectedOption ? selectedOption.text : this.config.placeholder;
    }
    
    updateSelectedOption() {
        this.optionsContainer.querySelectorAll(`.${this.config.className}__option`).forEach(opt => {
            opt.classList.remove('selected');
            opt.setAttribute('aria-selected', 'false');
            if (opt.dataset.value === this.config.currentValue) {
                opt.classList.add('selected');
                opt.setAttribute('aria-selected', 'true');
            }
        });
    }
    
    filterOptions(searchTerm) {
        const options = this.optionsContainer.querySelectorAll(`.${this.config.className}__option`);
        const term = searchTerm.toLowerCase();
        
        options.forEach(option => {
            // Skip the search container itself
            if (option.classList.contains(`${this.config.className}__search-container`)) {
                return;
            }
            
            const text = option.textContent.toLowerCase();
            if (text.includes(term)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }
    
    showTooltip(element, option) {
        if (!this.tooltip || !this.config.tooltipFunction) return;
        
        const tooltipContent = this.config.tooltipFunction(option);
        if (!tooltipContent) return;
        
        this.tooltip.innerHTML = tooltipContent;
        
        // Position tooltip
        const elementRect = element.getBoundingClientRect();
        let left = elementRect.right + 15;
        
        // Check if tooltip fits on right side
        const tooltipWidth = 350; // Approximate width
        if (left + tooltipWidth > window.innerWidth) {
            left = elementRect.left - tooltipWidth - 15;
            this.tooltip.classList.add('positioned-left');
        } else {
            this.tooltip.classList.remove('positioned-left');
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${elementRect.top}px`;
        this.tooltip.style.display = 'block';
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
    
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            document.body.removeChild(this.tooltip);
        }
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }
    
    setValue(value) {
        this.config.currentValue = value;
        this.updateTriggerText();
        this.updateSelectedOption();
    }
    
    /**
     * Update the dropdown options with new data
     * @param {Array} newOptions - Array of new option objects
     */
    updateOptions(newOptions) {
        // Update the config with new options
        this.config.options = newOptions;
        
        // Store search container if it exists
        const searchContainer = this.optionsContainer.querySelector(`.${this.config.className}__search-container`);
        
        // Clear all existing options
        this.optionsContainer.innerHTML = '';
        
        // Re-add search container if it existed
        if (searchContainer) {
            this.optionsContainer.appendChild(searchContainer);
        }
        
        // Recreate all options with the new data
        this.createOptions();
        
        // Update the trigger text to reflect current selection
        this.updateTriggerText();
        
        // Update the selected state of options
        this.updateSelectedOption();
        
        console.log(`Updated dropdown options: ${newOptions.length} options`);
    }
    
    getElement() {
        return this.wrapper;
    }
}

// Tooltip generation functions for different dropdown types
const DropdownTooltips = {
    strategy: (option) => {
        const descriptions = {
            'aggressive': 'Das Pokemon bewegt sich so schnell es kann auf den nächsten Gegner zu, um ihn anzugreifen. BW x2.',
            'defensive': 'Das Pokemon bewegt sich vorsichtig auf den nächsten Gegner zu. BW /2, VERT + SP VERT +50%.',
            'fleeing': 'Das Pokemon bewegt sich solange von allen Gegnern weg, bis nur noch es und andere Fliehende Verbündete übrig sind. Dann fühlt es sich in die Ecke gedrängt und greift an. PA +3.',
            'tricky': 'Das Pokemon bewegt sich auf den nächsten Gegner zu und wird immer Status-Attacken gegen diesen einsetzen, wenn es kann. +2 GENA.',
            'supporting': 'Das Pokemon wird immer heilende/unterstützende Attacken priorisieren, falls möglich. Es hält sich dafür oft in der Nähe von Teammitgliedern, statt aktiv Gegner anzugreifen. ANG + SP ANG -50%, aber Effekte, die Statuswerte anderer erhöhen, erhöhen sie um eine Stufe mehr.',
            'reinforcing': 'Das Pokemon bewegt sich auf den nächsten Gegner zu. Es setzt mit dreifacher Wahrscheinlichkeit Buff-Attacken ein.',
            'aiming': 'Das Pokemon bewegt sich nur mit einem Viertel seiner BW und versucht stets, auf maximaler Distanz zu bleiben und priorisiert Fernkampf-Angriffe. Seine Fernkampfangriffe landen mit einem Erfolg weniger kritische Treffer.',
            'opportunistic': 'Das Pokemon bewegt sich immer auf den Gegner mit den geringsten KP zu, um diesem den Rest zu geben. Der Grundschaden seiner Attacken gegen Ziele mit weniger als 50% KP ist um 2W6 erhöht.'
        };
        
        return `
            <div class="tooltip-header">
                <strong>${option.text}</strong>
            </div>
            <div class="tooltip-description">
                ${descriptions[option.value] || 'Beschreibung nicht verfügbar.'}
            </div>
        `;
    },
    
    trainerClass: (option) => {
        // Use the existing getTrainerClassDescription function
        const description = getTrainerClassDescription(option.value);
        if (!description) return null;
        
        return `
            <div class="tooltip-header">
                <strong>${option.text}</strong>
            </div>
            <div class="tooltip-description">
                ${description}
            </div>
        `;
    },
    
    item: (option) => {
        // Use the existing getItemById function
        const item = getItemById(option.value);
        if (!item || !item.effect) return null;
        
        return `
            <div class="tooltip-header">
                <strong>${item.name}</strong>
            </div>
            <div class="tooltip-description">
                ${item.effect}
            </div>
        `;
    },
    
    move: (option) => {
        // For moves, we'll assume the option contains move data
        if (!option.data) return null;
        
        const move = option.data;
        return `
            <div class="tooltip-header">
                <strong>${move.name}</strong>
            </div>
            <div class="tooltip-content">
                <div><strong>Typ:</strong> <span class="type-badge type-${move.type}">${move.typeDe || move.type}</span></div>
                <div><strong>Stärke:</strong> ${move.strength}d6</div>
                <div><strong>Reichweite:</strong> ${move.range}</div>
                <div><strong>AP:</strong> ${move.pp}</div>
                ${move.effect ? `<div><strong>Effekt:</strong> ${move.effect}</div>` : ''}
            </div>
        `;
    }
};

// Factory functions for creating specific dropdown types
export const DropdownFactory = {
    strategy: (currentValue, onChange) => {
        return new UnifiedCustomDropdown({
            placeholder: 'Strategie wählen',
            options: STRATEGY_OPTIONS,
            currentValue: currentValue || 'aggressive',
            showTooltips: true,
            tooltipFunction: DropdownTooltips.strategy,
            onChange: onChange
        });
    },
    
    terrain: (currentValue, onChange) => {
        const terrainOptions = [
            { value: 'normal', text: 'Normal' },
            { value: 'sand', text: 'Sand' },
            { value: 'lava', text: 'Lava' },
            { value: 'swamp', text: 'Sumpf' }
        ];
        
        return new UnifiedCustomDropdown({
            placeholder: 'Gelände wählen',
            options: terrainOptions,
            currentValue: currentValue || 'normal',
            showTooltips: false,
            onChange: onChange
        });
    },
    
    trainerClass: (currentValue, onChange) => {
        const trainerClasses = getTrainerClasses();
        const options = trainerClasses.map(tc => ({
            value: tc.id,
            text: tc.name
        }));
        
        return new UnifiedCustomDropdown({
            placeholder: 'Klasse wählen',
            options: options,
            currentValue: currentValue || 'angler',
            showTooltips: true,
            tooltipFunction: DropdownTooltips.trainerClass,
            onChange: onChange
        });
    },
    
    favoriteType: (currentValue, onChange) => {
        const options = [
            { value: '', text: 'Typ auswählen' },
            ...GERMAN_POKEMON_TYPES.map(type => ({
                value: type.id,
                text: type.name
            }))
        ];
        
        return new UnifiedCustomDropdown({
            placeholder: 'Lieblingstyp wählen',
            options: options,
            currentValue: currentValue || '',
            showTooltips: false,
            onChange: onChange
        });
    },
    
    forcingMode: (currentValue, onChange) => {
        return new UnifiedCustomDropdown({
            placeholder: 'Forcieren wählen',
            options: FORCING_MODE_OPTIONS,
            currentValue: currentValue || 'always',
            showTooltips: false,
            onChange: onChange
        });
    },
    
    item: (currentValue, onChange) => {
        const availableItems = getAvailableItems();
        const options = [
            { value: '', text: 'Kein Item' },
            ...availableItems.map(item => ({
                value: item.id,
                text: item.name
            }))
        ];
        
        return new UnifiedCustomDropdown({
            placeholder: 'Item wählen',
            options: options,
            currentValue: currentValue || '',
            showTooltips: true,
            tooltipFunction: DropdownTooltips.item,
            onChange: onChange
        });
    },
    
    move: (availableMoves, currentValue, onChange) => {
        const options = [
            { value: '', text: 'Attacke wählen' },
            ...availableMoves.map(move => ({
                value: move.id,
                text: move.name,
                data: move // Include move data for tooltip
            }))
        ];
        
        return new UnifiedCustomDropdown({
            placeholder: 'Attacke wählen',
            options: options,
            currentValue: currentValue || '',
            showTooltips: true,
            tooltipFunction: DropdownTooltips.move,
            searchable: true, // Enable search for moves since there are many
            onChange: onChange
        });
    }
};

// Helper function for move availability
export function getAvailableMovesForSlot(character, currentMoveIndex) {
    if (!character.availableMoves) return [];
    
    const selectedMoves = character.selectedMoves || [null, null, null, null];
    const otherSelectedMoves = selectedMoves.filter((move, idx) => 
        idx !== currentMoveIndex && move !== null
    );
    
    return character.availableMoves.filter(move => {
        // Check if move exists in RANGED_WEAPON_TYPES
        const normalizedMoveName = move.name.toLowerCase();
        const moveExistsInConfig = RANGED_WEAPON_TYPES[normalizedMoveName] !== undefined;
        
        // Check if not already selected elsewhere
        const notSelectedElsewhere = !otherSelectedMoves.some(selected => 
            selected && selected.id === move.id
        );
        
        // Special handling for Verzweifler
        if (move.id === -9999) {
            return !hasSelectedMoves(character);
        }
        
        return moveExistsInConfig && notSelectedElsewhere;
    });
}

export function handleMoveSelection(teamIndex, slotIndex, moveIndex, moveId, character) {
    let selectedMove = null;
    
    if (moveId) {
        if (moveId === -9999) {
            selectedMove = createVerzweiflerMove();
        } else {
            selectedMove = character.availableMoves.find(move => move.id == moveId);
        }
    }
    
    // Update character's selected moves
    if (!character.selectedMoves) {
        character.selectedMoves = [null, null, null, null];
    }
    character.selectedMoves[moveIndex] = selectedMove;
    
    // Update character attacks
    updateCharacterAttacks(character);
    
    applyMoveTypeColoring(teamIndex, slotIndex, character);
    
    // Refresh all move dropdowns for this character to update availability
    refreshMoveDropdownsForCharacter(teamIndex, slotIndex, character);
}

export function createCustomStrategyDropdown(container, teamIndex, slotIndex, currentStrategy = 'aggressive') {
    // Create the custom dropdown structure
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'custom-strategy-dropdown-wrapper';
    
    const customDropdown = document.createElement('div');
    customDropdown.className = 'custom-strategy-dropdown';
    
    // Create the trigger (what shows when dropdown is closed)
    const trigger = document.createElement('div');
    trigger.className = 'custom-strategy-dropdown__trigger';
    
    // Set initial trigger text
    const currentStrategyOption = STRATEGY_OPTIONS.find(opt => opt.value === currentStrategy);
    trigger.textContent = currentStrategyOption ? currentStrategyOption.text : 'Strategie wählen';
    
    // Create the options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-strategy-dropdown__options';
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'strategy-option-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip); // Append to body for better positioning
    
    // Add strategy options
    STRATEGY_OPTIONS.forEach(strategy => {
        const option = document.createElement('div');
        option.className = 'custom-strategy-dropdown__option';
        option.dataset.value = strategy.value;
        option.textContent = strategy.text;
        
        // Mark current selection
        if (strategy.value === currentStrategy) {
            option.classList.add('selected');
        }
        
        // Add hover events for tooltip
        option.addEventListener('mouseenter', (e) => {
            showTooltip(e.target, strategy.value);
        });
        
        option.addEventListener('mouseleave', () => {
            hideTooltip();
        });
        
        // Add click handler
        option.addEventListener('click', () => {
            selectStrategy(strategy.value, strategy.text);
        });
        
        optionsContainer.appendChild(option);
    });
    
    // Add click event to toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!customDropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Assemble the dropdown
    customDropdown.appendChild(trigger);
    customDropdown.appendChild(optionsContainer);
    dropdownWrapper.appendChild(customDropdown);
    
    // Functions
    function toggleDropdown() {
        customDropdown.classList.toggle('open');
        if (customDropdown.classList.contains('open')) {
            // Position options container
            positionOptionsContainer();
        } else {
            hideTooltip();
        }
    }
    
    function closeDropdown() {
        customDropdown.classList.remove('open');
        hideTooltip();
    }
    
    function positionOptionsContainer() {
        const triggerRect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const optionsHeight = optionsContainer.scrollHeight;
        
        // Check if there's space below
        if (triggerRect.bottom + optionsHeight > viewportHeight - 20) {
            // Position above
            optionsContainer.style.bottom = '100%';
            optionsContainer.style.top = 'auto';
        } else {
            // Position below
            optionsContainer.style.top = '100%';
            optionsContainer.style.bottom = 'auto';
        }
    }
    
    function selectStrategy(value, text) {
        // Update trigger text
        trigger.textContent = text;
        
        // Update selected option styling
        optionsContainer.querySelectorAll('.custom-strategy-dropdown__option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.value === value) {
                opt.classList.add('selected');
            }
        });
        
        // Update character strategy
        const character = teamAssignments[teamIndex][slotIndex];
        character.strategy = value;
        applyStrategyBuffs(character, value);
        
        console.log(`Set ${character.name}'s strategy to ${value} and applied buffs`);
        
        // Update Pokemon stats tooltip if it exists
        updatePokemonStatsTooltip(teamIndex, slotIndex, character);
        
        // Close dropdown
        closeDropdown();
    }
    
    function showTooltip(element, strategyValue) {
        const strategy = STRATEGY_OPTIONS.find(opt => opt.value === strategyValue);
        const description = getStrategyDescription(strategyValue);
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <strong>${strategy.text}</strong>
            </div>
            <div class="tooltip-description">
                ${description}
            </div>
        `;
        
        // Position tooltip
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position to the right of the option, or left if no space
        let left = elementRect.right + 10;
        if (left + 300 > window.innerWidth) {
            left = elementRect.left - 310;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${elementRect.top + (elementRect.height / 2) - 20}px`;
        tooltip.style.display = 'block';
    }
    
    function hideTooltip() {
        tooltip.style.display = 'none';
    }
    
    function updatePokemonStatsTooltip(teamIndex, slotIndex, character) {
        const spriteContainer = document.querySelector(
            `.team-slot[data-team="${teamIndex}"][data-slot="${slotIndex}"] .pokemon-sprite-container`
        );
        
        if (spriteContainer) {
            const existingTooltip = spriteContainer.querySelector('.pokemon-stats-tooltip');
            if (existingTooltip) {
                spriteContainer.removeChild(existingTooltip);
            }
            
            const newTooltip = createPokemonStatsTooltip(character);
            spriteContainer.appendChild(newTooltip);
            
            spriteContainer.addEventListener('mouseenter', () => {
                newTooltip.style.display = 'block';
            });
            
            spriteContainer.addEventListener('mouseleave', () => {
                newTooltip.style.display = 'none';
            });
        }
    }
    
    // Cleanup function to remove tooltip from DOM
    dropdownWrapper.cleanup = function() {
        if (tooltip.parentNode) {
            document.body.removeChild(tooltip);
        }
    };
    
    return dropdownWrapper;
}

export function updatePokemonStatsTooltipForCharacter(teamIndex, slotIndex, character) {
    const spriteContainer = document.querySelector(
        `.team-slot[data-team="${teamIndex}"][data-slot="${slotIndex}"] .pokemon-sprite-container`
    );
    
    if (spriteContainer) {
        const existingTooltip = spriteContainer.querySelector('.pokemon-stats-tooltip');
        if (existingTooltip) {
            spriteContainer.removeChild(existingTooltip);
        }
        
        const newTooltip = createPokemonStatsTooltip(character);
        spriteContainer.appendChild(newTooltip);
        
        // Re-add hover events
        spriteContainer.addEventListener('mouseenter', () => {
            newTooltip.style.display = 'block';
        });
        
        spriteContainer.addEventListener('mouseleave', () => {
            newTooltip.style.display = 'none';
        });
    }
}

/**
 * Refresh move dropdowns for a character to update disabled states
 * @param {number} teamIndex 
 * @param {number} slotIndex 
 * @param {Object} character 
 */
export function refreshMoveDropdownsForCharacter(teamIndex, slotIndex, character) {
    console.log(`Refreshing move dropdowns for team ${teamIndex}, slot ${slotIndex}`);
    
    // Update all 4 move dropdowns for this character
    for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
        const key = `${teamIndex}-${slotIndex}-${moveIndex}`;
        const dropdownInstance = moveDropdownInstances.get(key);
        
        if (dropdownInstance) {
            try {
                // Get updated available moves with current disabled states
                const availableMoves = getAvailableMovesForSlot(character, moveIndex);
                
                // Get current selection
                const selectedMoves = character.selectedMoves || [null, null, null, null];
                const currentMove = selectedMoves[moveIndex];
                const currentMoveId = currentMove ? currentMove.id : '';
                
                // Create updated options
                const updatedOptions = [
                    { value: '', text: 'Attacke wählen', disabled: false },
                    ...availableMoves.map(move => ({
                        value: move.id,
                        text: move.name,
                        data: move,
                        disabled: move.disabled || false
                    }))
                ];
                
                // Update the dropdown with new options
                dropdownInstance.updateOptions(updatedOptions);
                dropdownInstance.setValue(currentMoveId);
                
                console.log(`Updated move dropdown ${key} with ${availableMoves.length} moves`);
            } catch (error) {
                console.error(`Error refreshing move dropdown ${key}:`, error);
            }
        } else {
            console.warn(`Move dropdown instance not found for key: ${key}`);
        }
    }
}

/**
 * Creates a tooltip showing Pokemon stats for the team builder
 * @param {Object} character - The character data
 * @returns {HTMLElement} - The tooltip element
 */
export function createPokemonStatsTooltip(character) {
    const tooltip = document.createElement('div');
    tooltip.className = 'pokemon-stats-tooltip';
    tooltip.style.display = 'none';
    
    // Get stat details
    const statsDetails = character.statsDetails || {};
    const statsGerman = statsDetails.statsGerman || {};
    const abilities = statsDetails.abilities || [];
    
    // Calculate Initiative display value (initiative / 10, rounded up)
    const initiativeBase = statsGerman['Initiative'] || character.stats?.speed || 0;
    const initiativeDisplay = Math.ceil(initiativeBase / 10);
    
    // Calculate BW value
    // Start with Initiative / 10, rounded up
    let bwValue = Math.ceil(initiativeBase / 10);
    
    // Reduce by 1 for every 25kg of weight
    const weightInKg = statsDetails.weight || 0;
    const weightReduction = Math.floor(weightInKg / 25);
    bwValue = Math.max(bwValue - weightReduction, Math.ceil(initiativeBase / 20));
    
    // Check if Pokemon is buffed by favorite type
    const isTypeBuff = character.isTypeBuffed;
    const typeBuffedStyle = isTypeBuff ? 'color: #2ecc71;' : '';
    
    // Check if Pokemon has strategy buffs
    const hasStrategyBuffs = character.hasStrategyBuffs;
    const strategyBuffedStyle = hasStrategyBuffs ? 'color: #3498db;' : '';
    
    // Create a separate variable to store the strategy-affected BW value
    let strategyBwValue = character.combatStats?.bw || bwValue;
    
    // Create tooltip content
    let content = `
        <div class="tooltip-header">
            <h3>${character.name}${isTypeBuff ? ' <span class="buffed-indicator type-buffed">(Lieblingstyp-Buff)</span>' : ''}${hasStrategyBuffs ? ` <span class="buffed-indicator strategy-buffed">(${getStrategyDescription(character.strategy)})</span>` : ''}</h3>
        </div>
        <div class="tooltip-section">
            <div class="tooltip-row"><span class="tooltip-label">GENA:</span> <span class="tooltip-value" style="${typeBuffedStyle}${character.currentStrategy === 'tricky' ? strategyBuffedStyle : ''}">${character.combatStats.gena}${character.currentStrategy === 'tricky' && character.originalStatsBeforeStrategyBuff ? ` <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${character.originalStatsBeforeStrategyBuff.gena})</span>` : ''}</span></div>
            <div class="tooltip-row"><span class="tooltip-label">PA:</span> <span class="tooltip-value" style="${typeBuffedStyle}${character.currentStrategy === 'fleeing' ? strategyBuffedStyle : ''}">${character.combatStats.pa}${character.currentStrategy === 'fleeing' && character.originalStatsBeforeStrategyBuff ? ` <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${character.originalStatsBeforeStrategyBuff.pa})</span>` : ''}</span></div>
            <div class="tooltip-row"><span class="tooltip-label">BW:</span> <span class="tooltip-value" style="${['aggressive', 'defensive', 'aiming'].includes(character.currentStrategy) ? strategyBuffedStyle : ''}">${strategyBwValue}${['aggressive', 'defensive', 'aiming'].includes(character.currentStrategy) && character.originalStatsBeforeStrategyBuff ? ` <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${bwValue})</span>` : ''}</span></div>`;
    
    // Display KP with the original value on the same row but neatly aligned
    if (character.originalKP) {
        content += `
            <div class="tooltip-row">
                <span class="tooltip-label">KP:</span> 
                <span class="tooltip-value" style="${typeBuffedStyle}">
                    ${character.combatStats.kp} 
                    <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${character.originalKP})</span>
                </span>
            </div>`;
    } else {
        content += `<div class="tooltip-row"><span class="tooltip-label">KP:</span> <span class="tooltip-value" style="${typeBuffedStyle}">${character.combatStats.kp}</span></div>`;
    }
    
    content += `<div class="tooltip-row"><span class="tooltip-label">Glücks-Tokens:</span> <span class="tooltip-value">${character.combatStats.luckTokens}</span></div>
        </div>`;
    
    // Add Pokemon types section
    if (character.pokemonTypesDe && character.pokemonTypesDe.length > 0) {
        content += `
            <div class="tooltip-section">
                <div class="tooltip-row">
                    <span class="tooltip-label">Typen:</span>
                    <span class="tooltip-value tooltip-types-container">`;
        
        // Add type badges with their German names
        character.pokemonTypesDe.forEach((typeDe, index) => {
            // Get the English type name to use for the CSS class
            const typeEn = character.pokemonTypes ? character.pokemonTypes[index] : character.types[index];
            content += `<span class="type-badge type-${typeEn}">${typeDe}</span>`;
        });
        
        content += `</span>
                </div>
            </div>`;
    }
    
    // Add terrain attributes section if they exist
    if (character.terrainAttributes) {
        content += `
            <div class="tooltip-section">
                <div class="tooltip-row">
                    <span class="tooltip-label">Geländefähigkeiten:</span>
                    <span class="tooltip-value terrain-attributes-container">`;
        
        if (character.terrainAttributes.fliegend || character.terrainAttributes.schwimmend) {
            let terrainAttributes = [];
            
            if (character.terrainAttributes.fliegend) {
                terrainAttributes.push(`<span class="terrain-attribute fliegend">Fliegend</span>`);
            }
            if (character.terrainAttributes.schwimmend) {
                terrainAttributes.push(`<span class="terrain-attribute schwimmend">Schwimmend</span>`);
            }
            
            content += terrainAttributes.join('');
        } else {
            content += `Keine`;
        }
        
        content += `</span>
                </div>
            </div>`;
    }
    
    content += `<div class="tooltip-section">
            <h4>Basiswerte</h4>
    `;
    
    // Add all stats if available
    if (Object.keys(statsGerman).length > 0) {
        for (const [statName, statValue] of Object.entries(statsGerman)) {
            // For Initiative, show the adjusted value
            if (statName === 'Initiative') {
                content += `<div class="tooltip-row"><span class="tooltip-label">${statName}:</span> <span class="tooltip-value" style="${typeBuffedStyle}">${statValue} (${initiativeDisplay})</span></div>`;
            } 
            // For Angriff and Spezial-Angriff, check if 'supporting' strategy is active
            else if ((statName === 'Angriff' || statName === 'Spezial-Angriff') && character.currentStrategy === 'supporting') {
                const originalValue = character.originalBaseStatsBeforeStrategyBuff?.[statName === 'Angriff' ? 'angriff' : 'spAngriff'];
                content += `<div class="tooltip-row"><span class="tooltip-label">${statName}:</span> <span class="tooltip-value" style="${typeBuffedStyle}${strategyBuffedStyle}">${statValue}${originalValue ? ` <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${originalValue})</span>` : ''}</span></div>`;
            }
            // For Verteidigung and Spezial-Verteidigung, check if 'defensive' strategy is active
            else if ((statName === 'Verteidigung' || statName === 'Spezial-Verteidigung') && character.currentStrategy === 'defensive') {
                const originalValue = character.originalBaseStatsBeforeStrategyBuff?.[statName === 'Verteidigung' ? 'verteidigung' : 'spVerteidigung'];
                content += `<div class="tooltip-row"><span class="tooltip-label">${statName}:</span> <span class="tooltip-value" style="${typeBuffedStyle}${strategyBuffedStyle}">${statValue}${originalValue ? ` <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${originalValue})</span>` : ''}</span></div>`;
            }
            else {
                content += `<div class="tooltip-row"><span class="tooltip-label">${statName}:</span> <span class="tooltip-value" style="${typeBuffedStyle}">${statValue}</span></div>`;
            }
        }
        content += `<div class="tooltip-row"><span class="tooltip-label">Gesamt:</span> <span class="tooltip-value">${statsDetails.baseStatTotal || '?'}</span></div>`;
        content += `<div class="tooltip-separator"></div>`; // Add separator
    } else {
        // Fallback to basic stats
        content += `
            <div class="tooltip-row"><span class="tooltip-label">Initiative:</span> <span class="tooltip-value" style="${typeBuffedStyle}">${initiativeBase} (${initiativeDisplay})</span></div>
            <div class="tooltip-separator"></div>
        `;
    }
    
    // Add height and weight if available
    if (statsDetails.height) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Größe:</span> <span class="tooltip-value">${statsDetails.height.toFixed(1)} m</span></div>`;
    }
    if (statsDetails.weight) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Gewicht:</span> <span class="tooltip-value">${statsDetails.weight.toFixed(1)} kg</span></div>`;
    }
    
    // Add abilities section
    if (abilities.length > 0) {
        content += `
            </div>
            <div class="tooltip-section">
                <h4>Fähigkeiten</h4>
        `;
        
        abilities.forEach(ability => {
            const hiddenText = ability.isHidden ? ' (Versteckt)' : '';
            content += `
                <div class="tooltip-ability">
                    <div class="ability-name">${ability.name}${hiddenText}</div>
                    <div class="ability-description">${ability.description || ''}</div>
                </div>
            `;
        });
    }
    
    content += `</div>`;
    
    // Add extra CSS style for tooltip rows, terrain attributes, and type badges
    content = `
        <style>
            .pokemon-stats-tooltip .tooltip-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
            }
            .pokemon-stats-tooltip .tooltip-label {
                flex: 1;
                text-align: left;
                padding-right: 10px;
            }
            .pokemon-stats-tooltip .tooltip-value {
                text-align: right;
                font-weight: bold;
            }
            .pokemon-stats-tooltip .terrain-attributes-container {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: flex-end;
                gap: 5px; /* Add spacing between multiple attributes */
            }
            .pokemon-stats-tooltip .terrain-attribute {
                display: inline-block;
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
            }
            .pokemon-stats-tooltip .terrain-attribute.fliegend {
                background-color: #e0f7fa;
                color: #006064;
                border: 1px solid #4dd0e1;
            }
            .pokemon-stats-tooltip .terrain-attribute.schwimmend {
                background-color: #bbdefb;
                color: #0d47a1;
                border: 1px solid #64b5f6;
            }
            .pokemon-stats-tooltip .tooltip-types-container {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: flex-end;
                gap: 3px;
                flex-wrap: wrap;
            }
            .pokemon-stats-tooltip .type-badge {
                display: inline-block;
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                white-space: nowrap;
                border: 1px solid rgba(0,0,0,0.1);
            }
            .pokemon-stats-tooltip .buffed-indicator {
                font-size: 12px;
                font-weight: normal;
                font-style: italic;
            }
            .pokemon-stats-tooltip .buffed-indicator.type-buffed {
                color: #2ecc71;
            }
            .pokemon-stats-tooltip .buffed-indicator.strategy-buffed {
                color: #3498db;
            }
        </style>
    ` + content;
    
    tooltip.innerHTML = content;
    return tooltip;
}

/**
 * Get strategy description text
 * @param {string} strategyValue - The strategy value (aggressiv, standhaft, fliehend, tückisch)
 * @returns {string} - The description text
 */
function getStrategyDescription(strategyValue) {
    const descriptions = {
        'aggressive': 'Das Pokemon bewegt sich so schnell es kann auf den nächsten Gegner zu, um ihn anzugreifen. BW x2.',
        'defensive': 'Das Pokemon bewegt sich vorsichtig auf den nächsten Gegner zu. BW /2, VERT + SP VERT +50%.',
        'fleeing': 'Das Pokemon bewegt sich solange von allen Gegnern weg, bis nur noch es und andere Fliehende Verbündete übrig sind. Dann fühlt es sich in die Ecke gedrängt und greift an. PA +3.',
        'tricky': 'Das Pokemon bewegt sich auf den nächsten Gegner zu und wird immer Status-Attacken gegen diesen einsetzen, wenn es kann. +2 GENA.',
        'supporting': 'Das Pokemon wird immer heilende/unterstützende Attacken priorisieren, falls möglich. Es hält sich dafür oft in der Nähe von Teammitgliedern, statt aktiv Gegner anzugreifen. ANG + SP ANG -50%, aber Effekte, die Statuswerte anderer erhöhen, erhöhen sie um eine Stufe mehr.',
        'reinforcing': 'Das Pokemon bewegt sich auf den nächsten Gegner zu. Es setzt mit dreifacher Wahrscheinlichkeit Buff-Attacken ein.',
        'aiming': 'Das Pokemon bewegt sich nur mit einem Viertel seiner BW und versucht stets, auf maximaler Distanz zu bleiben und priorisiert Fernkampf-Angriffe. Seine Fernkampfangriffe landen mit einem Erfolg weniger kritische Treffer.',
        'opportunistic': 'Das Pokemon bewegt sich immer auf den Gegner mit den geringsten KP zu, um diesem den Rest zu geben. Der Grundschaden seiner Attacken gegen Ziele mit weniger als 50% KP ist um 2W6 erhöht.'
    };
    
    return descriptions[strategyValue] || 'Beschreibung nicht verfügbar.';
}

// Updated function to replace the old strategy dropdown creation
function createStrategyDropdownForSlot(container, teamIndex, slotIndex, currentStrategy) {
    // Remove any existing dropdown
    const existingDropdown = container.querySelector('.custom-strategy-dropdown-wrapper');
    if (existingDropdown) {
        if (existingDropdown.cleanup) {
            existingDropdown.cleanup();
        }
        container.removeChild(existingDropdown);
    }
    
    // Create new custom dropdown
    const customDropdown = createCustomStrategyDropdown(container, teamIndex, slotIndex, currentStrategy);
    container.appendChild(customDropdown);
    
    return customDropdown;
}

/**
 * Clean up all move dropdown instances across all teams and slots
 */
export function cleanupAllMoveDropdownInstances() {
    moveDropdownInstances.forEach((dropdown, key) => {
        try {
            dropdown.destroy();
        } catch (error) {
            console.warn(`Error destroying move dropdown with key ${key}:`, error);
        }
    });
    moveDropdownInstances.clear();
    console.log('Cleaned up all move dropdown instances');
}

/**
 * Clean up move dropdown instances for a specific character
 * @param {number} teamIndex 
 * @param {number} slotIndex 
 */
export function cleanupMoveDropdownInstances(teamIndex, slotIndex) {
    for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
        const key = `${teamIndex}-${slotIndex}-${moveIndex}`;
        const dropdownInstance = moveDropdownInstances.get(key);
        if (dropdownInstance) {
            try {
                dropdownInstance.destroy();
                moveDropdownInstances.delete(key);
                console.log(`Cleaned up move dropdown instance: ${key}`);
            } catch (error) {
                console.warn(`Error destroying move dropdown with key ${key}:`, error);
            }
        }
    }
}

/**
 * Clean up move dropdown instances for a specific team
 * @param {number} teamIndex - Index of the team to clean up
 */
export function cleanupMoveDropdownInstancesForTeam(teamIndex) {
    const keysToDelete = [];
    
    moveDropdownInstances.forEach((dropdown, key) => {
        // Key format is "teamIndex-slotIndex-moveIndex"
        if (key.startsWith(`${teamIndex}-`)) {
            try {
                dropdown.destroy();
                keysToDelete.push(key);
            } catch (error) {
                console.warn(`Error destroying move dropdown with key ${key}:`, error);
            }
        }
    });
    
    // Remove the destroyed instances from the map
    keysToDelete.forEach(key => {
        moveDropdownInstances.delete(key);
    });
    
    console.log(`Cleaned up move dropdown instances for team ${teamIndex}`);
}

/**
 * Store a move dropdown instance for later updates
 * @param {number} teamIndex 
 * @param {number} slotIndex 
 * @param {number} moveIndex 
 * @param {Object} dropdownInstance 
 */
export function storeMoveDropdownInstance(teamIndex, slotIndex, moveIndex, dropdownInstance) {
    const key = `${teamIndex}-${slotIndex}-${moveIndex}`;
    moveDropdownInstances.set(key, dropdownInstance);
    console.log(`Stored move dropdown instance: ${key}`);
}

/**
 * Apply type-based coloring to all move containers for a Pokemon
 * @param {number} teamIndex 
 * @param {number} slotIndex 
 * @param {Object} character 
 */
export function applyMoveTypeColoring(teamIndex, slotIndex, character) {
    if (!character || !character.selectedMoves) return;
    
    for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
        const moveContainer = document.querySelector(
            `.team-slot[data-team="${teamIndex}"][data-slot="${slotIndex}"] .moves-container .move-selection-container:nth-child(${moveIndex + 1})`
        );
        
        if (moveContainer) {
            // Remove all existing type classes
            moveContainer.classList.remove(
                'selected-water', 'selected-grass', 'selected-fire', 'selected-electric',
                'selected-psychic', 'selected-ice', 'selected-dragon', 'selected-dark',
                'selected-fighting', 'selected-poison', 'selected-ground', 'selected-flying',
                'selected-bug', 'selected-rock', 'selected-ghost', 'selected-steel',
                'selected-fairy', 'selected-normal'
            );
            
            // Add type class if move is selected
            const selectedMove = character.selectedMoves[moveIndex];
            if (selectedMove && selectedMove.type) {
                moveContainer.classList.add(`selected-${selectedMove.type}`);
            }
        }
    }
}


/**
 * Find available support moves for a Pokemon
 * @param {Object} character - The Pokemon character
 * @returns {Array} - Array of available support moves
 */
export function findSupportMoves(character) {
    if (!character.attacks || character.attacks.length === 0) {
        return [];
    }
    
    // Filter for support moves with available PP
    return character.attacks.filter(attack => 
        attack.buff === true && // Support moves are typically marked as buff moves
        attack.weaponName !== 'Verzweifler' &&
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
}

/**
 * Get a random valid attack for a Pokemon
 * @param {Object} character - The Pokemon character
 * @returns {Object|null} - Random attack or null if none available
 */
export function getRandomValidAttack(character) {
    if (!character.attacks || character.attacks.length === 0) {
        return null;
    }
    
    // Get all valid attacks (have PP or unlimited PP)
    const validAttacks = character.attacks.filter(attack => 
        attack.weaponName === "Verzweifler" || 
        (attack.pp === undefined || attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (validAttacks.length === 0) {
        return null;
    }
    
    // Select random attack
    const randomIndex = Math.floor(Math.random() * validAttacks.length);
    return validAttacks[randomIndex];
}

/**
 * Find optimal position to stay close to nearest ally
 * @param {Object} currentPos - Current position data
 * @param {Object} nearestAlly - Nearest ally data
 * @param {number} pokemonSize - Size category of the Pokemon
 * @param {Object} characterPositions - All character positions
 * @returns {Object|null} - Optimal position {x, y} or null if none found
 */
export function findOptimalSupportPosition(currentPos, nearestAlly, pokemonSize, characterPositions) {
    const candidates = [];
    const allyX = nearestAlly.x;
    const allyY = nearestAlly.y;
    
    // Search in a 7x7 area around the ally (within 3 tiles distance)
    for (let x = allyX - 3; x <= allyX + 3; x++) {
        for (let y = allyY - 3; y <= allyY + 3; y++) {
            // Skip if position is out of bounds
            if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;
            
            // Check if this position would be within 3 tiles of the ally
            const testPos = { x, y, character: currentPos.character };
            const distanceToAlly = calculateMinDistanceBetweenPokemon(testPos, nearestAlly);
            
            // We want positions within 3 tiles of the ally
            if (distanceToAlly <= 3) {
                // Check if this position is valid (no collisions, within bounds)
                if (isValidPokemonPosition(x, y, pokemonSize, characterPositions, currentPos)) {
                    // Calculate distance from current position for prioritization
                    const distanceFromCurrent = Math.abs(x - currentPos.x) + Math.abs(y - currentPos.y);
                    candidates.push({
                        x: x,
                        y: y,
                        distanceFromCurrent: distanceFromCurrent,
                        distanceToAlly: distanceToAlly
                    });
                }
            }
        }
    }
    
    if (candidates.length === 0) {
        return null;
    }
    
    // Sort by distance to ally (prefer being closer to ally), then by distance from current position
    candidates.sort((a, b) => {
        // First priority: closer to ally
        if (a.distanceToAlly !== b.distanceToAlly) {
            return a.distanceToAlly - b.distanceToAlly;
        }
        // Second priority: shorter movement distance
        return a.distanceFromCurrent - b.distanceFromCurrent;
    });
    
    return { x: candidates[0].x, y: candidates[0].y };
}

/**
 * Calculate original stats from base character data (without buffs)
 * @param {Object} character - The character to calculate stats for
 * @returns {Object} - Object containing original bw, pa, gena and baseStats
 */
export function calculateOriginalStatsFromBase(character) {
    // Get base stats from various possible sources
    const statsDetails = character.statsDetails || {};
    const statsGerman = statsDetails.statsGerman || {};
    const baseStatTotal = statsDetails.baseStatTotal || 0;
    
    // Get Initiative/Speed value
    const initiativeBase = statsGerman['Initiative'] || character.stats?.speed || 0;
    
    // Calculate GENA (based on base stat total)
    const gena = Math.ceil(baseStatTotal / 50);
    
    // Calculate PA (based on Initiative/Speed + height modifier)
    let pa = Math.ceil(initiativeBase / 20);
    
    // Apply height modifiers to PA
    const heightInMeters = statsDetails.height || 0;
    if (heightInMeters <= 0.4) pa += 6;        // Under 40cm
    else if (heightInMeters <= 1) pa += 5;     // Under 1m
    else if (heightInMeters <= 1.5) pa += 4;   // Under 1.5m
    else if (heightInMeters <= 2) pa += 3;     // Under 2m
    else if (heightInMeters <= 3) pa += 2;     // Under 3m
    else if (heightInMeters <= 5) pa += 1;     // Under 5m
    // Above 5m gets no bonus
    
    // Calculate BW (Movement)
    // Start with Initiative / 10, rounded up
    let bw = Math.ceil(initiativeBase / 10);
    
    // Reduce by 1 for every 25kg of weight
    const weightInKg = statsDetails.weight || 0;
    const weightReduction = Math.floor(weightInKg / 25);
    bw = Math.max(bw - weightReduction, Math.ceil(initiativeBase / 20));
    
    // Create base stats object with original values
    const baseStats = {};
    
    // If we have German stats, copy them as the original base stats
    if (statsGerman && Object.keys(statsGerman).length > 0) {
        // Copy all German stats
        Object.keys(statsGerman).forEach(statName => {
            baseStats[statName] = statsGerman[statName];
        });
    } else {
        // Fallback to English stats if German stats aren't available
        const stats = character.stats || {};
        baseStats['KP'] = stats.hp || 0;
        baseStats['Angriff'] = stats.attack || 0;
        baseStats['Verteidigung'] = stats.defense || 0;
        baseStats['Spezial-Angriff'] = stats.specialAttack || stats['special-attack'] || 0;
        baseStats['Spezial-Verteidigung'] = stats.specialDefense || stats['special-defense'] || 0;
        baseStats['Initiative'] = stats.speed || 0;
    }
    
    return {
        bw: bw,
        pa: pa,
        gena: gena,
        baseStats: baseStats
    };
}