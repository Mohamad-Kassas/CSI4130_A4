import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

let scene, camera, renderer, composer, gui

// Main: sets up renderer, scene, camera, and solar system components
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

  scene.add(createSolarSystem())
  scene.add(createStarField())

  // Add bloom effect to the stars (and sun)
  addStarLight()

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

// Initialize the controls
function initControls() {
  const orbitControls = new OrbitControls(camera, renderer.domElement)
  const gui = new GUI()
  const controls = { temp: 0 }
  gui.add(controls, "temp", -10, 10).onChange(controls.redraw)

  return gui
}

function initComposer() {
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  return composer
}

// Create the solar system
function createSolarSystem() {
  const solarSystem = new THREE.Group()
  scene.add(solarSystem)

  // Create sun and add to solar system
  const sun = createPlanet({ x: 0, y: 0, z: 0 }, 5, "yellow", 32)
  solarSystem.add(sun)

  // Create earth group with earth and moon, then add to solar system
  const earth = createPlanet({ x: 0, y: 0, z: 0 }, 2, "blue", 8)
  const moon = createPlanet({ x: 0, y: 3, z: 0 }, 0.5, "grey", 8)
  const earthGroup = createGroup([earth, moon], { x: 15, y: 0, z: 0 })
  solarSystem.add(earthGroup)

  // Create saturn group with planet and ring, then add to solar system
  const saturn = createPlanet({ x: 0, y: 0, z: 0 }, 3, "saddlebrown", 16)
  const ring = createRing({ x: 0, y: 0, z: 0 }, 4, 0.5, "dimgray")
  const saturnGroup = createGroup([saturn, ring], {
    x: 35 * Math.cos(Math.PI / 6),
    y: 35 * Math.sin(Math.PI / 6),
    z: 0,
  })
  solarSystem.add(saturnGroup)

  return solarSystem
}

// Creates a planet mesh at a given position with specified radius, color, and segment count
function createPlanet(pos, radius, color, segments = 32) {
  const material = new THREE.MeshBasicMaterial({ color })
  const geometry = new THREE.SphereGeometry(radius, segments, segments)
  const planet = new THREE.Mesh(geometry, material)
  planet.position.set(pos.x, pos.y, pos.z)
  return planet
}

// Creates a ring mesh at a given position with specified ring radius, tube thickness, and color
function createRing(pos, ringRadius, tubeThickness, color) {
  const material = new THREE.MeshBasicMaterial({ color })
  const geometry = new THREE.TorusGeometry(ringRadius, tubeThickness, 32, 16)
  const ring = new THREE.Mesh(geometry, material)
  ring.position.set(pos.x, pos.y, pos.z)
  ring.scale.z = 0.1
  return ring
}

// Creates a group with given children and position, then adds it to the parent
function createGroup(children, pos) {
  const group = new THREE.Group()
  group.position.set(pos.x, pos.y, pos.z)
  children.forEach((child) => group.add(child))
  return group
}

// Creates a star field with 2000 stars
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
  })
  const starField = new THREE.Points(starGeometry, starMaterial)

  return starField
}

// Adds a bloom effect to the scene
function addStarLight() {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.2 // threshold
  )
  composer.addPass(bloomPass)
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
