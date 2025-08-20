import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export class XRControllers {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.controller1 = null;
    this.controller2 = null;
    this.controllerGrip1 = null;
    this.controllerGrip2 = null;
    
    // Model position control variables
    this.modelX = 0;
    this.modelY = 2.1;
    this.modelZ = -3;
    this.positionStep = 0.1;
    
    // Double-click variables
    this.leftGripClickCount = 0;
    this.rightGripClickCount = 0;
    this.leftGripLastClickTime = 0;
    this.rightGripLastClickTime = 0;
    this.rightTriggerClickCount = 0;
    this.rightTriggerLastClickTime = 0;
    this.doubleClickTimeWindow = 500;
    this.xMovementStep = 0.5;
    
    // Callbacks
    this.onModelPositionChange = null;
    this.onMeshSwitch = null;
  }

  initialize() {
    // VR Controller setup
    this.controller1 = this.renderer.xr.getController(0);
    this.scene.add(this.controller1);

    this.controller2 = this.renderer.xr.getController(1);
    this.scene.add(this.controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    // Controller grips
    this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
    this.controllerGrip1.add(
      controllerModelFactory.createControllerModel(this.controllerGrip1)
    );
    this.scene.add(this.controllerGrip1);

    this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
    this.controllerGrip2.add(
      controllerModelFactory.createControllerModel(this.controllerGrip2)
    );
    this.scene.add(this.controllerGrip2);

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Controller 1 events
    this.controller1.addEventListener('selectstart', () => {
      if (this.renderer.xr.isPresenting) {
        this.modelY -= this.positionStep;
        this.updateModelPosition();
        console.log(`Model Y position: ${this.modelY.toFixed(1)}`);
      }
    });

    this.controller1.addEventListener('squeezestart', () => {
      if (this.renderer.xr.isPresenting) {
        this.handleGripDoubleClick(this.controller1, true);
        this.modelY += this.positionStep;
        this.updateModelPosition();
        console.log(`Model Y position: ${this.modelY.toFixed(1)}`);
      }
    });

    // Controller 2 events
    this.controller2.addEventListener('selectstart', () => {
      if (this.renderer.xr.isPresenting) {
        this.handleTriggerDoubleClick();
        this.modelZ += this.positionStep;
        this.updateModelPosition();
        console.log(`Model Z position: ${this.modelZ.toFixed(1)}`);
      }
    });

    this.controller2.addEventListener('squeezestart', () => {
      if (this.renderer.xr.isPresenting) {
        this.handleGripDoubleClick(this.controller2, false);
        this.modelZ -= this.positionStep;
        this.updateModelPosition();
        console.log(`Model Z position: ${this.modelZ.toFixed(1)}`);
      }
    });
  }

  handleGripDoubleClick(controller, isLeftController) {
    const currentTime = Date.now();
    const clickCount = isLeftController ? this.leftGripClickCount : this.rightGripClickCount;
    const lastClickTime = isLeftController ? this.leftGripLastClickTime : this.rightGripLastClickTime;
    
    if (currentTime - lastClickTime < this.doubleClickTimeWindow) {
      // Double-click detected
      if (isLeftController) {
        this.modelX -= this.xMovementStep;
        console.log(`Double-click left grip: Model X moved left to ${this.modelX.toFixed(1)}`);
      } else {
        this.modelX += this.xMovementStep;
        console.log(`Double-click right grip: Model X moved right to ${this.modelX.toFixed(1)}`);
      }
      this.updateModelPosition();
      
      // Reset click count
      if (isLeftController) {
        this.leftGripClickCount = 0;
        this.leftGripLastClickTime = 0;
      } else {
        this.rightGripClickCount = 0;
        this.rightGripLastClickTime = 0;
      }
    } else {
      // First click
      if (isLeftController) {
        this.leftGripClickCount = 1;
        this.leftGripLastClickTime = currentTime;
        console.log("Left grip single click - waiting for double-click...");
      } else {
        this.rightGripClickCount = 1;
        this.rightGripLastClickTime = currentTime;
        console.log("Right grip single click - waiting for double-click...");
      }
    }
  }

  handleTriggerDoubleClick() {
    const currentTime = Date.now();
    
    if (currentTime - this.rightTriggerLastClickTime < this.doubleClickTimeWindow) {
      // Double-click detected - switch to next mesh
      console.log("Double-click right trigger: Switching to next mesh");
      
      if (this.onMeshSwitch) {
        this.onMeshSwitch();
      }
      
      // Reset click count
      this.rightTriggerClickCount = 0;
      this.rightTriggerLastClickTime = 0;
    } else {
      // First click
      this.rightTriggerClickCount = 1;
      this.rightTriggerLastClickTime = currentTime;
      console.log("Right trigger single click - waiting for double-click...");
    }
  }

  updateModelPosition() {
    if (this.onModelPositionChange) {
      this.onModelPositionChange(this.modelX, this.modelY, this.modelZ);
    }
  }

  getModelPosition() {
    return { x: this.modelX, y: this.modelY, z: this.modelZ };
  }

  setModelPosition(x, y, z) {
    this.modelX = x;
    this.modelY = y;
    this.modelZ = z;
  }
}
