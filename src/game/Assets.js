import * as THREE from 'three';

// Procedural Asset Generator for 32-bit Pixel Art Style
export class Assets {
  constructor() {
    this.characters = [
      { id: 'turtle', name: 'TURTLE', color: '#e53935', accent: '#fdd835', wheels: '#111111' },
      { id: 'rabbit', name: 'RABBIT', color: '#78909c', accent: '#00e5ff', wheels: '#00ffff' },
      { id: 'hedgehog', name: 'HEDGEHOG', color: '#8d6e63', accent: '#5d4037', wheels: '#222222' },
      { id: 'fox', name: 'FOX', color: '#c62828', accent: '#fb8c00', wheels: '#111111' },
      { id: 'panda', name: 'PANDA', color: '#1b5e20', accent: '#ffffff', wheels: '#111111' },
      { id: 'cat', name: 'CAT', color: '#fff8e1', accent: '#fb8c00', wheels: '#222222' },
      { id: 'racoon', name: 'RACOON', color: '#37474f', accent: '#212121', wheels: '#111111' },
      { id: 'squirrel', name: 'SQUIRREL', color: '#cfd8dc', accent: '#78909c', wheels: '#111111' }
    ];

    this.textures = {};
    this.kartTextures = {}; // Format: { charId: [texAngle0, texAngle1, ...] }

    this.generateTrackTextures();
    this.generateEnvironmentTextures();
    this.generateKartTextures();
  }

