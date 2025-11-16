import React from 'react';
import type { ImageFile } from '../types';
import { Spinner } from './Spinner';
import { DownloadIcon, CropIcon, BrushIcon, UndoIcon, RedoIcon, BackgroundRemovalIcon, RefreshIcon, RemovePersonIcon, SendToIcon } from './icons';

interface ImageDisplayProps {
  label: string;
  image: ImageFile | null;
  loadingMessage?: string;
  placeholder?: React.ReactNode;
  onDownload?: () => void;
  onAddToObs?: () => void;
  onAdjustCrop?: () => void;
  onEditSelection?: () => void;
  onRemoveBackground?: () => void;
  onRegenerate?: () => void;
  onRemovePerson?: () => void;
  onRevert?: () => void;
  aspectRatio?: number;
  maskImage?: ImageFile | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
  label, 
  image, 
  loadingMessage, 
  placeholder, 
  onDownload, 
  onAddToObs,
  onAdjustCrop, 
  onEditSelection, 
  onRemoveBackground,
  onRegenerate,
  onRemovePerson,
  onRevert,
  aspectRatio, 
  maskImage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-center text-gray-300">{label}</h2>
      <div 
        className="relative w-full bg-zinc-900/30 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/10"
        style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : '16 / 9' }}
      >
        {loadingMessage ? (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md z-10 p-4"
            aria-live="assertive"
            role="status"
          >
            <Spinner />
            <p className="mt-4 text-center text-gray-300 font-medium">{loadingMessage}</p>
          </div>
        ) : image ? (
          <>
            <img
              src={image.base64}
              alt={label}
              className="w-full h-full object-cover"
            />
            {maskImage && (
              <div
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.5)', // red-500 with 50% opacity
                  maskImage: `url(${maskImage.base64})`,
                  maskSize: '100% 100%',
                  WebkitMaskImage: `url(${maskImage.base64})`,
                  WebkitMaskSize: '100% 100%',
                }}
              />
            )}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              {onUndo && (
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Undo change"
                    title="Undo"
                  >
                    <UndoIcon className="w-5 h-5" />
                  </button>
              )}
              {onRedo && (
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Redo change"
                    title="Redo"
                  >
                    <RedoIcon className="w-5 h-5" />
                  </button>
              )}
               {onRemovePerson && (
                <button
                  onClick={onRemovePerson}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Remove person from scene"
                  title="Remove Person"
                >
                  <RemovePersonIcon className="w-5 h-5" />
                </button>
              )}
               {onRevert && (
                <button
                  onClick={onRevert}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Revert to original image"
                  title="Revert to Original"
                >
                  <UndoIcon className="w-5 h-5" />
                </button>
              )}
               {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Regenerate image"
                  title="Regenerate"
                >
                  <RefreshIcon className="w-5 h-5" />
                </button>
              )}
              {onEditSelection && (
                <button
                  onClick={onEditSelection}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Edit a selection"
                  title="Edit Selection"
                >
                  <BrushIcon className="w-5 h-5" />
                </button>
              )}
               {onRemoveBackground && (
                <button
                  onClick={onRemoveBackground}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Remove background"
                  title="Remove Background"
                >
                  <BackgroundRemovalIcon className="w-5 h-5" />
                </button>
              )}
              {onAdjustCrop && (
                <button
                  onClick={onAdjustCrop}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Adjust crop"
                  title="Adjust Crop"
                >
                  <CropIcon className="w-5 h-5" />
                </button>
              )}
              {onAddToObs && (
                <button
                  onClick={onAddToObs}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Add to OBS"
                  title="Add to OBS"
                >
                  <SendToIcon className="w-5 h-5" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-lime-500"
                  aria-label="Download image"
                  title="Download"
                >
                  <DownloadIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        ) : (
          placeholder
        )}
      </div>
    </div>
  );
};