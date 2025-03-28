import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { degToRad } from "three/src/math/MathUtils.js"
import { spaceship } from "./spaceship.js"
import { loadSolarSystem } from "./solarSystemLoader.js"

let scene,
  camera,
  renderer,
  composer,
  gui,
  orbitGroups,
  startAnimation,
  orbitControls

const clock = new THREE.Clock()

const planetMap = {
  Mercury: { index: 1, offsetY: 1.3 },
  Venus: { index: 2, offsetY: 1.8 },
  Earth: { index: 3, offsetY: 2.1 },
  Mars: { index: 4, offsetY: 1.6 },
  Jupiter: { index: 5, offsetY: 3.4 },
  Saturn: { index: 6, offsetY: 1.5 },
  Uranus: { index: 7, offsetY: 1.4 },
  Neptune: { index: 8, offsetY: 2.4 },
}

// Default target planet
let targetPosition
// Speed of translation
let moveSpeed = 0.05
// Flags
let traveling = true
let initialRotationApplied = false
// Rotation pivot for the spaceship
let rotationPivotSpaceship
let idle
// World position of the spaceship
let spaceshipworldPosition = new THREE.Vector3()

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
  orbitGroups = []

  setupLighting()
  createSpaceship()

  loadSolarSystem((orbitGroup) => {
    // Receive each loaded planet and add it to the scene
    scene.add(orbitGroup)
    orbitGroups.push(orbitGroup)
  }).then((solarSystem) => {
    startAnimation = true
    gui.controls.updateTarget()
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
    0.1,
    1000
  )
  camera.position.set(
    spaceship.position.x,
    spaceship.position.y + 1,
    spaceship.position.z
  )
  return camera
}

// Initialize the controls
function initControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.target.set(
    spaceship.position.x,
    spaceship.position.y,
    spaceship.position.z
  )

  const controls = {
    speed: 0.05,
    animation: false,
    target: "Mars",
    pastTarget: "Earth",
    targetWorldPosition: new THREE.Vector3(),

    updateTarget() {
      const target = planetMap[gui.controls.target]
      if (target) updateTargetPosition(target.index, target.offsetY)
    },

    updateIdleAnimation() {
      const past = planetMap[gui.controls.pastTarget]
      if (past) idle = getIdleSpeed(past.index)
    },

    toggleAnimation() {
      this.animation = !this.animation
    },
  }

  const gui = new GUI()
  gui.add(controls, "toggleAnimation").name("Start animation")
  gui
    .add(controls, "target", Object.keys(planetMap))
    .onChange(controls.updateTarget)
  gui.add(controls, "speed", 0.01, 1).name("Speed").step(0.01)

  gui.controls = controls

  return gui
}

// Initialize the composer
function initComposer() {
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  return composer
}

function createSpaceship() {
  rotationPivotSpaceship = new THREE.Group()
  rotationPivotSpaceship.position.set(0, 0, 0)

  spaceship.position.set(22, 2.1, 0)

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

// Follow the spaceship with the camera
function followSpaceship(offsetY = 1) {
  spaceship.getWorldPosition(spaceshipworldPosition)

  const desiredPosition = new THREE.Vector3(
    spaceshipworldPosition.x,
    spaceshipworldPosition.y + offsetY,
    spaceshipworldPosition.z
  )

  camera.position.lerp(desiredPosition, 0.1) // smooth transition
  orbitControls.target.lerp(spaceshipworldPosition, 0.1)
}

// Update the target position based on the selected planet and offset
function updateTargetPosition(planetIndex, offsetY) {
  orbitGroups[planetIndex].children[0].getWorldPosition(
    gui.controls.targetWorldPosition
  )
  targetPosition = new THREE.Vector3(
    gui.controls.targetWorldPosition.x,
    gui.controls.targetWorldPosition.y + offsetY,
    gui.controls.targetWorldPosition.z
  )
}

// Orient the spaceship to face the target position
function orientSpaceshipToTarget(from, to) {
  const matrix = new THREE.Matrix4().lookAt(
    from,
    to,
    new THREE.Vector3(0, 1, 0)
  )
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix)
  spaceship.quaternion.slerp(quaternion, 0.05)
}

// Get the idle speed of the planet based on its index
function getIdleSpeed(planetIndex) {
  return orbitGroups[planetIndex].userData.orbitSpeed * gui.controls.speed
}

function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // Update engine exhaust depending on if spaceship is travelling or not
  if (spaceship.userData.exhaustEmitters) {
    if (gui.controls.animation && traveling) {
      spaceship.userData.exhaustEmitters.forEach((emitter) => {
        emitter.visible = true
        emitter.userData.update(delta)
      })
    } else {
      spaceship.userData.exhaustEmitters.forEach((emitter) => {
        emitter.visible = false
      })
    }
  }

  if (startAnimation) {
    orbitGroups.forEach((orbitGroup) => {
      if (orbitGroup.userData.orbitSpeed) {
        orbitGroup.rotation.y +=
          orbitGroup.userData.orbitSpeed * gui.controls.speed
      }
    })

    // Update spaceship world position.
    spaceship.getWorldPosition(spaceshipworldPosition)

    // Calculate the normalized direction toward the target.
    let direction = new THREE.Vector3()
      .subVectors(targetPosition, spaceshipworldPosition)
      .normalize()
    let distance = spaceshipworldPosition.distanceTo(targetPosition)

    if (gui.controls.animation) {
      if (traveling) {
        if (distance > 0.1) {
          gui.controls.updateTarget()

          // Apply initial rotation only once
          if (!initialRotationApplied) {
            spaceship.rotation.x = degToRad(0)
            initialRotationApplied = true
          }

          // Orient the spaceship to face the target position
          orientSpaceshipToTarget(spaceshipworldPosition, targetPosition)

          // Moving the spaceship toward the target
          spaceship.position.add(direction.multiplyScalar(moveSpeed))

          followSpaceship()
        } else if (distance <= 0.1) {
          traveling = false
        }
      } else if (!traveling) {
        followSpaceship()

        gui.controls.animation = false
        gui.controls.pastTarget = gui.controls.target
      }
    } else {
      gui.controls.updateIdleAnimation()
      gui.controls.updateTarget()

      //resetting flags
      traveling = true
      initialRotationApplied = false

      // Mimic the planet rotation around the sun
      rotationPivotSpaceship.rotation.y += idle

      followSpaceship()
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
