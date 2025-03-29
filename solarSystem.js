import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { degToRad } from "three/src/math/MathUtils.js"
import { spaceship } from "./spaceship.js"
import { loadSolarSystem } from "./solarSystemLoader.js"

let scene, camera, renderer, composer, gui, orbitControls
let orbitGroups = []
let startAnimation = false
let targetPosition
let traveling = true
let initialRotationApplied = false
let rotationPivotSpaceship
let idle
let spaceshipWorldPosition = new THREE.Vector3()

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

/**
 * Main entry point: initializes renderer, scene, camera, and loads assets
 */
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
  createSpaceship()

  loadSolarSystem((orbitGroup) => {
    // Receive each loaded planet and add it to the scene
    scene.add(orbitGroup)
    orbitGroups.push(orbitGroup)
  }).then(() => {
    startAnimation = true
    gui.controls.updateTarget()
  })

  scene.add(createStarField())
  animate()
  window.addEventListener("resize", onResize, true)
}

/**
 * Initializes the  camera
 */
function initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 200)
  return camera
}

/**
 * Initializes orbit controls and GUI
 */
function initControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.target.copy(spaceship.position)

  const controls = {
    planetSpeed: 0.05,
    spaceshipSpeed: 0.05,
    spaceshipAnimation: false,
    planetAnimation: true,
    target: "Mars",
    pastTarget: "Earth",
    targetWorldPosition: new THREE.Vector3(),
    cameraMode: "Free Roam",

    togglePlanetAnimation() {
      this.planetAnimation = !this.planetAnimation
    },

    updateTarget() {
      const targetData = planetMap[gui.controls.target]
      if (targetData) {
        updateTargetPosition(targetData.index, targetData.offsetY)
      }
    },

    updateIdleAnimation() {
      const pastData = planetMap[gui.controls.pastTarget]
      if (pastData) {
        idle = getIdleSpeed(pastData.index)
      }
    },

    startSpaceshipAnimation() {
      if (!this.spaceshipAnimation) {
        this.spaceshipAnimation = true
      }
    },
  }

  // Setup dat.GUI
  const gui = new GUI()
  gui
    .add(controls, "planetAnimation")
    .name("Planet Animation")
    .onChange(controls.togglePlanetAnimation)
  gui.add(controls, "startSpaceshipAnimation").name("Launch Spaceship")
  gui
    .add(controls, "target", Object.keys(planetMap))
    .onChange(controls.updateTarget)
  gui.add(controls, "planetSpeed", 0.01, 10).name("Planet Speed").step(0.01)
  gui
    .add(controls, "spaceshipSpeed", 0.01, 1)
    .name("Spaceship Speed")
    .step(0.01)
  gui
    .add(controls, "cameraMode", ["Follow Spaceship", "Free Roam"])
    .name("Camera Mode")

  gui.controls = controls
  return gui
}

/**
 * Initializes the composer
 */
function initComposer() {
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  return composer
}

/**
 * Creates the spaceship and adds it to a rotation pivot
 */
function createSpaceship() {
  rotationPivotSpaceship = new THREE.Group()
  rotationPivotSpaceship.position.set(0, 0, 0)

  spaceship.position.set(22, 2.1, 0)
  rotationPivotSpaceship.add(spaceship)
  scene.add(rotationPivotSpaceship)
  spaceship.scale.set(0.05, 0.05, 0.05)
}

/**
 * Sets up scene lighting including ambient, point, and bloom effect
 */
function setupLighting() {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.5 // threshold
  )
  composer.addPass(bloomPass)

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambientLight)

  // Point light simulating the sun
  const pointLight = new THREE.PointLight(0xffffff, 100, 1000)
  scene.add(pointLight)
}

/**
 * Creates a star field using procedural content creation
 */
