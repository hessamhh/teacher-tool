
import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { ImageDisplay } from './components/ImageDisplay';
import { CropView } from './components/CropView';
import { RefinementPanel } from './components/RefinementPanel';
import { extendImageTo16x9, ai, inpaintImage, getRefinementSuggestions, regenerateWithFidelity, extractObjectFromImage, reimagineObject, getObjectReimaginationSuggestions, removePeopleFromImage, blendObjectIntoScene, generateObjectFromPrompt } from './services/geminiService';
import { removeBackgroundCloudinary } from './services/cloudinaryService';
import { compressImage } from './utils/imageUtils';
import type { ImageFile, BoundingBox, ObjectTransform, ObsSceneItem } from './types';
import type { Chat } from '@google/genai';
import { MaskingView } from './components/MaskingView';
import { WebcamCaptureView } from './components/WebcamCaptureView';
import { CompositionView } from './components/CompositionView';
import { ObsControlTray } from './components/ObsControlTray';
import OBSWebSocket from 'obs-websocket-js';

type ViewMode = 'environment' | 'object' | 'generator';
type LoadingState = 'editing' | 'extending' | 'refining' | 'making_similar' | 'inpainting' | 'extracting' | 'reimagining' | 'removing_background' | 'removing_person' | 'blending' | 'generating_object';

interface HistoryStep {
  image: ImageFile;
}

const obs = new OBSWebSocket();

