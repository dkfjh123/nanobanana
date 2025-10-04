/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, Modality, GenerateContentResponse} from '@google/genai';

// --- DOM Element Selection ---
const uploadArea = document.getElementById('upload-area') as HTMLDivElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const uploadPlaceholder = document.getElementById(
  'upload-placeholder',
) as HTMLDivElement;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const clearUploadBtn = document.getElementById(
  'clear-upload-btn',
) as HTMLButtonElement;
const referenceGrid = document.getElementById(
  'reference-grid',
) as HTMLDivElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const resultContainer = document.getElementById(
  'result-container',
) as HTMLDivElement;
const resultPlaceholder = document.getElementById(
  'result-placeholder',
) as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const resultImage = document.getElementById('result-image') as HTMLImageElement;
const downloadBtn = document.getElementById(
  'download-btn',
) as HTMLButtonElement;
const errorMessageEl = document.getElementById(
  'error-message',
) as HTMLParagraphElement;

// --- State Management ---
let inputImageState: {base64: string; mimeType: string} | null = null;
let selectedReferenceState: {url: string; element: HTMLImageElement} | null =
  null;
let isLoading = false;

// --- Reference Images ---
const referenceImages = [
  {
    name: 'Starry Night',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  },
  {
    name: 'The Great Wave',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/The_Great_Wave_off_Kanagawa.jpg/800px-The_Great_Wave_off_Kanagawa.jpg',
  },
  {
    name: 'Pointillism',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/800px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg',
  },
  {
    name: 'The Scream',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg',
  },
  {
    name: 'Mona Lisa',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
  },
  {
    name: 'Abstract',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Mondrian_Composition_with_Red_Blue_and_Yellow.jpg/800px-Mondrian_Composition_with_Red_Blue_and_Yellow.jpg',
  },
];

// --- Gemini API Initialization ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});

// --- Helper Functions ---

/** Converts a File/Blob to a Base64 encoded string */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Fetches an image URL and converts it to a Base64 string */
async function urlToBase64(url: string): Promise<{base64: string; mimeType: string}> {
  // Use a CORS proxy to prevent cross-origin issues.
  // Note: Using a public proxy is not recommended for production.
  const proxyUrl = 'https://corsproxy.io/?';
  const response = await fetch(proxyUrl + encodeURIComponent(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  return {base64, mimeType: blob.type};
}


/** Updates the enabled/disabled state of the generate button */
function updateGenerateButtonState() {
  generateBtn.disabled = !inputImageState || !selectedReferenceState || isLoading;
}

/** Displays an error message to the user */
function show_error(message: string) {
  errorMessageEl.textContent = message;
  errorMessageEl.classList.remove('hidden');
  console.error(message);
}

// --- UI Event Handlers ---

/** Handles file selection from the input element */
function handleFileSelect(file: File | null) {
  if (!file || !file.type.startsWith('image/')) {
    show_error('Please select a valid image file.');
    return;
  }

  blobToBase64(file).then((base64) => {
    inputImageState = {base64, mimeType: file.type};
    previewImage.src = base64;
    previewImage.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
    clearUploadBtn.classList.remove('hidden');
    updateGenerateButtonState();
  });
}

/** Populates the grid with reference images */
function populateReferenceGrid() {
  referenceImages.forEach((image) => {
    const imgElement = document.createElement('img');
    imgElement.src = image.url;
    imgElement.alt = image.name;
    imgElement.title = image.name;
    imgElement.className = 'reference-img';
    imgElement.dataset.url = image.url;
    referenceGrid.appendChild(imgElement);
  });
}

// --- Event Listener Setup ---

// Upload Area Events
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () =>
  uploadArea.classList.remove('drag-over'),
);
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (file) {
    handleFileSelect(file);
  }
});
fileInput.addEventListener('change', () => handleFileSelect(fileInput.files?.[0] ?? null));

// Clear Upload Button
clearUploadBtn.addEventListener('click', () => {
  inputImageState = null;
  fileInput.value = ''; // Reset file input
  previewImage.src = '#';
  previewImage.classList.add('hidden');
  uploadPlaceholder.classList.remove('hidden');
  clearUploadBtn.classList.add('hidden');
  updateGenerateButtonState();
});

// Reference Grid Selection
referenceGrid.addEventListener('click', (e) => {
  const target = e.target as HTMLImageElement;
  if (target.classList.contains('reference-img')) {
    // Deselect previous
    if (selectedReferenceState) {
      selectedReferenceState.element.classList.remove('selected');
    }
    // Select new
    target.classList.add('selected');
    selectedReferenceState = {url: target.dataset.url!, element: target};
    updateGenerateButtonState();
  }
});

// Generate Button
generateBtn.addEventListener('click', async () => {
  if (!inputImageState || !selectedReferenceState) {
    show_error('Please upload an image and select a reference concept.');
    return;
  }

  // --- Start Loading State ---
  isLoading = true;
  updateGenerateButtonState();
  generateBtn.innerHTML =
    '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';
  loader.classList.remove('hidden');
  resultPlaceholder.classList.add('hidden');
  resultImage.classList.add('hidden');
  downloadBtn.classList.add('hidden');
  errorMessageEl.classList.add('hidden');

  try {
    // --- Prepare API Request ---
    const referenceImage = await urlToBase64(selectedReferenceState.url);

    const inputImagePart = {
      inlineData: {
        data: inputImageState.base64.split(',')[1],
        mimeType: inputImageState.mimeType,
      },
    };

    const referenceImagePart = {
      inlineData: {
        data: referenceImage.base64.split(',')[1],
        mimeType: referenceImage.mimeType,
      },
    };

    const textPart = {
      text: "Analyze the first image (the user's content) and the second image (the artistic style reference). Recreate the user's content by applying the distinct artistic style, color palette, textures, and overall mood of the reference image. The resulting image should be a recognizable transformation of the user's content into the style of the reference, not just a simple blend or overlay.",
    };

    // --- Call Gemini API ---
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [inputImagePart, referenceImagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // --- Process Response ---
    let foundImage = false;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const mimeType =
          part.inlineData.mimeType || 'image/png';
        resultImage.src = `data:${mimeType};base64,${base64ImageBytes}`;
        resultImage.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
        loader.classList.add('hidden');
        foundImage = true;
        break; // Stop after finding the first image
      }
    }
    if (!foundImage) {
        throw new Error("The API response did not contain an image. Please try again.");
    }

  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    show_error(`Generation failed: ${message}`);
    resultPlaceholder.classList.remove('hidden');
  } finally {
    // --- End Loading State ---
    isLoading = false;
    updateGenerateButtonState();
    generateBtn.innerHTML =
      '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate';
    loader.classList.add('hidden');
  }
});

// Download Button
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'fused-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// --- Initial Setup ---
function main() {
  populateReferenceGrid();
}

main();