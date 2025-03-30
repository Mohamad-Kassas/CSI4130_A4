import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Create Eve model
export async function loadEve(onLoaded) {
  const loader = new GLTFLoader();
  const url = "models/eve/scene.gltf";

  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    const eve = gltf.scene;
    normalizeModel(eve);

    // Scaling the object
    eve.scale.set(0.05, 0.05, 0.05);

    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(eve);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
    }

    if (onLoaded) {
      onLoaded({ eve, mixer });
    }

    return { eve, mixer };
  } catch (error) {
    console.error("Error loading Eve model:", error);
  }
}

// Normalize the model so that it fits inside a unit bounding box
function normalizeModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return;
  const scale = 1 / maxDim;
  object.scale.set(scale, scale, scale);
}
