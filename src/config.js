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
    'moge-medium-19.glb', 'uni-long-15.glb', 'vggt-medium-15.glb', 'uni-short-24.glb'
  ],
  'moge-long': [
    'moge-long-1.glb','moge-long-2.glb','moge-long-3.glb', 'moge-long-4.glb'
  ],
  'moge-medium': [
    'moge-medium-1.glb','moge-medium-2.glb','moge-medium-3.glb', 'moge-medium-4.glb'
  ],
  'moge-short': [
    'moge-short-1.glb','moge-short-2.glb','moge-short-3.glb', 'moge-short-4.glb'
  ],
  'uni-long': [
    'uni-long-1.glb','uni-long-2.glb','uni-long-3.glb', 'uni-long-4.glb'
  ],
  'uni-medium': [
    'uni-medium-1.glb','uni-medium-2.glb','uni-medium-3.glb', 'uni-medium-4.glb'
  ],
  'uni-short': [
    'uni-short-1.glb','uni-short-2.glb','uni-short-3.glb', 'uni-short-4.glb'
  ],
  'vggt-long': [
    'vggt-long-1.glb','vggt-long-2.glb','vggt-long-3.glb', 'vggt-long-4.glb'
  ],
  'vggt-medium': [
    'vggt-medium-1.glb','vggt-medium-2.glb','vggt-medium-3.glb', 'vggt-medium-4.glb'
  ],
  'vggt-short': [
    'vggt-short-1.glb','vggt-short-2.glb','vggt-short-3.glb', 'vggt-short-4.glb'
  ]
};

// Explicit per-block model selections (order matters). Edit this to choose
// exactly which models are shown for each folder/block.
const blockModelSelections = {
  'train': [
    'moge-medium-19.glb', 'uni-long-15.glb', 'vggt-medium-15.glb', 'uni-short-24.glb'
  ],
  'moge-long': [ 'moge-long-1.glb', 'moge-long-2.glb', 'moge-long-3.glb', 'moge-long-4.glb' ],
  'moge-medium': [ 'moge-medium-1.glb', 'moge-medium-2.glb', 'moge-medium-3.glb', 'moge-medium-4.glb' ],
  'moge-short': [ 'moge-short-1.glb', 'moge-short-2.glb', 'moge-short-3.glb', 'moge-short-4.glb' ],
  'uni-long': [ 'uni-long-1.glb', 'uni-long-2.glb', 'uni-long-3.glb', 'uni-long-4.glb' ],
  'uni-medium': [ 'uni-medium-1.glb', 'uni-medium-2.glb', 'uni-medium-3.glb', 'uni-medium-4.glb' ],
  'uni-short': [ 'uni-short-1.glb', 'uni-short-2.glb', 'uni-short-3.glb', 'uni-short-4.glb' ],
  'vggt-long': [ 'vggt-long-1.glb', 'vggt-long-2.glb', 'vggt-long-3.glb', 'vggt-long-4.glb' ],
  'vggt-medium': [ 'vggt-medium-1.glb', 'vggt-medium-2.glb', 'vggt-medium-3.glb', 'vggt-medium-4.glb' ],
  'vggt-short': [ 'vggt-short-1.glb', 'vggt-short-2.glb', 'vggt-short-3.glb', 'vggt-short-4.glb' ]
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
    'uni-long-15.glb': { x: 0.000, y: 1.270, z: 0.7000 },
    'uni-short-24.glb': { x: 0.000, y: 1.270, z: 0.7000 },
    'vggt-medium-15.glb': { x: 0.000, y: 1.080, z: 0.2600 },
  },
  'moge-long': {
    'moge-long-1.glb': { x: 0.000, y: 1.960, z: 2.1500 },
    'moge-long-2.glb': { x: 0.000, y: 2.660, z: 2.3000 },
    'moge-long-3.glb': { x: 0.000, y: 1.860, z: 1.7000 },
    'moge-long-4.glb': { x: 0.000, y: 1.860, z: 1.7000 },
  },
  'moge-medium': {
    'moge-medium-1.glb': { x: -0.4100, y: 2.100, z: 1.8100 },
    'moge-medium-2.glb': { x: 0.000, y: 2.100, z: 4.4100 },
    'moge-medium-3.glb': { x: 0.000, y: 2.100, z: 2.9400 },
    'moge-medium-4.glb': { x: 0.000, y: 2.100, z: 2.9400 },
  },
  'moge-short': {
    'moge-short-1.glb': { x: 0.000, y: 1.250, z: 0.1400 },
    'moge-short-2.glb': { x: 0.000, y: 1.250, z: 0.4000 },
    'moge-short-3.glb': { x: 0.000, y: 1.000, z: 0.0600 },
    'moge-short-4.glb': { x: 0.000, y: 1.000, z: 0.0600 },
  },
  'uni-long': {
    'uni-long-1.glb': { x: 0.000, y: 1.110, z: -0.1600 },
    'uni-long-2.glb': { x: 0.000, y: 1.4300, z: 1.7700 },
    'uni-long-3.glb': { x: 0.000, y: 2.100, z: 3.7200 },
    'uni-long-4.glb': { x: 0.000, y: 2.100, z: 3.7200 },
  },
  'uni-medium': {
    'uni-medium-1.glb': { x: 0.000, y: 1.500, z: 1.500 },
    'uni-medium-2.glb': { x: 0.3500, y: 1.500, z: 5.100 },
    'uni-medium-3.glb': { x: 0.000, y: 1.400, z: 1.200 },
    'uni-medium-4.glb': { x: 0.000, y: 1.400, z: 1.200 },
  },
  'uni-short': {
    'uni-short-1.glb': { x: 0.000, y: 1.000, z: 0.1500 },
    'uni-short-2.glb': { x: 0.000, y: 1.000, z: 0.1500 },
    'uni-short-3.glb': { x: 0.000, y: 1.000, z: 0.5000 },
    'uni-short-4.glb': { x: 0.000, y: 1.000, z: 0.5000 },
  },
  'vggt-long': {
    'vggt-long-1.glb': { x: 0.000, y: 1.060, z: -0.0400 },
    'vggt-long-2.glb': { x: 0.000, y: 1.100, z: -0.0500 },
    'vggt-long-3.glb': { x: 0.000, y: 1.050, z: -0.1800 },
    'vggt-long-4.glb': { x: 0.000, y: 1.050, z: -0.1800 },
  },
  'vggt-medium': {
    'vggt-medium-1.glb': { x: 0.000, y: 1.040, z: 0.0800 },
    'vggt-medium-2.glb': { x: 0.000, y: 1.100, z: 0.1900 },
    'vggt-medium-3.glb': { x: 0.000, y: 1.000, z: -0.0500 },
    'vggt-medium-4.glb': { x: 0.000, y: 1.000, z: -0.0500 },
  },
  'vggt-short': {
    'vggt-short-1.glb': { x: 0.000, y: 1.160, z: 0.0700 },
    'vggt-short-2.glb': { x: 0.000, y: 1.160, z: 0.2600 },
    'vggt-short-3.glb': { x: 0.000, y: 1.070, z: 0.2300 },
    'vggt-short-4.glb': { x: 0.000, y: 1.070, z: 0.2300 },
  }
};

