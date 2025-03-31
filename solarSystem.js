import * as THREE from "three"
import { GUI } from "dat.gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { spaceship } from "./spaceship.js"
import { loadSolarSystem } from "./solarSystemLoader.js"
import { loadWallE } from "./wallE.js"
import { loadEve } from "./eve.js"

let scene, camera, renderer, composer, gui, orbitControls
let orbitGroups = []
let startAnimation = false
let targetPosition
let rotationPivotSpaceship
let idle
let spaceshipWorldPosition = new THREE.Vector3()
let spaceshipSpeed = 0.1
let interceptionPoint = null

const clock = new THREE.Clock()

const keysPressed = {}

window.addEventListener("keydown", (event) => {
  keysPressed[event.key.toLowerCase()] = true
})

window.addEventListener("keyup", (event) => {
  keysPressed[event.key.toLowerCase()] = false
})

const planetMap = {
  Mercury: { index: 1, offsetY: 1.3 },
  Venus: { index: 2, offsetY: 1.8 },
  Earth: { index: 3, offsetY: 2.1 },
  Mars: { index: 4, offsetY: 1.6 },
  Jupiter: { index: 5, offsetY: 3.4 },
  Saturn: { index: 6, offsetY: 1.5 },
  Uranus: { index: 7, offsetY: 2.4 },
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

    // Attach wall-e to earth
    const earthOrbitGroup = orbitGroups[planetMap.Earth.index]
    const earthPlanetGroup = earthOrbitGroup.children[0]
    const earthModel = earthPlanetGroup.children[0]

    const box = new THREE.Box3().setFromObject(earthModel)
    const size = new THREE.Vector3()
    box.getSize(size)
    const yOffset = size.y / 2
    scene.userData.earthRadius = yOffset

    createEve()

    loadWallE(({ wallE, mixer }) => {
      wallE.position.set(0, yOffset, 0)
      earthPlanetGroup.add(wallE)
      scene.userData.wallE = wallE
      scene.userData.wallEMixer = mixer
    })
  })

  scene.add(createStarField())
  animate()
  window.addEventListener("resize", onResize, true)
}

/**
 * Initializes the camera
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
    spaceshipAnimation: false,
    planetAnimation: true,
    target: "Mars",
    pastTarget: "Earth",
    targetWorldPosition: new THREE.Vector3(),
    cameraMode: "Follow Wall-E",

    togglePlanetAnimation() {
      this.planetAnimation = !this.planetAnimation
    },

    updateTarget() {
      const targetData = planetMap[this.target]
      if (targetData) {
        updateTargetPosition(targetData.index, targetData.offsetY)
      }
    },

    updateIdleAnimation() {
      const pastData = planetMap[this.pastTarget]
      if (pastData) {
        idle = getIdleSpeed(pastData.index)
      }
    },

    startSpaceshipAnimation() {
      if (!this.spaceshipAnimation) {
        // Remove Wall-E from the planet
        removeWallE()

        // Detach spaceship from its rotation pivot (if attached) so that it moves in world space
        if (spaceship.parent !== scene) {
          const worldPos = new THREE.Vector3()
          spaceship.getWorldPosition(worldPos)
          rotationPivotSpaceship.remove(spaceship)
          spaceship.position.copy(worldPos)
          scene.add(spaceship)
        }
        // Get the target planet data and its current world position
        const targetData = planetMap[this.target]
        if (targetData) {
          const planetIndex = targetData.index
          const offsetY = targetData.offsetY
          let targetPlanetStart = new THREE.Vector3()
          orbitGroups[planetIndex].children[0].getWorldPosition(
            targetPlanetStart
          )
          targetPlanetStart.y += offsetY
          
          if (!this.planetAnimation) {
            // Planet animation is off: go directly to the planet's current position
            targetPosition = targetPlanetStart.clone()
            this.spaceshipAnimation = true
          } else {
            // Planet animation is on: use the interception calculation as before
            const planetAngularSpeed =
              orbitGroups[planetIndex].userData.orbitSpeed * this.planetSpeed
          // Use the spaceship's world position for computation
            const spaceshipStart = new THREE.Vector3()
            spaceship.getWorldPosition(spaceshipStart)
            const result = computeInterception(
              spaceshipStart,
              targetPlanetStart,
              planetAngularSpeed,
              0.1
            )
            if (result) {
              interceptionPoint = result.interceptionPoint
              targetPosition = interceptionPoint.clone()
              this.spaceshipAnimation = true
            }
          }
        }
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
    .add(controls, "cameraMode", ["Follow Wall-E", "Free Roam"])
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
  const disc = new THREE.TextureLoader().load("models/disc.png")

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
 * Creates Eve object and places her on a random planet
 */
