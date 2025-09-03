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

// Desired folder order for UI lists (Experiment flow is controlled elsewhere)
const folderOrder = [
  'train',
  'moge-long', 'moge-medium', 'moge-short',
  'uni-long', 'uni-medium', 'uni-short',
  'vggt-long', 'vggt-medium', 'vggt-short'
];

// Explicit model lists (used as fallback for production builds)
// Paths are relative to each folder
const modelFolders = {
  'train': [
    'moge-medium-19.glb', 'uni-medium-10.glb', 'vggt-medium-15.glb'
  ],
  'moge-long': [
    '2.glb','5.glb','6.glb'
  ],
  'moge-medium': [
    '1.glb','3.glb','14.glb'
  ],
  'moge-short': [
    '17.glb','pointcloud(1).glb','pointcloud(3).glb'
  ],
  'uni-long': [
    '2_subsampled.glb','5_subsampled.glb','8_subsampled.glb'
  ],
  'uni-medium': [
    '1_subsampled.glb','1.glb','3_subsampled.glb'
  ],
  'uni-short': [
    '8.glb','13.glb','15.glb'
  ],
  'vggt-long': [
    '2.glb','5.glb','6.glb'
  ],
  'vggt-medium': [
    '1.glb','2.glb','3.glb'
  ],
  'vggt-short': [
    '1.glb','3.glb','4.glb'
  ]
};

// Explicit per-block model selections (order matters). Edit this to choose
// exactly which models are shown for each folder/block.
const blockModelSelections = {
  'train': [
    'moge-medium-19.glb', 'uni-medium-10.glb', 'vggt-medium-15.glb'
  ],
  'moge-long': [ '2.glb', '5.glb', '6.glb' ],
  'moge-medium': [ '1.glb', '3.glb', '14.glb' ],
  'moge-short': [ '17.glb', 'pointcloud(1).glb', 'pointcloud(3).glb' ],
  'uni-long': [ '2_subsampled.glb', '5_subsampled.glb', '8_subsampled.glb' ],
  'uni-medium': [ '1_subsampled.glb', '1.glb', '3_subsampled.glb' ],
  'uni-short': [ '8.glb', '13.glb', '15.glb' ],
  'vggt-long': [ '2.glb', '5.glb', '6.glb' ],
  'vggt-medium': [ '1.glb', '2.glb', '3.glb' ],
  'vggt-short': [ '1.glb', '3.glb', '4.glb' ]
};

// Dev-time discovery of .glb files under public/**
// Returns paths relative to the public root, e.g., 'unik3d/1.glb' or 'moge/medium/1.glb'
function listLocalGlbPaths() {
  try {
    // Build-time expansion; safe in browser at runtime
    const modules = import.meta.glob('../public/**/*.glb');
    return Object.keys(modules).map(p => p.replace('../public/', ''));
  } catch (_) {
    return [];
  }
}

// Optional per-model position presets (in meters) for VR load position
// Keys are per-folder; file names include both raw and _subsampled variants where relevant
const modelPositionPresets = {
  'train': {
    'moge-medium-19.glb': { x: 0.000, y: 2.000, z: 4.000 },
    'uni-medium-10.glb': { x: 0.000, y: 1.500, z: 1.500 },
    'vggt-medium-15.glb': { x: 0.000, y: 1.500, z: 1.500 },
  },
  'moge-long': {
  },
  'moge-medium': {
  },
  'moge-short': {
  },
  'uni-long': {
  },
  'uni-medium': {},
  'uni-short': {},
  'vggt-long': {
  },
  'vggt-medium': {
  },
  'vggt-short': {
  }
};

// Optional per-model render presets
// Allows overriding default point size, sample rate, and model scale per GLB file
// Keys are per-folder
const modelRenderPresets = {
  'train': {
    'moge-medium-19.glb': { pointSize: 0.006, subsampleRate: 0.3, modelScale: 1, backgroundColor: '#8c8c8c' },
    'uni-medium-10.glb': { pointSize: 0.006, subsampleRate: 0.06, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'vggt-medium-15.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 1, backgroundColor: '#8c8c8c', flipUpsideDown: true },
  },
  'moge-long': {
  },
  'moge-medium': {
  },
  'moge-short': {
  },
  'uni-long': {
  },
  'uni-medium': {
  },
  'uni-short': {
  },
  'vggt-long': {
  },
  'vggt-medium': {
  },
  'vggt-short': {
  }
};

// Helper function to get model URLs based on selected folder
function getModelUrls(selectedFolder = 'unik3d') {
  if (selectedFolder === 'pointcloud_video') {
    // Special handling for pointcloud video - generate frame URLs
    return generatePointcloudVideoUrls();
  }
  
  if (config.isDevelopment) {
    // Prefer auto-discovery from public folder via static glob + filter
    try {
      const discoveredAll = listLocalGlbPaths();
      const discovered = discoveredAll.filter(p => p.startsWith(`${selectedFolder}/`));
      if (discovered && discovered.length > 0) {
        // Sort for stable order and take only the first 3
        discovered.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return discovered.slice(0, 3);
      }
    } catch (_) {
      // ignore and fall back
    }
    // Fallback to explicit list if discovery fails
    if (Array.isArray(modelFolders[selectedFolder])) {
      return modelFolders[selectedFolder].map(model => `${selectedFolder}/${model}`);
    }
    return [];
  }
  
  // Return Hugging Face URLs for production with folder structure
  return modelFolders[selectedFolder].map(model => 
    `${config.huggingFace.baseUrl}/${selectedFolder}/${model}`
  );
}

// Return explicit per-block model URLs (uses blockModelSelections); falls back to
// folder-level lists if a folder is not present in blockModelSelections.
function getBlockModelUrls(selectedFolder) {
  const selected = blockModelSelections[selectedFolder];
  if (Array.isArray(selected) && selected.length > 0) {
    if (config.isDevelopment) {
      return selected.map(model => `${selectedFolder}/${model}`);
    }
    return selected.map(model => `${config.huggingFace.baseUrl}/${selectedFolder}/${model}`);
  }
  // Fallback
  return getModelUrls(selectedFolder);
}


// Helper function to get available folders
function getAvailableFolders() {
  if (config.isDevelopment) {
    try {
      const all = listLocalGlbPaths();
      const folders = new Set();
      for (const relPath of all) {
        const parts = relPath.split('/');
        if (parts.length > 1) {
          folders.add(parts[0]);
        }
      }
      const arr = Array.from(folders);
      if (arr.length > 0) {
        // Return in the desired order, filtered by what exists
        return folderOrder.filter(f => arr.includes(f));
      }
    } catch (_) {
      // ignore and fall back
    }
  }
  // Production: use declared folders in the desired order
  return folderOrder.filter(f => Object.prototype.hasOwnProperty.call(modelFolders, f));
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
export { config, getModelUrls, getBlockModelUrls, getAvailableFolders, modelFolders, blockModelSelections, modelPositionPresets, getModelPositionPreset, modelRenderPresets, getModelRenderPreset, folderOrder };
