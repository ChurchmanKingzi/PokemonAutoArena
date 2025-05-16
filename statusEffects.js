/**
 * Status Effects System for Pokémon Battle Simulator
 */
import { createDamageNumber } from './damageNumbers.js';

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
    effect: 'Das Pokemon hat eine 50%-Chance, ein verbündetes Ziel in Reichweite anzugreifen, falls möglich.',
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
  }
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
    
    // Update visual display if on battlefield
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
                // 50% chance to attack allies
                if (Math.random() < 0.5) {
                    pokemon.attackAllies = true;
                    messages.push(`${pokemon.name} ist verwirrt und könnte verbündete angreifen!`);
                }
                break;
        }
    });
    
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
 * Create a DOM element for status effect icons
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
 * @returns {Object} - Object with messages array and damage amount
 */
export function processStatusEffectsEnd(pokemon, position) {
    if (!pokemon || !pokemon.statusEffects || pokemon.statusEffects.length === 0) {
        return { messages: [], damage: 0 };
    }
    
    const messages = [];
    let totalDamage = 0;
    
    // Check if the Pokemon has the Aufheber/Poison Heal ability using our new helper function
    const hasGiftheilung = hasPokemonAbility(pokemon, ['aufheber', 'poison heal', 'giftheilung']);
    
    // Process each status effect
    pokemon.statusEffects.forEach(effect => {
        // Increment turn counter for the effect
        effect.turnCount++;
        
        // Handle end-of-turn damage effects
        switch (effect.id) {
            case 'poisoned':
                const poisonDamage = Math.max(1, Math.floor(pokemon.maxKP / 16));
                
                if (hasGiftheilung) {
                    // HEALING instead of damage for Aufheber ability
                    const healAmount = Math.min(poisonDamage, pokemon.maxKP - pokemon.currentKP);
                    
                    if (healAmount > 0) {
                        pokemon.currentKP += healAmount;
                        messages.push(`${pokemon.name} wird durch Gift um ${healAmount} KP geheilt! (Aufheber)`);
                        
                        // Show healing number if position is provided
                        if (position) {
                            createDamageNumber(healAmount, position, true, 'heal');
                        }
                    } else {
                        messages.push(`${pokemon.name} hat bereits volle KP und kann durch Aufheber nicht mehr geheilt werden.`);
                    }
                } else {
                    // Normal poison damage
                    totalDamage += poisonDamage;
                    messages.push(`${pokemon.name} erleidet ${poisonDamage} Schaden durch Gift!`);
                    
                    // Show damage number if position is provided
                    if (position) {
                        createDamageNumber(poisonDamage, position, false, 'poison');
                    }
                }
                break;
                
            case 'badly-poisoned':
                const poisonStacks = effect.turnCount;
                const badPoisonDamage = Math.max(1, Math.floor((pokemon.maxKP / 16) * poisonStacks));
                
                if (hasGiftheilung) {
                    // HEALING instead of damage for Aufheber ability
                    const healAmount = Math.min(badPoisonDamage, pokemon.maxKP - pokemon.currentKP);
                    
                    if (healAmount > 0) {
                        pokemon.currentKP += healAmount;
                        messages.push(`${pokemon.name} wird durch schweres Gift um ${healAmount} KP geheilt! (Aufheber)`);
                        
                        // Show healing number if position is provided
                        if (position) {
                            createDamageNumber(healAmount, position, true, 'heal');
                        }
                    } else {
                        messages.push(`${pokemon.name} hat bereits volle KP und kann durch Aufheber nicht mehr geheilt werden.`);
                    }
                } else {
                    // Normal badly poisoned damage
                    totalDamage += badPoisonDamage;
                    messages.push(`${pokemon.name} erleidet ${badPoisonDamage} Schaden durch schweres Gift!`);
                    
                    // Show damage number if position is provided
                    if (position) {
                        createDamageNumber(badPoisonDamage, position, false, 'poison');
                    }
                }
                break;
                
            // The rest of the cases remain unchanged
            case 'burned':
                // Ensure burn damage is 1/8 of max HP, rounded up
                const burnDamage = Math.max(1, Math.ceil(pokemon.maxKP / 8));
                totalDamage += burnDamage;
                messages.push(`${pokemon.name} erleidet ${burnDamage} Schaden durch Verbrennung!`);
                
                // Show damage number if position is provided
                if (position) {
                    createDamageNumber(burnDamage, position, false, 'burn');
                }
                break;
                
            case 'cursed':
                const curseDamage = Math.max(1, Math.floor(pokemon.maxKP / 4));
                totalDamage += curseDamage;
                messages.push(`${pokemon.name} erleidet ${curseDamage} Schaden durch den Fluch!`);
                
                // Show damage number if position is provided
                if (position) {
                    createDamageNumber(curseDamage, position, false, 'curse');
                }
                break;
                
            case 'seeded':
                const seedDamage = Math.max(1, Math.floor(pokemon.maxKP / 16));
                totalDamage += seedDamage;
                messages.push(`${pokemon.name} verliert ${seedDamage} KP durch Egelsamen!`);
                
                // Show damage number if position is provided
                if (position) {
                    createDamageNumber(seedDamage, position, false, 'seed');
                }
                
                // Try to heal the source if it exists
                if (effect.sourceId) {
                    import('./characterPositions.js').then(module => {
                        const { getCharacterPositions } = module;
                        const characterPositions = getCharacterPositions();
                        
                        // Find source by ID
                        for (const charId in characterPositions) {
                            if (characterPositions[charId].character && 
                                characterPositions[charId].character.uniqueId === effect.sourceId) {
                                const source = characterPositions[charId].character;
                                // Heal the source
                                if (source.currentKP < source.maxKP) {
                                    const healAmount = Math.min(seedDamage, source.maxKP - source.currentKP);
                                    source.currentKP += healAmount;
                                    messages.push(`${source.name} erhält ${healAmount} KP durch Egelsamen!`);
                                }
                                break;
                            }
                        }
                    });
                }
                break;
                
            case 'held':
                const holdDamage = Math.max(1, Math.floor(pokemon.maxKP / 16));
                totalDamage += holdDamage;
                messages.push(`${pokemon.name} erleidet ${holdDamage} Schaden durch Festhalten!`);
                
                // Show damage number if position is provided
                if (position) {
                    createDamageNumber(holdDamage, position, false, 'hold');
                }
                break;
        }
    });
    
    return { messages, damage: totalDamage };
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
 * Update the visual representation of status effects for a Pokemon
 * @param {Object} pokemon - The Pokémon to update visuals for
 */
export function updateStatusEffectsVisual(pokemon) {
  if (!pokemon || !pokemon.uniqueId) return;
  
  // Find character ID using uniqueId
  import('./characterPositions.js').then(module => {
    const { getCharacterPositions } = module;
    const characterPositions = getCharacterPositions();
    
    for (const charId in characterPositions) {
      if (characterPositions[charId].character && 
          characterPositions[charId].character.uniqueId === pokemon.uniqueId) {
        updateStatusEffectsVisualForChar(charId);
        break;
      }
    }
  });
}

/**
 * Update status effect visual for a specific character ID
 * @param {string} charId - Character ID on the battlefield
 */
export function updateStatusEffectsVisualForChar(charId) {
  // Import to avoid circular reference
  import('./characterPositions.js').then(module => {
    const { getCharacterPositions } = module;
    const characterPositions = getCharacterPositions();
    
    if (!characterPositions[charId] || !characterPositions[charId].character) return;
    
    const pokemon = characterPositions[charId].character;
    
    // Find both possible character elements (regular tile and character overlay)
    const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${charId}"]`);
    if (characterEls.length === 0) return;
    
    // For each character element
    characterEls.forEach(charEl => {
      // Remove existing status containers
      const existingContainer = charEl.querySelector('.status-effects-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      
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
      
      // Create new status effects display
      const statusDisplay = createStatusEffectsDisplay(pokemon);
      if (!statusDisplay) return;
      
      // Add the status display DIRECTLY TO THE CHARACTER ELEMENT
      // This is the key change - making it a child of the Pokémon element so it moves with it
      charEl.appendChild(statusDisplay);
    });
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