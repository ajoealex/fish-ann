# Fish Neural Network Simulation (p5.js)
https://ajoealex.github.io/fish-p5js-nn/

A p5.js simulation of intelligent schooling fish, driven by **deep neural networks, flocking rules, and evolutionary adaptation**.  
Fish forage for food, grow in size, reproduce when successful, evolve over generations, spook on disturbances, and split off when starving to improve survivability.

---

## 🚀 Features
- **Evolving Neural Networks**: Each fish has a deep NN `[4, 12, 8, 2]` that adapts via mutation and inheritance.
- **Dynamic Schooling**: Boid-like separation, alignment, and cohesion rules produce realistic schools.
- **Adaptive Leadership**: Successful fish (more food eaten) can become leaders, attracting others.
- **Growth & Reproduction**: Fish grow as they eat (`MIN_FISH_SIZE = 8` → `MAX_FISH_SIZE = 20`) and reproduce after eating 20 food items.
- **Evolutionary Generations**: When all fish die, the top performers seed the next generation through cloning + mutation.
- **Parent Identification**: Fish that reproduce are marked with alternating **blue/green stripes** when fully grown.
- **Starvation Strategy**: Fish weaken after 5 minutes without food and die after 5.5 minutes.
- **Spook Interaction**: Mouse/touch repels fish; spook effect temporarily increases repulsion radius and force.
- **Constant Food Supply**: Always maintains a fixed food count (default `TOTAL_FOOD = 60`).
- **Statistics HUD**: Displays score, food eaten, fish alive, dead generations, food count, pointer repel radius, and fully grown fish count.

---

## 🧠 Algorithms and Behaviors

### 1. Neural Network (Movement Decision)
- **Inputs (4)**: Relative food position (`dx, dy`) and normalized food coordinates (`fx, fy`).
- **Hidden Layers**: Two layers (12 and 8 neurons).
- **Outputs (2)**: Steering vector (x, y).
- **Learning**: Small online training toward food direction; inheritance + mutation for long-term evolution.

### 2. Flocking Rules
- **Separation**: Avoids collisions with neighbors.
- **Cohesion**: Moves toward average group position.
- **Alignment**: Matches velocity with nearby fish.

### 3. Leadership
- Fish follow higher-success leaders within `NEIGHBOR_RADIUS`.

### 4. Edge Repulsion
- Soft bounce forces keep fish inside the canvas.

### 5. Spook Reaction
- Increases repulsion radius and force for `SPOOK_DURATION` frames when pointer is near.

### 6. Starvation & Death
- **>5 min hungry**: Reduce group cohesion & alignment.  
- **>5.5 min hungry**: Desperate wandering.  
- Eventually die if unfed.

### 7. Growth & Eating
- Larger fish get a bigger eating radius.  
- Food instantly respawns elsewhere to maintain population.

### 8. Reproduction & Evolution
- After eating 20 food, fish spawn 2 offspring.  
- Offspring inherit NN from parent with slight mutations.  
- When all fish die, a new generation is spawned from the **top 5 archived performers**.

---

## 🖱 Usage
1. Open `index.html` in a modern browser.
2. Adjust **Fish Count** and **Food Count** using inputs, then click **Spawn** or **Set**.
3. Move your mouse or finger near fish to spook them.
4. Watch them evolve across generations.

---

## 📱 Mobile Support
- Touch input works like mouse spook behavior.
- Multi-touch disperses schools more strongly.

---

## 🧠 Tech Stack
- [p5.js](https://p5js.org/) for rendering and events.
- Custom **JavaScript Neural Network** (`nn.js`) with multi-layer support.
- Simple **genetic algorithm** for evolving fish brains.

---

## ⚙️ Key Configurations
- `FOOD_FOR_OFFSPRING = 20`: Food needed for reproduction.
- `MIN_FISH_SIZE = 8`, `MAX_FISH_SIZE = 20`: Growth range.
- `STARVATION_WARNING = 5 min`, `STARVATION_CRITICAL = 5.5 min`.
- `POINTER_REPEL_RADIUS = 120`, `POINTER_REPEL_FORCE = 0.9`.
- `NN_MUTATION_RATE = 0.05`: Neural mutation rate.

---

## 📜 License
MIT License © 2025 Ajoe Alex