function createEve() {
  // Select a random planet
  const planetNames = Object.keys(planetMap).filter(
    name => name !== "Earth" && name !== "Uranus"
  )
  const randomPlanetName =
    planetNames[Math.floor(Math.random() * planetNames.length)]
  const randomPlanetData = planetMap[randomPlanetName]
  const randomOrbitGroup = orbitGroups[randomPlanetData.index]
  const randomPlanetGroup = randomOrbitGroup.children[0]
  const randomPlanetModel = randomPlanetGroup.children[0]

  // Get the planet's bounding box and estimate its radius
  const randomBox = new THREE.Box3().setFromObject(randomPlanetModel)
  const randomSize = new THREE.Vector3()
  randomBox.getSize(randomSize)
  const planetRadius = randomSize.y / 2

  // Generate a random point on the sphere’s surface
  const minPhi = Math.PI / 4
  const maxPhi = (3 * Math.PI) / 4
  const phi = Math.random() * (maxPhi - minPhi) + minPhi
  const theta = Math.random() * Math.PI * 2

  const randomPosition = new THREE.Vector3(
    planetRadius * Math.sin(phi) * Math.cos(theta),
    planetRadius * Math.cos(phi),
    planetRadius * Math.sin(phi) * Math.sin(theta)
  )

  const surfaceNormal = randomPosition.clone().normalize()

  // Load Eve and place her at the random spot
  loadEve(({ eve, mixer }) => {
    eve.position.copy(randomPosition)
    const upVector = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, surfaceNormal)
    eve.quaternion.copy(quaternion)

    randomPlanetGroup.add(eve)
    scene.userData.eve = eve
    scene.userData.eveMixer = mixer
    console.log(`Eve placed on ${randomPlanetName} at`, randomPosition)
  })
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

// Follow Wall-E with the camera
function followWallE(followDistance = 0.8, offsetY = 0.1, aimDistance = 10) {
  const wallE = scene.userData.wallE
  if (wallE) {
    const wallEWorldPosition = new THREE.Vector3()
    wallE.getWorldPosition(wallEWorldPosition)

    const direction = new THREE.Vector3()
    wallE.getWorldDirection(direction)

    // Positioning the camera behind Wall-E
    const desiredCameraPosition = wallEWorldPosition
      .clone()
      .sub(direction.clone().multiplyScalar(followDistance))
    desiredCameraPosition.y += offsetY

    // Making camera look in front of Wall-E
    const target = wallEWorldPosition
      .clone()
      .add(direction.clone().multiplyScalar(aimDistance))

    camera.position.copy(desiredCameraPosition)
    orbitControls.target.copy(target)
  }
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
 * Computes the interception point, time, and best direction for the spaceship
 */
function computeInterception(
  spaceshipStart,
  planetStart,
  planetAngularSpeed,
  spaceshipSpeed = 0.1
) {
  // f(t) returns the difference between the distance from spaceshipStart to the planet's position at time t and the distance the spaceship can travel in time t
  function compareTotalAndPossibleDistance(t) {
    const rotatedPlanet = planetStart.clone()
    const angle = planetAngularSpeed * t
    rotatedPlanet.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
    return spaceshipStart.distanceTo(rotatedPlanet) - spaceshipSpeed * t
  }

  let minTimeThreshold = 0
  let maxTimeThreshold = 1000

  if (compareTotalAndPossibleDistance(maxTimeThreshold) > 0) {
    console.warn(
      "Interception not found within the time bounds. Consider increasing the upper bound."
    )
    return null
  }

  let averageTime
  for (let i = 0; i < 50; i++) {
    averageTime = (minTimeThreshold + maxTimeThreshold) / 2
    const distanceDifference = compareTotalAndPossibleDistance(averageTime)
    if (Math.abs(distanceDifference) < 1e-6) break
    if (distanceDifference > 0) {
      minTimeThreshold = averageTime
    } else {
      maxTimeThreshold = averageTime
    }
  }

  // Compute the interception point by rotating the planet's start position by the found angle
  const interceptionPoint = planetStart.clone()
  interceptionPoint.applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    planetAngularSpeed * averageTime
  )
  // Determine the best direction from the spaceship's start to the interception point
  const bestDirection = interceptionPoint
    .clone()
    .sub(spaceshipStart)
    .normalize()

  return {
    interceptionPoint,
    interceptionTime: averageTime,
    bestDirection,
  }
}

