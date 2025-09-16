# Fish Neural Network Simulation (p5.js)

A p5.js simulation of intelligent schooling fish, driven by neural networks and flocking algorithms. Fishes forage for food, form groups for safety, spook on disturbance, and split off when starving to improve survivability.

---

## 🚀 Features
- **Neural Network Control**: Each fish uses a simple feed-forward NN to steer toward food.
- **Dynamic Schooling**: Classic boid-like behaviors (alignment, cohesion, separation) produce natural schooling formations.
- **Adaptive Leadership**: Fish with higher success (more food eaten) are followed by others within range.
- **Starvation Strategy**: When close to death, fish loosen group ties or break off to independently search for food.
- **Spook Interaction**: Mouse or touch movement briefly boosts repulsion radius and force, scattering schools.
- **Constant Food Supply**: Eaten food is replaced immediately, maintaining a fixed total food count.
- **Statistics Tracking**: Displays score, food eaten, fish alive, dead generations, and food count in real time.

---

## 🧠 Algorithms and Behaviors

### 1. Neural Network (Movement Decision)
- **Input Layer (4 values)**: Relative distances and normalized food positions.
- **Hidden Layer**: 8 neurons.
- **Output Layer (2 values)**: Steering vector components.
- **Online Training**: Updates weights using movement toward food as the target.

### 2. Separation
- Repels fish that are too close to avoid collisions.

### 3. Cohesion
- Pulls fish toward the average position of nearby neighbors.

### 4. Alignment
- Aligns fish velocity with that of nearby neighbors.

### 5. Leadership Following
- Fish follow successful leaders with higher food counts.

### 6. Edge Repulsion
- Soft repelling force from screen edges to prevent escaping.

### 7. Spook Reaction
- Increases repulsion radius and force for a few frames when mouse or touch is near.

### 8. Starvation Splitting
- **>45s hungry**: Reduces group cohesion and alignment.
- **>55s hungry**: Adds strong wander force to split off and search.
- **>60s hungry**: Fish dies.

### 9. Food Replacement
- Maintains constant food count by spawning new food after each is eaten.

### 10. Wandering
- Random directional adjustments when idle to prevent stagnation.

---

## 📂 File Structure
```
fish-p5js-nn-main/
├── index.html         # Loads p5.js, sketch, and UI
├── sketch.js          # Main simulation, behaviors, and rendering
├── neural-network.js  # Simple feed-forward NN implementation
└── style.css          # Optional styling for controls
```

---

## 🖱 Usage
1. Open `index.html` in a modern browser.
2. Adjust **Fish Count** and **Food Count**, then click **Spawn** or **Set**.
3. Move your mouse or finger near fish to spook them.
4. Observe schooling, splitting, and adaptive behaviors.

---

## 📱 Mobile Support
- Touch gestures work like mouse spook behavior.
- Multi-touch disperses multiple groups.

---

## 🧠 Tech Stack
- [p5.js](https://p5js.org/) for rendering and event handling.
- JavaScript classes for fish and neural networks.

---

## ⚙️ Key Configurations
- `MIN_STRIVE_DISTANCE`: Minimum fish spacing.
- `MAX_ACCELERATION_RATE`: Maximum acceleration boost.
- `STARVATION_WARNING` & `STARVATION_CRITICAL`: Hunger-driven split behavior.
- `POINTER_REPEL_RADIUS` & `POINTER_REPEL_FORCE`: Spook interaction strength.
- `TOTAL_FOOD`: Total number of food items.

---

## 📜 License
MIT License © 2025 Ajoe Alex
