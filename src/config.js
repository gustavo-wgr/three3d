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

// Desired folder order for the study
const folderOrder = [
  'moge-long', 'moge-medium', 'moge-short',
  'uni-long', 'uni-medium', 'uni-short',
  'vggt-long', 'vggt-medium', 'vggt-short'
];

// Explicit model lists (used as fallback for production builds)
// Paths are relative to each folder
const modelFolders = {
  'moge-long': [
    '2.glb','5.glb','6.glb','8.glb','9.glb','11.glb','12.glb','13.glb','15.glb','18.glb'
  ],
  'moge-medium': [
    '1.glb','3.glb','14.glb','16.glb','19.glb','20.glb',
    'pointcloud(2).glb','pointcloud(5).glb','pointcloud(6).glb','pointcloud(8).glb','pointcloud(13).glb','pointcloud(14).glb','pointcloud(15).glb','pointcloud(18).glb','pointcloud(19).glb','pointcloud(20).glb'
  ],
  'moge-short': [
    '17.glb','pointcloud(1).glb','pointcloud(3).glb','pointcloud(4).glb','pointcloud(7).glb','pointcloud(9).glb','pointcloud(10).glb','pointcloud(11).glb','pointcloud(12).glb','pointcloud(16).glb'
  ],
  'uni-long': [
    '2_subsampled.glb','5_subsampled.glb','8_subsampled.glb','11_subsampled.glb','12_subsampled.glb','13_subsampled.glb','15_subsampled.glb','18_subsampled.glb'
  ],
  'uni-medium': [
    '1_subsampled.glb','1.glb','3_subsampled.glb','4.glb','7.glb','10.glb','11.glb','12.glb','14.glb','16_subsampled.glb','17.glb','18.glb','19_subsampled.glb','19.glb','20_subsampled.glb','21.glb'
  ],
  'uni-short': [
    '8.glb','13.glb','15.glb','16.glb','17_subsampled.glb','20.glb','22.glb','23.glb','24.glb','25.glb'
  ],
  'vggt-long': [
    '2.glb','5.glb','6.glb','8.glb','9.glb','11.glb','12.glb','13.glb','15.glb','18b.glb'
  ],
  'vggt-medium': [
    '1.glb','2.glb','3.glb','5.glb','6.glb','8.glb','13.glb','14.glb','15.glb','16.glb','16b.glb','19.glb','19b.glb','20.glb','20b.glb','21.glb'
  ],
  'vggt-short': [
    '1.glb','3.glb','4.glb','7.glb','9.glb','10.glb','11.glb','12.glb','17.glb','17b.glb'
  ]
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
  'uni-long': {
    '1.glb':  { x: 0.200, y: 2.300, z: 2.300 },
    '1_subsampled.glb':  { x: 0.200, y: 2.300, z: 2.300 },
    '2.glb': { x: -0.000, y: 1.750, z: 0.360 },
    '2_subsampled.glb': { x: -0.000, y: 1.750, z: 0.360 },
    '3.glb':  { x: 0.400, y: 2.050, z: 2.150 },
    '3_subsampled.glb':  { x: 0.400, y: 2.050, z: 2.150 },
    '5.glb': { x: -0.090, y: 2.000, z: 1.480 },
    '5_subsampled.glb': { x: -0.090, y: 2.000, z: 1.480 },
    '7.glb': { x: -0.030, y: 2.420, z: 3.260 },
    '7_subsampled.glb': { x: -0.030, y: 2.420, z: 3.260 },
    '8.glb': { x: -10, y: 1.860, z: 0.890 },
    '8_subsampled.glb': { x: 0, y: 1.860, z: 0.890 },
    '9.glb': { x: 0, y: 2, z: 4 },
    '10.glb': { x: 0.000, y: 2.200, z: 3.400 },
    '10_subsampled.glb': { x: 0.000, y: 2.200, z: 3.400 },
    '11.glb': { x: 0.420, y: 2.000, z: 1.480 },
    '11_subsampled.glb': { x: 0.420, y: 2.000, z: 1.480 },
    '12.glb': { x: -0.080, y: 1.930, z: 0.690 },
    '12_subsampled.glb': { x: -0.080, y: 1.930, z: 0.690 },
    '13.glb': { x: -0.510, y: 2.460, z: 3.040 },
    '13_subsampled.glb': { x: -0.510, y: 2.460, z: 3.040 },
    '14.glb': { x: 0.000, y: 2.230, z: 3.090 },
    '14_subsampled.glb': { x: 0.000, y: 2.230, z: 3.090 },
    '15.glb': { x: 1.440, y: 3.080, z: 5.260 },
    '15_subsampled.glb': { x: 1.440, y: 3.080, z: 5.260 },
    '16.glb': { x: 0.000, y: 1.790, z: 0.450 },
    '16_subsampled.glb': { x: 0.000, y: 1.790, z: 0.450 },
    '17.glb': { x: 0.000, y: 2.000, z: 2.530 },
    '17_subsampled.glb': { x: 0.000, y: 2.000, z: 2.530 },
    '18.glb': { x: 0.000, y: 2.470, z: 3.770 },
    '18_subsampled.glb': { x: 0.000, y: 2.470, z: 3.770 },
    '19.glb': { x: 0.000, y: 2.150, z: 1.840 },
    '19_subsampled.glb': { x: 0.000, y: 2.150, z: 1.840 },
    '20.glb': { x: 0.070, y: 1.820, z: 0.460 },
    '20_subsampled.glb': { x: 0.070, y: 1.820, z: 0.460 },
    '21.glb': { x: 0.030, y: 1.700, z: 0.470 },
    '22.glb': { x: 0.030, y: 1.700, z: 0.470 },
    '23.glb': { x: 0.030, y: 1.700, z: 0.470 },
    '24.glb': { x: 0.030, y: 1.700, z: 0.470 },
    '25.glb': { x: 0.030, y: 1.700, z: 0.470 },
  },
  'uni-medium': {},
  'uni-short': {},
  'vggt-long': {
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
    '21.glb': { x: 0.000, y: 1.600, z: 0.200 }
  },
  'vggt-medium': {
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
    '21.glb': { x: 0.000, y: 1.600, z: 0.200 }
  },
  'vggt-short': {
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
    '21.glb': { x: 0.000, y: 1.600, z: 0.200 }
  }
};