  // Draw a 32-bit retro track texture (asphalt, lines)
  generateTrackTextures() {
    // Asphalt Texture
    const canvasAsphalt = document.createElement('canvas');
    canvasAsphalt.width = 64;
    canvasAsphalt.height = 64;
    const ctx = canvasAsphalt.getContext('2d');
    ctx.fillStyle = '#dfb584'; // Sandy gravel track color
    ctx.fillRect(0, 0, 64, 64);
    
    // Add dirt grains for 32-bit look
    for (let x = 0; x < 64; x += 2) {
      for (let y = 0; y < 64; y += 2) {
        ctx.fillStyle = Math.random() > 0.5 ? '#d5aa78' : '#e6be90';
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const texAsphalt = new THREE.CanvasTexture(canvasAsphalt);
    texAsphalt.wrapS = THREE.RepeatWrapping;
    texAsphalt.wrapT = THREE.RepeatWrapping;
    texAsphalt.minFilter = THREE.NearestFilter;
    texAsphalt.magFilter = THREE.NearestFilter;
    this.textures.asphalt = texAsphalt;

    // Grass/Border Texture (Beach/Grass vibe like the image)
    const canvasGrass = document.createElement('canvas');
    canvasGrass.width = 64;
    canvasGrass.height = 64;
    const ctxGrass = canvasGrass.getContext('2d');
    ctxGrass.fillStyle = '#4caf50'; 
    ctxGrass.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 4) {
      for (let y = 0; y < 64; y += 4) {
        ctxGrass.fillStyle = Math.random() > 0.5 ? '#81c784' : '#388e3c';
        ctxGrass.fillRect(x, y, 4, 4);
      }
    }
    const texGrass = new THREE.CanvasTexture(canvasGrass);
    texGrass.wrapS = THREE.RepeatWrapping;
    texGrass.wrapT = THREE.RepeatWrapping;
    texGrass.minFilter = THREE.NearestFilter;
    texGrass.magFilter = THREE.NearestFilter;
    this.textures.grass = texGrass;

    // Yellow/Black Curb Border Texture like the image
    const canvasCurb = document.createElement('canvas');
    canvasCurb.width = 64;
    canvasCurb.height = 16;
    const ctxCurb = canvasCurb.getContext('2d');
    ctxCurb.fillStyle = '#fdd835';
    ctxCurb.fillRect(0, 0, 64, 16);
    ctxCurb.fillStyle = '#212121';
    ctxCurb.fillRect(0, 0, 32, 16);
    const texCurb = new THREE.CanvasTexture(canvasCurb);
    texCurb.wrapS = THREE.RepeatWrapping;
    texCurb.wrapT = THREE.RepeatWrapping;
    texCurb.minFilter = THREE.NearestFilter;
    texCurb.magFilter = THREE.NearestFilter;
    this.textures.curb = texCurb;
  }

  // Draw palms trees like in the image
  generateEnvironmentTextures() {
    const canvasTree = document.createElement('canvas');
    canvasTree.width = 32;
    canvasTree.height = 64;
    const ctx = canvasTree.getContext('2d');
    
    // Trunk (Brown/yellow pixels)
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(14, 24, 4, 40);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(14, 30, 2, 34);
    
    // Palm leaves (bright green pixel art style)
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(8, 12, 16, 12);
    ctx.fillRect(4, 16, 24, 6);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(10, 8, 12, 4);
    ctx.fillRect(14, 4, 4, 4);

    const texTree = new THREE.CanvasTexture(canvasTree);
    texTree.minFilter = THREE.NearestFilter;
    texTree.magFilter = THREE.NearestFilter;
    this.textures.tree = texTree;

    // Pixel art Heart Item Texture
    const canvasHeart = document.createElement('canvas');
    canvasHeart.width = 32;
    canvasHeart.height = 32;
    const ctxHeart = canvasHeart.getContext('2d');
    ctxHeart.fillStyle = '#ff0055'; // Red heart
    // Paint a retro pixel heart shape
    ctxHeart.fillRect(6, 10, 8, 6);
    ctxHeart.fillRect(18, 10, 8, 6);
    ctxHeart.fillRect(8, 8, 4, 2);
    ctxHeart.fillRect(20, 8, 4, 2);
    ctxHeart.fillRect(4, 12, 24, 6);
    ctxHeart.fillRect(6, 18, 20, 4);
    ctxHeart.fillRect(8, 22, 16, 4);
    ctxHeart.fillRect(10, 26, 12, 2);
    ctxHeart.fillRect(12, 28, 8, 2);
    ctxHeart.fillRect(14, 30, 4, 2);
    ctxHeart.fillStyle = '#ffffff'; // light glint
    ctxHeart.fillRect(8, 12, 2, 4);
    
    const texHeart = new THREE.CanvasTexture(canvasHeart);
    texHeart.minFilter = THREE.NearestFilter;
    texHeart.magFilter = THREE.NearestFilter;
    this.textures.heart = texHeart;

    // Pixel art Banana Peel Trap Texture
    const canvasBanana = document.createElement('canvas');
    canvasBanana.width = 32;
    canvasBanana.height = 32;
    const ctxBanana = canvasBanana.getContext('2d');
    ctxBanana.fillStyle = '#fdd835'; // Yellow banana peel
    ctxBanana.fillRect(12, 18, 8, 8);
    ctxBanana.fillRect(8, 16, 16, 4);
    ctxBanana.fillRect(4, 14, 24, 2);
    ctxBanana.fillRect(14, 10, 4, 4); // peel tips
    ctxBanana.fillStyle = '#8d6e63'; // brown tips
    ctxBanana.fillRect(4, 14, 2, 2);
    ctxBanana.fillRect(26, 14, 2, 2);
    ctxBanana.fillRect(15, 8, 2, 2);

    const texBanana = new THREE.CanvasTexture(canvasBanana);
    texBanana.minFilter = THREE.NearestFilter;
    texBanana.magFilter = THREE.NearestFilter;
    this.textures.banana = texBanana;
  }

  // Generate karts
  generateKartTextures() {
    this.characters.forEach(char => {
      this.kartTextures[char.id] = [];
      for (let angle = 0; angle < 8; angle++) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        this.drawKartPixelArt(ctx, char.id, angle);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        this.kartTextures[char.id].push(tex);
      }
    });
  }

