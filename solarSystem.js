import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { degToRad } from "three/src/math/MathUtils.js"
import { spaceship } from "./spaceship.js"
import { loadSolarSystem } from "./solarSystemLoader.js"

let scene, camera, renderer, composer, gui, orbitGroups, startAnimation, orbitControls

// Default target planet
let targetPosition
// Speed of translation
let moveSpeed = 0.05
// flags
let traveling = true
let initialRotationApplied = false
// Rotation needed for spaceship to stay on the planet
let rotationPivotSpaceship
let idle
// world position of spaceship
let spaceshipworldPosition = new THREE.Vector3()



function main() {
  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(new THREE.Color(0x000000))
  renderer.setSize(window.innerWidth, window.innerHeight)
  const container = document.createElement("div")
  document.body.appendChild(container)
  container.appendChild(renderer.domElement)

  scene = new THREE.Scene()

  CreateSpaceship()

  orbitGroups = []

  loadSolarSystem((orbitGroup) => {
    // Receive each loaded planet and add it to the scene
    scene.add(orbitGroup)
    orbitGroups.push(orbitGroup)
  }).then((solarSystem) => {
    startAnimation = true
    gui.controls.UpdateTarget()
  })

  camera = initCamera()
  gui = initControls()
  composer = initComposer()

  setupLighting()

  scene.add(createStarField())
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
  camera.position.set(spaceship.position.x, spaceship.position.y + 1, spaceship.position.z)
  return camera
}


// Initialize the controls
function initControls() {

  // Takes over the lookAt function according to documentation
  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.target.set(spaceship.position.x, spaceship.position.y, spaceship.position.z)

  const gui = new GUI()
  gui.controls = new function () {
    this.speed = 0.05
    this.Animation = "Off"
    this.Target = "Mars"
    this.PastTarget = "Earth"
    this.targetWorldPosition = new THREE.Vector3()

    this.UpdateTarget = function () {
      switch (gui.controls.Target) {
        case "Neptune":
          orbitGroups[8].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 2.4, this.targetWorldPosition.z)
          break
        case "Uranus":
          orbitGroups[7].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 1.4, this.targetWorldPosition.z)
          break
        case "Saturn":
          orbitGroups[6].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 1.5, this.targetWorldPosition.z)
          break
        case "Jupiter":
          orbitGroups[5].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 3.4, this.targetWorldPosition.z)
          break
        case "Mars":
          orbitGroups[4].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 1.6, this.targetWorldPosition.z)
          break
        case "Earth":
          orbitGroups[3].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 2.1, this.targetWorldPosition.z)
          break
        case "Venus":
          orbitGroups[2].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 1.8, this.targetWorldPosition.z)
          break
        case "Mercury":
          orbitGroups[1].children[0].getWorldPosition(this.targetWorldPosition);
          targetPosition = new THREE.Vector3(this.targetWorldPosition.x, this.targetWorldPosition.y + 1.3, this.targetWorldPosition.z)
          break
      }
    }

    this.UpdateIdleAnimation = function () {
      switch (gui.controls.PastTarget) {
        case "Neptune":
          idle = orbitGroups[8].userData.orbitSpeed * gui.controls.speed
          break
        case "Uranus":
          idle = orbitGroups[7].userData.orbitSpeed * gui.controls.speed
          break
        case "Saturn":
          idle = orbitGroups[6].userData.orbitSpeed * gui.controls.speed
          break
        case "Jupiter":
          idle = orbitGroups[5].userData.orbitSpeed * gui.controls.speed
          break
        case "Mars":
          idle = orbitGroups[4].userData.orbitSpeed * gui.controls.speed
          break  
        case "Earth":
          idle = orbitGroups[3].userData.orbitSpeed * gui.controls.speed
          break
        case "Venus":
          idle = orbitGroups[2].userData.orbitSpeed * gui.controls.speed
          break
        case "Mercury":
          idle = orbitGroups[1].userData.orbitSpeed * gui.controls.speed
          break
      }
    }

    this.ToggleAnimation = function () {
      if (this.Animation === "Off") {
        this.Animation = "On"  // Turn animation on
      }
      else {
        this.Animation = "Off" // Turn animation off
      }
    }

  }
  gui.add(gui.controls, "ToggleAnimation").name("Start Animation")
  gui.add(gui.controls, "Target", ["Neptune", "Uranus", "Saturn", "Jupiter", "Mars", "Earth", "Venus", "Mercury"]).onChange((() => gui.controls.UpdateTarget()))

  return gui
}

