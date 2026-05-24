# 🎮 AETHER BRAWL - DETAILED FUNCTION GUIDE
## Complete Line-by-Line Explanation (As if explaining to a beginner)

This document explains every major class and method in the game in EXTREME detail. This is meant for someone with no programming experience!

---

## 📚 Table of Functions

### **Section 5: Fighter Entity (The Character)**

#### **Fighter.handleInput(keys)**
```javascript
// This function reads what keys the player is pressing and makes the character react
// "keys" is like: { 'w': true, 'a': false, 'd': true, ... }
// It tells us which keys are currently held down
```

**What It Does:**
- Checks if the character was hit (hitstun) - if so, don't let them control
- Reads movement keys (A/D or arrows) and changes horizontal velocity
- Checks for jump input and performs jump if possible
- Checks for fast fall (holding down)
- Checks for attack inputs (light/heavy)
- Tracks previous key states so we know when a key was just pressed (not held down)

**Key Concepts:**
- **Acceleration**: Instead of instantly setting speed, we add to speed (feels smoother)
- **Friction**: Every frame we multiply speed by 0.76 (slows you down without acceleration)
- **Coyote frames**: You can jump for 6 frames AFTER leaving a platform (forgiving!)
- **Jump buffer**: If you press jump slightly early, it still works (input prediction)

---

#### **Fighter.triggerAttack(type)**
```javascript
// Start a new attack! Type is either 'LIGHT' or 'HEAVY'
// This sets up the attack animation and visual effects
```

**What It Does:**
1. Sets `this.attackState` to 'LIGHT' or 'HEAVY'
2. Sets timer based on attack type (light = 14 frames, heavy = 26 frames)
3. Resets the "dealt damage" flag so we can hit enemies
4. Plays the attack sound
5. Creates particle effects (glowing swipes)
6. Moves the character slightly forward during attack (momentum)
7. Adds knockback to attack (heavy attacks push character)

**Why Each Attack Is Different:**
- **Light Attack**: Fast startup, less damage, used for combos
- **Heavy Attack**: Slow startup, high damage, used to finish opponents

---

#### **Fighter.applyHit(hitbox, attacker)**
```javascript
// This fighter got hit! Apply damage and knockback
// hitbox: the attack that hit them
// attacker: who hit them (so we know which direction to launch)
```

**What It Does:**

**Step 1: Damage Calculation**
```
damageMultiplier = (damagePercent / 10) + (damagePercent² / 280)
```
- Higher damage % = more knockback (exponential!)
- This means the longer you fight, the more knockback you take
- Eventually you get knocked off screen!

**Step 2: Knockback Calculation**
```
rawKnockback = hitbox.baseKnockback + damageMultiplier
knockback = rawKnockback / characterWeight
```
- Heavy characters take less knockback
- Light characters fly farther

**Step 3: Apply Knockback**
- Send the character flying in the direction the attacker was facing
- Set vertical knockback (always upward-ish)
- Interrupt their current action (stop attacking/dashing)

**Step 4: Hitstun**
```
hitstunFrames = floor(knockback * 1.35)
```
- Character can't move for a while after being hit
- Longer knockback = longer stun = can't combo

**Step 5: Visual & Audio Feedback**
- Play impact sound
- Trigger screen shake (more intense for heavy hits)
- Create particle explosions
- Flash the attacker invulnerable

---

#### **Fighter.update(platforms)**
```javascript
// MAIN PHYSICS UPDATE - called once per frame for each character
// This makes the character fall, move, collide with platforms, etc.
// This is the HEART of the game!
```

**What It Does (In Order):**

**1. Decrease Cooldowns**
- Dash cooldown going down each frame
- Invulnerability going down
- Hitstun going down

**2. Apply Gravity**
```
velocity.y += gravity * (0.56 or 1.90 if fast falling)
```
- Makes you fall down (like real gravity)
- Fast fall makes gravity stronger

**3. Handle Attack Decay**
- If attacking, count down the attack timer
- Apply air resistance during attack

**4. Update Position**
- `x += vx` (move by velocity in X)
- `y += vy` (move by velocity in Y)

**5. Check Platform Collisions** (The Complex Part!)
- For each platform:
  - Check if character's feet reached the platform
  - If yes: snap to platform, set `isGrounded = true`, restore jumps
  - If not on soft platform and hitting from below: bounce up

**6. Handle Coyote Frames**
- Track if we were grounded last frame
- If we just left ground, start coyote timer
- Count down coyote timer each frame

