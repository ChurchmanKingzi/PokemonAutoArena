/**
 * Custom monster templates for the battle system
 */

import { RANGED_WEAPON_TYPES } from './charakterAuswahlConfig.js';
import { getAbilities, getAbilityDescription } from './abilityService.js';
import { getPokemonAbilitiesFromService } from './characterManager.js';

/**
 * List of custom monsters to add to the game
 * Note: Abilities are now handled by abilityService.js based on Pokemon ID
 */
export const customMonsters = [
    {
        id: 90001, // Using high IDs to avoid conflicts
        name: "Colosschmelz",
        englishName: "Colosschmelz",
        sprite: "FakemonSprites/Colosschmelz.png",
        stats: {
            hp: 104,
            attack: 75,
            defense: 110,
            special_attack: 100,
            special_defense: 90,
            speed: 1
        },
        statsGerman: {
            'KP': 104,
            'Angriff': 75,
            'Verteidigung': 110,
            'Spezial-Angriff': 100,
            'Spezial-Verteidigung': 90,
            'Initiative': 1
        },
        baseStatTotal: 480,
        height: 1.8, // in meters
        weight: 500, // in kg
        types: ["fire", "steel"],
        availableMoves: [
            {
                id: 71,
                name: "Absorber",
                englishName: "absorb",
                type: "grass",
                typeDe: "Pflanze",
                power: 20,
                strength: 2,
                pp: 25,
                currentPP: 25,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 523,
                name: "Dampfwalze",
                englishName: "bulldoze",
                type: "ground",
                typeDe: "Boden",
                power: 60,
                strength: 6,
                pp: 20,
                currentPP: 20,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 334,
                name: "Eisenabwehr",
                englishName: "iron-defense",
                type: "steel",
                typeDe: "Stahl",
                power: 0,
                strength: 0,
                pp: 15,
                currentPP: 15,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 414,
                name: "Erdkräfte",
                englishName: "earth-power",
                type: "ground",
                typeDe: "Boden",
                power: 90,
                strength: 9,
                pp: 10,
                currentPP: 10,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 310,
                name: "Erstauner",
                englishName: "astonish",
                type: "ghost",
                typeDe: "Geist",
                power: 30,
                strength: 3,
                pp: 15,
                currentPP: 15,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 284,
                name: "Eruption",
                englishName: "eruption",
                type: "fire",
                typeDe: "Feuer",
                power: 150,
                strength: 15,
                pp: 5,
                currentPP: 5,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 436,
                name: "Flammensturm",
                englishName: "lava-plume",
                type: "fire",
                typeDe: "Feuer",
                power: 80,
                strength: 8,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 53,
                name: "Flammenwurf",
                englishName: "flamethrower",
                type: "fire",
                typeDe: "Feuer",
                power: 90,
                strength: 9,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 174,
                name: "Fluch",
                englishName: "curse",
                type: "ghost",
                typeDe: "Geist",
                power: 0,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 202,
                name: "Gigasauger",
                englishName: "giga-drain",
                type: "grass",
                typeDe: "Pflanze",
                power: 75,
                strength: 8,
                pp: 10,
                currentPP: 10,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 52,
                name: "Glut",
                englishName: "ember",
                type: "fire",
                typeDe: "Feuer",
                power: 40,
                strength: 4,
                pp: 25,
                currentPP: 25,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 106,
                name: "Härtner",
                englishName: "harden",
                type: "normal",
                typeDe: "Normal",
                power: 0,
                strength: 0,
                pp: 30,
                currentPP: 30,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 315,
                name: "Hitzekoller",
                englishName: "overheat",
                type: "fire",
                typeDe: "Feuer",
                power: 130,
                strength: 13,
                pp: 5,
                currentPP: 5,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 257,
                name: "Hitzewelle",
                englishName: "heat-wave",
                type: "fire",
                typeDe: "Feuer",
                power: 95,
                strength: 10,
                pp: 10,
                currentPP: 10,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 517,
                name: "Inferno",
                englishName: "inferno",
                type: "fire",
                typeDe: "Feuer",
                power: 100,
                strength: 10,
                pp: 5,
                currentPP: 5,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 499,
                name: "Klärsmog",
                englishName: "clear-smog",
                type: "poison",
                typeDe: "Gift",
                power: 50,
                strength: 5,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 72,
                name: "Megasauger",
                englishName: "mega-drain",
                type: "grass",
                typeDe: "Pflanze",
                power: 40,
                strength: 4,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 108,
                name: "Rauchwolke",
                englishName: "smokescreen",
                type: "normal",
                typeDe: "Normal",
                power: 0,
                strength: 0,
                pp: 20,
                currentPP: 20,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 328,
                name: "Sandgrab",
                englishName: "sand-tomb",
                type: "ground",
                typeDe: "Boden",
                power: 35,
                strength: 4,
                pp: 15,
                currentPP: 15,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 659,
                name: "Sandsammler",
                englishName: "shore-up",
                type: "ground",
                typeDe: "Boden",
                power: 0,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 201,
                name: "Sandsturm",
                englishName: "sandstorm",
                type: "rock",
                typeDe: "Gestein",
                power: 0,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 28,
                name: "Sandwirbel",
                englishName: "sand-attack",
                type: "ground",
                typeDe: "Boden",
                power: 0,
                strength: 0,
                pp: 15,
                currentPP: 15,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 182,
                name: "Schutzschild",
                englishName: "protect",
                type: "normal",
                typeDe: "Normal",
                power: 0,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 247,
                name: "Spukball",
                englishName: "shadow-ball",
                type: "ghost",
                typeDe: "Geist",
                power: 80,
                strength: 8,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            }
        ]
    },

    {
        id: 90002, // Using high IDs to avoid conflicts
        name: "Haspihorr",
        englishName: "Haspihorr",
        sprite: "FakemonSprites/Haspihorr.png",
        stats: {
            hp: 55,
            attack: 44,
            defense: 44,
            special_attack: 66,
            special_defense: 56,
            speed: 85
        },
        statsGerman: {
            'KP': 55,
            'Angriff': 44,
            'Verteidigung': 44,
            'Spezial-Angriff': 66,
            'Spezial-Verteidigung': 56,
            'Initiative': 85
        },
        baseStatTotal: 350,
        height: 0.4, // in meters
        weight: 4.5, // in kg
        types: ["ghost", "normal"],
        availableMoves: [
            {
                id: 98, // Agility
                name: "Agilität",
                englishName: "agility",
                type: "psychic",
                typeDe: "Psycho",
                power: null,
                strength: 0,
                pp: 30,
                currentPP: 30,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 61, // Shadow Claw
                name: "Dunkelklaue",
                englishName: "shadow-claw",
                type: "ghost",
                typeDe: "Geist",
                power: 70,
                strength: 7,
                pp: 15,
                currentPP: 15,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 327, // Shadow Punch
                name: "Finsterfaust",
                englishName: "shadow-punch",
                type: "ghost",
                typeDe: "Geist",
                power: 60,
                strength: 6,
                pp: 20,
                currentPP: 20,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 109, // Curse
                name: "Fluch",
                englishName: "curse",
                type: "ghost",
                typeDe: "Geist",
                power: null,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 361, // Healing Wish
                name: "Heilopfer",
                englishName: "healing-wish",
                type: "psychic",
                typeDe: "Psycho",
                power: null,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 343, // Baby-Doll Eyes
                name: "Kulleraugen",
                englishName: "baby-doll-eyes",
                type: "fairy",
                typeDe: "Fee",
                power: null,
                strength: 0,
                pp: 30,
                currentPP: 30,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 288, // Grudge
                name: "Nachspiel",
                englishName: "grudge",
                type: "ghost",
                typeDe: "Geist",
                power: null,
                strength: 0,
                pp: 5,
                currentPP: 5,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 150, // Splash
                name: "Platscher",
                englishName: "splash",
                type: "normal",
                typeDe: "Normal",
                power: null,
                strength: 0,
                pp: 40,
                currentPP: 40,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 98, // Quick Attack
                name: "Ruckzuckhieb",
                englishName: "quick-attack",
                type: "normal",
                typeDe: "Normal",
                power: 40,
                strength: 4,
                pp: 30,
                currentPP: 30,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 180, // Shadow Sneak
                name: "Schattenstoß",
                englishName: "shadow-sneak",
                type: "ghost",
                typeDe: "Geist",
                power: 40,
                strength: 4,
                pp: 30,
                currentPP: 30,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 243, // Mirror Coat
                name: "Spiegelcape",
                englishName: "mirror-coat",
                type: "psychic",
                typeDe: "Psycho",
                power: null,
                strength: 0,
                pp: 20,
                currentPP: 20,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 247, // Shadow Ball
                name: "Spukball",
                englishName: "shadow-ball",
                type: "ghost",
                typeDe: "Geist",
                power: 80,
                strength: 8,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 340, // Bounce
                name: "Sprungfeder",
                englishName: "bounce",
                type: "flying",
                typeDe: "Flug",
                power: 85,
                strength: 9,
                pp: 5,
                currentPP: 5,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 226, // Baton Pass
                name: "Stafette",
                englishName: "baton-pass",
                type: "normal",
                typeDe: "Normal",
                power: null,
                strength: 0,
                pp: 40,
                currentPP: 40,
                damageClass: 'status',
                category: 'Status'
            }
        ],
    },

    {
        id: 90003, // Using high IDs to avoid conflicts
        name: "Horrohr",
        englishName: "Horrohr",
        sprite: "FakemonSprites/Horrohr.png",
        stats: {
            hp: 65,
            attack: 54,
            defense: 84,
            special_attack: 76,
            special_defense: 96,
            speed: 105
        },
        statsGerman: {
            'KP': 65,
            'Angriff': 54,
            'Verteidigung': 84,
            'Spezial-Angriff': 76,
            'Spezial-Verteidigung': 96,
            'Initiative': 105
        },
        baseStatTotal: 480,
        height: 1.2, // in meters
        weight: 13.3, // in kg
        types: ["ghost", "normal"],
        availableMoves: [
            {
            
                id: 194, // Destiny Bond
                name: "Abgangsbund",
                englishName: "destiny-bond",
                type: "ghost",
                typeDe: "Geist",
                power: null,
                strength: 0,
                pp: 5,
                currentPP: 5,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 98, // Agility
                name: "Agilität",
                englishName: "agility",
                type: "psychic",
                typeDe: "Psycho",
                power: null,
                strength: 0,
                pp: 30,
                currentPP: 30,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 61, // Shadow Claw
                name: "Dunkelklaue",
                englishName: "shadow-claw",
                type: "ghost",
                typeDe: "Geist",
                power: 70,
                strength: 7,
                pp: 15,
                currentPP: 15,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 327, // Shadow Punch
                name: "Finsterfaust",
                englishName: "shadow-punch",
                type: "ghost",
                typeDe: "Geist",
                power: 60,
                strength: 6,
                pp: 20,
                currentPP: 20,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 109, // Curse
                name: "Fluch",
                englishName: "curse",
                type: "ghost",
                typeDe: "Geist",
                power: null,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 366, // Cross Poison
                name: "Giftstreich",
                englishName: "cross-poison",
                type: "poison",
                typeDe: "Gift",
                power: 70,
                strength: 7,
                pp: 20,
                currentPP: 20,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 361, // Healing Wish
                name: "Heilopfer",
                englishName: "healing-wish",
                type: "psychic",
                typeDe: "Psycho",
                power: null,
                strength: 0,
                pp: 10,
                currentPP: 10,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 343, // Baby-Doll Eyes
                name: "Kulleraugen",
                englishName: "baby-doll-eyes",
                type: "fairy",
                typeDe: "Fee",
                power: null,
                strength: 0,
                pp: 30,
                currentPP: 30,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 288, // Grudge
                name: "Nachspiel",
                englishName: "grudge",
                type: "ghost",
                typeDe: "Geist",
                power: null,
                strength: 0,
                pp: 5,
                currentPP: 5,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 150, // Splash
                name: "Platscher",
                englishName: "splash",
                type: "normal",
                typeDe: "Normal",
                power: null,
                strength: 0,
                pp: 40,
                currentPP: 40,
                damageClass: 'status',
                category: 'Status'
            },
            {
                id: 98, // Quick Attack
                name: "Ruckzuckhieb",
                englishName: "quick-attack",
                type: "normal",
                typeDe: "Normal",
                power: 40,
                strength: 4,
                pp: 30,
                currentPP: 30,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 566, // Spirit Shackle
                name: "Schattenfessel",
                englishName: "spirit-shackle",
                type: "ghost",
                typeDe: "Geist",
                power: 80,
                strength: 8,
                pp: 10,
                currentPP: 10,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 180, // Shadow Sneak
                name: "Schattenstoß",
                englishName: "shadow-sneak",
                type: "ghost",
                typeDe: "Geist",
                power: 40,
                strength: 4,
                pp: 30,
                currentPP: 30,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 789, // Spirit Break
                name: "Seelenbruch",
                englishName: "spirit-break",
                type: "fairy",
                typeDe: "Fee",
                power: 75,
                strength: 8,
                pp: 15,
                currentPP: 15,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 243, // Mirror Coat
                name: "Spiegelcape",
                englishName: "mirror-coat",
                type: "psychic",
                typeDe: "Psycho",
                power: null,
                strength: 0,
                pp: 20,
                currentPP: 20,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 247, // Shadow Ball
                name: "Spukball",
                englishName: "shadow-ball",
                type: "ghost",
                typeDe: "Geist",
                power: 80,
                strength: 8,
                pp: 15,
                currentPP: 15,
                damageClass: 'special',
                category: 'Speziell'
            },
            {
                id: 340, // Bounce
                name: "Sprungfeder",
                englishName: "bounce",
                type: "flying",
                typeDe: "Flug",
                power: 85,
                strength: 9,
                pp: 5,
                currentPP: 5,
                damageClass: 'physical',
                category: 'Physisch'
            },
            {
                id: 226, // Baton Pass
                name: "Stafette",
                englishName: "baton-pass",
                type: "normal",
                typeDe: "Normal",
                power: null,
                strength: 0,
                pp: 40,
                currentPP: 40,
                damageClass: 'status',
                category: 'Status'
            }
        ]
    }
];