// Initialize the composer
function initComposer() {
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  return composer
}


function CreateSpaceship() {
  rotationPivotSpaceship = new THREE.Group()
  rotationPivotSpaceship.position.set(0, 0, 0)

  spaceship.position.set(22, 2.1, 0)
  spaceship.rotation.x = degToRad(90)

  rotationPivotSpaceship.add(spaceship)
  scene.add(rotationPivotSpaceship)

  spaceship.scale.set(0.05, 0.05, 0.05) 
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
  requestAnimationFrame(animate);

  if (startAnimation) {
    orbitGroups.forEach((orbitGroup) => {
      if (orbitGroup.userData.orbitSpeed) {
        orbitGroup.rotation.y += orbitGroup.userData.orbitSpeed * gui.controls.speed
      }
    })

    // Calculate the direction towards the target
    var direction = new THREE.Vector3().subVectors(targetPosition, spaceshipworldPosition)
    direction.normalize()
    var distance = spaceshipworldPosition.distanceTo(targetPosition)
    
    if (gui.controls.Animation == "On") {
      if (traveling) {

        if (distance > 0.1) {
          gui.controls.UpdateTarget()

          // Move the spaceship sideways
          if (!initialRotationApplied) {
            spaceship.rotation.x = degToRad(0)
            initialRotationApplied = true
          }
          
          // Move the spaceship in direction of the target planet
          if (targetPosition.x > spaceshipworldPosition.x) {
            spaceship.rotation.y = degToRad(-90) // Look right
          } 
          else {
            spaceship.rotation.y = degToRad(90) // Look left
          }

          // Move spaceship towards the target
          spaceship.position.add(direction.multiplyScalar(moveSpeed))

      
          // Update camera position to follow spaceship
          spaceship.getWorldPosition(spaceshipworldPosition);
          camera.position.set(spaceshipworldPosition.x,spaceshipworldPosition.y + 1, spaceshipworldPosition.z)
          orbitControls.target.set(spaceshipworldPosition.x, spaceshipworldPosition.y, spaceshipworldPosition.z)
        }

        // Landing
        else if (distance <= 0.1) {
          traveling = false
        }

      }

      else if (!traveling) {
        // Reset rotation / Landing
        spaceship.rotation.x = degToRad(90);
        spaceship.rotation.y = degToRad(0);
        
                  
        // Update camera position to follow spaceship
        spaceship.getWorldPosition(spaceshipworldPosition);
        camera.position.set(spaceshipworldPosition.x,spaceshipworldPosition.y + 1, spaceshipworldPosition.z)
        orbitControls.target.set(spaceshipworldPosition.x, spaceshipworldPosition.y, spaceshipworldPosition.z)

        gui.controls.Animation = "Off"
        gui.controls.PastTarget = gui.controls.Target
      }
      
    }

    else {
      gui.controls.UpdateIdleAnimation()
      gui.controls.UpdateTarget()

      //resetting flags
      traveling = true
      initialRotationApplied = false; 

      // Mimic the planet rotation around the sun
      rotationPivotSpaceship.rotation.y += idle

      // Update camera position to follow spaceship
      spaceship.getWorldPosition(spaceshipworldPosition);
      camera.position.set(spaceshipworldPosition.x,spaceshipworldPosition.y + 1, spaceshipworldPosition.z)
      orbitControls.target.set(spaceshipworldPosition.x, spaceshipworldPosition.y, spaceshipworldPosition.z)
    }

    orbitControls.update()
    composer.render()
  }
}



// Updates camera and renderer on window resize
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}


window.onload = main
