import { Assets } from './src/game/Assets.js';
import { Physics } from './src/game/Physics.js';
import { GameEngine } from './src/game/GameEngine.js';
import { Kart } from './src/game/Kart.js';
import { FirebaseSync } from './src/network/FirebaseSync.js';
import { RetroAudio } from './src/game/Audio.js';

let assets;
let physics;
let gameEngine;
let networkSync;
let audio;
let currentPowerUp = null;
let isRollingPowerUp = false;
let touchingGas = false;
let touchingBrake = false;

let activeScreen = 'screen-menu';
let selectedCharId = 'turtle';
let animationFrameId = null;
let lastTime = 0;
let networkUpdateTimer = 0;

// Change UI screen
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(scr => {
    scr.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    activeScreen = screenId;
  }
  // Hide touch controls when returning to menus
  const touchCtrls = document.getElementById('touch-controls');
  if (touchCtrls) touchCtrls.style.display = 'none';
}

// Start actual gameplay loop
function startRacing(roomId, playerName, isOnline) {
  // Hide UI overlay, show Canvas and HUD
  document.getElementById('ui-container').style.display = 'none';
  document.getElementById('canvas-container').style.display = 'block';
  document.getElementById('hud').style.display = 'flex';

  // Show touch controls only if touch support is detected
  const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const touchCtrls = document.getElementById('touch-controls');
  if (isTouchDevice && touchCtrls) {
    touchCtrls.style.display = 'flex';
  }

  // Reset overlay
  document.getElementById('finish-overlay').style.display = 'none';

  // Instantiate Local Kart
  const name = playerName || 'Racer_' + Math.floor(Math.random() * 900 + 100);
  const localKart = new Kart(selectedCharId, name, true);
  
  // Set starting positions on the track spline
  const trackStart = physics.physics.trackCurve.getPointAt(0);
  const trackTangent = physics.physics.trackCurve.getTangentAt(0);
  const normal = new THREE.Vector3(-trackTangent.z, 0, trackTangent.x).normalize();

  // Offset placement based on session ID
  const playerOffsetIndex = Math.floor(Math.random() * 4) - 2; // -2 to 1
  localKart.position.copy(trackStart).addScaledVector(normal, playerOffsetIndex * 6);
  // Set initial heading rotation pointing along track tangent
  localKart.rotation = Math.atan2(tangentDirection().x, tangentDirection().z);

  gameEngine.setLocalKart(localKart);
  buildSVGMinimap();
  
  // Set Room HUD display if element exists
  const roomDisp = document.getElementById('room-display');
  if (roomDisp) {
    roomDisp.innerText = `ROOM: ${roomId.toUpperCase()}`;
  }

  if (isOnline) {
    networkSync.joinRoom(roomId, name, selectedCharId);
  }

  // Initialize Audio & start countdown overlay
  if (!audio) {
    audio = new RetroAudio();
  }
  audio.init();
  window.audioContextRef = audio; // Expose globally for GameEngine sounds

  // Reset power-ups
  currentPowerUp = null;
  isRollingPowerUp = false;
  updatePowerUpHUD();

  const cdOverlay = document.getElementById('countdown-overlay');
  cdOverlay.style.display = 'block';
  cdOverlay.style.color = '#fffb00';
  cdOverlay.innerText = '3';
  audio.playBeep(false);

  let count = 3;
  const interval = setInterval(() => {
    count--;
    if (count === 2) {
      cdOverlay.innerText = '2';
      audio.playBeep(false);
    } else if (count === 1) {
      cdOverlay.innerText = '1';
      audio.playBeep(false);
    } else if (count === 0) {
      cdOverlay.innerText = 'GO!';
      cdOverlay.style.color = '#39ff14'; // Neon Green
      audio.playBeep(true);
      
      // Let karts start driving
      localKart.raceStarted = true;
      gameEngine.karts.forEach(k => k.raceStarted = true);
      
      // Start background chiptune music loop
      audio.startMusic();
    } else {
      clearInterval(interval);
      cdOverlay.style.display = 'none';
    }
  }, 1000);

  // Set game loop running
  lastTime = performance.now();
  gameLoop(lastTime);
}

