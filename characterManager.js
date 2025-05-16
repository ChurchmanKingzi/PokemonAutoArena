/**
 * Character management system with Pokémon integration
 */

import { RANGED_WEAPON_TYPES } from './charakterAuswahlConfig.js';

// Track which sprite numbers have been used
export const usedSpriteNumbers = new Set();

// Cache for fetched Pokémon data
let pokemonCache = [];
let pokemonLoaded = false;

/**
 * Calculate melee weapon damage for a character based on their equipment
 * @param {Object} character - The character object
 * @returns {Object} - The calculated melee attack data including damage and range
 */
export function calculateMeleeAttack(character) {
    // All Pokemon use Verzweifler as their basic attack
    return { 
        weaponName: "Verzweifler",
        damage: 5, // 5d6 damage
        range: 1 // Melee range
    };
}

// German stat name mapping
const STAT_NAMES_DE = {
    'hp': 'KP',
    'attack': 'Angriff',
    'defense': 'Verteidigung',
    'special-attack': 'Spezial-Angriff',
    'special-defense': 'Spezial-Verteidigung',
    'speed': 'Initiative'
};

/**
 * Load Pokémon from PokeAPI with additional details
 * @returns {Promise} - Promise that resolves when Pokémon are loaded
 */
export async function loadPokemon() {
    if (pokemonLoaded) {
        return pokemonCache;
    }
    
    try {
        console.log("Loading all Pokémon from PokeAPI...");
        
        // First, fetch all base Pokémon (the current count is around 1010)
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1200");
        const data = await response.json();
        
        console.log(`Fetched ${data.results.length} base Pokémon, now getting details...`);
        
        // Show loading message in the UI
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'pokemon-loading';
        loadingMessage.style.position = 'fixed';
        loadingMessage.style.top = '50%';
        loadingMessage.style.left = '50%';
        loadingMessage.style.transform = 'translate(-50%, -50%)';
        loadingMessage.style.padding = '20px';
        loadingMessage.style.backgroundColor = '#fff';
        loadingMessage.style.border = '1px solid #ccc';
        loadingMessage.style.borderRadius = '5px';
        loadingMessage.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        loadingMessage.style.zIndex = '9999';
        loadingMessage.innerHTML = '<p>Lade Pokémon... <span id="pokemon-loading-count">0</span>/' + data.results.length + '</p>';
        document.body.appendChild(loadingMessage);
        
        // Process in batches to avoid overwhelming the API
        const batchSize = 20;
        let loadedCount = 0;
        let pokemonList = [];
        
        for (let i = 0; i < data.results.length; i += batchSize) {
            const batch = data.results.slice(i, i + batchSize);
            
            // Process this batch
            const batchResults = await Promise.all(
                batch.map(async (pokemon) => {
                    try {
                        // Get basic Pokémon data
                        const pokemonResponse = await fetch(pokemon.url);
                        const pokemonData = await pokemonResponse.json();
                        
                        // Get species data for German name and abilities
                        const speciesResponse = await fetch(pokemonData.species.url);
                        const speciesData = await speciesResponse.json();
                        
                        // Find German name in names array
                        const germanName = speciesData.names.find(nameEntry => 
                            nameEntry.language.name === "de"
                        )?.name || pokemonData.name;
                        
                        // Calculate base stat total
                        const baseStatTotal = pokemonData.stats.reduce((total, stat) => total + stat.base_stat, 0);
                        
                        // Get height in meters (API gives height in decimeters)
                        const heightInMeters = pokemonData.height / 10;
                        
                        // Convert stats to object with German names
                        const statsWithGermanNames = {};
                        pokemonData.stats.forEach(stat => {
                            const statName = stat.stat.name;
                            const germanStatName = STAT_NAMES_DE[statName] || statName;
                            statsWithGermanNames[germanStatName] = stat.base_stat;
                        });
                        
                        // Get abilities with German names
                        const abilitiesData = await Promise.all(
                            pokemonData.abilities.map(async ability => {
                                try {
                                    const abilityResponse = await fetch(ability.ability.url);
                                    const abilityData = await abilityResponse.json();
                                    
                                    // Find German name for ability
                                    const germanAbilityName = abilityData.names.find(nameEntry => 
                                        nameEntry.language.name === "de"
                                    )?.name || abilityData.name;
                                    
                                    // Find German flavor text if available
                                    const germanFlavorText = abilityData.flavor_text_entries.find(entry => 
                                        entry.language.name === "de"
                                    )?.flavor_text || "";
                                    
                                    return {
                                        name: germanAbilityName,
                                        englishName: ability.ability.name,
                                        isHidden: false,
                                        description: germanFlavorText.replace(/\n/g, ' ')
                                    };
                                } catch (error) {
                                    console.error(`Error fetching ability ${ability.ability.name}:`, error);
                                    return {
                                        name: ability.ability.name,
                                        englishName: ability.ability.name,
                                        isHidden: ability.is_hidden,
                                        description: ""
                                    };
                                }
                            })
                        );
                        
                        // Calculate GENA and PA values
                        const gena = Math.ceil(baseStatTotal / 50);
                        
                        // Calculate PA based on Initiative and height thresholds
                        let pa = Math.ceil(pokemonData.stats.find(stat => stat.stat.name === "speed").base_stat / 20);
                        
                        // Apply height modifiers to PA
                        if (heightInMeters <= 0.4) pa += 6;  // Under 40cm
                        else if (heightInMeters <= 1) pa += 5;  // Under 1m
                        else if (heightInMeters <= 1.5) pa += 4;  // Under 1.5m
                        else if (heightInMeters <= 2) pa += 3;  // Under 2m
                        else if (heightInMeters <= 3) pa += 2;  // Under 3m
                        else if (heightInMeters <= 5) pa += 1;  // Under 5m
                        
                        // Create the Pokémon object
                        return {
                            uniqueId: `pokemon_${pokemon.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                            id: pokemonData.id,
                            name: germanName,
                            englishName: pokemonData.name,
                            sprite: pokemonData.sprites.front_default,
                            stats: {
                                hp: pokemonData.stats.find(stat => stat.stat.name === "hp")?.base_stat || 50,
                                attack: pokemonData.stats.find(stat => stat.stat.name === "attack")?.base_stat || 10,
                                defense: pokemonData.stats.find(stat => stat.stat.name === "defense")?.base_stat || 10,
                                speed: pokemonData.stats.find(stat => stat.stat.name === "speed")?.base_stat || 10
                            },
                            statsGerman: statsWithGermanNames,
                            baseStatTotal: baseStatTotal,
                            height: heightInMeters,
                            weight: pokemonData.weight / 10, // Weight in kg (API gives weight in hectograms)
                            types: pokemonData.types.map(type => type.type.name),
                            abilities: abilitiesData,
                            gena: gena,
                            pa: pa
                        };
                        
                    } catch (error) {
                        console.error(`Error fetching details for ${pokemon.name}:`, error);
                        return null;
                    } finally {
                        // Update loading count in either case
                        loadedCount++;
                        const loadingCounter = document.getElementById('pokemon-loading-count');
                        if (loadingCounter) {
                            loadingCounter.textContent = loadedCount;
                        }
                    }
                })
            );
            
            // Add valid Pokémon to the list
            batchResults.forEach(pokemon => {
                if (pokemon !== null) {
                    pokemonList.push(pokemon);
                }
            });
        }
        
        // Now fetch additional variant forms (Mega evolutions and special forms)
        console.log("Fetching additional form variants...");
        
        // Update loading message
        const loadingElement = document.getElementById('pokemon-loading');
        if (loadingElement) {
            loadingElement.innerHTML = '<p>Lade Pokémon-Varianten...</p>';
        }
        
        try {
            // Fetch all Pokémon forms
            const formsResponse = await fetch("https://pokeapi.co/api/v2/pokemon-form?limit=2000");
            const formsData = await formsResponse.json();
            
            // Filter for mega forms and other special variants
            const specialForms = formsData.results.filter(form => 
                form.name.includes("-mega") || 
                form.name.includes("-gmax") || 
                form.name.includes("-alola") || 
                form.name.includes("-galar") || 
                form.name.includes("-hisui")
            );
            
            // Process the special forms in batches
            for (let i = 0; i < specialForms.length; i += batchSize) {
                const formsBatch = specialForms.slice(i, i + batchSize);
                
                const formsBatchResults = await Promise.all(
                    formsBatch.map(async (form) => {
                        try {
                            // Get form data
                            const formResponse = await fetch(form.url);
                            const formData = await formResponse.json();
                            
                            // Get the corresponding Pokémon data
                            const pokemonUrl = formData.pokemon.url;
                            const pokemonResponse = await fetch(pokemonUrl);
                            const pokemonData = await pokemonResponse.json();
                            
                            // Get species data
                            const speciesResponse = await fetch(pokemonData.species.url);
                            const speciesData = await speciesResponse.json();
                            
                            // Find German name
                            let germanName = speciesData.names.find(nameEntry => 
                                nameEntry.language.name === "de"
                            )?.name || pokemonData.name;
                            
                            // Add form-specific suffix to the name
                            if (form.name.includes("-mega")) {
                                germanName += " (Mega)";
                            } else if (form.name.includes("-gmax")) {
                                germanName += " (Gigadynamax)";
                            } else if (form.name.includes("-alola")) {
                                germanName += " (Alola-Form)";
                            } else if (form.name.includes("-galar")) {
                                germanName += " (Galar-Form)";
                            } else if (form.name.includes("-hisui")) {
                                germanName += " (Hisui-Form)";
                            }
                            
                            // Calculate base stat total
                            const baseStatTotal = pokemonData.stats.reduce((total, stat) => total + stat.base_stat, 0);
                            
                            // Convert stats to object with German names
                            const statsWithGermanNames = {};
                            pokemonData.stats.forEach(stat => {
                                const statName = stat.stat.name;
                                const germanStatName = STAT_NAMES_DE[statName] || statName;
                                statsWithGermanNames[germanStatName] = stat.base_stat;
                            });
                            
                            // Calculate GENA and PA values
                            const gena = Math.ceil(baseStatTotal / 50);
                            
                            // Get height in meters (API gives height in decimeters)
                            const heightInMeters = pokemonData.height / 10;
                            
                            // Calculate PA based on Initiative and height thresholds
                            let pa = Math.ceil(pokemonData.stats.find(stat => stat.stat.name === "speed").base_stat / 20);
                            
                            // Apply height modifiers to PA
                            if (heightInMeters <= 0.4) pa += 6;  // Under 40cm
                            else if (heightInMeters <= 1) pa += 5;  // Under 1m
                            else if (heightInMeters <= 1.5) pa += 4;  // Under 1.5m
                            else if (heightInMeters <= 2) pa += 3;  // Under 2m
                            else if (heightInMeters <= 3) pa += 2;  // Under 3m
                            else if (heightInMeters <= 5) pa += 1;  // Under 5m
                            
                            return {
                                id: 10000 + formData.id, // Use a high ID for variants to avoid conflicts
                                name: germanName,
                                englishName: form.name,
                                sprite: formData.sprites.front_default || pokemonData.sprites.front_default,
                                stats: {
                                    hp: pokemonData.stats.find(stat => stat.stat.name === "hp")?.base_stat || 50,
                                    attack: pokemonData.stats.find(stat => stat.stat.name === "attack")?.base_stat || 10,
                                    defense: pokemonData.stats.find(stat => stat.stat.name === "defense")?.base_stat || 10,
                                    speed: pokemonData.stats.find(stat => stat.stat.name === "speed")?.base_stat || 10
                                },
                                statsGerman: statsWithGermanNames,
                                baseStatTotal: baseStatTotal,
                                height: heightInMeters,
                                weight: pokemonData.weight / 10, // Weight in kg
                                types: pokemonData.types.map(type => type.type.name),
                                isVariant: true,
                                baseFormId: pokemonData.id,
                                gena: gena,
                                pa: pa
                            };
                        } catch (error) {
                            console.error(`Error fetching details for form ${form.name}:`, error);
                            return null;
                        }
                    })
                );
                
                // Add valid forms to the Pokémon list
                formsBatchResults
                    .filter(form => form !== null)
                    .forEach(form => {
                        pokemonList.push(form);
                    });
            }
        } catch (error) {
            console.error("Error fetching variant forms:", error);
        }
        
        // Remove loading message
        const loadingMessageElement = document.getElementById('pokemon-loading');
        if (loadingMessageElement) {
            loadingMessageElement.remove();
        }
        
        // Filter out duplicates and null entries, then sort by ID
        pokemonCache = pokemonList
            .filter((pokemon, index, self) => 
                pokemon && self.findIndex(p => p.id === pokemon.id) === index
            )
            .sort((a, b) => a.id - b.id);
        
        pokemonLoaded = true;
        console.log(`Successfully loaded ${pokemonCache.length} Pokémon including variants`);
        
        return pokemonCache;
    } catch (error) {
        console.error("Error loading Pokémon:", error);
        
        // Remove loading message in case of error
        const loadingMessageElement = document.getElementById('pokemon-loading');
        if (loadingMessageElement) {
            loadingMessageElement.remove();
        }
        
        return [];
    }
}

/**
 * Convert Pokémon data to character template
 * @param {Object} pokemon - Pokémon data
 * @returns {Object} - Character template
 */
function convertPokemonToCharacter(pokemon) {
    // Convert types to German
    const typesDe = pokemon.types.map(type => getGermanTypeName(type));
    
    // Calculate Initiative, GENA, PA, and BW values
    const initiativeBase = pokemon.stats.speed;
    const initiativeDisplay = Math.ceil(initiativeBase / 10);
    
    // Calculate BW (Movement)
    let bwValue = Math.ceil(initiativeBase / 10);
    
    // Reduce by 1 for every 25kg of weight
    const weightInKg = pokemon.weight || 0;
    const weightReduction = Math.floor(weightInKg / 25);
    bwValue = Math.max(bwValue - weightReduction, Math.ceil(initiativeBase / 20));
    
    // Calculate luck tokens - 1 token for every 80 points below 600 (minimum 1)
    const baseStatTotal = pokemon.baseStatTotal || 0;
    const luckTokens = Math.max(1, 1 + Math.floor((600 - baseStatTotal) / 80));
    
    // Calculate the "Fliegend" attribute
    let fliegend = false;
    // Check if Pokemon has Flying, Ghost or Dragon type
    if (pokemon.types && pokemon.types.some(type => 
        ["flying", "ghost", "dragon"].includes(type.toLowerCase()))) {
        fliegend = true;
    }
    // Check if Pokemon has Schwebe or Schwebedurch ability
    else if (pokemon.abilities && pokemon.abilities.some(ability => 
        ability.name === "Schwebe" || ability.name === "Schwebedurch" || 
        ability.englishName === "levitate" || ability.englishName === "levitate-through")) {
        fliegend = true;
    }
    
    // Calculate the "Schwimmend" attribute with new restrictions
    let schwimmend = false;
    
    // First check if Pokemon has qualifying types for "Schwimmend"
    if (pokemon.types && pokemon.types.some(type => 
        ["water", "flying", "normal", "dragon", "bug", "ice", "dark", "electric", "fighting"].includes(type.toLowerCase()))) {
        schwimmend = true;
    }
    
    // Check if the Pokemon has a Water type specifically
    const hasWaterType = pokemon.types && pokemon.types.some(type => type.toLowerCase() === "water");
    
    // Check if Pokemon has any of the excluded types
    const hasExcludedType = pokemon.types && pokemon.types.some(type => 
        ["fire", "rock", "ground", "steel"].includes(type.toLowerCase()));
    
    // Remove Schwimmend attribute if Pokemon has excluded type AND doesn't have Water type
    if (hasExcludedType && !hasWaterType) {
        schwimmend = false;
    }
    
    return {
        uniqueId: `pokemon_${pokemon.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: pokemon.name,
        englishName: pokemon.englishName,
        spriteUrl: pokemon.sprite,
        spriteNum: (pokemon.id % 12) + 1,
        attacks: [{
            type: 'melee',
            weaponName: "Verzweifler",
            damage: 5,
            range: 1,
            kategorie: 'physisch'
        }],
        combatStats: {
            kp: pokemon.stats.hp,
            gena: pokemon.gena || Math.ceil((pokemon.baseStatTotal || 300) / 50),
            pa: pokemon.pa || Math.ceil(pokemon.stats.speed / 20) + 3,
            init: initiativeDisplay,
            bw: bwValue,
            luckTokens: luckTokens
        },
        strategy: 'aggressive',
        forcingMode: 'always',
        // Add Pokémon types with German translations
        pokemonTypes: pokemon.types,
        pokemonTypesDe: typesDe,
        // Add terrain attributes
        terrainAttributes: {
            fliegend: fliegend,
            schwimmend: schwimmend
        },
        // Add detailed stats data for tooltip
        statsDetails: {
            baseStatTotal: pokemon.baseStatTotal,
            statsGerman: pokemon.statsGerman || null,
            height: pokemon.height,
            weight: pokemon.weight,
            abilities: pokemon.abilities || []
        },
        // Add empty statusEffects array
        statusEffects: []
    };
}

/**
 * Get a character template (Pokémon) by ID
 * @param {string} pokemonId - The Pokémon ID (number as string)
 * @returns {Object} - The character template
 */
export function getCharacterTemplate(pokemonId) {
    if (!pokemonId) {
        return null;
    }
    
    // For numeric IDs, look up Pokémon
    const id = parseInt(pokemonId, 10);
    const pokemon = pokemonCache.find(p => p.id === id);
    
    if (pokemon) {
        return convertPokemonToCharacter(pokemon);
    }
    
    // Fallback to Pikachu if Pokémon not found
    return {
        name: "Pikachu",
        spriteNum: 1,
        attributes: { main: { ko: 10 } },
        combatStats: { kp: 25 },
        strategy: 'aggressive',
        forcingMode: 'always',
        inventory: [
            { name: "Pokéball", quantity: 3 },
            { name: "Batterie", quantity: 2 }
        ]
    };
}

/**
 * Get available templates (Pokémon)
 * @returns {Promise<Array>} - Promise resolving to list of Pokémon templates
 */
export async function getAvailableTemplates() {
    try {
        // Make sure Pokémon are loaded
        if (!pokemonLoaded) {
            await loadPokemon();
        }
        
        return pokemonCache.map(pokemon => ({
            id: pokemon.id,
            name: pokemon.name,
            sprite: pokemon.sprite
        }));
    } catch (error) {
        console.error("Error getting available templates:", error);
        return [];
    }
}

// Cache for fetched move data
const moveCache = new Map();

/**
 * Get all moves for a Pokémon (including level-up, TM/HM, breeding, etc.)
 * @param {string} pokemonName - English name of the Pokémon
 * @returns {Promise<Array>} - Promise that resolves to array of move data
 */
export async function getPokemonMoves(pokemonName) {
    try {
        // Normalize name for API
        const normalizedName = pokemonName.toLowerCase().replace(/[\s-]+/g, '-');
        
        // Fetch Pokémon data to get moves list
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalizedName}`);
        const pokemonData = await pokemonResponse.json();
        
        // Get all moves the Pokémon can learn
        const movePromises = pokemonData.moves.map(async (moveEntry) => {
            const moveName = moveEntry.move.name;
            
            // Check if move is already in cache
            if (moveCache.has(moveName)) {
                return moveCache.get(moveName);
            }
            
            try {
                // Fetch detailed move data
                const moveResponse = await fetch(moveEntry.move.url);
                const moveData = await moveResponse.json();
                
                // Find German name in names array
                const germanName = moveData.names.find(nameEntry => 
                    nameEntry.language.name === "de"
                )?.name || moveData.name;
                
                // Calculate strength in d6 (power divided by 10, rounded up)
                let strength = 0;
                if (moveData.power) {
                    strength = Math.ceil(moveData.power / 10);
                }
                
                // Get type information
                const englishType = moveData.type.name;
                const germanType = getGermanTypeName(englishType);
                
                // Get attack category (Physisch/Speziell/Status) - use the damage class from API
                const damageClass = moveData.damage_class?.name || 'physical'; // Default to physical if not found

                
                //Reset damage to 0 for status moves!
                if (damageClass === 'status') {
                    strength = 0;
                }

                let category;
                if (damageClass === 'physical') {
                    category = 'Physisch';
                } else if (damageClass === 'status') {
                    category = 'Status';
                } else {
                    category = 'Speziell';
                }
                
                // Look up move in RANGED_WEAPON_TYPES by its German name (lowercase)
                const normalizedGermanName = germanName.toLowerCase();
                
                // Default values
                let moveRange = 0;  // Default range
                let moveEffect = null;  // Default no effect
                let moveCone = undefined; //Default no cone
                let moveBuff = undefined; //Default no buff/buffedStats
                let moveBuffedStats = undefined;
                
                // Check if move exists in config
                if (RANGED_WEAPON_TYPES[normalizedGermanName]) {
                    const configData = RANGED_WEAPON_TYPES[normalizedGermanName];
                    
                    // Get range from config
                    moveRange = configData.range || moveRange;
                    moveCone = configData.cone || moveCone;
                    moveBuff = configData.buff || moveBuff;
                    moveBuffedStats = configData.moveBuffedStats || moveBuffedStats;
                    
                    // Only set effect if it exists in config
                    if (configData.effect) {
                        moveEffect = configData.effect;
                    }
                }
                
                // Create move object with values from config
                const move = {
                    id: moveData.id,
                    name: germanName,
                    englishName: moveData.name,
                    type: englishType,
                    typeDe: germanType,
                    power: moveData.power || 0,
                    strength: strength,
                    range: moveRange,  // Use range from config
                    accuracy: moveData.accuracy || 100,
                    pp: moveData.pp || 0,
                    currentPP: moveData.pp || 0, // Initialize with full PP
                    damageClass: moveData.damage_class?.name || 'physical',
                    category: category, // Add German category (Physisch/Speziell)
                    effect: moveEffect, // Use effect from config (null if not found)
                    cone: moveCone,
                    buff: moveBuff,
                    buffedStats: moveBuffedStats
                };

                // Only add buff properties if they exist in the config
                if (RANGED_WEAPON_TYPES[normalizedGermanName]) {
                    const configData = RANGED_WEAPON_TYPES[normalizedGermanName];
                    if (configData.buff !== undefined) {
                        move.buff = configData.buff;
                    }
                    if (configData.buffedStats !== undefined) {
                        move.buffedStats = configData.buffedStats;
                    }
                }
                
                // Add to cache
                moveCache.set(moveName, move);
                
                return move;
            } catch (error) {
                console.error(`Error fetching move ${moveName}:`, error);
                return null;
            }
        });
        
        // Wait for all move data to be fetched
        const moves = await Promise.all(movePromises);
        
        // Filter out null values and sort by German name
        return moves
            .filter(move => move !== null)
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error(`Error fetching moves for ${pokemonName}:`, error);
        return [];
    }
}

/**
 * Enhance Pokémon character template with moves data
 * @param {Object} character - The character object
 * @returns {Promise<Object>} - Promise that resolves to enhanced character
 */
export async function enhanceCharacterWithMoves(character) {
    if (!character || !character.englishName) {
        return character;
    }
    
    try {
        // Get all moves for this Pokémon
        const moves = await getPokemonMoves(character.englishName);
        
        // Add moves to character
        character.availableMoves = moves;
        
        // Initialize selected moves array if not present
        if (!character.selectedMoves) {
            character.selectedMoves = [null, null, null, null];
        }
        
        return character;
    } catch (error) {
        console.error(`Error enhancing character ${character.name} with moves:`, error);
        return character;
    }
}

// German type name mapping
const TYPE_NAMES_DE = {
    'normal': 'Normal',
    'fire': 'Feuer',
    'water': 'Wasser',
    'electric': 'Elektro',
    'grass': 'Pflanze',
    'ice': 'Eis',
    'fighting': 'Kampf',
    'poison': 'Gift',
    'ground': 'Boden',
    'flying': 'Flug',
    'psychic': 'Psycho',
    'bug': 'Käfer',
    'rock': 'Gestein',
    'ghost': 'Geist',
    'dragon': 'Drache',
    'dark': 'Unlicht',
    'steel': 'Stahl',
    'fairy': 'Fee'
};

/**
 * Get German name for a Pokémon type
 * @param {string} englishType - English type name
 * @returns {string} - German type name
 */
export function getGermanTypeName(englishType) {
    return TYPE_NAMES_DE[englishType.toLowerCase()] || englishType;
}