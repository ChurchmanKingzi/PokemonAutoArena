/**
 * Status Effects System for Pokémon Battle Simulator
 * Updated to work with the Pokemon overlay system for status icons
 */
import { updatePokemonStatusIcons } from './pokemonOverlay.js';
import { applyStatusDamage, STATUS_SOURCE } from'./damage.js';

// Define all status effects with their properties
export const STATUS_EFFECTS = {
  POISONED: {
    id: 'poisoned',
    name: 'Vergiftet',
    effect: 'Fügt dem Pokemon nach jeder seiner Runden 1/16 seiner max KP als Schaden zu.',
    cssClass: 'status-poisoned',
    htmlSymbol: '☠'
  },
  BADLY_POISONED: {
    id: 'badly-poisoned',
    name: 'Schwer vergiftet',
    effect: 'Fügt dem Pokemon nach jeder seiner Runden 1/16 seiner max KP als Schaden zu. Der Schaden erhöht sich jedes Mal um 1/16.',
    cssClass: 'status-badly-poisoned',
    htmlSymbol: '☠+'
  },
  BURNED: {
    id: 'burned',
    name: 'Verbrannt',
    effect: 'Fügt dem Pokemon nach jeder seiner Runden 1/8 seiner max KP als Schaden zu. Sein ANG ist halbiert.',
    cssClass: 'status-burned',
    htmlSymbol: '🔥'
  },
  ASLEEP: {
      id: 'asleep',
      name: 'Schlafend',
      effect: 'Das Pokemon kann nicht agieren. Es hat eine 10% Chance, pro Runde aufzuwachen oder erwacht bei direktem Schaden.',
      cssClass: 'status-asleep',
      htmlSymbol: '☁'
  },
  PARALYZED: {
    id: 'paralyzed',
    name: 'Paralysiert',
    effect: 'Das Pokemon hat eine 30%-Chance, seine Runde zu überspringen.',
    cssClass: 'status-paralyzed',
    htmlSymbol: '⚡'
  },
  FROZEN: {
    id: 'frozen',
    name: 'Eingefroren',
    effect: 'Das Pokemon kann nicht agieren. Es taut nach einer Weile von allein auf, oder wenn es von einer Feuer-Attacke getroffen wird.',
    cssClass: 'status-frozen',
    htmlSymbol: '❄'
  },
  CONFUSED: {
    id: 'confused',
    name: 'Verwirrt',
    effect: 'Das Pokemon zielt auf den nächsten Verbündeten anstatt auf Gegner. Ohne Verbündete bewegt es sich zufällig. 30% Chance pro Runde, sich zu erholen.',
    cssClass: 'status-confused',
    htmlSymbol: '?'
  },
  CURSED: {
    id: 'cursed',
    name: 'Verflucht',
    effect: 'Fügt dem Pokemon nach jeder seiner Runden 1/4 seiner max KP als Schaden zu.',
    cssClass: 'status-cursed',
    htmlSymbol: '👻'
  },
  INFATUATED: {
    id: 'infatuated',
    name: 'Verliebt',
    effect: 'Das Pokemon wird den Verursacher dieses Effekts solange als Verbündeten ansehen, bis es kein anderes gegnerisches Ziel mehr hat.',
    cssClass: 'status-infatuated',
    htmlSymbol: '♥'
  },
  HELD: {
    id: 'held',
    name: 'Festgehalten',
    effect: 'Das Pokemon kann sich nicht bewegen und nimmt jede Runde Schaden.',
    cssClass: 'status-held',
    htmlSymbol: '⚓'
  },
  SEEDED: {
    id: 'seeded',
    name: 'Egelsamen',
    effect: 'Fügt dem Pokemon nach jeder seiner Runden 1/16 seiner max KP als Schaden zu und heilt den Verursacher um denselben Betrag.',
    cssClass: 'status-seeded',
    htmlSymbol: '🌿'
  },
  SNARED: {
    id: 'snared',
    name: 'Gefesselt',
    effect: 'Das Pokemon kann sich bis zum Ende seines nächsten Zugs nicht bewegen und nicht ausweichen.',
    cssClass: 'status-snared',
    htmlSymbol: '🕸️',
    preventMovement: true,
    preventDodge: true
  },
};

/**
 * Initialize status effects container for a Pokémon
 * @param {Object} pokemon - Pokémon object to initialize
 * @returns {Object} - The initialized Pokémon object
 */
export function initializeStatusEffects(pokemon) {
  if (!pokemon.statusEffects) {
    pokemon.statusEffects = [];
  }
  return pokemon;
}

/**
 * Add a status effect to a Pokémon
 * @param {Object} pokemon - Pokémon to add effect to
 * @param {string} effectId - ID of the effect to add
 * @param {Object} options - Additional options (source, duration, etc.)
 * @returns {boolean} - Whether the effect was successfully added
 */
