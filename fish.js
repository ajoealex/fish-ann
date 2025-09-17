class Fish {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(2);
    this.acc = createVector(0, 0);
    this.nn = new NeuralNetwork([4, 12, 8, 2], 0.3);
    this.isParent = false;
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
    this.size = MIN_FISH_SIZE;
    this.totalFoodEaten = 0;
  }

  getEatRadius() {
    return this.size * 1.0 + 5;
  }

  update(allFishes) {
    if (this.dead) return;

    const timeHungry = millis() - this.lastEat;
    let desperate = timeHungry > STARVATION_WARNING;

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
    if (bestLeader && bestLeader.success > this.success + 1) {
      this.leader = bestLeader;
    } else if (millis() - this.lastLeaderCheck > 5000) {
      this.leader = null; this.lastLeaderCheck = millis();
    }

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
      const radius = spookActive ? POINTER_REPEL_RADIUS * SPOOK_RADIUS_BOOST : POINTER_REPEL_RADIUS;
      if (d < radius) {
        let repel = p5.Vector.sub(this.pos, p).normalize();
        let force = map(d, 0, radius, POINTER_REPEL_FORCE, 0);
        if (spookActive) force *= SPOOK_ACCEL_BOOST;
        steer.add(repel.mult(force));
      }
    }

    // Desperation wandering
    if (timeHungry > STARVATION_CRITICAL) {
      steer.add(p5.Vector.random2D().setMag(this.maxForce * 2));
    }

    // === FOOD STEERING (NN + direct blended) ===
    if (this.targetFood) {
      if (p5.Vector.dist(this.pos, this.targetFood) < this.size) {
        this.reactionTimer = millis();
      }
      if (this.reactionTimer && millis() >= this.reactionTimer) {
        if (!this.targetFood.claimedBy) this.targetFood.claimedBy = this;
        if (this.targetFood.claimedBy === this) {
          if (this.accelBoost === 0) {
            this.accelBoost = random(0, MAX_ACCELERATION_RATE);
            this.boostFramesLeft = ACCELERATION_DURATION;
          }

          const dir = p5.Vector.sub(this.targetFood, this.pos).normalize();
          const out = this.nn.feedForward([
            dir.x, dir.y,
            this.pos.x / width, this.pos.y / height
          ]);

          const nnSteer = createVector(
            map(out[0][0], 0, 1, -this.maxForce, this.maxForce),
            map(out[1][0], 0, 1, -this.maxForce, this.maxForce)
          );

          const desired = p5.Vector.sub(this.targetFood, this.pos).setMag(this.maxForce);

          // 🔹 Blend factor from slider
          const blendFactor = parseFloat(document.getElementById('blendSlider').value) || 0.5;
          const blended = p5.Vector.lerp(nnSteer, desired, blendFactor)
            .mult(0.8 + this.accelBoost);

          steer.add(blended.limit(this.maxForce));

          this.trainNN(
            [dir.x, dir.y, this.pos.x / width, this.pos.y / height],
            [map(desired.x, -this.maxForce, this.maxForce, 0, 1),
             map(desired.y, -this.maxForce, this.maxForce, 0, 1)]
          );

          // Eating logic
          const d = p5.Vector.dist(this.pos, this.targetFood);
          const eatRadius = this.getEatRadius();
          if (d <= eatRadius) {
            if (!this.targetFood.claimedBy || this.targetFood.claimedBy === this) {
              this.lastEat = millis();
              this.success++;
              score++;
              foodEatenCount++;
              this.totalFoodEaten++;

              this.size = map(Math.min(this.totalFoodEaten, FOOD_FOR_OFFSPRING),
                0, FOOD_FOR_OFFSPRING,
                MIN_FISH_SIZE, MAX_FISH_SIZE);

              const idx = foods.indexOf(this.targetFood);
              if (idx !== -1) {
                delete this.targetFood.claimedBy;
                foods.splice(idx, 1);
              }
              foods.push(createVector(random(20, width - 20), random(20, height - 20)));

              while (this.totalFoodEaten >= FOOD_FOR_OFFSPRING) {
                for (let i = 0; i < OFFSPRING_COUNT; i++) {
                  const child = new Fish(this.pos.x + random(-10, 10), this.pos.y + random(-10, 10));
                  if (typeof this.nn.clone === 'function') {
                    child.nn = this.nn.clone();
                    if (typeof child.nn.mutate === 'function') child.nn.mutate(NN_MUTATION_RATE);
                  }
                  child.vel = p5.Vector.random2D().mult(2);
                  fishes.push(child);
                }
                this.totalFoodEaten -= FOOD_FOR_OFFSPRING;
                this.size = max(this.size - 1, MIN_FISH_SIZE);
                this.isParent = true;
              }

              this.vel.mult(POST_EAT_SLOWDOWN);
              this.targetFood = null;
              this.reactionTimer = null;
            }
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
    } else {
      this.stuckTimer = 0;
    }
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
      let groupFactor = desperate ? 0.4 : 1.2;
      steer.add(alignment.mult(groupFactor));
      steer.add(cohesion.mult(groupFactor));
    }

    if (this.leader) {
      steer.add(p5.Vector.sub(this.leader.pos, this.pos).setMag(this.maxForce).mult(1.3));
    }

    steer.add(this.edgeRepulsion());
    steer.add(sep);

    this.applyForce(steer);
    this.integrateAndCollide();

    if (millis() - Math.max(this.lastEat, this.spawnTime) >= STARVATION_CRITICAL) {
      this.dead = true;
      bestFishArchive.push(this);
    }
  }

  applyForce(f) { this.acc.add(f); }

  wander() {
    this.wanderDir.rotate(random(-0.2, 0.2));
    return this.wanderDir.copy().setMag(this.maxForce * 0.5);
  }

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
    const fade = map(constrain(elapsed, 0, STARVATION_CRITICAL), 0, STARVATION_CRITICAL, 255, 100);
    const grey = map(constrain(elapsed, 0, STARVATION_CRITICAL), 0, STARVATION_CRITICAL, 0, 150);

    push();
    translate(this.pos.x, this.pos.y);
    const angle = atan2(this.vel.y, this.vel.x);
    rotate(angle);

    fill(fade, grey, grey);
    noStroke();
    ellipse(0, 0, this.size, this.size * 0.6);
    triangle(-this.size / 2, 0, -this.size * 0.9, -this.size * 0.2, -this.size * 0.9, this.size * 0.2);

    if (this.size >= MAX_FISH_SIZE * 0.95) {
      strokeWeight(1);
      const stripeCount = 3;
      for (let i = 1; i <= stripeCount; i++) {
        const xPos = map(i, 1, stripeCount + 1, -this.size / 4, this.size / 4);
        if (this.isParent) {
          stroke(i === 2 ? color(0, 200, 255) : color(255, 220));
        } else {
          stroke(255, 220);
        }
        line(xPos, -this.size * 0.3, xPos, this.size * 0.3);
      }
    }

    if (showEatRadius) {
      noFill();
      stroke(0, 200, 255, 120);
      const r = this.getEatRadius();
      ellipse(0, 0, r * 2, r * 2);
    }

    if (showFoodTargets && this.targetFood) {
      stroke(0, 255, 0, 120);
      line(0, 0, this.targetFood.x - this.pos.x, this.targetFood.y - this.pos.y);
    }

    pop();
  }
}
