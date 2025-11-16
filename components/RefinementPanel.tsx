import React, { useState } from 'react';
import { SparklesIcon, AnchorIcon } from './icons';

interface RefinementPanelProps {
  onRefine: (prompt: string) => void;
  isLoading: boolean;
  suggestions: string[];
  isGeneratingSuggestions: boolean;
  fidelity: number;
  onFidelityChange: (value: number) => void;
  onApplyFidelity: () => void;
}

export const RefinementPanel: React.FC<RefinementPanelProps> = ({ 
  onRefine, 
  isLoading, 
  suggestions, 
  isGeneratingSuggestions,
  fidelity,
  onFidelityChange,
  onApplyFidelity,
}) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRefineClick = () => {
    if (!prompt.trim()) {
      setError('Please describe your refinement.');
      return;
    }
    setError(null);
    onRefine(prompt);
    setPrompt('');
  };

  const fidelityLabel = fidelity > 80 ? 'Very High' : fidelity > 60 ? 'High' : fidelity > 40 ? 'Balanced' : fidelity > 20 ? 'Creative' : 'Very Creative';

  return (
    <div className="mt-4 bg-zinc-900/30 backdrop-blur-md p-4 rounded-xl border border-white/10 divide-y divide-white/10">
      {/* Text Refinement */}
      <div className="pb-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleRefineClick()}
            placeholder="Refine your vision... e.g., 'make it nighttime'"
            className="flex-grow bg-zinc-800/50 border border-white/10 rounded-lg p-2.5 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-lime-400 focus:border-lime-400 transition-all duration-200"
            aria-label="Refinement prompt"
          />
          <button
            onClick={handleRefineClick}
            disabled={isLoading || !prompt.trim()}
            className="flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-600 disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-black font-bold py-2.5 px-5 rounded-lg transition-all"
          >
            <SparklesIcon className="w-5 h-5" />
            Refine
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2 text-center sm:text-left">{error}</p>}
      </div>

      {/* Fidelity Slider */}
      <div className="pt-3">
          <label htmlFor="fidelity-slider" className="block text-sm font-medium text-gray-300 mb-1">Fidelity to Original: <span className="font-bold text-lime-400">{fidelityLabel}</span></label>
          <div className="flex items-center gap-3">
              <input
                  id="fidelity-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={fidelity}
                  onChange={(e) => onFidelityChange(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
                  disabled={isLoading}
                  aria-label="Fidelity to Original"
              />
              <button
                onClick={onApplyFidelity}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-zinc-700/60 hover:bg-zinc-700/90 disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-lg transition-all border border-white/10"
              >
                  <AnchorIcon className="w-5 h-5" />
                  Apply
              </button>
          </div>
      </div>
      
       <div className="mt-3 pt-3 flex flex-wrap items-center gap-2 min-h-[2.25rem]">
            <span className="text-sm font-medium text-gray-400 mr-2">Suggestions:</span>
            {isGeneratingSuggestions ? (
                <span className="text-sm text-gray-400 italic">Generating ideas...</span>
            ) : suggestions.length > 0 ? (
                suggestions.map(suggestion => (
                    <button
                        key={suggestion}
                        onClick={() => setPrompt(suggestion)}
                        className="px-3 py-1 bg-zinc-700/50 hover:bg-zinc-700/80 text-gray-200 text-sm rounded-full transition-colors border border-white/10"
                    >
                        {suggestion}
                    </button>
                ))
            ) : (
                 <span className="text-sm text-gray-500">Suggestions will appear here.</span>
            )}
        </div>
    </div>
  );
};