import {
	AmbientLight,
	AnimationMixer,
	AxesHelper,
	Box3,
	Cache,
	Color,
	DirectionalLight,
	GridHelper,
	HemisphereLight,
	LoaderUtils,
	LoadingManager,
	PMREMGenerator,
	PerspectiveCamera,
	PointsMaterial,
	REVISION,
	Scene,
	SkeletonHelper,
	Vector3,
	WebGLRenderer,
	LinearToneMapping,
	ACESFilmicToneMapping,
} from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { XRButton } from 'three/addons/webxr/XRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

import { GUI } from 'dat.gui';

import { environments } from './environments.js';

const DEFAULT_CAMERA = '[default]';

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
	`${THREE_PATH}/examples/jsm/libs/draco/gltf/`,
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
	`${THREE_PATH}/examples/jsm/libs/basis/`,
);

const IS_IOS = isIOS();

const Preset = { ASSET_GENERATOR: 'assetgenerator' };

Cache.enabled = true;

export class Viewer {
	constructor(el, options) {
		this.el = el;
		this.options = options;

		this.lights = [];
		this.content = null;
		this.mixer = null;
		this.clips = [];
		this.gui = null;

		// XR properties
		this.controllers = [];
		this.controllerGrips = [];
		this.hands = [];
		this.isInXRSession = false;
		this.xrCameraOffset = new Vector3();

		// Sphere content
		this.sphereContent = null;

		this.state = {
			environment:
				options.preset === Preset.ASSET_GENERATOR
					? environments.find((e) => e.id === 'footprint-court').name
					: environments[1].name,
			background: false,
			playbackSpeed: 1.0,
			actionStates: {},
			camera: DEFAULT_CAMERA,
			wireframe: false,
			skeleton: false,
			grid: false,
			autoRotate: false,

			// Lights
			punctualLights: true,
			exposure: 0.0,
			toneMapping: LinearToneMapping,
			ambientIntensity: 0.3,
			ambientColor: '#FFFFFF',
			directIntensity: 0.8 * Math.PI, // TODO(#116)
			directColor: '#FFFFFF',
			bgColor: '#191919',

			pointSize: 1.0,

			// XR
			xrEnabled: true,

			// Content options
			showSphere: false,
			sphereRadius: 5.0,
			sphereColor: '#ffffff',
			sphereWireframe: false,

			// Camera position display
			cameraX: 0,
			cameraY: 0,
			cameraZ: 0,
			
			// Model positioning
			bringModelToOrigin: true,
			modelOffsetX: 0,
			modelOffsetY: 0,
			modelOffsetZ: 3,
		};

		this.prevTime = 0;

		this.stats = new Stats();
		this.stats.dom.height = '48px';
		[].forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));

		this.backgroundColor = new Color(this.state.bgColor);

		this.scene = new Scene();
		this.scene.background = this.backgroundColor;

		const fov = options.preset === Preset.ASSET_GENERATOR ? (0.8 * 180) / Math.PI : 60;
		const aspect = el.clientWidth / el.clientHeight;
		this.defaultCamera = new PerspectiveCamera(fov, aspect, 0.01, 1000);
		this.activeCamera = this.defaultCamera;
		this.scene.add(this.defaultCamera);

		this.renderer = window.renderer = new WebGLRenderer({ antialias: true });
		this.renderer.setClearColor(0xcccccc);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(el.clientWidth, el.clientHeight);
		
		// Enable XR support
		this.renderer.xr.enabled = true;

		this.pmremGenerator = new PMREMGenerator(this.renderer);
		this.pmremGenerator.compileEquirectangularShader();

		this.neutralEnvironment = this.pmremGenerator.fromScene(new RoomEnvironment()).texture;

		this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
		this.controls.screenSpacePanning = true;

		this.el.appendChild(this.renderer.domElement);

		this.cameraCtrl = null;
		this.cameraFolder = null;
		this.animFolder = null;
		this.animCtrls = [];
		this.morphFolder = null;
		this.morphCtrls = [];
		this.skeletonHelpers = [];
		this.gridHelper = null;
		this.axesHelper = null;

		this.addAxesHelper();
		this.addGUI();
		this.initXR();
		if (options.kiosk) this.gui.close();

		this.animate = this.animate.bind(this);
		this.renderer.setAnimationLoop(this.animate);
		window.addEventListener('resize', this.resize.bind(this), false);
	}

	animate(time) {
		const dt = (time - this.prevTime) / 1000;

		this.controls.update();
		this.stats.update();
		this.mixer && this.mixer.update(dt);
		
		// Update camera position in GUI
		this.updateCameraPosition();
		
		this.render();

		this.prevTime = time;
	}

	render() {
		this.renderer.render(this.scene, this.activeCamera);
		if (this.state.grid) {
			this.axesCamera.position.copy(this.defaultCamera.position);
			this.axesCamera.lookAt(this.axesScene.position);
			this.axesRenderer.render(this.axesScene, this.axesCamera);
		}
	}

	resize() {
		const { clientHeight, clientWidth } = this.el.parentElement;

		this.defaultCamera.aspect = clientWidth / clientHeight;
		this.defaultCamera.updateProjectionMatrix();
		this.renderer.setSize(clientWidth, clientHeight);

		this.axesCamera.aspect = this.axesDiv.clientWidth / this.axesDiv.clientHeight;
		this.axesCamera.updateProjectionMatrix();
		this.axesRenderer.setSize(this.axesDiv.clientWidth, this.axesDiv.clientHeight);
	}

	updateCameraPosition() {
		if (this.activeCamera) {
			const pos = this.activeCamera.position;
			this.state.cameraX = parseFloat(pos.x.toFixed(3));
			this.state.cameraY = parseFloat(pos.y.toFixed(3));
			this.state.cameraZ = parseFloat(pos.z.toFixed(3));
		}
		
		// Update XR offset display
		if (this.xrInfo) {
			this.xrInfo.xrOffsetX = parseFloat(this.xrCameraOffset.x.toFixed(3));
			this.xrInfo.xrOffsetY = parseFloat(this.xrCameraOffset.y.toFixed(3));
			this.xrInfo.xrOffsetZ = parseFloat(this.xrCameraOffset.z.toFixed(3));
		}
	}

	load(url, rootPath, assetMap) {
		const baseURL = LoaderUtils.extractUrlBase(url);

		// Load.
		return new Promise((resolve, reject) => {
			// Intercept and override relative URLs.
			MANAGER.setURLModifier((url, path) => {
				// URIs in a glTF file may be escaped, or not. Assume that assetMap is
				// from an un-escaped source, and decode all URIs before lookups.
				// See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
				const normalizedURL =
					rootPath +
					decodeURI(url)
						.replace(baseURL, '')
						.replace(/^(\.?\/)/, '');

				if (assetMap.has(normalizedURL)) {
					const blob = assetMap.get(normalizedURL);
					const blobURL = URL.createObjectURL(blob);
					blobURLs.push(blobURL);
					return blobURL;
				}

				return (path || '') + url;
			});

			const loader = new GLTFLoader(MANAGER)
				.setCrossOrigin('anonymous')
				.setDRACOLoader(DRACO_LOADER)
				.setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
				.setMeshoptDecoder(MeshoptDecoder);

			const blobURLs = [];

			loader.load(
				url,
				(gltf) => {
					window.VIEWER.json = gltf;

					const scene = gltf.scene || gltf.scenes[0];
					const clips = gltf.animations || [];

					if (!scene) {
						// Valid, but not supported by this viewer.
						throw new Error(
							'This model contains no scene, and cannot be viewed here. However,' +
								' it may contain individual 3D resources.',
						);
					}

					this.setContent(scene, clips);

					blobURLs.forEach(URL.revokeObjectURL);

					// See: https://github.com/google/draco/issues/349
					// DRACOLoader.releaseDecoderModule();

					resolve(gltf);
				},
				undefined,
				reject,
			);
		});
	}

	/**
	 * @param {THREE.Object3D} object
	 * @param {Array<THREE.AnimationClip} clips
	 */
	setContent(object, clips) {
		this.clear();

		object.updateMatrixWorld(); // donmccurdy/three-gltf-viewer#330

		const box = new Box3().setFromObject(object);
		const size = box.getSize(new Vector3()).length();
		const center = box.getCenter(new Vector3());

		this.controls.reset();

		// Position the object - either center it or bring it closer to origin
		if (this.state.bringModelToOrigin) {
			// Calculate model dimensions for proper positioning
			const modelSize = box.getSize(new Vector3());
			const halfYSize = modelSize.y / 2;
			const halfZSize = modelSize.z / 2;
			
			// Move model close to origin with offset that accounts for Y and Z dimensions
			// This positions the bottom face at desired Y and front face at desired Z
			// Additional adjustments: +20 Z (further back), -15 Y (lower)
			object.position.set(
				this.state.modelOffsetX - center.x,
				this.state.modelOffsetY + halfYSize - center.y - 15, 
				this.state.modelOffsetZ + halfZSize - center.z + 20
			);
			
			console.log(`Model Y-size: ${modelSize.y.toFixed(2)}, Half Y-size: ${halfYSize.toFixed(2)}`);
			console.log(`Model Z-size: ${modelSize.z.toFixed(2)}, Half Z-size: ${halfZSize.toFixed(2)}`);
			console.log(`Model positioned with bottom face at Y: ${this.state.modelOffsetY}, front face at Z: ${this.state.modelOffsetZ}`);
		} else {
			// Traditional centering
			object.position.set(-center.x, -center.y, -center.z);
		}
		
		// Apply XR offset if in XR session
		if (this.isInXRSession) {
			object.position.add(this.xrCameraOffset);
		}

		this.controls.maxDistance = size * 10;

		this.defaultCamera.near = size / 100;
		this.defaultCamera.far = size * 100;
		this.defaultCamera.updateProjectionMatrix();

		if (this.options.cameraPosition) {
			this.defaultCamera.position.fromArray(this.options.cameraPosition);
			this.defaultCamera.lookAt(new Vector3());
		} else {
			// Default camera positioning
			if (this.state.bringModelToOrigin) {
				// Position camera near origin to view model at origin + offset
				const modelPosition = new Vector3(
					this.state.modelOffsetX,
					this.state.modelOffsetY,
					this.state.modelOffsetZ
				);
				
				// Simple, predictable camera positioning near origin
				this.defaultCamera.position.set(
					modelPosition.x + 2,    // 2 units to the right
					modelPosition.y + 1,    // 1 unit up
					modelPosition.z + 5     // 5 units back
				);
				this.defaultCamera.lookAt(modelPosition);
			} else {
				// Traditional camera positioning
				this.defaultCamera.position.copy(center);
				this.defaultCamera.position.x += size / 2.0;
				this.defaultCamera.position.y += size / 5.0;
				this.defaultCamera.position.z += size / 2.0;
				this.defaultCamera.lookAt(center);
			}
		}

		this.setCamera(DEFAULT_CAMERA);

		this.axesCamera.position.copy(this.defaultCamera.position);
		this.axesCamera.lookAt(this.axesScene.position);
		this.axesCamera.near = size / 100;
		this.axesCamera.far = size * 100;
		this.axesCamera.updateProjectionMatrix();
		this.axesCorner.scale.set(size, size, size);

		this.controls.saveState();

		this.scene.add(object);
		this.content = object;

		this.state.punctualLights = true;

		this.content.traverse((node) => {
			if (node.isLight) {
				this.state.punctualLights = false;
			}
		});

		this.setClips(clips);

		this.updateLights();
		this.updateGUI();
		this.updateEnvironment();
		this.updateDisplay();

		window.VIEWER.scene = this.content;

		this.printGraph(this.content);
	}

	printGraph(node) {
		console.group(' <' + node.type + '> ' + node.name);
		node.children.forEach((child) => this.printGraph(child));
		console.groupEnd();
	}

	/**
	 * @param {Array<THREE.AnimationClip} clips
	 */
	setClips(clips) {
		if (this.mixer) {
			this.mixer.stopAllAction();
			this.mixer.uncacheRoot(this.mixer.getRoot());
			this.mixer = null;
		}

		this.clips = clips;
		if (!clips.length) return;

		this.mixer = new AnimationMixer(this.content);
	}

	playAllClips() {
		this.clips.forEach((clip) => {
			this.mixer.clipAction(clip).reset().play();
			this.state.actionStates[clip.name] = true;
		});
	}

	/**
	 * @param {string} name
	 */
	setCamera(name) {
		if (name === DEFAULT_CAMERA) {
			this.controls.enabled = true;
			this.activeCamera = this.defaultCamera;
		} else {
			this.controls.enabled = false;
			this.content.traverse((node) => {
				if (node.isCamera && node.name === name) {
					this.activeCamera = node;
				}
			});
		}
	}

	updateLights() {
		const state = this.state;
		const lights = this.lights;

		if (state.punctualLights && !lights.length) {
			this.addLights();
		} else if (!state.punctualLights && lights.length) {
			this.removeLights();
		}

		this.renderer.toneMapping = Number(state.toneMapping);
		this.renderer.toneMappingExposure = Math.pow(2, state.exposure);

		if (lights.length === 2) {
			lights[0].intensity = state.ambientIntensity;
			lights[0].color.set(state.ambientColor);
			lights[1].intensity = state.directIntensity;
			lights[1].color.set(state.directColor);
		}
	}

	addLights() {
		const state = this.state;

		if (this.options.preset === Preset.ASSET_GENERATOR) {
			const hemiLight = new HemisphereLight();
			hemiLight.name = 'hemi_light';
			this.scene.add(hemiLight);
			this.lights.push(hemiLight);
			return;
		}

		const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity);
		light1.name = 'ambient_light';
		this.defaultCamera.add(light1);

		const light2 = new DirectionalLight(state.directColor, state.directIntensity);
		light2.position.set(0.5, 0, 0.866); // ~60º
		light2.name = 'main_light';
		this.defaultCamera.add(light2);

		this.lights.push(light1, light2);
	}

	removeLights() {
		this.lights.forEach((light) => light.parent.remove(light));
		this.lights.length = 0;
	}

	updateEnvironment() {
		const environment = environments.filter(
			(entry) => entry.name === this.state.environment,
		)[0];

		this.getCubeMapTexture(environment).then(({ envMap }) => {
			this.scene.environment = envMap;
			this.scene.background = this.state.background ? envMap : this.backgroundColor;
		});
	}

	getCubeMapTexture(environment) {
		const { id, path } = environment;

		// neutral (THREE.RoomEnvironment)
		if (id === 'neutral') {
			return Promise.resolve({ envMap: this.neutralEnvironment });
		}

		// none
		if (id === '') {
			return Promise.resolve({ envMap: null });
		}

		return new Promise((resolve, reject) => {
			new EXRLoader().load(
				path,
				(texture) => {
					const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
					this.pmremGenerator.dispose();

					resolve({ envMap });
				},
				undefined,
				reject,
			);
		});
	}

	updateDisplay() {
		if (this.skeletonHelpers.length) {
			this.skeletonHelpers.forEach((helper) => this.scene.remove(helper));
		}

		traverseMaterials(this.content, (material) => {
			material.wireframe = this.state.wireframe;

			if (material instanceof PointsMaterial) {
				material.size = this.state.pointSize;
			}
		});

		this.content.traverse((node) => {
			if (node.geometry && node.skeleton && this.state.skeleton) {
				const helper = new SkeletonHelper(node.skeleton.bones[0].parent);
				helper.material.linewidth = 3;
				this.scene.add(helper);
				this.skeletonHelpers.push(helper);
			}
		});

		if (this.state.grid !== Boolean(this.gridHelper)) {
			if (this.state.grid) {
				this.gridHelper = new GridHelper();
				this.axesHelper = new AxesHelper();
				this.axesHelper.renderOrder = 999;
				this.axesHelper.onBeforeRender = (renderer) => renderer.clearDepth();
				this.scene.add(this.gridHelper);
				this.scene.add(this.axesHelper);
			} else {
				this.scene.remove(this.gridHelper);
				this.scene.remove(this.axesHelper);
				this.gridHelper = null;
				this.axesHelper = null;
				this.axesRenderer.clear();
			}
		}

		this.controls.autoRotate = this.state.autoRotate;
	}

	updateBackground() {
		this.backgroundColor.set(this.state.bgColor);
	}

	/**
	 * Adds AxesHelper.
	 *
	 * See: https://stackoverflow.com/q/16226693/1314762
	 */
	addAxesHelper() {
		this.axesDiv = document.createElement('div');
		this.el.appendChild(this.axesDiv);
		this.axesDiv.classList.add('axes');

		const { clientWidth, clientHeight } = this.axesDiv;

		this.axesScene = new Scene();
		this.axesCamera = new PerspectiveCamera(50, clientWidth / clientHeight, 0.1, 10);
		this.axesScene.add(this.axesCamera);

		this.axesRenderer = new WebGLRenderer({ alpha: true });
		this.axesRenderer.setPixelRatio(window.devicePixelRatio);
		this.axesRenderer.setSize(this.axesDiv.clientWidth, this.axesDiv.clientHeight);

		this.axesCamera.up = this.defaultCamera.up;

		this.axesCorner = new AxesHelper(5);
		this.axesScene.add(this.axesCorner);
		this.axesDiv.appendChild(this.axesRenderer.domElement);
	}

	initXR() {
		// Add XR button to the page
		const xrButton = XRButton.createButton(this.renderer, {
			requiredFeatures: ['hand-tracking'],
			optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
		});
		document.body.appendChild(xrButton);

		// Initialize controllers and hands
		this.setupXRControllers();
		this.setupXRHands();

		// Add session event listeners
		this.renderer.xr.addEventListener('sessionstart', () => {
			this.isInXRSession = true;
			this.calculateXROffset();
			console.log('XR session started with camera offset:', this.xrCameraOffset);
		});

		this.renderer.xr.addEventListener('sessionend', () => {
			this.isInXRSession = false;
			this.resetXROffset();
			console.log('XR session ended');
		});
	}

	setupXRControllers() {
		const controllerModelFactory = new XRControllerModelFactory();

		for (let i = 0; i < 2; i++) {
			// Controller
			const controller = this.renderer.xr.getController(i);
			this.scene.add(controller);
			this.controllers.push(controller);

			// Controller grip
			const controllerGrip = this.renderer.xr.getControllerGrip(i);
			controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
			this.scene.add(controllerGrip);
			this.controllerGrips.push(controllerGrip);
		}
	}

	setupXRHands() {
		const handModelFactory = new XRHandModelFactory();

		for (let i = 0; i < 2; i++) {
			// Hand
			const hand = this.renderer.xr.getHand(i);
			hand.add(handModelFactory.createHandModel(hand));
			this.scene.add(hand);
			this.hands.push(hand);
		}
	}

	calculateXROffset() {
		// For models brought to origin, keep them close to origin in XR
		if (this.state.bringModelToOrigin) {
			// Keep model at its current position (close to origin) with minimal offset
			this.xrCameraOffset.set(0, 0, 0);
			
			// Keep content at its current position
			if (this.content) {
				// Don't move it - it's already well positioned near origin
			}
			
			// Keep sphere at its current position
			if (this.sphereContent) {
				// Don't move it - it's already well positioned near origin
			}
		} else {
			// Traditional XR offset calculation for models not brought to origin
			const currentCameraPos = this.activeCamera.position.clone();
			this.xrCameraOffset.copy(currentCameraPos).negate();
			
			// Apply offset to content
			if (this.content) {
				this.content.position.copy(this.xrCameraOffset);
			}
			
			// Apply offset to sphere if it exists
			if (this.sphereContent) {
				this.sphereContent.position.copy(this.xrCameraOffset);
			}
		}
	}

	resetXROffset() {
		// Reset content position when exiting XR
		this.xrCameraOffset.set(0, 0, 0);
		if (this.content) {
			this.content.position.set(0, 0, 0);
		}
		
		// Reset sphere position when exiting XR
		if (this.sphereContent) {
			this.sphereContent.position.set(0, 0, 0);
		}
	}

	createSphere() {
		// Remove existing sphere if any
		if (this.sphereContent) {
			this.scene.remove(this.sphereContent);
			this.sphereContent = null;
		}

		// Create sphere geometry and material
		const geometry = new THREE.SphereGeometry(this.state.sphereRadius, 32, 16);
		const material = new THREE.MeshStandardMaterial({
			color: this.state.sphereColor,
			roughness: 0.4,
			metalness: 0.1,
			wireframe: this.state.sphereWireframe,
		});

		this.sphereContent = new THREE.Mesh(geometry, material);
		
		// Position sphere according to model positioning settings
		if (this.state.bringModelToOrigin) {
			this.sphereContent.position.set(
				this.state.modelOffsetX,
				this.state.modelOffsetY,
				this.state.modelOffsetZ
			);
		} else {
			this.sphereContent.position.set(0, 0, 0);
		}
		
		// Apply XR offset if in XR session
		if (this.isInXRSession) {
			this.sphereContent.position.add(this.xrCameraOffset);
		}
		
		this.scene.add(this.sphereContent);

		console.log(`Created sphere with radius ${this.state.sphereRadius} and color ${this.state.sphereColor}`);
	}

	removeSphere() {
		if (this.sphereContent) {
			this.scene.remove(this.sphereContent);
			this.sphereContent.geometry.dispose();
			this.sphereContent.material.dispose();
			this.sphereContent = null;
			console.log('Sphere removed');
		}
	}

	toggleSphere() {
		if (this.state.showSphere) {
			this.createSphere();
		} else {
			this.removeSphere();
		}
	}

	updateSphere() {
		if (this.state.showSphere && this.sphereContent) {
			// Update sphere properties
			this.sphereContent.geometry.dispose();
			this.sphereContent.geometry = new THREE.SphereGeometry(this.state.sphereRadius, 32, 16);
			this.sphereContent.material.color.set(this.state.sphereColor);
			this.sphereContent.material.wireframe = this.state.sphereWireframe;
		}
	}

	addGUI() {
		const gui = (this.gui = new GUI({
			autoPlace: false,
			width: 260,
			hideable: true,
		}));

		// Display controls.
		const dispFolder = gui.addFolder('Display');
		const envBackgroundCtrl = dispFolder.add(this.state, 'background');
		envBackgroundCtrl.onChange(() => this.updateEnvironment());
		const autoRotateCtrl = dispFolder.add(this.state, 'autoRotate');
		autoRotateCtrl.onChange(() => this.updateDisplay());
		const wireframeCtrl = dispFolder.add(this.state, 'wireframe');
		wireframeCtrl.onChange(() => this.updateDisplay());
		const skeletonCtrl = dispFolder.add(this.state, 'skeleton');
		skeletonCtrl.onChange(() => this.updateDisplay());
		const gridCtrl = dispFolder.add(this.state, 'grid');
		gridCtrl.onChange(() => this.updateDisplay());
		dispFolder.add(this.controls, 'screenSpacePanning');
		const pointSizeCtrl = dispFolder.add(this.state, 'pointSize', 1, 16);
		pointSizeCtrl.onChange(() => this.updateDisplay());
		const bgColorCtrl = dispFolder.addColor(this.state, 'bgColor');
		bgColorCtrl.onChange(() => this.updateBackground());

		// Lighting controls.
		const lightFolder = gui.addFolder('Lighting');
		const envMapCtrl = lightFolder.add(
			this.state,
			'environment',
			environments.map((env) => env.name),
		);
		envMapCtrl.onChange(() => this.updateEnvironment());
		[
			lightFolder.add(this.state, 'toneMapping', {
				Linear: LinearToneMapping,
				'ACES Filmic': ACESFilmicToneMapping,
			}),
			lightFolder.add(this.state, 'exposure', -10, 10, 0.01),
			lightFolder.add(this.state, 'punctualLights').listen(),
			lightFolder.add(this.state, 'ambientIntensity', 0, 2),
			lightFolder.addColor(this.state, 'ambientColor'),
			lightFolder.add(this.state, 'directIntensity', 0, 4), // TODO(#116)
			lightFolder.addColor(this.state, 'directColor'),
		].forEach((ctrl) => ctrl.onChange(() => this.updateLights()));

		// Animation controls.
		this.animFolder = gui.addFolder('Animation');
		this.animFolder.domElement.style.display = 'none';
		const playbackSpeedCtrl = this.animFolder.add(this.state, 'playbackSpeed', 0, 1);
		playbackSpeedCtrl.onChange((speed) => {
			if (this.mixer) this.mixer.timeScale = speed;
		});
		this.animFolder.add({ playAll: () => this.playAllClips() }, 'playAll');

		// Morph target controls.
		this.morphFolder = gui.addFolder('Morph Targets');
		this.morphFolder.domElement.style.display = 'none';

		// Camera controls.
		this.cameraFolder = gui.addFolder('Cameras');
		this.cameraFolder.domElement.style.display = 'none';

		// Camera position controls.
		const cameraFolder = gui.addFolder('Camera Position');
		
		// Live camera position display (read-only)
		const cameraPosFolder = cameraFolder.addFolder('Current Position');
		this.cameraXCtrl = cameraPosFolder.add(this.state, 'cameraX').name('X').listen();
		this.cameraYCtrl = cameraPosFolder.add(this.state, 'cameraY').name('Y').listen();
		this.cameraZCtrl = cameraPosFolder.add(this.state, 'cameraZ').name('Z').listen();
		
		// Make position controls read-only
		this.cameraXCtrl.domElement.style.pointerEvents = 'none';
		this.cameraYCtrl.domElement.style.pointerEvents = 'none';
		this.cameraZCtrl.domElement.style.pointerEvents = 'none';
		
		// Add button to copy current position
		const copyPositionBtn = { 
			copyPosition: () => {
				const pos = this.activeCamera.position;
				const positionString = `[${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}]`;
				navigator.clipboard.writeText(positionString).then(() => {
					console.log('Camera position copied to clipboard:', positionString);
					alert(`Camera position copied to clipboard:\n${positionString}`);
				}).catch(err => {
					console.log('Camera position:', positionString);
					alert(`Camera position (copy manually):\n${positionString}`);
				});
			}
		};
		cameraFolder.add(copyPositionBtn, 'copyPosition').name('Copy Position to Clipboard');
		
		// Add reset camera button
		const resetCameraBtn = {
			resetCamera: () => {
				this.controls.reset();
			}
		};
		cameraFolder.add(resetCameraBtn, 'resetCamera').name('Reset Camera');
		
		// Model positioning controls
		const modelPosFolder = gui.addFolder('Model Positioning');
		const bringToOriginCtrl = modelPosFolder.add(this.state, 'bringModelToOrigin').name('Bring Model to Origin');
		bringToOriginCtrl.onChange(() => {
			// Reload the current content to apply new positioning
			if (this.content) {
				const currentContent = this.content;
				this.scene.remove(currentContent);
				this.scene.add(currentContent);
				this.setContent(currentContent, this.clips);
			}
		});
		
		const modelOffsetFolder = modelPosFolder.addFolder('Model Offset');
		const modelOffsetXCtrl = modelOffsetFolder.add(this.state, 'modelOffsetX', -20, 20, 0.1).name('Offset X');
		const modelOffsetYCtrl = modelOffsetFolder.add(this.state, 'modelOffsetY', -20, 20, 0.1).name('Offset Y');
		const modelOffsetZCtrl = modelOffsetFolder.add(this.state, 'modelOffsetZ', -20, 20, 0.1).name('Offset Z');
		
		// Apply model position changes immediately
		[modelOffsetXCtrl, modelOffsetYCtrl, modelOffsetZCtrl].forEach(ctrl => {
			ctrl.onChange(() => {
				if (this.content && this.state.bringModelToOrigin) {
					const box = new THREE.Box3().setFromObject(this.content);
					const center = box.getCenter(new THREE.Vector3());
					const modelSize = box.getSize(new THREE.Vector3());
					const halfYSize = modelSize.y / 2;
					const halfZSize = modelSize.z / 2;
					
					// Update model position with Y and Z size consideration
					// Additional adjustments: +20 Z (further back), -15 Y (lower)
					this.content.position.set(
						this.state.modelOffsetX - center.x,
						this.state.modelOffsetY + halfYSize - center.y - 15,
						this.state.modelOffsetZ + halfZSize - center.z + 20
					);
					
					// Apply XR offset if in XR session
					if (this.isInXRSession) {
						this.content.position.add(this.xrCameraOffset);
					}
				}
			});
		});

		// Sphere controls.
		const sphereFolder = gui.addFolder('Sphere Content');
		const showSphereCtrl = sphereFolder.add(this.state, 'showSphere').name('Show Sphere');
		showSphereCtrl.onChange(() => this.toggleSphere());
		
		const sphereRadiusCtrl = sphereFolder.add(this.state, 'sphereRadius', 0.5, 20, 0.1).name('Radius');
		sphereRadiusCtrl.onChange(() => this.updateSphere());
		
		const sphereColorCtrl = sphereFolder.addColor(this.state, 'sphereColor').name('Color');
		sphereColorCtrl.onChange(() => this.updateSphere());
		
		const sphereWireframeCtrl = sphereFolder.add(this.state, 'sphereWireframe').name('Wireframe');
		sphereWireframeCtrl.onChange(() => this.updateSphere());

		// XR controls.
		const xrFolder = gui.addFolder('XR');
		const xrEnabledCtrl = xrFolder.add(this.state, 'xrEnabled');
		xrEnabledCtrl.onChange((enabled) => {
			this.renderer.xr.enabled = enabled;
		});
		
		// Add XR position info
		const xrInfo = {
			xrOffsetX: 0,
			xrOffsetY: 0,
			xrOffsetZ: 0,
			recalculateOffset: () => {
				if (this.isInXRSession) {
					this.calculateXROffset();
				}
			}
		};
		
		const xrOffsetFolder = xrFolder.addFolder('XR Position Offset');
		const xrOffsetXCtrl = xrOffsetFolder.add(xrInfo, 'xrOffsetX').name('Offset X').listen();
		const xrOffsetYCtrl = xrOffsetFolder.add(xrInfo, 'xrOffsetY').name('Offset Y').listen();
		const xrOffsetZCtrl = xrOffsetFolder.add(xrInfo, 'xrOffsetZ').name('Offset Z').listen();
		xrOffsetFolder.add(xrInfo, 'recalculateOffset').name('Recalculate Offset');
		
		// Make offset controls read-only for display
		xrOffsetXCtrl.domElement.style.pointerEvents = 'none';
		xrOffsetYCtrl.domElement.style.pointerEvents = 'none';
		xrOffsetZCtrl.domElement.style.pointerEvents = 'none';
		
		// Store reference for updating
		this.xrInfo = xrInfo;

		// Stats.
		const perfFolder = gui.addFolder('Performance');
		const perfLi = document.createElement('li');
		this.stats.dom.style.position = 'static';
		perfLi.appendChild(this.stats.dom);
		perfLi.classList.add('gui-stats');
		perfFolder.__ul.appendChild(perfLi);

		const guiWrap = document.createElement('div');
		this.el.appendChild(guiWrap);
		guiWrap.classList.add('gui-wrap');
		guiWrap.appendChild(gui.domElement);
		gui.open();
	}

	updateGUI() {
		this.cameraFolder.domElement.style.display = 'none';

		this.morphCtrls.forEach((ctrl) => ctrl.remove());
		this.morphCtrls.length = 0;
		this.morphFolder.domElement.style.display = 'none';

		this.animCtrls.forEach((ctrl) => ctrl.remove());
		this.animCtrls.length = 0;
		this.animFolder.domElement.style.display = 'none';

		const cameraNames = [];
		const morphMeshes = [];
		this.content.traverse((node) => {
			if (node.geometry && node.morphTargetInfluences) {
				morphMeshes.push(node);
			}
			if (node.isCamera) {
				node.name = node.name || `VIEWER__camera_${cameraNames.length + 1}`;
				cameraNames.push(node.name);
			}
		});

		if (cameraNames.length) {
			this.cameraFolder.domElement.style.display = '';
			if (this.cameraCtrl) this.cameraCtrl.remove();
			const cameraOptions = [DEFAULT_CAMERA].concat(cameraNames);
			this.cameraCtrl = this.cameraFolder.add(this.state, 'camera', cameraOptions);
			this.cameraCtrl.onChange((name) => this.setCamera(name));
		}

		if (morphMeshes.length) {
			this.morphFolder.domElement.style.display = '';
			morphMeshes.forEach((mesh) => {
				if (mesh.morphTargetInfluences.length) {
					const nameCtrl = this.morphFolder.add(
						{ name: mesh.name || 'Untitled' },
						'name',
					);
					this.morphCtrls.push(nameCtrl);
				}
				for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
					const ctrl = this.morphFolder
						.add(mesh.morphTargetInfluences, i, 0, 1, 0.01)
						.listen();
					Object.keys(mesh.morphTargetDictionary).forEach((key) => {
						if (key && mesh.morphTargetDictionary[key] === i) ctrl.name(key);
					});
					this.morphCtrls.push(ctrl);
				}
			});
		}

		if (this.clips.length) {
			this.animFolder.domElement.style.display = '';
			const actionStates = (this.state.actionStates = {});
			this.clips.forEach((clip, clipIndex) => {
				clip.name = `${clipIndex + 1}. ${clip.name}`;

				// Autoplay the first clip.
				let action;
				if (clipIndex === 0) {
					actionStates[clip.name] = true;
					action = this.mixer.clipAction(clip);
					action.play();
				} else {
					actionStates[clip.name] = false;
				}

				// Play other clips when enabled.
				const ctrl = this.animFolder.add(actionStates, clip.name).listen();
				ctrl.onChange((playAnimation) => {
					action = action || this.mixer.clipAction(clip);
					action.setEffectiveTimeScale(1);
					playAnimation ? action.play() : action.stop();
				});
				this.animCtrls.push(ctrl);
			});
		}
	}

	clear() {
		if (!this.content) return;

		this.scene.remove(this.content);

		// dispose geometry
		this.content.traverse((node) => {
			if (!node.geometry) return;

			node.geometry.dispose();
		});

		// dispose textures
		traverseMaterials(this.content, (material) => {
			for (const key in material) {
				if (key !== 'envMap' && material[key] && material[key].isTexture) {
					material[key].dispose();
				}
			}
		});

		// Clean up XR controllers and hands
		this.controllers.forEach((controller) => {
			if (controller.parent) controller.parent.remove(controller);
		});
		this.controllerGrips.forEach((grip) => {
			if (grip.parent) grip.parent.remove(grip);
		});
		this.hands.forEach((hand) => {
			if (hand.parent) hand.parent.remove(hand);
		});

		this.controllers = [];
		this.controllerGrips = [];
		this.hands = [];
		
		// Clean up sphere
		this.removeSphere();
	}
}

function traverseMaterials(object, callback) {
	object.traverse((node) => {
		if (!node.geometry) return;
		const materials = Array.isArray(node.material) ? node.material : [node.material];
		materials.forEach(callback);
	});
}

// https://stackoverflow.com/a/9039885/1314762
function isIOS() {
	return (
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
			navigator.platform,
		) ||
		// iPad on iOS 13 detection
		(navigator.userAgent.includes('Mac') && 'ontouchend' in document)
	);
}
