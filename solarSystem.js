import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

let scene, camera, renderer, composer, gui

// Main: sets up renderer, scene, camera, controls, composer, and solar system components
function main() {
  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(new THREE.Color(0x000000))
  renderer.setSize(window.innerWidth, window.innerHeight)
  const container = document.createElement("div")
  document.body.appendChild(container)
  container.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = initCamera()
  gui = initControls()
  composer = initComposer()

  setupLighting()

  createSolarSystem().then((solarSystem) => {
    scene.add(solarSystem)
  })

  scene.add(createStarField())
  animate()
  window.addEventListener("resize", onResize, true)
}

// Initialize the camera
function initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  )
  camera.position.z = 100
  camera.lookAt(scene.position)
  return camera
}

// Initialize orbit controls and GUI
function initControls() {
  const orbitControls = new OrbitControls(camera, renderer.domElement)
  const gui = new GUI()
  const controls = { temp: 0 }
  gui.add(controls, "temp", -10, 10).onChange(controls.redraw)
  return gui
}

// Initialize the composer
function initComposer() {
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  return composer
}

// Setup realistic lighting with star light effect
function setupLighting() {
  // Add bloom (star light) effect
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.5 // threshold
  )
  composer.addPass(bloomPass)

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambientLight)

  // Add point light from the sun
  const pointLight = new THREE.PointLight(0xffffff, 100, 1000)
  scene.add(pointLight)
}

// Create the sun at the center of the solar system
function createSun() {
  const geometry = new THREE.SphereGeometry(5, 32, 32)
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const sun = new THREE.Mesh(geometry, material)
  sun.position.set(0, 0, 0)
  return sun
}

// Create the solar system with the sun and all planets
async function createSolarSystem() {
  const solarSystem = new THREE.Group()
  const sun = createSun()
  solarSystem.add(sun)

  // Define the properties of each planet
  const properties = [
    { name: "mercury", distance: 10, scale: 2 },
    { name: "venus", distance: 15, scale: 3 },
    { name: "earth", distance: 22, scale: 3.5 },
    { name: "mars", distance: 29, scale: 2.5 },
    { name: "jupiter", distance: 40, scale: 6 },
    { name: "saturn", distance: 50, scale: 5 },
    { name: "uranus", distance: 60, scale: 4.5 },
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

// Normalize a model so that it fits inside a unit bounding box
function normalizeModel(object) {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim === 0) return
  const scale = 1 / maxDim
  object.scale.set(scale, scale, scale)
}

// Creates a star field with 3000 stars
function createStarField() {
  const starGeometry = new THREE.BufferGeometry()
  const starCount = 3000
  const starVertices = []
  const starColors = []
  const colorChoices = [0xffffff, 0xffccaa, 0xaaccff]

  // Create vertices and colors for each star, spread over a 1000 unit cube
  for (let i = 0; i < starCount; i++) {
    starVertices.push(THREE.MathUtils.randFloatSpread(1000)) // x
    starVertices.push(THREE.MathUtils.randFloatSpread(1000)) // y
    starVertices.push(THREE.MathUtils.randFloatSpread(1000)) // z

    const randomColor =
      colorChoices[Math.floor(Math.random() * colorChoices.length)]
    const color = new THREE.Color(randomColor)
    starColors.push(color.r, color.g, color.b)
  }

  // Add position and color attributes to geometry
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  )
  starGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(starColors, 3)
  )

  // Load disc texture for stars
  const disc = new THREE.TextureLoader().load("shader/disc.png")

  // Define material and create the star field using the geometry and material
  const starMaterial = new THREE.PointsMaterial({
    size: 1,
    sizeAttenuation: true,
    vertexColors: true,
    map: disc,
    transparent: true,
  })
  const starField = new THREE.Points(starGeometry, starMaterial)

  return starField
}

function animate() {
  requestAnimationFrame(animate)
  composer.render()
}

// Updates camera and renderer on window resize
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.onload = main
