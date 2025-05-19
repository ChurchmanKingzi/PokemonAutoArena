/**
 * Trainer class service for managing trainer classes and their descriptions
 */

// Available trainer classes with their descriptions
const TRAINER_CLASSES = [
    {
        id: 'angler',
        name: 'Angler',
        description: 'Nach jeder Runde erscheint mit einer 10%-Chance ein zufälliges Wasser-Pokemon unter deiner Kontrolle in deinem Team-Bereich.'
    },
    {
        id: 'ace-trainer',
        name: 'Ass-Trainer',
        description: 'Deine Pokemon fügen 2.5-fachen Schaden mit sehr effektiven Attacken zu.'
    },
    {
        id: 'clown',
        name: 'Clown',
        description: 'Alle gegnerischen Pokemon beginnen den Kampf verwirrt.'
    },
    {
        id: 'thief',
        name: 'Dieb',
        description: 'Immer, wenn eines deiner Pokemon ein gegnerisches besiegt: 50%-Chance, das Pokemon mit 10% seiner max KP unter deiner Kontrolle wiederzubeleben.'
    },
    {
        id: 'jongleur',
        name: 'Jongleur',
        description: 'Am Anfang der Runde jedes deiner Pokemon: Seine Position wird mit einem zufälligen deiner anderen Pokemon derselben Größe vertauscht.'
    },
    {
        id: 'ninja boy',
        name: 'Ninjajunge',
        description: 'Am Deine Pokemon lösen, wenn sie besiegt werden, die Attacke Explosion aus.'
    },
    {
        id: 'ruffian',
        name: 'Raufbold',
        description: 'Der erste Schaden, den jedes deiner Pokemon nehmen würde, wird negiert.'
    }
];

/**
 * Get all available trainer classes
 * @returns {Array} - Array of trainer class objects
 */
export function getTrainerClasses() {
    return [...TRAINER_CLASSES];
}

/**
 * Get a trainer class by ID
 * @param {string} classId - The ID of the trainer class
 * @returns {Object|null} - The trainer class object or null if not found
 */
export function getTrainerClassById(classId) {
    return TRAINER_CLASSES.find(trainerClass => trainerClass.id === classId) || null;
}

/**
 * Get trainer class description by ID
 * @param {string} classId - The ID of the trainer class
 * @returns {string} - The description of the trainer class
 */
export function getTrainerClassDescription(classId) {
    const trainerClass = getTrainerClassById(classId);
    return trainerClass ? trainerClass.description : '';
}

/**
 * Get available trainer icons by fetching from server
 * @returns {Promise<Array>} - Promise that resolves to array of trainer icon filenames
 */
export async function getAvailableTrainerIcons() {
    try {
        // Updated to match the new API endpoint
        const response = await fetch('/api/trainer-icons');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch trainer icons: ${response.status} ${response.statusText}`);
        }
        
        const icons = await response.json();
        
        // Ensure we return an array
        if (!Array.isArray(icons)) {
            throw new Error('Server returned invalid data format');
        }
        
        console.log(`Successfully loaded ${icons.length} trainer icons from server`);
        return icons.sort(); // Sort alphabetically
        
    } catch (error) {
        console.warn('Could not fetch trainer icons dynamically, using fallback:', error);
        
        // Fallback to default icons if server request fails
        const fallbackIcons = [];
        for (let i = 1; i <= 12; i++) {
            fallbackIcons.push(`trainer${i}.png`);
        }
        
        console.log(`Using fallback icons: ${fallbackIcons.length} icons available`);
        return fallbackIcons.sort();
    }
}