export function addStatusEffect(pokemon, effectId, options = {}) {
    if (!pokemon || !effectId) return false;
    
    // Initialize if needed
    initializeStatusEffects(pokemon);
    
    // Check for Floraschild ability immunity in sunny weather
    // We need to do this synchronously, so we'll check if a global weather state exists
    if (typeof window !== 'undefined' && window.battleWeatherState) {
        const hasFloraschild = hasPokemonAbility(pokemon, ['floraschild', 'flower shield'], true);
        const isSunny = window.battleWeatherState.state === 'Sonne';
        
        if (hasFloraschild && isSunny) {
            // Log the immunity message asynchronously
            import('./battleLog.js').then(module => {
                module.logBattleEvent(`${pokemon.name}'s Floraschild verhindert den Statuseffekt bei Sonnenschein!`);
            }).catch(err => console.error("Error logging Floraschild immunity:", err));
            
            return false; // Status effect blocked
        }
    } else {
        // Fallback: Try to get weather state through dynamic import
        // This will only work for subsequent calls in the same session
        import('./weather.js').then(weatherModule => {
            const currentWeather = weatherModule.getCurrentWeather();
            // Store weather state globally for future synchronous access
            if (typeof window !== 'undefined') {
                window.battleWeatherState = currentWeather;
            }
        }).catch(err => console.error("Error accessing weather state:", err));
    }
    
    // Don't add duplicates (except in special cases like badly poisoned)
    if (hasStatusEffect(pokemon, effectId) && effectId !== 'badly-poisoned') return false;
    
    // Special case: Don't allow normal poison if already badly poisoned
    if (effectId === 'poisoned' && hasStatusEffect(pokemon, 'badly-poisoned')) return false;
    
    // Special case: Upgrade poison to badly poisoned
    if (effectId === 'badly-poisoned' && hasStatusEffect(pokemon, 'poisoned')) {
        removeStatusEffect(pokemon, 'poisoned');
    }
    
    // Get the status effect definition
    const effectDef = Object.values(STATUS_EFFECTS).find(effect => effect.id === effectId);
    if (!effectDef) return false;
    
    // Create the effect instance
    const effectInstance = {
        ...effectDef,
        appliedAt: Date.now(),
        turnCount: 0,
        sourceId: options.sourceId || null,
        duration: options.duration || null,
        ...options
    };
    
    // Add to the Pokémon's status effects
    pokemon.statusEffects.push(effectInstance);
    
    // Update visual display using the new overlay system
    updateStatusEffectsVisual(pokemon);

    setTimeout(() => {
        import('./initiativeDisplay.js').then(module => {
            if (module.updateStatusIconsInInitiative && pokemon.uniqueId) {
                module.updateStatusIconsInInitiative(pokemon.uniqueId);
            }
        }).catch(err => console.error("Error updating initiative display:", err));
    }, 0);
    
    // If it's paralysis, apply the initiative effect
    if (effectId === 'paralyzed') {
        // Import dynamically to avoid circular dependencies
        import('./initiativeChanges.js').then(module => {
            const result = module.applyParalysisInitiativeEffect(pokemon.uniqueId);
            
            // If this should result in an immediate turn, trigger it
            if (result.shouldTakeTurnNow) {
                import('./turnSystem.js').then(tsModule => {
                    tsModule.triggerImmediateTurn(pokemon.uniqueId);
                });
            }
        }).catch(error => {
            console.error("Error applying paralysis initiative effect:", error);
        });
    }
    
    return true;
}

/**
 * Process status effects at the start of a turn
 * @param {Object} pokemon - The Pokémon to process
 * @returns {Array} - Array of effect messages
 */
export function processStatusEffectsStart(pokemon) {
    if (!pokemon || !pokemon.statusEffects || pokemon.statusEffects.length === 0) {
        return [];
    }
    
    const messages = [];
    const statusesToRemove = [];
    
    // Process each status effect
    pokemon.statusEffects.forEach(effect => {
        // Handle start-of-turn effects
        switch (effect.id) {
            case 'paralyzed':
                // 30% chance to skip turn
                if (Math.random() < 0.3) {
                    messages.push(`${pokemon.name} ist paralysiert und kann sich nicht bewegen!`);
                    pokemon.skipTurn = true;
                }
                break;
                
            case 'asleep':
                messages.push(`${pokemon.name} schläft tief und fest.`);
                pokemon.skipTurn = true;
                
                // Random chance to wake up (20%)
                if (Math.random() < 0.2) {
                    removeStatusEffect(pokemon, 'asleep');
                    messages.push(`${pokemon.name} ist aufgewacht!`);
                    pokemon.skipTurn = false;
                }
                break;

            case 'frozen':
                messages.push(`${pokemon.name} ist eingefroren und kann sich nicht bewegen!`);
                pokemon.skipTurn = true;
                
                // Random chance to thaw (10%)
                if (Math.random() < 0.1) {
                    removeStatusEffect(pokemon, 'frozen');
                    messages.push(`${pokemon.name} ist aufgetaut!`);
                    pokemon.skipTurn = false;
                    
                    // Remove the frozen visual effect
                    setTimeout(() => {
                        const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${pokemon.uniqueId}"]`);
                        characterEls.forEach(el => el.classList.remove('frozen-effect'));
                    }, 0);
                }
                
                // Add a turn counter to the frozen effect to ensure it doesn't last forever
                const frozenEffect = pokemon.statusEffects.find(effect => effect.id === 'frozen');
                if (frozenEffect) {
                    frozenEffect.turnCount = (frozenEffect.turnCount || 0) + 1;
                    
                    // Force thaw after 3 turns regardless of random chance
                    if (frozenEffect.turnCount >= 3) {
                        removeStatusEffect(pokemon, 'frozen');
                        messages.push(`${pokemon.name} ist nach 3 Runden aufgetaut!`);
                        pokemon.skipTurn = false;
                        
                        // Remove the frozen visual effect
                        setTimeout(() => {
                            const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${pokemon.uniqueId}"]`);
                            characterEls.forEach(el => el.classList.remove('frozen-effect'));
                        }, 0);
                    }
                }
                break;

            case 'confused':
                // Confused Pokemon targets allies instead of enemies
                pokemon.isConfused = true;
                messages.push(`${pokemon.name} ist verwirrt und kann Freund und Feind nicht unterscheiden!`);
                break;
        }
    });
    
    // Add this section to actually remove the status effects
    statusesToRemove.forEach(effectId => {
        removeStatusEffect(pokemon, effectId);
    });
    
    // Update visual representation if needed
    if (statusesToRemove.length > 0) {
        updateStatusEffectsVisual(pokemon);
    }

    return messages;
}

