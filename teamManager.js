/**
 * Team management system with Pokémon integration and Trainer support
 */

import { validateTeamCount, validateFightersPerTeam } from './teamConfig.js';
import { 
    getCharacterTemplate, 
    getAvailableTemplates, 
    enhanceCharacterWithMoves,
    getPokemonMoves 
} from './characterManager.js';
import { updateFightButtonState } from './arenaBuilder.js';
import { STRATEGY_OPTIONS, FORCING_MODE_OPTIONS, RANGED_WEAPON_TYPES } from './charakterAuswahlConfig.js';
import { shuffleArray } from './utils.js';
import { getAvailableItems, getItemById } from './itemService.js';
import { getTrainerClasses, getTrainerClassDescription, getAvailableTrainerIcons } from './classService.js';

// Store team assignments
let teamAssignments = [];

// Store trainer assignments
let trainers = [];

// Track if a drop was handled by a team slot
let dropHandled = false;

/**
 * Get team assignments
 * @returns {Array} - The team assignments
 */
export function getTeamAssignments() {
    return teamAssignments;
}

/**
 * Get trainer assignments
 * @returns {Array} - The trainer assignments
 */
export function getTrainers() {
    return trainers;
}

/**
 * Initialize character strategy, range, attacks, and forcing mode
 * @param {Object} character - The character being added to a team
 */
