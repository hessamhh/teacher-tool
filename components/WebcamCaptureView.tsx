import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageFile } from '../types';
import { Spinner } from './Spinner';

interface WebcamCaptureViewProps {
  onConfirm: (image: ImageFile) => void;
  onCancel: () => void;
}

export const WebcamCaptureView: React.FC<WebcamCaptureViewProps> = ({ onConfirm, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setupWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Could not access webcam. Please check permissions and try again.");
      }
    }

    setupWebcam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const mimeType = 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, 0.9);
      
      const snapshotFile: ImageFile = {
        base64,
        mimeType,
        name: 'webcam-capture.jpg'
      };
      onConfirm(snapshotFile);
    }
  }, [onConfirm]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">Capture from Webcam</h2>
        <p className="text-gray-300">Position your camera and take a snapshot.</p>
      </div>

      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        {!isReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Spinner />
            </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 text-center text-red-400 bg-red-900/50 border border-red-700 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <button onClick={onCancel} className="px-6 py-2 bg-zinc-700/50 hover:bg-zinc-700/80 border border-white/10 text-white font-bold rounded-lg transition-colors">
          Cancel
        </button>
        <button 
            onClick={handleSnapshot} 
            disabled={!isReady || !!error}
            className="px-6 py-2 bg-lime-500 hover:bg-lime-600 text-black font-bold rounded-lg transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
        >
          Take Snapshot
        </button>
      </div>
    </div>
  );
};