/**
 * Remove a status effect from a Pokémon
 * @param {Object} pokemon - Pokémon to remove effect from
 * @param {string} effectId - ID of the effect to remove
 * @returns {boolean} - Whether the effect was successfully removed
 */
export function removeStatusEffect(pokemon, effectId) {
    if (!pokemon || !pokemon.statusEffects || !effectId) return false;
    
    const initialLength = pokemon.statusEffects.length;
    const wasSleeping = effectId === 'asleep' && hasStatusEffect(pokemon, 'asleep');
    
    pokemon.statusEffects = pokemon.statusEffects.filter(effect => effect.id !== effectId);
    
    // Update visual if changed
    if (pokemon.statusEffects.length < initialLength) {
        updateStatusEffectsVisual(pokemon);
        
        // Show "Aufgewacht!" text if waking up from sleep
        if (wasSleeping) {
            showWakeUpText(pokemon);
        }
        
        // Add initiative display update
        setTimeout(() => {
            import('./initiativeDisplay.js').then(module => {
                if (module.updateStatusIconsInInitiative && pokemon.uniqueId) {
                    module.updateStatusIconsInInitiative(pokemon.uniqueId);
                }
            }).catch(err => console.error("Error updating initiative display:", err));
        }, 0);
        
        return true;
    }
    
    return false;
}

/**
 * Check if a Pokémon has a specific status effect
 * @param {Object} pokemon - Pokémon to check
 * @param {string} effectId - ID of the effect to check for
 * @returns {boolean} - Whether the Pokémon has the effect
 */
export function hasStatusEffect(pokemon, effectId) {
  if (!pokemon || !pokemon.statusEffects) return false;
  return pokemon.statusEffects.some(effect => effect.id === effectId);
}

/**
 * Create a DOM element for status effect icons (legacy function, kept for compatibility)
 * @param {Object} pokemon - Pokémon to create status icons for
 * @returns {HTMLElement|null} - DOM element with status icons or null
 */
export function createStatusEffectsDisplay(pokemon) {
  if (!pokemon || !pokemon.statusEffects || pokemon.statusEffects.length === 0) return null;
  
  const container = document.createElement('div');
  container.className = 'status-effects-container';
  
  // Add icon for each status effect
  pokemon.statusEffects.forEach(effect => {
    const iconEl = document.createElement('div');
    iconEl.className = `status-effect-icon ${effect.cssClass}`;
    iconEl.title = `${effect.name}: ${effect.effect}`;
    
    // Use a different symbol for burn - yellow flame in red circle
    if (effect.id === 'burned') {
      // Create flame icon using HTML entity for fire (🔥) or custom content
      iconEl.innerHTML = '🔥';
      iconEl.style.fontSize = '10px';
      iconEl.style.color = 'yellow';
      iconEl.style.textShadow = '0 0 2px #ff0, 0 0 3px #ff0';
    } else {
      iconEl.textContent = effect.htmlSymbol;
    }
    
    container.appendChild(iconEl);
  });
  
  return container;
}

/**
 * Check if a Pokémon has a specific ability
 * @param {Object} pokemon - The Pokémon to check
 * @param {string|Array} abilityNames - Name(s) of the ability to check for
 * @param {boolean} partialMatch - Whether to check for partial matches in ability names
 * @returns {boolean} - Whether the Pokémon has the specified ability
 */
