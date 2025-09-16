// === CONFIGURABLE CONSTANTS ===
const MIN_STRIVE_DISTANCE = 14;
const MAX_ACCELERATION_RATE = 0.8;
const ACCELERATION_DURATION = 30;
const MIN_REACTION_TIME = 200;
const MAX_REACTION_TIME = 800;
const POST_EAT_SLOWDOWN = 0.3;
const NEIGHBOR_RADIUS = 150;
const POINTER_REPEL_RADIUS = 120; // distance within which fish are repelled
const POINTER_REPEL_FORCE = 0.9; // repulsion strength
const STARVATION_WARNING = 300000; // 5 min before reducing group behavior
const STARVATION_CRITICAL = 330000; // 5.5 min before splitting from group

// === REPRODUCTION & GROWTH CONFIG ===
const FOOD_FOR_OFFSPRING = 20;
const OFFSPRING_COUNT = 2;
const MIN_FISH_SIZE = 8;
const MAX_FISH_SIZE = 20;
const NN_MUTATION_RATE = 0.05;

let fishes = [];
let bestFishArchive = [];
const POPULATION_SIZE = 20;
let foods = [];
let score = 0;
let foodEatenCount = 0;
let deadGenerations = 0;
let pointerPositions = [];
let TOTAL_FOOD = 60; // desired constant food count

// === SPOOK SETTINGS ===
let spookActive = false;
let spookTimer = 0;
const SPOOK_DURATION = 30; // frames (~0.5s at 60fps)
const SPOOK_ACCEL_BOOST = 1.5; // multiplier for acceleration force
const SPOOK_RADIUS_BOOST = 2; // multiplier for repulsion radius

class Fish {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(2);
        this.acc = createVector(0, 0);
        this.nn = new NeuralNetwork([4, 12, 8, 2], 0.3);
        this.isParent = false; // mark parent fish after reproduction
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
        this.size = MIN_FISH_SIZE; // fish size starts small
        this.totalFoodEaten = 0;
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
        let bestLeader = null,
            bestScore = -1;
        for (const other of allFishes) {
            if (other === this || other.dead) continue;
            const d = p5.Vector.dist(this.pos, other.pos);
            if (d < NEIGHBOR_RADIUS && other.success > bestScore) {
                bestScore = other.success;
                bestLeader = other;
            }
        }
        if (bestLeader && bestLeader.success > this.success + 1) {
            this.leader = bestLeader;
        } else if (millis() - this.lastLeaderCheck > 5000) {
            this.leader = null;
            this.lastLeaderCheck = millis();
        }

