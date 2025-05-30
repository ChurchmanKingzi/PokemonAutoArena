import { getCharacterPositions, setCharacterPositions, isTileOccupied } from './characterPositions.js';
import { logBattleEvent } from './battleLog.js';
import { getSortedCharacters, getSortedCharactersDisplay, setSortedCharacters, setSortedCharactersDisplay } from './initiative.js';
import { rollMultipleD6 } from './diceRoller.js';
import { displayInitiativeOrder } from './initiativeDisplay.js';
import { GRID_SIZE } from './config.js';
import { markTurnTaken } from './initiativeChanges.js';

/**
 * Check if a Pokemon of given size can fit at the specified position within the team area bounds
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @param {number} sizeCategory - Size category of the Pokemon (1, 2, 3, etc.)
 * @param {Object} teamArea - The team area boundaries
 * @returns {boolean} - Whether the Pokemon can fit at this position within bounds
 */
export function canPokemonFitAtPosition(x, y, sizeCategory, teamArea) {
    // Check if the Pokemon would fit within the team area boundaries
    const rightEdge = x + sizeCategory - 1;
    const bottomEdge = y + sizeCategory - 1;
    
    // Check team area bounds
    if (rightEdge >= teamArea.x + teamArea.width || bottomEdge >= teamArea.y + teamArea.height) {
        return false;
    }
    
    // Check overall grid bounds
    if (x < 0 || y < 0 || rightEdge >= GRID_SIZE || bottomEdge >= GRID_SIZE) {
        return false;
    }
    
    return true;
}

/**
 * Check if a Pokemon can be placed at the given position without overlapping other Pokemon
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate  
 * @param {number} sizeCategory - Size category of the Pokemon
 * @returns {boolean} - Whether the placement is valid (no overlaps)
 */
