import React from 'react';
import { AppLogoIcon } from './icons';

interface HeaderProps {
  mode: 'environment' | 'object' | 'generator';
  onModeChange: (mode: 'environment' | 'object' | 'generator') => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange }) => {
  const buttonBaseClasses = "px-6 py-3 text-sm font-semibold transition-all duration-200 rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
  const activeClasses = "bg-zinc-900/30 backdrop-blur-xl border-t border-l border-r border-white/10 text-lime-400";
  const inactiveClasses = "text-gray-400 hover:bg-zinc-800/50 hover:text-gray-200";

  return (
    <header className="mb-4">
      <div className="flex items-center gap-4">
        <div className="bg-zinc-800/50 backdrop-blur-lg p-3 rounded-2xl border border-white/10 shadow-md">
          <AppLogoIcon className="w-8 h-8 text-lime-400"/>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100">
            Creative Image Studio
          </h1>
          <p className="text-md text-gray-400">
            Transform environments, extract objects, or generate them from scratch.
          </p>
        </div>
      </div>
      <div className="mt-6 border-b border-white/10">
        <nav className="-mb-px flex justify-center space-x-2" aria-label="Tabs">
          <button 
            onClick={() => onModeChange('environment')} 
            className={`${buttonBaseClasses} ${mode === 'environment' ? activeClasses : inactiveClasses}`}
            aria-current={mode === 'environment' ? 'page' : undefined}
          >
            Environment Changer
          </button>
          <button 
            onClick={() => onModeChange('object')} 
            className={`${buttonBaseClasses} ${mode === 'object' ? activeClasses : inactiveClasses}`}
            aria-current={mode === 'object' ? 'page' : undefined}
          >
            Object Extractor
          </button>
          <button 
            onClick={() => onModeChange('generator')} 
            className={`${buttonBaseClasses} ${mode === 'generator' ? activeClasses : inactiveClasses}`}
            aria-current={mode === 'generator' ? 'page' : undefined}
          >
            Object Generator
          </button>
        </nav>
      </div>
    </header>
  );
};
