# 🎮 AETHER BRAWL - HOW TO READ THE CODE LIKE A BEGINNER

## Everything Explained Step-by-Step, As If To A 5-Year-Old

---

## 🎯 START HERE: The Big Picture

Imagine a fighting game. Here's what happens:

```
1. Game Starts
   ↓
2. Show Title Screen
   ↓
3. Player chooses character (menu click)
   ↓
4. Player chooses arena (menu click)
   ↓
5. Game Starts!
   ↓
6. Every frame (60 times per second):
   a) Read keyboard input
   b) Move characters based on input
   c) Check if anyone got hit
   d) Update health/damage
   e) Move camera
   f) Draw everything on screen
   ↓
7. Check if someone won
   ↓
8. Show game over screen
   ↓
9. Go back to step 3
```

That's the **entire game loop**!

---

## 🔄 Let's Trace One Frame of Gameplay

**What happens in 1/60th of a second:**

```javascript
// THE GAME LOOP (60 times per second)
requestAnimationFrame(() => {
    
    // 1️⃣ INPUT - What keys is the player pressing?
    if (keys['w'] && !prevJumpKey) {        // Jump pressed?
        fighter.jump();                     // Make character jump
    }
    
    // 2️⃣ PHYSICS - Update character movement
    fighter.vx += accel;                    // Speed up
    fighter.vy += gravity;                  // Fall down
    fighter.x += fighter.vx;                // Move left/right
    fighter.y += fighter.vy;                // Move up/down
    
    // 3️⃣ COLLISION - Did character hit ground?
    if (character.y > platformY) {
        character.y = platformY;            // Snap to platform
        character.vy = 0;                   // Stop falling
        character.isGrounded = true;        // Mark as on ground
    }
    
    // 4️⃣ ATTACK COLLISION - Did someone get hit?
    if (fighter1.hitbox overlaps fighter2.hurtbox) {
        fighter2.takeDamage(fighter1.attackDamage);
    }
    
    // 5️⃣ CAMERA - Follow the action
    camera.x = (fighter1.x + fighter2.x) / 2;  // Center between fighters
    
    // 6️⃣ ANIMATION - Update character animation frame
    fighter.sprite.update();
    
    // 7️⃣ DRAWING - Draw everything on screen
    ctx.clearRect(0, 0, WIDTH, HEIGHT);     // Blank canvas
    ctx.drawImage(fighter1.sprite, ...);    // Draw fighter 1
    ctx.drawImage(fighter2.sprite, ...);    // Draw fighter 2
    ctx.drawRect(platform);                 // Draw platform
    
    // 8️⃣ LOOP - Do it again!
    requestAnimationFrame(...);
});
```

---

## 📍 Important Numbers & What They Mean

### **Position & Size**
```
x = 640          // Horizontal position (pixels from left)
y = 360          // Vertical position (pixels from top)
width = 40       // How wide the character is
height = 72      // How tall the character is
```

### **Velocity (Speed)**
```
vx = 5           // Moving right 5 pixels per frame
vx = -3          // Moving left 3 pixels per frame
vy = 2           // Moving down 2 pixels per frame
vy = -10         // Moving up 10 pixels per frame (jumping!)
```

### **Health System**
```
stocks = 3       // Three lives left (0-3)
damagePercent = 45   // 45% damaged (higher = more knockback)
```

### **Frame Counter**
```
matchTicks = 300     // 300 frames have passed
300 / 60 = 5 seconds // 5 seconds of match time
```

---

## 🎨 How Drawing Works

Every frame, we draw things in order:

```
1. Clear everything (blank screen)
   ↓
2. Draw background (gradient, clouds, parallax)
   ↓
3. Draw platforms
   ↓
4. Draw attack effects (particles)
   ↓
5. Draw characters (with animations)
   ↓
6. Draw HUD (health, time, scores)
```