export function initializeCharacter(character) {
    // Import dynamically to avoid circular dependencies
    import('./characterPreparation.js').then(module => {
        module.initializeCharacterAttacks(character);
    });
    
    // Initialize status effects
    import('./statusEffects.js').then(module => {
        module.initializeStatusEffects(character);
    });

    // Generate a unique ID if one doesn't exist
    if (!character.uniqueId) {
        character.uniqueId = `pokemon_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Set default strategy if not already set
    if (!character.strategy) {
        character.strategy = 'aggressive';
    }
    
    // Set default forcing mode if not already set
    if (!character.forcingMode) {
        character.forcingMode = 'always';
    }
    
    // Set default critThreshold if not already set
    if (character.critThreshold === undefined) {
        character.critThreshold = 4;
    }
    
    // Initialize selected item if not set
    if (!character.selectedItem) {
        character.selectedItem = null;
    }
    
    // Triple the KP values for combat (but keep original base stats unchanged)
    if (character.combatStats && character.combatStats.kp) {
        // Store the original KP for reference
        character.originalKP = character.combatStats.kp;
        
        // Triple the combat KP
        character.combatStats.kp = Math.round(character.combatStats.kp * 3);
        
        // Also set up currentKP and maxKP for battle
        character.currentKP = character.combatStats.kp;
        character.maxKP = character.combatStats.kp;
    }
    
    // Set range to the maximum range of all attacks
    let maxRange = 1; // Default minimum range
    if (character.attacks) {
        for (const attack of character.attacks) {
            if (attack && attack.range && attack.range > maxRange) {
                maxRange = attack.range;
            }
        }
    }
    
    character.range = maxRange;
}

async function handleCharacterSelection(teamIndex, slotIndex, templateId) {
    if (!templateId) {
        // Empty selection - clear the slot
        teamAssignments[teamIndex][slotIndex] = null;
        updateTeamSlots();
        updateFightButtonState();
        return;
    }
    
    try {
        // Show loading indicator in the slot
        const slot = document.querySelector(`.team-slot[data-team="${teamIndex}"][data-slot="${slotIndex}"]`);
        if (slot) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-moves-indicator';
            loadingIndicator.innerHTML = '<div class="loading-spinner"></div><span>Lade Attacken...</span>';
            loadingIndicator.style.textAlign = 'center';
            loadingIndicator.style.padding = '10px';
            loadingIndicator.style.margin = '10px 0';
            slot.appendChild(loadingIndicator);
        }
        
        // Get Pokémon template by ID
        const pokemon = getCharacterTemplate(templateId);
        
        if (pokemon) {
            // Initialize character abilities, strategy, etc.
            initializeCharacter(pokemon);
            
            // Enhance with moves data
            const enhancedPokemon = await enhanceCharacterWithMoves(pokemon);
            
            // Ensure KP (HP) values are tripled for combat (double-check)
            if (enhancedPokemon.combatStats && enhancedPokemon.combatStats.kp && !enhancedPokemon.originalKP) {
                // Store the original KP for reference
                enhancedPokemon.originalKP = enhancedPokemon.combatStats.kp;
                
                // Triple the combat KP
                enhancedPokemon.combatStats.kp = Math.round(enhancedPokemon.combatStats.kp * 3);
                
                // Also set up currentKP and maxKP for battle
                enhancedPokemon.currentKP = enhancedPokemon.combatStats.kp;
                enhancedPokemon.maxKP = enhancedPokemon.combatStats.kp;
            }
            
            // Assign to team
            teamAssignments[teamIndex][slotIndex] = enhancedPokemon;

            // Lieblingstyp-Buff
            const trainer = trainers[teamIndex];
            if (trainer && trainer.favoriteType) {
                const hasType = enhancedPokemon.pokemonTypes && enhancedPokemon.pokemonTypes.some(type => 
                    type.toLowerCase() === trainer.favoriteType.toLowerCase()
                );
                if (hasType) {
                    applyTypeBuff(enhancedPokemon);
                }
            }
        } else {
            console.error(`Failed to get Pokémon template for ID: ${templateId}`);
        }
    } catch (error) {
        console.error(`Error selecting character:`, error);
    } finally {
        // Update team slots to reflect changes
        updateTeamSlots();
        
        // Update the fight button state
        updateFightButtonState();
    }
}

/**
 * Format Pokémon option with image in select
 * @param {Object} pokemon - Option data
 * @returns {HTMLElement|string} - Formatted option
 */
function formatPokemonOption(pokemon) {
    if (!pokemon.id || pokemon.id === "") {
        return pokemon.text;
    }
    
    // Get the sprite URL from the data-sprite attribute
    const sprite = pokemon.element.dataset.sprite;
    
    if (!sprite) {
        return pokemon.text;
    }
    
    // Create container with image and text
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    
    const img = document.createElement('img');
    img.src = sprite;
    img.style.width = '30px';
    img.style.height = '30px';
    img.style.marginRight = '8px';
    
    const text = document.createElement('span');
    text.textContent = pokemon.text;
    
    container.appendChild(img);
    container.appendChild(text);
    
    return container;
}

/**
 * Updates the team slots based on current configuration - with searchable Pokemon dropdown and trainer support
 */
export function updateTeamSlots() {
    const teamCount = validateTeamCount();
    const fightersPerTeam = validateFightersPerTeam();
    
    // Initialize team assignments if needed
    if (teamAssignments.length !== teamCount) {
        // Preserve existing assignments where possible
        const newAssignments = [];
        for (let i = 0; i < teamCount; i++) {
            newAssignments[i] = [];
            for (let j = 0; j < fightersPerTeam; j++) {
                if (teamAssignments[i] && teamAssignments[i][j]) {
                    newAssignments[i][j] = teamAssignments[i][j];
                } else {
                    newAssignments[i][j] = null;
                }
            }
        }
        // Update assignments
        while(teamAssignments.length > 0) {
            teamAssignments.pop();
        }
        newAssignments.forEach(team => teamAssignments.push(team));
    } else {
        // Adjust fighter count per team if needed
        teamAssignments.forEach((team, i) => {
            // Add slots if needed
            while (team.length < fightersPerTeam) {
                team.push(null);
            }
            // Remove slots if needed
            while (team.length > fightersPerTeam) {
                team.pop();
            }
        });
    }

    // Initialize trainers if needed
    if (trainers.length !== teamCount) {
        // Preserve existing trainers where possible
        const newTrainers = [];
        for (let i = 0; i < teamCount; i++) {
            if (trainers[i]) {
                newTrainers[i] = trainers[i];
            } else {
                newTrainers[i] = {
                    name: 'Trainer',
                    icon: 'trainer1.png',
                    class: 'angler',
                    favoriteType: null
                };
            }
        }
        // Update trainers
        while(trainers.length > 0) {
            trainers.pop();
        }
        newTrainers.forEach(trainer => trainers.push(trainer));
    }
    
    const teamsList = document.getElementById('teams-list');
    
    // Clear existing team slots
    teamsList.innerHTML = '';
    
    // Create team containers
    for (let i = 0; i < teamCount; i++) {
        const team = document.createElement('div');
        team.className = 'team';
        
        // Team title
        const teamTitleContainer = document.createElement('div');
        teamTitleContainer.className = 'team-title-container';

        const teamTitle = document.createElement('div');
        teamTitle.className = 'team-title';
        teamTitle.textContent = `Team ${i + 1}`;

        const randomButton = document.createElement('button');
        randomButton.className = 'random-team-button';
        randomButton.textContent = 'Random Team';
        randomButton.dataset.team = i;
        randomButton.addEventListener('click', (e) => {
            const teamIndex = parseInt(e.target.dataset.team);
            generateRandomTeam(teamIndex);
        });

        teamTitleContainer.appendChild(teamTitle);
        teamTitleContainer.appendChild(randomButton);
        team.appendChild(teamTitleContainer);

        // Trainer section
        const trainerSection = document.createElement('div');
        trainerSection.className = 'trainer-section';
        
        const trainerTitle = document.createElement('h4');
        trainerTitle.textContent = 'Trainer';
        trainerTitle.className = 'trainer-title';
        trainerSection.appendChild(trainerTitle);
        
        const trainerContent = document.createElement('div');
        trainerContent.className = 'trainer-content';
        
        // Trainer icon
        const trainerIconContainer = document.createElement('div');
        trainerIconContainer.className = 'trainer-icon-container';
        
        const trainerIcon = document.createElement('img');
        trainerIcon.className = 'trainer-icon';
        trainerIcon.src = `TrainerIcons/${trainers[i].icon}`;
        trainerIcon.alt = 'Trainer Icon';
        trainerIcon.addEventListener('click', () => openTrainerIconSelector(i));
        
        trainerIconContainer.appendChild(trainerIcon);
        trainerContent.appendChild(trainerIconContainer);
        
        // Trainer controls
        const trainerControls = document.createElement('div');
        trainerControls.className = 'trainer-controls';
        
        // Trainer name input
        const nameContainer = document.createElement('div');
        nameContainer.className = 'trainer-name-container';
        
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name:';
        nameLabel.htmlFor = `trainer-name-${i}`;
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = `trainer-name-${i}`;
        nameInput.className = 'trainer-name-input';
        nameInput.value = trainers[i].name;
        nameInput.addEventListener('change', (e) => {
            trainers[i].name = e.target.value;
        });
        
        nameContainer.appendChild(nameLabel);
        nameContainer.appendChild(nameInput);
        trainerControls.appendChild(nameContainer);
        
        // Trainer class dropdown
        const classContainer = document.createElement('div');
        classContainer.className = 'trainer-class-container';
        
        const classLabel = document.createElement('label');
        classLabel.textContent = 'Klasse:';
        classLabel.htmlFor = `trainer-class-${i}`;
        
        const classSelect = document.createElement('select');
        classSelect.id = `trainer-class-${i}`;
        classSelect.className = 'trainer-class-select';
        
        // Add class options
        const trainerClasses = getTrainerClasses();
        trainerClasses.forEach(trainerClass => {
            const option = document.createElement('option');
            option.value = trainerClass.id;
            option.textContent = trainerClass.name;
            option.dataset.description = trainerClass.description;
            
            if (trainers[i].class === trainerClass.id) {
                option.selected = true;
            }
            
            classSelect.appendChild(option);
        });
        
        classSelect.addEventListener('change', (e) => {
            trainers[i].class = e.target.value;
            updateClassTooltip(i);
        });
        
        classContainer.appendChild(classLabel);
        classContainer.appendChild(classSelect);
        
        // Create class tooltip
        const classTooltip = document.createElement('div');
        classTooltip.className = 'trainer-class-tooltip';
        classTooltip.style.display = 'none';
        classContainer.appendChild(classTooltip);
        
        // Add event listeners for tooltip
        classSelect.addEventListener('mouseenter', () => {
            updateClassTooltip(i);
            const tooltip = classContainer.querySelector('.trainer-class-tooltip');
            tooltip.style.display = 'block';
        });
        
        classSelect.addEventListener('mouseleave', () => {
            const tooltip = classContainer.querySelector('.trainer-class-tooltip');
            tooltip.style.display = 'none';
        });
        
        trainerControls.appendChild(classContainer);

        // Favorite type dropdown - add this after the trainer class container
        const favoriteTypeContainer = document.createElement('div');
        favoriteTypeContainer.className = 'trainer-favorite-type-container';

        const favoriteTypeLabel = document.createElement('label');
        favoriteTypeLabel.textContent = 'Lieblingstyp:';
        favoriteTypeLabel.htmlFor = `trainer-favorite-type-${i}`;

        const favoriteTypeSelect = document.createElement('select');
        favoriteTypeSelect.id = `trainer-favorite-type-${i}`;
        favoriteTypeSelect.className = 'trainer-favorite-type-select';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Typ auswählen';
        favoriteTypeSelect.appendChild(defaultOption);

        // Add type options
        GERMAN_POKEMON_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            
            if (trainers[i].favoriteType === type.id) {
                option.selected = true;
            }
            
            favoriteTypeSelect.appendChild(option);
        });

        favoriteTypeSelect.addEventListener('change', (e) => {
            const newFavoriteType = e.target.value || null;
            handleFavoriteTypeChange(i, newFavoriteType);
        });

        favoriteTypeContainer.appendChild(favoriteTypeLabel);
        favoriteTypeContainer.appendChild(favoriteTypeSelect);
        trainerControls.appendChild(favoriteTypeContainer);
        
        trainerContent.appendChild(trainerControls);
        trainerSection.appendChild(trainerContent);
        team.appendChild(trainerSection);
        
        // Team slots container
        const teamSlots = document.createElement('div');
        teamSlots.className = 'team-slots';
        
        // Create fighter slots - ALWAYS CREATE 6 SLOTS for grid layout
        for (let j = 0; j < 6; j++) {
            const slot = document.createElement('div');
            slot.className = 'team-slot';
            slot.dataset.team = i;
            slot.dataset.slot = j;
            
            // Only add content for configured Pokemon
            if (j < fightersPerTeam) {
                // Create Pokemon selection header with sprite + dropdown
                const pokemonHeader = document.createElement('div');
                pokemonHeader.className = 'pokemon-header';
                
                // Sprite container on the left
                const spriteContainer = document.createElement('div');
                spriteContainer.className = 'pokemon-sprite-container';
                
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    const img = document.createElement('img');
                    img.src = character.spriteUrl || 'placeholder.png';
                    img.alt = character.name;
                    spriteContainer.appendChild(img);
                    
                    // Add green border if Pokemon is buffed by favorite type
                    if (character.isTypeBuffed) {
                        spriteContainer.classList.add('buffed-sprite');
                    } else {
                        spriteContainer.classList.remove('buffed-sprite');
                    }
                    
                    // Create tooltip for Pokemon stats
                    const tooltip = createPokemonStatsTooltip(character);
                    spriteContainer.appendChild(tooltip);
                    
                    // Add hover event listeners for tooltip
                    spriteContainer.addEventListener('mouseenter', () => {
                        tooltip.style.display = 'block';
                    });
                    
                    spriteContainer.addEventListener('mouseleave', () => {
                        tooltip.style.display = 'none';
                    });
                }
                pokemonHeader.appendChild(spriteContainer);
                
                // Pokemon controls container (right side)
                const pokemonControls = document.createElement('div');
                pokemonControls.className = 'pokemon-controls';
                
                // Top row with Pokemon selector and strategy
                const topRowControls = document.createElement('div');
                topRowControls.className = 'top-row-controls';
                
                // Create a custom select wrapper for Pokemon
                const customSelectWrapper = document.createElement('div');
                customSelectWrapper.className = 'custom-select-wrapper';
                customSelectWrapper.id = `custom-select-wrapper-${i}-${j}`;
                
                // Create the custom select for Pokemon
                const customSelect = document.createElement('div');
                customSelect.className = 'custom-select';
                customSelect.dataset.team = i;
                customSelect.dataset.slot = j;
                
                // Create the trigger (what shows when select is closed)
                const customSelectTrigger = document.createElement('div');
                customSelectTrigger.className = 'custom-select__trigger';
                
                // Add loading spinner initially
                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'loading-spinner';
                
                const triggerText = document.createElement('span');
                triggerText.textContent = 'Lade Pokémon...';
                
                customSelectTrigger.appendChild(loadingSpinner);
                customSelectTrigger.appendChild(triggerText);
                
                // Create the options container
                const customSelectOptions = document.createElement('div');
                customSelectOptions.className = 'custom-select__options';

                // Add search input at the top of options
                const searchContainer = document.createElement('div');
                searchContainer.className = 'custom-select__search-container';
                searchContainer.style.padding = '10px';
                searchContainer.style.position = 'sticky';
                searchContainer.style.top = '0';
                searchContainer.style.backgroundColor = '#fff';
                searchContainer.style.borderBottom = '1px solid #eee';
                searchContainer.style.zIndex = '2';

                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.className = 'custom-select__search-input';
                searchInput.placeholder = 'Pokémon suchen...';
                searchInput.style.width = '100%';
                searchInput.style.padding = '8px';
                searchInput.style.borderRadius = '4px';
                searchInput.style.border = '1px solid #ddd';
                searchInput.style.boxSizing = 'border-box';

                searchContainer.appendChild(searchInput);
                customSelectOptions.appendChild(searchContainer);
                
                customSelect.appendChild(customSelectTrigger);
                customSelect.appendChild(customSelectOptions);
                customSelectWrapper.appendChild(customSelect);
                topRowControls.appendChild(customSelectWrapper);
                
                // Add strategy dropdown in the top row if a character is selected
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    
                    // Strategy dropdown - compact version for top row
                    const strategyContainer = document.createElement('div');
                    strategyContainer.className = 'strategy-container-mini';

                    const strategyLabel = document.createElement('label');
                    strategyLabel.textContent = 'Strategie:';
                    strategyLabel.htmlFor = `strategy-${i}-${j}`;

                    const strategySelect = document.createElement('select');
                    strategySelect.id = `strategy-${i}-${j}`;
                    strategySelect.className = 'strategy-select'; // Add class for styling

                    // Add strategy options
                    STRATEGY_OPTIONS.forEach(strategy => {
                        const option = document.createElement('option');
                        option.value = strategy.value;
                        option.textContent = strategy.text;
                        
                        // Select the character's current strategy
                        if ((character.strategy && character.strategy === strategy.value) || 
                            (!character.strategy && strategy.value === 'aggressive')) {
                            option.selected = true;
                        }
                        
                        strategySelect.appendChild(option);
                    });

                    // Add change event listener (original functionality)
                    strategySelect.addEventListener('change', (e) => {
                        teamAssignments[i][j].strategy = e.target.value;
                    });

                    // Create and setup tooltip
                    const strategyTooltip = createStrategyTooltip(strategyContainer, strategySelect);

                    strategyContainer.appendChild(strategyLabel);
                    strategyContainer.appendChild(strategySelect);
                    topRowControls.appendChild(strategyContainer);
                }
                
                pokemonControls.appendChild(topRowControls);
                
                // Add forcing mode in second row if a character is selected
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    
                    // Create container for forcing mode
                    const secondRowControls = document.createElement('div');
                    secondRowControls.className = 'top-row-controls';
                    
                    // Empty spacer to align with Pokemon dropdown
                    const spacer = document.createElement('div');
                    spacer.style.flex = '1.5'; // Match the flex value of custom-select-wrapper
                    spacer.style.marginRight = '2px'; // Match margin from Pokemon dropdown
                    secondRowControls.appendChild(spacer);
                    
                    // Forcing mode dropdown - compact version
                    const forceModeContainer = document.createElement('div');
                    forceModeContainer.className = 'strategy-container-mini';
                    forceModeContainer.style.marginRight = '-3px'; // Extend closer to right edge
                
                    const forceModeLabel = document.createElement('label');
                    forceModeLabel.textContent = 'Forcieren:';
                    forceModeLabel.htmlFor = `force-mode-${i}-${j}`;
                
                    const forceModeSelect = document.createElement('select');
                    forceModeSelect.id = `force-mode-${i}-${j}`;
                
                    // Add forcing mode options
                    FORCING_MODE_OPTIONS.forEach(mode => {
                        const option = document.createElement('option');
                        option.value = mode.value;
                        option.textContent = mode.text;
                        
                        // Select the character's current forcing mode
                        if ((character.forcingMode && character.forcingMode === mode.value) || 
                            (!character.forcingMode && mode.value === 'always')) {
                            option.selected = true;
                        }
                        
                        forceModeSelect.appendChild(option);
                    });
                
                    // Add change event listener
                    forceModeSelect.addEventListener('change', (e) => {
                        teamAssignments[i][j].forcingMode = e.target.value;
                    });
                
                    forceModeContainer.appendChild(forceModeLabel);
                    forceModeContainer.appendChild(forceModeSelect);
                    secondRowControls.appendChild(forceModeContainer);
                    
                    pokemonControls.appendChild(secondRowControls);
                    
                    // Add item selection in third row
                    const thirdRowControls = document.createElement('div');
                    thirdRowControls.className = 'top-row-controls';
                    
                    // Empty spacer to align with Pokemon dropdown
                    const spacer2 = document.createElement('div');
                    spacer2.style.flex = '1.5'; // Match the flex value of custom-select-wrapper
                    spacer2.style.marginRight = '2px'; // Match margin from Pokemon dropdown
                    thirdRowControls.appendChild(spacer2);
                    
                    // Item dropdown - compact version
                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'strategy-container-mini';
                    itemContainer.style.marginRight = '-3px'; // Extend closer to right edge
                
                    const itemLabel = document.createElement('label');
                    itemLabel.textContent = 'Item:';
                    itemLabel.htmlFor = `item-${i}-${j}`;
                
                    const itemSelect = document.createElement('select');
                    itemSelect.id = `item-${i}-${j}`;
                    
                    // Add empty option
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = 'Kein Item';
                    itemSelect.appendChild(emptyOption);
                
                    // Add item options
                    const availableItems = getAvailableItems();
                    availableItems.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name;
                        option.dataset.itemDescription = item.effect; // Store description in data attribute
                        
                        // Select the character's current item
                        if (character.selectedItem && character.selectedItem.id === item.id) {
                            option.selected = true;
                        }
                        
                        itemSelect.appendChild(option);
                    });

                    // Create item tooltip
                    const itemTooltip = document.createElement('div');
                    itemTooltip.className = 'item-tooltip';
                    itemTooltip.style.display = 'none';
                    itemContainer.appendChild(itemTooltip);

                    // Function to update tooltip content
                    function updateItemTooltip(itemId) {
                        if (!itemId) {
                            itemTooltip.style.display = 'none';
                            return;
                        }
                        
                        const item = getItemById(itemId);
                        if (item) {
                            itemTooltip.innerHTML = `
                                <div class="item-tooltip-header">
                                    <strong>${item.name}</strong>
                                </div>
                                <div class="item-tooltip-description">
                                    ${item.effect}
                                </div>
                            `;
                            itemTooltip.style.display = 'block';
                        } else {
                            itemTooltip.style.display = 'none';
                        }
                    }

                    // Add event listeners for tooltip
                    itemSelect.addEventListener('mouseenter', (e) => {
                        const selectedValue = e.target.value;
                        if (selectedValue) {
                            updateItemTooltip(selectedValue);
                        }
                    });

                    itemSelect.addEventListener('mouseleave', () => {
                        itemTooltip.style.display = 'none';
                    });

                    // Update tooltip when selection changes
                    itemSelect.addEventListener('change', (e) => {
                        const itemId = e.target.value;
                        if (itemId) {
                            const selectedItem = getItemById(itemId);
                            teamAssignments[i][j].selectedItem = selectedItem;
                            // Show tooltip briefly after selection
                            updateItemTooltip(itemId);
                            setTimeout(() => {
                                if (!itemSelect.matches(':hover')) {
                                    itemTooltip.style.display = 'none';
                                }
                            }, 2000); // Hide after 2 seconds if not hovering
                        } else {
                            teamAssignments[i][j].selectedItem = null;
                            itemTooltip.style.display = 'none';
                        }
                    });

                    // Handle option hover (for when dropdown is open)
                    itemSelect.addEventListener('mouseover', (e) => {
                        if (e.target.tagName === 'OPTION' && e.target.value) {
                            updateItemTooltip(e.target.value);
                        }
                    });

                    // Position tooltip relative to the select element
                    function positionItemTooltip() {
                        const rect = itemSelect.getBoundingClientRect();
                        const containerRect = itemContainer.getBoundingClientRect();
                        
                        // Position tooltip to the right of the select element
                        itemTooltip.style.left = `${rect.width + 10}px`;
                        itemTooltip.style.top = `0px`;
                    }

                    // Update position when showing tooltip
                    const originalMouseEnter = itemSelect.addEventListener;
                    itemSelect.addEventListener('mouseenter', (e) => {
                        const selectedValue = e.target.value;
                        if (selectedValue) {
                            positionItemTooltip();
                            updateItemTooltip(selectedValue);
                        }
                    });
                
                    itemContainer.appendChild(itemLabel);
                    itemContainer.appendChild(itemSelect);
                    thirdRowControls.appendChild(itemContainer);
                    
                    pokemonControls.appendChild(thirdRowControls);
                }
                
                pokemonHeader.appendChild(pokemonControls);
                slot.appendChild(pokemonHeader);
                
                // Load Pokémon and populate dropdown
                getAvailableTemplates().then(templates => {
                    // Store all pokemon options for searching
                    const allPokemonOptions = [];
                    
                    // Remove loading spinner
                    customSelectTrigger.innerHTML = '';
                    
                    // Add current selection or default text
                    const currentPokemon = teamAssignments[i][j];
                    
                    if (currentPokemon) {
                        // Show selected Pokémon
                        const selectedImg = document.createElement('img');
                        selectedImg.src = currentPokemon.spriteUrl || 'placeholder.png';
                        selectedImg.className = 'custom-select__trigger-img';
                        
                        const selectedText = document.createElement('span');
                        selectedText.textContent = currentPokemon.name;
                        
                        customSelectTrigger.appendChild(selectedImg);
                        customSelectTrigger.appendChild(selectedText);
                    } else {
                        // Show default text
                        const selectedText = document.createElement('span');
                        selectedText.textContent = 'Pokémon auswählen';
                        customSelectTrigger.appendChild(selectedText);
                    }
                    
                    // Clear options (except search container)
                    const searchContainer = customSelectOptions.querySelector('.custom-select__search-container');
                    customSelectOptions.innerHTML = '';
                    customSelectOptions.appendChild(searchContainer);
                    
                    // Add default "no selection" option
                    const defaultOption = document.createElement('div');
                    defaultOption.className = 'custom-select__option';
                    defaultOption.dataset.value = '';
                    defaultOption.textContent = 'Kein Pokémon';
                    defaultOption.dataset.searchName = 'kein pokemon';
                    
                    defaultOption.addEventListener('click', function() {
                        handleCharacterSelection(i, j, '');
                        customSelect.classList.remove('open');
                        
                        // Update trigger display
                        customSelectTrigger.innerHTML = '';
                        const selectedText = document.createElement('span');
                        selectedText.textContent = 'Pokémon auswählen';
                        customSelectTrigger.appendChild(selectedText);
                    });
                    
                    customSelectOptions.appendChild(defaultOption);
                    
                    // Add all Pokémon options
                    templates.forEach(pokemon => {
                        const option = document.createElement('div');
                        option.className = 'custom-select__option';
                        option.dataset.value = pokemon.id;
                        option.dataset.searchName = pokemon.name.toLowerCase();
                        
                        // Add sprite image
                        if (pokemon.sprite) {
                            const img = document.createElement('img');
                            img.src = pokemon.sprite;
                            img.className = 'custom-select__option-img';
                            img.onerror = function() {
                                this.src = 'placeholder.png'; // Fallback for missing sprites
                            };
                            option.appendChild(img);
                        }
                        
                        // Add Pokémon name
                        const text = document.createElement('span');
                        text.textContent = pokemon.name;
                        option.appendChild(text);
                        
                        // Mark as selected if this is the current Pokémon
                        if (currentPokemon && currentPokemon.name === pokemon.name) {
                            option.classList.add('selected');
                        }
                        
                        // Add click handler
                        option.addEventListener('click', function() {
                            handleCharacterSelection(i, j, pokemon.id);
                            customSelect.classList.remove('open');
                            
                            // Update trigger display
                            customSelectTrigger.innerHTML = '';
                            
                            const selectedImg = document.createElement('img');
                            selectedImg.src = pokemon.sprite || 'placeholder.png';
                            selectedImg.className = 'custom-select__trigger-img';
                            
                            const selectedText = document.createElement('span');
                            selectedText.textContent = pokemon.name;
                            
                            customSelectTrigger.appendChild(selectedImg);
                            customSelectTrigger.appendChild(selectedText);
                        });
                        
                        customSelectOptions.appendChild(option);
                        allPokemonOptions.push(option);
                    });

                    // Add event listener for the search input
                    const searchInput = customSelect.querySelector('.custom-select__search-input');
                    searchInput.addEventListener('input', function(e) {
                        const searchText = e.target.value.toLowerCase();
                        const options = customSelectOptions.querySelectorAll('.custom-select__option');
                        
                        let firstVisible = null;
                        
                        options.forEach(option => {
                            // Skip the search container itself
                            if (option.classList.contains('custom-select__search-container')) {
                                return;
                            }
                            
                            const pokemonName = option.dataset.searchName;
                            if (pokemonName && pokemonName.includes(searchText)) {
                                option.style.display = 'flex';
                                if (!firstVisible) firstVisible = option;
                            } else {
                                option.style.display = 'none';
                            }
                        });
                        
                        // Scroll to first matching result
                        if (firstVisible) {
                            firstVisible.scrollIntoView({ block: 'nearest' });
                        }
                    });
                    
                    // Handle keyboard navigation
                    searchInput.addEventListener('keydown', function(e) {
                        const options = Array.from(customSelectOptions.querySelectorAll('.custom-select__option:not([style*="display: none"])'));
                        
                        if (e.key === 'Enter' && options.length > 0) {
                            // Select the first visible option on Enter
                            options[0].click();
                            return;
                        }
                        
                        if (e.key === 'Escape') {
                            // Close dropdown on escape
                            customSelect.classList.remove('open');
                            return;
                        }
                    });
                    
                }).catch(error => {
                    console.error("Error loading Pokémon:", error);
                    
                    // Show error in trigger
                    customSelectTrigger.innerHTML = '';
                    const errorText = document.createElement('span');
                    errorText.textContent = 'Fehler beim Laden der Pokémon';
                    errorText.style.color = 'red';
                    customSelectTrigger.appendChild(errorText);
                });
                
                // Add click event to toggle dropdown
                customSelectTrigger.addEventListener('click', function() {
                    // Close all other open dropdowns
                    document.querySelectorAll('.custom-select.open').forEach(select => {
                        if (select !== customSelect) {
                            select.classList.remove('open');
                        }
                    });
                    
                    // Toggle this dropdown
                    const wasAlreadyOpen = customSelect.classList.contains('open');
                    customSelect.classList.toggle('open');
                    
                    // Focus search input if dropdown is now open
                    if (!wasAlreadyOpen && customSelect.classList.contains('open')) {
                        setTimeout(() => {
                            const searchInput = customSelect.querySelector('.custom-select__search-input');
                            if (searchInput) {
                                searchInput.focus();
                                searchInput.select(); // Select any existing text
                            }
                        }, 10);
                    }
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', function(e) {
                    if (!customSelect.contains(e.target)) {
                        customSelect.classList.remove('open');
                    }
                });
                
                // If a Pokemon is selected, show its moves
                if (teamAssignments[i][j]) {
                    const character = teamAssignments[i][j];
                    
                    // Add moves selection if character has availableMoves
                    if (character.availableMoves && character.availableMoves.length > 0) {
                        // Create moves container with 2x2 grid
                        const movesContainer = document.createElement('div');
                        movesContainer.className = 'moves-container';
                        movesContainer.style.marginTop = '15px';
                        
                        // Create four move dropdowns
                        for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
                            // Create move container
                            const moveContainer = document.createElement('div');
                            moveContainer.className = 'move-selection-container';
                            
                            // Create move dropdown
                            const moveSelect = document.createElement('select');
                            moveSelect.className = 'move-select';
                            moveSelect.id = `move-select-${i}-${j}-${moveIndex}`;
                            moveSelect.dataset.teamIndex = i;
                            moveSelect.dataset.slotIndex = j;
                            moveSelect.dataset.moveIndex = moveIndex;
                            
                            // Add default empty option
                            const emptyOption = document.createElement('option');
                            emptyOption.value = '';
                            emptyOption.textContent = `Attacke ${moveIndex+1}`;
                            moveSelect.appendChild(emptyOption);
                            
                            // Get currently selected moves
                            const selectedMoves = character.selectedMoves || [null, null, null, null];
                            const currentMove = selectedMoves[moveIndex];
                            const otherSelectedMoves = selectedMoves.filter((move, idx) => idx !== moveIndex && move !== null);
                            
                            // Get available moves, including Verzweifler if appropriate
                            const availableMoves = getAvailableMovesForUI(character);
                            
                            // Add move options
                            availableMoves.forEach(move => {
                                const option = document.createElement('option');
                                option.value = move.id;
                                option.textContent = move.name;
                                
                                // If this is Verzweifler and there are selected moves, don't show it
                                if (move.id === -9999 && hasSelectedMoves(character)) {
                                    return;
                                }
                                
                                // Check if this move is selected in this dropdown
                                if (currentMove && currentMove.id === move.id) {
                                    option.selected = true;
                                }
                                
                                // Check if move exists in RANGED_WEAPON_TYPES
                                const normalizedMoveName = move.name.toLowerCase();
                                const moveExistsInConfig = RANGED_WEAPON_TYPES[normalizedMoveName] !== undefined;
                                
                                // Disable if move is already selected in another dropdown OR move doesn't exist in RANGED_WEAPON_TYPES
                                if (otherSelectedMoves.some(selected => selected && selected.id === move.id) || !moveExistsInConfig) {
                                    option.disabled = true;
                                    option.style.color = '#999';
                                }
                                
                                moveSelect.appendChild(option);
                            });
                            
                            // Add change event listener
                            moveSelect.addEventListener('change', (e) => {
                                const moveId = parseInt(e.target.value);
                                const teamIdx = parseInt(e.target.dataset.teamIndex);
                                const slotIdx = parseInt(e.target.dataset.slotIndex);
                                const moveIdx = parseInt(e.target.dataset.moveIndex);
                                
                                // Find the selected move
                                let selectedMove = null;
                                
                                // Special handling for Verzweifler
                                if (moveId === -9999) {
                                    selectedMove = createVerzweiflerMove();
                                } else {
                                    selectedMove = moveId ? character.availableMoves.find(move => move.id === moveId) : null;
                                }
                                
                                // Update character's selected moves
                                if (!teamAssignments[teamIdx][slotIdx].selectedMoves) {
                                    teamAssignments[teamIdx][slotIdx].selectedMoves = [null, null, null, null];
                                }
                                teamAssignments[teamIdx][slotIdx].selectedMoves[moveIdx] = selectedMove;
                                
                                // Convert selectedMoves to actual attacks for the character
                                updateCharacterAttacks(teamAssignments[teamIdx][slotIdx]);
                                
                                // Update the move details display for this dropdown
                                const detailsContainer = moveContainer.querySelector('.move-details');
                                if (detailsContainer) {
                                    if (selectedMove) {
                                        detailsContainer.innerHTML = `
                                            <div><span class="move-detail-label">Typ:</span> <span class="type-badge type-${selectedMove.type}">${selectedMove.typeDe}</span></div>
                                            <div><span class="move-detail-label">Stärke:</span> ${selectedMove.strength}d6</div>
                                            <div><span class="move-detail-label">Reichweite:</span> ${selectedMove.range}</div>
                                            <div><span class="move-detail-label">AP:</span> ${selectedMove.pp}</div>
                                            ${selectedMove.effect ? `<div><span class="move-detail-label">Effekt:</span> ${selectedMove.effect}</div>` : ''}
                                        `;
                                        detailsContainer.style.display = 'block';
                                    } else {
                                        detailsContainer.style.display = 'none';
                                    }
                                }
                                
                                // UPDATE ALL OTHER MOVE DROPDOWNS FOR THIS CHARACTER
                                // This is the key fix - we need to update the other dropdowns when a move is selected
                                const updatedSelectedMoves = teamAssignments[teamIdx][slotIdx].selectedMoves;
                                
                                // Get all move dropdowns for this character
                                const moveDropdowns = document.querySelectorAll(`select[id^="move-select-${teamIdx}-${slotIdx}"]`);
                                
                                // Update each dropdown
                                moveDropdowns.forEach(dropdown => {
                                const dropdownMoveIdx = parseInt(dropdown.dataset.moveIndex);
                                
                                // Skip the dropdown that was just changed
                                if (dropdownMoveIdx === moveIdx) return;
                                
                                // Get moves selected in other dropdowns
                                const otherSelectedMoves = updatedSelectedMoves.filter((move, idx) => 
                                    idx !== dropdownMoveIdx && move !== null
                                );
                                
                                // Update each option in this dropdown
                                Array.from(dropdown.options).forEach(option => {
                                    if (option.value === '') return; // Skip empty option
                                    
                                    const optionMoveId = parseInt(option.value);
                                    
                                    // Find the move data corresponding to this option
                                    const moveOption = character.availableMoves.find(move => move.id === optionMoveId);
                                    
                                    // Check if move exists in RANGED_WEAPON_TYPES
                                    const normalizedMoveName = moveOption?.name?.toLowerCase() || '';
                                    const moveExistsInConfig = RANGED_WEAPON_TYPES[normalizedMoveName] !== undefined;
                                    
                                    // Disable if this move is selected in another dropdown OR move doesn't exist in RANGED_WEAPON_TYPES
                                    const isSelectedElsewhere = otherSelectedMoves.some(move => 
                                        move && move.id === optionMoveId
                                    );
                                    
                                    option.disabled = isSelectedElsewhere || !moveExistsInConfig;
                                    option.style.color = (isSelectedElsewhere || !moveExistsInConfig) ? '#999' : '';
                                });
                            });
                            });
                            
                            moveContainer.appendChild(moveSelect);
                            
                            // Add move details container
                            const moveDetails = document.createElement('div');
                            moveDetails.className = 'move-details';
                            moveDetails.style.display = currentMove ? 'block' : 'none';
                            
                            // Add move details if a move is selected
                            if (currentMove) {
                                moveDetails.innerHTML = `
                                    <div><span class="move-detail-label">Typ:</span> <span class="type-badge type-${currentMove.type}">${currentMove.typeDe}</span></div>
                                    <div><span class="move-detail-label">Stärke:</span> ${currentMove.strength}d6</div>
                                    <div><span class="move-detail-label">Reichweite:</span> ${currentMove.range}</div>
                                    ${currentMove.effect ? `<div><span class="move-detail-label">Effekt:</span> ${currentMove.effect}</div>` : ''}
                                `;
                            }
                            
                            moveContainer.appendChild(moveDetails);
                            movesContainer.appendChild(moveContainer);
                        }
                        
                        slot.appendChild(movesContainer);
                    }
                }
            } else {
                // For slots beyond the configured number, show disabled style
                slot.classList.add('disabled-slot');
                const disabledMessage = document.createElement('div');
                disabledMessage.className = 'disabled-slot-message';
                disabledMessage.textContent = 'Nicht konfiguriert';
                slot.appendChild(disabledMessage);
            }
            
            teamSlots.appendChild(slot);
        }
        
        team.appendChild(teamSlots);
        teamsList.appendChild(team);
        
        // Update tooltip content
        updateClassTooltip(i);
    }
    
    // Update the fight button state
    updateFightButtonState();
}

/**
 * Open trainer icon selector modal
 * @param {number} teamIndex - Index of the team
 */
async function openTrainerIconSelector(teamIndex) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '10000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '600px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';
    
    // Modal title
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Trainer-Icon auswählen';
    modalTitle.style.marginTop = '0';
    modalContent.appendChild(modalTitle);
    
    // Loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div><span>Lade Icons...</span>';
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.padding = '20px';
    modalContent.appendChild(loadingIndicator);
    
    // Add modal to DOM early so user sees loading
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    try {
        // Get available icons (this is async)
        const availableIcons = await getAvailableTrainerIcons();
        
        // Remove loading indicator
        modalContent.removeChild(loadingIndicator);
        
        // Icon grid
        const iconGrid = document.createElement('div');
        iconGrid.className = 'trainer-icon-grid';
        iconGrid.style.display = 'grid';
        iconGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        iconGrid.style.gap = '10px';
        iconGrid.style.marginBottom = '20px';
        
        // Add available icons
        availableIcons.forEach(iconName => {
            const iconOption = document.createElement('div');
            iconOption.className = 'trainer-icon-option';
            iconOption.style.cursor = 'pointer';
            iconOption.style.padding = '10px';
            iconOption.style.border = '2px solid transparent';
            iconOption.style.borderRadius = '8px';
            iconOption.style.textAlign = 'center';
            iconOption.style.transition = 'all 0.3s ease';
            
            const iconImg = document.createElement('img');
            iconImg.src = `TrainerIcons/${iconName}`;
            iconImg.alt = iconName;
            iconImg.style.width = '80px';
            iconImg.style.height = '80px';
            iconImg.style.objectFit = 'contain';
            
            // Add filename label
            const iconLabel = document.createElement('div');
            iconLabel.textContent = iconName.replace(/\.[^/.]+$/, ""); // Remove file extension
            iconLabel.style.fontSize = '12px';
            iconLabel.style.marginTop = '5px';
            iconLabel.style.color = '#666';
            
            iconOption.appendChild(iconImg);
            iconOption.appendChild(iconLabel);
            
            // Check if this is the current icon
            if (trainers[teamIndex].icon === iconName) {
                iconOption.style.borderColor = '#4a6fa5';
                iconOption.style.backgroundColor = '#f0f5ff';
            }
            
            // Add hover effect
            iconOption.addEventListener('mouseenter', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = '#ccc';
                    iconOption.style.backgroundColor = '#f9f9f9';
                }
            });
            
            iconOption.addEventListener('mouseleave', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = 'transparent';
                    iconOption.style.backgroundColor = 'transparent';
                }
            });
            
            // Add click handler
            iconOption.addEventListener('click', () => {
                // Update trainer icon
                trainers[teamIndex].icon = iconName;
                
                // Update UI
                const trainerIconElement = document.querySelector(`.team:nth-child(${teamIndex + 1}) .trainer-icon`);
                if (trainerIconElement) {
                    trainerIconElement.src = `TrainerIcons/${iconName}`;
                }
                
                // Close modal
                document.body.removeChild(modalOverlay);
            });
            
            iconGrid.appendChild(iconOption);
        });
        
        modalContent.appendChild(iconGrid);
        
    } catch (error) {
        console.error('Error loading trainer icons:', error);
        
        // Remove loading indicator if it still exists
        if (modalContent.contains(loadingIndicator)) {
            modalContent.removeChild(loadingIndicator);
        }
        
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Fehler beim Laden der Icons. Verwende Standard-Icons.';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.padding = '20px';
        errorMessage.style.color = 'red';
        modalContent.appendChild(errorMessage);
        
        // Use fallback icons
        const fallbackIcons = [];
        for (let i = 1; i <= 12; i++) {
            fallbackIcons.push(`trainer${i}.png`);
        }
        
        // Icon grid for fallback
        const iconGrid = document.createElement('div');
        iconGrid.className = 'trainer-icon-grid';
        iconGrid.style.display = 'grid';
        iconGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        iconGrid.style.gap = '10px';
        iconGrid.style.marginBottom = '20px';
        
        // Add fallback icons
        fallbackIcons.forEach(iconName => {
            const iconOption = document.createElement('div');
            iconOption.className = 'trainer-icon-option';
            iconOption.style.cursor = 'pointer';
            iconOption.style.padding = '10px';
            iconOption.style.border = '2px solid transparent';
            iconOption.style.borderRadius = '8px';
            iconOption.style.textAlign = 'center';
            iconOption.style.transition = 'all 0.3s ease';
            
            const iconImg = document.createElement('img');
            iconImg.src = `TrainerIcons/${iconName}`;
            iconImg.alt = iconName;
            iconImg.style.width = '80px';
            iconImg.style.height = '80px';
            iconImg.style.objectFit = 'contain';
            
            // Add filename label
            const iconLabel = document.createElement('div');
            iconLabel.textContent = iconName.replace(/\.[^/.]+$/, "");
            iconLabel.style.fontSize = '12px';
            iconLabel.style.marginTop = '5px';
            iconLabel.style.color = '#666';
            
            iconOption.appendChild(iconImg);
            iconOption.appendChild(iconLabel);
            
            // Check if this is the current icon
            if (trainers[teamIndex].icon === iconName) {
                iconOption.style.borderColor = '#4a6fa5';
                iconOption.style.backgroundColor = '#f0f5ff';
            }
            
            // Add hover effect
            iconOption.addEventListener('mouseenter', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = '#ccc';
                    iconOption.style.backgroundColor = '#f9f9f9';
                }
            });
            
            iconOption.addEventListener('mouseleave', () => {
                if (trainers[teamIndex].icon !== iconName) {
                    iconOption.style.borderColor = 'transparent';
                    iconOption.style.backgroundColor = 'transparent';
                }
            });
            
            // Add click handler
            iconOption.addEventListener('click', () => {
                // Update trainer icon
                trainers[teamIndex].icon = iconName;
                
                // Update UI
                const trainerIconElement = document.querySelector(`.team:nth-child(${teamIndex + 1}) .trainer-icon`);
                if (trainerIconElement) {
                    trainerIconElement.src = `TrainerIcons/${iconName}`;
                }
                
                // Close modal
                document.body.removeChild(modalOverlay);
            });
            
            iconGrid.appendChild(iconOption);
        });
        
        modalContent.appendChild(iconGrid);
    }
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Schließen';
    closeButton.className = 'btn';
    closeButton.style.display = 'block';
    closeButton.style.margin = '0 auto';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    modalContent.appendChild(closeButton);
    
    // Close modal when clicking overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}

/**
 * Update class tooltip for a trainer
 * @param {number} teamIndex - Index of the team
 */
function updateClassTooltip(teamIndex) {
    const classSelect = document.getElementById(`trainer-class-${teamIndex}`);
    const tooltip = classSelect.parentElement.querySelector('.trainer-class-tooltip');
    
    if (!classSelect || !tooltip) return;
    
    const selectedClass = classSelect.value;
    const description = getTrainerClassDescription(selectedClass);
    
    if (description) {
        tooltip.innerHTML = `
            <div class="trainer-class-tooltip-header">
                <strong>${classSelect.options[classSelect.selectedIndex].textContent}</strong>
            </div>
            <div class="trainer-class-tooltip-description">
                ${description}
            </div>
        `;
    }
}

/**
 * Check if all teams are filled to capacity
 * @returns {boolean} - Whether all teams are filled
 */
export function areAllTeamsFilled() {
    const teamCount = validateTeamCount();
    const fightersPerTeam = validateFightersPerTeam();
    
    // Check if all teams have the required number of fighters
    for (let i = 0; i < teamCount; i++) {
        // Ensure team exists
        if (!teamAssignments[i]) {
            return false;
        }
        
        // Check if team has correct number of fighters
        if (teamAssignments[i].length !== fightersPerTeam) {
            return false;
        }
        
        // Check if all slots are filled
        for (let j = 0; j < fightersPerTeam; j++) {
            if (teamAssignments[i][j] === null) {
                return false;
            }
        }
    }
    
    // All teams are filled
    return true;
}

/**
 * Handle drag over
 * @param {DragEvent} e - The drag event
 */
export function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drag enter
 * @param {DragEvent} e - The drag event
 */
export function handleDragEnter(e) {
    e.preventDefault();
    e.target.closest('.team-slot').classList.add('drag-over');
}

/**
 * Handle drag leave
 * @param {DragEvent} e - The drag event
 */
export function handleDragLeave(e) {
    e.target.closest('.team-slot').classList.remove('drag-over');
}

/**
 * Handle drop
 * @param {DragEvent} e - The drag event
 */
export function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation(); // Stop the event from bubbling up to the document
    
    // Remove the drag-over class
    const slot = e.target.closest('.team-slot');
    slot.classList.remove('drag-over');
    
    // Get the team and slot indices
    const teamIndex = parseInt(slot.dataset.team);
    const slotIndex = parseInt(slot.dataset.slot);
    
    // Mark this drop as handled to prevent document drop handler from processing it
    dropHandled = true;
}

/**
 * Handle document drag over
 * @param {DragEvent} e - The drag event
 */
export function handleDocumentDragOver(e) {
    // Only prevent default if we're dragging from a team slot
    if (e.dataTransfer && e.dataTransfer.types.includes('application/json')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
}

/**
 * Handle drop on document (outside team slots)
 * @param {DragEvent} e - The drag event
 */
export function handleDocumentDrop(e) {
    // Only process if we're dropping from a team slot and it wasn't already handled by a team slot
    if (e.dataTransfer && e.dataTransfer.types.includes('application/json') && !dropHandled) {
        e.preventDefault();
    }
    
    // Reset flags
    dropHandled = false;
}

/**
 * Reset the drop handled flag when starting a new drag
 */
export function resetDropHandledFlag() {
    dropHandled = false;
}

/**
 * Creates a tooltip showing Pokemon stats for the team builder
 * @param {Object} character - The character data
 * @returns {HTMLElement} - The tooltip element
 */
function createPokemonStatsTooltip(character) {
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
    const isBuffed = character.isTypeBuffed;
    const buffedStyle = isBuffed ? 'color: #2ecc71;' : '';
    
    // Create tooltip content
    let content = `
        <div class="tooltip-header">
            <h3>${character.name}${isBuffed ? ' <span class="buffed-indicator">(Lieblingstyp-Buff)</span>' : ''}</h3>
        </div>
        <div class="tooltip-section">
            <div class="tooltip-row"><span class="tooltip-label">GENA:</span> <span class="tooltip-value" style="${buffedStyle}">${character.combatStats.gena}</span></div>
            <div class="tooltip-row"><span class="tooltip-label">PA:</span> <span class="tooltip-value" style="${buffedStyle}">${character.combatStats.pa}</span></div>
            <div class="tooltip-row"><span class="tooltip-label">BW:</span> <span class="tooltip-value">${bwValue}</span></div>`;
    
    // Display KP with the original value on the same row but neatly aligned
    if (character.originalKP) {
        content += `
            <div class="tooltip-row">
                <span class="tooltip-label">KP:</span> 
                <span class="tooltip-value" style="${buffedStyle}">
                    ${character.combatStats.kp} 
                    <span style="color:#999;font-size:90%;margin-left:5px;">(Basis: ${character.originalKP})</span>
                </span>
            </div>`;
    } else {
        content += `<div class="tooltip-row"><span class="tooltip-label">KP:</span> <span class="tooltip-value" style="${buffedStyle}">${character.combatStats.kp}</span></div>`;
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
                content += `<div class="tooltip-row"><span class="tooltip-label">${statName}:</span> <span class="tooltip-value" style="${buffedStyle}">${statValue} (${initiativeDisplay})</span></div>`;
            } else {
                content += `<div class="tooltip-row"><span class="tooltip-label">${statName}:</span> <span class="tooltip-value" style="${buffedStyle}">${statValue}</span></div>`;
            }
        }
        content += `<div class="tooltip-row"><span class="tooltip-label">Gesamt:</span> <span class="tooltip-value">${statsDetails.baseStatTotal || '?'}</span></div>`;
        content += `<div class="tooltip-separator"></div>`; // Add separator
    } else {
        // Fallback to basic stats
        content += `
            <div class="tooltip-row"><span class="tooltip-label">Initiative:</span> <span class="tooltip-value" style="${buffedStyle}">${initiativeBase} (${initiativeDisplay})</span></div>
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
                color: #2ecc71;
                font-size: 12px;
                font-weight: normal;
                font-style: italic;
            }
        </style>
    ` + content;
    
    tooltip.innerHTML = content;
    return tooltip;
}

/**
 * Update the move selection UI for a Pokemon
 * @param {Array} character - The Pokemon character
 * @returns {Array} - Array of available moves for the UI
 */
function getAvailableMovesForUI(character) {
    if (!character || !character.availableMoves) {
        return [createVerzweiflerMove()]; // Return only Verzweifler if no moves available
    }
    
    // Get selected moves (non-null ones)
    const selectedMoves = (character.selectedMoves || [])
        .filter(move => move !== null);
    
    // Otherwise return only available moves (no Verzweifler)
    return character.availableMoves;
}

/**
 * Check if any moves are selected for a Pokemon
 * @param {Object} character - The Pokemon character
 * @returns {boolean} - Whether any moves are selected
 */
function hasSelectedMoves(character) {
    if (!character || !character.selectedMoves) {
        return false;
    }
    
    return character.selectedMoves.some(move => move !== null);
}

/**
 * Update a character's attacks based on selected moves
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
                currentPP: move.pp || 0, // Initialize with full PP
                moveType: move.type, // IMPORTANT: This needs to match the type name in effectivenessLookupTable
                moveTypeDe: move.typeDe,
                category: move.category || 'Physisch', // Include the German category
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

// Add this modification to the generateRandomTeam function in teamManager.js
// Replace the existing generateRandomTeam function with this updated version:

/**
 * Generate a random team for the specified team index
 * @param {number} teamIndex - The index of the team to randomize
 */
export async function generateRandomTeam(teamIndex) {
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
        await randomizeTrainer(teamIndex);
        
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
        
        console.log(`Found ${fullyEvolved.length} fully evolved Pokémon`);
        console.log(`Found ${legendaries.length} legendary Pokémon`);
        console.log(`Found ${megaPokemon.length} mega Pokémon`);
        console.log(`Found ${regularPokemon.length} regular Pokémon`);
        
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
                    applyTypeBuff(pokemon);
                }
            });
        }
        
        // Update the UI to show the new team
        updateTeamSlots();
        
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
async function randomizeTrainer(teamIndex) {
    try {
        // Randomize trainer name
        const trainerNames = [
            'Alex', 'Blake', 'Casey', 'Celia', 'Cyrus', 'Drew', 'Ellis', 'Fimo', 'Finley', 'Gemma', 'Georgie',
            'Gray', 'Harper', 'Heinz', 'Indigo', 'Jago', 'Jordan', 'Kai', 'Klara', 'Kyle', 'Lux', 'Merino', 'Miles',
            'Morgan', 'Nova', 'Ocean', 'Phoenix', 'Quinn', 'River',
            'Sage', 'Taylor', 'Tim', 'Uma', 'Vale', 'Wren', 'Xen', 'Yuki', 'Zane', 'Zara'
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
 * Create a Verzweifler move
 * @returns {Object} - The Verzweifler move
 */
function createVerzweiflerMove() {
    return {
        id: -9999,
        name: "Verzweifler",
        englishName: "Struggle",
        type: "normal",
        typeDe: "Normal",
        power: 50,
        strength: 5,
        range: 1,
        accuracy: 100,
        pp: 0,
        currentPP: 0,
        damageClass: 'physical',
        category: 'Physisch'
    };
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
 * Get strategy description text
 * @param {string} strategyValue - The strategy value (aggressiv, standhaft, fliehend)
 * @returns {string} - The description text
 */
function getStrategyDescription(strategyValue) {
    const descriptions = {
        'aggressive': 'Das Pokemon bewegt sich so schnell es kann auf den nächsten Gegner zu, um ihn anzugreifen.',
        'defensive': 'Das Pokemon bewegt sich nur mit halber Geschwindigkeit immer auf den nächsten Gegner zu.',
        'fleeing': 'Das Pokemon bewegt sich so, dass es so weit wie möglich von allen Gegnern wegkommt.'
    };
    
    return descriptions[strategyValue] || 'Beschreibung nicht verfügbar.';
}

/**
 * Create and setup strategy tooltip
 * @param {HTMLElement} strategyContainer - The container element
 * @param {HTMLElement} strategySelect - The select element
 * @returns {HTMLElement} - The tooltip element
 */
function createStrategyTooltip(strategyContainer, strategySelect) {
    // Create tooltip element
    const strategyTooltip = document.createElement('div');
    strategyTooltip.className = 'strategy-tooltip';
    strategyTooltip.style.display = 'none';
    strategyContainer.appendChild(strategyTooltip);

    // Get current strategy name from STRATEGY_OPTIONS
    function getStrategyName(value) {
        const strategy = STRATEGY_OPTIONS.find(opt => opt.value === value);
        return strategy ? strategy.text : value;
    }

    // Function to update tooltip content
    function updateStrategyTooltip(strategyValue) {
        if (!strategyValue) {
            strategyTooltip.style.display = 'none';
            return;
        }
        
        const strategyName = getStrategyName(strategyValue);
        const description = getStrategyDescription(strategyValue);
        
        strategyTooltip.innerHTML = `
            <div class="strategy-tooltip-header">
                <strong>${strategyName}</strong>
            </div>
            <div class="strategy-tooltip-description">
                ${description}
            </div>
        `;
        strategyTooltip.style.display = 'block';
    }

    // Function to position tooltip
    function positionStrategyTooltip() {
        const rect = strategySelect.getBoundingClientRect();
        
        // Position tooltip to the right of the select element
        strategyTooltip.style.left = `${rect.width + 10}px`;
        strategyTooltip.style.top = `0px`;
    }

    // Add event listeners
    strategySelect.addEventListener('mouseenter', () => {
        const selectedValue = strategySelect.value;
        if (selectedValue) {
            positionStrategyTooltip();
            updateStrategyTooltip(selectedValue);
        }
    });

    strategySelect.addEventListener('mouseleave', () => {
        strategyTooltip.style.display = 'none';
    });

    // Update tooltip when selection changes and show briefly
    strategySelect.addEventListener('change', (e) => {
        const strategyValue = e.target.value;
        if (strategyValue) {
            updateStrategyTooltip(strategyValue);
            // Show tooltip briefly after selection
            setTimeout(() => {
                if (!strategySelect.matches(':hover')) {
                    strategyTooltip.style.display = 'none';
                }
            }, 2000); // Hide after 2 seconds if not hovering
        } else {
            strategyTooltip.style.display = 'none';
        }
    });

    // Handle option hover (for when dropdown is open)
    strategySelect.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'OPTION' && e.target.value) {
            updateStrategyTooltip(e.target.value);
        }
    });

    return strategyTooltip;
}

// German Pokemon types
const GERMAN_POKEMON_TYPES = [
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
 * Apply type-based buffs to all Pokemon of a trainer's team
 * @param {number} teamIndex - Index of the team
 * @param {string} favoriteType - The favorite type to buff
 */
function applyTypeBuffsToTeam(teamIndex, favoriteType) {
    if (!favoriteType || !teamAssignments[teamIndex]) return;
    
    teamAssignments[teamIndex].forEach(pokemon => {
        if (!pokemon) return;
        
        // Check if Pokemon has the favorite type - Use pokemonTypes instead of types
        const hasType = pokemon.pokemonTypes && pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === favoriteType.toLowerCase()
        );
        
        if (hasType) {
            applyTypeBuff(pokemon);
        }
    });
}

/**
 * Remove type-based buffs from all Pokemon of a trainer's team
 * @param {number} teamIndex - Index of the team
 * @param {string} favoriteType - The previous favorite type to remove buffs from
 */
function removeTypeBuffsFromTeam(teamIndex, favoriteType) {
    if (!favoriteType || !teamAssignments[teamIndex]) return;
    
    teamAssignments[teamIndex].forEach(pokemon => {
        if (!pokemon) return;
        
        // Check if Pokemon has the previous favorite type - Use pokemonTypes instead of types
        const hasType = pokemon.pokemonTypes && pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === favoriteType.toLowerCase()
        );
        
        if (hasType) {
            removeTypeBuff(pokemon);
        }
    });
}

// Fix for the applyTypeBuff function in teamManager.js
// Replace the existing applyTypeBuff function with this corrected version:

/**
 * Apply 10% type buff to a Pokemon's stats
 * @param {Object} pokemon - The Pokemon to buff
 */
function applyTypeBuff(pokemon) {
    if (!pokemon.combatStats) return;
    
    // Store original stats if not already stored
    if (!pokemon.originalStatsBeforeTypeBuff) {
        pokemon.originalStatsBeforeTypeBuff = {
            kp: pokemon.combatStats.kp,
            gena: pokemon.combatStats.gena,
            pa: pokemon.combatStats.pa
        };
        
        // Store original base stats if they exist
        if (pokemon.statsDetails && pokemon.statsDetails.statsGerman) {
            pokemon.originalBaseStatsBeforeTypeBuff = { ...pokemon.statsDetails.statsGerman };
        }
    }
    
    // Apply 10% buff to combat stats
    const buffMultiplier = 1.1;
    
    // KP buff (both current and max)
    const originalKP = pokemon.originalStatsBeforeTypeBuff.kp;
    const buffedKP = Math.round(originalKP * buffMultiplier);
    pokemon.combatStats.kp = buffedKP;
    pokemon.maxKP = buffedKP;
    
    // If Pokemon still has current KP, scale it proportionally
    if (pokemon.currentKP > 0) {
        const hpRatio = pokemon.currentKP / pokemon.maxKP;
        pokemon.currentKP = Math.round(buffedKP * hpRatio);
    }
    
    // GENA and PA buffs
    pokemon.combatStats.gena = Math.round(pokemon.originalStatsBeforeTypeBuff.gena * buffMultiplier);
    pokemon.combatStats.pa = Math.round(pokemon.originalStatsBeforeTypeBuff.pa * buffMultiplier);
    
    // Buff base stats if they exist (INCLUDING KP!)
    if (pokemon.statsDetails && pokemon.statsDetails.statsGerman && pokemon.originalBaseStatsBeforeTypeBuff) {
        const stats = pokemon.statsDetails.statsGerman;
        const originalStats = pokemon.originalBaseStatsBeforeTypeBuff;
        
        // German stat names - now including KP
        if (originalStats['KP']) stats['KP'] = Math.round(originalStats['KP'] * buffMultiplier);
        if (originalStats['Angriff']) stats['Angriff'] = Math.round(originalStats['Angriff'] * buffMultiplier);
        if (originalStats['Verteidigung']) stats['Verteidigung'] = Math.round(originalStats['Verteidigung'] * buffMultiplier);
        if (originalStats['Spezial-Angriff']) stats['Spezial-Angriff'] = Math.round(originalStats['Spezial-Angriff'] * buffMultiplier);
        if (originalStats['Spezial-Verteidigung']) stats['Spezial-Verteidigung'] = Math.round(originalStats['Spezial-Verteidigung'] * buffMultiplier);
        if (originalStats['Initiative']) stats['Initiative'] = Math.round(originalStats['Initiative'] * buffMultiplier);
    }
    
    // Mark as type buffed
    pokemon.isTypeBuffed = true;
}

// Also update the removeTypeBuff function to restore KP:

/**
 * Remove type buff from a Pokemon's stats
 * @param {Object} pokemon - The Pokemon to remove buff from
 */
function removeTypeBuff(pokemon) {
    if (!pokemon.originalStatsBeforeTypeBuff || !pokemon.isTypeBuffed) return;
    
    // Restore combat stats
    const originalKP = pokemon.originalStatsBeforeTypeBuff.kp;
    
    // Calculate current HP ratio before restoring
    const hpRatio = pokemon.currentKP / pokemon.combatStats.kp;
    
    // Restore KP
    pokemon.combatStats.kp = originalKP;
    pokemon.maxKP = originalKP;
    pokemon.currentKP = Math.round(originalKP * hpRatio);
    
    // Restore GENA and PA
    pokemon.combatStats.gena = pokemon.originalStatsBeforeTypeBuff.gena;
    pokemon.combatStats.pa = pokemon.originalStatsBeforeTypeBuff.pa;
    
    // Restore base stats if they exist (INCLUDING KP!)
    if (pokemon.statsDetails && pokemon.statsDetails.statsGerman && pokemon.originalBaseStatsBeforeTypeBuff) {
        const stats = pokemon.statsDetails.statsGerman;
        const originalStats = pokemon.originalBaseStatsBeforeTypeBuff;
        
        // Restore German stat names - now including KP
        if (originalStats['KP']) stats['KP'] = originalStats['KP'];
        if (originalStats['Angriff']) stats['Angriff'] = originalStats['Angriff'];
        if (originalStats['Verteidigung']) stats['Verteidigung'] = originalStats['Verteidigung'];
        if (originalStats['Spezial-Angriff']) stats['Spezial-Angriff'] = originalStats['Spezial-Angriff'];
        if (originalStats['Spezial-Verteidigung']) stats['Spezial-Verteidigung'] = originalStats['Spezial-Verteidigung'];
        if (originalStats['Initiative']) stats['Initiative'] = originalStats['Initiative'];
    }
    
    // Clear buff markers
    pokemon.isTypeBuffed = false;
    delete pokemon.originalStatsBeforeTypeBuff;
    delete pokemon.originalBaseStatsBeforeTypeBuff;
}

/**
 * Handle favorite type change for a trainer
 * @param {number} teamIndex - Index of the team
 * @param {string} newFavoriteType - The new favorite type
 */
function handleFavoriteTypeChange(teamIndex, newFavoriteType) {
    const trainer = trainers[teamIndex];
    const oldFavoriteType = trainer.favoriteType;
    
    // Remove buffs from old type
    if (oldFavoriteType) {
        removeTypeBuffsFromTeam(teamIndex, oldFavoriteType);
    }
    
    // Update trainer's favorite type
    trainer.favoriteType = newFavoriteType;
    
    // Apply buffs to new type
    if (newFavoriteType) {
        applyTypeBuffsToTeam(teamIndex, newFavoriteType);
    }
    
    // Update team slots to reflect changes
    updateTeamSlots();
}
