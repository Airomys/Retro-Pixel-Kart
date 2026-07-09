import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, onDisconnect, remove } from 'firebase/database';

export class FirebaseSync {
  constructor(gameEngine, onStatusChange) {
    this.gameEngine = gameEngine;
    this.onStatusChange = onStatusChange;
    this.app = null;
    this.db = null;
    this.mode = 'MOCK'; // 'FIREBASE' or 'MOCK'
    
    this.roomId = 'LOBBY1';
    this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    this.playersList = {};

    // BroadcastChannel for local cross-tab multiplayer simulation
    this.mockChannel = new BroadcastChannel('retro_kart_lobby');
    this.setupMockListener();

    // Default config provided by user
    const defaultUserConfig = {
      apiKey: "AIzaSyDiNzI1I14KiP0jdGSqe3rXOJQV2xvV3y4",
      authDomain: "multiplayer-822b2.firebaseapp.com",
      projectId: "multiplayer-822b2",
      storageBucket: "multiplayer-822b2.firebasestorage.app",
      messagingSenderId: "666963431978",
      appId: "1:666963431978:web:8bf58dbfea3b5220876953",
      databaseURL: "https://multiplayer-822b2-default-rtdb.firebaseio.com"
    };

    // Try loading saved config from localStorage, or use default user config
    let configToUse = null;
    const savedConfig = localStorage.getItem('firebase_config');
    if (savedConfig) {
      try {
        configToUse = JSON.parse(savedConfig);
      } catch (e) {
        console.warn("Saved firebase config is invalid:", e);
      }
    }

    if (!configToUse) {
      configToUse = defaultUserConfig;
    }

    if (configToUse) {
      this.initializeFirebase(configToUse);
    }
  }

  initializeFirebase(config) {
    try {
      this.app = initializeApp(config);
      this.db = getDatabase(this.app);
      this.mode = 'FIREBASE';
      this.onStatusChange('FIREBASE Connected ✔️');
      return true;
    } catch (e) {
      console.error("Firebase init failed:", e);
      this.mode = 'MOCK';
      this.onStatusChange('Init Error, fell back to local BroadcastChannel ⚠️');
      return false;
    }
  }

  saveConfig(configString) {
    try {
      const config = JSON.parse(configString);
      const ok = this.initializeFirebase(config);
      if (ok) {
        localStorage.setItem('firebase_config', configString);
        return true;
      }
    } catch (e) {
      alert("Invalid JSON format for Firebase configuration!");
    }
    return false;
  }

  joinRoom(roomId, localPlayerName, charId) {
    this.roomId = roomId;
    this.playerName = localPlayerName;
    this.charId = charId;

    if (this.mode === 'FIREBASE' && this.db) {
      this.setupFirebaseRoom();
    } else {
      this.setupMockRoom();
    }
  }

