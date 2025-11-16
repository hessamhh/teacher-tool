

import React from 'react';
import { DiceIcon } from './icons';

const PRESET_STYLES = [
    'Enchanted Forest',
    'Cyberpunk City',
    'Art Deco Interior',
    'Minimalist Zen',
    'Steampunk Workshop',
    'Gothic Revival Library',
    'Bauhaus Living Room',
    'Mid-century Modern',
    "Roaring '20s Speakeasy",
    '1980s Arcade',
    'Viking Mead Hall',
    'Space Age Lounge'
];
const SURPRISE_PROMPTS = [
    'A cozy room inside a giant, hollowed-out pumpkin.',
    'An underwater library with bioluminescent jellyfish for light.',
    'A futuristic apartment on Mars with a view of Olympus Mons.',
    'A wizard\'s study filled with floating books and bubbling potions.',
    'A bedroom made entirely of candy and sweets.',
    'A treehouse village in a mystical, glowing forest.',
    'A detective\'s office in a rainy, noir-style 1940s city.',
    'The interior of a spaceship decorated like a Victorian parlor.'
];

interface PromptSuggestionsProps {
    onSelect: (prompt: string) => void;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ onSelect }) => {
    
    const handleSurpriseMe = () => {
        const randomIndex = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
        onSelect(SURPRISE_PROMPTS[randomIndex]);
    };

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-400 mr-2">Try these styles:</span>
                {PRESET_STYLES.map(style => (
                    <button
                        key={style}
                        onClick={() => onSelect(style)}
                        className="px-3 py-1 bg-zinc-700/50 hover:bg-zinc-700/80 text-gray-200 text-sm rounded-full transition-colors border border-white/10"
                    >
                        {style}
                    </button>
                ))}
                <button
                    onClick={handleSurpriseMe}
                    className="flex items-center gap-2 px-3 py-1 bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 font-semibold text-sm rounded-full transition-colors border border-lime-500/20"
                    aria-label="Generate a random surprise prompt"
                >
                    <DiceIcon className="w-4 h-4" />
                    Surprise Me!
                </button>
            </div>
        </div>
    );
};