/**
 * Tooltip system for displaying character information
 * Includes support for modified stat display
 */

import { getCurrentStatValue, getStatValueDisplay, hasStatModifications, getModifiedStatsHTML } from './statChanges.js';

// Global tooltip state management
let activeTooltip = null;
let activeTarget = null;
let tooltipHideTimeout = null;

/**
 * Create a tooltip for a character
 * @param {Object} character - The character to create a tooltip for
 * @returns {HTMLElement} - The tooltip element
 */
export function createCharacterTooltip(character) {
    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'character-tooltip';
    
    // Add name
    const nameElement = document.createElement('div');
    nameElement.className = 'tooltip-name';
    nameElement.textContent = character.name;
    tooltip.appendChild(nameElement);
    
    // *** KP SECTION (MOVED TO TOP) ***
    if (character.currentKP !== undefined && character.maxKP !== undefined) {
        // Add HP section
        const hpSection = document.createElement('div');
        hpSection.className = 'tooltip-section';
        
        const hpLabel = document.createElement('span');
        hpLabel.className = 'tooltip-label';
        hpLabel.textContent = 'KP:';
        
        const hpValue = document.createElement('span');
        hpValue.className = 'tooltip-value hp-value';
        hpValue.textContent = `${character.currentKP}/${character.maxKP}`;
        
        // Determine color based on HP percentage
        const hpPercent = (character.currentKP / character.maxKP) * 100;
        if (hpPercent <= 25) {
            hpValue.style.color = '#e74c3c'; // Red for critical health
        } else if (hpPercent <= 50) {
            hpValue.style.color = '#f39c12'; // Orange for half health
        } else {
            hpValue.style.color = '#2ecc71'; // Green for good health
        }
        
        hpSection.appendChild(hpLabel);
        hpSection.appendChild(hpValue);
        tooltip.appendChild(hpSection);
        
        // Add HP bar
        const hpBarContainer = document.createElement('div');
        hpBarContainer.className = 'tooltip-hp-container';
        
        const hpBar = document.createElement('div');
        hpBar.className = 'tooltip-hp-bar';
        hpBar.style.width = `${hpPercent}%`;
        
        // Set color based on HP percentage
        if (hpPercent <= 25) {
            hpBar.style.backgroundColor = '#e74c3c'; // Red for critical health
        } else if (hpPercent <= 50) {
            hpBar.style.backgroundColor = '#f39c12'; // Orange for half health
        } else {
            hpBar.style.backgroundColor = '#2ecc71'; // Green for good health
        }
        
        hpBarContainer.appendChild(hpBar);
        hpSection.appendChild(hpBarContainer);
    }

    //HELD ITEM
    // Add item section if present (Pokemon can only have one item)
    if (character.selectedItem) {
        const separatorI = document.createElement('div');
        separatorI.className = 'tooltip-separator';
        tooltip.appendChild(separatorI);
        
        const itemsSection = document.createElement('div');
        itemsSection.className = 'tooltip-section';
        
        const itemsTitle = document.createElement('h4');
        itemsTitle.textContent = 'Item:';
        itemsSection.appendChild(itemsTitle);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'tooltip-item';
        
        const itemName = document.createElement('div');
        itemName.className = 'tooltip-item-name';
        itemName.textContent = character.selectedItem.name;
        
        itemElement.appendChild(itemName);
        
        if (character.selectedItem.effect) {
            const itemEffect = document.createElement('div');
            itemEffect.className = 'tooltip-item-effect';
            itemEffect.textContent = character.selectedItem.effect;
            itemElement.appendChild(itemEffect);
        }
        
        itemsSection.appendChild(itemElement);
        tooltip.appendChild(itemsSection);
    }


    
    // Add separator after KP
    const separator0 = document.createElement('div');
    separator0.className = 'tooltip-separator';
    tooltip.appendChild(separator0);
    
    // *** COMBAT STATS - GENA, PA, INITIATIVE, BW ***
    const combatSection = document.createElement('div');
    combatSection.className = 'tooltip-section';
    
    // Create a table for combat stats
    const statsTable = document.createElement('div');
    statsTable.className = 'tooltip-stats-container';
    
    // Add row for each important combat stat
    if (character.combatStats) {
        // Add GENA
        const genaRow = document.createElement('div');
        genaRow.className = 'tooltip-row';
        
        const genaLabel = document.createElement('span');
        genaLabel.className = 'tooltip-stat-name';
        genaLabel.textContent = 'GENA:';
        
        const genaValue = document.createElement('span');
        genaValue.className = 'tooltip-stat-value';
        genaValue.innerHTML = getStatValueDisplay(character, 'gena');
        
        genaRow.appendChild(genaLabel);
        genaRow.appendChild(genaValue);
        statsTable.appendChild(genaRow);
        
        // Add PA
        const paRow = document.createElement('div');
        paRow.className = 'tooltip-row';
        
        const paLabel = document.createElement('span');
        paLabel.className = 'tooltip-stat-name';
        paLabel.textContent = 'PA:';
        
        const paValue = document.createElement('span');
        paValue.className = 'tooltip-stat-value';
        paValue.innerHTML = getStatValueDisplay(character, 'pa');
        
        paRow.appendChild(paLabel);
        paRow.appendChild(paValue);
        statsTable.appendChild(paRow);
        
        // Add Initiative
        const initRow = document.createElement('div');
        initRow.className = 'tooltip-row';
        
        const initLabel = document.createElement('span');
        initLabel.className = 'tooltip-stat-name';
        initLabel.textContent = 'Initiative:';
        
        const initValue = document.createElement('span');
        initValue.className = 'tooltip-stat-value';
        initValue.innerHTML = getStatValueDisplay(character, 'init');
        
        initRow.appendChild(initLabel);
        initRow.appendChild(initValue);
        statsTable.appendChild(initRow);
        
        // Add BW (Movement)
        const bwRow = document.createElement('div');
        bwRow.className = 'tooltip-row';
        
        const bwLabel = document.createElement('span');
        bwLabel.className = 'tooltip-stat-name';
        bwLabel.textContent = 'BW:';
        
        const bwValue = document.createElement('span');
        bwValue.className = 'tooltip-stat-value';
        bwValue.innerHTML = getStatValueDisplay(character, 'bw');
        
        bwRow.appendChild(bwLabel);
        bwRow.appendChild(bwValue);
        statsTable.appendChild(bwRow);
    }
    
    combatSection.appendChild(statsTable);
    tooltip.appendChild(combatSection);
    
    // Add separator before Pokémon battle stats
    const separator1 = document.createElement('div');
    separator1.className = 'tooltip-separator';
    tooltip.appendChild(separator1);
    
    // *** POKÉMON BATTLE STATS ***
    const battleStatsSection = document.createElement('div');
    battleStatsSection.className = 'tooltip-section';
    
    // Create a table for Pokémon battle stats
    const battleStatsTable = document.createElement('div');
    battleStatsTable.className = 'tooltip-stats-container';
    
    // Add Pokémon battle stats from statsDetails
    if (character.statsDetails && character.statsDetails.statsGerman) {
        const stats = character.statsDetails.statsGerman;
        
        // Add Attack (Angriff)
        const attackRow = document.createElement('div');
        attackRow.className = 'tooltip-row';
        
        const attackLabel = document.createElement('span');
        attackLabel.className = 'tooltip-stat-name';
        attackLabel.textContent = 'Angriff:';
        
        const attackValue = document.createElement('span');
        attackValue.className = 'tooltip-stat-value';
        attackValue.innerHTML = getStatValueDisplay(character, 'angriff');
        
        attackRow.appendChild(attackLabel);
        attackRow.appendChild(attackValue);
        battleStatsTable.appendChild(attackRow);
        
        // Add Defense (Verteidigung)
        const defenseRow = document.createElement('div');
        defenseRow.className = 'tooltip-row';
        
        const defenseLabel = document.createElement('span');
        defenseLabel.className = 'tooltip-stat-name';
        defenseLabel.textContent = 'Verteidigung:';
        
        const defenseValue = document.createElement('span');
        defenseValue.className = 'tooltip-stat-value';
        defenseValue.innerHTML = getStatValueDisplay(character, 'verteidigung');
        
        defenseRow.appendChild(defenseLabel);
        defenseRow.appendChild(defenseValue);
        battleStatsTable.appendChild(defenseRow);
        
        // Add Special Attack (Spezial-Angriff)
        const spAtkRow = document.createElement('div');
        spAtkRow.className = 'tooltip-row';
        
        const spAtkLabel = document.createElement('span');
        spAtkLabel.className = 'tooltip-stat-name';
        spAtkLabel.textContent = 'Sp. Angriff:';
        
        const spAtkValue = document.createElement('span');
        spAtkValue.className = 'tooltip-stat-value';
        spAtkValue.innerHTML = getStatValueDisplay(character, 'spezialAngriff');
        
        spAtkRow.appendChild(spAtkLabel);
        spAtkRow.appendChild(spAtkValue);
        battleStatsTable.appendChild(spAtkRow);
        
        // Add Special Defense (Spezial-Verteidigung)
        const spDefRow = document.createElement('div');
        spDefRow.className = 'tooltip-row';
        
        const spDefLabel = document.createElement('span');
        spDefLabel.className = 'tooltip-stat-name';
        spDefLabel.textContent = 'Sp. Verteidigung:';
        
        const spDefValue = document.createElement('span');
        spDefValue.className = 'tooltip-stat-value';
        spDefValue.innerHTML = getStatValueDisplay(character, 'spezialVerteidigung');
        
        spDefRow.appendChild(spDefLabel);
        spDefRow.appendChild(spDefValue);
        battleStatsTable.appendChild(spDefRow);
    } else {
        // Fallback if statsGerman is not available
        console.warn("No statsGerman found for character:", character.name);
        
        // Add a message about missing stats
        const noStatsRow = document.createElement('div');
        noStatsRow.className = 'tooltip-row';
        noStatsRow.textContent = "Keine Statistiken verfügbar";
        battleStatsTable.appendChild(noStatsRow);
    }
    
    battleStatsSection.appendChild(battleStatsTable);
    tooltip.appendChild(battleStatsSection);
    
    // Add separator before types
    const separator2 = document.createElement('div');
    separator2.className = 'tooltip-separator';
    tooltip.appendChild(separator2);
    
    // *** POKÉMON TYPES IN GERMAN ***
    const typesSection = document.createElement('div');
    typesSection.className = 'tooltip-section';
    
    if (character.pokemonTypes && character.pokemonTypes.length > 0) {
        const typesLabel = document.createElement('span');
        typesLabel.className = 'tooltip-label';
        typesLabel.textContent = 'Typen:';
        
        const typesValue = document.createElement('span');
        typesValue.className = 'tooltip-value';
        
        // Use German type names if available, otherwise use English
        if (character.pokemonTypesDe && character.pokemonTypesDe.length > 0) {
            typesValue.textContent = character.pokemonTypesDe.join(', ');
        } else {
            // Translate types using the TYPE_NAMES_DE mapping
            const germanTypes = character.pokemonTypes.map(type => {
                // Simple type translation based on common mappings
                const typeMap = {
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
                return typeMap[type.toLowerCase()] || type;
            });
            
            typesValue.textContent = germanTypes.join(', ');
        }
        
        typesSection.appendChild(typesLabel);
        typesSection.appendChild(typesValue);
    }
    
    tooltip.appendChild(typesSection);
    
    // Add separator before attacks
    const separator3 = document.createElement('div');
    separator3.className = 'tooltip-separator';
    tooltip.appendChild(separator3);
    
    // *** ATTACKS SECTION WITH GERMAN DETAILS ***
    if (character.attacks && character.attacks.length > 0) {
        const attacksSection = document.createElement('div');
        attacksSection.className = 'tooltip-section';
        
        const attacksTitle = document.createElement('h4');
        attacksTitle.textContent = 'Attacken:';
        attacksSection.appendChild(attacksTitle);
        
        const attacksList = document.createElement('div');
        attacksList.className = 'tooltip-list attack-section';
        
        character.attacks.forEach(attack => {
            if (!attack.weaponName) return;
            
            const attackItem = document.createElement('div');
            attackItem.className = 'tooltip-attack-item';
            
            const attackName = document.createElement('div');
            attackName.className = 'tooltip-attack-name';
            attackName.textContent = attack.weaponName;
            attackItem.appendChild(attackName);
            
            const attackStats = document.createElement('div');
            attackStats.className = 'tooltip-attack-stats';
            
            // Build attack stats text with all required German details
            let statsText = '';
            
            // Type
            if (attack.moveType) {
                // Translate the type to German
                const typeMap = {
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
                const germanType = typeMap[attack.moveType.toLowerCase()] || attack.moveType;
                statsText += `Typ: ${germanType} | `;
            }
            
            // Category
            if (attack.category) {
                statsText += `${attack.category} | `;
            }
            
            // Damage (Schaden)
            if (attack.damage) {
                statsText += `Schaden: ${attack.damage}d6 | `;
            }
            
            // Range (Reichweite)
            if (attack.range) {
                statsText += `Reichweite: ${attack.range} | `;
            }
            
            // AP (similar to PP in Pokémon)
            if (attack.pp) {
                const currentPP = attack.currentPP !== undefined ? attack.currentPP : attack.pp;
                statsText += `AP: ${currentPP}/${attack.pp}`;
            } else {
                statsText += `AP: ∞`;
            }
            
            attackStats.textContent = statsText;
            attackItem.appendChild(attackStats);
            
            // Effect if present
            if (attack.effect) {
                const attackEffect = document.createElement('div');
                attackEffect.className = 'tooltip-attack-effect';
                attackEffect.textContent = `Effekt: ${attack.effect}`;
                attackItem.appendChild(attackEffect);
            }
            
            attacksList.appendChild(attackItem);
        });
        
        attacksSection.appendChild(attacksList);
        tooltip.appendChild(attacksSection);
    }
    
    // *** REMAINING SECTIONS (ABILITIES, ITEMS, STATUS EFFECTS) ***
    
    // Add ability section if present
    if (character.abilities && character.abilities.length > 0) {
        const separatorA = document.createElement('div');
        separatorA.className = 'tooltip-separator';
        tooltip.appendChild(separatorA);
        
        const abilitiesSection = document.createElement('div');
        abilitiesSection.className = 'tooltip-section';
        
        const abilitiesTitle = document.createElement('h4');
        abilitiesTitle.textContent = 'Fähigkeiten:';
        abilitiesSection.appendChild(abilitiesTitle);
        
        const abilitiesContainer = document.createElement('div');
        abilitiesContainer.className = 'tooltip-abilities-container';
        
        character.abilities.forEach(ability => {
            if (!ability.name) return;
            
            const abilityItem = document.createElement('div');
            abilityItem.className = 'tooltip-ability-item';
            
            const abilityName = document.createElement('div');
            abilityName.className = 'tooltip-ability-name';
            abilityName.textContent = ability.name;
            
            const abilityDesc = document.createElement('div');
            abilityDesc.className = 'tooltip-ability-desc';
            abilityDesc.textContent = ability.description || ability.effect || '';
            
            abilityItem.appendChild(abilityName);
            
            if (ability.hidden) {
                const hiddenBadge = document.createElement('span');
                hiddenBadge.className = 'tooltip-ability-hidden';
                hiddenBadge.textContent = ' (versteckt)';
                abilityName.appendChild(hiddenBadge);
            }
            
            abilityItem.appendChild(abilityDesc);
            abilitiesContainer.appendChild(abilityItem);
        });
        
        abilitiesSection.appendChild(abilitiesContainer);
        tooltip.appendChild(abilitiesSection);
    }
    
    // Add items section if present
    if (character.items && character.items.length > 0) {
        const separatorI = document.createElement('div');
        separatorI.className = 'tooltip-separator';
        tooltip.appendChild(separatorI);
        
        const itemsSection = document.createElement('div');
        itemsSection.className = 'tooltip-section';
        
        const itemsTitle = document.createElement('h4');
        itemsTitle.textContent = 'Items:';
        itemsSection.appendChild(itemsTitle);
        
        const itemsList = document.createElement('div');
        itemsList.className = 'tooltip-list';
        
        character.items.forEach(item => {
            if (!item.name) return;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'tooltip-item';
            
            const itemName = document.createElement('div');
            itemName.className = 'tooltip-item-name';
            itemName.textContent = item.name;
            
            itemElement.appendChild(itemName);
            
            if (item.effect) {
                const itemEffect = document.createElement('div');
                itemEffect.className = 'tooltip-item-effect';
                itemEffect.textContent = item.effect;
                itemElement.appendChild(itemEffect);
            }
            
            itemsList.appendChild(itemElement);
        });
        
        itemsSection.appendChild(itemsList);
        tooltip.appendChild(itemsSection);
    }
    
    // Add Status Effects if any
    if (character.statusEffects && character.statusEffects.length > 0) {
        const separatorS = document.createElement('div');
        separatorS.className = 'tooltip-separator';
        tooltip.appendChild(separatorS);
        
        const statusSection = document.createElement('div');
        statusSection.className = 'tooltip-section';
        
        const statusTitle = document.createElement('h4');
        statusTitle.textContent = 'Status-Effekte:';
        statusSection.appendChild(statusTitle);
        
        const statusList = document.createElement('div');
        statusList.className = 'tooltip-status-list';
        
        character.statusEffects.forEach(effect => {
            const statusItem = document.createElement('div');
            statusItem.className = 'tooltip-status-item';
            
            const statusName = document.createElement('span');
            statusName.className = 'tooltip-status-name';
            statusName.textContent = effect.name;
            
            const statusSymbol = document.createElement('span');
            statusSymbol.className = `tooltip-status-symbol ${effect.cssClass}`;
            statusSymbol.textContent = effect.htmlSymbol;
            
            statusItem.appendChild(statusSymbol);
            statusItem.appendChild(statusName);
            
            if (effect.effect) {
                const statusDesc = document.createElement('div');
                statusDesc.className = 'tooltip-status-desc';
                statusDesc.textContent = effect.effect;
                statusItem.appendChild(statusDesc);
            }
            
            statusList.appendChild(statusItem);
        });
        
        statusSection.appendChild(statusList);
        tooltip.appendChild(statusSection);
    }
    
    // Add Pokedex ID if available (optional, moved to bottom)
    if (character.pokedexId) {
        const separatorP = document.createElement('div');
        separatorP.className = 'tooltip-separator';
        tooltip.appendChild(separatorP);
        
        const pokedexSection = document.createElement('div');
        pokedexSection.className = 'tooltip-section';
        
        const pokedexLabel = document.createElement('span');
        pokedexLabel.className = 'tooltip-label';
        pokedexLabel.textContent = 'Pokédex:';
        
        const pokedexValue = document.createElement('span');
        pokedexValue.className = 'tooltip-value';
        pokedexValue.textContent = `#${character.pokedexId}`;
        
        pokedexSection.appendChild(pokedexLabel);
        pokedexSection.appendChild(pokedexValue);
        tooltip.appendChild(pokedexSection);
    }
    
    // Add description if available (optional, moved to bottom)
    if (character.description) {
        const separatorD = document.createElement('div');
        separatorD.className = 'tooltip-separator';
        tooltip.appendChild(separatorD);
        
        const descSection = document.createElement('div');
        descSection.className = 'tooltip-section';
        
        const descTitle = document.createElement('h4');
        descTitle.textContent = 'Beschreibung:';
        descSection.appendChild(descTitle);
        
        const descText = document.createElement('div');
        descText.className = 'tooltip-description';
        descText.textContent = character.description;
        descSection.appendChild(descText);
        
        tooltip.appendChild(descSection);
    }
    
    return tooltip;
}

/**
 * Add tooltip behavior directly to a battlefield character element
 * @param {HTMLElement} characterElement - The character element to add tooltip behavior to
 * @param {Object} character - The character data for the tooltip
 */
export function attachTooltipToBattlefieldCharacter(characterElement, character) {
    if (!characterElement || !character) return;
    
    // Create a unique ID for this tooltip if the element doesn't have one
    if (!characterElement.dataset.tooltipId) {
        characterElement.dataset.tooltipId = `tooltip_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
    
    // Remove any existing event listeners
    characterElement.removeEventListener('mouseenter', characterElement._mouseEnterHandler);
    
    // Add mouseenter event listener
    characterElement._mouseEnterHandler = () => {
        showTooltipForElement(characterElement, character);
    };
    characterElement.addEventListener('mouseenter', characterElement._mouseEnterHandler);
}

/**
 * Show a tooltip for a specific element
 * @param {HTMLElement} element - The element to show the tooltip for
 * @param {Object} character - The character data
 */
export function showTooltipForElement(element, character) {
    // Hide any existing tooltip
    if (activeTooltip) {
        hideTooltip(true);
    }
    
    // Create tooltip
    const tooltip = createCharacterTooltip(character);
    
    // Add tooltip to document body
    document.body.appendChild(tooltip);
    
    // Position the tooltip
    positionTooltip(element, tooltip);
    
    // Add mouseenter/mouseleave events to keep tooltip open when mouse moves to it
    tooltip.addEventListener('mouseenter', () => {
        if (tooltipHideTimeout) {
            clearTimeout(tooltipHideTimeout);
            tooltipHideTimeout = null;
        }
    });
    
    tooltip.addEventListener('mouseleave', () => {
        hideTooltipWithDelay();
    });
    
    // Add wheel event handler to prevent page scroll when scrolling the tooltip
    tooltip.addEventListener('wheel', handleTooltipWheel, { passive: false });
    
    // Store the active tooltip and target
    activeTooltip = tooltip;
    activeTarget = element;
    
    // Add mouseleave event to the target element
    element.addEventListener('mouseleave', handleTargetMouseLeave);
    
    // Set up tooltip styles
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '10000';
    tooltip.style.maxHeight = '80vh';
    tooltip.style.overflowY = 'auto';
    tooltip.style.scrollBehavior = 'smooth';
    
    // Apply custom scrollbar styles
    addTooltipStyles();
}

/**
 * Handle wheel events inside the tooltip
 * @param {WheelEvent} event - The wheel event
 */
function handleTooltipWheel(event) {
    // Only handle wheel events if the tooltip is scrollable
    if (!activeTooltip) return;
    
    const scrollableHeight = activeTooltip.scrollHeight - activeTooltip.clientHeight;
    
    // Only prevent default if scrolling is necessary
    if (scrollableHeight > 0) {
        // Check if trying to scroll up when already at the top
        if (activeTooltip.scrollTop === 0 && event.deltaY < 0) {
            // Allow normal scroll behavior
            return;
        } 
        // Check if trying to scroll down when already at the bottom
        else if (activeTooltip.scrollTop >= scrollableHeight && event.deltaY > 0) {
            // Allow normal scroll behavior
            return;
        }
        else {
            // Prevent the wheel event from affecting the page
            event.stopPropagation();
            event.preventDefault();
            
            // Manually scroll the tooltip
            activeTooltip.scrollTop += event.deltaY;
        }
    }
}

/**
 * Handle mouse leaving the target element
 */
function handleTargetMouseLeave() {
    // Don't hide immediately - give time for mouse to enter tooltip
    hideTooltipWithDelay();
    
    // Remove the event listener
    if (activeTarget) {
        activeTarget.removeEventListener('mouseleave', handleTargetMouseLeave);
    }
}

/**
 * Hide tooltip with a short delay
 */
function hideTooltipWithDelay() {
    // Clear any existing timeout
    if (tooltipHideTimeout) {
        clearTimeout(tooltipHideTimeout);
    }
    
    // Set a new timeout
    tooltipHideTimeout = setTimeout(() => {
        hideTooltip();
    }, 150); // 150ms delay to allow mouse to enter tooltip
}

/**
 * Hide the tooltip immediately
 * @param {boolean} immediate - Whether to hide immediately or fade out
 */
export function hideTooltip(immediate = false) {
    if (!activeTooltip) return;
    
    // Remove event listeners
    activeTooltip.removeEventListener('wheel', handleTooltipWheel);
    activeTooltip.removeEventListener('mouseenter', () => {});
    activeTooltip.removeEventListener('mouseleave', () => {});
    
    if (immediate) {
        // Remove immediately
        if (activeTooltip.parentNode) {
            activeTooltip.parentNode.removeChild(activeTooltip);
        }
    } else {
        // Fade out
        activeTooltip.style.transition = 'opacity 0.2s ease-in-out';
        activeTooltip.style.opacity = '0';
        
        // Remove after animation
        setTimeout(() => {
            if (activeTooltip && activeTooltip.parentNode) {
                activeTooltip.parentNode.removeChild(activeTooltip);
            }
        }, 200);
    }
    
    // Clear references
    activeTooltip = null;
    
    if (activeTarget) {
        activeTarget.removeEventListener('mouseleave', handleTargetMouseLeave);
        activeTarget = null;
    }
    
    // Clear any pending hide timeout
    if (tooltipHideTimeout) {
        clearTimeout(tooltipHideTimeout);
        tooltipHideTimeout = null;
    }
}

/**
 * Position the tooltip next to an element
 * @param {HTMLElement} element - The element to position the tooltip next to
 * @param {HTMLElement} tooltip - The tooltip element
 */
function positionTooltip(element, tooltip) {
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Make sure tooltip is visible to measure it
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';
    
    // Get tooltip dimensions
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Default positions (to the right of the element)
    let left = rect.right + 10;
    let top = rect.top;
    
    // Check if tooltip goes off the right edge
    if (left + tooltipWidth > windowWidth - 10) {
        // Try positioning to the left
        left = rect.left - tooltipWidth - 10;
        
        // If that also doesn't work, position below or center
        if (left < 10) {
            left = Math.max(10, Math.min(windowWidth - tooltipWidth - 10, rect.left));
            top = rect.bottom + 10;
            
            // If below doesn't work either, position above
            if (top + tooltipHeight > windowHeight - 10) {
                top = rect.top - tooltipHeight - 10;
                
                // If above also doesn't work, center vertically
                if (top < 10) {
                    top = Math.max(10, (windowHeight - tooltipHeight) / 2);
                }
            }
        }
    }
    
    // If tooltip goes off the bottom edge
    if (top + tooltipHeight > windowHeight - 10) {
        // Try to align with bottom of viewport
        top = windowHeight - tooltipHeight - 10;
        
        // If that makes it go off the top, position at top of viewport
        if (top < 10) {
            top = 10;
        }
    }
    
    // Apply final position
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = 'visible';
    
    // Add a fade-in effect
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s ease-in-out';
    
    requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
    });
}

/**
 * Setup tooltips for all Pokémon elements on the battlefield
 * @param {string} selector - CSS selector for Pokémon elements
 * @param {Function} getCharacterDataFn - Function to get character data for an element
 */
export function setupPokemonTooltips(selector, getCharacterDataFn) {
    const pokemonElements = document.querySelectorAll(selector);
    
    pokemonElements.forEach(element => {
        const characterData = getCharacterDataFn(element);
        if (characterData) {
            attachTooltipToBattlefieldCharacter(element, characterData);
        }
    });
}

/**
 * Add CSS styles for tooltips
 */
export function addTooltipStyles() {
    // Check if styles already exist
    if (document.getElementById('battlefield-tooltip-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'battlefield-tooltip-styles';
    
    style.textContent = `
        .character-tooltip {
            background-color: #333;
            color: #fff;
            padding: 15px;
            border-radius: 5px;
            width: 350px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            font-size: 14px;
            line-height: 1.4;
            z-index: 10000;
            scroll-behavior: smooth;
        }
        
        /* Scrollbar styling */
        .character-tooltip::-webkit-scrollbar {
            width: 8px;
        }
        
        .character-tooltip::-webkit-scrollbar-track {
            background: #444;
            border-radius: 4px;
        }
        
        .character-tooltip::-webkit-scrollbar-thumb {
            background: #666;
            border-radius: 4px;
        }
        
        .character-tooltip::-webkit-scrollbar-thumb:hover {
            background: #888;
        }
        
        .tooltip-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #555;
            padding-bottom: 5px;
        }
        
        .tooltip-section {
            margin-bottom: 8px;
        }
        
        .tooltip-label {
            font-weight: bold;
            color: #ccc;
        }
        
        .tooltip-value {
            margin-left: 5px;
        }
        
        .tooltip-list {
            margin-left: 15px;
            margin-top: 5px;
        }
        
        .tooltip-separator {
            height: 1px;
            background-color: #555;
            margin: 10px 0;
        }
        
        .tooltip-spell, .tooltip-item {
            margin-bottom: 5px;
            padding-left: 15px;
        }
        
        .tooltip-spell-name, .tooltip-item-name {
            font-weight: bold;
        }
        
        .tooltip-spell-info, .tooltip-item-effect {
            font-size: 12px;
            color: #aaa;
            margin-top: 2px;
        }
        
        .attack-section {
            margin-left: 15px;
        }

        .tooltip-stats-container {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .tooltip-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        .tooltip-stat-name {
            color: #aaa;
            font-size: 12px;
        }

        .tooltip-stat-value {
            color: #fff;
            font-weight: bold;
        }

        .tooltip-mini-separator {
            height: 1px;
            background-color: #444;
            margin: 8px 0;
            opacity: 0.5;
        }
        
        .tooltip-hp-container {
            width: 100%;
            height: 8px;
            background-color: #444;
            border-radius: 4px;
            margin-top: 5px;
            overflow: hidden;
        }
        
        .tooltip-hp-bar {
            height: 100%;
            background-color: #2ecc71;
            border-radius: 4px;
            transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        .tooltip-abilities-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .tooltip-ability-item {
            margin-bottom: 8px;
        }
        
        .tooltip-ability-name {
            font-weight: bold;
            color: #fff;
        }
        
        .tooltip-ability-hidden {
            font-style: italic;
            color: #aaa;
            font-size: 0.9em;
        }
        
        .tooltip-ability-desc {
            font-size: 12px;
            color: #aaa;
            margin-top: 2px;
            line-height: 1.3;
        }
        
        .tooltip-attack-item {
            margin-bottom: 12px;
            padding-left: 10px;
        }
        
        .tooltip-attack-name {
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .tooltip-attack-stats {
            font-size: 12px;
            color: #ccc;
        }
        
        .tooltip-attack-effect {
            font-size: 11px;
            color: #aaa;
            font-style: italic;
            margin-top: 4px;
        }
        
        /* Status effects styling */
        .tooltip-status-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .tooltip-status-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        
        .tooltip-status-name {
            font-weight: bold;
            margin-left: 5px;
        }
        
        .tooltip-status-symbol {
            display: inline-block;
            width: 20px;
            text-align: center;
            font-weight: bold;
        }
        
        .tooltip-status-desc {
            font-size: 11px;
            color: #aaa;
            margin-left: 25px;
        }
        
        /* Stat change styling */
        .tooltip-stat-value span[style*="color: green"] {
            color: #2ecc71 !important;
        }
        
        .tooltip-stat-value span[style*="color: red"] {
            color: #e74c3c !important;
        }
        
        .tooltip-description {
            font-size: 12px;
            font-style: italic;
            color: #bbb;
            line-height: 1.3;
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize tooltip styles
addTooltipStyles();