import * as THREE from 'three';

export class GameEngine {
  constructor(canvasId, assets, physics) {
    this.canvas = document.getElementById(canvasId);
    this.assets = assets;
    this.physics = physics;
    this.karts = new Map(); // playerSessionId -> Kart
    this.localKart = null;
    this.hearts = [];
    this.bananas = [];

    this.initThree();
    this.buildWorld();
    this.setupResize();
  }

  initThree() {
    // 1. Create Scene
    this.scene = new THREE.Scene();
    
    // Generate beautiful 32-bit pixel-art sunset background matching the reference images
    const canvasBg = document.createElement('canvas');
    canvasBg.width = 512;
    canvasBg.height = 256;
    const ctxBg = canvasBg.getContext('2d');
    
    // Sky gradient (light blue to yellow/orange at horizon)
    const skyGrad = ctxBg.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#56ccf2');
    skyGrad.addColorStop(0.5, '#a8e0ff');
    skyGrad.addColorStop(0.75, '#ffe082');
    skyGrad.addColorStop(1, '#ffb74d');
    ctxBg.fillStyle = skyGrad;
    ctxBg.fillRect(0, 0, 512, 256);
    
    // Pixel-art sun
    ctxBg.fillStyle = '#fffb00';
    ctxBg.fillRect(200, 30, 48, 48);
    ctxBg.fillStyle = '#ffffff';
    ctxBg.fillRect(212, 42, 24, 24);
    
    // Clouds
    ctxBg.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctxBg.fillRect(40, 25, 120, 16);
    ctxBg.fillRect(70, 15, 60, 16);
    ctxBg.fillRect(340, 40, 90, 12);
    
    // Mountain backdrop
    ctxBg.fillStyle = '#4caf50'; // Green hills
    ctxBg.beginPath();
    ctxBg.moveTo(0, 256);
    ctxBg.lineTo(150, 160);
    ctxBg.lineTo(260, 256);
    ctxBg.closePath();
    ctxBg.fill();
    
    ctxBg.fillStyle = '#388e3c'; // Darker hills
    ctxBg.beginPath();
    ctxBg.moveTo(220, 256);
    ctxBg.lineTo(340, 130);
    ctxBg.lineTo(480, 256);
    ctxBg.closePath();
    ctxBg.fill();
    
    // Waterfall (Cyan blue cascade on the right, matching the reference image)
    ctxBg.fillStyle = '#00e5ff';
    ctxBg.fillRect(330, 130, 25, 126);
    ctxBg.fillStyle = '#ffffff'; // white spray stripes
    ctxBg.fillRect(335, 130, 4, 126);
    ctxBg.fillRect(344, 140, 3, 116);
    ctxBg.fillRect(350, 130, 2, 126);
    
    const skyTexture = new THREE.CanvasTexture(canvasBg);
    skyTexture.wrapS = THREE.RepeatWrapping;
    skyTexture.wrapT = THREE.ClampToEdgeWrapping;
    skyTexture.minFilter = THREE.NearestFilter;
    skyTexture.magFilter = THREE.NearestFilter;
    
    this.scene.background = skyTexture;
    
    this.scene.fog = new THREE.FogExp2(0xa8e0ff, 0.001);

    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    this.scene.add(this.camera);

    // 3. Setup Renderer (pixelated feel by scaling down)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      precision: 'lowp'
    });
    this.renderer.setPixelRatio(1);
    this.resizeCanvas();

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 0.6);
    dirLight.position.set(0, 100, 100);
    this.scene.add(dirLight);
  }

  resizeCanvas() {
    // Render at 1/3 resolution to create gorgeous 32-bit pixelated rendering
    const pixelScale = 3;
    const w = window.innerWidth / pixelScale;
    const h = window.innerHeight / pixelScale;
    
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setupResize() {
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  buildWorld() {
    // Shoreline Water Plane (Right side lagoon, matching reference images)
    const waterGeo = new THREE.PlaneGeometry(4000, 4000);
    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x4dd0e1, // Cyan blue water
      side: THREE.DoubleSide
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = Math.PI / 2;
    water.position.y = 0.01; // sits below grass slightly
    water.position.x = 350;  // coastal placement
    water.position.z = 150;
    this.scene.add(water);

    // Giant Green/Grass Ground plane
    const groundGeo = new THREE.PlaneGeometry(4000, 4000);
    this.assets.textures.grass.repeat.set(120, 120);
    const groundMat = new THREE.MeshBasicMaterial({
      map: this.assets.textures.grass,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = 0.02;
    this.scene.add(ground);

    // Track asphalt (gravel sand) mesh
    this.assets.textures.asphalt.repeat.set(160, 4);
    const roadGeo = new THREE.TubeGeometry(this.physics.trackCurve, 200, this.physics.trackWidth / 2, 8, true);
    const roadMat = new THREE.MeshBasicMaterial({
      map: this.assets.textures.asphalt,
      side: THREE.DoubleSide
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.scale.set(1, 0.005, 1); // Flatten into 2D ribbon on ground
    road.position.y = 0.06; // Slightly above grass
    this.scene.add(road);

    // Track Curb Border (Yellow/Black stripes, matching images)
    const curbGeo = new THREE.TubeGeometry(this.physics.trackCurve, 200, (this.physics.trackWidth / 2) + 0.8, 8, true);
    const curbMat = new THREE.MeshBasicMaterial({
      map: this.assets.textures.curb,
      side: THREE.DoubleSide
    });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.scale.set(1, 0.004, 1);
    curb.position.y = 0.04;
    this.scene.add(curb);

    // Starting Arch Billboard Banner ("TURTLE CUP 32")
    const canvasArch = document.createElement('canvas');
    canvasArch.width = 128;
    canvasArch.height = 32;
    const ctxArch = canvasArch.getContext('2d');
    
    // Checkered borders
    ctxArch.fillStyle = '#ffffff';
    ctxArch.fillRect(0, 0, 128, 32);
    ctxArch.fillStyle = '#212121';
    for (let x = 0; x < 128; x += 8) {
      ctxArch.fillRect(x, 0, 4, 4);
      ctxArch.fillRect(x + 4, 28, 4, 4);
    }
    // Green inside
    ctxArch.fillStyle = '#2e7d32';
    ctxArch.fillRect(0, 4, 128, 24);
    // Yellow text "TURTLE CUP 32"
    ctxArch.fillStyle = '#fffb00';
    ctxArch.font = 'bold 11px monospace';
    ctxArch.textAlign = 'center';
    ctxArch.fillText('TURTLE CUP 32', 64, 20);

    const texArch = new THREE.CanvasTexture(canvasArch);
    texArch.minFilter = THREE.NearestFilter;
    texArch.magFilter = THREE.NearestFilter;
    const matArch = new THREE.SpriteMaterial({ map: texArch, transparent: true });
    const arch = new THREE.Sprite(matArch);
    arch.scale.set(24, 6, 1);
    
    const startPos = this.physics.trackCurve.getPointAt(0);
    arch.position.copy(startPos);
    arch.position.y = 7; // float above track
    this.scene.add(arch);

    // Draw some environment palm trees/cyber columns along track side
    this.spawnEnvironmentBillboards();
    this.spawnHearts();
  }

  spawnHearts() {
    // Spawn 6 hearts evenly along the track centerline
    const heartU = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
    heartU.forEach(uVal => {
      const pos = this.physics.trackCurve.getPointAt(uVal);
      const mat = new THREE.SpriteMaterial({ map: this.assets.textures.heart, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(4, 4, 1);
      sprite.position.copy(pos);
      sprite.position.y = 2.5; // Float above track ground
      this.scene.add(sprite);

      this.hearts.push({
        sprite,
        position: pos.clone(),
        active: true,
        respawnTimer: 0
      });
    });
  }

  spawnEnvironmentBillboards() {
    const pointsCount = 40;
    for (let i = 0; i < pointsCount; i++) {
      const u = i / pointsCount;
      const pos = this.physics.trackCurve.getPointAt(u);
      const tangent = this.physics.trackCurve.getTangentAt(u);
      
      // Calculate perpendicular normal vectors for sides
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      // Spawn trees on both left and right sides
      const spawnSide = (offset) => {
        const treePos = new THREE.Vector3().copy(pos).addScaledVector(normal, offset);
        
        const mat = new THREE.SpriteMaterial({
          map: this.assets.textures.tree,
          transparent: true
        });
        const treeSprite = new THREE.Sprite(mat);
        treeSprite.scale.set(6, 12, 1);
        treeSprite.position.copy(treePos);
        treeSprite.position.y = 6;
        this.scene.add(treeSprite);
      };

      spawnSide(this.physics.trackWidth / 2 + 10); // Right side
      spawnSide(-(this.physics.trackWidth / 2 + 10)); // Left side
    }
  }

  setLocalKart(kart) {
    this.localKart = kart;
    this.karts.set('local', kart);
    kart.createVisuals(this.scene, this.assets);
    kart.setupInput();
  }

  addRemotePlayer(id, kart) {
    this.karts.set(id, kart);
    kart.createVisuals(this.scene, this.assets);
  }

  removeRemotePlayer(id) {
    const kart = this.karts.get(id);
    if (kart) {
      kart.destroy(this.scene);
      this.karts.delete(id);
    }
  }

  update(dt) {
    // 1. Update all karts physics and positions
    this.karts.forEach(kart => {
      kart.update(dt, this.physics);
      
      // Handle spin timer if slipping on banana
      if (kart.spinTimer > 0) {
        kart.spinTimer -= dt;
        // spin the sprite visual angle rapidly
        kart.rotation += 15 * dt;
        if (kart.spinTimer <= 0) {
          kart.spinTimer = 0;
        }
      }

      // Billboard angle calculation
      kart.updateSpriteAngle(this.camera);
    });

    // 2. Bob active hearts up and down, increment respawn timers
    const heartTime = performance.now() * 0.005;
    this.hearts.forEach(heart => {
      if (heart.active) {
        heart.sprite.position.y = 2.5 + Math.sin(heartTime + heart.position.x) * 0.45;
        heart.sprite.rotation.y += 2 * dt;
      } else {
        heart.respawnTimer -= dt;
        if (heart.respawnTimer <= 0) {
          heart.active = true;
          heart.sprite.visible = true;
        }
      }
    });

    // 3. Collision check for bananas
    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const banana = this.bananas[i];
      if (this.localKart && this.localKart.position.distanceTo(banana.position) < 4.5 && !this.localKart.spinTimer) {
        // Spin out local player
        this.localKart.spinTimer = 1.2;
        this.localKart.speed = -15; // knock back slightly
        
        if (window.audioContextRef) {
          window.audioContextRef.playBananaSound();
        }

        // Remove banana via synced database call
        if (window.networkSyncRef) {
          window.networkSyncRef.removeBanana(banana.id);
        } else {
          // Fallback if solo
          this.scene.remove(banana.sprite);
          this.bananas.splice(i, 1);
        }
      }
    }

    // 4. Camera follow mechanics for 3rd person view
    if (this.localKart) {
      const followDist = 20;
      const followHeight = 8;
      
      // Calculate backward offset direction from kart's angle
      const backX = -Math.sin(this.localKart.rotation);
      const backZ = -Math.cos(this.localKart.rotation);

      const targetCamPos = new THREE.Vector3(
        this.localKart.position.x + backX * followDist,
        this.localKart.position.y + followHeight,
        this.localKart.position.z + backZ * followDist
      );

      // Lerp camera position for smooth tracking
      this.camera.position.lerp(targetCamPos, 0.1);
      
      // Look slightly ahead of kart
      const lookTarget = new THREE.Vector3(
        this.localKart.position.x + Math.sin(this.localKart.rotation) * 15,
        this.localKart.position.y + 2,
        this.localKart.position.z + Math.cos(this.localKart.rotation) * 15
      );
      this.camera.lookAt(lookTarget);
    }

    // Render step
    this.renderer.render(this.scene, this.camera);
  }

  // Dropping a banana peel locally (triggered by database update or network event)
  dropBananaLocally(pos, ownerId, bananaId) {
    const mat = new THREE.SpriteMaterial({ map: this.assets.textures.banana, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.5, 3.5, 1);
    sprite.position.copy(pos);
    sprite.position.y = 1.2;
    this.scene.add(sprite);

    this.bananas.push({
      id: bananaId,
      sprite,
      position: pos.clone(),
      ownerId
    });
  }
}
