import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Create Wall-E model 
export async function loadWallE(onLoaded) {
  const loader = new GLTFLoader();
  const url = "models/wall_e/scene.gltf";

  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    const wallE = gltf.scene;
    normalizeModel(wallE);

    // Scaling object
    wallE.scale.set(0.02, 0.02, 0.02);

    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(wallE);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
    }

    if (onLoaded) {
      onLoaded({ wallE, mixer });
    }

    return { wallE, mixer };
  } catch (error) {
    console.error("Error loading Wall-E model:", error);
  }
}

// Normalizing model so that it fits inside a unit bounding box
function normalizeModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;
  const scale = 1 / maxDim;
  object.scale.set(scale, scale, scale);
}
