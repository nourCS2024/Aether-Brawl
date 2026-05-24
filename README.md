# 🎮 AETHER BRAWL - Premium HTML5 Canvas Fighting Game

> **A fully-featured, self-contained 2D platform fighter built entirely with vanilla JavaScript, HTML5 Canvas, and Web Audio API**

![Version](https://img.shields.io/badge/version-2.2-brightgreen) ![License](https://img.shields.io/badge/license-Educational-blue) ![Status](https://img.shields.io/badge/status-Complete-success)

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Game Controls](#game-controls)
4. [Characters](#characters)
5. [Arenas](#arenas)
6. [Technical Architecture](#technical-architecture)
7. [Installation & Setup](#installation--setup)
8. [Project Structure](#project-structure)
9. [Game Mechanics](#game-mechanics)
10. [Physics System](#physics-system)
11. [AI System](#ai-system)
12. [Audio System](#audio-system)
13. [Visual Effects](#visual-effects)
14. [Development Guide](#development-guide)
15. [Performance Optimization](#performance-optimization)
16. [Browser Compatibility](#browser-compatibility)

---

## 🌟 Overview

**AETHER BRAWL** is a polished, professional-grade fighting game developed from scratch using only HTML5 Canvas, vanilla JavaScript, and the Web Audio API. There are **zero external game libraries** - everything is hand-coded, including physics, collision detection, animation, AI, and sound synthesis.

This project demonstrates advanced game development concepts in a single HTML file entry point with organized JavaScript modules for **1v1 player combat** against either a human opponent or intelligent CPU.

### Key Highlights
- ✅ **No Dependencies** - Pure HTML5 Canvas, no frameworks or game engines
- ✅ **Professional Physics** - Frame-independent velocity, gravity, friction, knockback scaling
- ✅ **Advanced AI** - Reactive CPU opponent with strategic decision-making
- ✅ **Procedural Audio** - Web Audio API synthesized sound effects
- ✅ **Beautiful Particle System** - Collision, attack, and knockback visual effects
- ✅ **Dynamic Camera** - Cinematic zoom based on fighter distance
- ✅ **Full UI System** - Menus, character selection, map selection, HUD, results screen
- ✅ **4 Unique Characters** - Each with distinct stats, animations, and playstyles
- ✅ **2 Combat Arenas** - Unique backgrounds, platforms, and parallax effects

---

## ✨ Features

### Gameplay Features
- **1 Player Mode** - Battle an intelligent CPU opponent
- **2 Player Mode** - Local dual-keyboard competition
- **4 Playable Characters** - Each with unique moves and stats
- **2 Combat Arenas** - Different layouts and visual themes
- **Stock-Based Combat** - Traditional fighting game rules with lives/stocks
- **Damage Percentage System** - Higher damage = more knockback
- **Multiple Jump Mechanics** - 2-3 air jumps per character
- **Dash Mechanics** - High-speed invulnerable movement with cooldown
- **Double Hit Types** - Light attacks vs heavy power moves
- **Recovery System** - Mechanics to return to stage after knockback

### Technical Features
- **Procedurally Generated Audio** - Real-time sound synthesis
- **Advanced Particle Effects** - 100+ simultaneous particles
- **AABB Collision Detection** - Separate hurtbox/hitbox logic
- **Screen Shake** - Impact feedback for dramatic hits
- **Dynamic Camera System** - Follows action with zoom
- **Post-Processing Effects** - Screen invert and grayscale
- **Animation Sprite System** - Frame-based character animations
- **Soft Platform Mechanics** - Pass-through platforms
- **Coyote Frame Implementation** - Forgiving jump timing
- **Jump Buffer System** - Input prediction for responsiveness

### UI/UX Features
- **Polished Main Menu** - Animated gradient text
- **Character Selection Screen** - Live sprite preview with stats
- **Arena Selection** - Map previews with platform layouts
- **Live HUD** - Real-time damage%, stocks, timer display
- **Pause Menu** - Mid-match pause capability
- **Results Screen** - Match statistics and rematch option
- **Help Modal** - Complete controls guide
- **Audio Toggle** - Sound on/off control

---

## 🎮 Game Controls

### PLAYER 1 (Keyboard Left Side)

| Action | Key |
|--------|-----|
| **Move Left** | `A` |
| **Move Right** | `D` |
| **Jump** | `W` |
| **Fast Fall / Drop** | `S` |
| **Light Attack** | `F` |
| **Heavy Attack** | `G` |
| **Dash** | `Left Shift` |
| **Pause** | `ESC` |

### PLAYER 2 (Keyboard Right Side)

| Action | Key |
|--------|-----|
| **Move Left** | `← Arrow` |
| **Move Right** | `→ Arrow` |
| **Jump** | `↑ Arrow` |
| **Fast Fall / Drop** | `↓ Arrow` |
| **Light Attack** | `K` |
| **Heavy Attack** | `L` |
| **Dash** | `Right Ctrl` |
| **Pause** | `ESC` |

### Game State Controls
- **ESC** - Pause during match / Return to menu from selection screens
- **Click UI Buttons** - Navigate menus

### Advanced Tips
- 🎯 **Double Jump** - Press jump again mid-air for recovery
- ⚡ **Dash Cancel** - Dash during attack startup to reposition
- 📊 **Knockback Scaling** - Every 1% damage increases knockback slightly
- 🛡️ **Soft Platforms** - Hold down to drop through from above
- 🔄 **Hitstun** - Landing a hit temporarily stuns opponent

---

## 👥 Characters

All 4 characters are fully animated with unique movesets. Each has 8-11 distinct animations.

### 1. **Huntress** ♦️ (Red)
**Title:** Shadow Spear Sentinel

**Stats:**
- Speed: 9/10
- Damage: 6/10
- Defense: 5/10
- Movement Speed: 8.5 px/frame
- Jump Force: 13.5 units
- Weight: 1.0 (neutral)
- **Max Jumps:** 3

**Playstyle:** Mobility-focused aerial fighter with longest range
- Triple jump enables recovery from anywhere
- Longest attack range (72 px)
- Light, fast attacks for combo potential
- Weak individual hits - builds damage through sustained offense
- **Best For:** Players who like staying airborne and repositioning

**Animations:** Idle, Run, Jump, Fall, Attack1, Attack2, Attack3, Take Hit, Death

---

### 2. **Wizard** 🔵 (Blue)
**Title:** Arcane Vanguard

**Stats:**
- Speed: 4/10
- Damage: 10/10
- Defense: 10/10
- Movement Speed: 5.8 px/frame
- Jump Force: 12.5 units
- Weight: 0.7 (lightest)
- **Max Jumps:** 2

**Playstyle:** Heavy offensive spellcaster - high damage, slow recovery
- Highest damage output (21 per heavy attack)
- Highest knockback values
- Slowest movement on ground
- Widest attack range (90 px)
- Light weight means high knockback taken
- **Best For:** Aggressive players who land powerful hits

**Animations:** Idle, Run, Jump, Fall, Attack1, Attack2, Hit, Death

---

### 3. **Martial** 🟢 (Green)
**Title:** Cyber-Void Reaper

**Stats:**
- Speed: 10/10
- Damage: 7/10
- Defense: 3/10
- Movement Speed: 10.2 px/frame
- Jump Force: 13.0 units
- Weight: 1.15 (heaviest)
- **Max Jumps:** 2

**Playstyle:** Fastest rushdown character - light hits, combo potential
- Fastest ground movement (10.2 px/frame)
- Lowest damage per hit (3-11)
- Heavy weight = lower knockback taken
- Shortest attack range (62 px)
- High number of attack animations (3 combos)
- **Best For:** Button mashers and combo specialists

**Animations:** Idle, Run, Going Up, Going Down, Attack1, Attack2, Attack3, Take Hit, Death

---

### 4. **Evil Wizard** 🟣 (Purple)
**Title:** Dark Arcane Overlord

**Stats:**
- Speed: 5/10
- Damage: 10/10
- Defense: 8/10
- Movement Speed: 6.5 px/frame
- Jump Force: 13.0 units
- Weight: 0.85
- **Max Jumps:** 2

**Playstyle:** Balanced powerhouse - high damage with good defense
- Second-highest damage (23 per heavy attack)
- Highest knockback on heavy attacks (19)
- Longest total attack range (95 px)
- Excellent for balanced offensive/defensive play
- **Best For:** Experienced players wanting control

**Animations:** Idle, Run, Jump, Fall, Attack1, Attack2, Take Hit, Death

---

### Character Selection Mechanics
- **8 animation types minimum** per character
- **Sprite sheet loading** system loads character PNG files dynamically
- **Frame-based animation** with adjustable speed (4-8 fps typical)
- **Mirroring system** - characters face direction of movement
- **Damage scaling** - knockback multiplies with player damage %

---

## 🏟️ Arenas

### Arena 1: **Floating Sanctuary** ☁️
**Theme:** Serene ancient sky shrine

**Visual Features:**
- Gradient background: Dark blue → Slate → Cyan
- Floating stars parallax layer
- Mountain silhouette parallax layer
- Floating orbs parallax layer (depth effect)
- Decorative glow box on right side

**Platform Layout:**
- 1 large main platform (center, 600x80 px)
- 2 soft platforms (left & right, 140x16 px each)
- 1 elevated soft platform (center-top, 140x16 px)
- Wide spacing for mobility-based gameplay

**Camera Zoom Range:** 0.65x to 1.3x (aggressive zoom variance)

**Best For:**
- Recovery practice (multiple jumps needed)
- Aerial-focused combat
- High-mobility characters shine

---

### Arena 2: **Neon Cyber Core** ⚡
**Theme:** Hazardous industrial cyberpunk facility

**Visual Features:**
- Gradient background: Very dark purple → Magenta → Dark magenta
- Grid overlay parallax (subtle)
- Cyberpunk building silhouettes
- Animated pulsing beams and hazard lights
- Neon pink hazard ball at bottom center

**Platform Layout:**
- 2 hard platforms on sides (280x40 px each)
- 1 center soft platform (280x18 px)
- Aggressive gap design forces risky platform jumps
- Hazard visuals at bottom create pressure

**Camera Zoom Range:** 0.65x to 1.3x

**Best For:**
- Precision platforming
- Punishing mistakes
- Close-range combat
- Risk/reward gameplay

---

## 🏗️ Technical Architecture

### Project Stack
- **Frontend:** HTML5, CSS3 (Tailwind), Vanilla JavaScript (ES6+)
- **Graphics:** Canvas 2D Context API
- **Audio:** Web Audio API (synthesis)
- **Animation:** RequestAnimationFrame loop
- **Physics:** Custom frame-independent implementation
- **AI:** State machine + decision tree

### Code Organization

#### **Main Files**
1. **index.html** (~200 lines)
   - DOM structure
   - Tailwind CSS setup
   - Canvas element
   - UI modals and HUD
   - Script loading

2. **JS/game.js** (~40 lines)
   - Base Sprite class (template)
   - Base Game class (legacy)

3. **JS/myCode.js** (~2000 lines)
   - All game logic
   - 9 major classes
   - Constants and data

#### **Asset Structure**
```
Assets/
├── Evil-Wizard/     (8 PNG files)
├── Huntress/        (9 PNG files)
├── Martial/         (9 PNG files)
└── Wizard/          (8 PNG files)
```

Each PNG is a horizontal sprite sheet with multiple frames per animation.

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              index.html (UI Layer)              │
├─────────────────────────────────────────────────┤
│          Engine (State Machine)                 │
│    ├─ HOME / SETTINGS / MODE_SELECT             │
│    ├─ HERO_SELECT / MAP_SELECT                  │
│    ├─ PLAYING / PAUSED / GAMEOVER               │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│         Game Loop (60 FPS)                      │
│  - Input Processing                             │
│  - Physics Update                               │
│  - Collision Detection                          │
│  - Rendering                                    │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│    Entity Systems                               │
│  ├─ Fighter (2 instances per match)             │
│  ├─ ParticleSystem (managed pool)               │
│  ├─ SpriteAnimator (per character)              │
│  ├─ Camera (dynamic follow + zoom)              │
│  ├─ SoundEngine (Web Audio)                     │
│  └─ PostProcessor (visual effects)              │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│    Rendering Pipeline                           │
│  1. Clear canvas                                │
│  2. Draw parallax backgrounds                   │
│  3. Apply camera transform                      │
│  4. Draw platforms                              │
│  5. Draw particles                              │
│  6. Draw fighters + HUD                         │
│  7. Restore camera                              │
│  8. Apply post-processing                       │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Installation & Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server required for local play
- No build tools or dependencies

### Setup Instructions

**Option 1: Local File (Simplest)**
```bash
# Navigate to the project directory
cd /Users/user/Documents/CG-Final

# Open in browser
open index.html
# or
# Drag index.html into your browser window
```

**Option 2: Local Web Server (Recommended)**
```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js
npx http-server

# Then visit: http://localhost:8000/index.html
```

**Option 3: Docker**
```bash
# Create a simple Dockerfile in the project root
docker run -it --rm -p 8000:8000 -v $(pwd):/app -w /app python:3 python -m http.server 8000
```

### Verification
Once running, you should see:
1. ✅ Loading spinner briefly
2. ✅ AETHER BRAWL title screen
3. ✅ "START GAME" and "SETTINGS" buttons

---

## 📁 Project Structure

### Directory Tree
```
CG-Final/
├── index.html                    # Main HTML entry
├── JS/
│   ├── game.js                   # Base classes
│   └── myCode.js                 # Core engine (2000+ lines)
├── Assets/
│   ├── Evil-Wizard/
│   │   ├── Idle.png
│   │   ├── Run.png
│   │   ├── Jump.png
│   │   ├── Fall.png
│   │   ├── Attack1.png
│   │   ├── Attack2.png
│   │   ├── Take hit.png
│   │   └── Death.png
│   ├── Huntress/
│   │   ├── Idle.png
│   │   ├── Run.png
│   │   ├── Jump.png
│   │   ├── Fall.png
│   │   ├── Attack1.png
│   │   ├── Attack2.png
│   │   ├── Attack3.png
│   │   ├── Take hit.png
│   │   └── Death.png
│   ├── Martial/
│   │   └── [9 animation PNGs]
│   └── Wizard/
│       └── [8 animation PNGs]
├── README.md                     # This file
└── PROJECT_STRUCTURE.md          # Detailed architecture docs
```

### File Purposes

| File | Lines | Purpose |
|------|-------|---------|
| **index.html** | ~200 | UI, canvas, modal dialogs |
| **game.js** | ~40 | Base template classes |
| **myCode.js** | ~2000 | Complete game engine |
| **PROJECT_STRUCTURE.md** | ~300 | Architecture breakdown |
| **README.md** | This | Comprehensive guide |

### Asset Specifications

**Sprite Sheet Format:**
- All sprites organized horizontally
- Frame format: `[Frame0][Frame1][Frame2]...[FrameN]`
- Typical resolution: 400x80 or 600x80 pixels
- PNG format with transparency

**Animation Frames:**
- Character animations range from 2-11 frames
- Typical frame rate: 5-8 fps
- Sprites drawn with scaling to fit canvas

---

## 🎮 Game Mechanics

### Combat System

#### Attack Types
**Light Attack (F / K)**
- Startup: 4-6 frames
- Active: 8-12 frames
- Cooldown: Built into animation
- Lower damage (3-7 depending on character)
- Lower knockback (3-6)
- Used for combo chains

**Heavy Attack (G / L)**
- Startup: 8-10 frames
- Active: 14-26 frames
- Cooldown: Built into animation
- High damage (11-23 depending on character)
- High knockback (10-19)
- Single powerful hit

#### Damage System
```
Damage Percentage Tracking:
- Accumulates from 0% to theoretically unlimited
- Every damage point increases knockback scaling
- Visual color feedback: White → Yellow (50%) → Red (100%+)
- Lives represented by "stock" counter (0-3 default)
```

#### Knockback Calculation
```javascript
// Knockback formula (pseudo-code)
damageMultiplier = damagePercent / 10 + (damagePercent * damagePercent) / 280
rawKnockback = baseKnockback + damageMultiplier
finalKnockback = rawKnockback / characterWeight
```

This creates exponential knockback scaling - crucial for ending stocks.

#### Hitstun System
```
hitstunFrames = floor(knockback * 1.35)
```
Hit targets are stunned proportional to knockback received, preventing immediate counter-attack.

### Stock System
- Each fighter begins with 3 stocks
- Leaving the stage blast zone = lose 1 stock
- Reaching 0 stocks = loss
- Victory: First to eliminate opponent(s) or highest stocks after time

### Movement Mechanics

#### Ground Movement
- Acceleration: 2.4 px/frame
- Deceleration: 0.76x per frame (friction)
- Max speed varies by character (5.8 - 10.2 px/frame)
- Stop threshold: 0.12 px/frame minimum

#### Aerial Movement
- Air acceleration: 1.7 px/frame
- Air friction: 0.915x per frame
- Gravity: 0.56 px/frame²
- Max fall speed: 15 px/frame (normal)
- Max fall speed: 22 px/frame (fast fall)

#### Jump Mechanics
- Coyote frames: 6 frames after leaving platform
- Jump buffer: 8 frames of input prediction
- Variable jump force based on character
- Multiple jumps based on max jump count

#### Dash Mechanics
- Duration: 12 frames
- Speed: 18 px/frame
- Cooldown: 50 frames
- Can be used in air or on ground
- Resets momentum on activation

### Platform Interactions

**Hard Platforms:**
- Cannot pass through from any direction
- Bounce off ceiling if jumping through bottom
- Enable ground move acceleration

**Soft Platforms:**
- Pass through from above (normal landing)
- Bounce if hit from below
- Hold DOWN to drop through

---

## ⚙️ Physics System

### Frame-Independent Design
All movement uses velocity vectors:
```javascript
// Typical physics integration
position += velocity
velocity += acceleration
velocity *= friction
velocity = clamp(velocity, max)
```

### Collision Detection

**AABB (Axis-Aligned Bounding Box):**
```javascript
function aabbCollision(a, b) {
  return a.x < b.x + b.width && 
         a.x + a.width > b.x &&
         a.y < b.y + b.height && 
         a.y + a.height > b.y;
}
```

**Hitbox vs Hurtbox:**
- Hurtbox: Fighter's vulnerable body (40x72 px)
- Hitbox: Attack damage area (variable size & angle)
- Both check AABB each frame
- Only processes once per attack (flag-based)

### Blast Zones
- Left edge: x < 60
- Right edge: x > 1220
- Bottom edge: y > 640
- Top edge: y < -380
- Crossing any boundary = stock loss

---

## 🤖 AI System

### CPU Opponent Behavior

The CPU uses a **state machine** with reactive decision-making:

#### AI States
1. **APPROACH** - Close distance to opponent
2. **ATTACK** - Land hits when in range
3. **RECOVER** - Return to stage if knocked off
4. **DODGE** - Dash away from heavy attacks

#### AI Decision Making

**Distance Calculation:**
- Constantly tracks distance to player
- Adjusts strategy based on range

**Attack Selection:**
```javascript
if (inRange && playerNotAttacking) {
  if (playerDamage > 65% && random() < 0.55) {
    triggerHeavyAttack();  // Finish damaged opponent
  } else {
    triggerLightAttack();  // Build damage
  }
}
```

**Movement Algorithm:**
```javascript
// Approach logic
const targetDistance = playerDistance;
if (targetDistance > attackRange) {
  accelerate toward player;
  avoid platform edges;
  use dash if distance > 260;
  jump over obstacles;
} else {
  decelerate and hold position;
}
```

**Recovery Algorithm:**
When off-stage:
- Move toward screen center
- Use all jump resources
- Dash toward recovery platform
- Avoid attempting impossible recoveries

**Dodge Reaction:**
When player uses heavy attack:
- 22% chance to dash away
- Reverses facing direction
- Maintains dash cooldown

### AI Difficulty Scaling
- CPU never becomes faster than player input
- Decision cooldowns prevent frame-perfect play
- Random variance (0.04-0.22 chance) in actions
- Reactive, not predictive (fair to human player)

---

## 🔊 Audio System

### Web Audio API Synthesis

All sound effects are generated **procedurally in real-time** - no audio files included!

#### Sound Generation

**1. Blip Sound (Menu Click)**
```javascript
// Square wave that slides up
oscillator.type = 'square';
frequency: 440 Hz → 880 Hz over 80ms
gain: 0.1 → 0.01
```

**2. Jump Sound**
```javascript
// Sine wave that descends
oscillator.type = 'sine';
frequency: 150 Hz → 400 Hz over 120ms
gain: 0.1 → 0.01
```

**3. Light Attack**
```javascript
// Sawtooth wave that falls
oscillator.type = 'sawtooth';
frequency: 600 Hz → 200 Hz over 80ms
gain: 0.12 → 0.01
```

**4. Heavy Attack**
```javascript
// Sawtooth wave, long decay
oscillator.type = 'sawtooth';
frequency: 150 Hz → 80 Hz over 200ms
gain: 0.25 → 0.01
```

**5. Light Hit**
```javascript
// Triangle wave that falls
oscillator.type = 'triangle';
frequency: 300 Hz → 100 Hz over 100ms
gain: 0.3 → 0.01
```

**6. Heavy Hit (Complex)**
```javascript
// Square wave + noise burst combo
oscillator: 120 Hz → 40 Hz over 300ms
noise: Filtered at 400 Hz, decaying
gain: 0.5 → 0.01
```

**7. Death Sound**
```javascript
// Long descending sawtooth
oscillator.type = 'sawtooth';
frequency: 500 Hz → 50 Hz over 600ms
gain: 0.4 → 0.01
```

**8. Dash Sound**
```javascript
// Filtered noise burst
noise source filtered at 1000 Hz
duration: 100ms
gain: 0.1 → 0.01
```

**9. Select Sound**
```javascript
// Ascending sine sweep
frequency: 300 Hz → 600 Hz over 150ms
gain: 0.15 → 0.01
```

**10. Start Game Sound**
```javascript
// Chord progression: 220 Hz, 440 Hz, 880 Hz
each note plays with stagger
duration: 400ms total
```

### Audio Control
- **Toggle button** in UI to enable/disable all sounds
- **First interaction** initializes audio context (browser requirement)
- **Try/catch** error handling for unsupported browsers
- **Dynamic mixing** - all sounds play simultaneously

---

## ✨ Visual Effects

### Particle System

#### Particle Pool
- Manages 100+ particles simultaneously
- Separate pools for regular and glow particles
- Performance optimized with object reuse

#### Particle Types

1. **Collision Particles**
   - Position: Hit location
   - Direction: Knockback angle ± spread
   - Lifetime: Determined by decay rate
   - Color: Character-specific
   - 8-36 per impact

2. **Glow Particles**
   - Uses additive blending (`composite = 'lighter'`)
   - Radial gradient per particle
   - Creates vibrant energy effect
   - 14-28 per attack

3. **Swipe Attacks**
   - Arc shapes drawn over time
   - Angle from attacker facing direction
   - Expands and fades
   - Line width scales with alpha

4. **Blast Rings**
   - Expanding ring at KO location
   - 36 circling particles
   - Large glow halo
   - Screen shake trigger

#### Physics
- Each particle has: x, y, vx, vy, size, color, alpha
- Gravity, drag, and decay applied each frame
- Alpha decreases over lifetime
- Size decreases over time

### Screen Effects

**Screen Shake**
- Intensity parameter (0-40)
- Random translation applied each frame
- Decays by 0.92x per frame
- Triggerable on heavy hits

**Post-Processing**
- **Invert:** Colors inverted (heavy hit feedback)
- **Grayscale:** Desaturates for KO moment
- Both fade smoothly over duration

### Animation System

#### Sprite Animation
- Frame-by-frame playback
- Adjustable speed (frames per display)
- Automatic mirroring for facing direction
- Smooth transitions between animations

#### Camera Animation
- Smooth position interpolation (6.5% per frame)
- Dynamic zoom based on player distance
- Zoom range: 0.65x to 1.3x
- Parallax layers move at different depths

---

## 👨‍💻 Development Guide

### Key Classes & Methods

#### Fighter Class
```javascript
class Fighter {
  // Core properties
  position: {x, y}
  velocity: {vx, vy}
  stats: {speed, jumpForce, weight, ...}
  state: {stocks, damagePercent, attackState, ...}
  
  // Key methods
  update(platforms) {}        // Physics & collision
  handleInput(keys) {}        // Player input processing
  updateCPU(target, plat) {}  // AI logic
  applyHit(hitbox) {}         // Damage application
  draw(ctx) {}                // Rendering
  getHurtbox() {}             // Collision queries
  getHitbox() {}              // Attack collision queries
}
```

#### Engine Class
```javascript
class Engine {
  // State management
  state: string  // HOME|SETTINGS|HERO_SELECT|MAP_SELECT|PLAYING|PAUSED|GAMEOVER
  
  // Key methods
  animate() {}               // Main loop
  startNewMatch() {}        // Initialize game
  drawPlayingScreen() {}    // Render active gameplay
  registerZone(x,y,w,h) {} // Button collision checking
}
```

#### ParticleSystem Class
```javascript
class ParticleSystem {
  particles: array
  glowParticles: array
  
  spawn(x, y, count, config) {}
  spawnGlow(x, y, count, config) {}
  spawnSwipe(x, y, radius, ...) {}
  spawnBlastRing(x, y, color) {}
  update() {}
  draw(ctx) {}
}
```

### Extending the Game

#### Adding a New Character
1. Create 4 folders in Assets/
2. Create sprite sheet PNGs for each animation
3. Add character data to CHARACTERS array in myCode.js:
```javascript
{
  id: 'NEWCHAR',
  name: 'Character Name',
  folder: 'NewChar',
  color: '#hexcolor',
  stats: { speed: 7, damage: 8, defense: 6 },
  spriteMap: buildSpriteMap('NewChar', [
    ['Idle', 8],
    ['Run', 8],
    // ... etc
  ])
}
```

#### Adding a New Arena
1. Create entry in MAPS array:
```javascript
{
  id: 'NEWMAP',
  name: 'Map Name',
  bgGradient: ['#color1', '#color2', '#color3'],
  parallaxLayers: [ /* layer definitions */ ],
  platforms: [ /* platform positions */ ],
  drawDecorations(ctx) { /* custom effects */ }
}
```

#### Tweaking Physics
Edit PHYS constants at top of myCode.js:
```javascript
const PHYS = {
  GRAVITY: 0.56,           // Decrease for floatier feel
  GROUND_ACCEL: 2.4,      // Increase for snappier movement
  DASH_SPEED: 18,         // Adjust dash distance
  // ... etc
}
```

### Debugging Tips

**Console Logging:**
```javascript
// Add to Fighter.update() to see physics
console.log(`${this.id}: vx=${this.vx}, vy=${this.vy}, jumpsLeft=${this.jumpsLeft}`);
```

**Visual Hitbox Debug:**
```javascript
// Add to Engine.drawPlayingScreen() before rendering fighters
const h1 = this.p1.getHitbox();
if (h1) {
  this.ctx.strokeStyle = 'lime';
  this.ctx.strokeRect(h1.x, h1.y, h1.width, h1.height);
}
```

**FPS Counter:**
```javascript
// Add to animate() method
this.frameCount = (this.frameCount || 0) + 1;
if (performance.now() - this.lastTime > 1000) {
  console.log(`FPS: ${this.frameCount}`);
  this.frameCount = 0;
  this.lastTime = performance.now();
}
```

---

## ⚡ Performance Optimization

### Current Optimizations
1. **Object Pooling** - Particles reused, not recreated
2. **Lazy Rendering** - Only draw visible elements
3. **Collision Caching** - AABB early-exit checks
4. **Animation Frame Control** - Throttled via requestAnimationFrame
5. **Context Saves/Restores** - Minimize transform calculations

### Potential Improvements
- Spatial partitioning for collision broad-phase
- Worker thread for AI calculations
- WebGL rendering (instead of 2D Canvas)
- Sprite atlasing instead of individual files
- Prediction-based rendering outside viewport

### Performance Targets
- **60 FPS** on modern browsers (achieved)
- **4K resolution** compatible (tested)
- **Mobile browser** compatible (partial - touch controls needed)

---

## 🌐 Browser Compatibility

### Tested & Supported
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required Features
- HTML5 Canvas 2D Context
- Web Audio API
- ES6 JavaScript support
- RequestAnimationFrame
- ImageData (for post-processing)

### Known Limitations
- ⚠️ No mobile touch controls (keyboard-only)
- ⚠️ Safari: Audio may require user gesture first
- ⚠️ Older browsers: Graceful degradation (fallback colors)

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Total Code | ~2,100 lines |
| Main Engine | ~2,000 lines (myCode.js) |
| HTML & UI | ~200 lines |
| Total Classes | 9 |
| Main Classes | 6 (Fighter, Engine, Camera, etc.) |
| Game States | 8 |
| Characters | 4 |
| Arenas | 2 |
| Animation Types | 40+ total |
| Max Particles | 100+ simultaneous |
| Physics Constants | 13 |
| Sound Effects | 10 (procedurally generated) |
| Keyboard Inputs | 16+ supported |

---

## 🎓 Learning Resources

This project demonstrates:
- Object-Oriented Programming in JavaScript
- Game loop architecture
- Physics simulation and collision detection
- State machine design patterns
- AI decision-making algorithms
- Canvas 2D rendering techniques
- Web Audio synthesis
- Performance optimization
- UI/UX design for games

---

## 📝 Future Enhancement Ideas

- [ ] Netplay/Online multiplayer
- [ ] Mobile touch controls
- [ ] Additional characters (6-8 more)
- [ ] Additional arenas (4-6 more)
- [ ] Training mode with combo challenges
- [ ] Replay system
- [ ] Character skins/cosmetics
- [ ] Difficulty settings for CPU
- [ ] Combo counter and statistics
- [ ] Custom physics tuning (advanced settings)
- [ ] Spectator mode
- [ ] Tournament bracket system
- [ ] Leaderboards (local storage)
- [ ] Accessibility features (colorblind modes, etc.)

---

## ⚖️ License

Educational use - feel free to modify, learn from, and extend this code!

---

## 📞 Support & Questions

**Issues Found?**
1. Check browser console for errors (F12)
2. Verify all sprite PNG files are in Assets/
3. Test in different browser
4. Check that JavaScript file loads (Network tab)

**Want to Modify?**
- See Development Guide section above
- Start with tweaking PHYS constants
- Add debug logging in Fighter class

---

## 🙏 Credits

**Developed:** Completely self-contained HTML5 Canvas project  
**Inspired by:** Classic fighting games (Smash Bros, Street Fighter)  
**Built with:** Pure JavaScript, HTML5, CSS3  
**Audio:** Web Audio API synthesis  

---

## 🎮 Enjoy AETHER BRAWL! 

**Press START GAME to begin your brawl!**

---

**Last Updated:** May 2026  
**Version:** 2.2 - Polished UI & Alignment Edition  
**Status:** Complete & Playable ✅

