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
 * Static version - Get available trainer icons without server
 * @returns {Array} - Array of trainer icon filenames
 */
export async function getAvailableTrainerIcons() {
    const existingIcons = [
        'Ash.png',
        'Blue.png',
        'Diamond.png',
        'Gold.png',
        'Green.png',
        'Krys.png',
        'Max.png',
        'Misty.png',
        'Platinum.png',
        'Red.png',
        'Rocko.png',
        'Ruby.png',
        'Sapphire.png',
        'Silver.png'
    ];
    
    console.log(`Found ${existingIcons.length} trainer icons`);
    return existingIcons.sort();
}