// === CONFIGURABLE CONSTANTS ===
const MIN_STRIVE_DISTANCE = 14;
const MAX_ACCELERATION_RATE = 0.8;
const ACCELERATION_DURATION = 30;
const MIN_REACTION_TIME = 200;
const MAX_REACTION_TIME = 800;
const POST_EAT_SLOWDOWN = 0.3;
const NEIGHBOR_RADIUS = 150;
const POINTER_REPEL_RADIUS = 120;  // distance within which fish are repelled
const POINTER_REPEL_FORCE = 0.9;   // repulsion strength

let fishes = [];
let foods = [];
let score = 0;
let deadGenerations = 0;
let pointerPositions = [];
let TOTAL_FOOD = 60; // desired constant food count

class Fish {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(2);
    this.acc = createVector(0, 0);
    this.nn = new NeuralNetwork(4, 8, 2, 0.3);
    this.maxSpeed = 3.5;
    this.maxForce = 0.35;
    this.spawnTime = millis();
    this.lastEat = millis();
    this.success = 0;
    this.dead = false;
    this.lastPos = this.pos.copy();
    this.stuckTimer = 0;
    this.wanderDir = p5.Vector.random2D();
    this.leader = null;
    this.lastLeaderCheck = millis();
    this.accelBoost = 0;
    this.boostFramesLeft = 0;
    this.targetFood = null;
    this.reactionTimer = null;
  }

  update(allFishes) {
    if (this.dead) return;

    // Separation
    let sep = createVector(0, 0);
    for (const other of allFishes) {
      if (other === this || other.dead) continue;
      const d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < MIN_STRIVE_DISTANCE) {
        sep.add(p5.Vector.sub(this.pos, other.pos).normalize().div(d));
      }
    }
    sep.limit(this.maxForce * 0.8);

    // Leader detection
    let bestLeader = null, bestScore = -1;
    for (const other of allFishes) {
      if (other === this || other.dead) continue;
      const d = p5.Vector.dist(this.pos, other.pos);
      if (d < NEIGHBOR_RADIUS && other.success > bestScore) {
        bestScore = other.success; bestLeader = other;
      }
    }
    if (bestLeader && bestLeader.success > this.success + 1) { this.leader = bestLeader; }
    else if (millis() - this.lastLeaderCheck > 5000) { this.leader = null; this.lastLeaderCheck = millis(); }

    // Closest food
    let closest = null, minD = Infinity;
    for (const f of foods) {
      if (f.claimedBy && f.claimedBy !== this) continue;
      const d = p5.Vector.dist(this.pos, f);
      if (d < minD) { minD = d; closest = f; }
    }

    if (closest && !this.targetFood) {
      this.targetFood = closest;
      this.reactionTimer = millis() + random(MIN_REACTION_TIME, MAX_REACTION_TIME);
    }

    if (this.boostFramesLeft > 0) {
      this.boostFramesLeft--;
      if (this.boostFramesLeft <= 0) this.accelBoost = 0;
    }

    let steer = createVector(0, 0);

    // Pointer repulsion
    for (const p of pointerPositions) {
      const d = p5.Vector.dist(this.pos, p);
      if (d < POINTER_REPEL_RADIUS) {
        const repel = p5.Vector.sub(this.pos, p)
          .normalize()
          .mult(map(d, 0, POINTER_REPEL_RADIUS, POINTER_REPEL_FORCE, 0));
        steer.add(repel);
      }
    }

    if (this.targetFood) {
      if (this.reactionTimer && millis() >= this.reactionTimer) {
        if (!this.targetFood.claimedBy) this.targetFood.claimedBy = this;
        if (this.targetFood.claimedBy === this) {
          if (this.accelBoost === 0) {
            this.accelBoost = random(0, MAX_ACCELERATION_RATE);
            this.boostFramesLeft = ACCELERATION_DURATION;
          }
          const dx = (this.targetFood.x - this.pos.x) / width;
          const dy = (this.targetFood.y - this.pos.y) / height;
          const fx = this.targetFood.x / width;
          const fy = this.targetFood.y / height;
          const out = this.nn.feedForward([dx, dy, fx, fy]);
          const accelMultiplier = 0.8 + this.accelBoost;
          steer.add(createVector(
            map(out[0][0], 0, 1, -this.maxForce, this.maxForce) * accelMultiplier,
            map(out[1][0], 0, 1, -this.maxForce, this.maxForce) * accelMultiplier
          ));

          if (frameCount % 5 === 0) {
            const desired = p5.Vector.sub(this.targetFood, this.pos).normalize();
            this.trainNN([dx, dy, fx, fy],
              [map(desired.x, -1, 1, 0, 1), map(desired.y, -1, 1, 0, 1)]);
          }

          const d = p5.Vector.dist(this.pos, this.targetFood);
          if (d < 15) {
            this.lastEat = millis();
            this.success++;
            score++;
            const idx = foods.indexOf(this.targetFood);
            if (idx !== -1) {
              delete this.targetFood.claimedBy;
              foods.splice(idx, 1);
            }
            // Replace eaten food to maintain constant count
            foods.push(createVector(random(20, width - 20), random(20, height - 20)));

            this.vel.mult(POST_EAT_SLOWDOWN);
            this.targetFood = null;
            this.reactionTimer = null;
          }
        }
      }
    } else {
      steer.add(this.wander().mult(0.8));
    }

    // Stuck detection
    const moveDist = p5.Vector.dist(this.pos, this.lastPos);
    if (moveDist < 0.5) {
      this.stuckTimer += deltaTime;
      if (this.stuckTimer > 1000) {
        steer.add(p5.Vector.random2D().mult(this.maxForce * 2));
        this.stuckTimer = 0;
      }
    } else { this.stuckTimer = 0; }
    this.lastPos = this.pos.copy();

    // Alignment & cohesion
    let alignment = createVector(0, 0), cohesion = createVector(0, 0), count = 0;
    for (const other of allFishes) {
      if (other === this || other.dead) continue;
      const d = p5.Vector.dist(this.pos, other.pos);
      if (d < NEIGHBOR_RADIUS) {
        alignment.add(other.vel);
        cohesion.add(other.pos);
        count++;
      }
    }
    if (count > 0) {
      alignment.div(count).setMag(this.maxForce * 0.8);
      cohesion.div(count).sub(this.pos).setMag(this.maxForce * 0.6);
      steer.add(alignment.mult(1.2));
      steer.add(cohesion.mult(1.2));
    }

    if (this.leader) {
      const dir = p5.Vector.sub(this.leader.pos, this.pos).setMag(this.maxForce);
      steer.add(dir.mult(1.3));
    }

    steer.add(this.edgeRepulsion());
    steer.add(sep);

    this.applyForce(steer);
    this.integrateAndCollide();

    const elapsed = millis() - Math.max(this.lastEat, this.spawnTime);
    if (elapsed > 60000) { this.dead = true; }
  }

  applyForce(f) { this.acc.add(f); }
  wander() { this.wanderDir.rotate(random(-0.2, 0.2)); return this.wanderDir.copy().setMag(this.maxForce * 0.5); }
  edgeRepulsion() {
    const m = 24; let f = createVector(0, 0);
    if (this.pos.x < m) f.x += map(this.pos.x, 0, m, 1, 0);
    if (this.pos.x > width - m) f.x -= map(this.pos.x, width - m, width, 1, 0);
    if (this.pos.y < m) f.y += map(this.pos.y, 0, m, 1, 0);
    if (this.pos.y > height - m) f.y -= map(this.pos.y, height - m, height, 1, 0);
    return f.mult(this.maxForce);
  }
  integrateAndCollide() {
    this.vel.add(this.acc); this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel); this.acc.mult(0);
    const eps = 0.001;
    if (this.pos.x >= width) { this.pos.x = width - eps; this.vel.x = -abs(this.vel.x) * 0.8; }
    if (this.pos.x <= 0) { this.pos.x = eps; this.vel.x = abs(this.vel.x) * 0.8; }
    if (this.pos.y >= height) { this.pos.y = height - eps; this.vel.y = -abs(this.vel.y) * 0.8; }
    if (this.pos.y <= 0) { this.pos.y = eps; this.vel.y = abs(this.vel.y) * 0.8; }
  }
  trainNN(input, target) { for (let i = 0; i < 4; i++) this.nn.train(input, target); }
  draw() {
    if (this.dead) return;
    const elapsed = millis() - Math.max(this.lastEat, this.spawnTime);
    const fade = map(constrain(elapsed, 0, 60000), 0, 60000, 255, 100);
    const grey = map(constrain(elapsed, 0, 60000), 0, 60000, 0, 150);
    push();
    translate(this.pos.x, this.pos.y);
    const angle = atan2(this.vel.y, this.vel.x);
    rotate(angle);
    fill(fade, grey, grey);
    noStroke();
    ellipse(0, 0, 14, 8);
    triangle(-7, 0, -13, -3, -13, 3);
    pop();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  // Initial spawn of 20 fishes and TOTAL_FOOD food
  spawnFishes(20);
  for (let i = 0; i < TOTAL_FOOD; i++) {
    foods.push(createVector(random(20, width - 20), random(20, height - 20)));
  }

  // Button to set food count dynamically
  document.getElementById('setFoodCountBtn').onclick = () => {
    const val = parseInt(document.getElementById('foodCount').value);
    if (!isNaN(val) && val > 0) {
      TOTAL_FOOD = val;
      // Adjust foods array to match new TOTAL_FOOD
      while (foods.length < TOTAL_FOOD) {
        foods.push(createVector(random(20, width - 20), random(20, height - 20)));
      }
      while (foods.length > TOTAL_FOOD) {
        foods.pop();
      }
    }
  };

  document.getElementById('spawnBtn').onclick = () => {
    spawnFishes(parseInt(document.getElementById('fishCount').value));
  };
}