function createStarField() {
  const starGeometry = new THREE.BufferGeometry()
  const starCount = 3000
  const starVertices = []
  const starColors = []
  const colorChoices = [0xffffff, 0xffccaa, 0xaaccff]

  // Generate random positions and colors for stars
  for (let i = 0; i < starCount; i++) {
    starVertices.push(THREE.MathUtils.randFloatSpread(1000)) // x
    starVertices.push(THREE.MathUtils.randFloatSpread(1000)) // y
    starVertices.push(THREE.MathUtils.randFloatSpread(1000)) // z

    const randomColor =
      colorChoices[Math.floor(Math.random() * colorChoices.length)]
    const color = new THREE.Color(randomColor)
    starColors.push(color.r, color.g, color.b)
  }

  // Set geometry attributes
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

/**
 * Makes the camera follow the spaceship
 */
function followSpaceship(followDistance = 5, offsetY = 1, aimDistance = 10) {
  spaceship.getWorldPosition(spaceshipWorldPosition)
  const backward = new THREE.Vector3()
  spaceship.getWorldDirection(backward)

  // Position the camera behind the spaceship
  const desiredCameraPosition = spaceshipWorldPosition
    .clone()
    .add(backward.clone().multiplyScalar(followDistance))
  desiredCameraPosition.y += offsetY

  // Set the camera target ahead of the spaceship
  const target = spaceshipWorldPosition
    .clone()
    .sub(backward.clone().multiplyScalar(aimDistance))

  // Smooth transition
  camera.position.lerp(desiredCameraPosition, 0.1)
  orbitControls.target.lerp(target, 0.1)
}

/**
 * Updates the target position based on the selected planet
 */
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

/**
 * Orients the spaceship to face the target
 */
function orientSpaceshipToTarget(from, to) {
  // Create a rotation matrix pointing from current to target position
  const matrix = new THREE.Matrix4().lookAt(
    from,
    to,
    new THREE.Vector3(0, 1, 0)
  )
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix)

  const adjustment = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    0
  )
  quaternion.multiply(adjustment)

  // Smoothly rotate the spaceship toward the target orientation
  spaceship.quaternion.slerp(quaternion, 0.05)
}

/**
 * Computes the idle rotation speed based on the planet's orbit speed
 */
function getIdleSpeed(planetIndex) {
  return orbitGroups[planetIndex].userData.orbitSpeed * gui.controls.planetSpeed
}

/**
 * Main animation loop
 */
function animate() {
  requestAnimationFrame(animate)

  if (!startAnimation) return

  const delta = clock.getDelta()

  // Update engine exhaust effects when spaceship is in motion
  if (spaceship.userData.exhaustEmitters) {
    if (gui.controls.spaceshipAnimation && traveling) {
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

  // Animate planet rotations if enabled
  if (gui.controls.planetAnimation) {
    orbitGroups.forEach((orbitGroup) => {
      if (orbitGroup.userData.orbitSpeed) {
        orbitGroup.rotation.y +=
          orbitGroup.userData.orbitSpeed * gui.controls.planetSpeed
      }
    })
  }

  // Handle spaceship animation logic
  if (gui.controls.spaceshipAnimation) {
    spaceship.getWorldPosition(spaceshipWorldPosition)

    // Calculate direction vector toward the target
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, spaceshipWorldPosition)
      .normalize()
    const distance = spaceshipWorldPosition.distanceTo(targetPosition)

    if (traveling) {
      if (distance > 0.1) {
        gui.controls.updateTarget()

        // Apply initial rotation only once
        if (!initialRotationApplied) {
          spaceship.rotation.x = degToRad(0)
          initialRotationApplied = true
        }

        // Orient and move the spaceship toward the target
        orientSpaceshipToTarget(spaceshipWorldPosition, targetPosition)
        spaceship.position.add(
          direction.multiplyScalar(gui.controls.spaceshipSpeed)
        )

        // Only follow the spaceship if in "Follow Spaceship" mode
        if (gui.controls.cameraMode === "Follow Spaceship") {
          followSpaceship()
        }
      } else if (distance <= 0.1) {
        traveling = false
      }
    } else {
      if (gui.controls.cameraMode === "Follow Spaceship") {
        followSpaceship()
      }
      gui.controls.spaceshipAnimation = false
      gui.controls.pastTarget = gui.controls.target
    }
  } else if (gui.controls.planetAnimation) {
    gui.controls.updateIdleAnimation()
    gui.controls.updateTarget()

    // Reset flags for new animation cycle
    traveling = true
    initialRotationApplied = false

    // Rotate the spaceship's pivot to simulate orbit around the sun
    rotationPivotSpaceship.rotation.y += idle
    if (gui.controls.cameraMode === "Follow Spaceship") {
      followSpaceship()
    }
  }

  orbitControls.update()
  composer.render()
}

/**
 * Adjusts camera and renderer sizes on window resize
 */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}

window.onload = main
