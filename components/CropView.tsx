

import React, { useState, useRef, useEffect } from 'react';
import type { ImageFile, BoundingBox } from '../types';

interface CropViewProps {
  image: ImageFile;
  onConfirm: (box: BoundingBox) => void;
  onCancel: () => void;
  onRecapture: () => void;
}

export const CropView: React.FC<CropViewProps> = ({ image, onConfirm, onCancel, onRecapture }) => {
  const [cropBox, setCropBox] = useState<BoundingBox>({ x: 50, y: 50, width: 200, height: 150 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      // Initialize crop box to be a centered portion of the image
      setCropBox({
        x: img.width * 0.1,
        y: img.height * 0.1,
        width: img.width * 0.8,
        height: img.height * 0.8,
      });
    };
    img.src = image.base64;
  }, [image.base64]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    isDragging.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const draggingHandle = isDragging.current; // Capture value to prevent race condition
    if (!draggingHandle || !containerRef.current) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
    const scaleX = imageSize.width / containerWidth;
    const scaleY = imageSize.height / containerHeight;
    
    const scaledDx = dx * scaleX;
    const scaledDy = dy * scaleY;
    
    setCropBox(prev => {
        let { x, y, width, height } = prev;

        if (draggingHandle === 'move') {
            x += scaledDx;
            y += scaledDy;
        } else {
            if (draggingHandle.includes('l')) {
                x += scaledDx;
                width -= scaledDx;
            }
            if (draggingHandle.includes('r')) {
                width += scaledDx;
            }
            if (draggingHandle.includes('t')) {
                y += scaledDy;
                height -= scaledDy;
            }
            if (draggingHandle.includes('b')) {
                height += scaledDy;
            }
        }
        
        // boundary checks
        x = Math.max(0, x);
        y = Math.max(0, y);
        width = Math.min(imageSize.width - x, width);
        height = Math.min(imageSize.height - y, height);

        // prevent inverted box
        if (width < 0) {
            x += width;
            width = Math.abs(width);
        }
        if (height < 0) {
            y += height;
            height = Math.abs(height);
        }

        return { x, y, width, height };
    });

    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = null;
  };

  const getDisplayStyles = () => {
    if (!containerRef.current || !imageSize.width || !imageSize.height) return { left: 0, top: 0, width: 0, height: 0 };
    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
    const scaleX = containerWidth / imageSize.width;
    const scaleY = containerHeight / imageSize.height;

    return {
      left: cropBox.x * scaleX,
      top: cropBox.y * scaleY,
      width: cropBox.width * scaleX,
      height: cropBox.height * scaleY,
    };
  };

  const displayBox = getDisplayStyles();

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">Adjust Crop</h2>
        <p className="text-gray-300">Drag and resize the box to select the perfect area.</p>
      </div>

      <div ref={containerRef} className="relative max-w-[80vw] max-h-[70vh] aspect-auto">
        <img src={image.base64} alt="Crop preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        <div 
            className="absolute border-2 border-dashed border-white/80 cursor-move"
            style={displayBox}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          <div onMouseDown={e => handleMouseDown(e, 'tl')} className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white rounded-full cursor-nwse-resize shadow-lg" />
          <div onMouseDown={e => handleMouseDown(e, 'tr')} className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white rounded-full cursor-nesw-resize shadow-lg" />
          <div onMouseDown={e => handleMouseDown(e, 'bl')} className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-full cursor-nesw-resize shadow-lg" />
          <div onMouseDown={e => handleMouseDown(e, 'br')} className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-full cursor-nwse-resize shadow-lg" />
        </div>
      </div>
      
      <div className="mt-6 flex gap-4">
        <button onClick={onCancel} className="px-6 py-2 bg-zinc-700/50 hover:bg-zinc-700/80 border border-white/10 text-white font-bold rounded-lg transition-colors">
          Cancel
        </button>
        <button onClick={onRecapture} className="px-6 py-2 bg-zinc-600 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors">
          Recapture
        </button>
        <button 
            onClick={() => onConfirm(cropBox)} 
            className="px-6 py-2 bg-lime-500 hover:bg-lime-600 text-black font-bold rounded-lg transition-colors"
        >
          Confirm Crop
        </button>
      </div>
    </div>
  );
};