/**
 * Adds custom monsters to the pokemonCache
 * @param {Array} pokemonCache - The existing cache of Pokémon
 * @returns {Array} - The updated cache with custom monsters
 */
export function addCustomMonsters(pokemonCache) {
    console.log("Adding custom monsters to the game...");
    
    // First, synchronize all moves with the config
    const processedCustomMonsters = customMonsters.map(monster => {
        // Make a copy of the monster
        const processedMonster = { ...monster };
        
        // Process all moves to sync with config
        if (processedMonster.availableMoves && Array.isArray(processedMonster.availableMoves)) {
            processedMonster.availableMoves = processedMonster.availableMoves.map(move => 
                syncMoveWithConfig(move, RANGED_WEAPON_TYPES)
            );
        }
        
        return processedMonster;
    });
    
    // Now process the monsters with synced moves for terrain attributes
    const processedMonsters = processedCustomMonsters.map(monster => {        
        // Calculate terrain attributes
        // "Fliegend" attribute
        let fliegend = false;
        // Check if Pokemon has Flying, Ghost or Dragon type
        if (monster.types && monster.types.some(type => 
            ["flying", "dragon"].includes(type.toLowerCase()))) {
            fliegend = true;
        }
        // Note: We would also check for Schwebe/Schwebedurch abilities, but those are now
        // handled by the ability service in characterManager.js
            
        const hasWaterType = monster.types.some(type => type.toLowerCase() === "water");
        const hasExcludedType = monster.types.some(type => 
            ["fire", "rock", "ground", "steel"].includes(type.toLowerCase())
        );

        let schwimmend = monster.types.some(type => 
            ["water", "flying", "normal", "dragon", "bug", "ice", "dark", "electric", "fighting"].includes(type.toLowerCase())
        );
            
        if (hasExcludedType && !hasWaterType) {
            schwimmend = false;
        }

        // Convert to format compatible with existing Pokémon
        return {
            id: monster.id,
            name: monster.name,
            englishName: monster.englishName,
            sprite: monster.sprite,
            stats: monster.stats,
            statsGerman: monster.statsGerman,
            baseStatTotal: monster.baseStatTotal,
            height: monster.height,
            weight: monster.weight,
            types: monster.types,
            abilities: getPokemonAbilitiesFromService(monster.id),
            gena: monster.gena,
            pa: monster.pa,
            terrainAttributes: {
                fliegend: fliegend,
                schwimmend: schwimmend
            },
            availableMoves: monster.availableMoves,
            isCustomMonster: true // Mark as custom
        };
    });
    
    // Add the custom monsters to the end of the cache
    return [...pokemonCache, ...processedMonsters];
}

