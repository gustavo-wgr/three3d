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

// ===== Device profile support (Quest 3 = default quality, Quest 2 = reduced) =====
const deviceProfiles = ['quest3', 'quest2'];
let activeDeviceProfile = 'quest3';

function setActiveDeviceProfile(profile) {
  if (deviceProfiles.includes(profile)) {
    activeDeviceProfile = profile;
  }
}

function getActiveDeviceProfile() {
  return activeDeviceProfile;
}

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
    'moge-medium-19.glb': { x: 0.100, y: 1.900, z: 3.560 },
    'uni-long-15.glb': { x: -0.400, y: 1.770, z: 2.000 },
    'uni-short-24.glb': { x: 0.000, y: 1.570, z: -0.1000 },
    'vggt-medium-15.glb': { x: 0.000, y: 1.580, z: 0.2600 },
  },
  'moge-long': {
    'moge-long-1.glb': { x: 0.000, y: 2.460, z: 2.1500 },
    'moge-long-2.glb': { x: 0.000, y: 2.660, z: 2.3000 },
    'moge-long-3.glb': { x: 0.000, y: 2.260, z: 1.7000 },
    'moge-long-4.glb': { x: 0.000, y: 3.420, z: 3.8000 },
  },
  'moge-medium': {
    'moge-medium-1.glb': { x: 0.000, y: 2.200, z: 1.7500 },
    'moge-medium-2.glb': { x: 0.000, y: 2.100, z: 4.4100 },
    'moge-medium-3.glb': { x: 0.000, y: 2.100, z: 4.2400 },
    'moge-medium-4.glb': { x: 0.000, y: 1.650, z: 0.6900 },
  },
  'moge-short': {
    'moge-short-1.glb': { x: 0.000, y: 1.650, z: 0.2400 },
    'moge-short-2.glb': { x: 0.000, y: 1.650, z: 0.5000 },
    'moge-short-3.glb': { x: 0.000, y: 1.600, z: 0.0600 },
    'moge-short-4.glb': { x: 0.000, y: 1.600, z: 0.0600 },
  },
  'uni-long': {
    'uni-long-1.glb': { x: 0.000, y: 1.910, z: 1.2400 },
    'uni-long-2.glb': { x: 0.000, y: 2.0300, z: 1.7700 },
    'uni-long-3.glb': { x: 0.000, y: 2.200, z: 3.9200 },
    'uni-long-4.glb': { x: 0.100, y: 2.450, z: 1.7200 },
  },
  'uni-medium': {
    'uni-medium-1.glb': { x: 0.000, y: 2.1400, z: 1.500 },
    'uni-medium-2.glb': { x: -0.1800, y: 1.500, z: 1.910 },
    'uni-medium-3.glb': { x: 0.000, y: 1.400, z: 4.9100 },
    'uni-medium-4.glb': { x: 0.000, y: 1.670, z: 0.9300 },
  },
  'uni-short': {
    'uni-short-1.glb': { x: 0.000, y: 1.600, z: 0.800 },
    'uni-short-2.glb': { x: 0.000, y: 1.5500, z: 0.4800 },
    'uni-short-3.glb': { x: 0.000, y: 1.500, z: -0.4200 },
    'uni-short-4.glb': { x: 0.000, y: 1.560, z: -0.1800 },
  },
  'vggt-long': {
    'vggt-long-1.glb': { x: 0.000, y: 1.620, z: -0.0400 },
    'vggt-long-2.glb': { x: 0.000, y: 1.610, z: -0.0500 },
    'vggt-long-3.glb': { x: 0.000, y: 1.560, z: -0.1800 },
    'vggt-long-4.glb': { x: 0.000, y: 1.550, z: -0.1800 },
  },
  'vggt-medium': {
    'vggt-medium-1.glb': { x: 0.000, y: 1.720, z: 0.7100 },
    'vggt-medium-2.glb': { x: 0.000, y: 1.580, z: 0.1900 },
    'vggt-medium-3.glb': { x: 0.000, y: 1.710, z: 0.6600 },
    'vggt-medium-4.glb': { x: 0.000, y: 1.7100, z: 0.6600 },
  },
  'vggt-short': {
    'vggt-short-1.glb': { x: 0.000, y: 1.860, z: 0.7800 },
    'vggt-short-2.glb': { x: 0.000, y: 1.860, z: 0.9700 },
    'vggt-short-3.glb': { x: 0.000, y: 1.650, z: -0.070 },
    'vggt-short-4.glb': { x: 0.000, y: 1.680, z: 0.9900 },
  }
};

