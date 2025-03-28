import * as THREE from 'three';

function createCircleTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const radius = size / 2;

  // Using radial gradient for a soft circle
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2, false);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createExhaustEmitter(emitterOffset, particleCount = 200) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const circleTexture = createCircleTexture();

  const material = new THREE.PointsMaterial({
    color: 0xff6600,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    map: circleTexture,
    alphaTest: 0.5,
  });

  const particles = new THREE.Points(geometry, material);
  particles.position.copy(emitterOffset);

  // Stores each particle's world position for continuous motion
  particles.userData.worldPositions = null;

  particles.userData.update = function(delta) {
    const positions = this.geometry.attributes.position.array;
    const count = particleCount;
    const emitterWorldPos = new THREE.Vector3();
    this.getWorldPosition(emitterWorldPos);

    // Compute the current engine exhaust direction in world space
    const engineDirLocal = new THREE.Vector3(0, 0, -1);
    const emitterWorldQuat = new THREE.Quaternion();
    this.getWorldQuaternion(emitterWorldQuat);
    const engineDirWorld = engineDirLocal.clone().applyQuaternion(emitterWorldQuat).normalize();

    // On first update, initialize each particle's world position along the exhaust stream
    if (!this.userData.worldPositions) {
      this.userData.worldPositions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        // Random distance along the exhaust stream
        let r = Math.random() * 2;
        let offset = engineDirWorld.clone().multiplyScalar(-r);
        this.userData.worldPositions[i * 3 + 0] = emitterWorldPos.x + offset.x;
        this.userData.worldPositions[i * 3 + 1] = emitterWorldPos.y + offset.y;
        this.userData.worldPositions[i * 3 + 2] = emitterWorldPos.z + offset.z;
      }
    }
    const worldPositions = this.userData.worldPositions;

    // Update each particle
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const speed = (0.3 + Math.random() * 0.1) * delta;

      // Move particle along the exhaust direction
      worldPositions[idx]     += engineDirWorld.x * speed;
      worldPositions[idx + 1] += engineDirWorld.y * speed;
      worldPositions[idx + 2] += engineDirWorld.z * speed;

      worldPositions[idx]     += (Math.random() - 0.5) * 0.05;
      worldPositions[idx + 1] += (Math.random() - 0.5) * 0.05;
      worldPositions[idx + 2] += (Math.random() - 0.5) * 0.05;

      // If the particle has traveled too far from the emitter, reset it to a new random position along the exhaust stream
      const particleWorldPos = new THREE.Vector3(
        worldPositions[idx],
        worldPositions[idx + 1],
        worldPositions[idx + 2]
      );

      if (particleWorldPos.distanceTo(emitterWorldPos) > 1) {
        let r = Math.random() * 1;
        let offset = engineDirWorld.clone().multiplyScalar(-r);
        worldPositions[idx]     = emitterWorldPos.x + offset.x;
        worldPositions[idx + 1] = emitterWorldPos.y + offset.y;
        worldPositions[idx + 2] = emitterWorldPos.z + offset.z;
      }

      // Convert the world position back to local space for rendering
      const localPos = new THREE.Vector3(
        worldPositions[idx],
        worldPositions[idx + 1],
        worldPositions[idx + 2]
      );
      this.worldToLocal(localPos);
      positions[idx]     = localPos.x;
      positions[idx + 1] = localPos.y;
      positions[idx + 2] = localPos.z;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }.bind(particles);

  return particles;
}

// Create four exhaust emitters
export function createExhaustEmitters() {
  const emitterOffsets = [
    new THREE.Vector3(-1.5,  1, 6.5),
    new THREE.Vector3( 1.5,  1, 6.5),
    new THREE.Vector3(-1.5, -1, 6.5),
    new THREE.Vector3( 1.5, -1, 6.5),
  ];
  const emitters = emitterOffsets.map(offset => createExhaustEmitter(offset));
  return emitters;
}
