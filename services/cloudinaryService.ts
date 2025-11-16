import type { ImageFile, ServiceResponse } from '../types';

const CLOUD_NAME = 'dbodseyp9';
const UPLOAD_PRESET = 'Objectextractor';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const formatError = (error: unknown, context: string): string => {
    console.error(`Error during ${context}:`, error);
    if (error instanceof Error) {
        return `Failed during ${context}: ${error.message}`;
    }
    return `An unknown error occurred during ${context}.`;
};

// Helper function to fetch an image from a URL and convert it to a base64 string
const fetchImageAsBase64 = async (url: string): Promise<{ base64: string, mimeType: string }> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from Cloudinary: ${response.statusText}`);
    }
    const blob = await response.blob();
    // The result from background removal is always PNG to support transparency
    const mimeType = 'image/png'; 
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ base64: reader.result as string, mimeType });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const removeBackgroundCloudinary = async (image: ImageFile): Promise<ServiceResponse<ImageFile>> => {
    try {
        // Step 1: Perform a standard unsigned upload.
        // We remove parameters like 'background_removal' which are not allowed in unsigned uploads.
        const formData = new FormData();
        formData.append('file', image.base64);
        formData.append('upload_preset', UPLOAD_PRESET);

        const uploadResponse = await fetch(UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error?.message || 'Cloudinary upload failed.');
        }

        const uploadData = await uploadResponse.json();
        
        if (!uploadData.public_id) {
            throw new Error('Cloudinary upload response did not include a public_id.');
        }

        // Step 2: Construct a new URL with the background removal transformation.
        // The transformation `e_background_removal` is applied on-the-fly.
        // `f_png` ensures the format supports transparency.
        const transformedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_background_removal,f_png/${uploadData.public_id}`;

        // Step 3: Fetch the transformed image and convert it to base64.
        const { base64, mimeType } = await fetchImageAsBase64(transformedUrl);

        const newImage: ImageFile = {
            base64,
            mimeType,
            name: `${image.name.split('.')[0]}.png`,
        };

        return { data: newImage, error: null };
    } catch (error) {
        return { data: null, error: formatError(error, 'Cloudinary background removal') };
    }
};