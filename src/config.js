// Configuration for external model storage
// Uses Hugging Face for production and local files for development

const config = {
  // Hugging Face storage (production)
  huggingFace: {
    baseUrl: "https://huggingface.co/gust-t/cac2/resolve/main"
  },
  
  // Development mode detection
  isDevelopment: window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.hostname.includes('localhost')
};

// Model folders configuration
const modelFolders = {
  vggt: [
    "89.glb",
    "110.glb",
    "116.glb",
    "122.glb",
    "123.glb",
    "140.glb",
    "149.glb",
    "152.glb",
    "154.glb",
    "156.glb",
    "161.glb",
    "196.glb",
    "321.glb",
    "345.glb",
    "412.glb",
    "422.glb",
    "443.glb",
    "457.glb",
    "490.glb",
    "491.glb",
  ],
  unik3d: [
    "cacdoha_000089_access.glb",
    "cacdoha_000110_access.glb",
    "cacdoha_000116_access.glb",
    "cacdoha_000122_access.glb",
    "cacdoha_000123_access.glb",
    "cacdoha_000140_access.glb",
    "cacdoha_000149_access.glb",
    "cacdoha_000152_access.glb",
    "cacdoha_000154_access.glb",
    "cacdoha_000156_access.glb",
    "cacdoha_000161_access.glb",
    "cacdoha_000196_access.glb",
    "cacdoha_000321_access.glb",
    "cacdoha_000345_access.glb",
    "cacdoha_000412_access.glb",
    "cacdoha_000422_access.glb",
    "cacdoha_000443_access.glb",
    "cacdoha_000457_access.glb",
    "cacdoha_000490_access.glb",
    "cacdoha_000491_access.glb",
  ]
};

// Helper function to get model URLs based on selected folder
function getModelUrls(selectedFolder = 'unik3d') {
  if (config.isDevelopment) {
    // Return local paths for development with folder prefix
    return modelFolders[selectedFolder].map(model => 
      `${selectedFolder}/${model}`
    );
  }
  
  // Return Hugging Face URLs for production with folder structure
  return modelFolders[selectedFolder].map(model => 
    `${config.huggingFace.baseUrl}/${selectedFolder}/${model}`
  );
}

// Helper function to get available folders
function getAvailableFolders() {
  return Object.keys(modelFolders);
}

// Export for ES6 modules
export { config, getModelUrls, getAvailableFolders, modelFolders };