// Optional per-model render presets
// Allows overriding default point size, sample rate, and model scale per GLB file
// Keys are per-folder
const modelRenderPresets = {
  'uni-long': {
    '1_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.5, backgroundColor: '#7f5a5a' },
    '2_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.01, backgroundColor: '#8c8c8c', faceCamera: true },
    '3_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.5, backgroundColor: '#a29689' },
    '5_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.3, backgroundColor: '#a29292', faceCamera: true },
    '7_subsampled.glb': { pointSize: 0.02, subsampleRate: 1.0, modelScale: 0.8, backgroundColor: '#282828' },
    '8_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.1, backgroundColor: '#7a7979', faceCamera: true },
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
  'uni-medium': {
    '1.glb': { pointSize: 0.006, subsampleRate: 0.06, modelScale: 1, backgroundColor: '#7f5a5a', faceCamera: true },
    '1_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.5, backgroundColor: '#7f5a5a', faceCamera: true },
    '2_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.01, backgroundColor: '#8c8c8c' },
    '3_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 0.5, backgroundColor: '#a29689', faceCamera: true },
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
  'uni-short': {
    '15.glb': { pointSize: 0.006, subsampleRate: 0.06, modelScale: 1, backgroundColor: '#7f5a5a', faceCamera: true },
    '13.glb': { pointSize: 0.006, subsampleRate: 0.06, modelScale: 1, backgroundColor: '#7f5a5a', faceCamera: true },
    '8.glb': { pointSize: 0.006, subsampleRate: 0.06, modelScale: 1.0, backgroundColor: '#7a7979', faceCamera: true },
    '17_subsampled.glb': { pointSize: 0.006, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#372c23' }
  },
  'vggt-long': {
    '1.glb': { flipUpsideDown: true, pointSize: 0.001, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#7f5a5a' },
    '2.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#8c8c8c' },
    '3.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a29689' },
    '5.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a29292' },
    '7.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#282828' },
    '8.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#7a7979' },
    '10.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#687a7a' },
    '11.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#4b5959' },
    '12.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#7f7f7f' },
    '13.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#797f79' },
    '14.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a79999' },
    '15.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#617272' },
    '16.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#a2a2a2' },
    '17.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#372c23' },
    '18.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#5c7575' },
    '19.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#2d2929' },
    '20.glb': { flipUpsideDown: true, pointSize: 0.003, subsampleRate: 1.0, modelScale: 1.0, backgroundColor: '#576457' },
  },
  'vggt-medium': {
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
  },
  'vggt-short': {
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
    // Prefer auto-discovery from public folder via static glob + filter
    try {
      const discoveredAll = listLocalGlbPaths();
      const discovered = discoveredAll.filter(p => p.startsWith(`${selectedFolder}/`));
      if (discovered && discovered.length > 0) {
        // Sort for stable order
        discovered.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return discovered;
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
export { config, getModelUrls, getAvailableFolders, modelFolders, modelPositionPresets, getModelPositionPreset, modelRenderPresets, getModelRenderPreset, folderOrder };