**7. Check Blast Zone** (Death)
- If `x < 60` or `x > 1220` or `y > 640`: character is off-stage!
- Remove 1 stock
- Play death sound
- Create blast effect
- Respawn character

---

### **Section 6: Camera System**

#### **Camera.update(p1, p2)**
```javascript
// Calculate where to point the camera based on where both players are
// Goal: Keep both players visible and use zoom to show action
```

**Algorithm:**
1. Find center point between the two players
2. Move camera toward that point (smooth interpolation)
3. Calculate distance between players
4. Zoom in when close (0.65x scale)
5. Zoom out when far (1.3x scale)

**Why This Works:**
- Players are always visible
- Close combat = tight zoom (feels intense)
- Far apart = wide zoom (can see arena)

---

### **Section 7: Post-Processor**

#### **PostProcessor.apply(ctx, canvas)**
```javascript
// Apply visual effects to the entire screen
// Like "invert colors" or "grayscale" for dramatic moments
```

**Effects:**
- **Invert**: Flip RGB values on every pixel (for heavy hit impact)
- **Grayscale**: Remove color to make B&W (for KO drama)

**How It Works:**
1. Get all pixel data from canvas
2. Loop through each pixel (R,G,B,A values)
3. Modify each pixel
4. Put pixel data back on canvas

**Performance Note:**
- This is slow! Only use for short moments
- Only process visible canvas area

---

### **Section 8: Engine Class - The Brain of the Game**

#### **Engine.animate()**
```javascript
// MAIN GAME LOOP - runs 60 times per second!
// This is where EVERYTHING happens
```

**What It Does:**
1. Clear the canvas (blank screen)
2. Handle screen shake (camera offset)
3. Draw background
4. Based on current state, draw the appropriate screen
5. Apply post-processing effects
6. Ask browser to call this again next frame

---

#### **Engine.drawPlayingScreen()**
```javascript
// The main game loop - where the magic happens!
```

**Process:**
1. Increment `matchTicks` (frame counter)
2. Get input from Player 1
3. Get CPU input (or Player 2 input)
4. Update both fighters physics
5. Check collision between hitboxes and hurtboxes
6. Apply hits if collision detected
7. Update camera position
8. Update particle system
9. Draw everything on canvas
10. Check win conditions (time up or someone died)

---

#### **Engine.drawHeroSelectScreen()**
```javascript
// Character selection menu
```

**Logic:**
- Show 4 character cards
- Display stats (speed, damage, defense)
- Show character sprite preview
- Show animations cycling
- Track which characters are selected
- Detect clicks on character cards

---

#### **Engine.startNewMatch()**
```javascript
// Initialize a new match between two fighters
```

**Setup:**
1. Choose the selected map
2. Create Player 1 with selected character
3. Create Player 2 (AI or human)
4. Set up keyboard controls for both
5. Reset camera position
6. Clear particles
7. Play start sound
8. Set state to 'PLAYING'

---

## 🎯 AI SYSTEM (CPU Opponent)

### **Fighter.updateCPU(target, platforms)**
```javascript
// Make the CPU player decide what to do
```

**Decision Tree:**
```
IF off-stage:
    → Try to recover (use jumps, dash toward stage)
    
ELSE IF player just used heavy attack nearby:
    → Dash away (dodge)
    
ELSE IF in attack range:
    → IF player damaged a lot:
        → Use heavy attack (finish them)
    → ELSE:
        → Use light attack (build damage)
        
ELSE:
    → Approach (get closer)
    → Consider using dash if far away
```

### **Fighter._aiApproach(target, platforms)**
```javascript
// AI movement toward opponent
```

**Logic:**
- Calculate distance to target
- Move toward target if not in range
- Avoid walking off platform edges (check below)
- Use dash if distance > 260 and safe
- Jump over obstacles

---

### **Fighter._aiJumpLogic(target, platforms)**
```javascript
// AI jump timing
```

**Rules:**
- Jump if target is above (to reach them)
- Use air jumps if target is higher
- Fast fall if target is lower

---

### **Fighter._aiRecover(target, platforms)**
```javascript
// AI recovery after knockback
```

**Goals:**
1. Get back on stage
2. Move toward center
3. Use all jump resources
4. Dash if far away

---

## 📊 GAME DATA STRUCTURES

