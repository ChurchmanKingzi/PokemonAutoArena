/**
 * Pokémon size calculation and application system
 * This module handles the calculation of size categories for Pokémon
 * and applies the appropriate scaling on the battlefield.
 */

import { TILE_SIZE } from './config.js';

/**
 * Calculate BMI (Body Mass Index) for a Pokémon
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in meters
 * @returns {number} - BMI value
 */
function calculateBMI(weight, height) {
    if (!height || height <= 0) return 0;
    return weight / (height * height);
}

/**
 * Calculate size category for a Pokémon based on physical attributes
 * @param {Object} pokemon - Pokémon data object
 * @returns {number} - Size category (1, 2, 3, etc.)
 */
export function calculateSizeCategory(pokemon) {
    // Start with base size category
    let sizeCategory = 1;
    
    // Extract height and weight from different possible locations in the data
    let height, weight;
    
    // Try to get height/weight from statsDetails first (most  source)
    if (pokemon.statsDetails) {
        height = pokemon.statsDetails.height;
        weight = pokemon.statsDetails.weight;
    }
    
    // Fallback to direct properties if they exist
    if (height === undefined) {
        height = pokemon.height || 0;
    }
    if (weight === undefined) {
        weight = pokemon.weight || 0;
    }
    
    // Check if the Pokémon is Flying type
    const isFlying = (pokemon.pokemonTypes && 
                     pokemon.pokemonTypes.some(type => type.toLowerCase() === 'flying')) ||
                     (pokemon.pokemonTypesDe && 
                     pokemon.pokemonTypesDe.some(type => type.toLowerCase() === 'flug'));
    
    // Calculate BMI
    const bmi = calculateBMI(weight, height);
    
    // Rule 1: Size increase based on height and BMI relationship
    if (height >= 1.6) {
        // Calculate how many 0.1m increments above 1.6m
        const heightIncrements = Math.floor((height - 1.6) / 0.1);
        // Calculate required BMI (decreases by 4 for each 0.1m above 1.6m)
        const requiredBMI = Math.max(0, 30 - (heightIncrements * 4));
        
        // Check if BMI meets the requirement or if height is at least 2m
        if (bmi >= requiredBMI || height >= 2) {
            sizeCategory += 1;
        }
    }
    
    // Rule 2: Additional size increases based on height milestones
    if (height >= 10) {
        sizeCategory += 3; // +1 for each milestone: 4m, 6m, and 10m
    } else if (height >= 6) {
        sizeCategory += 2; // +1 for each milestone: 4m and 6m
    } else if (height >= 4) {
        sizeCategory += 1; // +1 for 4m milestone
    }
    
    // Rule 3: Flying type size adjustment
    if (isFlying && sizeCategory === 1 && height >= 1.5) {
        sizeCategory += 1; // Representing wing span
    }
    
    return sizeCategory;
}

/**
 * Apply size category to a Pokémon element on the battlefield
 * @param {HTMLElement} pokemonElement - The DOM element representing the Pokémon
 * @param {number} sizeCategory - The calculated size category
 * @param {number} tileSize - The size of a single battlefield tile in pixels
 */
