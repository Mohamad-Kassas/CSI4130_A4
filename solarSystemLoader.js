import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

// Create the solar system with the sun and 8 planets
export async function loadSolarSystem(onPlanetLoaded) {
  const solarSystem = new THREE.Group()
  const sun = createSun()
  solarSystem.add(sun)
  onPlanetLoaded(solarSystem)

  // Define the properties of each planet
  const properties = [
    { name: "mercury", distance: 10, scale: 2 },
    { name: "venus",   distance: 15, scale: 3 },
    { name: "earth",   distance: 22, scale: 3.5 },
    { name: "mars",    distance: 29, scale: 2.5 },
    { name: "jupiter", distance: 40, scale: 6 },
    { name: "saturn",  distance: 50, scale: 5 },
    { name: "uranus",  distance: 60, scale: 4.5 },
    { name: "neptune", distance: 70, scale: 4 },
  ]

  // Load each planet model and add it to the solar system
  for (const property of properties) {
    const planetGroup = new THREE.Group()

    // Set the x position from the sun
    planetGroup.position.set(property.distance, 0, 0)
    try {
      const planetModel = await loadPlanetModel(property.name, property.scale)
      planetGroup.add(planetModel)

      // Send the planetGroup to the main file for rendering
      onPlanetLoaded(planetGroup)
    } catch (error) {
      console.error(`Failed to load model for ${property.name}`, error)
    }
    solarSystem.add(planetGroup)
  }

  return solarSystem
}

// Load a planet model, normalize, and scale it
function loadPlanetModel(planetName, desiredScale) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader()
    const url = `shader/${planetName}/scene.gltf`
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene

        // Normalize and scale the model
        normalizeModel(model)
        model.scale.multiplyScalar(desiredScale)

        resolve(model)
      },
      undefined,
      (error) => {
        console.log(`Error loading model for ${planetName}:`, error)
      }
    )
  })
}

// Normalize a model so that it fits inside a unit bounding box.
function normalizeModel(object) {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim === 0) return
  const scale = 1 / maxDim
  object.scale.set(scale, scale, scale)
}

// Create the sun at the center of the solar system
function createSun() {
  const geometry = new THREE.SphereGeometry(5, 32, 32)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const sun = new THREE.Mesh(geometry, material)
  sun.position.set(0, 0, 0)
  return sun
}
