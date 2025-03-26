import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { degToRad } from "three/src/math/MathUtils.js"

let scene, camera, renderer, composer, gui, orbitControls

// Temporary Capsule Object
let capsule;
// Default target planet
let targetPosition = new THREE.Vector3(31.5 * Math.cos(Math.PI / 6), 35 * Math.sin(Math.PI / 6), 0)
// Speed of translation
let moveSpeed = 0.025;
let traveling = true;
// Track the current rotation in radians
let currentRotation = 0; 
// Speed of landing rotation
let rotationSpeed = degToRad(0.25)


// Main: sets up renderer, scene, camera, and solar system components
function main() {
  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(new THREE.Color(0x000000))
  renderer.setSize(window.innerWidth, window.innerHeight)
  const container = document.createElement("div")
  document.body.appendChild(container)
  container.appendChild(renderer.domElement)
  
  scene = new THREE.Scene()

  // Temporary Capsule Object
  const material = new THREE.MeshBasicMaterial({ color: "grey" })
  const geometry = new THREE.CapsuleGeometry(0.5)
  capsule = new THREE.Mesh(geometry, material)
  capsule.scale.set(0.1, 0.1, 0.1);
  capsule.position.set(17.1, 0, 0)
  capsule.rotation.z = degToRad(90) 
  scene.add(capsule)


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
    0.1,
    1000
  )
  camera.position.set(capsule.position.x, capsule.position.y, 0.5)
  return camera
}

// Initialize the controls
function initControls() {
  // Takes over the lookAt function according to documentation
  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.target.set(capsule.position.x, capsule.position.y, capsule.position.z)

  const gui = new GUI()
  gui.controls = new function () { 
    this.Animation = "Off"; 
    this.Target = "Jupiter"
    this.PastTarget = "Earth"

    
    this.UpdateTarget = function(){
      switch (gui.controls.Target){
        case "Jupiter": 
          targetPosition = new THREE.Vector3(31.5 * Math.cos(Math.PI / 6), 35 * Math.sin(Math.PI / 6), 0)
          break
        case "Earth": 
          if(this.PastTarget == "Sun Test"){ // If starting postition is the sun we land on left side of earth
            targetPosition = new THREE.Vector3(13, 0, 0)
          }
          else{
            targetPosition = new THREE.Vector3(17.05, 0, 0)
          }
          break
        case "Sun Test": 
          targetPosition = new THREE.Vector3(5.05, 0, 0)
          break
      }
    }
    

    this.ToggleAnimation = function() {
      if (this.Animation === "Off") {
        this.Animation = "On";  // Turn animation on
      } 
      else {
        this.Animation = "Off"; // Turn animation off
      }
    }
    
  }
  
  gui.add(gui.controls, "ToggleAnimation").name("Start Animation")
  gui.add(gui.controls, "Target", ["Jupiter", "Earth", "Sun Test"]).onChange((() => gui.controls.UpdateTarget()));
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
  const sun = createPlanet({ x: 0, y: 0, z: 0 }, 5, "yellow")
  solarSystem.add(sun)

  // Create earth group with earth and moon, then add to solar system
  const earth = createPlanet({ x: 0, y: 0, z: 0 }, 2, "blue")
  const moon = createPlanet({ x: 0, y: 3, z: 0 }, 0.5, "grey")
  const earthGroup = createGroup([earth, moon], { x: 15, y: 0, z: 0 })
  solarSystem.add(earthGroup)

  // Create saturn group with planet and ring, then add to solar system
  const saturn = createPlanet({ x: 0, y: 0, z: 0 }, 3, "saddlebrown")
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
  requestAnimationFrame(animate);

  // Calculate the direction towards the target
  const direction = new THREE.Vector3().subVectors(targetPosition, capsule.position);
  direction.normalize();
  const distance = capsule.position.distanceTo(targetPosition);

  // Start animation TODO: add collision detection to avoid planets in our path
  if(gui.controls.Animation == "On"){
    if (traveling) {

      if (distance > 0.3){

        // Move capsule towards the target
        capsule.position.add(direction.multiplyScalar(moveSpeed));

        // Update camera position to follow capsule
        camera.position.set(capsule.position.x, capsule.position.y, 0.5)
        orbitControls.target.set(capsule.position.x, capsule.position.y, capsule.position.z);
      }   


      // Start rotating by 180 only if the capsule is a certain distance away from the target
      else if (distance <= 0.3 && currentRotation <= Math.PI) {
        capsule.rotation.z += rotationSpeed;
        currentRotation += rotationSpeed;
      }

      // Start landing 
      else if(currentRotation >= Math.PI){
        traveling = false;
      } 
    
    } 

    else if(!traveling){

      if(distance > 0.1){

        // Finalize the landing
        capsule.position.add(direction.multiplyScalar(moveSpeed));

        // Update camera position and lookAt to follow capsule
        camera.position.set(capsule.position.x, capsule.position.y, 0.5)
        orbitControls.target.set(capsule.position.x, capsule.position.y, capsule.position.z);
      }
      // Landing over / Reset animation button and save starting planet
      else{
        gui.controls.Animation = "Off"
        gui.controls.PastTarget = gui.controls.Target
      }
    }
 
  }
  // Reset variables 
  else{
    traveling = true
    currentRotation = 0
  }

  orbitControls.update();
  composer.render();
}

// Updates camera and renderer on window resize
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}


window.onload = main