### **PHYS Object - World Physics**
```javascript
const PHYS = {
    GRAVITY: 0.56,              // Pixels/frame² of acceleration downward
    MAX_FALL_SPEED: 15,         // Don't fall faster than this (normal)
    MAX_FAST_FALL: 22,          // Don't fall faster than this (holding down)
    GROUND_ACCEL: 2.4,          // How fast to speed up on ground
    GROUND_FRICTION: 0.76,      // Multiply speed by this each frame
    DASH_SPEED: 18,             // How fast dash travels
    DASH_FRAMES: 12,            // How long dash lasts
    DASH_COOLDOWN: 50,          // How long to wait before next dash
    COYOTE_FRAMES: 6,           // Frames you can jump after leaving ground
    JUMP_BUFFER_FRAMES: 8,      // Frames jump input is stored
}
```

### **Character Object Structure**
```javascript
{
    id: 'HUNTRESS',             // Unique identifier
    name: 'Huntress',           // Display name
    folder: 'Huntress',         // Asset folder name
    color: '#e94560',           // Character color
    speed: 8.5,                 // Max speed in pixels/frame
    jumpForce: 13.5,            // How high to jump
    weight: 1.0,                // 1.0 = normal, <1 = light (flies far), >1 = heavy
    attackRange: 72,            // How far attacks reach
    lightDamage: 4,             // Damage of light attack
    heavyDamage: 13,            // Damage of heavy attack
    lightKnockback: 4,          // Base knockback of light attack
    heavyKnockback: 12,         // Base knockback of heavy attack
    maxJumps: 3,                // How many air jumps
    spriteMap: { ... }          // Animation data
}
```

---

## 🔄 GAME STATES

The game has multiple screens/states:

```
HOME
  ↓ (click START)
MODE_SELECT
  ↓ (choose 1P or 2P)
HERO_SELECT
  ↓ (pick characters)
MAP_SELECT
  ↓ (pick arena)
PLAYING
  ↓ (someone dies or time up)
GAMEOVER
  ↓ (click REMATCH or return HOME)
HOME
```

---

## 🎬 ANIMATION FLOW

When a character's animation should change:

1. Check if character is dead → play Death animation
2. Check if character is in hitstun → play Hit animation
3. Check if character is attacking → play Attack animation
4. Check if character is in air → play Jump or Fall animation
5. Check if character is moving → play Run animation
6. Else → play Idle animation

---

## 🛠️ HOW COLLISION WORKS

**AABB = Axis-Aligned Bounding Box Collision**

```javascript
function aabbCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&      // Left edge check
           box1.x + box1.width > box2.x &&      // Right edge check
           box1.y < box2.y + box2.height &&     // Top edge check
           box1.y + box1.height > box2.y;       // Bottom edge check
}
```

