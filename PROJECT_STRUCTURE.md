# AETHER BRAWL - Project Structure Documentation

## 📁 Directory Organization

```
CG-Final/
├── index.html                 # Main HTML entry point with UI framework (Tailwind CSS)
├── JS/
│   ├── game.js               # Legacy game base classes (Sprite, Game)
│   └── myCode.js             # Core game engine and mechanics (2000+ lines)
├── Assets/
│   ├── Evil-Wizard/          # Evil Wizard character sprite sheets
│   ├── Huntress/             # Huntress character sprite sheets
│   ├── Martial/              # Martial character sprite sheets
│   └── Wizard/               # Wizard character sprite sheets
├── README.md                 # Comprehensive project documentation
└── PROJECT_STRUCTURE.md      # This file
```

## 📄 File-by-File Breakdown

### 1. **index.html** (Main Application Shell)
**Purpose:** Entry point for the entire application
**Key Features:**
- HTML5 structure with responsive canvas
- Tailwind CSS for UI styling
- Custom arcade-themed aesthetics
- Loading screen with spinner
- Control manual modal dialog
- HUD display elements (health, stocks, timer)
- Audio toggle and help buttons

**Key DOM IDs:**
- `#game-canvas` - Main 1280x720 canvas element
- `#html-hud` - Live game HUD display
- `#controls-modal` - Controls help dialog
- `#btn-toggle-sound` - Audio control button
- `#btn-help` - Help/controls button

---

### 2. **JS/game.js** (Base Classes - Legacy Foundation)
**Purpose:** Foundational game classes used as templates
**Contains:**
- `Sprite` class - Base sprite entity template
- `Game` class - Simple game loop manager

**Note:** These are minimal templates. The actual game logic is implemented in myCode.js

---

### 3. **JS/myCode.js** (Core Engine - 2000+ Lines)
**This is the heart of AETHER BRAWL. Organized into 8 major sections:**

#### **Section 1: Physics Constants (PHYS Object)**
Physical simulation parameters:
- Gravity, acceleration, friction multipliers
- Jump mechanics and coyote frames
- Dash mechanics and cooldowns
- Movement thresholds

#### **Section 2: Sound Engine (SoundEngine Class)**
Web Audio API procedural synthesizer:
- Dynamic sound generation using oscillators
- Attack sounds, hit sounds, music tones
- Toggle audio on/off
- Triggered on first user interaction

**Methods:**
- `playBlip()` - Menu selection sound
- `playJump()` - Jump SFX
- `playAttackLight/Heavy()` - Attack sounds
- `playHitLight/Heavy()` - Impact sounds
- `playDash()` - Dash SFX
- `playDeath()` - KO sound

#### **Section 3: Sprite Animation System (SpriteAnimator Class)**
Character animation frame management:
- Loads sprite sheets from Assets/
- Frame-by-frame animation playback
- Sprite mirroring for character facing direction
- Animation speed control

**Key Methods:**
- `play(name, speed)` - Start animation
- `update()` - Advance animation frames
- `draw(ctx, x, y, scale, isMirrored)` - Render sprite
- `isFinished()` - Check if animation completed

#### **Section 4: Game Data (CHARACTERS & MAPS Arrays)**
**4A. CHARACTERS Array:**
4 distinct fighters, each with:
- Character stats (speed, weight, range)
- Damage values (light & heavy)
- Knockback scaling
- Sprite sheet definitions
- Visual properties (colors, accents)
- Character descriptions

**Characters:**
1. **Huntress** - Triple-jump mobility, long range, medium damage
2. **Wizard** - Heavy spellcaster, slow, high damage & knockback
3. **Martial** - Speed demon, low damage, combo specialist
4. **Evil Wizard** - Balanced heavy hitter, mid-range magic

**4B. MAPS Array:**
2 unique combat arenas:
1. **Floating Sanctuary** - Peaceful sky arena with multiple platforms
2. **Neon Cyber Core** - Industrial hazardous terrain

Each map includes:
- Background gradient layers
- Parallax scrolling effects
- Platform positions and properties (soft/hard)
- Decorative visual elements
- Drawing functions for dynamic FX

#### **Section 5: Particle System (ParticleSystem Class)**
Advanced visual effects:
- Collision impact particles
- Glow/shine effects using composite blending
- Swipe attack trails
- Blast ring explosions

**Methods:**
- `spawn()` - Create regular particles
- `spawnGlow()` - Create additive blend glow particles
- `spawnSwipe()` - Attack slash visual
- `spawnBlastRing()` - KO burst effect
- `update()` - Physics simulation each frame
- `draw()` - Render all particle effects

#### **Section 6: Fighter Entity (Fighter Class)**
Core character entity - most complex class:
- Physics and collision
- Attack state management
- Damage & knockback calculations
- Animation state resolution
- Input handling (keyboard)
- CPU AI behavior
- Hitstun and invulnerability frames
- Respawning logic

