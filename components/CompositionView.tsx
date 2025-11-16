import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageFile, ObjectTransform } from '../types';
import { LayersIcon } from './icons';

interface CompositionViewProps {
  environmentImage: ImageFile;
  objectImage: ImageFile;
  onConfirm: (transform: ObjectTransform) => void;
  onCancel: () => void;
}

export const CompositionView: React.FC<CompositionViewProps> = ({
  environmentImage,
  objectImage,
  onConfirm,
  onCancel,
}) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, width: 200, height: 200, rotation: 0 });
  const [objectAspectRatio, setObjectAspectRatio] = useState(1);
  const [envImageSize, setEnvImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0, transform });

  useEffect(() => {
    const objImg = new Image();
    objImg.onload = () => {
      const aspectRatio = objImg.width / objImg.height;
      setObjectAspectRatio(aspectRatio);
      const initialWidth = 250;
      setTransform(prev => ({
        ...prev,
        width: initialWidth,
        height: initialWidth / aspectRatio,
      }));
    };
    objImg.src = objectImage.base64;

    const envImg = new Image();
    envImg.onload = () => {
        setEnvImageSize({ width: envImg.width, height: envImg.height });
    };
    envImg.src = environmentImage.base64;
  }, [objectImage, environmentImage]);

  useEffect(() => {
    // Center object on mount after aspect ratio is known
    if (containerRef.current && objectAspectRatio !== 1) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setTransform(prev => ({
        ...prev,
        x: width / 2 - prev.width / 2,
        y: height / 2 - prev.height / 2,
      }));
    }
  }, [objectAspectRatio]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY, transform };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const handle = isDragging.current;
    
    setTransform(prev => {
      let { x, y, width, height, rotation } = prev;

      if (handle === 'move') {
        x = dragStartPos.current.transform.x + dx;
        y = dragStartPos.current.transform.y + dy;
      } else if (handle === 'resize') {
        const newWidth = Math.max(20, dragStartPos.current.transform.width + dx);
        width = newWidth;
        height = newWidth / objectAspectRatio;
      } else if (handle === 'rotate') {
        if(objectRef.current) {
          const box = objectRef.current.getBoundingClientRect();
          const centerX = box.left + box.width / 2;
          const centerY = box.top + box.height / 2;
          const startAngle = Math.atan2(dragStartPos.current.y - centerY, dragStartPos.current.x - centerX);
          const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
          rotation = (dragStartPos.current.transform.rotation + angleDiff + 360) % 360;
        }
      }
      return { x, y, width, height, rotation };
    });
  }, [objectAspectRatio]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
  }, []);

  const handleConfirm = () => {
    if (!containerRef.current || !envImageSize.width) return;
    
    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
    const scaleX = envImageSize.width / containerWidth;
    const scaleY = envImageSize.height / containerHeight;

    const finalTransform: ObjectTransform = {
      x: transform.x * scaleX,
      y: transform.y * scaleY,
      width: transform.width * scaleX,
      height: transform.height * scaleY,
      rotation: transform.rotation,
    };
    onConfirm(finalTransform);
  };
  
  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 left-4 right-4 text-center">
        <h2 className="text-2xl font-bold text-white">Compose Scene</h2>
        <p className="text-gray-300">Position, resize, and rotate the object, then blend it into the scene.</p>
      </div>

      <div 
        ref={containerRef} 
        className="relative max-w-[80vw] max-h-[65vh] aspect-auto select-none"
      >
        <img src={environmentImage.base64} alt="Environment background" className="max-w-full max-h-full object-contain pointer-events-none rounded-lg shadow-2xl" />
        
        <div
          ref={objectRef}
          className="absolute group"
          style={{
            left: transform.x,
            top: transform.y,
            width: transform.width,
            height: transform.height,
            transform: `rotate(${transform.rotation}deg)`,
            cursor: 'move',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          <img src={objectImage.base64} className="w-full h-full pointer-events-none" alt="Object to place" />
          <div className="absolute inset-0 border-2 border-dashed border-lime-400/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div 
            className="absolute -right-2 -bottom-2 w-5 h-5 bg-lime-400 rounded-full cursor-nwse-resize shadow-lg opacity-0 group-hover:opacity-100"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
            aria-label="Resize object"
            role="slider"
          />
          <div 
            className="absolute left-1/2 -top-6 w-5 h-5 bg-lime-400 rounded-full cursor-alias shadow-lg opacity-0 group-hover:opacity-100 transform -translate-x-1/2"
            onMouseDown={(e) => handleMouseDown(e, 'rotate')}
            aria-label="Rotate object"
            role="slider"
          />
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-4">
        <div className="flex gap-4">
            <button onClick={onCancel} className="px-8 py-2.5 bg-zinc-700/50 hover:bg-zinc-700/80 border border-white/10 text-white font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button 
                onClick={handleConfirm} 
                className="px-8 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <LayersIcon className="w-5 h-5" />
              Blend into Scene
            </button>
        </div>
      </div>
    </div>
  );
};