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
    "1.glb",
    "2.glb",
    "3.glb",
    "5.glb",
    "6.glb",
    "8.glb",
    "9.glb",
    "11.glb",
    "12.glb",
    "13.glb",
    "14.glb",
    "15.glb",
    "16.glb",
    "17.glb",
    "18.glb",
    "19.glb",
    "20.glb",


  ],
  unik3d: [
    "1_subsampled.glb",
    //"1b.glb",
    "2_subsampled.glb",
    "3_subsampled.glb",
    
    "5_subsampled.glb",
    //"6.glb",
    "7.glb",
    "8_subsampled.glb",
    //"9.glb",
    "10_subsampled.glb",
    "11_subsampled.glb",
    "12_subsampled.glb",
    "13_subsampled.glb",
    "14_subsampled.glb",
    "15_subsampled.glb",
    "16_subsampled.glb",
    "17_subsampled.glb",
    "18_subsampled.glb",
    "19_subsampled.glb",
    "20_subsampled.glb",
    
    /*
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
    "cacdoha_000491_access.glb",*/
  ],
};

// Optional per-model position presets (in meters) for VR load position
// Add entries like: '1.glb': { x: 0, y: 2.1, z: -3 }
const modelPositionPresets = {
  unik3d: {
    // Example presets (edit as needed)
    '1.glb':  { x: 0.200, y: 2.300, z: 2.300 },
    '2.glb': { x: -0.000, y: 1.750, z: 0.360 },
    '3.glb':  { x: 0.400, y: 2.050, z: 2.150 },
    '5.glb': { x: -0.090, y: 2.000, z: 1.480 },
    '7.glb': { x: -0.030, y: 2.420, z: 3.260 },
    '8.glb': { x: -10, y: 1.860, z: 0.890 },
    '9.glb': { x: 0, y: 2, z: 4 },
    '10.glb': { x: 0.000, y: 2.200, z: 3.400 },
    '11.glb': { x: 0.420, y: 2.000, z: 1.480 },
    '12.glb': { x: -0.080, y: 1.930, z: 0.690 },
    '13.glb': { x: -0.510, y: 2.460, z: 3.040 },
    '14.glb': { x: 0.000, y: 2.230, z: 3.090 },
    '15.glb': { x: 1.440, y: 3.080, z: 5.260 },
    '16.glb': { x: 0.000, y: 1.790, z: 0.450 },
    '17.glb': { x: 0.000, y: 2.000, z: 2.530 },
    '18.glb': { x: 0.000, y: 2.470, z: 3.770 },
    '19.glb': { x: 0.000, y: 2.150, z: 1.840 },
    '20.glb': { x: 0.070, y: 1.820, z: 0.460 },
  },
  vggt: {
    '1.glb': { x: 0.030, y: 1.700, z: 0.470 },
    '2.glb': { x: 0.000, y: 1.000, z: 0.200 },
    '3.glb': { x: 0.000, y: 1.000, z: 0.200 },
    '4.glb': { x: 0.000, y: 1.000, z: 0.200 },
    '5.glb': { x: 0.000, y: 1.000, z: 0.200 },
    '6.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '7.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '8.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '9.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '10.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '11.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '12.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '13.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '14.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '15.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '16.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '17.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '18.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '19.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '20.glb': { x: 0.000, y: 1.600, z: 0.200 },
    '21.glb': { x: 0.000, y: 1.600, z: 0.200 },


  }
};

// Optional per-model render presets
// Allows overriding default point size, sample rate, and model scale per GLB file
// Add entries like: '1.glb': { pointSize: 0.004, subsampleRate: 0.5, modelScale: 1.2 }
const modelRenderPresets = {
  unik3d: {
    // Example presets (edit as needed)
    '1_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.5, backgroundColor: '#7f5a5a' },
    '2_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.01, backgroundColor: '#8c8c8c' },
    '3_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.5, backgroundColor: '#a29689' },
    '5_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.3, backgroundColor: '#a29292' },
    '7_subsampled.glb': { pointSize: 0.02, subsampleRate: 1.0, modelScale: 0.8, backgroundColor: '#282828' },
    '8_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.1, backgroundColor: '#7a7979' },
    '10_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.1, backgroundColor: '#687a7a' },
    '11_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.04, backgroundColor: '#4b5959' },
    '12_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.2, backgroundColor: '#7f7f7f' },
    '13_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.1, backgroundColor: '#797f79' },
    '14_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.6, backgroundColor: '#a79999' },
    '15_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#617272' },
    '16_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.1, backgroundColor: '#a2a2a2' },
    '17_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#372c23' },
    '18_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#5c7575' },
    '19_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.3, backgroundColor: '#2d2929' },
    '20_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.1, backgroundColor: '#576457' },
  },
  vggt: {
    // Example presets (edit as needed)
    '1.glb': { pointSize: 0.001, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#7f5a5a' },
    '2.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#8c8c8c' },
    '3.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a29689' },
    '5.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a29292' },
    '7.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#282828' },
    '8.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#7a7979' },
    '10.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#687a7a' },
    '11.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#4b5959' },
    '12.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#7f7f7f' },
    '13.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#797f79' },
    '14.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a79999' },
    '15.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#617272' },
    '16.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a2a2a2' },
    '17.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#372c23' },
    '18.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#5c7575' },
    '19.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#2d2929' },
    '20.glb': { pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#576457' },
  }
};

// Helper function to get model URLs based on selected folder
function getModelUrls(selectedFolder = 'unik3d') {
  if (selectedFolder === 'pointcloud_video') {
    // Special handling for pointcloud video - generate frame URLs
    return generatePointcloudVideoUrls();
  }
  
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

// Retrieve per-model preset position, if defined
function getModelPositionPreset(folder, modelFileName) {
  const folderMap = modelPositionPresets[folder];
  if (!folderMap) return null;
  return folderMap[modelFileName] || null;
}

// Retrieve per-model render preset, if defined
function getModelRenderPreset(folder, modelFileName) {
  const folderMap = modelRenderPresets[folder];
  if (!folderMap) return null;
  return folderMap[modelFileName] || null;
}

// Export for ES6 modules
export { config, getModelUrls, getAvailableFolders, modelFolders, modelPositionPresets, getModelPositionPreset, modelRenderPresets, getModelRenderPreset };
