// Configuration for external model storage
// Uses Hugging Face for production and local files for development

const config = {
  // Hugging Face storage (production)
  huggingFace: {
    baseUrl: "https://huggingface.co/gust-t/cac2/resolve/main",
    models: [
      "glbscene.glb",
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
  },
  
  // Development mode detection
  isDevelopment: window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.hostname.includes('localhost')
};

// Helper function to get model URLs
function getModelUrls() {
  if (config.isDevelopment) {
    // Return local paths for development
    return [
      "glbscene.glb",
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
    ];
  }
  
  // Return Hugging Face URLs for production
  return config.huggingFace.models.map(model => 
    `${config.huggingFace.baseUrl}/${model}`
  );
}

// Export for ES6 modules
export { config, getModelUrls };
