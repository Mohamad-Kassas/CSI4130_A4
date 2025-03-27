import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// To access the spaceship, just add "import { spaceship } from "./spaceship.js";" and then add the spaceship group to the scene
export const spaceship = new THREE.Group();

const mtlLoader = new MTLLoader();

mtlLoader.load('models/spaceship.mtl', (materials) => {
  console.log('MTL loaded:', materials);
  materials.preload();

  const objLoader = new OBJLoader();
  // Applying the MTL materials to the OBJ
  objLoader.setMaterials(materials);

  objLoader.load('models/spaceship.obj', (object) => {
    console.log('OBJ loaded:', object);

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());

    // Shift the object so that its center is at the origin
    object.position.x += (object.position.x - center.x);
    object.position.y += (object.position.y - center.y);
    object.position.z += (object.position.z - center.z);

    object.traverse((child) => {
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide;
      }
    });

    spaceship.add(object);

  }, undefined, (error) => {
    console.error('Error loading OBJ:', error);
  });
}, undefined, (error) => {
  console.error('Error loading MTL:', error);
});