function App() {
  const [mode, setMode] = useState<ViewMode>('environment');
  const [envOriginalImage, setEnvOriginalImage] = useState<ImageFile | null>(null);
  const [envCleanedImage, setEnvCleanedImage] = useState<ImageFile | null>(null);
  const [objectOriginalImage, setObjectOriginalImage] = useState<ImageFile | null>(null);
  const [styleImage, setStyleImage] = useState<ImageFile | null>(null);
  const [fullScreenshot, setFullScreenshot] = useState<ImageFile | null>(null);
  const [envOriginalImageAspectRatio, setEnvOriginalImageAspectRatio] = useState<number | undefined>(undefined);
  const [objectOriginalImageAspectRatio, setObjectOriginalImageAspectRatio] = useState<number | undefined>(undefined);
  const [editedImageAspectRatio, setEditedImageAspectRatio] = useState<number | undefined>(undefined);
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCapturingWebcam, setIsCapturingWebcam] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isMasking, setIsMasking] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [maskImage, setMaskImage] = useState<ImageFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [lastEnvPrompt, setLastEnvPrompt] = useState('');
  const [lastObjectGenPrompt, setLastObjectGenPrompt] = useState('');
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [refinementSuggestions, setRefinementSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
  const [objectSuggestions, setObjectSuggestions] = useState<string[]>([]);
  const [isGeneratingObjectSuggestions, setIsGeneratingObjectSuggestions] = useState<boolean>(false);
  const [fidelity, setFidelity] = useState(75);

  const [envHistory, setEnvHistory] = useState<HistoryStep[]>([]);
  const [envHistoryIndex, setEnvHistoryIndex] = useState<number>(-1);
  const [objectHistory, setObjectHistory] = useState<HistoryStep[]>([]);
  const [objectHistoryIndex, setObjectHistoryIndex] = useState<number>(-1);

  // OBS State
  const [isObsConnected, setIsObsConnected] = useState(false);
  const [isObsConnecting, setIsObsConnecting] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);
  const [obsSceneItems, setObsSceneItems] = useState<ObsSceneItem[]>([]);
  const currentSceneName = useRef<string | null>(null);
  const createdSourceNames = useRef<Set<string>>(new Set());

  const originalImage = mode === 'environment' ? envOriginalImage : objectOriginalImage;
  const originalImageAspectRatio = mode === 'environment' ? envOriginalImageAspectRatio : objectOriginalImageAspectRatio;
  const editedImage = envHistory[envHistoryIndex]?.image ?? null;
  const displayedObjectImage = objectHistory[objectHistoryIndex]?.image ?? null;
  const displayedOriginalImage = mode === 'environment' ? (envCleanedImage || envOriginalImage) : objectOriginalImage;
  
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const streamRef = useRef<MediaStream | null>(null);
  
  // OBS Functions
  const fetchObsSceneItems = async () => {
    if (!isObsConnected || !currentSceneName.current) return;
    try {
      const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: currentSceneName.current });
      const filteredItems = (sceneItems as any[]).filter(item => createdSourceNames.current.has(item.sourceName));
      setObsSceneItems(filteredItems.map(item => ({
        itemId: item.sceneItemId,
        sourceName: item.sourceName,
        isVisible: item.sceneItemEnabled,
      })));
    } catch (error) {
      console.error('Failed to fetch OBS scene items:', error);
      setObsError('Could not fetch scene items.');
    }
  };

  const setupObsListeners = () => {
    const onSceneChanged = async () => {
        try {
            const { sceneName } = await obs.call('GetCurrentProgramScene');
            currentSceneName.current = sceneName;
            await fetchObsSceneItems();
        } catch(e) { console.error(e); }
    };
    
    const onConnectionClosed = (data: { code: number; reason: string }) => {
        // Code 1000 is a normal, clean closure. Don't show an error for this.
        if (data.code !== 1000) {
            console.warn('OBS connection lost unexpectedly:', data);
            setObsError(`Connection to OBS lost: ${data.reason || 'Unknown reason'} (Code: ${data.code})`);
        } else {
            console.log('OBS connection closed.');
            setObsError(null);
        }
        setIsObsConnected(false);
        setObsSceneItems([]);
        currentSceneName.current = null;
        createdSourceNames.current.clear();
    };

    obs.on('CurrentProgramSceneChanged', onSceneChanged);
    obs.on('SceneItemListReindexed', fetchObsSceneItems);
    obs.on('SceneItemCreated', fetchObsSceneItems);
    obs.on('SceneItemRemoved', fetchObsSceneItems);
    obs.on('SceneItemEnableStateChanged', fetchObsSceneItems);
    obs.on('ConnectionClosed', onConnectionClosed as any);

    return () => {
        obs.off('CurrentProgramSceneChanged', onSceneChanged);
        obs.off('SceneItemListReindexed', fetchObsSceneItems);
        obs.off('SceneItemCreated', fetchObsSceneItems);
        obs.off('SceneItemRemoved', fetchObsSceneItems);
        obs.off('SceneItemEnableStateChanged', fetchObsSceneItems);
        obs.off('ConnectionClosed', onConnectionClosed as any);
    };
  };

  const handleObsConnect = async (address: string, password?: string) => {
    setIsObsConnecting(true);
    setObsError(null);
    try {
      await obs.connect(address, password);
      setIsObsConnected(true);
      const { sceneName } = await obs.call('GetCurrentProgramScene');
      currentSceneName.current = sceneName;
      await fetchObsSceneItems();
      localStorage.setItem('obs-address', address);
      if(password) localStorage.setItem('obs-password', password);
    } catch (error: any) {
      console.error('OBS Connection Error:', error);
      let message = 'Failed to connect. Is OBS running with obs-websocket installed? Check the server address and port.';
      
      // obs-websocket-js v5 rejects with an object containing the WS close code
      if (error?.code) {
        switch (error.code) {
          case 4009:
            message = 'Authentication failed. Please check your password.';
            break;
          default:
            message = `Connection failed with code ${error.code}. ${error.reason || 'Please check OBS and obs-websocket settings.'}`;
            break;
        }
      } else if (error?.message) {
        // Fallback for other errors like "Authentication required" or network errors
        if (error.message.includes('Authentication required')) {
            message = 'Authentication required. Please provide a password.';
        } else if (error.message.includes('Failed to connect')) {
            // Let the default message handle this.
        } else {
            message = `Connection failed: ${error.message}`;
        }
      }
      
      setObsError(message);
      setIsObsConnected(false);
    } finally {
      setIsObsConnecting(false);
    }
  };

  const handleObsDisconnect = async () => {
    // The onConnectionClosed event listener will handle all state cleanup.
    await obs.disconnect();
  };

  useEffect(() => {
    if (isObsConnected) {
      const cleanup = setupObsListeners();
      return cleanup;
    }
  }, [isObsConnected]);

  const handleAddToObs = async (image: ImageFile | null) => {
    if (!isObsConnected || !image || !currentSceneName.current) return;
    try {
      const img = new Image();
      img.onload = async () => {
        const sourceName = `CreativeStudio-${image.name.split('.')[0]}-${Date.now()}`;
        createdSourceNames.current.add(sourceName);

        await obs.call('CreateInput', {
          sceneName: currentSceneName.current!,
          inputName: sourceName,
          inputKind: 'browser_source',
          inputSettings: {
            url: image.base64,
            width: img.width,
            height: img.height,
            css: 'body { margin: 0; }',
          },
          sceneItemEnabled: true,
        });
        await fetchObsSceneItems();
      };
      img.src = image.base64;
    } catch (error) {
      console.error('Failed to add to OBS:', error);
      setObsError('Could not add image to OBS.');
    }
  };

  const handleToggleObsItemVisibility = async (itemId: number, isVisible: boolean) => {
    if (!isObsConnected || !currentSceneName.current) return;
    try {
      await obs.call('SetSceneItemEnabled', {
        sceneName: currentSceneName.current,
        sceneItemId: itemId,
        sceneItemEnabled: !isVisible,
      });
      await fetchObsSceneItems();
    } catch (error) {
      console.error('Failed to toggle OBS item visibility:', error);
      setObsError('Could not toggle item visibility.');
    }
  };

  const handleRemoveObsItem = async (itemId: number, sourceName: string) => {
    if (!isObsConnected || !currentSceneName.current) return;
    try {
      await obs.call('RemoveSceneItem', { sceneName: currentSceneName.current, sceneItemId: itemId });
      // We don't remove the input itself, just the scene item. Let's keep it simple for now.
      // And remove from our tracking set
      createdSourceNames.current.delete(sourceName);
      await fetchObsSceneItems();
    } catch (error) {
      console.error('Failed to remove OBS item:', error);
      setObsError('Could not remove item.');
    }
  };
  
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('promptHistory');
      if (storedHistory) {
        setPromptHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse prompt history from localStorage", e);
      localStorage.removeItem('promptHistory');
    }
  }, []);
  
  useEffect(() => {
    if (editedImage) {
      getImageAspectRatio(editedImage).then(setEditedImageAspectRatio);
    } else {
      setEditedImageAspectRatio(undefined);
    }
  }, [editedImage]);

  useEffect(() => {
    if ((mode === 'object' || mode === 'generator') && displayedObjectImage) {
        const objectName = (mode === 'object' ? displayedObjectImage.name.split('.')[0].replace(/[_-]/g, ' ').trim() : lastObjectGenPrompt);
        if (objectName) {
            setIsGeneratingObjectSuggestions(true);
            setObjectSuggestions([]); // Clear old suggestions
            getObjectReimaginationSuggestions(objectName, lastEnvPrompt)
                .then(result => {
                    if (result.data) {
                        setObjectSuggestions(result.data);
                    } else if (result.error) {
                        console.error('Failed to get object suggestions:', result.error);
                        setObjectSuggestions([]);
                    }
                })
                .finally(() => {
                    setIsGeneratingObjectSuggestions(false);
                });
        }
    } else {
        setObjectSuggestions([]);
    }
  }, [displayedObjectImage, mode, lastEnvPrompt, lastObjectGenPrompt]);

  const addEnvHistoryStep = (newImage: ImageFile) => {
    const newHistory = envHistory.slice(0, envHistoryIndex + 1);
    newHistory.push({ image: newImage });
    setEnvHistory(newHistory);
    setEnvHistoryIndex(newHistory.length - 1);
  };
  
  const addObjectHistoryStep = (newImage: ImageFile) => {
    const newHistory = objectHistory.slice(0, objectHistoryIndex + 1);
    newHistory.push({ image: newImage });
    setObjectHistory(newHistory);
    setObjectHistoryIndex(newHistory.length - 1);
  };

  const getImageAspectRatio = (imageFile: ImageFile): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width / img.height);
      };
      img.onerror = () => {
        resolve(16 / 9); // Default on error
      };
      img.src = imageFile.base64;
    });
  };

  const handleImageSelect = async (image: ImageFile | null) => {
    setError(null);
    setFullScreenshot(null);
  
    if (!image) {
      // Clear image for the current mode
      if (mode === 'environment') {
        setEnvOriginalImage(null);
        setEnvOriginalImageAspectRatio(undefined);
        setEnvHistory([]); setEnvHistoryIndex(-1); setChatSession(null); setMaskImage(null); setRefinementSuggestions([]); setEnvCleanedImage(null);
      } else {
        setObjectOriginalImage(null);
        setObjectOriginalImageAspectRatio(undefined);
        setObjectHistory([]); setObjectHistoryIndex(-1);
      }
      if (streamRef.current) handleStopCapture();
      return;
    }

    let processedImage = image;
    try {
      processedImage = await compressImage(image);
    } catch (e) {
      const errorMessage = e instanceof Error ? `Image compression failed: ${e.message}` : 'Image compression failed.';
      setError(errorMessage + " Using original image.");
    }

    const ar = await getImageAspectRatio(processedImage);

    if (mode === 'environment') {
      // Set the original image (compressed or not)
      setEnvOriginalImage(processedImage);
      setEnvOriginalImageAspectRatio(ar);

      // Reset all relevant state for a new image
      setEnvHistory([]);
      setEnvHistoryIndex(-1);
      setChatSession(null);
      setMaskImage(null);
      setRefinementSuggestions([]);
      setEnvCleanedImage(null);

      // Eagerly run person removal on the new image
      setLoadingState('removing_person');
      const removalResult = await removePeopleFromImage(processedImage);
      setLoadingState(null); // Clear loading state after attempt

      if (removalResult.error) {
        setError(`Automatic person removal failed: ${removalResult.error}. You can try the removal again manually.`);
      } else if (removalResult.data) {
        setEnvCleanedImage(removalResult.data);
      }

    } else { // mode === 'object'
      setObjectOriginalImage(processedImage);
      setObjectOriginalImageAspectRatio(ar);
      handleExtractObject(processedImage, '');
    }
  
    if (streamRef.current) {
      handleStopCapture();
    }
  };

  const handleStyleImageSelect = async (image: ImageFile | null) => {
    setError(null);
    if (image) {
      try {
        const compressed = await compressImage(image);
        setStyleImage(compressed);
      } catch (e)
      {
        if (e instanceof Error) setError(`Style image compression failed: ${e.message}`);
        else setError('Style image compression failed.');
        setStyleImage(image); // fallback to original
      }
    } else {
      setStyleImage(null);
    }
  };

  const cropImageByCoords = (imageFile: ImageFile, box: BoundingBox): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = box.width;
        canvas.height = box.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
          const croppedBase64 = canvas.toDataURL(imageFile.mimeType);
          resolve({
            ...imageFile,
            base64: croppedBase64,
          });
        } else {
            reject(new Error("Could not get canvas context for cropping."));
        }
      };
      img.onerror = () => {
        reject(new Error("Failed to load image for cropping."));
      };
      img.src = imageFile.base64;
    });
  };

  const captureFrame = (): ImageFile | null => {
    if (!streamRef.current) {
        setError("No active screen capture session.");
        return null;
    }
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError("Video stream not ready. Please try again.");
        return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        setError("Could not get canvas context for capture.");
        return null;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const mimeType = 'image/jpeg';
    const base64 = canvas.toDataURL(mimeType);

    return { base64, mimeType, name: 'screenshot.jpg' };
  };

  const handleRecapture = () => {
    const frame = captureFrame();
    if (frame) {
      setFullScreenshot(frame);
    }
  };

  const handleStartCapture = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 30 } }, audio: false,
      });
      stream.getTracks()[0].onended = handleStopCapture;
      streamRef.current = stream;
      
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      // Use a small delay to ensure the video element has rendered the stream
      setTimeout(() => {
        const frame = captureFrame();
        if (frame) {
            setFullScreenshot(frame);
            setIsCapturing(true);
            setIsCropping(true);
        } else {
          // If frame capture failed, stop the stream
          handleStopCapture();
        }
      }, 100);

    } catch (err) {
        console.error("Error starting screen capture:", err);
        setError("Could not start screen capture. Please grant permission.");
        setIsCapturing(false);
    }
  };
  
  const handleStopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setFullScreenshot(null);
    setIsCropping(false);
  };

  const handleStartWebcamCapture = () => {
    setError(null);
    setIsCapturingWebcam(true);
  }

  const handleConfirmWebcamCapture = async (image: ImageFile) => {
    setIsCapturingWebcam(false);
    await handleImageSelect(image);
  }

  const handleCancelWebcamCapture = () => {
    setIsCapturingWebcam(false);
  }
  
  const startEnvironmentGeneration = async (imageToTransform: ImageFile, themePrompt: string) => {
    setLoadingState('editing');
    const themeForSuggestions = themePrompt.trim() ? themePrompt.trim() : (styleImage ? "the provided visual style" : "");

    const systemInstruction = `You are a world-class interior designer with a touch of magic. Your goal is to transform the environment of a room.

CRITICAL DIRECTIVE:
**PRESERVE FURNITURE & LAYOUT:** The user's room, including its specific furniture, objects, and overall layout, is SACROSANCT. You MUST NOT add, remove, or significantly reposition major items from the original image unless explicitly told to. Your task is to re-skin and re-imagine what's already there.

**HANDLE PEOPLE (IF PRESENT):** If the input image contains people or animals, you must REMOVE them and realistically reconstruct the background behind them as part of the transformation.

Analyze the theme provided (from text, a style image, or both) and apply it to the existing scene:
- If the theme is INDOOR (e.g., 'cozy library', 'futuristic lab'), you MUST preserve the original room's structure (walls, windows, doors). Re-decorate the surfaces, change the materials of the furniture, and adjust the lighting to match the theme.
- If the theme is OUTDOOR or OPEN (e.g., 'enchanted forest', 'beach paradise'), you MUST realistically REMOVE the walls and ceiling, replacing them with the described environment. The furniture and objects from the original room MUST remain exactly where they are, now integrated into the new open scene. Imagine the walls just disappeared.

Key Rules to Follow AT ALL TIMES:
1.  **PRESERVE, DON'T REPLACE:** The core furniture and objects from the original image are the main characters. Keep them.
2.  **INTEGRATE SEAMLESSLY:** Ensure all objects, original and new, have lighting and shadows that are consistent with the new environment.
3.  **MAINTAIN PERSPECTIVE:** The original camera angle and perspective must be perfectly maintained.
4.  **QUALITY:** The final image must be photorealistic and high-quality.
5.  **REFINEMENT:** On follow-up prompts, apply the user's refinement to the PREVIOUSLY generated image, not the original.`;
  
    try {
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash-image',
        config: {
          systemInstruction,
          responseModalities: ['IMAGE'],
        },
      });
      setChatSession(newChat);
  
      const messageParts: (string | { inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
        { inlineData: { data: imageToTransform.base64.split(',')[1], mimeType: imageToTransform.mimeType } },
      ];
  
      let themeInstruction = "";
      if (styleImage) {
        messageParts.push({ inlineData: { data: styleImage.base64.split(',')[1], mimeType: styleImage.mimeType } });
        themeInstruction = "Use the second image as a style reference";
        if (themePrompt.trim()) {
          themeInstruction += ` and also incorporate the theme: "${themePrompt}".`;
        } else {
          themeInstruction += ".";
        }
      } else {
        themeInstruction = `Transform the room based on this theme: "${themePrompt}".`;
      }
      
      messageParts.push({ text: themeInstruction });
  
      const response = await newChat.sendMessage({ message: messageParts});
      
      const candidate = response?.candidates?.[0];
      if (!candidate) {
          const promptFeedback = response?.promptFeedback;
          if (promptFeedback?.blockReason) {
              throw new Error(`Request was blocked: ${promptFeedback.blockReason}.`);
          }
          throw new Error('No candidates were returned by the model. The request may have been blocked or filtered.');
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          if (candidate.finishReason === 'SAFETY') {
              throw new Error(`Image generation failed due to safety policies. Please try a different image or prompt.`);
          }
          throw new Error(`Image generation stopped unexpectedly with reason: ${candidate.finishReason}.`);
      }
      const parts = candidate.content?.parts;
      if (!parts || parts.length === 0) {
          throw new Error('Model did not return any content parts.');
      }
  
      for (const part of parts) {
        if (part.inlineData) {
          const transformedImage = {
            base64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType,
            name: `edited-${originalImage?.name || 'image.jpg'}`,
          };
  
          const targetAspectRatio = 16 / 9;
          const isOriginalCloseTo16x9 = originalImageAspectRatio ? Math.abs(originalImageAspectRatio - targetAspectRatio) < 0.05 : false;
          
          addEnvHistoryStep(transformedImage);
          
          if (!isOriginalCloseTo16x9) {
              const generatedAspectRatio = await getImageAspectRatio(transformedImage);
              const aspectRatioDifference = Math.abs(generatedAspectRatio - targetAspectRatio);
              if (aspectRatioDifference > 0.05) { 
                setLoadingState('extending');
                const extensionResult = await extendImageTo16x9(transformedImage);
                if (extensionResult.error) {
                  setError(`Image generated, but failed to extend to 16:9: ${extensionResult.error}`);
                } else if (extensionResult.data) {
                  addEnvHistoryStep(extensionResult.data);
                }
              }
          }
      
          if (themeForSuggestions) {
              setIsGeneratingSuggestions(true);
              getRefinementSuggestions(themeForSuggestions).then(result => {
                  if (result.error) {
                    console.error('Failed to get refinement suggestions:', result.error);
                  } else if (result.data) {
                    setRefinementSuggestions(result.data);
                  }
              }).finally(() => {
                  setIsGeneratingSuggestions(false);
              });
          }
          setLoadingState(null);
          return;
        }
      }
      throw new Error('No image was generated by the model.');
    } catch (e) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred during generation.');
      setLoadingState(null);
    }
  };

  const handleGenerate = async (prompt: string) => {
    // Case 1: Selective editing (inpainting) on the transformed image
    if (maskImage && editedImage) {
      setLoadingState('inpainting');
      setError(null);
      const result = await inpaintImage(editedImage, maskImage, prompt);
      setLoadingState(null);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        addEnvHistoryStep(result.data);
        setMaskImage(null); // Clear mask after successful inpainting
      }
      return;
    }

    // Case 2: Initial environment generation from the original image (or its cleaned version)
    const imageToTransform = envCleanedImage || originalImage; // Use cleaned if available, otherwise fallback to original

    if (imageToTransform) {
      if(prompt.trim()){
        setLastEnvPrompt(prompt.trim());
        const newHistory = [prompt.trim(), ...promptHistory.filter(p => p !== prompt.trim())].slice(0, 10);
        setPromptHistory(newHistory);
        localStorage.setItem('promptHistory', JSON.stringify(newHistory));
      }

      // Reset state for new generation
      setEnvHistory([]);
      setEnvHistoryIndex(-1);
      setEditedImageAspectRatio(undefined);
      setChatSession(null);
      setError(null);
      setMaskImage(null);
      setRefinementSuggestions([]);
      setIsGeneratingSuggestions(false);
      
      // The person removal logic is no longer here.
      // We proceed directly with the generation using the prepared image.
      await startEnvironmentGeneration(imageToTransform, prompt);
    }
  };


  const handleRefinement = async (refinementPrompt: string) => {
    if (!chatSession) {
      setError("No active session. Please start a new generation.");
      return;
    }
    setLoadingState('refining');
    setError(null);

    try {
      const response = await chatSession.sendMessage({ message: refinementPrompt });

      const candidate = response?.candidates?.[0];
      if (!candidate) {
          const promptFeedback = response?.promptFeedback;
          if (promptFeedback?.blockReason) {
              throw new Error(`Request was blocked: ${promptFeedback.blockReason}.`);
          }
          throw new Error('No candidates were returned by the model. The request may have been blocked or filtered.');
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          if (candidate.finishReason === 'SAFETY') {
              throw new Error(`Image generation failed due to safety policies. Please try a different image or prompt.`);
          }
          throw new Error(`Image generation stopped unexpectedly with reason: ${candidate.finishReason}.`);
      }
      const parts = candidate.content?.parts;
      if (!parts || parts.length === 0) {
          throw new Error('Model did not return any content parts.');
      }

      for (const part of parts) {
        if (part.inlineData) {
          const refinedImage = {
            base64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType,
            name: `refined-${originalImage?.name || 'image'}`,
          };
          addEnvHistoryStep(refinedImage);
          
          // Get new suggestions based on the refinement.
          setIsGeneratingSuggestions(true);
          getRefinementSuggestions(refinementPrompt).then(result => {
              if (result.error) {
                console.error('Failed to get new refinement suggestions:', result.error);
              } else if (result.data) {
                setRefinementSuggestions(result.data);
              }
          }).finally(() => {
              setIsGeneratingSuggestions(false);
          });
          
          return;
        }
      }
      throw new Error('No image was generated for the refinement.');
    } catch(e) {
        if (e instanceof Error) setError(e.message);
        else setError('An unknown error occurred during refinement.');
    } finally {
        setLoadingState(null);
    }
  };

  const handleRegenerate = async () => {
    if ((envCleanedImage || originalImage) && lastEnvPrompt) {
        // Reset history for the new generation attempt
        setEnvHistory([]);
        setEnvHistoryIndex(-1);
        setError(null);
        setMaskImage(null);
        
        // Use the existing cleaned image if available, otherwise the original.
        const imageToTransform = envCleanedImage || originalImage!;
        await startEnvironmentGeneration(imageToTransform, lastEnvPrompt);
    } else {
      setError("Could not find the required data (image or last prompt) to regenerate.");
    }
  };

  const handleRemovePerson = async () => {
    if (!envOriginalImage) return;
    setLoadingState('removing_person');
    setError(null);
    const result = await removePeopleFromImage(envOriginalImage);
    setLoadingState(null);
    if (result.error) {
        setError(result.error);
    } else if (result.data) {
        setEnvCleanedImage(result.data);
    }
  };
  
  const handleRevertOriginal = () => {
      setEnvCleanedImage(null);
  };

  const handleExtractObject = async (image: ImageFile, prompt: string) => {
    setLoadingState('extracting');
    setError(null);
    setObjectHistory([]);
    setObjectHistoryIndex(-1);

    try {
        const result = await extractObjectFromImage(image, prompt);
        if (result.error) {
            setError(result.error);
        } else if (result.data) {
            setObjectHistory([{ image: result.data }]);
            setObjectHistoryIndex(0);
            setPrompt(''); // Clear prompt after extraction
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred during object extraction.';
        setError(message);
    } finally {
        setLoadingState(null);
    }
  };
  
  const handleReimagineObject = async (prompt: string) => {
    if (!displayedObjectImage) return;

    setLoadingState('reimagining');
    setError(null);

    try {
        const result = await reimagineObject(displayedObjectImage, prompt);
        if (result.error) {
            setError(result.error);
        } else if (result.data) {
            addObjectHistoryStep(result.data);
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred during object reimagining.';
        setError(message);
    } finally {
        setLoadingState(null);
    }
  };

  const handleGenerateObject = async (prompt: string) => {
    setLoadingState('generating_object');
    setError(null);
    setObjectHistory([]);
    setObjectHistoryIndex(-1);
    setLastObjectGenPrompt(prompt);

    try {
        const result = await generateObjectFromPrompt(prompt);
        if (result.error) {
            setError(result.error);
        } else if (result.data) {
            addObjectHistoryStep(result.data);
            setPrompt(''); // Clear prompt after generation
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred during object generation.';
        setError(message);
    } finally {
        setLoadingState(null);
    }
  };

  const handlePrimaryAction = (currentPrompt: string) => {
    if (mode === 'environment') {
      handleGenerate(currentPrompt);
    } else if (mode === 'object') {
      if (displayedObjectImage) {
        handleReimagineObject(currentPrompt);
      } else if (originalImage) {
        // Fallback for manual trigger if needed, though primary flow is automatic
        handleExtractObject(originalImage, currentPrompt);
      } else {
        setError("Please provide an image first to extract an object from.");
      }
    } else if (mode === 'generator') {
      if (displayedObjectImage) {
        handleReimagineObject(currentPrompt);
      } else {
        handleGenerateObject(currentPrompt);
      }
    }
  };
  
  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage.base64;
    const fileExtension = editedImage.mimeType.split('/')[1] || 'png';
    const originalFileName = originalImage?.name.split('.')[0] || 'image';
    link.download = `${originalFileName}-edited.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadExtractedObject = () => {
    if (!displayedObjectImage) return;
    const link = document.createElement('a');
    link.href = displayedObjectImage.base64;
    link.download = displayedObjectImage.name; // Use the descriptive name from the image object
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadOriginal = () => {
    if (!originalImage) return;
    const link = document.createElement('a');
    link.href = originalImage.base64;
    const fileExtension = originalImage.mimeType.split('/')[1] || 'png';
    const originalFileName = originalImage.name.split('.')[0] || 'image';
    link.download = `${originalFileName}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmCrop = async (box: BoundingBox) => {
    if (!fullScreenshot) return;

    setIsCropping(false);
    setError(null);
    
    try {
        const croppedImage = await cropImageByCoords(fullScreenshot, box);
        await handleImageSelect(croppedImage);
    } catch(e) {
        if (e instanceof Error) setError(e.message);
        else setError('Failed to process the cropped image.');
    } finally {
        handleStopCapture();
    }
  };

  const handleConfirmMask = (mask: ImageFile) => {
    setMaskImage(mask);
    setIsMasking(false);
  };

  const handleApplyFidelity = async () => {
    if (!originalImage || !editedImage) {
        setError("Original and transformed images must be present to perform this action.");
        return;
    }
    setLoadingState('making_similar');
    setError(null);
    
    const result = await regenerateWithFidelity(originalImage, editedImage, fidelity);
    setLoadingState(null);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      addEnvHistoryStep(result.data);
    }
  };
  
  const handleRemoveBackground = async () => {
    const imageToProcess = mode === 'environment' ? editedImage : displayedObjectImage;
    if (!imageToProcess) return;
  
    setLoadingState('removing_background');
    setError(null);
  
    try {
      const result = await removeBackgroundCloudinary(imageToProcess);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        if (mode === 'environment') {
          addEnvHistoryStep(result.data);
        } else {
          addObjectHistoryStep(result.data);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred during background removal.';
      setError(message);
    } finally {
      setLoadingState(null);
    }
  };

  const handleEnvUndo = () => {
    if (envHistoryIndex > 0) {
      setEnvHistoryIndex(envHistoryIndex - 1);
    }
  };

  const handleEnvRedo = () => {
    if (envHistoryIndex < envHistory.length - 1) {
      setEnvHistoryIndex(envHistoryIndex + 1);
    }
  };

  const handleObjectUndo = () => {
    if (objectHistoryIndex > 0) {
      setObjectHistoryIndex(objectHistoryIndex - 1);
    }
  };

  const handleObjectRedo = () => {
    if (objectHistoryIndex < objectHistory.length - 1) {
      setObjectHistoryIndex(objectHistoryIndex + 1);
    }
  };

  const handleStartComposition = () => {
    if (editedImage && displayedObjectImage) {
      setIsComposing(true);
    } else {
      setError("An environment and an extracted object are needed to start composition.");
    }
  };

  const handleConfirmComposition = async (transform: ObjectTransform) => {
    if (!editedImage || !displayedObjectImage) {
        setError("Missing images for composition.");
        setIsComposing(false);
        return;
    }

    setLoadingState('blending');
    setError(null);
    setIsComposing(false);

    const result = await blendObjectIntoScene(editedImage, displayedObjectImage, transform);
    
    setLoadingState(null);
    if (result.error) {
        setError(result.error);
    } else if (result.data) {
        addEnvHistoryStep(result.data);
    }
  };

  const handleCancelComposition = () => {
    setIsComposing(false);
  };

  if (isComposing && editedImage && displayedObjectImage) {
    return <CompositionView 
        environmentImage={editedImage}
        objectImage={displayedObjectImage}
        onConfirm={handleConfirmComposition}
        onCancel={handleCancelComposition}
    />
  }

  if (isCapturingWebcam) {
    return <WebcamCaptureView onConfirm={handleConfirmWebcamCapture} onCancel={handleCancelWebcamCapture} />
  }

  if (isMasking && editedImage) {
    return <MaskingView image={editedImage} onConfirm={handleConfirmMask} onCancel={() => setIsMasking(false)} />
  }

  if (isCropping && fullScreenshot) {
    return <CropView 
      image={fullScreenshot} 
      onConfirm={handleConfirmCrop}
      onRecapture={handleRecapture}
      onCancel={handleStopCapture} 
    />
  }

  const ImagePlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400 p-4">
      <p className="text-center">Capture or upload an image to begin</p>
    </div>
  );
  
  const EditedImagePlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <p className="text-center">Your transformed image will appear here</p>
    </div>
  );
  
  const ExtractedObjectPlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <p className="text-center">Your extracted object will appear here</p>
    </div>
  );

  const GeneratedObjectPlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <p className="text-center">Describe and generate an object to see it here</p>
    </div>
  );
  
  const loadingMessages: { [key in LoadingState]: string } = {
    editing: 'Transforming environment...',
    extending: 'Extending image to 16:9...',
    refining: 'Refining your vision...',
    making_similar: 'Applying fidelity changes...',
    inpainting: 'Applying selective edit...',
    extracting: 'Extracting & enhancing object...',
    reimagining: 'Reimagining object...',
    removing_background: 'Removing background...',
    removing_person: 'Removing person from scene...',
    blending: 'Blending object into scene...',
    generating_object: 'Generating your object...',
  };

  const getLoadingMessage = (state: LoadingState | null): string | undefined => {
    return state ? loadingMessages[state] : undefined;
  };

  const canShowRemoveBackground = (mode === 'environment' && editedImage) || ((mode === 'object' || mode === 'generator') && displayedObjectImage);

  return (
    <div className="min-h-screen text-gray-200 p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-grow">
        <Header mode={mode} onModeChange={setMode} />
        <main className="pb-[220px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-start">
            {mode !== 'generator' && (
              <ImageDisplay 
                label={mode === 'environment' && envCleanedImage ? "Original (Cleaned)" : "Original"}
                image={displayedOriginalImage}
                placeholder={<ImagePlaceholder />}
                loadingMessage={loadingState === 'removing_person' ? getLoadingMessage(loadingState) : undefined}
                aspectRatio={originalImageAspectRatio}
                onAdjustCrop={fullScreenshot ? () => setIsCropping(true) : undefined}
                onDownload={originalImage ? handleDownloadOriginal : undefined}
                onAddToObs={isObsConnected ? () => handleAddToObs(displayedOriginalImage) : undefined}
                onRemovePerson={mode === 'environment' && originalImage && !envCleanedImage && !loadingState ? handleRemovePerson : undefined}
                onRevert={mode === 'environment' && envCleanedImage && !loadingState ? handleRevertOriginal : undefined}
              />
            )}
            <div className={mode === 'generator' ? 'lg:col-span-2' : ''}>
              <ImageDisplay
                label={mode === 'environment' ? "Transformed" : (mode === 'object' ? "Extracted Object" : "Generated Object")}
                image={mode === 'environment' ? editedImage : displayedObjectImage}
                maskImage={mode === 'environment' ? maskImage : null}
                loadingMessage={loadingState !== 'removing_person' ? getLoadingMessage(loadingState) : undefined}
                placeholder={
                  mode === 'environment' ? <EditedImagePlaceholder /> : 
                  mode === 'object' ? <ExtractedObjectPlaceholder /> : 
                  <GeneratedObjectPlaceholder />
                }
                onDownload={mode === 'environment' ? (editedImage ? handleDownload : undefined) : (displayedObjectImage ? handleDownloadExtractedObject : undefined)}
                onAddToObs={isObsConnected ? () => handleAddToObs(mode === 'environment' ? editedImage : displayedObjectImage) : undefined}
                onEditSelection={mode === 'environment' && editedImage ? () => setIsMasking(true) : undefined}
                onRegenerate={mode === 'environment' && (envCleanedImage || originalImage) && lastEnvPrompt && !loadingState ? handleRegenerate : undefined}
                onRemoveBackground={canShowRemoveBackground ? handleRemoveBackground : undefined}
                aspectRatio={mode === 'environment' ? editedImageAspectRatio : 1}
                onUndo={mode === 'environment' ? handleEnvUndo : handleObjectUndo}
                onRedo={mode === 'environment' ? handleEnvRedo : handleObjectRedo}
                canUndo={mode === 'environment' ? envHistoryIndex > 0 : objectHistoryIndex > 0}
                canRedo={mode === 'environment' ? envHistoryIndex < envHistory.length - 1 : objectHistoryIndex < objectHistory.length - 1}
              />
              {mode === 'environment' && editedImage && !loadingState && !maskImage && (
                <RefinementPanel 
                  onRefine={handleRefinement} 
                  isLoading={!!loadingState}
                  suggestions={refinementSuggestions}
                  isGeneratingSuggestions={isGeneratingSuggestions}
                  fidelity={fidelity}
                  onFidelityChange={setFidelity}
                  onApplyFidelity={handleApplyFidelity}
                />
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 backdrop-blur-md border border-red-700/50 text-red-300 px-4 py-3 rounded-xl relative mb-6 text-center" role="alert" aria-live="assertive">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <ControlPanel 
            mode={mode}
            onGenerate={handlePrimaryAction}
            isLoading={!!loadingState}
            onImageSelect={handleImageSelect}
            onScreenCapture={handleStartCapture}
            onWebcamCapture={handleStartWebcamCapture}
            originalImage={originalImage}
            editedImage={editedImage}
            displayedObjectImage={displayedObjectImage}
            onStartComposition={handleStartComposition}
            prompt={prompt}
            setPrompt={setPrompt}
            maskImage={maskImage}
            onClearMask={() => setMaskImage(null)}
            styleImage={styleImage}
            onStyleImageSelect={handleStyleImageSelect}
            promptHistory={promptHistory}
            objectSuggestions={objectSuggestions}
            isGeneratingObjectSuggestions={isGeneratingObjectSuggestions}
          />
        </main>
      </div>
      <ObsControlTray
        isConnected={isObsConnected}
        isConnecting={isObsConnecting}
        error={obsError}
        sceneItems={obsSceneItems}
        onConnect={handleObsConnect}
        onDisconnect={handleObsDisconnect}
        onToggleVisibility={handleToggleObsItemVisibility}
        onRemoveItem={handleRemoveObsItem}
      />
    </div>
  );
}

export default App;