export function hasPokemonAbility(pokemon, abilityNames, partialMatch = true) {
    if (!pokemon) return false;
    
    // Convert single ability name to array for consistent handling
    const abilityNamesArray = Array.isArray(abilityNames) ? abilityNames : [abilityNames];
    
    // Convert all ability names to lowercase for case-insensitive comparison
    const normalizedAbilityNames = abilityNamesArray.map(name => 
        typeof name === 'string' ? name.toLowerCase() : ''
    );
    
    // Helper function to check if an ability name matches any of the target names
    const matchesAbility = (name) => {
        if (!name || typeof name !== 'string') return false;
        
        const lowerName = name.toLowerCase();
        
        if (partialMatch) {
            // Check if any normalized ability name is included in this ability name
            return normalizedAbilityNames.some(targetName => 
                lowerName.includes(targetName)
            );
        } else {
            // Check for exact match (case-insensitive)
            return normalizedAbilityNames.includes(lowerName);
        }
    };
    
    // Case 1: Direct abilities array with name property
    if (pokemon.abilities && Array.isArray(pokemon.abilities)) {
        for (const ability of pokemon.abilities) {
            // Check ability name
            if (ability.name && matchesAbility(ability.name)) {
                return true;
            }
            
            // Also check ability effect description if present
            if (ability.effect && matchesAbility(ability.effect)) {
                return true;
            }
        }
    }
    
    // Case 2: Single ability property
    if (pokemon.ability) {
        if (typeof pokemon.ability === 'string') {
            if (matchesAbility(pokemon.ability)) {
                return true;
            }
        } else if (typeof pokemon.ability === 'object' && pokemon.ability.name) {
            if (matchesAbility(pokemon.ability.name)) {
                return true;
            }
        }
    }
    
    // Case 3: Check in statsDetails for ability information
    if (pokemon.statsDetails && pokemon.statsDetails.abilities) {
        for (const ability of pokemon.statsDetails.abilities) {
            if (ability.name && matchesAbility(ability.name)) {
                return true;
            }
            
            // Also check description
            if (ability.description && matchesAbility(ability.description)) {
                return true;
            }
        }
    }
    
    // Case 4: Check abilityName property
    if (pokemon.abilityName && matchesAbility(pokemon.abilityName)) {
        return true;
    }
    
    return false;
}

/**
 * Process status effects at the end of a turn
 * @param {Object} pokemon - The Pokémon to process
 * @param {Object} position - The position of the Pokémon {x, y}
 * @returns {Promise<Object>} - Object with messages array and damage amount
 */
export async function processStatusEffectsEnd(pokemon, position) {
    if (!pokemon || !pokemon.statusEffects || pokemon.statusEffects.length === 0) {
        return { messages: [], damage: 0 };
    }
    
    const messages = [];
    let totalDamage = 0;
    const statusesToRemove = [];    
    
    // Find the character ID for this Pokemon
    let pokemonId = null;
    const { getCharacterPositions } = await import('./characterPositions.js');
    const characterPositions = getCharacterPositions();
    
    for (const charId in characterPositions) {
        if (characterPositions[charId].character && 
            characterPositions[charId].character.uniqueId === pokemon.uniqueId) {
            pokemonId = charId;
            break;
        }
    }
    
    // Process each status effect
    for (const effect of pokemon.statusEffects) {
        // Increment turn counter for the effect
        effect.turnCount = (effect.turnCount || 0) + 1;
        
        // Handle end-of-turn effects
        switch (effect.id) {
            case 'poisoned':
                const poisonDamage = Math.max(1, Math.floor(pokemon.maxKP / 16));
                
                // Apply poison damage through damage system - it will handle Poison Heal ability internally
                const poisonResult = await applyStatusDamage(
                    pokemon, STATUS_SOURCE.POISON, poisonDamage,
                    {
                        sourceId: effect.sourceId, sourceName: effect.sourceName
                    },
                    {
                        targetId: pokemonId
                    }
                );
                
                // Add to total damage if damage was applied
                if (poisonResult.applied) {
                    totalDamage += poisonResult.damage;
                }
                break;
                
            case 'badly-poisoned':
                const poisonStacks = effect.turnCount;
                const badPoisonDamage = Math.max(1, Math.floor((pokemon.maxKP / 16) * poisonStacks));
                
                // Apply bad poison damage through damage system
                const badPoisonResult = await applyStatusDamage(
                    pokemon, 
                    STATUS_SOURCE.BADLY_POISON, 
                    badPoisonDamage,
                    {
                        sourceId: effect.sourceId,
                        sourceName: effect.sourceName
                    },
                    {
                        targetId: pokemonId
                    }
                );
                
                // Add to total damage if damage was applied
                if (badPoisonResult.applied) {
                    totalDamage += badPoisonResult.damage;
                }
                break;
                
            case 'burned':
                // Ensure burn damage is 1/8 of max HP, rounded up
                const burnDamage = Math.max(1, Math.ceil(pokemon.maxKP / 8));
                
                // Apply burn damage through damage system
                const burnResult = await applyStatusDamage(
                    pokemon, 
                    STATUS_SOURCE.BURN, 
                    burnDamage,
                    {
                        sourceId: effect.sourceId,
                        sourceName: effect.sourceName
                    },
                    {
                        targetId: pokemonId
                    }
                );
                
                // Add to total damage if damage was applied
                if (burnResult.applied) {
                    totalDamage += burnResult.damage;
                }
                break;
                
            case 'cursed':
                const curseDamage = Math.max(1, Math.floor(pokemon.maxKP / 4));
                
                // Apply curse damage through damage system
                const curseResult = await applyStatusDamage(
                    pokemon, 
                    STATUS_SOURCE.CURSE, 
                    curseDamage,
                    {
                        sourceId: effect.sourceId,
                        sourceName: effect.sourceName
                    },
                    {
                        targetId: pokemonId
                    }
                );
                
                // Add to total damage if damage was applied
                if (curseResult.applied) {
                    totalDamage += curseResult.damage;
                }
                break;
                
            case 'seeded':
                const seedDamage = Math.max(1, Math.floor(pokemon.maxKP / 16));
                
                // Get source character if available for healing
                let sourceCharacter = null;
                let sourceId = null;
                
                if (effect.sourceId) {
                    for (const charId in characterPositions) {
                        const charPos = characterPositions[charId];
                        if (charPos.character && charPos.character.uniqueId === effect.sourceId) {
                            sourceCharacter = charPos.character;
                            sourceId = charId;
                            break;
                        }
                    }
                }
                
                // Apply leech seed damage through damage system
                const seedResult = await applyStatusDamage(
                    pokemon, 
                    STATUS_SOURCE.LEECH_SEED, 
                    seedDamage,
                    {
                        sourceId: sourceId,
                        sourceCharacter: sourceCharacter,
                        sourceName: effect.sourceName
                    },
                    {
                        targetId: pokemonId
                    }
                );
                
                // Add to total damage if damage was applied
                if (seedResult.applied) {
                    totalDamage += seedResult.damage;
                }
                break;
                
            case 'held':
                const holdDamage = Math.max(1, Math.floor(pokemon.maxKP / 16));
                
                // Apply trap damage through damage system
                const trapResult = await applyStatusDamage(
                    pokemon, 
                    STATUS_SOURCE.TRAP, 
                    holdDamage,
                    {
                        sourceId: effect.sourceId,
                        sourceName: effect.sourceName
                    },
                    {
                        targetId: pokemonId
                    }
                );
                
                // Add to total damage if damage was applied
                if (trapResult.applied) {
                    totalDamage += trapResult.damage;
                }
                break;
                
            case 'snared':
                // Check if the snared effect has reached its duration
                if (effect.duration && effect.turnCount >= effect.duration) {
                    // Mark for removal
                    statusesToRemove.push(effect.id);
                    messages.push(`${pokemon.name} hat sich aus den Fäden befreit und kann sich wieder bewegen.`);
                }
                break;
                
            case 'confused':
                // 30% chance to recover from confusion at end of turn
                if (Math.random() < 0.3) {
                    statusesToRemove.push(effect.id);
                    messages.push(`${pokemon.name} hat sich von der Verwirrung erholt!`);
                }
                break;
        }
    }
    
    // Remove all status effects marked for removal
    statusesToRemove.forEach(effectId => {
        removeStatusEffect(pokemon, effectId);
    });
    
    // Update visual representation if needed
    if (statusesToRemove.length > 0) {
        updateStatusEffectsVisual(pokemon);
    }
    
    return { messages, damage: totalDamage };
}

