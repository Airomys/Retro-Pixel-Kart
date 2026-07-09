import * as THREE from 'three';

export class Physics {
  constructor() {
    // Define Track Centerline Vertices for a beautiful, flowing race track
    // Scaled up for fun driving speeds
    this.trackPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(140, 0, -50),
      new THREE.Vector3(260, 0, 20),
      new THREE.Vector3(340, 0, 120),
      new THREE.Vector3(300, 0, 240),
      new THREE.Vector3(180, 0, 180),  // S-curve crossover
      new THREE.Vector3(100, 0, 280),  // loop crossover
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(-100, 0, 320), // hair-pin loop
      new THREE.Vector3(-220, 0, 220),
      new THREE.Vector3(-140, 0, 100),
      new THREE.Vector3(-50, 0, 120)
    ];

    // Create a closed spline from track points
    this.trackCurve = new THREE.CatmullRomCurve3(this.trackPoints, true, 'centripetal');
    this.trackWidth = 30; // Width of the asphalt track in meters
    this.grassSlowdown = 0.4; // Multiplier to speed when on grass
  }

  // Get track info at player's position
  getTrackStatus(position) {
    // Find closest point on the track spline to the position
    const samples = 100;
    let minDistance = Infinity;
    let closestPoint = null;
    let closestU = 0;

    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const pt = this.trackCurve.getPointAt(u);
      const dist = position.distanceTo(pt);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = pt;
        closestU = u;
      }
    }

    // Is the player off the track (on the grass)?
    const isOffTrack = minDistance > this.trackWidth / 2;
    
    // Wall collision: if they go beyond outer boundary, push them back
    const maxBound = this.trackWidth / 2 + 3; // soft wall at outer limits
    let wallCollision = false;
    let pushVector = new THREE.Vector3();

    if (minDistance > maxBound) {
      wallCollision = true;
      // Vector pointing from closest track point to player
      pushVector.copy(position).sub(closestPoint).normalize();
      // Set height to 0
      pushVector.y = 0;
    }

    return {
      isOffTrack,
      wallCollision,
      pushVector,
      minDistance,
      closestU
    };
  }
}