// Helper direction
function tangentDirection() {
  return physics.physics.trackCurve.getTangentAt(0);
}

// Generate the SVG minimap path dynamically based on the 3D track spline
function buildSVGMinimap() {
  const points = physics.physics.trackPoints;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  });

  const width = maxX - minX;
  const height = maxZ - minZ;
  const padding = 12; // safety margin for SVG viewport

  // Sample 80 points along the actual 3D road spline for smooth mapping
  const pathSamples = 80;
  let dStr = "";
  for (let i = 0; i <= pathSamples; i++) {
    const u = i / pathSamples;
    const p = physics.physics.trackCurve.getPointAt(u % 1.0);
    const x = padding + ((p.x - minX) / width) * (100 - padding * 2);
    const z = padding + ((p.z - minZ) / height) * (100 - padding * 2);
    if (i === 0) {
      dStr += `M ${x.toFixed(1)} ${z.toFixed(1)}`;
    } else {
      dStr += ` L ${x.toFixed(1)} ${z.toFixed(1)}`;
    }
  }
  dStr += " Z";

  // Update both SVG path strokes (drop shadow + foreground line)
  const paths = document.querySelectorAll('.mini-map path');
  paths.forEach(p => p.setAttribute('d', dStr));
}

// Core Game Loop
function gameLoop(time) {
  animationFrameId = requestAnimationFrame(gameLoop);
  
  const dt = Math.min((time - lastTime) / 1000, 0.1); // cap dt at 100ms to avoid physics teleports
  lastTime = time;

  // Update logic
  gameEngine.update(dt);

  // Heart collection collision check
  if (gameEngine.localKart && !gameEngine.localKart.raceFinished) {
    gameEngine.hearts.forEach(heart => {
      if (heart.active && gameEngine.localKart.position.distanceTo(heart.position) < 5) {
        heart.active = false;
        heart.sprite.visible = false;
        heart.respawnTimer = 8.0; // 8 seconds respawn

        if (audio) audio.playCollectSound();
        triggerPowerUpRoulette();
      }
    });
  }

  // Sync network state (approx 30 times a second)
  networkUpdateTimer += dt;
  if (networkUpdateTimer >= 0.033) {
    if (networkSync && (networkSync.mode === 'FIREBASE' || networkSync.mockInterval)) {
      networkSync.broadcastLocalState();
    }
    networkUpdateTimer = 0;
  }

  // Update HUD values
  if (gameEngine.localKart) {
    const kmh = Math.round(Math.abs(gameEngine.localKart.speed) * 2.5); // scale speed to make it look realistic
    document.getElementById('speed-num').innerText = kmh;
    
    // 1. Rotate speedometer needle (from 25 to 255 degrees)
    const maxSpeed = 120;
    const needleDeg = 25 + (Math.min(kmh, maxSpeed) / maxSpeed) * 230;
    document.getElementById('dial-needle').setAttribute('transform', `rotate(${needleDeg} 40 40)`);

    // 2. Update speedometer radial bar offset (165 = full length)
    const radialOffset = 165 - (Math.min(kmh, maxSpeed) / maxSpeed) * 165;
    document.getElementById('dial-progress').setAttribute('stroke-dashoffset', radialOffset);

    // 3. Update Lap Display
    if (gameEngine.localKart.lap === 4) {
      document.getElementById('lap-display').innerText = `FINISHED`;
      
      // Trigger end of race
      if (!gameEngine.localKart.raceFinished) {
        gameEngine.localKart.raceFinished = true;
        audio.playFanfare();

        // Calculate rank
        const allPlayers = [];
        gameEngine.karts.forEach((k, id) => {
          allPlayers.push({ id, lap: k.lap, lastU: k.lastU || 0, name: k.name });
        });
        allPlayers.sort((a, b) => {
          if (b.lap !== a.lap) return b.lap - a.lap;
          return b.lastU - a.lastU;
        });

        const myRankIndex = allPlayers.findIndex(p => p.id === 'local');
        const suffixes = ['st', 'nd', 'rd', 'th'];
        const rankStr = `${myRankIndex + 1}${suffixes[myRankIndex] || 'th'}`;

        document.getElementById('finish-rank').innerText = `RANK: ${rankStr}`;
        document.getElementById('finish-overlay').style.display = 'block';
      }
    } else {
      document.getElementById('lap-display').innerText = `LAP ${gameEngine.localKart.lap}/3`;
    }

    // 4. Update Leaderboard (Rankings based on Lap + Progress)
    const allPlayers = [];
    gameEngine.karts.forEach((k, id) => {
      allPlayers.push({
        id: id,
        name: k.name,
        charId: k.charId,
        lap: k.lap,
        lastU: k.lastU || 0
      });
    });

    allPlayers.sort((a, b) => {
      if (b.lap !== a.lap) return b.lap - a.lap;
      return b.lastU - a.lastU;
    });

    const lbContainer = document.getElementById('leaderboard');
    if (lbContainer) {
      lbContainer.innerHTML = '';
      allPlayers.slice(0, 4).forEach((player, idx) => {
        const ranks = ['1st', '2nd', '3rd', '4th'];
        const rankClasses = ['row-1st', 'row-2nd', 'row-3rd', 'row-other'];
        
        const row = document.createElement('div');
        row.className = `leaderboard-row ${rankClasses[idx] || 'row-other'}`;

        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        canvas.className = 'avatar-preview';
        const ctx = canvas.getContext('2d');
        assets.drawKartPixelArt(ctx, player.charId, 0); // draw back-view of player kart

        row.innerHTML = `<span class="rank">${ranks[idx] || (idx + 1) + 'th'}</span>`;
        row.appendChild(canvas);
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.innerText = player.name.toUpperCase();
        if (player.id === 'local') {
          nameSpan.style.color = '#00f3ff'; // Highlight local player in cyan
        }
        row.appendChild(nameSpan);

        lbContainer.appendChild(row);
      });
    }

    // 5. Update Minimap positions dynamically using SVG path mapping
    const mapDots = document.getElementById('map-dots');
    const mapPath = document.querySelector('.mini-map path:nth-of-type(2)');
    if (mapDots && mapPath) {
      mapDots.innerHTML = '';
      const pathLength = mapPath.getTotalLength();
      
      gameEngine.karts.forEach((k, id) => {
        const progress = k.lastU || 0;
        // Find coordinate on SVG peanut curve
        const pt = mapPath.getPointAtLength(progress * pathLength);
        
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', pt.x);
        dot.setAttribute('cy', pt.y);
        dot.setAttribute('r', id === 'local' ? '4.5' : '3');
        dot.setAttribute('fill', id === 'local' ? '#00f3ff' : assets.characters.find(c => c.id === k.charId)?.color || '#ff0055');
        if (id === 'local') {
          dot.setAttribute('stroke', '#ffffff');
          dot.setAttribute('stroke-width', '1.2');
        }
        mapDots.appendChild(dot);
      });
    }
  }
}

