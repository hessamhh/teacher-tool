import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageFile } from '../types';
import { BrushIcon, EraserIcon } from './icons';

interface MaskingViewProps {
  image: ImageFile;
  onConfirm: (mask: ImageFile) => void;
  onCancel: () => void;
}

export const MaskingView: React.FC<MaskingViewProps> = ({ image, onConfirm, onCancel }) => {
  const [brushSize, setBrushSize] = useState(40);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
    };
    img.src = image.base64;
  }, [image.base64]);

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const rect = container.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDrawing.current = true;
    lastPoint.current = getMousePos(e);
  }, []);

  const draw = (currentPoint: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !lastPoint.current) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
      ctx.stroke();
      
      lastPoint.current = currentPoint;
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const currentPoint = getMousePos(e);
    if (currentPoint) {
      draw(currentPoint);
    }
  }, [tool, brushSize, draw]);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleConfirm = () => {
    const drawingCanvas = canvasRef.current;
    if (!drawingCanvas) return;
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageSize.width;
    maskCanvas.height = imageSize.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.drawImage(drawingCanvas, 0, 0);

    const maskFile: ImageFile = {
      base64: maskCanvas.toDataURL('image/png'),
      mimeType: 'image/png',
      name: 'mask.png'
    };
    onConfirm(maskFile);
  };
  
  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 left-4 right-4 text-center">
        <h2 className="text-2xl font-bold text-white">Mask Area to Edit</h2>
        <p className="text-gray-300">Paint over the parts of the image you want to change.</p>
      </div>

      <div 
        ref={containerRef} 
        className="relative max-w-[80vw] max-h-[65vh] aspect-auto select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <img src={image.base64} alt="Masking preview" className="max-w-full max-h-full object-contain pointer-events-none rounded-lg shadow-2xl" />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full cursor-crosshair opacity-70" />
      </div>
      
      <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-6 bg-zinc-900/50 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-2">
                <button onClick={() => setTool('brush')} className={`p-2 rounded-md transition-colors ${tool === 'brush' ? 'bg-lime-500 text-black' : 'bg-zinc-700/50 hover:bg-zinc-700/80 text-gray-200'}`} aria-label="Brush tool"><BrushIcon className="w-6 h-6" /></button>
                <button onClick={() => setTool('eraser')} className={`p-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-lime-500 text-black' : 'bg-zinc-700/50 hover:bg-zinc-700/80 text-gray-200'}`} aria-label="Eraser tool"><EraserIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex items-center gap-3">
                <label htmlFor="brush-size" className="text-gray-200 text-sm">Size:</label>
                <input
                    id="brush-size"
                    type="range"
                    min="5"
                    max="150"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                    className="w-32 accent-lime-400"
                />
            </div>
             <button onClick={handleClear} className="px-4 py-2 text-sm bg-zinc-700/50 hover:bg-zinc-700/80 text-white font-semibold rounded-lg transition-colors">
                Clear
            </button>
        </div>
        <div className="flex gap-4">
            <button onClick={onCancel} className="px-8 py-2.5 bg-zinc-700/50 hover:bg-zinc-700/80 border border-white/10 text-white font-bold rounded-lg transition-colors">
            Cancel
            </button>
            <button 
                onClick={handleConfirm} 
                className="px-8 py-2.5 bg-lime-500 hover:bg-lime-600 text-black font-bold rounded-lg transition-colors"
            >
            Confirm Mask
            </button>
        </div>
      </div>
    </div>
  );
};