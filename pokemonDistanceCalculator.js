/**
 * Pokemon-Distanzberechnung
 * Berechnet die Distanz zwischen Pokémon unter Berücksichtigung ihrer Größen
 */

import { calculateSizeCategory } from './pokemonSizeCalculator.js';

/**
 * Berechnet die Distanz zwischen zwei Pokémon unter Berücksichtigung aller belegten Kacheln
 * @param {Object} pokemon1 - Erstes Pokémon mit x, y Position
 * @param {Object} pokemon2 - Zweites Pokémon mit x, y Position
 * @returns {number} - Minimale Distanz zwischen den Pokémon
 */
export function calculateMinDistanceBetweenPokemon(pokemon1, pokemon2) {
    // Hole alle belegten Kacheln für beide Pokémon
    const tiles1 = getOccupiedTiles(pokemon1);
    const tiles2 = getOccupiedTiles(pokemon2);
    
    // Berechne die minimale Manhattan-Distanz zwischen den Kacheln
    let minDistance = Infinity;
    
    for (const tile1 of tiles1) {
        for (const tile2 of tiles2) {
            const distance = Math.abs(tile1.x - tile2.x) + Math.abs(tile1.y - tile2.y);
            if (distance < minDistance) {
                minDistance = distance;
            }
        }
    }
    
    return minDistance;
}

/**
 * Get all tiles occupied by a Pokémon based on its size
 * @param {Object} pokemon - Pokémon with position and character data
 * @returns {Array} - Array of {x, y} positions of all occupied tiles
 */
export function getOccupiedTiles(pokemon) {
    if (!pokemon || !pokemon.character) {
        return [{ x: pokemon.x, y: pokemon.y }]; // Default to just center tile
    }
    
    const occupiedTiles = [];
    
    // Determine size category of the Pokémon
    const sizeCategory = calculateSizeCategory(pokemon.character);
    
    // Size in tiles (rounded up to next integer)
    const sizeInTiles = Math.ceil(sizeCategory);
    
    // Calculate the "radius" of the Pokémon (how many tiles it extends in each direction)
    const radius = Math.floor(sizeInTiles / 2);
    
    // Get all tiles in the Pokémon's footprint, with center as the reference point
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            // Add the tile to the list of occupied tiles
            occupiedTiles.push({
                x: pokemon.x + dx,
                y: pokemon.y + dy
            });
        }
    }
    
    return occupiedTiles;
}

/**
 * Check if a Pokémon occupies a specific tile
 * @param {Object} pokemon - Pokémon with position and character data
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @returns {boolean} - True if the Pokémon occupies the tile
 */
export function doesPokemonOccupyTile(pokemon, x, y) {
    if (!pokemon || !pokemon.character) return false;
    
    // Get the size category
    const sizeCategory = calculateSizeCategory(pokemon.character);
    
    // Calculate size in tiles
    const sizeInTiles = Math.ceil(sizeCategory);
    
    // Calculate "radius" (how many tiles it extends in each direction)
    const radius = Math.floor(sizeInTiles/2);
    
    // Check if the coordinate is within the Pokémon's footprint
    // pokemon.x and pokemon.y represent the center of the Pokémon
    return (
        x >= pokemon.x - radius && 
        x <= pokemon.x + radius && 
        y >= pokemon.y - radius && 
        y <= pokemon.y + radius
    );
}

/**
 * Prüft, ob zwei Pokémon benachbart sind (Distanz <= 1)
 * @param {Object} pokemon1 - Erstes Pokémon mit x, y Position
 * @param {Object} pokemon2 - Zweites Pokémon mit x, y Position
 * @returns {boolean} - True, wenn die Pokémon benachbart sind
 */
export function arePokemonNeighbors(pokemon1, pokemon2) {
    return calculateMinDistanceBetweenPokemon(pokemon1, pokemon2) <= 1;
}

/**
 * Prüft, ob ein Pfad für ein Pokémon gültig ist (keine Kollisionen mit anderen Pokémon)
 * @param {string} movingPokemonId - ID des sich bewegenden Pokémon
 * @param {Array} path - Array von Positionsobjekten {x, y}
 * @param {Object} characterPositions - Positionen aller Charaktere
 * @returns {boolean} - True, wenn der Pfad gültig ist
 */
export function isPathValidForPokemon(movingPokemonId, path, characterPositions) {
    if (!path || path.length === 0) return true;
    
    // Für jeden Schritt im Pfad
    for (const step of path) {
        // Erstelle eine temporäre Position für das bewegende Pokémon an dieser Stelle
        const pokemonAtStep = {
            x: step.x,
            y: step.y,
            character: characterPositions[movingPokemonId].character
        };
        
        // Bekomme alle Kacheln, die das Pokémon belegen würde
        const occupiedTilesAtStep = getOccupiedTiles(pokemonAtStep);
        
        // Prüfe, ob eine dieser Kacheln von einem anderen Pokémon belegt wird
        for (const tile of occupiedTilesAtStep) {
            // Prüfe jedes andere Pokémon
            for (const otherId in characterPositions) {
                // Überspringe das sich bewegende Pokémon
                if (otherId === movingPokemonId) continue;
                
                // Überspringe besiegte Pokémon
                if (characterPositions[otherId].isDefeated) continue;
                
                // Prüfe, ob dieses Pokémon die Kachel belegt
                if (doesPokemonOccupyTile(characterPositions[otherId], tile.x, tile.y)) {
                    return false; // Kollision gefunden!
                }
            }
        }
    }
    
    return true; // Kein Pfad ist ungültig
}