/**
 * Integration function to add to characterManager.js
 * This is the function you need to import and call in the loadPokemon function
 */
export function integrateCustomMonsters() {
    // Import this in characterManager.js and call it at the end of loadPokemon
    // Right before returning pokemonCache
    return function(pokemonCache) {
        // Make sure the custom monsters module is loaded
        try {
            return addCustomMonsters(pokemonCache);
        } catch (error) {
            console.error("Error loading custom monsters:", error);
            return pokemonCache;
        }
    };
}

/**
 * Synchronizes a move's properties with the RANGED_WEAPON_TYPES configuration
 * @param {Object} move - The move object to synchronize
 * @param {Object} rangedWeaponTypes - The RANGED_WEAPON_TYPES config object
 * @returns {Object} - The synchronized move with properties from config
 */
export function syncMoveWithConfig(move, rangedWeaponTypes) {
    if (!move || !move.name) return move;
    
    // Create a copy of the move to avoid modifying the original directly
    const syncedMove = { ...move };
    
    // Ensure accuracy is always preserved (needed by the system)
    if (!syncedMove.accuracy) {
        syncedMove.accuracy = 100; // Default accuracy if not set
    }
    
    // Normalize move name to lowercase for config lookup
    const normalizedMoveName = move.name.toLowerCase();
    
    // If this move exists in the config, use the config values
    if (rangedWeaponTypes && rangedWeaponTypes[normalizedMoveName]) {
        const configData = rangedWeaponTypes[normalizedMoveName];
        
        // Set range from config (important property)
        if (configData.range !== undefined) {
            syncedMove.range = configData.range;
        }
        
        // Handle cone (for area attacks)
        if (configData.cone !== undefined) {
            syncedMove.cone = configData.cone;
        }
        
        // Handle effect text
        if (configData.effect !== undefined) {
            syncedMove.effect = configData.effect;
        }
        
        // Handle buff flag
        if (configData.buff !== undefined) {
            syncedMove.buff = configData.buff;
        }
        
        // Handle buffed stats
        if (configData.buffedStats !== undefined) {
            syncedMove.buffedStats = configData.buffedStats;
        }
        
        // Handle contact flag
        if (configData.kontakt !== undefined) {
            syncedMove.kontakt = configData.kontakt;
        }
    } else {
        // If move is not in config, set reasonable defaults
        // This ensures moves not in the config still have necessary properties
        if (syncedMove.range === undefined) {
            // Set default range based on attack category
            if (syncedMove.damageClass === 'status') {
                syncedMove.range = 0; // Status moves typically affect self
            } else if (syncedMove.damageClass === 'physical') {
                syncedMove.range = 1; // Physical moves typically melee range
            } else {
                syncedMove.range = 3; // Special moves typically have some range
            }
        }
    }
    
    return syncedMove;
}

/**
 * Processes all moves for a monster to ensure they're synchronized with config
 * @param {Object} monster - The monster object
 * @returns {Object} - The monster with synchronized moves
 */
function processMoves(monster) {
    if (monster.availableMoves && Array.isArray(monster.availableMoves)) {
        monster.availableMoves = monster.availableMoves.map(move => 
            syncMoveWithConfig(move, RANGED_WEAPON_TYPES)
        );
    }
    return monster;
}