# fish p5-nn – Neural Network Fish School Simulation

## Overview
This project is an **HTML5 + p5.js** web app that visualizes a **Fish Schooling Simulation (FSS)** driven by simple **neural networks**. Each fish acts as an autonomous agent that uses local sensory input and a small feed-forward neural network to decide its movement. The simulation demonstrates **emergent collective behavior**, commonly studied in **swarm intelligence** and **boids-style** algorithms.

## ✨ Algorithms Used

### 1. FSS (Fish Schooling Simulation)
- **Base Concept**: Inspired by Reynolds’ Boids algorithm, FSS simulates fish schooling with three primary rules:
  - **Separation**: Avoid collisions with nearby fish.
  - **Alignment**: Align velocity with the average heading of neighbors.
  - **Cohesion**: Steer toward the average position of neighbors.
- **Pointer Repulsion**: Adds a repulsion force when the user’s mouse or touch pointer is close (`POINTER_REPEL_RADIUS` and `POINTER_REPEL_FORCE`).

### 2. Neural Network (NN)
- Each fish owns a small feed-forward neural network (`NeuralNetwork(4, 8, 2, 0.3)`):
  - **Inputs (4)**: Distances or angles to food, neighbors, and pointer.
  - **Hidden Layer (8)**: Learns intermediate patterns for steering decisions.
  - **Outputs (2)**: Desired velocity vector (x, y).
- Used for adaptive behaviors such as improving foraging efficiency and avoiding hazards.

### 3. Basic Physics Integration
- **Velocity and Acceleration**: Uses vector math to integrate velocity (`this.vel`) and acceleration (`this.acc`).
- **Constraints**: Maximum speed (`this.maxSpeed`), reaction time (`MIN_REACTION_TIME`, `MAX_REACTION_TIME`), and post-eat slowdown (`POST_EAT_SLOWDOWN`).

## 🐟 Fish Behaviors

| Behavior            | Description                                                                                               |
|---------------------|-----------------------------------------------------------------------------------------------------------|
| **Foraging**        | Fish search for spawned food particles (`foods`) and steer toward them. Successful foraging increases score.|
| **Schooling**       | Fish tend to form schools through separation, alignment, and cohesion forces within `NEIGHBOR_RADIUS`.     |
| **Pointer Avoidance**| Fish detect the user’s pointer/touch within `POINTER_REPEL_RADIUS` and steer away using a repulsion force. |
| **Acceleration Burst**| Fish accelerate briefly (`MAX_ACCELERATION_RATE`, `ACCELERATION_DURATION`) when food is near or to avoid collisions.|
| **Post-Eat Slowdown**| After eating, fish temporarily slow down (`POST_EAT_SLOWDOWN`) to simulate digestion or energy recovery.   |
| **Boundary Handling**| Fish wrap around or bounce off the edges of the canvas to stay within view.                               |

## 🛠 Functionalities

1. **Real-Time Animation**: Runs in the browser with p5.js.
2. **Food Spawning**: Food particles spawn periodically (`spawnInterval`, `foodCountPerSpawn`).
3. **Scoring System**: Score increments when fish consume food.
4. **Interactive Pointer**: User input influences fish behavior via repulsion.
5. **Configurable Constants**: Parameters like reaction time, acceleration, neighbor radius, and repulsion force can be tuned.
6. **Neural Network Learning (Optional)**: Can evolve or mutate weights between generations to improve fish strategies.
7. **Generational Tracking**: Dead generations counter (`deadGenerations`) can be used for evolutionary improvement.

## ▶ How to Run

1. **Extract the Archive**:
   ```bash
   unzip p5-nn.zip
   cd p5-nn
   ```
2. **Open in Browser**:
   Simply open `index.html` in a modern browser with internet access for p5.js libraries.
3. **Controls**:
   - **Move Pointer / Touch**: Repel fish.
   - **Wait**: Observe schooling, foraging, and adaptive behaviors over time.

## 📊 Tweakable Parameters

| Constant                | Purpose                                                       |
|-------------------------|---------------------------------------------------------------|
| `MIN_STRIVE_DISTANCE`    | Minimum distance fish strive before changing direction.       |
| `MAX_ACCELERATION_RATE`  | Max rate of acceleration for bursts.                          |
| `ACCELERATION_DURATION`  | Duration of acceleration bursts (ms).                         |
| `MIN_REACTION_TIME`      | Min neural reaction time (ms).                                |
| `MAX_REACTION_TIME`      | Max neural reaction time (ms).                                |
| `POST_EAT_SLOWDOWN`      | Speed reduction after eating.                                 |
| `NEIGHBOR_RADIUS`        | Radius for cohesion and alignment.                            |
| `POINTER_REPEL_RADIUS`   | Pointer repulsion detection radius.                           |
| `POINTER_REPEL_FORCE`    | Strength of pointer repulsion.                                |

## 📚 Applications
- Educational tool for understanding neural networks and swarm intelligence.
- Sandbox for experimenting with reinforcement learning or genetic algorithms.
- Basis for interactive art or game prototypes.