/**
 * Main animation loop
 */
function animate() {
  requestAnimationFrame(animate)
  if (!startAnimation) return

  const delta = clock.getDelta()

  updateExhaust(delta)
  updatePlanets(delta)
  updateSpaceshipMovement(delta)
  updateWallEMovement(delta)
  orbitControls.update()
  composer.render()
}

/**
 * Update engine exhaust effects for the spaceship
 */
function updateExhaust(delta) {
  if (!spaceship.userData.exhaustEmitters) return

  if (gui.controls.spaceshipAnimation) {
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

/**
 * Update planet rotations based on the current animation mode
 */
function updatePlanets(delta) {
  if (!gui.controls.planetAnimation) return

  // Update rotation for each orbit group
  orbitGroups.forEach((orbitGroup) => {
    if (orbitGroup.userData.orbitSpeed) {
      orbitGroup.rotation.y +=
        orbitGroup.userData.orbitSpeed * gui.controls.planetSpeed
    }
  })
}

/**
 * Update spaceship movement based on the current animation mode
 * */
function updateSpaceshipMovement(delta) {
  if (!gui.controls.spaceshipAnimation) {
    gui.controls.updateTarget()
  }

  if (gui.controls.spaceshipAnimation) {
    handleActiveSpaceshipMovement()
  } else if (gui.controls.planetAnimation) {
    handleIdleSpaceshipAnimation()
  }

  if (gui.controls.cameraMode === "Follow Spaceship") {
    followSpaceship()
  } else if (gui.controls.cameraMode === "Follow Wall-E") {
    followWallE()
  }
}

/**
 * Update Wall-E movement
 * */
function updateWallEMovement(delta) {
  const wallE = scene.userData.wallE
  if (!wallE) return

  if (gui.controls.cameraMode === "Follow Wall-E") {
    followWallE()
  }

  const earthRadius = scene.userData.earthRadius

  const moveSpeed = 0.5
  const turnSpeed = Math.PI / 2
  const pos = wallE.position.clone()
  const normal = pos.clone().normalize()

  if (keysPressed["a"]) {
    wallE.rotateOnWorldAxis(normal, turnSpeed * delta)
  }
  if (keysPressed["d"]) {
    wallE.rotateOnWorldAxis(normal, -turnSpeed * delta)
  }

  let forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(wallE.quaternion)
    .normalize()
  forward.projectOnPlane(normal).normalize()

  let moveInput = 0
  if (keysPressed["w"]) moveInput -= 1
  if (keysPressed["s"]) moveInput += 1

  if (moveInput !== 0) {
    const arcLength = moveSpeed * delta
    const angle = arcLength / earthRadius
    const moveAngle = angle * moveInput

    const rotationAxis = new THREE.Vector3()
      .crossVectors(pos, forward)
      .normalize()
    wallE.position.applyAxisAngle(rotationAxis, moveAngle)
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(
      rotationAxis,
      moveAngle
    )
    wallE.quaternion.premultiply(rotQuat)
    const newNormal = wallE.position.clone().normalize()
    wallE.up.copy(newNormal)
  }
}

/**
 * Removes Wall-E from wherever it is in the scene
 * */
function removeWallE() {
  const wallE = scene.userData.wallE
  if (wallE?.parent) {
    wallE.parent.remove(wallE)
    console.log("Wall-E removed from the scene")
    delete scene.userData.wallE
    delete scene.userData.wallEMixer
  }
}

/**
 * Adds Wall-E to the planet specified by its name and resets camera mode
 * */
function addWallE(planet) {
  const planetData = planetMap[planet]
  if (!planetData) {
    console.warn(`Planet "${planet}" not found in planetMap`)
    return
  }
  const planetIndex = planetData.index
  const planetGroup = orbitGroups[planetIndex].children[0]

  // Compute the planet's y offset using its first child
  const planetModel = planetGroup.children[0]
  const box = new THREE.Box3().setFromObject(planetModel)
  const size = new THREE.Vector3()
  box.getSize(size)
  let yOffset = size.y / 2
  if (planet === "Uranus") {
    // The uranus 3d model is not a perfect square, so we need to adjust the yOffset
    yOffset -= 0.38
  }

  loadWallE(({ wallE, mixer }) => {
    wallE.position.set(0, yOffset, 0)
    planetGroup.add(wallE)
    wallE.updateMatrixWorld(true)
    scene.userData.wallE = wallE
    scene.userData.wallEMixer = mixer
    console.log(`Wall‑E loaded and added to ${planet}`)
  })

  // Reset the camera mode to "Follow Wall-E" if needed
  if (gui.controls.cameraMode === "Follow Spaceship") {
    gui.controls.cameraMode = "Follow Wall-E"

    const camModeController = gui.__controllers.find(
      (c) => c.property === "cameraMode"
    )
    if (camModeController) {
      gui.remove(camModeController)
    }

    gui
      .add(gui.controls, "cameraMode", ["Follow Wall-E", "Free Roam"])
      .name("Camera Mode")
  }
}

/**
 * Handles the movement of the spaceship toward its target
 */
function handleActiveSpaceshipMovement() {
  // Once the spaceship starts travelling, update camera mode option to "Follow Spaceship"
  if (gui.controls.cameraMode === "Follow Wall-E") {
    gui.controls.cameraMode = "Follow Spaceship"

    const camModeController = gui.__controllers.find(
      (c) => c.property === "cameraMode"
    )
    if (camModeController) {
      gui.remove(camModeController)
    }

    gui
      .add(gui.controls, "cameraMode", ["Follow Spaceship", "Free Roam"])
      .name("Camera Mode")
  }

  spaceship.getWorldPosition(spaceshipWorldPosition)
  const direction = new THREE.Vector3()
    .subVectors(targetPosition, spaceshipWorldPosition)
    .normalize()
  const distance = spaceshipWorldPosition.distanceTo(targetPosition)

  // When the spaceship is very close, "land" it on the target planet
  if (distance <= 0.1) {
    gui.controls.spaceshipAnimation = false
    gui.controls.pastTarget = gui.controls.target

    const targetData = planetMap[gui.controls.target]
    if (targetData) {
      const planetIndex = targetData.index
      const targetPlanet = orbitGroups[planetIndex].children[0]

      const worldPos = new THREE.Vector3()
      spaceship.getWorldPosition(worldPos)
      targetPlanet.worldToLocal(worldPos)
      spaceship.position.copy(worldPos)

      targetPlanet.add(spaceship)

      addWallE(gui.controls.target)
    }
    return
  }

  orientSpaceshipToTarget(spaceshipWorldPosition, targetPosition)
  spaceship.position.add(direction.multiplyScalar(spaceshipSpeed))
}

/**
 * Handles the idle animation when the spaceship animation is off
 */
function handleIdleSpaceshipAnimation() {
  // Update the rotation pivot for idle animation
  rotationPivotSpaceship.rotation.y += getIdleSpeed(
    planetMap[gui.controls.pastTarget].index
  )
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
