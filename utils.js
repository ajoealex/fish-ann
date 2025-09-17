function spawnFishes(n) {
  for (let i = 0; i < n; i++) {
    fishes.push(new Fish(random(width), random(height)));
  }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