  // --- FIREBASE IMPLEMENTATION ---
  setupFirebaseRoom() {
    this.playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`);
    this.roomRef = ref(this.db, `rooms/${this.roomId}/players`);
    this.bananasRef = ref(this.db, `rooms/${this.roomId}/bananas`);

    // Clean up database entry when player closes tab
    onDisconnect(this.playerRef).remove();

    // Listen to changes in the room
    onValue(this.roomRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.syncPlayers(data);
    });

    // Listen to banana drops in the room
    onValue(this.bananasRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.syncBananas(data);
    });
  }

  syncBananas(bananasData) {
    // Clear all current bananas in GameEngine
    this.gameEngine.bananas.forEach(b => {
      this.gameEngine.scene.remove(b.sprite);
    });
    this.gameEngine.bananas = [];

    // Repopulate from database
    Object.keys(bananasData).forEach(bananaId => {
      const b = bananasData[bananaId];
      import('three').then(THREE => {
        this.gameEngine.dropBananaLocally(new THREE.Vector3(b.x, 0.2, b.z), b.ownerId, bananaId);
      });
    });
  }

  // --- MOCK BROADCASTCHANNEL IMPLEMENTATION ---
  setupMockRoom() {
    this.onStatusChange(`LOCAL MOCK Mode Active. Open another tab to play!`);
    
    // Periodically broadcast hello to discover others
    this.mockInterval = setInterval(() => {
      this.broadcastLocalState();
    }, 100);

    // Send departure on window close
    window.addEventListener('beforeunload', () => {
      this.mockChannel.postMessage({
        type: 'LEAVE',
        playerId: this.playerId
      });
    });
  }

  setupMockListener() {
    this.mockChannel.onmessage = (event) => {
      const data = event.data;
      if (!data || this.mode === 'FIREBASE') return;

      if (data.type === 'STATE' && data.roomId === this.roomId) {
        // Feed into playersList
        if (data.playerId !== this.playerId) {
          this.playersList[data.playerId] = {
            name: data.name,
            charId: data.charId,
            x: data.x,
            z: data.z,
            rotation: data.rotation,
            lap: data.lap,
            lastSeen: Date.now()
          };
          this.updateRemoteKarts();
        }
      } else if (data.type === 'LEAVE') {
        delete this.playersList[data.playerId];
        this.gameEngine.removeRemotePlayer(data.playerId);
        this.updatePlayerListUI();
      } else if (data.type === 'SPAWN_BANANA' && data.roomId === this.roomId) {
        if (data.ownerId !== this.playerId) {
          import('three').then(THREE => {
            this.gameEngine.dropBananaLocally(new THREE.Vector3(data.x, 0.2, data.z), data.ownerId, data.bananaId);
          });
        }
      } else if (data.type === 'DESTROY_BANANA' && data.roomId === this.roomId) {
        this.destroyBananaLocally(data.bananaId);
      }
    };

    // Clean dead mock connections periodically
    setInterval(() => {
      if (this.mode === 'MOCK') {
        const now = Date.now();
        let changed = false;
        Object.keys(this.playersList).forEach(id => {
          if (now - this.playersList[id].lastSeen > 2000) {
            delete this.playersList[id];
            this.gameEngine.removeRemotePlayer(id);
            changed = true;
          }
        });
        if (changed) this.updatePlayerListUI();
      }
    }, 1000);
  }

  // Network helpers for Banana items
  spawnBanana(x, z) {
    if (this.mode === 'FIREBASE' && this.db) {
      const bananasRef = ref(this.db, `rooms/${this.roomId}/bananas`);
      const newBananaRef = push(bananasRef);
      set(newBananaRef, { x, z, ownerId: this.playerId });
    } else {
      // Mock mode
      const bananaId = 'banana_' + Math.random().toString(36).substr(2, 9);
      this.mockChannel.postMessage({
        type: 'SPAWN_BANANA',
        roomId: this.roomId,
        bananaId,
        x,
        z,
        ownerId: this.playerId
      });
      import('three').then(THREE => {
        this.gameEngine.dropBananaLocally(new THREE.Vector3(x, 0.2, z), this.playerId, bananaId);
      });
    }
  }

  removeBanana(bananaId) {
    if (this.mode === 'FIREBASE' && this.db) {
      const itemRef = ref(this.db, `rooms/${this.roomId}/bananas/${bananaId}`);
      remove(itemRef);
    } else {
      this.mockChannel.postMessage({
        type: 'DESTROY_BANANA',
        roomId: this.roomId,
        bananaId
      });
      this.destroyBananaLocally(bananaId);
    }
  }

  destroyBananaLocally(bananaId) {
    const idx = this.gameEngine.bananas.findIndex(b => b.id === bananaId);
    if (idx !== -1) {
      this.gameEngine.scene.remove(this.gameEngine.bananas[idx].sprite);
      this.gameEngine.bananas.splice(idx, 1);
    }
  }

  // Sync positions
  broadcastLocalState() {
    const local = this.gameEngine.localKart;
    if (!local) return;

    const payload = {
      name: this.playerName,
      charId: this.charId,
      x: local.position.x,
      z: local.position.z,
      rotation: local.rotation,
      lap: local.lap,
      lastU: local.lastU || 0
    };

    if (this.mode === 'FIREBASE' && this.db) {
      set(this.playerRef, payload);
    } else {
      this.mockChannel.postMessage({
        type: 'STATE',
        roomId: this.roomId,
        playerId: this.playerId,
        ...payload
      });
    }
  }

  // Handle Firebase snapshot updates
  syncPlayers(firebaseData) {
    // Delete missing
    Object.keys(this.playersList).forEach(id => {
      if (!firebaseData[id]) {
        delete this.playersList[id];
        this.gameEngine.removeRemotePlayer(id);
      }
    });

    // Update others
    Object.keys(firebaseData).forEach(id => {
      if (id !== this.playerId) {
        this.playersList[id] = firebaseData[id];
      }
    });

    this.updateRemoteKarts();
  }

  // Update GameEngine objects & UI list
  updateRemoteKarts() {
    const ImportClass = this.gameEngine.karts;
    
    Object.keys(this.playersList).forEach(id => {
      const data = this.playersList[id];
      let remoteKart = this.gameEngine.karts.get(id);

      if (!remoteKart) {
        // Instantiate new Kart from model
        // Dynamic import / constructor logic
        import('../game/Kart.js').then(module => {
          const newKart = new module.Kart(data.charId, data.name, false);
          newKart.position.set(data.x, 0, data.z);
          newKart.rotation = data.rotation;
          newKart.lap = data.lap;
          newKart.lastU = data.lastU || 0;
          this.gameEngine.addRemotePlayer(id, newKart);
        });
      } else {
        // Lerp position for network smoothness
        remoteKart.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3);
        remoteKart.rotation = data.rotation;
        remoteKart.lap = data.lap;
        remoteKart.lastU = data.lastU || 0;
      }
    });

    this.updatePlayerListUI();
  }

  updatePlayerListUI() {
    const listContainer = document.getElementById('active-players-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    
    // Add local player
    const localLi = document.createElement('div');
    localLi.className = 'player-list-item';
    localLi.innerHTML = `
      <span class="player-color-dot" style="background-color: ${this.gameEngine.assets.characters.find(c => c.id === this.charId)?.color || '#fff'}"></span>
      <span style="color: var(--neon-cyan)">${this.playerName} (YOU) - LAP ${this.gameEngine.localKart?.lap || 1}</span>
    `;
    listContainer.appendChild(localLi);

    // Add remote players
    Object.keys(this.playersList).forEach(id => {
      const data = this.playersList[id];
      const charColor = this.gameEngine.assets.characters.find(c => c.id === data.charId)?.color || '#fff';
      
      const li = document.createElement('div');
      li.className = 'player-list-item';
      li.innerHTML = `
        <span class="player-color-dot" style="background-color: ${charColor}"></span>
        <span>${data.name} - LAP ${data.lap || 1}</span>
      `;
      listContainer.appendChild(li);
    });
  }

  leaveRoom() {
    if (this.mode === 'FIREBASE' && this.playerRef) {
      remove(this.playerRef);
    }
    if (this.mockInterval) clearInterval(this.mockInterval);
    
    this.playersList = {};
    this.updatePlayerListUI();
  }
}
