// Configuration for external model storage
// This file makes it easy to switch between different storage providers

const config = {
  // Storage provider options
  storageProviders: {
    // GitHub Releases (free, good for public repos)
    githubReleases: {
      baseUrl: "https://github.com/gustavo-wgr/three3d/releases/download/v1.0",
      models: [
        "glbscene.glb",
        "cacdoha_000089_access.glb",
        "cacdoha_000122_access.glb",
        "cacdoha_000123_access.glb",
        "cacdoha_000140_access.glb",
        "cacdoha_000149_access.glb",
        "cacdoha_000152_access.glb",
        "cacdoha_000196_access.glb",
      ]
    },
    
    
  },
  
  // Current active provider
  activeProvider: "githubReleases", // Change this to switch providers
  
  // Development mode - use local files
  isDevelopment: window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1'
};

// Helper function to get model URLs
function getModelUrls() {
  if (config.isDevelopment) {
    // Return local paths for development
    return [
      "glbscene.glb",
      "cacdoha_000089_access.glb",
      "cacdoha_000122_access.glb",
      "cacdoha_000123_access.glb",
      "cacdoha_000140_access.glb",
      "cacdoha_000149_access.glb",
      "cacdoha_000152_access.glb",
      "cacdoha_000196_access.glb",
    ];
  }
  
  const provider = config.storageProviders[config.activeProvider];
  if (!provider) {
    console.error(`Storage provider '${config.activeProvider}' not found`);
    return [];
  }
  
  if (provider.modelIds) {
    // For providers that use IDs (like Google Drive)
    return provider.modelIds.map(id => `${provider.baseUrl}${id}`);
  } else {
    // For providers that use direct file paths
    return provider.models.map(model => `${provider.baseUrl}/${model}`);
  }
}

// Export for ES6 modules
export { config, getModelUrls };
