import * as THREE from 'three';

export class Kart {
  constructor(charId, name, isLocal = false) {
    this.charId = charId;
    this.name = name;
    this.isLocal = isLocal;

    // Movement state
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = 0; // heading angle in radians
    this.speed = 0;
    
    // Physics constants
    this.maxSpeed = 80; // units/sec
    this.acceleration = 40;
    this.deceleration = 30;
    this.drag = 5;
    this.turnSpeed = 3.0; // rad/sec
    
    // Controls input state (for local player)
    this.keys = { w: false, a: false, s: false, d: false };
    
    // Lap tracking
    this.lap = 1;
    this.lastU = 0; // progress along track curve (0 to 1)
    
    // Race Status
    this.raceStarted = false;
    this.raceFinished = false;

    // Item/Power-up timers
    this.boostTimer = 0;
    this.starTimer = 0;
    this.spinTimer = 0;

    // Visual sprite setup
    this.sprite = null;
    this.spriteIndex = 0; // current active texture angle index (0-7)
  }

  // Create the kart's visual representations using THREE.Sprite
  createVisuals(scene, assets) {
    this.assets = assets;
    // We use a SpriteMaterial with the default back-view texture initially
    const material = new THREE.SpriteMaterial({
      map: assets.kartTextures[this.charId][0],
      transparent: true
    });
    
    this.sprite = new THREE.Sprite(material);
    this.sprite.scale.set(6, 6, 1);
    this.sprite.position.copy(this.position);
    this.sprite.position.y = 3; // lift off track ground slightly
    
    scene.add(this.sprite);

    // Add player name tag above kart (Sticker look, matching retro styling)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Transparent background, thick retro font
    ctx.font = 'bold 28px "Outfit", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw thick black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeText(this.name.toUpperCase(), 128, 32);
    
    // Draw text fill
    ctx.fillStyle = this.isLocal ? '#00f3ff' : '#ff0055'; // Cyan for local, pink for remotes
    ctx.fillText(this.name.toUpperCase(), 128, 32);

    const nameTexture = new THREE.CanvasTexture(canvas);
    nameTexture.minFilter = THREE.NearestFilter;
    nameTexture.magFilter = THREE.NearestFilter;
    
    const nameMaterial = new THREE.SpriteMaterial({ map: nameTexture, transparent: true });
    this.nameTag = new THREE.Sprite(nameMaterial);
    this.nameTag.scale.set(8, 2, 1);
    this.nameTag.position.copy(this.position);
    this.nameTag.position.y = 8; // Float comfortably above the player helmet
    scene.add(this.nameTag);
  }