**Why this order?**
- Background goes first (it's behind everything)
- Platforms next
- Characters on top (they move around)
- HUD last (always visible on top)

---

## 🥊 How Damage Works (The Formula)

**When someone gets hit:**

```
Step 1: Add damage
    damagePercent += hitDamage
    Example: 40% + 8 damage = 48%

Step 2: Calculate knockback multiplier
    multiplier = damagePercent/10 + (damagePercent²/280)
    Example: 48/10 + (48*48/280) = 4.8 + 8.2 = 13

Step 3: Calculate final knockback
    knockback = baseKnockback + multiplier
    knockback = knockback / characterWeight
    
    Example: 12 + 13 = 25
    If heavy character (weight 1.2): 25/1.2 = 20.8

Step 4: Launch the character
    vx = knockback * direction (-1 or 1)
    vy = -knockback * 0.5     (upward)
    
    Result: Character flies backwards and up!

Step 5: Stun them
    hitstunFrames = knockback * 1.35
    Character can't move for this many frames
```

**The Point:** Higher damage = more knockback = easier to KO

---

## ⌨️ How Input Works (Keyboard to Character)

**Flow:**

```
1. Player presses 'W' key
   ↓
2. Browser fires 'keydown' event
   ↓
3. Event listener catches it:
   keys['w'] = true     // Record that W is pressed
   ↓
4. Every frame, fighter.handleInput(keys) is called
   ↓
5. Fighter checks:
   if (keys['w'] && !this.prevJumpKey) {
       this.jump();     // Jump happens!
   }
   this.prevJumpKey = keys['w'];  // Remember for next frame
   ↓
6. Player releases 'W' key
   ↓
7. Browser fires 'keyup' event
   ↓
8. Event listener catches it:
   keys['w'] = false    // Record that W is no longer pressed
```

**Why track previous state?**
- If we just checked `if (keys['w'])`, holding W would make you keep jumping
- By checking **if it just changed from false to true**, we jump only once per press

---

## 🎮 Game States (The Menu System)

The game is always in one state:

```
HOME ← Title screen, "PRESS START"
  ↓
MODE_SELECT ← Choose 1P vs 2P
  ↓
HERO_SELECT ← Pick your character
  ↓
MAP_SELECT ← Pick arena
  ↓
PLAYING ← Actual fight happening!
  ↓ (press ESC)
PAUSED ← Game paused, can resume or quit
  ↓ (someone wins)
GAMEOVER ← Results screen
  ↓ (click REMATCH)
HERO_SELECT (go back to select characters again)
```

**Key Principle:**
- Only one state active at a time
- Each state has its own drawing function
- Buttons in each state trigger state changes

---

## 🤖 How AI (CPU Opponent) Works

**The AI "thinks" like this:**

```
function updateCPU(targetFighter) {
    
    // Am I off-stage? Try to get back!
    if (this.isOffStage()) {
        moveTowardCenter();
        useJumps();
        return;
    }
    
    // Is enemy using heavy attack nearby? Dodge!
    if (enemy.attackState === 'HEAVY' && distanceSmall) {
        dash(away);
        return;
    }
    
    // Is enemy in attack range? Attack them!
    if (distanceSmall) {
        if (enemy.damagePercent > 65%) {
            heavyAttack();  // They're damaged, finish them!
        } else {
            lightAttack();  // Build damage
        }
        return;
    }
    
    // Enemy far away? Approach them
    moveToward(enemy);
}
```

**This makes the CPU:**
- Recover when knocked off
- Dodge dangerous attacks
- Attack when close
- Chase when far
- More aggressive when winning

---

## 🎬 Animation System (Flip Book Effect)

**How it works:**

```
Sprite Sheet (one big image):
    [Idle 1][Idle 2][Idle 3]...[Idle 8]
    
Animation Data:
    name: "Idle"
    frames: 8
    frameWidth: 64 pixels
    frameHeight: 80 pixels

Each Frame:
    Show frame 0 for 6 game frames
    ↓
    Show frame 1 for 6 game frames
    ↓
    Show frame 2 for 6 game frames
    ...
    ↓
    Show frame 7 for 6 game frames
    ↓
    Loop back to frame 0
```

**Result:** Animation plays smoothly!

---

## 🔊 Sound System (Waves & Frequency)

**All sounds are made mathematically:**

```
Step 1: Create sound generator (oscillator)
    type: 'sine'        // Wave type (sine, square, sawtooth, triangle)
    frequency: 440 Hz   // High = high pitch, Low = low pitch

Step 2: Set volume (gain)
    startGain: 0.1      // Start fairly loud
    endGain: 0.01       // End very quiet

Step 3: Set frequency change over time
    startFreq: 440 Hz (high pitch)
    endFreq: 200 Hz (low pitch)
    duration: 0.08 seconds (80 milliseconds)

Step 4: Connect components
    Oscillator → Gain → Speaker

Step 5: Play it!
    Start time: NOW
    Stop time: NOW + 80ms
```

**Example:**
- Jump sound: Low → High pitch (going up!)
- Impact sound: High → Low pitch (falling down!)
- Death sound: Long descending pitch (sad/epic)

---

## 📦 Data Structures Explained

### **Fighter Object**
```javascript
{
    x: 640,                     // Position
    y: 360,
    vx: 5,                      // Velocity
    vy: 0,
    
    stocks: 3,                  // Health
    damagePercent: 25,
    
    isGrounded: true,           // State
    isAttacking: false,
    
    sprite: SpriteAnimator,     // Animation
    charData: { ... }           // Character stats
}
```

### **Hitbox Object (Attack)**
```javascript
{
    x: 680,                     // Where the attack reaches
    y: 300,
    width: 80,                  // Attack range
    height: 60,
    
    damage: 8,                  // How much damage
    baseKnockback: 10,          // Launch power
    type: 'LIGHT'               // Attack type
}
```

### **Hurtbox Object (Damage Area)**
```javascript
{
    x: 600,                     // Character's body
    y: 250,
    width: 40,                  // Character size
    height: 72
}
```

---

## 🎯 Collision Detection (AABB)

**Do two boxes overlap?**

```
Box 1: x=100, y=50, width=40, height=80  (right edge: 140, bottom: 130)
Box 2: x=120, y=60, width=60, height=100 (right edge: 180, bottom: 160)

Check:
    Is Box1.left < Box2.right?      100 < 180 ✓ YES
    Is Box1.right > Box2.left?      140 > 120 ✓ YES
    Is Box1.top < Box2.bottom?      50 < 160 ✓ YES
    Is Box1.bottom > Box2.top?      130 > 60 ✓ YES

All four checks pass → COLLISION! They overlap!
```

---

## 📊 Key Physics Constants

```javascript
GRAVITY: 0.56
    → Every frame, add 0.56 to downward velocity
    → Makes characters fall

GROUND_ACCEL: 2.4
    → Every frame on ground, add 2.4 to velocity
    → Makes characters speed up

GROUND_FRICTION: 0.76
    → Every frame on ground, multiply velocity by 0.76
    → Makes characters slow down

DASH_SPEED: 18
    → Dash travels 18 pixels per frame

MAX_FALL_SPEED: 15
    → Don't fall faster than 15 pixels/frame

COYOTE_FRAMES: 6
    → Can jump for 6 frames after leaving platform
    → Makes platforming forgiving
```

---

## 🎓 Key Concepts To Remember

### **Velocity-Based Movement**
Instead of setting position directly:
```javascript
WRONG:  this.x = 640;           // Instant teleport

RIGHT:  this.vx += 2.4;         // Speed up
        this.x += this.vx;      // Move gradually
```

### **Invulnerability Frames**
After getting hit:
```javascript
if (this.invulnTime > 0) {
    this.invulnTime--;
    return;  // Can't take damage while invulnerable
}
```

### **Input Buffering**
Store input before executing:
```javascript
if (keyPressed && !prevKeyPressed) {
    actionQueue.push('JUMP');
}
prevKeyPressed = keyPressed;

// Execute buffered actions on next frame
if (canJump && actionQueue.has('JUMP')) {
    jump();
}
```

### **State Machine**
Always in one state:
```javascript
switch (gameState) {
    case 'HOME': drawMenu(); break;
    case 'PLAYING': updateGame(); break;
    case 'PAUSED': drawPauseScreen(); break;
}
```

---

## 🚀 How To Modify The Game

### **Change Character Speed**
```javascript
// In CHARACTERS array, increase "speed" value:
speed: 12    // Faster (was 8.5)
```

### **Change Jump Height**
```javascript
// In CHARACTERS array, increase "jumpForce" value:
jumpForce: 18    // Higher jumps (was 13.5)
```

### **Change Knockback**
```javascript
// In CHARACTERS array, change attack knockback:
lightKnockback: 8    // More knockback (was 4)
```

### **Change Gravity**
```javascript
// In PHYS object:
GRAVITY: 0.8    // Fall faster (was 0.56)
```

### **Add Dash Cooldown**
```javascript
// In PHYS object:
DASH_COOLDOWN: 100    // Longer wait (was 50)
```

---

## 🎮 The Simplest Way To Understand It

**The game is like a puppet show:**

1. **Update Puppets** - Move them based on player input
2. **Check Collisions** - Do any puppets touch each other?
3. **Apply Effects** - If they collided, make them hurt
4. **Draw** - Show the puppets to the audience

**Repeat 60 times per second!**

---

## 📚 Reading The Code

When you read the code:

1. **Start with constructor** - What variables are set up?
2. **Read update() method** - How do things move?
3. **Read handleInput()** - How does control work?
4. **Read applyHit()** - What happens when hit?
5. **Read animate()** - What gets drawn each frame?

---

## ✨ Remember

- **Every value means something** - Speed, position, time, health
- **Physics is math** - Velocity, acceleration, friction
- **Collision = check overlap** - Two rectangles touch?
- **Animation = flip book** - Show different images fast
- **State machine = one mode at a time** - Menu, Playing, etc.
- **Loop = do it again** - 60 times per second!

---

## 🎓 QUIZ TIME!

**Q: What does `this.vy += 0.56` do?**
A: Adds gravity (makes you fall faster each frame)

**Q: What's the difference between hitbox and hurtbox?**
A: Hitbox = attack area, Hurtbox = damage area

**Q: Why track `prevJumpKey`?**
A: So jump only happens once per press, not continuously

**Q: What does coyote frames do?**
A: Lets you jump for 6 frames after leaving platform (forgiving!)

**Q: What's a state machine?**
A: Game is always in one state (HOME, PLAYING, etc)

---

**Good luck reading the code!** You now understand everything! 🎮✨