**Key Properties:**
- Position (x, y), velocity (vx, vy)
- Damage percentage, stocks remaining
- Jump count, ground state
- Current attack state, damage flags
- Animation sprite

**Key Methods:**
- `update(platforms)` - Main physics loop
- `getHurtbox()` - Damage collision box
- `getHitbox()` - Attack collision box
- `handleInput(keys)` - Player input processing
- `triggerAttack(type)` - Start attack animation
- `applyHit(hitbox, attacker)` - Apply damage
- `updateCPU(target, platforms)` - AI logic
- `draw(ctx)` - Render fighter sprite

**CPU AI Subsystem:**
- `_aiApproach()` - Close distance to opponent
- `_aiJumpLogic()` - Jump decision making
- `_aiRecover()` - Recovery after knockback
- `_isOffStage()` / `_isDangerZone()` - Safety checks
- `_hasPlatformBelow()` - Platform detection

#### **Section 7: Camera System (Camera Class)**
Dynamic zoom and follow:
- Tracks both fighters, positions between them
- Dynamic zoom based on fighter distance
- Smooth interpolation for cinematic feel
- Transform application to canvas context

#### **Section 8: Post-Processing (PostProcessor Class)**
Visual effects applied after rendering:
- Invert colors (for heavy hits)
- Grayscale (for KO moments)
- Smooth fade in/out

#### **Section 9: Game Engine (Engine Class)**
State machine managing all game screens:
**Game States:**
- `HOME` - Main menu
- `SETTINGS` - Configuration screen
- `MODE_SELECT` - 1P vs 2P selection
- `HERO_SELECT` - Character selection
- `MAP_SELECT` - Arena selection
- `PLAYING` - Active match
- `PAUSED` - Match paused
- `GAMEOVER` - Victory/defeat screen

**Methods:**
- `drawHomeScreen()` - Title and main menu
- `drawHeroSelectScreen()` - Character picker with stats
- `drawMapSelectScreen()` - Arena selector with previews
- `drawPlayingScreen()` - Main game loop & rendering
- `drawGameOverScreen()` - Results and rematch
- `animate()` - Main animation loop
- `startNewMatch()` - Initialize new game
- `syncLiveHudValues()` - Update UI during play

---

### 4. **Assets/ Folder**
Contains sprite sheet PNGs for each character:
- **Evil-Wizard/** - Purple wizard with dark aura animations
- **Huntress/** - Red warrior with spear animations  
- **Martial/** - Green martial artist with combat animations
- **Wizard/** - Blue wizard with magic animations

Each folder contains PNG sprite sheets for animations:
- Idle, Run, Jump, Fall
- Attack1, Attack2, Attack3
- Take Hit / Hit animations
- Death animations

---

## 🎮 Game Mechanics Summary

### Movement & Jumping
- Ground acceleration: 2.4 px/frame
- Air acceleration: 1.7 px/frame
- Gravity: 0.56 px/frame²
- Coyote frame: 6 frames after leaving platform
- Jump buffer: 8 frames

### Combat
- Light attacks: Faster, less knockback
- Heavy attacks: Slower startup, high knockback
- Knockback scales with damage percentage
- Separate hurtbox and hitbox systems

### Physics
- AABB collision detection
- Soft platforms (pass-through from above)
- Hard platforms (solid collision)
- Screen edge blast zones (KO at boundaries)

### AI (CPU)
- 5 distinct AI behaviors
- Reactive dash dodging
- Smart jump timing
- Recovery mechanics when off-stage
- Adaptive difficulty based on player damage %

---

## 🎨 Visual Architecture

**Color Scheme:**
- Emerald accent: `#64ffda`
- Red player 1: `#e94560`
- Blue player 2: `#3a86ff`
- Gold highlights: `#ffd166`
- Dark background: `#0b0c10`

**Animation System:**
- Sprite sheets with frame-based animation
- 5-12 frame animations per action
- Smooth mirroring for direction change
- Speed-adjustable frame timing

---

## 📊 Technical Specifications

**Canvas Size:** 1280x720 pixels
**Frame Rate:** 60 FPS (via requestAnimationFrame)
**Languages:** HTML5, CSS3 (Tailwind), Vanilla JavaScript
**Dependencies:** 
- Tailwind CSS (via CDN)
- Web Audio API (built-in)
- Canvas API (built-in)

**No External Game Libraries** - Everything built from scratch!

---

## 🚀 Initialization Flow

1. HTML loads
2. Tailwind CSS initializes
3. DOMContentLoaded event fires
4. Engine class instantiates
5. Loader screen displays
6. Event bindings established
7. Animation loop begins
8. Home screen renders
9. User interactions trigger state transitions

---

This structure enables a complete, polished 2D fighting game with professional physics, AI, UI, and visual effects entirely in vanilla HTML5 Canvas!