/**
 * Update the visual representation of status effects for a Pokemon using the overlay system
 * @param {Object} pokemon - The Pokémon to update visuals for
 */
export function updateStatusEffectsVisual(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return;
    
    // Find character ID using uniqueId and update using the overlay system
    import('./characterPositions.js').then(module => {
        const { getCharacterPositions } = module;
        const characterPositions = getCharacterPositions();
        
        for (const charId in characterPositions) {
            if (characterPositions[charId].character && 
                characterPositions[charId].character.uniqueId === pokemon.uniqueId) {
                
                // Update status icons in the overlay system
                updatePokemonStatusIcons(charId).catch(err => {
                    console.error("Error updating Pokemon status icons:", err);
                });
                
                // Still update old visual effects for frozen/burned states on battlefield elements
                updateOldStyleVisualEffects(charId, pokemon);
                break;
            }
        }
    }).catch(err => {
        console.error("Error updating status effects visual:", err);
    });
}

/**
 * Update old-style visual effects (like frozen/burned classes) on battlefield elements
 * This is kept for compatibility with existing visual effects
 * @param {string} charId - Character ID on the battlefield
 * @param {Object} pokemon - Pokemon data
 */
function updateOldStyleVisualEffects(charId, pokemon) {
    // Find both possible character elements (regular tile and character overlay)
    const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${charId}"]`);
    
    characterEls.forEach(charEl => {
        // Remove specific effect classes
        charEl.classList.remove('frozen-effect', 'burned-effect');
        
        // Only continue if Pokémon has status effects
        if (!pokemon.statusEffects || pokemon.statusEffects.length === 0) return;
        
        // Add specific visual effects for certain statuses
        pokemon.statusEffects.forEach(effect => {
            if (effect.id === 'frozen') {
                charEl.classList.add('frozen-effect');
            } else if (effect.id === 'burned') {
                charEl.classList.add('burned-effect');
            }
        });
    });
}

/**
 * Apply status effect visual indicators to all Pokémon on battlefield
 */
export function updateAllStatusEffectsVisual() {
  // Import to avoid circular reference
  import('./characterPositions.js').then(module => {
    const { getCharacterPositions } = module;
    const characterPositions = getCharacterPositions();
    
    // Update each character's status effects
    for (const charId in characterPositions) {
      if (characterPositions[charId].character) {
        updateStatusEffectsVisualForChar(charId);
      }
    }
  });
}

/**
 * Update status effect visual for a specific character ID (legacy function)
 * Now delegates to the overlay system
 * @param {string} charId - Character ID on the battlefield
 */
