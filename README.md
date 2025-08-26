# 3D Scene Viewer - Modular Architecture

This project has been refactored from a single large `index.html` file into a modular JavaScript architecture for better maintainability and organization.

## Project Structure

```
three3d/
├── index.html                 # Clean HTML entry point
├── src/
│   ├── main.js               # Main application orchestrator
│   ├── scene-setup.js        # Scene, camera, and renderer setup
│   ├── xr-controllers.js     # XR controller management
│   ├── pointcloud-manager.js # Point cloud loading and management
│   ├── shaders.js            # GLSL shader definitions
│   ├── gui-manager.js        # GUI setup and management
│   ├── config.js             # Configuration and model URLs
│   ├── pointcloud-player.js  # Video playback functionality
│   └── components/           # React components (if applicable)
└── public/                   # Static assets (GLB files)
```

## Module Descriptions

### `main.js` - Main Application
- Orchestrates all other modules
- Manages application state and parameters
- Handles initialization and animation loop
- Coordinates communication between modules

### `scene-setup.js` - Scene Setup
- Creates and configures Three.js scene, camera, and renderer
- Sets up lighting and background sphere
- Handles XR session events
- Manages window resize events

### `xr-controllers.js` - XR Controllers
- Manages VR controller setup and interactions
- Handles controller button events and double-click detection
- Controls model positioning in XR mode
- Provides callbacks for model position changes and mesh switching

### `pointcloud-manager.js` - Point Cloud Management
- Loads and processes GLB models
- Handles geometry scaling and color attribute mapping
- Manages point cloud sampling
- Controls appearance animations
- Provides both normal and video mode point cloud creation

### `shaders.js` - Shader Definitions
- Contains vertex and fragment shader code
- Implements circular point rendering

### `gui-manager.js` - GUI Management
- Sets up dat.GUI controls
- Organizes GUI into logical folders
- Handles GUI callback management
- Updates GUI state from application events

### `config.js` - Configuration
- Manages model URLs and folder structure
- Provides utility functions for getting available models
- Handles different model categories (unik3d, vggt, pointcloud_video)

### `pointcloud-player.js` - Video Playback
- Handles video frame playback
- Manages frame loading and switching
- Controls playback speed and timing
- Provides video mode functionality

## Key Features

1. **Modular Architecture**: Each module has a single responsibility
2. **Clean Separation**: UI, logic, and rendering are separated
3. **Callback System**: Modules communicate through well-defined callbacks
4. **State Management**: Centralized state management in main application
5. **XR Support**: Full VR controller support with intuitive controls
6. **Video Playback**: Support for point cloud video sequences
7. **Real-time Effects**: Morphing between frames and circular point rendering

## Usage

The application is initialized by importing the `MainApplication` class and calling its `initialize()` method:

```javascript
import { MainApplication } from "./src/main.js";

const app = new MainApplication();
await app.initialize();
```

## Benefits of Refactoring

1. **Maintainability**: Code is now easier to understand and modify
2. **Reusability**: Modules can be reused in other projects
3. **Testability**: Individual modules can be tested in isolation
4. **Scalability**: New features can be added as separate modules
5. **Debugging**: Issues can be isolated to specific modules
6. **Collaboration**: Multiple developers can work on different modules

## VR Controls

- **Left Controller**: Y position (select=down, squeeze=up), X position (double-click grip left)
- **Right Controller**: Z position (select=closer, squeeze=farther), X position (double-click grip right), Next mesh (double-click trigger)

## GUI Controls

The GUI is organized into several folders:
- **Point Cloud**: Size and sampling
- **GLB Options**: Model selection and switching
- **Video Playback**: Video mode controls and frame navigation
