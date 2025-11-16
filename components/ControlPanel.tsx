
import React, { useRef, useState } from 'react';
import type { ImageFile } from '../types';
import { SparklesIcon, UploadIcon, CameraIcon, VideoIcon, BrushIcon, PhotoIcon, LayersIcon } from './icons';
import { PromptSuggestions } from './PromptSuggestions';

interface ControlPanelProps {
  mode: 'environment' | 'object' | 'generator';
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  onImageSelect: (image: ImageFile | null) => void;
  onScreenCapture: () => void;
  onWebcamCapture: () => void;
  originalImage: ImageFile | null;
  editedImage: ImageFile | null;
  displayedObjectImage: ImageFile | null;
  onStartComposition: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  maskImage: ImageFile | null;
  onClearMask: () => void;
  styleImage: ImageFile | null;
  onStyleImageSelect: (image: ImageFile | null) => void;
  promptHistory: string[];
  objectSuggestions: string[];
  isGeneratingObjectSuggestions: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  onGenerate, 
  isLoading, 
  onImageSelect,
  onScreenCapture,
  onWebcamCapture,
  originalImage,
  editedImage,
  displayedObjectImage,
  onStartComposition,
  prompt,
  setPrompt,
  maskImage,
  onClearMask,
  styleImage,
  onStyleImageSelect,
  promptHistory,
  objectSuggestions,
  isGeneratingObjectSuggestions
}) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = {
          base64: reader.result as string,
          mimeType: file.type,
          name: file.name,
        };
        onImageSelect(newImage);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for the style reference.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = {
          base64: reader.result as string,
          mimeType: file.type,
          name: file.name,
        };
        onStyleImageSelect(newImage);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = () => {
    if (mode === 'environment' && !originalImage) {
      setError('Please provide an image first.');
      return;
    }
     if (mode === 'environment' && !prompt.trim() && !styleImage) {
      setError('Please describe the theme you want or provide a style image.');
      return;
    }
     if (mode === 'object' && !displayedObjectImage) {
      setError('An object must be extracted before it can be reimagined.');
      return;
    }
    if (mode === 'object' && !prompt.trim()) {
      setError('Please describe how you want to reimagine the object.');
      return;
    }
     if (mode === 'generator' && !prompt.trim()) {
        setError('Please describe the object you want to generate.');
        return;
    }
    setError(null);
    onGenerate(prompt);
  };
  
  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (mode === 'generator') {
      return displayedObjectImage ? 'Reimagine Object' : 'Generate Object';
    }
    if (mode === 'object') {
      return displayedObjectImage ? 'Reimagine Object' : 'Extract Object';
    }
    if (maskImage) return 'Apply Selective Edit';
    return 'Change Environment';
  };
  
  const getPlaceholderText = () => {
    if (mode === 'generator') {
      return displayedObjectImage
        ? "Describe a new style, e.g., 'made of wood', 'steampunk design'"
        : "A golden chalice studded with emeralds...";
    }
    if (mode === 'object') {
      return displayedObjectImage 
        ? "Describe a new style, e.g., 'made of gold', 'carved from ice'"
        : "(Optional) Describe the object for a more accurate extraction.";
    }
    if (maskImage) {
      return "Describe changes for the selected area...";
    }
    return "Describe a theme, or upload a style image...";
  }

  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (mode === 'environment') {
      return !originalImage || (!prompt.trim() && !styleImage);
    }
    // In object mode, the button is only for reimagining.
    if (mode === 'object') {
      return !displayedObjectImage || !prompt.trim();
    }
    if (mode === 'generator') {
      return !prompt.trim();
    }
    return false;
  };

  const canPlaceObject = (mode === 'object' || mode === 'generator') && displayedObjectImage && editedImage;

  return (
    <div className="bg-zinc-900/30 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/10">
      {mode === 'environment' && (
        <>
          <PromptSuggestions onSelect={setPrompt} />
          {promptHistory && promptHistory.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-400 mr-2">Recent:</span>
                      {promptHistory.map((p, i) => (
                          <button
                              key={`${i}-${p}`}
                              onClick={() => setPrompt(p)}
                              className="px-3 py-1 bg-zinc-700/50 hover:bg-zinc-700/80 text-gray-200 text-sm rounded-full transition-colors border border-white/10"
                          >
                              {p}
                          </button>
                      ))}
                  </div>
              </div>
          )}
        </>
      )}

      {(mode === 'object' || mode === 'generator') && displayedObjectImage && (
          <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 min-h-[2.25rem]">
                  <span className="text-sm font-medium text-gray-400 mr-2">Suggestions:</span>
                  {isGeneratingObjectSuggestions ? (
                      <span className="text-sm text-gray-400 italic">Generating ideas...</span>
                  ) : objectSuggestions.length > 0 ? (
                      objectSuggestions.map(suggestion => (
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-4">
        {/* Left side: Prompt */}
        <div className={`flex flex-col gap-3 ${mode === 'generator' ? 'md:col-span-2' : ''}`}>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={getPlaceholderText()}
            className="w-full flex-grow bg-zinc-800/50 border border-white/10 rounded-xl p-3 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-lime-400 focus:border-lime-400 transition-all duration-200 resize-none min-h-[120px] md:min-h-[220px]"
            rows={5}
          />
        </div>
        
        {/* Right side: Image Input */}
        {mode !== 'generator' && (
          <div className="flex flex-col gap-3">
              <div 
                className="w-full h-full min-h-[100px] border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center text-gray-400 hover:border-gray-500 hover:bg-zinc-700/30 transition-all duration-300 cursor-pointer p-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <div className="text-center">
                  <UploadIcon className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold">Drop image here or <span className="text-lime-400">click to browse</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onScreenCapture}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-700/50 hover:bg-zinc-700/80 border border-white/10 text-gray-200 font-bold py-2.5 px-4 rounded-lg transition-all"
                >
                  <CameraIcon className="w-5 h-5" />
                  Screen
                </button>
                <button 
                  onClick={onWebcamCapture}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-700/50 hover:bg-zinc-700/80 border border-white/10 text-gray-200 font-bold py-2.5 px-4 rounded-lg transition-all"
                >
                  <VideoIcon className="w-5 h-5" />
                  Webcam
                </button>
              </div>
            
             {/* Style Image Uploader */}
             {mode === 'environment' && (
              <div className="mt-2">
                {styleImage ? (
                    <div className="relative group">
                        <div className="absolute -top-2 left-2 bg-zinc-800/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs text-gray-300 border border-white/10 z-10">Style Image</div>
                        <img src={styleImage.base64} alt="Style preview" className="w-full h-28 object-cover rounded-xl border-2 border-lime-500/60" />
                        <button 
                            onClick={() => onStyleImageSelect(null)} 
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 backdrop-blur-sm rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Remove style image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <div 
                        className="w-full h-full min-h-[60px] border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center text-gray-400 hover:border-gray-500 hover:bg-zinc-700/30 transition-all duration-300 cursor-pointer p-4"
                        onClick={() => styleFileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={styleFileInputRef}
                            onChange={handleStyleFileChange}
                            className="hidden"
                            accept="image/*"
                        />
                        <div className="text-center flex items-center gap-3">
                            <PhotoIcon className="w-6 h-6" />
                            <p className="font-semibold">Upload Style Image <span className="text-sm font-normal block">(Optional)</span></p>
                        </div>
                    </div>
                )}
              </div>
             )}
          </div>
        )}
      </div>

      {maskImage && mode === 'environment' && (
        <div className="mt-4 flex justify-center items-center gap-3 bg-lime-900/40 p-2 rounded-md border border-lime-700/50">
            <BrushIcon className="w-5 h-5 text-lime-300" />
            <p className="text-lime-300 text-sm font-medium">Selective Edit mode is active.</p>
            <button onClick={onClearMask} className="ml-auto text-gray-300 hover:text-gray-100 text-sm font-semibold underline">Clear selection</button>
        </div>
      )}

      {/* Bottom: Error and Generate Button */}
      <div className="mt-6">
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGenerateClick}
            disabled={isButtonDisabled()}
            className="w-full flex items-center justify-center gap-3 bg-lime-500 hover:bg-lime-600 disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-lime-500 text-lg shadow-lg"
          >
            {isLoading ? (
              getButtonText()
            ) : (
              <>
                <SparklesIcon className="w-6 h-6" />
                {getButtonText()}
              </>
            )}
          </button>
          {canPlaceObject && (
            <button
              onClick={onStartComposition}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-fuchsia-500 text-lg shadow-lg"
            >
              <LayersIcon className="w-6 h-6" />
              Place Object in Scene
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