function draw() {
  background(20, 50, 100);

  for (const f of fishes) f.update(fishes);
  fishes = fishes.filter(f => !f.dead);

  if (fishes.length === 0) {
    deadGenerations++;
    spawnFishes(parseInt(document.getElementById('fishCount').value));
  }

  // Safety: keep food count constant
  while (foods.length < TOTAL_FOOD) {
    foods.push(createVector(random(20, width - 20), random(20, height - 20)));
  }
  if (foods.length > TOTAL_FOOD) foods.length = TOTAL_FOOD;

  fill(255, 150, 0);
  for (const food of foods) ellipse(food.x, food.y, 10, 10);

  for (const f of fishes) f.draw();

  fill(255);
  text(`Score: ${score}`, 10, 20);
  text(`Fishes alive: ${fishes.length}`, 10, 40);
  text(`Dead Generations: ${deadGenerations}`, 10, 60);
  text(`Food Count: ${foods.length}`, 10, 80);
  text(`Pointer Repel Radius: ${POINTER_REPEL_RADIUS}px`, 10, 100);
}

function spawnFishes(n) {
  for (let i = 0; i < n; i++) {
    fishes.push(new Fish(random(width), random(height)));
  }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// === POINTER/TAP HANDLERS ===
function mouseMoved() { pointerPositions = [createVector(mouseX, mouseY)]; }
function mouseDragged() { pointerPositions = [createVector(mouseX, mouseY)]; }
function mouseReleased() { pointerPositions = []; }
// === POINTER/TAP HANDLERS ===
function mouseMoved() { 
  pointerPositions = [createVector(mouseX, mouseY)]; 
}
function mouseDragged() { 
  pointerPositions = [createVector(mouseX, mouseY)]; 
}
function mouseReleased() { 
  pointerPositions = []; 
}

// For mobile: update on every touch frame
// Called automatically by p5 when a touch begins
function touchStarted() {
  pointerPositions = touches.map(t => createVector(t.x, t.y));
  return false; // prevent default scrolling
}

// Called automatically by p5 when a touch moves
function touchMoved() {
  pointerPositions = touches.map(t => createVector(t.x, t.y));
  return false;
}

// Called automatically by p5 when all touches end
function touchEnded() {
  pointerPositions = [];
  return false;
}

// Called automatically by p5 when the mouse moves
function mouseMoved() {
  pointerPositions = [createVector(mouseX, mouseY)];
}

// Called automatically by p5 when the mouse is dragged
function mouseDragged() {
  pointerPositions = [createVector(mouseX, mouseY)];
}

// Called automatically by p5 when the mouse is released
function mouseReleased() {
  pointerPositions = [];
}