// Power-Up Mechanics
function triggerPowerUpRoulette() {
  if (isRollingPowerUp || currentPowerUp) return;
  isRollingPowerUp = true;

  const items = ['BOOST', 'STAR', 'BANANA'];
  let rollCount = 0;
  const qBox = document.querySelector('.power-up-question');
  
  const interval = setInterval(() => {
    const itemToShow = items[rollCount % items.length];
    qBox.innerText = getItemEmoji(itemToShow);
    qBox.style.color = '#ffffff';
    qBox.style.fontSize = '1.3rem';
    
    rollCount++;
    if (rollCount > 12) {
      clearInterval(interval);
      // Determine final power-up item randomly
      currentPowerUp = items[Math.floor(Math.random() * items.length)];
      qBox.innerText = getItemEmoji(currentPowerUp);
      qBox.style.color = '#fffb00';
      qBox.style.fontSize = '1.1rem';
      isRollingPowerUp = false;
    }
  }, 100);
}

function getItemEmoji(item) {
  if (item === 'BOOST') return '🍄'; // Mushroom Boost
  if (item === 'STAR') return '⭐';  // Star Invincible
  if (item === 'BANANA') return '🍌'; // Banana Peel Trap
  return '?';
}

function updatePowerUpHUD() {
  const qBox = document.querySelector('.power-up-question');
  if (qBox) {
    qBox.innerText = getItemEmoji(currentPowerUp);
    qBox.style.color = currentPowerUp ? '#fffb00' : '#fdd835';
    qBox.style.fontSize = currentPowerUp ? '1.1rem' : '2rem';
  }
}

