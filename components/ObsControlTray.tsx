import React, { useState, useEffect } from 'react';
import type { ObsSceneItem } from '../types';
import { ObsIcon, EyeIcon, EyeOffIcon, TrashIcon } from './icons';

interface ObsControlTrayProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sceneItems: ObsSceneItem[];
  onConnect: (address: string, password?: string) => void;
  onDisconnect: () => void;
  onToggleVisibility: (itemId: number, isVisible: boolean) => void;
  onRemoveItem: (itemId: number, sourceName: string) => void;
}

export const ObsControlTray: React.FC<ObsControlTrayProps> = ({
  isConnected,
  isConnecting,
  error,
  sceneItems,
  onConnect,
  onDisconnect,
  onToggleVisibility,
  onRemoveItem,
}) => {
  const [address, setAddress] = useState('ws://localhost:4455');
  const [password, setPassword] = useState('');
  
  useEffect(() => {
    const savedAddress = localStorage.getItem('obs-address');
    const savedPassword = localStorage.getItem('obs-password');
    if (savedAddress) setAddress(savedAddress);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  const StatusIndicator = () => {
    if (isConnecting) return <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" title="Connecting..."></div>;
    if (isConnected) return <div className="w-3 h-3 bg-green-400 rounded-full" title="Connected"></div>;
    return <div className="w-3 h-3 bg-red-500 rounded-full" title="Disconnected"></div>;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto p-4">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-t-2xl shadow-2xl overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row items-center gap-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <ObsIcon className="w-8 h-8 text-lime-400" />
                        <h2 className="text-xl font-bold">OBS Live Asset Tray</h2>
                        <StatusIndicator />
                    </div>
                    
                    {!isConnected ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-grow">
                             <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="ws://localhost:4455"
                                className="bg-zinc-800/50 border border-white/10 rounded-md px-2 py-1 text-sm w-full sm:w-auto flex-grow"
                                disabled={isConnecting}
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password (optional)"
                                className="bg-zinc-800/50 border border-white/10 rounded-md px-2 py-1 text-sm w-full sm:w-auto"
                                disabled={isConnecting}
                            />
                            <button
                                onClick={() => onConnect(address, password)}
                                disabled={isConnecting}
                                className="bg-lime-500 hover:bg-lime-600 text-black font-bold px-4 py-1 rounded-md text-sm transition-colors w-full sm:w-auto"
                            >
                                {isConnecting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    ) : (
                         <div className="flex-grow flex justify-end">
                            <button
                                onClick={onDisconnect}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-1 rounded-md text-sm transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
                {error && <div className="text-center text-red-400 bg-red-900/30 p-2 text-sm">{error}</div>}

                <div className="h-32 overflow-y-auto p-4">
                    {isConnected && sceneItems.length > 0 ? (
                        <ul className="space-y-2">
                            {sceneItems.map(item => (
                                <li key={item.itemId} className="flex items-center justify-between bg-zinc-800/40 p-2 rounded-md">
                                    <span className="text-sm truncate" title={item.sourceName}>{item.sourceName}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onToggleVisibility(item.itemId, item.isVisible)} title="Toggle Visibility">
                                            {item.isVisible ? <EyeIcon className="w-5 h-5 text-gray-300 hover:text-white" /> : <EyeOffIcon className="w-5 h-5 text-gray-500 hover:text-gray-300" />}
                                        </button>
                                        <button onClick={() => onRemoveItem(item.itemId, item.sourceName)} title="Remove from Scene">
                                            <TrashIcon className="w-5 h-5 text-gray-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="flex items-center justify-center h-full text-gray-500">
                           <p>{isConnected ? "Add assets to OBS to see them here." : "Connect to OBS to manage assets."}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