  // High-fidelity pixel drawings matching the image reference sheet
  drawKartPixelArt(ctx, charId, angle) {
    ctx.imageSmoothingEnabled = false;

    // Helper: draw wheels
    const drawWheels = (isBack, isSide, isRightSide) => {
      ctx.fillStyle = '#111111'; // dark wheels
      if (isSide) {
        // Draw profile wheels
        ctx.fillRect(4, 22, 6, 8);
        ctx.fillRect(22, 22, 6, 8);
        ctx.fillStyle = '#78909c'; // rims
        ctx.fillRect(6, 24, 2, 4);
        ctx.fillRect(24, 24, 2, 4);
      } else {
        // Draw front/back wheels
        ctx.fillRect(3, 22, 5, 8);
        ctx.fillRect(24, 22, 5, 8);
      }
    };

    // Draw background elements (like wheels) first
    const isProfile = angle === 2 || angle === 6;
    const isRight = angle >= 1 && angle <= 3;
    const isBack = angle === 0 || angle === 1 || angle === 7;
    const isFront = angle === 4 || angle === 3 || angle === 5;

    // Clear background
    ctx.clearRect(0, 0, 32, 32);

    // Render characters
    switch(charId) {
      case 'turtle':
        // TURTLE: Red helmet, green head, classic kart
        drawWheels(isBack, isProfile, isRight);
        
        // Chassis (Red/Yellow/White)
        ctx.fillStyle = '#e53935'; // Red
        if (isProfile) {
          ctx.fillRect(6, 18, 20, 6);
          ctx.fillStyle = '#fdd835'; // Yellow engine accents
          ctx.fillRect(6, 12, 4, 6);
        } else {
          ctx.fillRect(6, 18, 20, 7);
          ctx.fillStyle = '#ffffff'; // White stripes
          ctx.fillRect(10, 18, 3, 7);
          ctx.fillRect(19, 18, 3, 7);
          ctx.fillStyle = '#fdd835'; // Yellow bumper
          ctx.fillRect(8, 23, 16, 3);
        }

        // Driver Head: Green turtle with red helmet + yellow accent
        ctx.fillStyle = '#e53935'; // Red Helmet
        ctx.fillRect(12, 8, 8, 8);
        ctx.fillStyle = '#fdd835'; // Yellow Stripe
        ctx.fillRect(15, 8, 2, 8);
        ctx.fillStyle = '#4caf50'; // Green face
        if (isBack) {
          // just helmet back
        } else if (isProfile) {
          ctx.fillStyle = '#4caf50'; // Face
          ctx.fillRect(isRight ? 18 : 8, 11, 4, 4);
        } else {
          // Front face
          ctx.fillRect(13, 11, 6, 4);
          ctx.fillStyle = '#ffffff'; // Eyes
          ctx.fillRect(14, 11, 1, 2);
          ctx.fillRect(17, 11, 1, 2);
        }
        break;

      case 'rabbit':
        // RABBIT: Futuristic grey hover-pod with blue engines
        // No wheels, instead blue hover pads!
        ctx.fillStyle = '#00ffff'; // glowing cyan
        if (isProfile) {
          ctx.fillRect(4, 24, 6, 3);
          ctx.fillRect(22, 24, 6, 3);
        } else {
          ctx.fillRect(3, 24, 5, 3);
          ctx.fillRect(24, 24, 5, 3);
        }

        // Hover Pod body (Silver/grey metal)
        ctx.fillStyle = '#78909c';
        ctx.fillRect(6, 16, 20, 8);
        ctx.fillStyle = '#b0bec5'; // light highlights
        ctx.fillRect(8, 18, 16, 4);
        
        // Driver Head: Green hoodie/suit and long ears
        ctx.fillStyle = '#2e7d32'; // Green hood
        ctx.fillRect(13, 10, 6, 6);
        // Long ears
        ctx.fillRect(12, 4, 3, 6);
        ctx.fillRect(17, 4, 3, 6);
        ctx.fillStyle = '#ff8a80'; // Pink ear inner
        ctx.fillRect(13, 5, 1, 4);
        ctx.fillRect(18, 5, 1, 4);

        if (!isBack) {
          // Bunny face (green cheeks, white snout)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(14, 13, 4, 3);
          ctx.fillStyle = '#000000'; // black eyes
          ctx.fillRect(14, 11, 1, 1);
          ctx.fillRect(17, 11, 1, 1);
        }
        break;

      case 'hedgehog':
        // HEDGEHOG: Brown spikes, cowboy hat, rugged jeep
        drawWheels(isBack, isProfile, isRight);
        
        // Jeep chassis (dark brown/khaki)
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(6, 16, 20, 8);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(8, 15, 16, 4);

        // Cowboy Hat & Spikes
        ctx.fillStyle = '#3e2723'; // Dark spikes
        ctx.fillRect(10, 6, 12, 10);
        ctx.fillStyle = '#d7ccc8'; // tan face
        if (!isBack) {
          ctx.fillRect(13, 11, 6, 5);
        }
        ctx.fillStyle = '#8d6e63'; // Brown cowboy hat
        ctx.fillRect(11, 7, 10, 3);
        ctx.fillRect(9, 9, 14, 2);
        break;

      case 'fox':
        // FOX: Orange fur, red sports racing kart
        drawWheels(isBack, isProfile, isRight);
        
        // Sports car chassis (low wedge, red)
        ctx.fillStyle = '#c62828';
        if (isProfile) {
          ctx.fillRect(4, 19, 24, 5);
          ctx.fillStyle = '#fb8c00'; // spoiler
          ctx.fillRect(4, 13, 3, 7);
        } else {
          ctx.fillRect(6, 20, 20, 5);
          ctx.fillStyle = '#212121'; // racing grill
          ctx.fillRect(11, 22, 10, 3);
        }

        // Fox head
        ctx.fillStyle = '#fb8c00'; // Orange
        ctx.fillRect(13, 10, 6, 6);
        ctx.fillRect(12, 8, 2, 3); // ears
        ctx.fillRect(18, 8, 2, 3);
        ctx.fillStyle = '#ffffff'; // white inner ears/snout
        ctx.fillRect(13, 13, 6, 3);
        if (!isBack) {
          ctx.fillStyle = '#000000'; // eyes
          ctx.fillRect(13, 11, 1, 1);
          ctx.fillRect(18, 11, 1, 1);
        }
        break;

      case 'panda':
        // PANDA: Green cage buggy, panda pilot
        drawWheels(isBack, isProfile, isRight);

        // Cage Buggy (Green rollbars)
        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 2;
        ctx.strokeRect(7, 13, 18, 11);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(8, 20, 16, 4);

        // Panda Head
        ctx.fillStyle = '#ffffff'; // White head
        ctx.fillRect(13, 9, 6, 6);
        ctx.fillStyle = '#212121'; // Black ears & eye patches
        ctx.fillRect(12, 8, 2, 2);
        ctx.fillRect(18, 8, 2, 2);
        if (!isBack) {
          ctx.fillRect(13, 10, 2, 2);
          ctx.fillRect(17, 10, 2, 2);
          ctx.fillStyle = '#ffffff'; // inner eyes
          ctx.fillRect(13, 10, 1, 1);
          ctx.fillRect(18, 10, 1, 1);
        }
        break;

      case 'cat':
        // CAT: Cream/Calico cat driving a mini rounded car (Fiat 500 style)
        drawWheels(isBack, isProfile, isRight);

        // Round car body (Cream white)
        ctx.fillStyle = '#fff8e1';
        ctx.fillRect(7, 15, 18, 9);
        ctx.fillStyle = '#ffa726'; // orange accent line
        ctx.fillRect(7, 19, 18, 2);

        // Windshield / Glass
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(9, 12, 14, 4);

        // Cat driver sitting in it
        ctx.fillStyle = '#ffb74d'; // Calico orange patches
        ctx.fillRect(13, 8, 6, 6);
        ctx.fillStyle = '#4e342e'; // dark patches
        ctx.fillRect(13, 8, 3, 2);
        ctx.fillStyle = '#ffffff'; // white snout
        ctx.fillRect(14, 11, 4, 3);
        // Ears
        ctx.fillStyle = '#ffb74d';
        ctx.fillRect(12, 6, 2, 2);
        ctx.fillRect(18, 6, 2, 2);
        break;

      case 'racoon':
        // RACOON: Grey raccoon, vintage hot rod (black/grey engine exposed)
        drawWheels(isBack, isProfile, isRight);

        // Hot rod chassis (dark gunmetal grey)
        ctx.fillStyle = '#37474f';
        ctx.fillRect(8, 17, 16, 7);
        ctx.fillStyle = '#90a4ae'; // Chrome engine block in front
        if (isFront) {
          ctx.fillRect(10, 15, 12, 6);
          ctx.fillStyle = '#212121'; // vertical grill
          ctx.fillRect(12, 17, 8, 4);
        }

        // Raccoon Head
        ctx.fillStyle = '#b0bec5'; // Grey base
        ctx.fillRect(13, 9, 6, 6);
        ctx.fillStyle = '#212121'; // Black mask/ears
        ctx.fillRect(12, 8, 2, 2);
        ctx.fillRect(18, 8, 2, 2);
        if (!isBack) {
          ctx.fillRect(13, 10, 6, 2); // eye mask
          ctx.fillStyle = '#ffffff'; // white dots in mask
          ctx.fillRect(14, 10, 1, 1);
          ctx.fillRect(17, 10, 1, 1);
        }
        break;

      case 'squirrel':
        // SQUIRREL: Grey streamlined bullet car, squirrel with giant fluffy tail
        drawWheels(isBack, isProfile, isRight);

        // Streamlined bullet body (silver)
        ctx.fillStyle = '#cfd8dc';
        if (isProfile) {
          ctx.fillRect(4, 17, 24, 7);
          ctx.fillStyle = '#90a4ae'; // rounded nose
          ctx.fillRect(isRight ? 24 : 4, 17, 4, 5);
        } else {
          ctx.fillRect(7, 17, 18, 7);
        }

        // Squirrel driver & Tail
        if (isBack) {
          ctx.fillStyle = '#78909c'; // Big grey tail in back
          ctx.fillRect(19, 6, 5, 12);
        }

        ctx.fillStyle = '#b0bec5'; // Grey squirrel head
        ctx.fillRect(13, 10, 6, 6);
        ctx.fillRect(12, 8, 2, 2); // small ears
        ctx.fillRect(18, 8, 2, 2);
        if (!isBack) {
          ctx.fillStyle = '#212121'; // eyes
          ctx.fillRect(13, 11, 1, 1);
          ctx.fillRect(18, 11, 1, 1);
        }
        break;
    }
  }

  // Draw preview
  drawCharacterPreviews() {
    this.characters.forEach(char => {
      const container = document.getElementById('avatar-selector');
      if (!container) return;

      const optionDiv = document.createElement('div');
      optionDiv.classList.add('avatar-option');
      optionDiv.dataset.id = char.id;
      if (char.id === 'turtle') optionDiv.classList.add('selected'); // default selection

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      canvas.classList.add('avatar-canvas');
      
      const ctx = canvas.getContext('2d');
      this.drawKartPixelArt(ctx, char.id, 0); // draw back view

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('avatar-name');
      nameSpan.innerText = char.name;
      nameSpan.style.color = char.color;

      optionDiv.appendChild(canvas);
      optionDiv.appendChild(nameSpan);
      container.appendChild(optionDiv);
    });
  }
}