// Optional per-model render presets
// Allows overriding default point size, sample rate, and model scale per GLB file
// Keys are per-folder
const modelRenderPresets = {
  'train': {
    'moge-medium-19.glb': { pointSize: 0.020, subsampleRate: 0.33, modelScale: 0.5, backgroundColor: '#8c8c8c' },
    'uni-long-15.glb': { pointSize: 0.003, subsampleRate: 0.06, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-24.glb': { pointSize: 0.003, subsampleRate: 0.06, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'vggt-medium-15.glb': { pointSize: 0.002, subsampleRate: 1.0, modelScale: 1, backgroundColor: '#8c8c8c', flipUpsideDown: true },
  },
  'moge-long': {
    'moge-long-1.glb': { pointSize: 0.01, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
    'moge-long-2.glb': { pointSize: 0.005, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
    'moge-long-3.glb': { pointSize: 0.005, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
    'moge-long-4.glb': { pointSize: 0.005, subsampleRate: 0.58, modelScale: 1, backgroundColor: '#8c8c8c'},
  },
  'moge-medium': {
    'moge-medium-1.glb': { pointSize: 0.004, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-medium-2.glb': { pointSize: 0.010, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-medium-3.glb': { pointSize: 0.014, subsampleRate: 0.54, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-medium-4.glb': { pointSize: 0.014, subsampleRate: 0.54, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'moge-short': {
    'moge-short-1.glb': { pointSize: 0.002, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-short-2.glb': { pointSize: 0.003, subsampleRate: 0.51, modelScale: 0.5, backgroundColor: '#8c8c8c' },
    'moge-short-3.glb': { pointSize: 0.003, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-short-4.glb': { pointSize: 0.003, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'uni-long': {
    'uni-long-1.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.01, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-long-2.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-long-3.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-long-4.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'uni-medium': {
    'uni-medium-1.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-medium-2.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-medium-3.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-medium-4.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'uni-short': {
    'uni-short-1.glb': { pointSize: 0.001, subsampleRate: 0.08, modelScale: 1, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-2.glb': { pointSize: 0.002, subsampleRate: 0.08, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-3.glb': { pointSize: 0.001, subsampleRate: 0.08, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-4.glb': { pointSize: 0.001, subsampleRate: 0.08, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'vggt-long': {
    'vggt-long-1.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-long-2.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-long-3.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-long-4.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'vggt-medium': {
    'vggt-medium-1.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-medium-2.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-medium-3.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-medium-4.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'vggt-short': {
    'vggt-short-1.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-short-2.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-short-3.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-short-4.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
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