export function updateStatusEffectsVisualForChar(charId) {
    // Update using the new overlay system
    updatePokemonStatusIcons(charId).catch(err => {
        console.error("Error updating status icons for character:", charId, err);
    });
    
    // Also update old style visual effects
    import('./characterPositions.js').then(module => {
        const { getCharacterPositions } = module;
        const characterPositions = getCharacterPositions();
        
        if (characterPositions[charId] && characterPositions[charId].character) {
            updateOldStyleVisualEffects(charId, characterPositions[charId].character);
        }
    }).catch(err => {
        console.error("Error updating old style visual effects:", err);
    });
}

/**
 * Display "Aufgewacht!" text above a Pokemon
 * @param {Object} pokemon - The Pokemon that woke up
 */
export function showWakeUpText(pokemon) {
    if (!pokemon || !pokemon.uniqueId) return;
    
    // Find character ID using uniqueId
    import('./characterPositions.js').then(module => {
        const { getCharacterPositions } = module;
        const characterPositions = getCharacterPositions();
        
        for (const charId in characterPositions) {
            if (characterPositions[charId].character && 
                characterPositions[charId].character.uniqueId === pokemon.uniqueId) {
                
                // Find character elements on battlefield
                const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${charId}"]`);
                
                characterEls.forEach(charEl => {
                    // Create wake up text element
                    const wakeupText = document.createElement('div');
                    wakeupText.className = 'awake-text';
                    wakeupText.textContent = 'Aufgewacht!';
                    
                    // Add to character element
                    charEl.appendChild(wakeupText);
                    
                    // Remove after animation completes
                    setTimeout(() => {
                        if (wakeupText.parentNode === charEl) {
                            charEl.removeChild(wakeupText);
                        }
                    }, 1000);
                });
                
                break;
            }
        }
    });
}

 /* Wake up a sleeping Pokemon when it takes damage
 * @param {Object} pokemon - The Pokemon that took damage
 * @param {number} damage - Amount of damage taken
 * @returns {boolean} - Whether the Pokemon woke up
 */
export function wakeUpFromDamage(pokemon, damage) {
    // Only wake up if the Pokemon is sleeping and took actual damage
    if (!pokemon || !hasStatusEffect(pokemon, 'asleep') || damage <= 0) {
        return false;
    }
    
    // Remove the sleep status
    const wokeUp = removeStatusEffect(pokemon, 'asleep');
    
    return wokeUp;
}

/**
 * Remove all status effects from a Pokémon
 * @param {Object} pokemon - Pokémon to remove all effects from
 * @returns {Array} - Array of effect names that were removed
 */
export function removeAllStatusEffects(pokemon) {
    if (!pokemon || !pokemon.statusEffects || pokemon.statusEffects.length === 0) {
        return [];
    }
    
    // Store the names of effects being removed for logging
    const removedEffects = pokemon.statusEffects.map(effect => effect.name);
    
    // Clear the status effects array
    pokemon.statusEffects = [];
    
    // Clear any status-related flags
    pokemon.skipTurn = false;
    pokemon.isConfused = false;
    
    // Update visual representation using the overlay system
    updateStatusEffectsVisual(pokemon);
    
    // Find and remove visual status effect indicators from DOM (legacy cleanup)
    if (pokemon.uniqueId) {
        // Find character ID using uniqueId
        import('./characterPositions.js').then(module => {
            const { getCharacterPositions } = module;
            const characterPositions = getCharacterPositions();
            
            for (const charId in characterPositions) {
                if (characterPositions[charId].character && 
                    characterPositions[charId].character.uniqueId === pokemon.uniqueId) {
                    
                    // Find character elements on battlefield
                    const characterEls = document.querySelectorAll(`[data-character-id="${charId}"], [data-char-id="${charId}"]`);
                    
                    characterEls.forEach(characterElement => {
                        // Remove status effects container if it exists
                        const statusContainer = characterElement.querySelector('.status-effects-container');
                        if (statusContainer) {
                            statusContainer.innerHTML = '';
                        }
                        
                        // Remove any status effect classes that might be applied to the element
                        const statusClasses = [
                            'poisoned', 'badly-poisoned', 'burned', 'asleep', 'paralyzed', 
                            'frozen', 'confused', 'cursed', 'infatuated', 'held', 'seeded',
                            'snared', 'frozen-effect', 'burned-effect'
                        ];
                        
                        statusClasses.forEach(statusClass => {
                            characterElement.classList.remove(`status-${statusClass}`);
                            characterElement.classList.remove(statusClass);
                        });
                        
                        // Remove any visual effect classes
                        characterElement.classList.remove('frozen-effect', 'burned-effect');
                    });
                    
                    break;
                }
            }
        }).catch(err => {
            console.error("Error removing visual status effects:", err);
        });
        
        // Update initiative display
        setTimeout(() => {
            import('./initiativeDisplay.js').then(module => {
                if (module.updateStatusIconsInInitiative && pokemon.uniqueId) {
                    module.updateStatusIconsInInitiative(pokemon.uniqueId);
                }
            }).catch(err => {
                console.error("Error updating initiative display:", err);
            });
        }, 0);
    }
    
    return removedEffects;
}