        // Closest food
        let closest = null,
            minD = Infinity;
        for (const f of foods) {
            if (f.claimedBy && f.claimedBy !== this) continue;
            const d = p5.Vector.dist(this.pos, f);
            if (d < minD) {
                minD = d;
                closest = f;
            }
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

        // Pointer repulsion with spook
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

        if (timeHungry > STARVATION_CRITICAL) {
            steer.add(p5.Vector.random2D().setMag(this.maxForce * 2));
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
                    // Dynamic eat radius scales with fish size
                    const eatRadius = this.size * 0.5;
                    if (d < eatRadius) {
                        this.lastEat = millis();
                        this.success++;
                        score++;
                        foodEatenCount++;
                        this.totalFoodEaten++;

                        // Grow toward MAX_FISH_SIZE
                        this.size = map(Math.min(this.totalFoodEaten, FOOD_FOR_OFFSPRING),
                            0, FOOD_FOR_OFFSPRING,
                            MIN_FISH_SIZE, MAX_FISH_SIZE);

                        // Remove eaten food and replace
                        const idx = foods.indexOf(this.targetFood);
                        if (idx !== -1) {
                            delete this.targetFood.claimedBy;
                            foods.splice(idx, 1);
                        }
                        foods.push(createVector(random(20, width - 20), random(20, height - 20)));

                        // Reproduce if threshold met
                        if (this.totalFoodEaten >= FOOD_FOR_OFFSPRING) {
                            for (let i = 0; i < OFFSPRING_COUNT; i++) {
                                const child = new Fish(this.pos.x + random(-10, 10), this.pos.y + random(-10, 10));
                                // Inherit NN with mutation
                                if (typeof this.nn.clone === 'function') {
                                    child.nn = this.nn.clone();
                                    if (typeof child.nn.mutate === 'function') child.nn.mutate(NN_MUTATION_RATE);
                                }
                                child.vel = p5.Vector.random2D().mult(2);
                                fishes.push(child);
                            }
                            this.totalFoodEaten = 0;
                            this.size = max(this.size - 1, MIN_FISH_SIZE); // optional energy cost
                            this.isParent = true; // mark as parent
                        }

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
        } else this.stuckTimer = 0;
        this.lastPos = this.pos.copy();

        // Alignment & cohesion
        let alignment = createVector(0, 0),
            cohesion = createVector(0, 0),
            count = 0;
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

        if (millis() - Math.max(this.lastEat, this.spawnTime) > 60000) {
            this.dead = true;
            bestFishArchive.push(this); // save for evolution
        }
    }

    applyForce(f) {
        this.acc.add(f);
    }
    wander() {
        this.wanderDir.rotate(random(-0.2, 0.2));
        return this.wanderDir.copy().setMag(this.maxForce * 0.5);
    }
    edgeRepulsion() {
        const m = 24;
        let f = createVector(0, 0);
        if (this.pos.x < m) f.x += map(this.pos.x, 0, m, 1, 0);
        if (this.pos.x > width - m) f.x -= map(this.pos.x, width - m, width, 1, 0);
        if (this.pos.y < m) f.y += map(this.pos.y, 0, m, 1, 0);
        if (this.pos.y > height - m) f.y -= map(this.pos.y, height - m, height, 1, 0);
        return f.mult(this.maxForce);
    }
    integrateAndCollide() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        const eps = 0.001;
        if (this.pos.x >= width) {
            this.pos.x = width - eps;
            this.vel.x = -abs(this.vel.x) * 0.8;
        }
        if (this.pos.x <= 0) {
            this.pos.x = eps;
            this.vel.x = abs(this.vel.x) * 0.8;
        }
        if (this.pos.y >= height) {
            this.pos.y = height - eps;
            this.vel.y = -abs(this.vel.y) * 0.8;
        }
        if (this.pos.y <= 0) {
            this.pos.y = eps;
            this.vel.y = abs(this.vel.y) * 0.8;
        }
    }
    trainNN(input, target) {
        for (let i = 0; i < 4; i++) this.nn.train(input, target);
    }
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
        ellipse(0, 0, this.size, this.size * 0.6);
        triangle(-this.size / 2, 0, -this.size * 0.9, -this.size * 0.2, -this.size * 0.9, this.size * 0.2);
        // Stripes for fully grown fish
        if (this.size >= MAX_FISH_SIZE * 0.95) {
            stroke(255, 220);
            strokeWeight(1);
            const stripeCount = 3;
            for (let i = 1; i <= stripeCount; i++) {
                const xPos = map(i, 1, stripeCount + 1, -this.size / 4, this.size / 4);

                if (this.isParent) {
                    // Parent fish gets alternating green/blue stripes
                    stroke(i % 2 === 0 ? color(0, 200, 255) : color(0, 255, 100));
                } else {
                    // Normal fully grown fish → white stripes
                    stroke(255, 220);
                }


                line(xPos, -this.size * 0.3, xPos, this.size * 0.3);
            }
        }
        pop();
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    spawnFishes(20);
    for (let i = 0; i < TOTAL_FOOD; i++) {
        foods.push(createVector(random(20, width - 20), random(20, height - 20)));
    }
    document.getElementById('setFoodCountBtn').onclick = () => {
        const val = parseInt(document.getElementById('foodCount').value);
        if (!isNaN(val) && val > 0) {
            TOTAL_FOOD = val;
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

    // ✅ Allow clicking and typing into inputs without p5 intercepting
    const fishInput = document.getElementById('fishCount');
    const foodInput = document.getElementById('foodCount');
    fishInput.addEventListener('mousedown', e => e.stopPropagation());
    foodInput.addEventListener('mousedown', e => e.stopPropagation());
    fishInput.addEventListener('touchstart', e => e.stopPropagation());
    foodInput.addEventListener('touchstart', e => e.stopPropagation());

    spawnFishes(parseInt(document.getElementById('fishCount').value));
}

function draw() {
    background(20, 50, 100);
    if (spookActive) {
        spookTimer--;
        if (spookTimer <= 0) spookActive = false;
    }
    for (const f of fishes) f.update(fishes);
    fishes = fishes.filter(f => !f.dead);
    if (fishes.length === 0) {
        deadGenerations++;

        // Sort by success (fitness)
        let topFish = bestFishArchive.sort((a, b) => b.success - a.success).slice(0, 5);

        fishes = [];
        for (let i = 0; i < POPULATION_SIZE; i++) {
            let parent = random(topFish);
            let child = new Fish(random(width), random(height));
            if (parent && parent.nn) {
                child.nn = parent.nn.clone().mutate(Math.random() < 0.1 ? 0.2 : 0.05);
            }
            fishes.push(child);
        }

        // Reset food
        foods = [];
        for (let i = 0; i < TOTAL_FOOD; i++) {
            foods.push(createVector(random(20, width - 20), random(20, height - 20)));
        }
    }
    while (foods.length < TOTAL_FOOD) {
        foods.push(createVector(random(20, width - 20), random(20, height - 20)));
    }
    if (foods.length > TOTAL_FOOD) foods.length = TOTAL_FOOD;
    fill(255, 150, 0);
    for (const food of foods) ellipse(food.x, food.y, 5, 5);
    for (const f of fishes) f.draw();
    fill(255);
    text(`Score: ${score}`, 10, 20);
    text(`Food Eaten: ${foodEatenCount}`, 10, 40);
    text(`Fishes alive: ${fishes.length}`, 10, 60);
    text(`Dead Generations: ${deadGenerations}`, 10, 80);
    text(`Food Count: ${foods.length}`, 10, 100);
    text(`Pointer Repel Radius: ${POINTER_REPEL_RADIUS}px`, 10, 120);
    const grownUpCount = fishes.filter(f => f.size >= MAX_FISH_SIZE * 0.95).length;
    text(`Fully Grown Fishes: ${grownUpCount}`, 10, 140);
}

function spawnFishes(n) {
    for (let i = 0; i < n; i++) {
        fishes.push(new Fish(random(width), random(height)));
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function triggerSpook() {
    spookActive = true;
    spookTimer = SPOOK_DURATION;
}

function mouseMoved() {
    pointerPositions = [createVector(mouseX, mouseY)];
    triggerSpook();
}

function mouseDragged() {
    pointerPositions = [createVector(mouseX, mouseY)];
    triggerSpook();
}

function mouseReleased() {
    pointerPositions = [];
}

function touchStarted() {
    pointerPositions = touches.map(t => createVector(t.x, t.y));
    triggerSpook();
    return false;
}

function touchMoved() {
    pointerPositions = touches.map(t => createVector(t.x, t.y));
    triggerSpook();
    return false;
}

function touchEnded() {
    pointerPositions = [];
    return false;
}
