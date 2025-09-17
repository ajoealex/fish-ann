function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  spawnFishes(POPULATION_SIZE);

  for (let i = 0; i < TOTAL_FOOD; i++) {
    foods.push(createVector(random(20, width - 20), random(20, height - 20)));
  }

  document.getElementById('setFoodCountBtn').onclick = () => {
    const val = parseInt(document.getElementById('foodCount').value);
    if (!isNaN(val) && val > 0) {
      TOTAL_FOOD = val;
      while (foods.length < TOTAL_FOOD) foods.push(createVector(random(20, width - 20), random(20, height - 20)));
      while (foods.length > TOTAL_FOOD) foods.pop();
    }
  };
  document.getElementById('spawnBtn').onclick = () => {
    spawnFishes(parseInt(document.getElementById('fishCount').value));
  };
  document.getElementById('toggleEatRadiusBtn').onclick = () => { showEatRadius = !showEatRadius; };
  document.getElementById('toggleFoodTargetBtn').onclick = () => { showFoodTargets = !showFoodTargets; };

  const fishInput = document.getElementById('fishCount');
  const foodInput = document.getElementById('foodCount');
  const blendSlider = document.getElementById('blendSlider');
  [fishInput, foodInput, blendSlider].forEach(el => {
    el.addEventListener('mousedown', e => e.stopPropagation());
    el.addEventListener('touchstart', e => e.stopPropagation());
  });
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

    foods = [];
    for (let i = 0; i < TOTAL_FOOD; i++) {
      foods.push(createVector(random(20, width - 20), random(20, height - 20)));
    }
  }

  while (foods.length < TOTAL_FOOD) foods.push(createVector(random(20, width - 20), random(20, height - 20)));
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
  text(`Eat Radius: ${showEatRadius ? 'ON' : 'OFF'} | Food Targets: ${showFoodTargets ? 'ON' : 'OFF'}`, 10, 160);
}
