import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";

export class SceneSetup {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.backgroundSphere = null;
    this.isBackgroundVisible = false;
    this.isInXRSession = false;
    this.xrBlackBackgroundEnabled = false;
  }

  initialize() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Always transparent

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Create background sphere
    this.createBackgroundSphere();

    // Add XR button
    const sessionInit = {
      requiredFeatures: ["hand-tracking"],
    };
    document.body.appendChild(XRButton.createButton(this.renderer, sessionInit));

    // Setup XR event listeners
    this.setupXREvents();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.0, 0);
    this.controls.update();

    // Lighting
    this.setupLighting();

    // Window resize handler
    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  createBackgroundSphere() {
    const geometry = new THREE.SphereGeometry(50, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
    });
    this.backgroundSphere = new THREE.Mesh(geometry, material);
    this.backgroundSphere.position.set(0, 1.6, 0);
    this.scene.add(this.backgroundSphere);
  }

  setupXREvents() {
    this.renderer.xr.addEventListener("sessionstart", () => {
      this.isInXRSession = true;
      // In XR, control whether we see passthrough (transparent) or black background
      this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
      console.log(
        `XR session started - background ${this.xrBlackBackgroundEnabled ? 'black' : 'passthrough'}`
      );
    });

    this.renderer.xr.addEventListener("sessionend", () => {
      this.isInXRSession = false;
      this.backgroundSphere.material.opacity = this.isBackgroundVisible ? 1.0 : 0.0;
      console.log("XR session ended - background restored to previous state");
    });
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    this.scene.add(directionalLight);
  }

  toggleBackground() {
    this.isBackgroundVisible = !this.isBackgroundVisible;

    if (this.isBackgroundVisible) {
      this.backgroundSphere.material.opacity = 1.0;
      console.log("Background sphere visible");
    } else {
      this.backgroundSphere.material.opacity = 0.0;
      console.log("Background sphere hidden");
    }
  }

  updateBackgroundSpherePosition() {
    if (this.renderer.xr.isPresenting) {
      const xrCamera = this.renderer.xr.getCamera();
      this.backgroundSphere.position.copy(xrCamera.position);
    } else {
      this.backgroundSphere.position.copy(this.camera.position);
    }
  }

  setXRBlackBackgroundEnabled(enabled) {
    this.xrBlackBackgroundEnabled = !!enabled;
    if (this.isInXRSession && this.backgroundSphere && this.backgroundSphere.material) {
      this.backgroundSphere.material.opacity = this.xrBlackBackgroundEnabled ? 1.0 : 0.0;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.updateBackgroundSpherePosition();
    this.renderer.render(this.scene, this.camera);
  }
}
