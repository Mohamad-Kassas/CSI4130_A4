import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

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

// Create the solar system
function createSolarSystem() {
  const solarSystem = new THREE.Group()

  // Create the Sun
  const sun = createPlanet({ x: 0, y: 0, z: 0 }, 5, 0xffff00)
  solarSystem.add(sun)

  // Mercury
  const mercury = createPlanet({ x: 0, y: 0, z: 0 }, 0.5, 0x808080)
  const mercuryGroup = createGroup([mercury], { x: 10, y: 0, z: 0 })
  solarSystem.add(mercuryGroup)

  // Venus
  const venus = createPlanet({ x: 0, y: 0, z: 0 }, 0.8, 0xE06900)
  const venusGroup = createGroup([venus], { x: 15, y: 0, z: 0 })
  solarSystem.add(venusGroup)

  // Earth
  const earth = createPlanet({ x: 0, y: 0, z: 0 }, 1, 0x0000ff)
  const earthGroup = createGroup([earth], { x: 20, y: 0, z: 0 })
  solarSystem.add(earthGroup)

  // Mars
  const mars = createPlanet({ x: 0, y: 0, z: 0 }, 0.6, 0xff0000)
  const marsGroup = createGroup([mars], { x: 25, y: 0, z: 0 })
  solarSystem.add(marsGroup)

  // Jupiter
  const jupiter = createPlanet({ x: 0, y: 0, z: 0 }, 2, 0xD3A15F)
  const jupiterGroup = createGroup([jupiter], { x: 35, y: 0, z: 0 })
  solarSystem.add(jupiterGroup)

  // Saturn with ring
  const saturn = createPlanet({ x: 0, y: 0, z: 0 }, 1.8, 0xf4a460)
  const ring = createRing({ x: 0, y: 0, z: 0 }, 3, 0.3, 0x696969)
  const saturnGroup = createGroup([saturn, ring], { x: 45, y: 0, z: 0 })
  solarSystem.add(saturnGroup)

  // Uranus
  const uranus = createPlanet({ x: 0, y: 0, z: 0 }, 1.2, 0xadd8e6)
  const uranusGroup = createGroup([uranus], { x: 55, y: 0, z: 0 })
  solarSystem.add(uranusGroup)

  // Neptune
  const neptune = createPlanet({ x: 0, y: 0, z: 0 }, 1.2, 0x0000ff)
  const neptuneGroup = createGroup([neptune], { x: 65, y: 0, z: 0 })
  solarSystem.add(neptuneGroup)

  return solarSystem
}

// Creates a planet mesh at a given position with specified radius, color, and segment count
function createPlanet(pos, radius, color) {
  const material = new THREE.MeshBasicMaterial({ color })
  const geometry = new THREE.SphereGeometry(radius, 32, 32)
  const planet = new THREE.Mesh(geometry, material)
  planet.position.set(pos.x, pos.y, pos.z)
  return planet
}

// Creates a ring mesh at a given position with specified ring radius, tube thickness, and color
function createRing(pos, ringRadius, tubeThickness, color) {
  const material = new THREE.MeshBasicMaterial({ color })
  const geometry = new THREE.TorusGeometry(ringRadius, tubeThickness, 32, 32)
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

// Adds a bloom effect to the scene
function addStarLight() {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.3 // threshold
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