  // Handle key listeners for local user
  setupInput() {
    if (!this.isLocal) return;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') this.keys.w = true;
      if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = true;
      if (k === 's' || e.key === 'ArrowDown') this.keys.s = true;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = true;
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') this.keys.w = false;
      if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
      if (k === 's' || e.key === 'ArrowDown') this.keys.s = false;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = false;
    });
  }

  // Update physics and state
  update(dt, physics) {
    if (this.isLocal) {
      this.updateLocalPhysics(dt, physics);
    }

    // Update 3D mesh position
    if (this.sprite) {
      this.sprite.position.copy(this.position);
      this.sprite.position.y = 3;

      this.nameTag.position.copy(this.position);
      this.nameTag.position.y = 8;

      // Rainbow flashing effect during Star invincibility
      if (this.starTimer > 0) {
        this.starTimer -= dt;
        const colors = [0xff0055, 0x00f3ff, 0xffea00, 0x39ff14, 0xb026ff];
        const colorIdx = Math.floor(performance.now() * 0.01) % colors.length;
        this.sprite.material.color.setHex(colors[colorIdx]);
      } else {
        this.sprite.material.color.setHex(0xffffff); // Reset color
      }
    }
  }

  updateLocalPhysics(dt, physics) {
    // 1. Get track info (grass detection, wall collision)
    const trackInfo = physics.getTrackStatus(this.position);
    
    // Adjust speed parameters based on terrain and power-ups
    let currentMaxSpeed = this.maxSpeed;
    
    // Star bypasses grass slowdown entirely!
    if (this.starTimer > 0) {
      currentMaxSpeed = this.maxSpeed * 1.15; // slight speed increase
    } else if (trackInfo.isOffTrack) {
      currentMaxSpeed *= physics.grassSlowdown;
    }

    // Mushroom speed boost forces maximum velocity!
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      currentMaxSpeed = this.maxSpeed * 1.6;
      this.speed = Math.max(this.speed + 120 * dt, currentMaxSpeed); // quick boost push
    }

    // 2. Acceleration / Deceleration (Auto-Gas on touch devices)
    let driveForward = this.keys.w;
    if (window.isTouchDeviceActive && !this.keys.s) {
      driveForward = true;
    }

    if (driveForward && this.raceStarted && !this.raceFinished && !this.spinTimer) {
      this.speed += this.acceleration * dt;
      if (this.speed > currentMaxSpeed && this.boostTimer <= 0) this.speed = currentMaxSpeed;
    } else if (this.keys.s && this.raceStarted && !this.raceFinished && !this.spinTimer) {
      this.speed -= this.deceleration * dt;
      if (this.speed < -currentMaxSpeed / 2) this.speed = -currentMaxSpeed / 2;
    } else {
      // Drag/Friction slowdown
      if (this.speed > 0) {
        this.speed -= this.drag * dt;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < 0) {
        this.speed += this.drag * dt;
        if (this.speed > 0) this.speed = 0;
      }
    }

    // 3. Steering (only turns when moving)
    if (Math.abs(this.speed) > 2) {
      const steeringDirection = this.speed > 0 ? 1 : -1;
      if (this.keys.a) {
        this.rotation += this.turnSpeed * dt * steeringDirection;
      }
      if (this.keys.d) {
        this.rotation -= this.turnSpeed * dt * steeringDirection;
      }
    }

    // 4. Update coordinates
    const forwardX = Math.sin(this.rotation);
    const forwardZ = Math.cos(this.rotation);

    this.position.x += forwardX * this.speed * dt;
    this.position.z += forwardZ * this.speed * dt;

    // 5. Wall push correction
    if (trackInfo.wallCollision) {
      this.position.addScaledVector(trackInfo.pushVector, -0.8);
      this.speed *= -0.2; // Bounce off walls slightly
    }

    // 6. Lap tracking logic
    // closestU goes from 0 to 1 along the curve loop
    const currentU = trackInfo.closestU;
    
    // Simple lap counting: detect crossing from ~0.9 to ~0.05
    if (this.lastU > 0.85 && currentU < 0.15) {
      this.lap++;
      if (this.lap > 4) this.lap = 4; // 4 means 3 laps are fully completed
    } else if (this.lastU < 0.15 && currentU > 0.85) {
      // reverse crossing
      if (this.lap > 1) this.lap--;
    }
    this.lastU = currentU;
  }

  // Choose the billboard sprite view index depending on camera angle
  updateSpriteAngle(camera) {
    if (!this.sprite) return;

    // Vector from camera to player
    const camToKart = new THREE.Vector3().copy(this.position).sub(camera.position);
    camToKart.y = 0;
    camToKart.normalize();

    // Kart's forward vector
    const kartForward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation)).normalize();

    // Calculate angle between them in 2D plane (X, Z)
    const angleCam = Math.atan2(camToKart.x, camToKart.z);
    const angleKart = Math.atan2(kartForward.x, kartForward.z);

    // Relative angle between camera view direction and kart direction
    let diff = angleCam - angleKart;

    // Normalize diff to [0, 2*PI)
    diff = (diff + Math.PI * 2) % (Math.PI * 2);

    // Map 8 directions:
    // 0: Back (kart pointing away) -> diff close to 0
    // 1: Back-Right
    // 2: Right
    // 3: Front-Right
    // 4: Front (kart pointing towards camera) -> diff close to PI
    // 5: Front-Left
    // 6: Left
    // 7: Back-Left
    const angleOffset = Math.PI / 8; // Offset to center each 45deg sector
    const sector = Math.floor(((diff + angleOffset) % (Math.PI * 2)) / (Math.PI / 4));
    this.spriteIndex = sector % 8;

    // Set correct texture
    const texList = this.assets.kartTextures[this.charId];
    if (texList && texList[this.spriteIndex]) {
      this.sprite.material.map = texList[this.spriteIndex];
      this.sprite.material.needsUpdate = true;
    }
  }

  destroy(scene) {
    if (this.sprite) scene.remove(this.sprite);
    if (this.nameTag) scene.remove(this.nameTag);
  }
}
