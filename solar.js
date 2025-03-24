import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

let scene
let camera
let renderer
let gui

// Main: sets up renderer, scene, camera, and solar system components
function main() {
  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(new THREE.Color(0x111111))
  renderer.setSize(window.innerWidth, window.innerHeight)
  const container = document.createElement("div")
  document.body.appendChild(container)
  container.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = initCamera()
  gui = initControls()

  scene.add(createSolarSystem())

  render(scene)
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

// Continuously renders the scene
function render(scene) {
  requestAnimationFrame(() => render(scene))
  renderer.render(scene, camera)
}

// Updates camera and renderer on window resize
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.onload = main