export function isPokemonPlacementValid(centerX, centerY, sizeCategory) {
    // For size category 1, just check the single tile
    if (sizeCategory === 1) {
        return !isTileOccupied(centerX, centerY);
    }
    
    // For larger Pokemon, check all tiles they would occupy
    // The Pokemon is centered, so we need to check tiles around the center
    const halfSize = Math.floor(sizeCategory / 2);
    const startX = centerX - halfSize;
    const startY = centerY - halfSize;
    
    // Check all tiles the Pokemon would occupy
    for (let x = startX; x < startX + sizeCategory; x++) {
        for (let y = startY; y < startY + sizeCategory; y++) {
            // Check bounds
            if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) {
                return false;
            }
            
            // Check if tile is occupied
            if (isTileOccupied(x, y)) {
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Find an empty tile in the team's designated area that can accommodate the Pokemon's size
 * @param {number} teamIndex - Index of the team
 * @param {Object} pokemon - The Pokemon object to spawn (needed for size calculation)
 * @returns {Promise<Object|null>} - Promise that resolves to position {x, y} or null if no space found
 */
export async function findEmptyTileNearTeam(teamIndex, pokemon = null) {
    const characterPositions = getCharacterPositions();
    
    // Get current team count by finding the highest team index + 1
    let teamCount = 0;
    for (const charId in characterPositions) {
        const charData = characterPositions[charId];
        if (charData.teamIndex >= teamCount) {
            teamCount = charData.teamIndex + 1;
        }
    }
    
    try {
        // Import the required functions using dynamic imports
        const { defineTeamAreas } = await import('./characterPositions.js');
        const { shuffleArray } = await import('./utils.js');
        const { calculateSizeCategory } = await import('./pokemonSizeCalculator.js');
        
        // Calculate the size category of the Pokemon to be spawned
        const sizeCategory = pokemon ? calculateSizeCategory(pokemon) : 1;
        console.log(`Spawning Pokemon ${pokemon?.name || 'Unknown'} with size category: ${sizeCategory}`);
        
        // Calculate team areas - we need to get team sizes for proper scaling
        const teamSizes = [];
        for (let i = 0; i < teamCount; i++) {
            let teamSize = 0;
            for (const charId in characterPositions) {
                const charData = characterPositions[charId];
                if (charData.teamIndex === i && !charData.isDefeated) {
                    teamSize++;
                }
            }
            teamSizes.push(teamSize);
        }
        
        // Define team areas with proper scaling
        const teamAreas = defineTeamAreas(teamCount, teamSizes);
        
        // Get the team area for this team
        if (teamIndex >= teamAreas.length) {
            console.warn(`No team area defined for team ${teamIndex}`);
            return null;
        }
        
        const teamArea = teamAreas[teamIndex];
        console.log(`Searching for spawn position in team ${teamIndex} area:`, teamArea);
        
        // Create array of all valid positions in the team area that can accommodate the Pokemon size
        const validPositions = [];
        
        // Check each position in the team area
        for (let x = teamArea.x; x < teamArea.x + teamArea.width; x++) {
            for (let y = teamArea.y; y < teamArea.y + teamArea.height; y++) {
                // Check if this position can accommodate the Pokemon's full size
                if (canPokemonFitAtPosition(x, y, sizeCategory, teamArea)) {
                    validPositions.push({ x, y });
                }
            }
        }
        
        if (validPositions.length === 0) {
            console.warn(`No valid positions found for Pokemon of size ${sizeCategory} in team ${teamIndex} area`);
            return null;
        }
        
        // Shuffle the valid positions for random placement within the area
        const shuffledPositions = shuffleArray(validPositions);
        
        // Find the first position where the Pokemon can actually be placed without overlapping
        for (const position of shuffledPositions) {
            if (isPokemonPlacementValid(position.x, position.y, sizeCategory)) {
                console.log(`Found valid spawn position for size ${sizeCategory} Pokemon at (${position.x}, ${position.y}) in team ${teamIndex} area`);
                return position;
            }
        }
        
        console.warn(`No empty space found for size ${sizeCategory} Pokemon in team ${teamIndex} area`);
        return null;
        
    } catch (error) {
        console.error('Error finding team area for angler spawn:', error);
        return null;
    }
}

/**
 * Add a caught Pokemon to the active battle (Fixed version with proper size handling)
 * @param {Object} pokemon - The caught Pokemon object
 * @param {number} teamIndex - Index of the team that caught it
 * @param {string} trainerName - Name of the trainer who caught it
 */
export async function addPokemonToBattle(pokemon, teamIndex, trainerName) {
    try {
        console.log(`Adding ${pokemon.name} to battle for team ${teamIndex + 1}`);
        
        // 1. Find an empty tile near the team's area that can accommodate the Pokemon's size
        const position = await findEmptyTileNearTeam(teamIndex, pokemon);
        if (!position) {
            logBattleEvent(`<div class="log-angler-message">⚠️ Kein Platz für ${pokemon.name} auf dem Feld!</div>`, true);
            console.warn(`No empty space found for ${pokemon.name}`);
            return;
        }
        
        // 2. Generate a unique character ID
        const charId = `angler_${teamIndex}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // 3. Mark as angler-caught for identification
        pokemon.isAnglerCatch = true;
        pokemon.caughtByTrainer = trainerName;
        
        // IMPORTANT FIX: Ensure the Pokemon has a unique ID that matches our character ID system
        if (!pokemon.uniqueId) {
            pokemon.uniqueId = charId;
        }
        
        // 4. Add to character positions WITHOUT calling setCharacterPositions to avoid breaking references
        const characterPositions = getCharacterPositions();
        
        // Create the new character position entry
        const newCharacterEntry = {
            x: position.x,
            y: position.y,
            character: pokemon,
            teamIndex: teamIndex,
            strategy: pokemon.strategy || 'aggressive',
            isDefeated: false
        };
        
        // Add directly to the existing characterPositions object to preserve references
        characterPositions[charId] = newCharacterEntry;
        
        // SAFER APPROACH: Only call setCharacterPositions if absolutely necessary
        // Some implementations might require this call, but it can break object references
        // If you experience issues, try commenting out the next line:
        setCharacterPositions(characterPositions);
        
        // 5. Roll initiative for the new Pokemon
        const initValue = (pokemon.combatStats && pokemon.combatStats.init) 
            ? pokemon.combatStats.init 
            : 1;
        const initiativeRoll = rollMultipleD6(initValue);
        
        logBattleEvent(`${pokemon.name} würfelt Initiative: ${initiativeRoll}`);
        
        // 6. Create initiative entry
        const initiativeEntry = {
            character: pokemon,
            teamIndex: teamIndex,
            initiativeRoll: initiativeRoll,
            isDefeated: false
        };
        
        // 7. Add to initiative lists (both logic and display)
        const sortedCharactersLogic = getSortedCharacters();
        const sortedCharactersDisplay = getSortedCharactersDisplay();
        
        // Insert in proper initiative order (higher initiative first)
        insertInInitiativeOrder(sortedCharactersLogic, initiativeEntry);
        insertInInitiativeOrder(sortedCharactersDisplay, initiativeEntry);
        
        // Update the initiative lists
        setSortedCharacters(sortedCharactersLogic);
        setSortedCharactersDisplay(sortedCharactersDisplay);
        
        // 8. Add to visual battlefield (Pokemon overlay)
        const pokemonOverlay = await import('./pokemonOverlay.js');
        pokemonOverlay.addPokemonToOverlay(charId, newCharacterEntry, teamIndex);
        
        // 9. Update initiative display
        displayInitiativeOrder();

        // 10. Mark as having taken turn this round so it waits for next round
        // (New Pokemon added mid-round should wait for next round)
        markTurnTaken(pokemon.uniqueId);
        logBattleEvent(`${pokemon.name} wartet bis zur nächsten Runde, um zu handeln.`);
        
        // 11. Log successful addition
        logBattleEvent(`<div class="log-angler-message">✅ ${pokemon.name} betritt das Kampffeld!</div>`, true);        
    } catch (error) {
        console.error('Error adding Pokemon to battle:', error);
        logBattleEvent(`<div class="log-angler-message">💥 Fehler beim Hinzufügen von ${pokemon.name} zum Kampf!</div>`, true);
    }
}

/**
 * Insert an initiative entry in the correct position (maintaining sorted order)
 * @param {Array} initiativeList - The initiative list to insert into
 * @param {Object} newEntry - The new initiative entry to insert
 */
function insertInInitiativeOrder(initiativeList, newEntry) {
    // Find the correct position to insert (higher initiative first)
    let insertIndex = 0;
    for (let i = 0; i < initiativeList.length; i++) {
        if (newEntry.initiativeRoll > initiativeList[i].initiativeRoll) {
            insertIndex = i;
            break;
        }
        insertIndex = i + 1;
    }
    
    // Insert at the correct position
    initiativeList.splice(insertIndex, 0, newEntry);
    
    console.log(`Inserted ${newEntry.character.name} at initiative position ${insertIndex} with roll ${newEntry.initiativeRoll}`);
}