function usePowerUp() {
  if (!gameEngine.localKart || !currentPowerUp || isRollingPowerUp) return;

  const localKart = gameEngine.localKart;
  if (currentPowerUp === 'BOOST') {
    if (audio) audio.playBoostSound();
    localKart.boostTimer = 1.5;
  } else if (currentPowerUp === 'STAR') {
    if (audio) audio.playBoostSound();
    localKart.starTimer = 4.0;
  } else if (currentPowerUp === 'BANANA') {
    if (audio) audio.playBananaSound();
    
    // Spawn banana 5 units behind the player
    const backX = -Math.sin(localKart.rotation) * 6;
    const backZ = -Math.cos(localKart.rotation) * 6;
    const spawnPos = new THREE.Vector3(
      localKart.position.x + backX,
      localKart.position.y + 0.2,
      localKart.position.z + backZ
    );
    networkSync.spawnBanana(spawnPos.x, spawnPos.z);
  }

  currentPowerUp = null;
  updatePowerUpHUD();
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  assets = new Assets();
  physics = { physics: new Physics() }; // encapsulate physics object
  gameEngine = new GameEngine('game-canvas', assets, physics.physics);
  
  // Initialize syncing
  const dbStatusText = document.getElementById('db-status-text');
  networkSync = new FirebaseSync(gameEngine, (statusMsg) => {
    if (dbStatusText) dbStatusText.innerText = statusMsg;
  });
  window.networkSyncRef = networkSync; // Bind globally for items sync

  // Load procedurally generated previews to avatar selection grid
  assets.drawCharacterPreviews();

  // Character selection click listener
  const avatarGrid = document.getElementById('avatar-selector');
  avatarGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.avatar-option');
    if (option) {
      document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedCharId = option.dataset.id;
    }
  });

  // Spacebar trigger listener for Power-Up usage
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      usePowerUp();
    }
  });

  // Bind clicks/touches on HUD Power-up card to activate item
  const pUpCard = document.querySelector('.power-up-card');
  if (pUpCard) {
    pUpCard.addEventListener('click', () => {
      usePowerUp();
    });
    pUpCard.addEventListener('touchstart', (e) => {
      e.preventDefault(); // prevent double triggers on mobile
      usePowerUp();
    });
  }

  // Bind Touch Start/End listeners to virtual Pedals (Gas & Brake)
  const bindTouchKey = (elementId, keyName) => {
    const btn = document.getElementById(elementId);
    if (btn) {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (elementId === 'touch-gas') touchingGas = true;
        if (elementId === 'touch-brake') touchingBrake = true;
        if (gameEngine.localKart) {
          gameEngine.localKart.keys[keyName] = true;
        }
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (elementId === 'touch-gas') touchingGas = false;
        if (elementId === 'touch-brake') touchingBrake = false;
        if (gameEngine.localKart) {
          gameEngine.localKart.keys[keyName] = false;
        }
      });
      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        if (elementId === 'touch-gas') touchingGas = false;
        if (elementId === 'touch-brake') touchingBrake = false;
        if (gameEngine.localKart) {
          gameEngine.localKart.keys[keyName] = false;
        }
      });
    }
  };

  bindTouchKey('touch-gas', 'w');
  bindTouchKey('touch-brake', 's');

  // Virtual Joystick implementation for touch devices
  function setupJoystick() {
    const container = document.getElementById('joystick-container');
    const stick = document.getElementById('joystick-stick');
    if (!container || !stick) return;

    let dragStart = null;
    const maxRadius = 35; // Maximum distance stick can travel from base center

    const handleStart = (e) => {
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      dragStart = { x: centerX, y: centerY };
    };

    const handleMove = (e) => {
      if (!dragStart) return;
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      
      let dx = touch.clientX - dragStart.x;
      let dy = touch.clientY - dragStart.y;
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }
      
      // Move stick visual
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      
      // Apply keys based on thresholds
      if (gameEngine.localKart) {
        // Steering
        if (dx < -12) {
          gameEngine.localKart.keys.a = true;
          gameEngine.localKart.keys.d = false;
        } else if (dx > 12) {
          gameEngine.localKart.keys.d = true;
          gameEngine.localKart.keys.a = false;
        } else {
          gameEngine.localKart.keys.a = false;
          gameEngine.localKart.keys.d = false;
        }

        // Forward/backward backup acceleration
        if (dy < -12) {
          gameEngine.localKart.keys.w = true;
          gameEngine.localKart.keys.s = false;
        } else if (dy > 12) {
          gameEngine.localKart.keys.s = true;
          gameEngine.localKart.keys.w = false;
        } else {
          if (!touchingGas) gameEngine.localKart.keys.w = false;
          if (!touchingBrake) gameEngine.localKart.keys.s = false;
        }
      }
    };

    const handleEnd = (e) => {
      if (!dragStart) return;
      dragStart = null;
      stick.style.transform = 'translate(-50%, -50%)'; // Reset position
      
      if (gameEngine.localKart) {
        gameEngine.localKart.keys.a = false;
        gameEngine.localKart.keys.d = false;
        if (!touchingGas) gameEngine.localKart.keys.w = false;
        if (!touchingBrake) gameEngine.localKart.keys.s = false;
      }
    };

    container.addEventListener('touchstart', handleStart, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd);
    container.addEventListener('touchcancel', handleEnd);
  }

  setupJoystick();

  // Buttons Logic
  document.getElementById('btn-local-play').addEventListener('click', () => {
    if (!audio) audio = new RetroAudio();
    audio.init();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    
    const user = document.getElementById('username').value.trim();
    startRacing('LOCAL_SOLO', user, false);
  });

  document.getElementById('btn-go-online').addEventListener('click', () => {
    showScreen('screen-lobby');
  });

  document.getElementById('btn-lobby-back').addEventListener('click', () => {
    showScreen('screen-menu');
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    if (!audio) audio = new RetroAudio();
    audio.init();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();

    const user = document.getElementById('username').value.trim();
    const rId = document.getElementById('room-id').value.trim() || 'LOBBY1';
    startRacing(rId, user, true);
  });

  document.getElementById('btn-open-settings').addEventListener('click', () => {
    showScreen('screen-settings');
    // Pre-fill with current localStorage config
    const saved = localStorage.getItem('firebase_config') || '';
    document.getElementById('firebase-config-text').value = saved;
  });

  document.getElementById('btn-settings-back').addEventListener('click', () => {
    showScreen('screen-menu');
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const configVal = document.getElementById('firebase-config-text').value.trim();
    if (!configVal) {
      localStorage.removeItem('firebase_config');
      networkSync.mode = 'MOCK';
      dbStatusText.innerText = 'Local Mock Mode Active (Config Deleted).';
      alert('Config cleared. Reverting to local broadcast mode.');
      showScreen('screen-menu');
      return;
    }
    const ok = networkSync.saveConfig(configVal);
    if (ok) {
      alert('Firebase config saved & initialized successfully!');
      showScreen('screen-menu');
    }
  });

  // Finish Overlay Menu Back Button
  document.getElementById('btn-finish-menu').addEventListener('click', () => {
    // Stop game loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (audio) {
      audio.stopMusic();
    }
    if (networkSync) {
      networkSync.leaveRoom();
    }

    // Clean karts
    gameEngine.karts.forEach((k, id) => {
      k.destroy(gameEngine.scene);
    });
    gameEngine.karts.clear();
    gameEngine.localKart = null;

    // Reset visibility
    document.getElementById('finish-overlay').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('canvas-container').style.display = 'none';
    document.getElementById('ui-container').style.display = 'flex';
    showScreen('screen-menu');
  });
});
import * as THREE from 'three';