export function applySizeToElement(pokemonElement, sizeCategory, tileSize) {
    if (!pokemonElement) return;
    
    // Store the original size category on the element
    pokemonElement.dataset.sizeCategory = sizeCategory;
    
    // Size 1 is the default (1x1 tile)
    if (sizeCategory === 1) {
        // Explicitly set default size to avoid inheritance issues
        pokemonElement.style.width = `${tileSize}px`;
        pokemonElement.style.height = `${tileSize}px`;
        pokemonElement.style.position = 'relative';
        pokemonElement.style.left = '0';
        pokemonElement.style.top = '0';
        pokemonElement.style.zIndex = '5';
        return;
    }
    
    // For larger sizes, calculate new dimensions
    const newSize = tileSize * sizeCategory;
    
    // Set new dimensions with !important to override any conflicting styles
    pokemonElement.style.setProperty('width', `${newSize}px`, 'important');
    pokemonElement.style.setProperty('height', `${newSize}px`, 'important');
    
    // Adjust position to keep the Pokémon centered on its logical position
    pokemonElement.style.setProperty('position', 'absolute', 'important');
    
    // Calculate offset for centering
    const offset = (newSize - tileSize) / 2;
    
    // Apply the offset to center the sprite (negative offset moves it up and left)
    pokemonElement.style.setProperty('transform', `translate(-${offset}px, -${offset}px)`, 'important');
    pokemonElement.style.setProperty('left', '0', 'important');
    pokemonElement.style.setProperty('top', '0', 'important');
    
    // Ensure the Pokémon appears above other elements
    pokemonElement.style.setProperty('z-index', `${10 + sizeCategory}`, 'important');
    
    // Add a debug class to make it easier to identify sized elements
    pokemonElement.classList.add(`size-category-${sizeCategory}`);
}

/**
 * Apply size categories to all Pokémon on the battlefield
 * @param {Object} characterPositions - Map of character IDs to their positions
 * @param {number} tileSize - Size of a battlefield tile in pixels
 */
export function applySizeCategoriesToBattlefield(characterPositions, tileSize) {
    // Debug log to check function is called
    console.log("Applying size categories to battlefield...");
    
    // Get all Pokémon elements on the battlefield
    const pokemonElements = document.querySelectorAll('.battlefield-character');
    
    console.log(`Found ${pokemonElements.length} Pokémon elements on battlefield`);
    
    // Apply sizing to each element
    pokemonElements.forEach(element => {
        // Get character ID from the element
        const charId = element.dataset.characterId;
        if (!charId || !characterPositions[charId]) {
            console.log(`No character found for ID: ${charId}`);
            return;
        }
        
        // Get the Pokémon data
        const pokemon = characterPositions[charId].character;
        if (!pokemon) {
            console.log(`No Pokémon data found for character ID: ${charId}`);
            return;
        }
        
        // Calculate size category
        const sizeCategory = calculateSizeCategory(pokemon);
        
        // Apply sizing to the element
        applySizeToElement(element, sizeCategory, tileSize);
        
        console.log(`Applied size ${sizeCategory} to ${pokemon.name}`);
    });
}

/**
 * Initialize the Pokémon size system by applying sizes to the battlefield
 * @param {Object} characterPositions - Map of character IDs to their positions
 */
export function initializePokemonSizes(characterPositions) {
    // Verify we have the necessary data
    if (!characterPositions) {
        console.error("Character positions not provided for Pokémon size initialization");
        return;
    }
    
    console.log("Initializing Pokémon sizes with tile size:", TILE_SIZE);
    
    // Apply sizes immediately using the imported tile size
    applySizeCategoriesToBattlefield(characterPositions, TILE_SIZE);
    
    // Also set up a small delay to apply sizes after the DOM has definitely updated
    setTimeout(() => {
        applySizeCategoriesToBattlefield(characterPositions, TILE_SIZE);
    }, 100);
}

/**
 * Debug function to display size categories on the battlefield
 * @param {Object} characterPositions - Map of character IDs to their positions
 */
export function debugPokemonSizes(characterPositions) {
    console.group("Pokémon Size Categories");
    
    for (const charId in characterPositions) {
        const pokemon = characterPositions[charId].character;
        if (!pokemon) continue;
        
        // Extract height and weight from different possible locations
        let height, weight;
        if (pokemon.statsDetails) {
            height = pokemon.statsDetails.height;
            weight = pokemon.statsDetails.weight;
        }
        if (height === undefined) height = pokemon.height || 0;
        if (weight === undefined) weight = pokemon.weight || 0;
        
        const bmi = calculateBMI(weight, height);
        const sizeCategory = calculateSizeCategory(pokemon);
        
        console.log(
            `${pokemon.name}: Height=${height}m, Weight=${weight}kg, BMI=${bmi.toFixed(2)}, Size Category=${sizeCategory}`
        );
    }
    
    console.groupEnd();
}