/**
 * Check if a Pokemon has immunity to a specific status effect
 * This function is used by attacks to determine if they can apply a status condition
 * @param {Object} pokemon - The target Pokemon
 * @param {string} statusEffectId - ID of the status effect to check
 * @param {Object} options - Additional options
 * @param {Object} options.attacker - The attacking Pokemon (for size comparison)
 * @param {Object} options.targetPosition - Position of the target {x, y}
 * @param {Object} options.attackerPosition - Position of the attacker {x, y}
 * @returns {Promise<boolean>} - Whether the Pokemon is immune to the status effect
 */
export async function hasStatusImmunity(pokemon, statusEffectId, options = {}) {
    if (!pokemon || !statusEffectId) return false;
    
    // Check if status effect ID is valid
    const effectExists = Object.values(STATUS_EFFECTS).some(effect => effect.id === statusEffectId);
    if (!effectExists) {
        return false;
    }

    // General immunities for all effects
    
    // 1. Pokemon already has the effect (except for badly-poisoned upgrade)
    if (hasStatusEffect(pokemon, statusEffectId) && statusEffectId !== 'badly-poisoned') {
        return true;
    }
    
    // 2. Dauerschlaf ability
    if (hasPokemonAbility(pokemon, 'dauerschlaf')) {
        return true;
    }
    
    // 3. Limitschild ability with KP >= 50%
    if (hasPokemonAbility(pokemon, 'limitschild')) {
        const currentKP = pokemon.currentKP || 0;
        const maxKP = pokemon.maxKP || pokemon.combatStats?.kp || 1;
        if (currentKP >= maxKP * 0.5) {
            return true;
        }
    }
    
    // 4. Floraschild ability in sunny weather
    if (hasPokemonAbility(pokemon, 'floraschild')) {
        let isSunny = false;
        if (typeof window !== 'undefined' && window.battleWeatherState) {
            isSunny = window.battleWeatherState.state === 'Sonne';
        } else {
            try {
                const { getCurrentWeather } = await import('./weather.js');
                const weather = getCurrentWeather();
                isSunny = weather.state === 'Sonne';
            } catch (error) {
                console.error("Error checking weather:", error);
            }
        }
        
        if (isSunny) {
            return true;
        }
    }
    
    // 5. Bodyguard or delegator buff
    if (pokemon.buffs) {
        if (pokemon.buffs.includes('bodyguard') || pokemon.buffs.includes('delegator')) {
            return true;
        }
    }
    
    // Check for damaging effects immunity
    const damagingEffects = ['poisoned', 'badly-poisoned', 'burned', 'cursed', 'seeded', 'held'];
    if (damagingEffects.includes(statusEffectId)) {
        if (hasPokemonAbility(pokemon, 'magieschild')) {
            return true;
        }
    }
    
    // Specific immunities based on effect type
    switch (statusEffectId) {
        case 'poisoned':
        case 'badly-poisoned':
            return await checkPoisonImmunity(pokemon, options);
            
        case 'burned':
            return checkBurnImmunity(pokemon);
            
        case 'asleep':
            return await checkSleepImmunity(pokemon, options);
            
        case 'confused':
            return checkConfusionImmunity(pokemon);
            
        case 'frozen':
            return await checkFreezeImmunity(pokemon);
            
        case 'paralyzed':
            return checkParalysisImmunity(pokemon);
            
        case 'seeded':
            return checkSeedImmunity(pokemon);
            
        case 'held':
            return await checkHoldImmunity(pokemon, options);
    }

    return false;
}

/**
 * Check poison immunity (for poisoned and badly-poisoned)
 * @param {Object} pokemon - The target Pokemon
 * @param {Object} options - Additional options (positions, etc.)
 * @returns {Promise<boolean>} - Whether the Pokemon is immune to poison
 */
async function checkPoisonImmunity(pokemon, options) {
    // Specific abilities
    if (hasPokemonAbility(pokemon, ['immunität', 'aufheber', 'giftheilung', 'giftwahn'])) {
        return true;
    }
    
    // Pastellhülle ability (self or within 5 spaces)
    if (hasPokemonAbility(pokemon, 'pastellhülle')) {
        return true;
    }
    
    // Check other Pokemon within 5 spaces for Pastellhülle
    if (options.targetPosition) {
        const nearbyPokemon = await findPokemonWithinDistance(options.targetPosition, 5, pokemon.uniqueId);
        for (const nearbyMon of nearbyPokemon) {
            if (hasPokemonAbility(nearbyMon, 'pastellhülle')) {
                return true;
            }
        }
    }
    
    // Gift or Stahl type
    if (pokemon.pokemonTypes) {
        const hasImmuneType = pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === 'poison' || 
            type.toLowerCase() === 'gift' ||
            type.toLowerCase() === 'steel' ||
            type.toLowerCase() === 'stahl'
        );
        if (hasImmuneType) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check burn immunity
 * @param {Object} pokemon - The target Pokemon
 * @returns {boolean} - Whether the Pokemon is immune to burn
 */
export function checkBurnImmunity(pokemon) {
    if (pokemon.pokemonTypes) {
        const hasImmuneType = pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === 'fire' || 
            type.toLowerCase() === 'feuer'
        );
        if (hasImmuneType) {
            return true;
        }
    }

    return hasPokemonAbility(pokemon, ['aquahülle', 'wasserblase']);
}

