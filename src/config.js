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
    'moge-medium-19.glb': { x: 0.000, y: 2.000, z: 2.160 },
    'uni-medium-10.glb': { x: 0.000, y: 1.270, z: 0.7000 },
    'vggt-medium-15.glb': { x: 0.000, y: 1.080, z: 0.2600 },
  },
  'moge-long': {
    '2.glb': { x: 0.000, y: 1.960, z: 2.1500 },
    '5.glb': { x: 0.000, y: 2.660, z: 2.3000 },
    '6.glb': { x: 0.000, y: 1.860, z: 1.7000 },
  },
  'moge-medium': {
    '1.glb': { x: -0.4100, y: 2.100, z: 1.8100 },
    '3.glb': { x: 0.000, y: 2.100, z: 4.4100 },
    '14.glb': { x: 0.000, y: 2.100, z: 2.9400 },
  },
  'moge-short': {
    '17.glb': { x: 0.000, y: 1.250, z: 0.1400 },
    'pointcloud(1).glb': { x: 0.000, y: 1.250, z: 0.4000 },
    'pointcloud(3).glb': { x: 0.000, y: 1.000, z: 0.0600 },
  },
  'uni-long': {
    '2_subsampled.glb': { x: 0.000, y: 1.110, z: -0.1600 },
    '5_subsampled.glb': { x: 0.000, y: 1.4300, z: 1.7700 },
    '8_subsampled.glb': { x: 0.000, y: 2.100, z: 3.7200 },
  },
  'uni-medium': {
    '1_subsampled.glb': { x: 0.000, y: 1.500, z: 1.500 },
    '1.glb': { x: 0.3500, y: 1.500, z: 5.100 },
    '3_subsampled.glb': { x: 0.000, y: 1.400, z: 1.200 },
  },
  'uni-short': {
    '8.glb': { x: 0.000, y: 1.000, z: 0.1500 },
    '13.glb': { x: 0.000, y: 1.000, z: 0.1500 },
    '15.glb': { x: 0.000, y: 1.000, z: 0.5000 },
  },
  'vggt-long': {
    '2.glb': { x: 0.000, y: 1.060, z: -0.0400 },
    '5.glb': { x: 0.000, y: 1.100, z: -0.0500 },
    '6.glb': { x: 0.000, y: 1.050, z: -0.1800 },
  },
  'vggt-medium': {
    '1.glb': { x: 0.000, y: 1.040, z: 0.0800 },
    '2.glb': { x: 0.000, y: 1.100, z: 0.1900 },
    '3.glb': { x: 0.000, y: 1.000, z: -0.0500 },
  },
  'vggt-short': {
    '1.glb': { x: 0.000, y: 1.160, z: 0.0700 },
    '3.glb': { x: 0.000, y: 1.160, z: 0.2600 },
    '4.glb': { x: 0.000, y: 1.070, z: 0.2300 },
  }
};

// Optional per-model render presets
// Allows overriding default point size, sample rate, and model scale per GLB file
// Keys are per-folder
const modelRenderPresets = {
  'train': {
    'moge-medium-19.glb': { pointSize: 0.020, subsampleRate: 0.33, modelScale: 0.5, backgroundColor: '#8c8c8c' },
    'uni-medium-10.glb': { pointSize: 0.003, subsampleRate: 0.06, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'vggt-medium-15.glb': { pointSize: 0.002, subsampleRate: 1.0, modelScale: 1, backgroundColor: '#8c8c8c', flipUpsideDown: true },
  },
  'moge-long': {
    '2.glb': { pointSize: 0.01, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
    '5.glb': { pointSize: 0.005, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
    '6.glb': { pointSize: 0.005, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
  },
  'moge-medium': {
    '1.glb': { pointSize: 0.004, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    '3.glb': { pointSize: 0.010, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    '14.glb': { pointSize: 0.014, subsampleRate: 0.54, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'moge-short': {
    '17.glb': { pointSize: 0.002, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    'pointcloud(1).glb': { pointSize: 0.003, subsampleRate: 0.51, modelScale: 0.5, backgroundColor: '#8c8c8c' },
    'pointcloud(3).glb': { pointSize: 0.003, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'uni-long': {
    '2_subsampled.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.01, backgroundColor: '#8c8c8c', faceCamera: true },
    '5_subsampled.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    '8_subsampled.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'uni-medium': {
    '1_subsampled.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    '1.glb': { pointSize: 0.006, subsampleRate: 0.08, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    '3_subsampled.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'uni-short': {
    '8.glb': { pointSize: 0.001, subsampleRate: 0.08, modelScale: 1, backgroundColor: '#8c8c8c', faceCamera: true },
    '13.glb': { pointSize: 0.002, subsampleRate: 0.08, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    '15.glb': { pointSize: 0.001, subsampleRate: 0.08, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'vggt-long': {
    '2.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    '5.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    '6.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'vggt-medium': {
    '1.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    '2.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    '3.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'vggt-short': {
    '1.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    '3.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    '4.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
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