// Per-device per-model render presets
// Allows overriding default point size, sample rate, and model scale per GLB file
// Keys are per-folder
const quest3ModelRenderPresets = {
  'train': {
    'moge-medium-19.glb': { pointSize: 0.015, subsampleRate: 0.64, modelScale: 1, backgroundColor: '#8c8c8c' },
    'uni-long-15.glb': { pointSize: 0.015, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-24.glb': { pointSize: 0.001, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'vggt-medium-15.glb': { pointSize: 0.002, subsampleRate: 1.0, modelScale: 1, backgroundColor: '#8c8c8c', flipUpsideDown: true },
  },
  'moge-long': {
    'moge-long-1.glb': { pointSize: 0.008, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c'},
    'moge-long-2.glb': { pointSize: 0.009, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c'},
    'moge-long-3.glb': { pointSize: 0.005, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c'},
    'moge-long-4.glb': { pointSize: 0.016, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c'},
  },
  'moge-medium': {
    'moge-medium-1.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-medium-2.glb': { pointSize: 0.012, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-medium-3.glb': { pointSize: 0.010, subsampleRate: 0.85, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-medium-4.glb': { pointSize: 0.005, subsampleRate: 0.74, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'moge-short': {
    'moge-short-1.glb': { pointSize: 0.002, subsampleRate: 0.87, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-short-2.glb': { pointSize: 0.003, subsampleRate: 0.62, modelScale: 0.5, backgroundColor: '#8c8c8c' },
    'moge-short-3.glb': { pointSize: 0.003, subsampleRate: 0.42, modelScale: 1, backgroundColor: '#8c8c8c' },
    'moge-short-4.glb': { pointSize: 0.002, subsampleRate: 0.51, modelScale: 1, backgroundColor: '#8c8c8c' },
  },
  'uni-long': {
    'uni-long-1.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.05, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-long-2.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-long-3.glb': { pointSize: 0.006, subsampleRate: 0.15, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-long-4.glb': { pointSize: 0.01, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'uni-medium': {
    'uni-medium-1.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-medium-2.glb': { pointSize: 0.008, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-medium-3.glb': { pointSize: 0.007, subsampleRate: 0.12, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-medium-4.glb': { pointSize: 0.006, subsampleRate: 0.12, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'uni-short': {
    'uni-short-1.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-2.glb': { pointSize: 0.005, subsampleRate: 0.12, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-3.glb': { pointSize: 0.002, subsampleRate: 0.12, modelScale: 1, backgroundColor: '#8c8c8c', faceCamera: true },
    'uni-short-4.glb': { pointSize: 0.001, subsampleRate: 0.1, modelScale: 0.5, backgroundColor: '#8c8c8c', faceCamera: true },
  },
  'vggt-long': {
    'vggt-long-1.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
    'vggt-long-2.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-long-3.glb': { pointSize: 0.005, subsampleRate: 1, modelScale: 1.5, backgroundColor: '#8c8c8c' },
    'vggt-long-4.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 1.5, backgroundColor: '#8c8c8c' },
  },
  'vggt-medium': {
    'vggt-medium-1.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
    'vggt-medium-2.glb': { pointSize: 0.006, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
    'vggt-medium-3.glb': { pointSize: 0.002, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
    'vggt-medium-4.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
  },
  'vggt-short': {
    'vggt-short-1.glb': { pointSize: 0.005, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
    'vggt-short-2.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
    'vggt-short-3.glb': { pointSize: 0.004, subsampleRate: 1, modelScale: 1, backgroundColor: '#8c8c8c' },
    'vggt-short-4.glb': { pointSize: 0.003, subsampleRate: 1, modelScale: 2, backgroundColor: '#8c8c8c' },
  }
};

// Start Quest 2 presets as a derived copy of Quest 3 with reduced subsampleRate.
// You can replace entries with precise values later.
const quest2ModelRenderPresets = (() => {
  try {
    const copy = JSON.parse(JSON.stringify(quest3ModelRenderPresets));
    const reduce = (v) => Math.max(0.0, Math.min(1.0, Number(v) * 0.5));
    Object.keys(copy).forEach((folder) => {
      const fm = copy[folder] || {};
      Object.keys(fm).forEach((file) => {
        if (fm[file] && isFinite(fm[file].subsampleRate)) {
          fm[file].subsampleRate = reduce(fm[file].subsampleRate);
        } else {
          // If no subsample specified, set a conservative default for Quest 2
          fm[file] = Object.assign({ subsampleRate: 0.5 }, fm[file] || {});
        }
      });
    });
    return copy;
  } catch (_) {
    return {};
  }
})();

// Optional explicit overrides for Quest 2 for precise control per model
// Shape: { [folder]: { [modelFileName]: { pointSize?, subsampleRate?, modelScale?, ... } } }
const quest2Overrides = {
  'train': {
    'vggt-medium-15.glb': { subsampleRate: 1 },
    'uni-long-15.glb': { pointSize: 0.016744548286604363, subsampleRate: 1 },
    'uni-short-24.glb': { pointSize: 0.001, subsampleRate: 0.06 }
  },
  'moge-medium': {
    'moge-medium-1.glb': { pointSize: 0.008747317410868812, subsampleRate: 0.49 },
    'moge-medium-3.glb': { pointSize: 0.014640013845621323, subsampleRate: 0.425 }
  },
  'uni-long': {
    'uni-long-1.glb': { pointSize: 0.009378677743163723, subsampleRate: 1 },
    'uni-long-3.glb': { pointSize: 0.006, subsampleRate: 0.05 },
    'uni-long-4.glb': { pointSize: 0.010851851851851852, subsampleRate: 1 }
  },
  'uni-medium': {
    'uni-medium-1.glb': { pointSize: 0.006, subsampleRate: 1 },
    'uni-medium-2.glb': { pointSize: 0.008, subsampleRate: 0.98 }
  },
  'uni-short': {
    'uni-short-1.glb': { pointSize: 0.003, subsampleRate: 0.99 }
  },
  'vggt-long': {
    'vggt-long-1.glb': { subsampleRate: 1 },
    'vggt-long-2.glb': { subsampleRate: 1 },
    'vggt-long-3.glb': { subsampleRate: 1 },
    'vggt-long-4.glb': { subsampleRate: 1 }
  },
  'vggt-medium': {
    'vggt-medium-1.glb': { subsampleRate: 1 },
    'vggt-medium-2.glb': { subsampleRate: 1 },
    'vggt-medium-3.glb': { subsampleRate: 1 },
    'vggt-medium-4.glb': { subsampleRate: 1 }
  },
  'vggt-short': {
    'vggt-short-1.glb': { subsampleRate: 1 },
    'vggt-short-2.glb': { subsampleRate: 1 },
    'vggt-short-3.glb': { subsampleRate: 1 },
    'vggt-short-4.glb': { subsampleRate: 1 }
  }
};

// Helper to set an override at runtime
function setQuest2Override(folder, modelFileName, preset) {
  if (!folder || !modelFileName || !preset) return;
  if (!quest2Overrides[folder]) quest2Overrides[folder] = {};
  quest2Overrides[folder][modelFileName] = Object.assign({}, quest2Overrides[folder][modelFileName] || {}, preset);
}

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
  const profile = getActiveDeviceProfile();
  const source = (!profile || profile === 'quest3') ? quest3ModelRenderPresets : quest2ModelRenderPresets;
  const folderMap = source[folder];
  if (!folderMap) return null;
  const base = folderMap[modelFileName] || null;
  if (profile === 'quest2') {
    const fo = quest2Overrides[folder];
    const ov = fo ? fo[modelFileName] : null;
    if (ov && typeof ov === 'object') {
      return Object.assign({}, base || {}, ov);
    }
  }
  return base;
}

// Export for ES6 modules
export { config, getModelUrls, getBlockModelUrls, getAvailableFolders, modelFolders, blockModelSelections, modelPositionPresets, getModelPositionPreset, quest3ModelRenderPresets, quest2ModelRenderPresets, getModelRenderPreset, folderOrder, deviceProfiles, setActiveDeviceProfile, getActiveDeviceProfile, setQuest2Override, quest2Overrides };