/**
 * Check sleep immunity
 * @param {Object} pokemon - The target Pokemon
 * @param {Object} options - Additional options (positions, etc.)
 * @returns {Promise<boolean>} - Whether the Pokemon is immune to sleep
 */
async function checkSleepImmunity(pokemon, options) {
    // Munterkeit ability
    if (hasPokemonAbility(pokemon, 'munterkeit')) {
        return true;
    }
    
    // Zuckerhülle ability on other Pokemon within 5 spaces (NOT the target itself)
    if (options.targetPosition) {
        const nearbyPokemon = await findPokemonWithinDistance(options.targetPosition, 5, pokemon.uniqueId);
        for (const nearbyMon of nearbyPokemon) {
            if (hasPokemonAbility(nearbyMon, 'zuckerhülle')) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check confusion immunity
 * @param {Object} pokemon - The target Pokemon
 * @returns {boolean} - Whether the Pokemon is immune to confusion
 */
function checkConfusionImmunity(pokemon) {
    return hasPokemonAbility(pokemon, 'tempomacher');
}

/**
 * Check freeze immunity
 * @param {Object} pokemon - The target Pokemon
 * @returns {Promise<boolean>} - Whether the Pokemon is immune to freeze
 */
async function checkFreezeImmunity(pokemon) {
    // Check sunny weather
    let isSunny = false;
    if (typeof window !== 'undefined' && window.battleWeatherState) {
        isSunny = window.battleWeatherState.state === 'Sonne';
    } else {
        try {
            const { getCurrentWeather } = await import('./weather.js');
            const weather = getCurrentWeather();
            isSunny = weather.state === 'Sonne';
        } catch (error) {
            console.error("Error checking weather:", error);
        }
    }
    
    if (isSunny) {
        return true;
    }
    
    // Magmapanzer ability
    if (hasPokemonAbility(pokemon, 'magmapanzer')) {
        return true;
    }
    
    // Eis type
    if (pokemon.pokemonTypes) {
        const hasIceType = pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === 'ice' || 
            type.toLowerCase() === 'eis'
        );
        if (hasIceType) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check paralysis immunity
 * @param {Object} pokemon - The target Pokemon
 * @returns {boolean} - Whether the Pokemon is immune to paralysis
 */
function checkParalysisImmunity(pokemon) {
    // Flexibilität ability
    if (hasPokemonAbility(pokemon, 'flexibilität')) {
        return true;
    }
    
    // Elektro type
    if (pokemon.pokemonTypes) {
        const hasElectricType = pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === 'electric' || 
            type.toLowerCase() === 'elektro'
        );
        if (hasElectricType) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check seed immunity (for Egelsamen)
 * @param {Object} pokemon - The target Pokemon
 * @returns {boolean} - Whether the Pokemon is immune to seed
 */
function checkSeedImmunity(pokemon) {
    // Pflanze type
    if (pokemon.pokemonTypes) {
        const hasGrassType = pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === 'grass' || 
            type.toLowerCase() === 'pflanze'
        );
        if (hasGrassType) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check hold immunity (for Festgehalten)
 * @param {Object} pokemon - The target Pokemon
 * @param {Object} options - Additional options (attacker, etc.)
 * @returns {Promise<boolean>} - Whether the Pokemon is immune to being held
 */
async function checkHoldImmunity(pokemon, options) {
    // Size category comparison - target must be 2+ categories larger than attacker
    if (options.attacker) {
        try {
            const { calculateSizeCategory } = await import('./pokemonSizeCalculator.js');
            const targetSize = calculateSizeCategory(pokemon);
            const attackerSize = calculateSizeCategory(options.attacker);
            
            if (targetSize >= attackerSize + 2) {
                return true;
            }
        } catch (error) {
            console.error("Error calculating size categories:", error);
        }
    }
    
    return false;
}

/**
 * Find Pokemon within a specified distance of a target position
 * @param {Object} targetPosition - The position to search from {x, y}
 * @param {number} maxDistance - Maximum distance in grid spaces
 * @param {string} excludeId - ID of Pokemon to exclude from results
 * @returns {Promise<Array>} - Array of Pokemon within distance
 */
async function findPokemonWithinDistance(targetPosition, maxDistance, excludeId = null) {
    try {
        const { getCharacterPositions } = await import('./characterPositions.js');
        const characterPositions = getCharacterPositions();
        
        const nearbyPokemon = [];
        
        for (const charId in characterPositions) {
            const pos = characterPositions[charId];
            if (!pos.character || pos.isDefeated) continue;
            if (excludeId && pos.character.uniqueId === excludeId) continue;
            
            // Calculate distance in grid spaces
            const distance = Math.sqrt(
                Math.pow(pos.x - targetPosition.x, 2) + 
                Math.pow(pos.y - targetPosition.y, 2)
            );
            
            if (distance <= maxDistance) {
                nearbyPokemon.push(pos.character);
            }
        }
        
        return nearbyPokemon;
    } catch (error) {
        console.error("Error finding nearby Pokemon:", error);
        return [];
    }
}