**Two separate hitboxes:**
1. **Hurtbox** - Where can you be hurt? (the character's body)
2. **Hitbox** - Where does your attack reach? (the attack area)

**Collision Check Each Frame:**
```
IF hurtbox1 overlaps hitbox2:
    → Apply damage to fighter1
    → Create particles
    → Flash screen
    → Play sound
```

**Only Hit Once:**
- Set flag: `hasDealtDamageThisAttack = true`
- At end of attack, reset flag
- This prevents hitting the same person multiple times in one attack

---

## 🎨 RENDERING PIPELINE (What Gets Drawn Each Frame)

```
1. Clear entire canvas (blank screen)
2. Apply camera transform (zoom & position)
3. Draw background gradient
4. Draw parallax layers
5. Draw platforms
6. Draw particles
7. Draw fighters (with animations)
8. Remove camera transform
9. Draw HUD (health, time, stocks)
10. Apply post-processing effects
11. Request next animation frame
```

---

## 🔊 AUDIO - HOW SOUNDS ARE MADE

All sounds are **procedurally generated** using the Web Audio API:

**Components:**
- **Oscillator**: Creates a wave (sine, square, sawtooth, triangle)
- **Gain Node**: Controls volume
- **Filter**: Modifies the frequency
- **Buffer**: Stores pre-generated noise

**Example: Light Attack Sound**
```
1. Create oscillator with type "sawtooth"
2. Start frequency: 600 Hz (high pitch)
3. End frequency: 200 Hz (low pitch) over 80ms
4. Start gain: 0.12 (fairly loud)
5. End gain: 0.01 (very quiet)
6. Play the sound
7. Stop after 80ms
```

---

## 🎯 KNOCKBACK FORMULA EXPLAINED

```javascript
// The higher your damage %, the farther you get launched!

damageMultiplier = damagePercent / 10 + (damagePercent * damagePercent) / 280

// Example scenarios:
// 0% damage: knockback = baseKnockback (normal hit)
// 50% damage: knockback = baseKnockback + 2.8 + 8.9 = +11.7 multiplier
// 100% damage: knockback = baseKnockback + 10 + 35.7 = +45.7 multiplier
// 150% damage: knockback = baseKnockback + 15 + 80.4 = +95.4 multiplier
```

**The Point:**
- Early in match: hits don't knock far (can recover)
- Late in match: hits knock VERY far (you get KO'd)
- This makes matches more dramatic!

---

## 📈 HITSTUN FORMULA

```javascript
hitstunFrames = floor(knockback * 1.35)
```

**What This Means:**
- Bigger knockback = longer stun
- You can't attack while stunned
- After stun ends, you regain control
- This prevents infinite combos (balance!)

---

## 🎮 INPUT SYSTEM

**How Controls Work:**

1. Browser detects key press (e.g., "W" for jump)
2. Engine records it: `keys['w'] = true`
3. Each fighter checks `keys`
4. Fighter reads which keys are pressed
5. Fighter tracks "previous state" (was it pressed last frame?)
6. Fighter only acts on **transitions** (pressed but wasn't pressed last frame)

**Why Track Previous State?**
```javascript
// Without this, holding down JUMP would keep jumping!
// With this, we only jump once per press:

if (keys['w'] && !this.prevJumpKey) {  // Jump pressed THIS frame
    this.jump();                        // Only happens once
}
this.prevJumpKey = keys['w'];          // Remember for next frame
```

---

## 🎭 GAME STATE MACHINE

The game uses a "state machine" - only one state active at a time:

```javascript
switch (this.state) {
    case 'HOME':        drawHomeScreen();      break;
    case 'SETTINGS':    drawSettingsScreen();  break;
    case 'MODE_SELECT': drawModeSelectScreen(); break;
    case 'HERO_SELECT': drawHeroSelectScreen(); break;
    case 'MAP_SELECT':  drawMapSelectScreen();  break;
    case 'PLAYING':     drawPlayingScreen();    break;
    case 'PAUSED':      drawPausedScreen();     break;
    case 'GAMEOVER':    drawGameOverScreen();   break;
}
```

**Transitions:**
- Only certain transitions are allowed
- Each screen has buttons that change state
- Escape key returns to HOME (mostly)

---

## 🧮 CORE GAME LOOP PSEUDOCODE

```
EVERY FRAME (60 times per second):
    1. Clear canvas
    
    2. Get player input
    3. Get CPU input
    
    4. Update player1 physics
    5. Update player2 physics
    
    6. Update particle system
    7. Update camera
    
    8. Check if hitbox1 overlaps hurtbox2
        IF YES: Apply damage to player2
    9. Check if hitbox2 overlaps hurtbox1
        IF YES: Apply damage to player1
    
    10. Draw background
    11. Draw platforms
    12. Draw particles
    13. Draw players
    14. Draw HUD
    
    15. Check win conditions
    16. Update UI numbers (score, time, etc.)
    
    17. Apply post-processing
    
    18. Ask browser to call this function again
```

---

## 🔑 IMPORTANT CONCEPTS TO UNDERSTAND

### **Frame-Independent Design**
- Each update uses velocity (speed)
- We add velocity to position
- This works at any frame rate

### **Invulnerability Frames**
- After respawning: 120 frames invulnerable
- After being hit: can't be hit immediately
- Creates "knockback reset" time

### **Coyote Frames**
- You can jump for 6 frames after leaving platform
- Makes platforming more forgiving
- Player-friendly mechanic

### **Jump Buffer**
- If you press jump 8 frames early, it still counts
- Input prediction = feels responsive

### **Soft Platforms**
- Can pass through from above (land on top)
- Bounces from below (can't pass through bottom)

### **Hitstun**
- You can't move while stunned
- Time proportional to knockback
- Creates counterplay (be careful with big moves)

---

## 🎓 LEARNING TIPS

1. **Start with Fighter class** - It's the most important
2. **Understand handleInput()** - How controls work
3. **Understand update()** - Core physics
4. **Read applyHit()** - How damage works
5. **Study updateCPU()** - AI logic

---

This guide should help you understand every major system in AETHER BRAWL! 🎮✨
