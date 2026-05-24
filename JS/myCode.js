/**
 * ============================================================================
 * AETHER BRAWL — game.js  v2.3  "Static Portrait Edition"
 * ============================================================================
 *
 * ARCHITECTURE OVERVIEW
 * ─────────────────────
 *  SoundEngine      — Web Audio API synthesiser (zero audio files needed)
 *  SpriteAnimator   — Sprite-sheet flipbook; used only during live gameplay
 *  ParticleSystem   — Additive-blended particle / glow / ring effects
 *  Fighter          — One combatant: physics, input, AI, animation, hit-logic
 *  Camera           — Smooth mid-point tracking with elastic zoom
 *  PostProcessor    — Full-screen pixel effects (invert, grayscale)
 *  Engine           — State machine + main game loop (HOME → PLAYING → …)
 *
 * KEY FIX (v2.4 - Direct Slice)
 * ─────────────────────────────────────────────────────────────────────────
 *  Hero-select portraits are now TRULY STATIC and file:// protocol compatible.
 *
 *  Previous versions used an OffscreenCanvas (uiStaticFrames) to pre-bake frame 0.
 *  However, when the HTML file is opened locally via file:// protocol, drawing
 *  a local image onto a canvas and then drawing that canvas taints the canvas origin,
 *  which throws a SecurityError ("The operation is insecure") and crashes the game.
 *
 *  Fix:
 *    1. uiSprites (SpriteAnimator array) and uiStaticFrames (canvas array) are REMOVED.
 *    2. Each character's dedicated static portrait is loaded into menuImages.
 *    3. drawHeroSelectScreen() draws directly from these Image objects using the
 *       3-parameter drawImage() method to draw the full portrait.
 *    4. This bypasses OffscreenCanvas, resolves browser security/CORS restrictions,
 *       and ensures the portrait remains perfectly static and cross-compatible.
 *
 * ============================================================================
 */

'use strict';

// ── PHYSICS CONSTANTS ────────────────────────────────────────────────────────
/**
 * Global physics tuning knobs.
 * Change one value here to affect the whole game — nothing is hard-coded
 * inside Fighter methods.
 */
const PHYS = {
    /** Downward acceleration applied every frame while airborne (px / frame²). */
    GRAVITY:            0.56,

    /**
     * Multiplier applied to GRAVITY when the player holds ↓ in the air.
     * 1.90 means "fall 90 % faster than normal."
     */
    FAST_FALL_MULT:     1.90,

    /** Terminal velocity during normal falling (px / frame). */
    MAX_FALL_SPEED:     15,

    /** Terminal velocity during intentional fast-fall (px / frame). */
    MAX_FAST_FALL:      22,

    /**
     * Velocity retention applied to vx each frame while grounded.
     * 0.76 → 24 % of horizontal speed is lost every frame = "sticky" feel.
     */
    GROUND_FRICTION:    0.76,

    /**
     * Velocity retention applied to vx each frame while airborne.
     * 0.915 → only 8.5 % speed is lost per frame = slippery aerial drift.
     */
    AIR_FRICTION:       0.915,

    /** Horizontal acceleration added per frame on the ground (px / frame²). */
    GROUND_ACCEL:       2.4,

    /** Horizontal acceleration added per frame in the air (px / frame²). */
    AIR_ACCEL:          1.7,

    /** Horizontal speed set at the start of a dash (px / frame). */
    DASH_SPEED:         18,

    /** Number of frames a dash lasts before speed bleeds back to normal. */
    DASH_FRAMES:        12,

    /**
     * Minimum frames the player must wait between consecutive dashes.
     * Prevents infinite-dash spam.
     */
    DASH_COOLDOWN:      50,

    /**
     * "Coyote time" — after walking off a ledge the player may still jump
     * for this many frames, making the game feel more forgiving.
     */
    COYOTE_FRAMES:      6,

    /**
     * "Jump buffering" — if the player presses Jump up to this many frames
     * before landing, the jump fires the moment they touch ground.
     */
    JUMP_BUFFER_FRAMES: 8,

    /**
     * Speed threshold below which horizontal velocity is snapped to 0.
     * Prevents the character from sliding infinitely from floating-point
     * imprecision.
     */
    STOP_THRESHOLD:     0.12,
};


// ════════════════════════════════════════════════════════════════════════════
// 1 · SOUND ENGINE
// ════════════════════════════════════════════════════════════════════════════
/**
 * Procedural audio synthesiser built on the Web Audio API.
 *
 * All sounds are generated mathematically — no audio files are loaded.
 * The AudioContext is lazily created on the first user interaction because
 * browsers block audio until a gesture has occurred.
 *
 * Usage:
 *   audio.playJump();        // fire-and-forget
 *   const on = audio.toggle(); // returns new enabled state
 */
class SoundEngine {
    constructor() {
        /** @type {AudioContext|null} Null until first user gesture. */
        this.ctx     = null;

        /** Master on/off switch; toggled by the UI button. */
        this.enabled = true;

        // Bind once so we can pass it as a removable listener.
        this._init = this._init.bind(this);
        window.addEventListener('click',   this._init, { once: true });
        window.addEventListener('keydown', this._init, { once: true });
    }

    /** Create the AudioContext on first user interaction (browser policy). */
    _init() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
    }

    /**
     * Toggle audio on / off.
     * @returns {boolean} The new enabled state.
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Internal helper — safely calls a sound-building function.
     * Silently swallows any errors so a bad sound never crashes the game.
     * @param {function(AudioContext):void} fn
     */
    _play(fn) {
        if (!this.enabled || !this.ctx) return;
        try { fn(this.ctx); } catch (_) { /* ignore */ }
    }

    // ── Individual sound effects ──────────────────────────────────────────

    /** Short rising square-wave blip — used for menu hover/click. */
    playBlip() {
        this._play(c => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(440, c.currentTime);
            o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.08);
            g.gain.setValueAtTime(0.1,  c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.08);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(c.currentTime + 0.08);
        });
    }

    /** Smooth sine sweep upward — confirms a menu selection. */
    playSelect() {
        this._play(c => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(300, c.currentTime);
            o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.15);
            g.gain.setValueAtTime(0.15, c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.15);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(c.currentTime + 0.15);
        });
    }

    /**
     * Three-note ascending arpeggio on a triangle oscillator.
     * Plays at match start.
     */
    playStartGame() {
        this._play(c => {
            const now = c.currentTime;
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'triangle';
            [220, 440, 880].forEach((f, i) =>
                o.frequency.setValueAtTime(f, now + i * 0.1));
            g.gain.setValueAtTime(0.2,  now);
            g.gain.linearRampToValueAtTime(0.01, now + 0.4);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(now + 0.4);
        });
    }

    /** Rising sine sweep — mimics the character leaving the ground. */
    playJump() {
        this._play(c => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(150, c.currentTime);
            o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.12);
            g.gain.setValueAtTime(0.1,  c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.12);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(c.currentTime + 0.12);
        });
    }

    /** Band-pass-filtered white noise burst — a directional "whoosh". */
    playDash() {
        this._play(c => {
            const sz  = c.sampleRate * 0.1;
            const buf = c.createBuffer(1, sz, c.sampleRate);
            const d   = buf.getChannelData(0);
            for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
            const n = c.createBufferSource(); n.buffer = buf;
            const f = c.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 1000;
            const g = c.createGain();
            g.gain.setValueAtTime(0.1,  c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.1);
            n.connect(f); f.connect(g); g.connect(c.destination);
            n.start();
        });
    }

    /** Falling sawtooth — quick snap of a light punch connecting. */
    playAttackLight() {
        this._play(c => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(600, c.currentTime);
            o.frequency.linearRampToValueAtTime(200, c.currentTime + 0.08);
            g.gain.setValueAtTime(0.12, c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.08);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(c.currentTime + 0.08);
        });
    }

    /** Deep falling sawtooth — a heavy smash lands with weight. */
    playAttackHeavy() {
        this._play(c => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(150, c.currentTime);
            o.frequency.linearRampToValueAtTime(80,  c.currentTime + 0.2);
            g.gain.setValueAtTime(0.25, c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.2);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(c.currentTime + 0.2);
        });
    }

    /** Short triangle drop — glancing impact. */
    playHitLight() {
        this._play(c => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(300, c.currentTime);
            o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.1);
            g.gain.setValueAtTime(0.3,  c.currentTime);
            g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.1);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(c.currentTime + 0.1);
        });
    }

    /**
     * Square-wave bass note layered with decaying noise.
     * The combination produces the visceral "thud" of a smash hit.
     */
    playHitHeavy() {
        this._play(c => {
            const now = c.currentTime;

            // ── Bass oscillator ───────────────────────────────────────────
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(120, now);
            o.frequency.linearRampToValueAtTime(40,  now + 0.3);
            g.gain.setValueAtTime(0.5,  now);
            g.gain.linearRampToValueAtTime(0.01, now + 0.3);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(now + 0.3);

            // ── Decaying noise layer ──────────────────────────────────────
            const sz  = c.sampleRate * 0.25;
            const buf = c.createBuffer(1, sz, c.sampleRate);
            const d   = buf.getChannelData(0);
            // Amplitude envelope baked directly into the buffer samples.
            for (let i = 0; i < sz; i++)
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sz / 3));
            const n  = c.createBufferSource(); n.buffer = buf;
            const lp = c.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = 400;
            const ng = c.createGain();
            ng.gain.setValueAtTime(0.4,  now);
            ng.gain.linearRampToValueAtTime(0.01, now + 0.25);
            n.connect(lp); lp.connect(ng); ng.connect(c.destination);
            n.start();
        });
    }

    /** Long falling sawtooth wail — plays when a stock is lost. */
    playDeath() {
        this._play(c => {
            const now = c.currentTime;
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(500, now);
            o.frequency.exponentialRampToValueAtTime(50,  now + 0.6);
            g.gain.setValueAtTime(0.4,  now);
            g.gain.linearRampToValueAtTime(0.01, now + 0.6);
            o.connect(g); g.connect(c.destination);
            o.start(); o.stop(now + 0.6);
        });
    }
}

/** Singleton sound engine — all game code uses this reference. */
const audio = new SoundEngine();


// ════════════════════════════════════════════════════════════════════════════
// 2 · SPRITE ANIMATOR
// ════════════════════════════════════════════════════════════════════════════
/**
 * Plays horizontal strip sprite sheets (all frames on a single row).
 *
 * Instantiate once per Fighter; call play() to switch animation state,
 * update() once per game frame to advance the flipbook, and draw() to
 * render the current frame.
 *
 * NOTE — SpriteAnimator is used ONLY during live gameplay.
 * Hero-select portraits use static OffscreenCanvases (see Engine constructor).
 */
class SpriteAnimator {
    /**
     * @param {Object.<string,{src:string,frames:number}>} spriteMap
     *   Map of animation name → { src, frames }.
     *   Example: { 'Idle': { src:'Assets/Huntress/Idle.png', frames:8 } }
     */
    constructor(spriteMap) {
        /** @type {Object.<string,{img:HTMLImageElement|null,frames:number,frameW:number,frameH:number}>} */
        this.animations  = {};
        this.currentAnim = null;  // Currently playing animation key
        this.frameIndex  = 0;     // Index of the displayed frame (0-based)
        this.frameTimer  = 0;     // Counts up to frameSpeed, then advances frame
        this.frameSpeed  = 6;     // Game frames displayed per sprite frame
        this.loaded      = false; // True once every image has loaded/errored
        this._loadAll(spriteMap);
    }

    /**
     * Load all images defined in spriteMap.
     * Sets this.loaded = true once every load attempt has settled.
     * @private
     */
    _loadAll(spriteMap) {
        const keys   = Object.keys(spriteMap);
        if (!keys.length) { this.loaded = true; return; }

        let settled = 0;

        keys.forEach(name => {
            const def = spriteMap[name];
            const img = new Image();

            const onSettle = () => {
                const ok   = img.complete && img.naturalWidth > 0;
                const srcW = ok ? Math.floor(img.naturalWidth / def.frames) : 50;
                const srcH = ok ? img.naturalHeight : 80;
                this.animations[name] = {
                    img:    ok ? img : null,
                    frames: def.frames,
                    frameW: srcW,
                    frameH: srcH,
                };
                if (++settled === keys.length) this.loaded = true;
            };

            img.onload  = onSettle;
            img.onerror = onSettle;
            img.src     = def.src;
        });
    }

    /**
     * Switch to a named animation.  Restarts from frame 0 unless the
     * animation is already playing (prevents stuttering on repeated calls).
     * @param {string} name   Key in the spriteMap.
     * @param {number} [speed=6] Game-frames per sprite-frame.
     */
    play(name, speed = 6) {
        if (this.currentAnim === name) return; // Already playing — do nothing.
        this.currentAnim = name;
        this.frameIndex  = 0;
        this.frameTimer  = 0;
        this.frameSpeed  = speed;
    }

    /**
     * Advance the internal flipbook by one game frame.
     * Must be called exactly once per game loop iteration.
     */
    update() {
        if (!this.currentAnim) return;
        // FREEZE idle on frame 0 — cropped sheets have misaligned frames
        // that cause visible drift. All other anims cycle normally.
        if (this.currentAnim === 'Idle') return;
        const anim = this.animations[this.currentAnim];
        if (!anim) return;
        if (++this.frameTimer >= this.frameSpeed) {
            this.frameTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % anim.frames;
        }
    }

    /**
     * Returns true on the frame that the last frame of the animation is shown.
     * Useful for one-shot animations (attacks, death) to know when to exit.
     * @returns {boolean}
     */
    isFinished() {
        if (!this.currentAnim) return false;
        const anim = this.animations[this.currentAnim];
        return anim ? this.frameIndex === anim.frames - 1 : false;
    }

    /**
     * Render the current sprite frame at world position (cx, cy).
     *
     * The sprite is drawn so that cx is the horizontal centre and cy is the
     * character's feet (bottom edge).  Pass isMirrored = true when the
     * character faces left.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx   Horizontal centre of the character (world space).
     * @param {number} cy   Foot position of the character (world space).
     * @param {number} [scale=1]
     * @param {boolean} [isMirrored=false]
     */
    draw(ctx, cx, cy, scale = 1, isMirrored = false) {
        if (!this.currentAnim) return;
        const anim = this.animations[this.currentAnim];
        if (!anim || !anim.img) return;

        const dw = anim.frameW * scale;
        const dh = anim.frameH * scale;
        const sx = Math.floor(this.frameIndex * anim.frameW); // Source X in sprite sheet (floored to prevent sub-pixel drift)

        ctx.save();
        ctx.translate(cx, cy);
        if (isMirrored) ctx.scale(-1, 1);
        // Draw with centre-x = 0, bottom = 0 (feet at origin).
        ctx.drawImage(
            anim.img,
            sx, 0, anim.frameW, anim.frameH, // Source rect (one frame)
            -dw / 2, -dh, dw, dh             // Destination rect
        );
        ctx.restore();
    }

    /**
     * Scaled pixel height of the current animation frame.
     * @param {number} scale
     * @returns {number}
     */
    getHeight(scale) {
        if (!this.currentAnim) return 72 * scale;
        const anim = this.animations[this.currentAnim];
        return anim ? anim.frameH * scale : 72 * scale;
    }
}

/**
 * Build a spriteMap object from a compact array definition.
 * @param {string} folder  Sub-folder name inside Assets/.
 * @param {[string,number][]} defs  Array of [animationName, frameCount].
 * @returns {Object.<string,{src:string,frames:number}>}
 */
function buildSpriteMap(folder, defs) {
    const map = {};
    defs.forEach(([name, frames]) => {
        map[name] = { src: `Assets/${folder}/${name}.png`, frames };
    });
    return map;
}


// ════════════════════════════════════════════════════════════════════════════
// 3 · GAME DATA — Characters & Maps
// ════════════════════════════════════════════════════════════════════════════

/** @type {CharacterData[]} All playable character definitions. */
const CHARACTERS = [
    {
        id: 'HUNTRESS', name: 'Huntress', title: 'Shadow Spear Sentinel',
        folder: 'Huntress', color: '#e94560', accent: '#ff758f',
        speed: 8.5, jumpForce: 13.5, weight: 1.0,
        attackRange: 72, lightDamage: 4, heavyDamage: 13,
        lightKnockback: 4, heavyKnockback: 12,
        maxJumps: 3, spriteScale: 1.1,
        spriteMap: buildSpriteMap('Huntress', [
            ['Idle',8],['Run',8],['Jump',2],['Fall',2],
            ['Attack1',5],['Attack2',5],['Attack3',7],['Take hit',3],['Death',8]
        ]),
        desc: 'Triple-jump airborne skirmisher with long spear reach.',
        stats: { speed: 9, damage: 6, defense: 5 },
    },
    {
        id: 'WIZARD', name: 'Wizard', title: 'Arcane Vanguard',
        folder: 'Wizard', color: '#3a86ff', accent: '#80ffdb',
        speed: 5.8, jumpForce: 12.5, weight: 0.7,
        attackRange: 90, lightDamage: 7, heavyDamage: 21,
        lightKnockback: 6, heavyKnockback: 17,
        maxJumps: 2, spriteScale: 1.05,
        spriteMap: buildSpriteMap('Wizard', [
            ['Idle',6],['Run',9],['Jump',2],['Fall',2],
            ['Attack1',9],['Attack2',9],['Hit',4],['Death',8]
        ]),
        desc: 'Heavy spell-caster with wide arcane blasts. Slow but devastating.',
        stats: { speed: 4, damage: 10, defense: 10 },
    },
    {
        id: 'MARTAIL', name: 'Martial', title: 'Cyber-Void Reaper',
        folder: 'Martail', color: '#06d6a0', accent: '#ffd166',
        speed: 10.2, jumpForce: 13.0, weight: 1.15,
        attackRange: 62, lightDamage: 3, heavyDamage: 11,
        lightKnockback: 3, heavyKnockback: 10,
        maxJumps: 2, spriteScale: 1.2,
        spriteMap: buildSpriteMap('Martail', [
            ['Idle',10],['Run',8],['Going Up',3],['Going Down',3],
            ['Attack1',7],['Attack2',6],['Attack3',9],['Take Hit',3],['Death',11]
        ]),
        desc: 'Hyper-speed ground assassin with lightning triple-hit combos.',
        stats: { speed: 10, damage: 7, defense: 3 },
    },
    {
        id: 'EVIL_WIZARD', name: 'Evil Wizard', title: 'Dark Arcane Overlord',
        folder: 'Evil-Wizard', color: '#9b59b6', accent: '#e74c3c',
        speed: 6.5, jumpForce: 13.0, weight: 0.85,
        attackRange: 95, lightDamage: 7, heavyDamage: 23,
        lightKnockback: 7, heavyKnockback: 19,
        maxJumps: 2, spriteScale: 1.0,
        spriteMap: buildSpriteMap('Evil-Wizard', [
            ['Idle',8],['Run',8],['Jump',2],['Fall',2],
            ['Attack1',8],['Attack2',8],['Take hit',3],['Death',7]
        ]),
        desc: 'The final boss made playable. Massive range and devastating dark magic.',
        stats: { speed: 5, damage: 10, defense: 8 },
    },
];

/** @type {MapData[]} All playable arenas. */
const MAPS = [
    {
        id: 'SANCTUARY', name: 'Floating Sanctuary',
        subtitle: 'Serene ancient skies with multi-tiered layout',
        bgGradient: ['#1a1c29','#2c3e50','#4ca1af'],
        parallaxLayers: [
            {
                depth: 0.05,
                draw(ctx, ox, W, H) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    for (let i = 0; i < 60; i++) {
                        const sx = ((i * 173.31 + ox) % (W * 2)) - W * 0.5;
                        const sy = (i * 47.7) % (H * 0.55);
                        const r  = (i % 3) * 0.7 + 0.4;
                        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
                    }
                }
            },
            {
                depth: 0.2,
                draw(ctx, ox, W, H) {
                    ctx.fillStyle = 'rgba(44,62,80,0.55)';
                    for (let rep = -1; rep <= 1; rep++) {
                        const bx = rep * W - ox;
                        ctx.beginPath();
                        ctx.moveTo(bx, H);
                        ctx.lineTo(bx + 100, H - 200);
                        ctx.lineTo(bx + 250, H - 120);
                        ctx.lineTo(bx + 380, H - 280);
                        ctx.lineTo(bx + 500, H - 150);
                        ctx.lineTo(bx + 680, H - 230);
                        ctx.lineTo(bx + W,   H);
                        ctx.fill();
                    }
                }
            },
            {
                depth: 0.4,
                draw(ctx, ox, W, H) {
                    ctx.fillStyle = 'rgba(76,161,175,0.13)';
                    [80,300,550,820,1100].forEach((cp, i) => {
                        const cx = ((cp - ox) % (W + 300) + W + 300) % (W + 300) - 150;
                        const cy = 100 + (i % 3) * 60, r = 60 + (i % 2) * 40;
                        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(cx + r * 0.6, cy - 20, r * 0.7, 0, Math.PI * 2); ctx.fill();
                    });
                }
            },
        ],
        platforms: [
            { x:340, y:500, width:600, height:80,  soft:false, color:'#2C3E50', topColor:'#8FC1E3' },
            { x:420, y:360, width:140, height:16,  soft:true,  color:'#687864', topColor:'#A2B5CD' },
            { x:720, y:360, width:140, height:16,  soft:true,  color:'#687864', topColor:'#A2B5CD' },
            { x:570, y:220, width:140, height:16,  soft:true,  color:'#687864', topColor:'#E0F7FA' },
        ],
        drawDecorations(ctx) {
            ctx.fillStyle = 'rgba(143,193,227,0.3)';
            ctx.fillRect(610, 580, 60, 140);
        },
    },
    {
        id: 'CYBER', name: 'Neon Cyber Core',
        subtitle: 'Hazardous industrial zone with wide aggressive gaps',
        bgGradient: ['#0f0c1b','#1a002c','#3b004a'],
        parallaxLayers: [
            {
                depth: 0.05,
                draw(ctx, ox, W, H) {
                    ctx.strokeStyle = 'rgba(0,240,255,0.04)';
                    ctx.lineWidth   = 1;
                    const gs  = 80, gox = ox % gs;
                    for (let x = -gox; x < W; x += gs) {
                        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
                    }
                    for (let y = 0; y < H; y += gs) {
                        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
                    }
                }
            },
            {
                depth: 0.15,
                draw(ctx, ox, W, H) {
                    const blds  = [60,120,80,200,100,160,140,90,180,110,70,150];
                    const bw    = 80, total = blds.length * bw;
                    const shift = ox % total;
                    for (let rep = -1; rep <= 2; rep++) {
                        blds.forEach((bh, i) => {
                            const bx = rep * total + i * bw - shift;
                            ctx.fillStyle = 'rgba(26,0,44,0.85)';
                            ctx.fillRect(bx, H - bh, bw - 4, bh);
                            ctx.fillStyle = 'rgba(0,240,255,0.25)';
                            for (let wy = H - bh + 10; wy < H - 10; wy += 20) {
                                ctx.fillRect(bx + 8,      wy, 7, 7);
                                ctx.fillRect(bx + bw - 18, wy, 7, 7);
                            }
                        });
                    }
                }
            },
            {
                depth: 0.5,
                draw(ctx, ox, W, H) {
                    const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
                    ctx.strokeStyle = `rgba(255,0,127,${0.07 + pulse * 0.13})`;
                    ctx.lineWidth   = 2;
                    [150,400,700,950,1200].forEach((sx, i) => {
                        const rx = ((sx - ox) % (W + 200) + W + 200) % (W + 200) - 100;
                        ctx.beginPath();
                        ctx.moveTo(rx, H * 0.3 + i * 30);
                        ctx.lineTo(rx + 120, H * 0.3 + i * 30);
                        ctx.stroke();
                    });
                }
            },
        ],
        platforms: [
            { x:240, y:460, width:280, height:40, soft:false, color:'#1f1a3a', topColor:'#ff007f' },
            { x:760, y:460, width:280, height:40, soft:false, color:'#1f1a3a', topColor:'#ff007f' },
            { x:500, y:320, width:280, height:18, soft:true,  color:'#38003c', topColor:'#00f0ff' },
        ],
        drawDecorations(ctx) {
            const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(0,240,255,${0.2 + pulse * 0.5})`;
            ctx.lineWidth   = 3;
            ctx.beginPath();
            ctx.moveTo(520, 460); ctx.lineTo(640, 550); ctx.lineTo(760, 460);
            ctx.stroke();
            ctx.fillStyle = `rgba(255,0,127,${0.1 + pulse * 0.3})`;
            ctx.beginPath(); ctx.arc(640, 550, 30, 0, Math.PI * 2); ctx.fill();
        },
    },
];


// ════════════════════════════════════════════════════════════════════════════
// 4 · PARTICLE SYSTEM
// ════════════════════════════════════════════════════════════════════════════
/**
 * Manages two independent pools of particles:
 *   particles      — drawn with default composite mode (source-over).
 *   glowParticles  — drawn with 'lighter' composite (additive blending),
 *                    creating a luminous bloom effect.
 *
 * Special particle types:
 *   'ring' — expanding hollow circle (blast-zone KO ring)
 *   'arc'  — partial arc stroke (attack slash trail)
 *   default — small circle or square that obeys mini physics
 */
class ParticleSystem {
    constructor() {
        this.particles     = [];
        this.glowParticles = [];
    }

    /**
     * Spawn solid (non-glow) particles flying outward from a point.
     *
     * @param {number} x       Origin X.
     * @param {number} y       Origin Y.
     * @param {number} count   Number of particles to create.
     * @param {ParticleConfig} config
     */
    spawn(x, y, count, config) {
        for (let i = 0; i < count; i++) {
            const angle  = config.angle  !== undefined ? config.angle  : Math.random() * Math.PI * 2;
            const spread = config.spread !== undefined ? config.spread : Math.PI * 2;
            const fa     = angle + (Math.random() - 0.5) * spread;
            const speed  = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            this.particles.push({
                x, y,
                vx:      Math.cos(fa) * speed,
                vy:      Math.sin(fa) * speed,
                size:    config.minSize + Math.random() * (config.maxSize - config.minSize),
                color:   Array.isArray(config.color)
                             ? config.color[Math.floor(Math.random() * config.color.length)]
                             : config.color,
                alpha:   1,
                decay:   config.decay   ?? 0.03,
                gravity: config.gravity ?? 0,
                drag:    config.drag    ?? 0.95,
                shape:   config.shape  ?? 'circle',
            });
        }
    }

    /**
     * Spawn additive-blended (glow) particles — identical physics, different render path.
     * @param {number} x
     * @param {number} y
     * @param {number} count
     * @param {ParticleConfig} config
     */
    spawnGlow(x, y, count, config) {
        for (let i = 0; i < count; i++) {
            const angle  = config.angle  !== undefined ? config.angle  : Math.random() * Math.PI * 2;
            const spread = config.spread !== undefined ? config.spread : Math.PI * 2;
            const fa     = angle + (Math.random() - 0.5) * spread;
            const speed  = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            this.glowParticles.push({
                x, y,
                vx:      Math.cos(fa) * speed,
                vy:      Math.sin(fa) * speed,
                size:    config.minSize + Math.random() * (config.maxSize - config.minSize),
                color:   Array.isArray(config.color)
                             ? config.color[Math.floor(Math.random() * config.color.length)]
                             : config.color,
                alpha:   1,
                decay:   config.decay ?? 0.025,
                gravity: config.gravity ?? 0,
                drag:    config.drag   ?? 0.97,
            });
        }
    }

    /**
     * Emit an arc-stroke particle — the slashing trail that appears on attacks.
     * @param {number} x          Centre of the arc (character's hip position).
     * @param {number} y
     * @param {number} radius     Reach of the arc.
     * @param {number} startAngle In radians.
     * @param {number} endAngle   In radians.
     * @param {string} color      CSS colour string.
     */
    spawnSwipe(x, y, radius, startAngle, endAngle, color) {
        this.particles.push({
            type: 'arc',
            x, y, radius, startAngle, endAngle, color,
            alpha:     1,
            decay:     0.08,
            lineWidth: 22,
        });
    }

    /**
     * Full KO celebration: expanding ring + debris burst + glow corona.
     * @param {number} x
     * @param {number} y
     * @param {string} color Character's primary colour.
     */
    spawnBlastRing(x, y, color) {
        // Expanding hollow ring.
        this.particles.push({
            type: 'ring', x, y,
            radius: 10, color, alpha: 1, decay: 0.02, speed: 22,
        });
        // Chunky square debris.
        this.spawn(x, y, 36, {
            minSpeed: 6, maxSpeed: 22, minSize: 3, maxSize: 10,
            color: [color, '#ffffff', '#ffdd00'],
            decay: 0.016, drag: 0.98, shape: 'square',
        });
        // Additive glow corona.
        this.spawnGlow(x, y, 28, {
            minSpeed: 4, maxSpeed: 18, minSize: 5, maxSize: 16,
            color: [color, '#ffffff'],
            decay: 0.022, drag: 0.97,
        });
    }

    /** Advance all particles by one game frame and cull dead ones. */
    update() {
        // Iterate backwards so splicing never skips an element.
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.type === 'ring') {
                p.radius += p.speed;
                p.alpha  -= p.decay;
            } else if (p.type === 'arc') {
                p.alpha  -= p.decay;
                p.radius += 2;
            } else {
                p.vx *= p.drag; p.vy *= p.drag;
                p.vy += p.gravity;
                p.x  += p.vx;   p.y  += p.vy;
                p.alpha -= p.decay;
                if (p.size > 0.1) p.size -= p.decay * 2;
            }
            if (p.alpha <= 0 || p.size <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.glowParticles.length - 1; i >= 0; i--) {
            const p = this.glowParticles[i];
            p.vx *= p.drag; p.vy *= p.drag;
            p.vy += p.gravity;
            p.x  += p.vx;   p.y  += p.vy;
            p.alpha -= p.decay;
            if (p.size > 0.1) p.size -= p.decay;
            if (p.alpha <= 0 || p.size <= 0) this.glowParticles.splice(i, 1);
        }
    }

    /**
     * Render all particles onto ctx.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        ctx.save();

        // ── Solid particles ───────────────────────────────────────────────
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.alpha);
            if (p.type === 'ring') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth   = Math.max(1, 14 * p.alpha);
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (p.type === 'arc') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth   = p.lineWidth * p.alpha;
                ctx.lineCap     = 'round';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, p.startAngle, p.endAngle);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                if (p.shape === 'square') {
                    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                } else {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();

        // ── Glow (additive) particles ─────────────────────────────────────
        if (this.glowParticles.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; // Colours ADD together = bloom.
            for (const p of this.glowParticles) {
                ctx.globalAlpha = Math.max(0, p.alpha * 0.75);
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                g.addColorStop(0, p.color);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}


// ════════════════════════════════════════════════════════════════════════════
// 5 · FIGHTER ENTITY
// ════════════════════════════════════════════════════════════════════════════
/**
 * One playable or CPU-controlled combatant.
 *
 * Responsibilities:
 *   • Receiving keyboard input and converting it to physics impulses
 *   • Running the CPU AI decision tree
 *   • Resolving movement, gravity, platform collisions
 *   • Tracking stocks, damage %, and hitstun
 *   • Providing hurtbox / hitbox rectangles for collision queries
 *   • Driving the SpriteAnimator state machine
 *   • Rendering itself (sprite + overhead HUD text)
 */
class Fighter {
    /**
     * @param {Engine}        game      The game engine (for cross-object calls).
     * @param {1|2}           id        Player slot.
     * @param {CharacterData} charData  Stats, sprite paths, dimensions.
     * @param {number}        x         Spawn X.
     * @param {number}        y         Spawn Y.
     * @param {boolean}       isPlayer  Human (true) or CPU (false).
     * @param {ControlMap}    controls  Key-name map for this player.
     */
    constructor(game, id, charData, x, y, isPlayer, controls = {}) {
        this.game      = game;
        this.id        = id;
        this.charData  = charData;
        this.isPlayer  = isPlayer;
        this.controls  = controls;

        // ── Spatial ─────────────────────────────────────────────────────
        this.x      = x;   this.y      = y;
        this.width  = 40;  this.height = 72;  // Hurtbox dimensions (px)
        this.vx     = 0;   this.vy     = 0;   // Velocity (px / frame)
        this.facing = id === 1 ? 1 : -1;       // +1 = right, −1 = left

        // ── Stock & damage ──────────────────────────────────────────────
        this.stocks        = 3;   // Lives remaining
        this.damagePercent = 0;   // Accumulated damage % (drives knockback scaling)

        // ── Jump state ──────────────────────────────────────────────────
        this.jumpsLeft         = charData.maxJumps;
        this.isGrounded        = false;
        this.isOnSoftPlatform  = false;
        this.fastFalling       = false;
        this.coyoteFrames      = 0;  // Remaining frames of coyote-time leniency
        this.jumpBufferFrames  = 0;  // Remaining frames of jump-buffer leniency
        this.wasGrounded       = false;

        // ── Dash state ──────────────────────────────────────────────────
        this.dashCooldown = 0;   // Frames until next dash is allowed
        this.dashTime     = 0;   // Frames of active dash remaining
        this.dashVx       = 0;   // Signed dash velocity

        // ── Hit state ───────────────────────────────────────────────────
        this.invulnTime  = 60;   // Frames of post-spawn invulnerability
        this.hitstunTime = 0;    // Frames of stun (input locked) after taking a hit

        // ── Attack state ─────────────────────────────────────────────────
        this.attackState              = null;  // 'LIGHT' | 'HEAVY' | null
        this.attackTimer              = 0;     // Frames of active attack remaining
        this.hasDealtDamageThisAttack = false; // Prevents multi-hitting in one swing

        // ── Edge-triggered input flags ───────────────────────────────────
        // Storing the previous frame's key state lets us detect rising edges
        // (key just pressed this frame) rather than polling held keys.
        this.prevJumpKey  = false;
        this.prevHeavyKey = false;
        this.prevLightKey = false;
        this.prevDashKey  = false;

        // ── Animation ────────────────────────────────────────────────────
        this.animCycle = Math.random() * 10; // Random offset to desync two idle fighters
        this.sprite    = new SpriteAnimator(charData.spriteMap);

        // ── CPU AI ───────────────────────────────────────────────────────
        this.aiDecisionCooldown = 0;
        this.aiState            = 'APPROACH';
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    /**
     * Reset the fighter to a playable state after losing a stock.
     * Does NOT modify this.stocks — the caller (update) already decremented it.
     * @param {number} spawnX Horizontal spawn position.
     */
    respawn(spawnX) {
        this.x = spawnX; this.y = 150;
        this.vx = 0;     this.vy = 0;
        this.damagePercent    = 0;
        this.jumpsLeft        = this.charData.maxJumps;
        this.invulnTime       = 120; // Extra invulnerability after respawn
        this.attackState      = null;
        this.hitstunTime      = 0;
        this.fastFalling      = false;
        this.coyoteFrames     = 0;
        this.jumpBufferFrames = 0;
        this.dashTime         = 0;
        this.dashCooldown     = 0;
    }

    // ── Collision geometry ────────────────────────────────────────────────────

    /**
     * The rectangle where this fighter can be hurt.
     * Origin is the fighter's foot position.
     * @returns {{x:number,y:number,width:number,height:number}}
     */
    getHurtbox() {
        return {
            x:      this.x - this.width / 2,
            y:      this.y - this.height,
            width:  this.width,
            height: this.height,
        };
    }

    /**
     * The rectangle representing the active attack hitbox, or null when idle.
     * Heavy attacks extend the range by 22 px.
     * @returns {{x,y,width,height,damage,baseKnockback,type}|null}
     */
    getHitbox() {
        if (!this.attackState) return null;
        const isHeavy = this.attackState === 'HEAVY';
        const range   = isHeavy ? this.charData.attackRange + 22 : this.charData.attackRange;
        const hbH     = this.height * 0.68;
        const hbY     = this.y - this.height * 0.85;
        return {
            x:             this.facing === 1 ? this.x + 4 : this.x - range - 4,
            y:             hbY,
            width:         range,
            height:        hbH,
            damage:        isHeavy ? this.charData.heavyDamage    : this.charData.lightDamage,
            baseKnockback: isHeavy ? this.charData.heavyKnockback : this.charData.lightKnockback,
            type:          this.attackState,
        };
    }

    // ── Animation state machine ───────────────────────────────────────────────

    /**
     * Pick the correct animation based on the fighter's current state.
     * Priority (highest → lowest): Death > Hitstun > Attacking > Airborne > Running > Idle.
     * @private
     */
    _resolveAnimation() {
        const id = this.charData.id;

        if (this.stocks <= 0) {
            if (this.sprite.currentAnim !== 'Death') this.sprite.play('Death', 8);
            return;
        }
        if (this.hitstunTime > 0) {
            // Different characters use different key names for the hit animation.
            const key = id === 'WIZARD' ? 'Hit' : id === 'MARTAIL' ? 'Take Hit' : 'Take hit';
            if (this.sprite.currentAnim !== key) this.sprite.play(key, 5);
            return;
        }
        if (this.attackState) {
            const key = this.attackState === 'HEAVY' ? 'Attack2' : 'Attack1';
            if (this.sprite.currentAnim !== key) this.sprite.play(key, 4);
            return;
        }
        if (!this.isGrounded) {
            // Martial uses different airborne key names.
            const upKey  = id === 'MARTAIL' ? 'Going Up'   : 'Jump';
            const dnKey  = id === 'MARTAIL' ? 'Going Down' : 'Fall';
            const airKey = this.vy < 0 ? upKey : dnKey;
            if (this.sprite.currentAnim !== airKey) this.sprite.play(airKey, 5);
            return;
        }
        if (Math.abs(this.vx) > 0.5) {
            if (this.sprite.currentAnim !== 'Run')  this.sprite.play('Run',  5);
        } else {
            if (this.sprite.currentAnim !== 'Idle') this.sprite.play('Idle', 7);
        }
    }

    // ── Human input handling ──────────────────────────────────────────────────

    /**
     * Read the current key map and translate inputs into physics impulses.
     * Called once per frame before update().
     * @param {Object.<string,boolean>} keys
     */
    handleInput(keys) {
        // During hitstun the character is locked out of all actions.
        if (this.hitstunTime > 0) {
            this.prevJumpKey = keys[this.controls.jump];
            this.prevDashKey = keys[this.controls.dash];
            return;
        }

        const sp = this.charData.speed;

        // ── Dash (rising-edge trigger) ────────────────────────────────────
        const dashKey = keys[this.controls.dash];
        if (dashKey && !this.prevDashKey && this.dashCooldown <= 0) {
            this.dashTime     = PHYS.DASH_FRAMES;
            this.dashCooldown = PHYS.DASH_COOLDOWN;
            this.dashVx       = PHYS.DASH_SPEED * this.facing;
            this.vy           = 0; // Snap vertical movement to zero for clean dash
            audio.playDash();
            this.game.particles.spawnGlow(
                this.x, this.y - this.height * 0.45, 14, {
                    minSpeed: 2, maxSpeed: 8, minSize: 3, maxSize: 9,
                    color: [this.charData.accent, '#ffffff'], decay: 0.055,
                }
            );
        }
        this.prevDashKey = dashKey;

        // While dashing, all other inputs are suppressed.
        if (this.dashTime > 0) {
            this.prevJumpKey = keys[this.controls.jump];
            return;
        }

        // ── Horizontal movement ───────────────────────────────────────────
        const accel    = this.isGrounded ? PHYS.GROUND_ACCEL   : PHYS.AIR_ACCEL;
        const friction = this.isGrounded ? PHYS.GROUND_FRICTION : PHYS.AIR_FRICTION;

        if (keys[this.controls.left]) {
            this.vx     = Math.max(this.vx - accel, -sp);
            this.facing = -1;
        } else if (keys[this.controls.right]) {
            this.vx     = Math.min(this.vx + accel,  sp);
            this.facing = 1;
        } else {
            // No directional input — apply friction.
            this.vx *= friction;
            if (Math.abs(this.vx) < PHYS.STOP_THRESHOLD) this.vx = 0;
        }

        // ── Jump (buffered, with coyote time) ────────────────────────────
        const jumpKey = keys[this.controls.jump];
        if (jumpKey && !this.prevJumpKey) {
            // Rising edge → start the jump buffer countdown.
            this.jumpBufferFrames = PHYS.JUMP_BUFFER_FRAMES;
        }
        if (this.jumpBufferFrames > 0) {
            const coyoteOk = this.coyoteFrames > 0 && this.jumpsLeft === this.charData.maxJumps;
            const jumpsOk  = this.jumpsLeft > 0;
            if (coyoteOk || jumpsOk) {
                this.vy = -this.charData.jumpForce;
                if (!coyoteOk) this.jumpsLeft--;
                this.coyoteFrames     = 0;
                this.jumpBufferFrames = 0;
                this.isGrounded       = false;
                this.fastFalling      = false;
                this.isOnSoftPlatform = false;
                audio.playJump();
                this.game.particles.spawn(this.x, this.y, 8, {
                    minSpeed: 1, maxSpeed: 3, minSize: 2, maxSize: 5,
                    color: '#ffffff', decay: 0.065, gravity: 0.06,
                });
            }
        }
        if (this.jumpBufferFrames > 0) this.jumpBufferFrames--;
        this.prevJumpKey = jumpKey;

        // ── Fast-fall / drop through soft platform ────────────────────────
        if (keys[this.controls.down]) {
            if (!this.isGrounded && this.vy >= 0 && !this.fastFalling) {
                // Snap downward velocity to trigger fast-fall.
                this.vy = Math.max(this.vy, 10);
                this.fastFalling = true;
            } else if (this.isGrounded && this.isOnSoftPlatform) {
                // Step through the soft platform.
                this.y             += 8;
                this.isGrounded    = false;
                this.isOnSoftPlatform = false;
            }
        }

        // ── Attacks (rising-edge) ─────────────────────────────────────────
        if (!this.attackState) {
            const heavyKey = keys[this.controls.attackHeavy];
            const lightKey = keys[this.controls.attackLight];
            if      (heavyKey && !this.prevHeavyKey) this.triggerAttack('HEAVY');
            else if (lightKey && !this.prevLightKey) this.triggerAttack('LIGHT');
            this.prevHeavyKey = heavyKey;
            this.prevLightKey = lightKey;
        }
    }

    /**
     * Fire an attack: set state, emit particles, play audio.
     * @param {'LIGHT'|'HEAVY'} type
     */
    triggerAttack(type) {
        this.attackState              = type;
        this.attackTimer              = type === 'HEAVY' ? 26 : 14;
        this.hasDealtDamageThisAttack = false;

        const hitX = this.x + this.facing * this.charData.attackRange * 0.48;
        const hitY = this.y - this.height * 0.6;

        if (type === 'HEAVY') {
            audio.playAttackHeavy();
            this.vx += 2.8 * this.facing; // Tiny lunge toward target.
            this.game.particles.spawnGlow(hitX, hitY, 18, {
                minSpeed: 2, maxSpeed: 11, minSize: 4, maxSize: 15,
                color: [this.charData.accent, this.charData.color, '#ffffff'],
                decay: 0.028, drag: 0.93,
            });
            const sA = this.facing === 1 ? -Math.PI / 2 : Math.PI * 1.5;
            const eA = this.facing === 1 ?  Math.PI / 4 : Math.PI * 0.75;
            this.game.particles.spawnSwipe(
                this.x, this.y - this.height * 0.5,
                this.charData.attackRange * 0.72, sA, eA, this.charData.accent
            );
        } else {
            audio.playAttackLight();
            this.game.particles.spawnGlow(hitX, hitY, 8, {
                minSpeed: 2, maxSpeed: 7, minSize: 2, maxSize: 8,
                color: [this.charData.accent, '#ffffff'], decay: 0.048, drag: 0.94,
            });
            const sA = this.facing === 1 ? -Math.PI / 4 : Math.PI * 1.25;
            const eA = this.facing === 1 ?  Math.PI / 6 : Math.PI * 0.85;
            this.game.particles.spawnSwipe(
                this.x, this.y - this.height * 0.42,
                this.charData.attackRange * 0.54, sA, eA, '#ffffff'
            );
        }
    }

    // ── CPU AI ────────────────────────────────────────────────────────────────

    /** @private True when the fighter has left the blast-zone "safe" area. */
    _isOffStage()   { return this.x < 60 || this.x > 1220 || this.y > 640; }

    /** @private True when close enough to an edge that recovery is wise. */
    _isDangerZone() { return this.x < 210 || this.x > 1070; }

    /**
     * Checks if any platform exists below (scanX, scanY) within maxDist.
     * Used by the AI to avoid walking off ledges.
     * @private
     */
    _hasPlatformBelow(scanX, scanY, platforms, maxDist = 180) {
        for (const p of platforms) {
            if (scanX >= p.x && scanX <= p.x + p.width) {
                if (p.y >= scanY && p.y <= scanY + maxDist) return true;
            }
        }
        return false;
    }

    /**
     * Returns true if taking stepX forward would walk off the current platform.
     * @private
     */
    _edgeAhead(stepX, platforms) {
        if (!this.isGrounded) return false;
        return !this._hasPlatformBelow(this.x + stepX, this.y, platforms, 30);
    }

    /**
     * Full AI decision loop — called each frame instead of handleInput() for CPU fighters.
     * @param {Fighter} target    The opponent fighter.
     * @param {Platform[]} platforms
     */
    updateCPU(target, platforms) {
        if (this.hitstunTime > 0) return;
        if (this.aiDecisionCooldown > 0) this.aiDecisionCooldown--;

        // Off-stage recovery takes priority over everything else.
        if (this._isOffStage()) { this._aiRecover(platforms); return; }
        if (this.dashTime > 0)  return; // Mid-dash: do nothing.

        const dx  = target.x - this.x;
        const dy  = target.y - this.y;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        this.facing = dx > 0 ? 1 : -1;

        // Opportunistic dodge when target is about to land a heavy attack.
        if (target.attackState === 'HEAVY' && adx < 150 &&
            this.dashCooldown <= 0 && Math.random() < 0.22) {
            this.facing       = dx > 0 ? -1 : 1;  // Dash AWAY
            this.dashTime     = PHYS.DASH_FRAMES;
            this.dashCooldown = PHYS.DASH_COOLDOWN + 5;
            this.dashVx       = PHYS.DASH_SPEED * this.facing;
            audio.playDash();
            return;
        }

        // Attack when in range and cooldown allows.
        const attackWindow = this.charData.attackRange + 12;
        if (!this.attackState && adx <= attackWindow &&
            ady < 68 && this.aiDecisionCooldown <= 0) {
            const useHeavy = target.damagePercent > 65 && Math.random() < 0.55;
            this.triggerAttack(useHeavy ? 'HEAVY' : 'LIGHT');
            this.aiDecisionCooldown = useHeavy ? 28 : 16;
            return;
        }

        this._aiApproach(target, platforms);
        this._aiJumpLogic(target, platforms);
    }

    /** @private Smooth horizontal approach toward the target. */
    _aiApproach(target, platforms) {
        const dx   = target.x - this.x;
        const adx  = Math.abs(dx);
        const sp   = this.charData.speed;
        const step = 58 * this.facing;
        const safe = !this._edgeAhead(step, platforms);

        if (adx > this.charData.attackRange * 0.85) {
            if (safe || !this.isGrounded) {
                const targetVx = this.facing * Math.min(sp * 0.82, adx * 0.09);
                this.vx += (targetVx - this.vx) * 0.14; // Lerp to target speed
            } else {
                this.vx *= 0.68;
                // Jump over the edge gap rather than stopping dead.
                if (this.jumpsLeft > 0 && this.isGrounded && Math.random() < 0.04) {
                    this.vy = -this.charData.jumpForce;
                    this.jumpsLeft--;
                    audio.playJump();
                }
            }
            // Commit to a dash if far enough and conditions allow.
            if (adx > 260 && safe && this.isGrounded &&
                this.dashCooldown <= 0 && Math.random() < 0.022) {
                this.dashTime     = PHYS.DASH_FRAMES;
                this.dashCooldown = PHYS.DASH_COOLDOWN + 10;
                this.dashVx       = PHYS.DASH_SPEED * this.facing;
                audio.playDash();
            }
        } else {
            this.vx *= 0.80; // In attack range — brake to avoid overshooting.
        }

        // Gentle nudge toward center when near a blast zone.
        if (this._isDangerZone()) {
            const toCenter = 640 - this.x;
            if (Math.abs(this.vx) < sp) this.vx += 0.55 * Math.sign(toCenter);
        }
    }

    /** @private Vertical pursuit and platform-dropping logic. */
    _aiJumpLogic(target, platforms) {
        const dy = target.y - this.y;

        // Jump up toward an elevated target.
        if (dy < -55 && this.jumpsLeft > 0 && this.isGrounded && Math.random() < 0.065) {
            this.vy = -this.charData.jumpForce; this.jumpsLeft--; audio.playJump();
        }
        // Second jump in the air if still not close enough.
        if (dy < -105 && this.jumpsLeft > 0 && !this.isGrounded &&
            this.vy > -2 && Math.random() < 0.055) {
            this.vy = -this.charData.jumpForce; this.jumpsLeft--; audio.playJump();
        }
        // Fast-fall toward a lower target.
        if (dy > 80 && !this.isGrounded && !this.fastFalling &&
            this.vy >= 0 && Math.random() < 0.085) {
            this.vy = Math.max(this.vy, 10);
            this.fastFalling = true;
        }
    }

    /** @private Emergency off-stage recovery: fly back to center. */
    _aiRecover(platforms) {
        const toCenter = 640 - this.x;
        this.facing = Math.sign(toCenter);
        if (Math.abs(this.vx) < this.charData.speed * 0.9)
            this.vx += 1.7 * this.facing;
        if (this.jumpsLeft > 0 && this.vy > -2 && Math.random() < 0.18) {
            this.vy = -this.charData.jumpForce; this.jumpsLeft--; audio.playJump();
        }
        if (Math.abs(toCenter) > 320 && this.dashCooldown <= 0 && Math.random() < 0.07) {
            this.dashTime     = PHYS.DASH_FRAMES;
            this.dashCooldown = PHYS.DASH_COOLDOWN;
            this.dashVx       = PHYS.DASH_SPEED * this.facing;
            audio.playDash();
        }
    }

    // ── Hit reception ────────────────────────────────────────────────────────

    /**
     * Apply knockback and hitstun after being hit by attacker's hitbox.
     *
     * The knockback formula mirrors Super Smash Bros. mechanics:
     *   rawKb = baseKnockback + (damagePercent/10) + (damagePercent²/280)
     *   kb    = rawKb / weight
     *
     * @param {{damage,baseKnockback,type}} hitbox
     * @param {Fighter} attacker
     * @returns {boolean} True if the hit was successfully applied.
     */
    applyHit(hitbox, attacker) {
        if (this.invulnTime > 0) return false; // Still invulnerable — ignore.

        this.damagePercent += hitbox.damage;
        const dmgFactor = this.damagePercent / 10 + (this.damagePercent ** 2) / 280;
        const rawKb     = hitbox.baseKnockback + dmgFactor;
        const kb        = rawKb / (this.charData.weight || 1.0);
        const kbAngle   = hitbox.type === 'HEAVY' ? 0.52 : 0.48;

        // Apply velocity: horizontal from attacker's facing, vertical upward.
        this.vx = attacker.facing * kb * 0.88;
        this.vy = -kb * kbAngle - 3.5;
        this.hitstunTime = Math.min(55, Math.floor(kb * 1.35));

        // Cancel ongoing actions.
        this.attackState = null;
        this.dashTime    = 0;
        this.fastFalling = false;
        this.isGrounded  = false;

        // Screen feedback proportional to knockback magnitude.
        if (hitbox.type === 'HEAVY') {
            audio.playHitHeavy();
            this.game.triggerScreenShake(Math.min(16, Math.floor(kb * 1.05)));
            this.game.triggerPostProcess('invert', 7);
        } else {
            audio.playHitLight();
            this.game.triggerScreenShake(3);
        }

        // Debris particles — more at higher knockback.
        const pCount = Math.max(8, Math.floor(kb * 1.3));
        this.game.particles.spawn(this.x, this.y - this.height * 0.45, pCount, {
            minSpeed: 3, maxSpeed: kb * 1.1, minSize: 2, maxSize: 8,
            color: [this.charData.color, '#ffffff', '#ff3300'],
            decay: 0.036, gravity: 0.14,
        });
        return true;
    }

    // ── Per-frame update ──────────────────────────────────────────────────────

    /**
     * Advance the fighter by one game tick:
     *   countdown timers → dash movement → gravity → attack tick →
     *   translate position → platform collision → blast-zone check →
     *   animation update.
     * @param {Platform[]} platforms
     */
    update(platforms) {
        // Countdown timers.
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.invulnTime  > 0) this.invulnTime--;
        if (this.hitstunTime > 0) this.hitstunTime--;
        this.animCycle += 0.1;

        const wasGrounded = this.isGrounded;

        // ── Active dash: override all other movement ──────────────────────
        if (this.dashTime > 0) {
            this.dashTime--;
            const t  = this.dashTime / PHYS.DASH_FRAMES;
            this.vx  = this.dashVx * (t * 0.5 + 0.5); // Ease out
            this.vy  = 0;
            this.x  += this.vx;
            this._resolveAnimation();
            this.sprite.update();
            return; // Skip normal physics this frame.
        }

        // ── Gravity ───────────────────────────────────────────────────────
        if (!this.isGrounded) {
            const gMult   = this.fastFalling ? PHYS.FAST_FALL_MULT : 1.0;
            const maxFall = this.fastFalling ? PHYS.MAX_FAST_FALL  : PHYS.MAX_FALL_SPEED;
            this.vy = Math.min(this.vy + PHYS.GRAVITY * gMult, maxFall);
        }

        // ── Attack timer (slows horizontal movement during swing) ─────────
        if (this.attackState) {
            this.attackTimer--;
            this.vx *= 0.87; // Friction during attacks keeps the fighter planted
            if (this.attackTimer <= 0) this.attackState = null;
        }

        // ── Translate ─────────────────────────────────────────────────────
        this.x += this.vx;
        this.y += this.vy;

        // ── Platform collision ────────────────────────────────────────────
        this.isGrounded       = false;
        this.isOnSoftPlatform = false;

        const hb       = this.getHurtbox();
        const prevFeet = this.y - this.vy; // Feet Y one frame ago

        for (const p of platforms) {
            const hOvlp = (hb.x + hb.width > p.x) && (hb.x < p.x + p.width);
            if (!hOvlp) continue;

            // ── Land on top of platform ───────────────────────────────────
            if (this.vy >= 0 && prevFeet <= p.y && this.y >= p.y) {
                this.y             = p.y;
                this.vy            = 0;
                this.isGrounded    = true;
                this.fastFalling   = false;
                this.jumpsLeft     = this.charData.maxJumps;
                this.vx           *= PHYS.GROUND_FRICTION;
                if (p.soft) this.isOnSoftPlatform = true;
                break;
            }

            // ── Bump head on underside of solid platform ──────────────────
            if (!p.soft) {
                const prevHeadY = prevFeet - this.height;
                const headY     = this.y   - this.height;
                const platBot   = p.y + p.height;
                if (this.vy < 0 && prevHeadY >= platBot && headY <= platBot) {
                    this.y  = platBot + this.height;
                    this.vy = 0;
                }
            }
        }

        // ── Coyote-time: grant a brief jump window after leaving a ledge ──
        if (wasGrounded && !this.isGrounded && this.vy >= 0) {
            this.coyoteFrames = PHYS.COYOTE_FRAMES;
        }
        if (this.coyoteFrames > 0) this.coyoteFrames--;

        // ── Blast-zone check ─────────────────────────────────────────────
        // Any of the four blast lines: bottom, left, right, top.
        if (this.y > 840 || this.x < -200 || this.x > 1480 || this.y < -380) {
            audio.playDeath();
            this.stocks--;
            // Clamp the ring's spawn position to something visible.
            const cx = Math.max(50,  Math.min(1230, this.x));
            const cy = Math.max(50,  Math.min(670,  this.y));
            this.game.particles.spawnBlastRing(cx, cy, this.charData.color);
            this.game.triggerScreenShake(22);
            this.game.triggerPostProcess('grayscale', 28);
            if (this.stocks > 0) {
                this.respawn(this.id === 1 ? 450 : 830);
            } else {
                this.stocks = 0; // Dead — stays at 0 for gameover check.
            }
        }

        this._resolveAnimation();
        this.sprite.update();
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    /**
     * Draw the fighter's sprite and overhead HUD elements (damage %, stock pips).
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (this.stocks <= 0) return; // Dead fighters are not drawn.

        ctx.save();

        // Flash semi-transparent during invulnerability frames.
        if (this.invulnTime > 0 && Math.floor(Date.now() / 55) % 2 === 0) {
            ctx.globalAlpha = 0.32;
        }

        let sx = this.x, sy = this.y;

        // Jitter position during hitstun for a "hurt" shake effect.
        if (this.hitstunTime > 0) {
            sx += (Math.random() - 0.5) * 5;
            sy += (Math.random() - 0.5) * 5;
        }

        // Ghost afterimage trailing slightly behind during a dash.
        if (this.dashTime > 0) {
            const ga = ctx.globalAlpha;
            ctx.globalAlpha = ga * 0.22;
            this.sprite.draw(ctx, sx - this.facing * 18, sy,
                this.charData.spriteScale, this.facing === -1);
            ctx.globalAlpha = ga;
        }

        this.sprite.draw(ctx, sx, sy, this.charData.spriteScale, this.facing === -1);
        ctx.restore();

        // ── Overhead HUD ──────────────────────────────────────────────────
        const sprH = this.sprite.getHeight(this.charData.spriteScale);

        ctx.save();
        // Position label just above the sprite's topmost pixel.
        ctx.translate(this.x, (this.y + 28) - sprH - 8);
        ctx.textAlign = 'center';
        ctx.font      = '900 12px monospace';

        // Colour shifts from white → yellow → red as damage accumulates.
        const pctColor = this.damagePercent < 50  ? '#ffffff'
                       : this.damagePercent < 100 ? '#ffdd00'
                       : '#ff3300';
        ctx.fillStyle = pctColor;
        ctx.fillText(`${Math.floor(this.damagePercent)}%`, 0, 0);

        // Small stock pips drawn as cyan rectangles.
        const gw  = 6, tot = this.stocks * (gw + 3) - 3;
        ctx.fillStyle = '#00ffcc';
        for (let s = 0; s < this.stocks; s++) {
            ctx.fillRect(-tot / 2 + s * (gw + 3), 4, gw, 2);
        }
        ctx.restore();
    }
}


// ════════════════════════════════════════════════════════════════════════════
// 6 · CAMERA
// ════════════════════════════════════════════════════════════════════════════
/**
 * Smooth mid-point camera that tracks both fighters and zooms out as they
 * spread apart.
 *
 * Implemented as a simple lerp on position and scale each frame, giving an
 * elastic "rubber-band" feel without any complex PID controller.
 */
class Camera {
    /**
     * @param {number} W Canvas width  (px).
     * @param {number} H Canvas height (px).
     */
    constructor(W, H) {
        this.W = W; this.H = H;
        this.x     = W / 2; this.y = H / 2; // World-space look-at point
        this.scale       = 1;
        this.targetScale = 1;
        this.posSpeed  = 0.065; // Lerp speed for position (0-1 per frame)
        this.zoomSpeed = 0.045; // Lerp speed for zoom    (0-1 per frame)
    }

    /**
     * Recompute target position and scale from the two fighters' positions.
     * @param {Fighter} p1
     * @param {Fighter} p2
     */
    update(p1, p2) {
        if (!p1 || !p2 || p1.stocks <= 0 || p2.stocks <= 0) return;

        // Look at the midpoint between the two fighters, slightly above.
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - 55;
        this.x += (midX - this.x) * this.posSpeed;
        this.y += (midY - this.y) * this.posSpeed;

        // Zoom out proportionally to the distance between fighters.
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const t    = Math.min(1, Math.max(0, (dist - 200) / 500));
        this.targetScale = 1.3 + t * (0.65 - 1.3); // Clamp between 0.65x and 1.3x
        this.scale      += (this.targetScale - this.scale) * this.zoomSpeed;
    }

    /**
     * Apply the camera transform to ctx.
     * Call restore() after drawing world objects.
     * @param {CanvasRenderingContext2D} ctx
     */
    apply(ctx) {
        ctx.save();
        ctx.translate(this.W / 2, this.H / 2);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-this.x, -this.y);
    }

    /** @param {CanvasRenderingContext2D} ctx */
    restore(ctx) { ctx.restore(); }

    /**
     * World X offset of the camera — used to drive parallax layers at
     * different depths.
     * @returns {number}
     */
    get worldOffsetX() { return this.x - this.W / 2; }
}


// ════════════════════════════════════════════════════════════════════════════
// 7 · POST-PROCESSOR
// ════════════════════════════════════════════════════════════════════════════
/**
 * Applies a single full-screen pixel-manipulation effect for a fixed
 * number of frames, then auto-clears.
 *
 * Supported effects:
 *   'invert'    — Invert all RGB channels (triggered on heavy-hit).
 *   'grayscale' — Desaturate the whole screen, fading back to colour
 *                 over the duration (triggered on stock loss).
 */
class PostProcessor {
    constructor() {
        this.effect      = null;
        this.duration    = 0;
        this.maxDuration = 0;
    }

    /**
     * @param {'invert'|'grayscale'} effect
     * @param {number} duration Frames to apply the effect.
     */
    trigger(effect, duration) {
        this.effect      = effect;
        this.duration    = duration;
        this.maxDuration = duration;
    }

    /**
     * Read back pixel data, modify it, and write it back.
     * Must be called AFTER all other drawing so it composites over everything.
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    apply(ctx, canvas) {
        if (!this.effect || this.duration <= 0) return;
        this.duration--;

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data      = imageData.data;
            const progress  = this.duration / this.maxDuration; // 1 → 0 over lifetime

            if (this.effect === 'invert') {
                for (let i = 0; i < data.length; i += 4) {
                    data[i]   = 255 - data[i];
                    data[i+1] = 255 - data[i+1];
                    data[i+2] = 255 - data[i+2];
                }
            } else if (this.effect === 'grayscale') {
                for (let i = 0; i < data.length; i += 4) {
                    const r    = data[i], g = data[i+1], b = data[i+2];
                    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                    // Lerp between full grayscale and original colour.
                    data[i]   = luma + (r - luma) * (1 - progress);
                    data[i+1] = luma + (g - luma) * (1 - progress);
                    data[i+2] = luma + (b - luma) * (1 - progress);
                }
            }
            ctx.putImageData(imageData, 0, 0);
        } catch (_) { /* Cross-origin canvas guard */ }

        if (this.duration <= 0) this.effect = null;
    }
}


// ════════════════════════════════════════════════════════════════════════════
// 8 · ENGINE — State Machine & Main Loop
// ════════════════════════════════════════════════════════════════════════════
/**
 * Top-level game controller.  Owns the state machine, the RAF loop,
 * all subsystems, and all UI rendering for menus / HUD.
 *
 * States:
 *   HOME        → drawHomeScreen
 *   SETTINGS    → drawSettingsScreen
 *   MODE_SELECT → drawModeSelectScreen
 *   HERO_SELECT → drawHeroSelectScreen   ← static portrait fix lives here
 *   MAP_SELECT  → drawMapSelectScreen
 *   PLAYING     → drawPlayingScreen
 *   PAUSED      → drawPlayingScreen + drawPausedScreen
 *   GAMEOVER    → drawGameOverScreen
 */
class Engine {
    constructor() {
        // ── Canvas ────────────────────────────────────────────────────────
        this.canvas = document.getElementById('game-canvas');
        this.ctx    = this.canvas.getContext('2d');

        // ── State ─────────────────────────────────────────────────────────
        this.state = 'HOME';

        // ── Input ─────────────────────────────────────────────────────────
        this.keys  = {};
        this.mouse = { x: 0, y: 0, clicked: false };

        // ── Match settings ────────────────────────────────────────────────
        this.playersCount     = 1;
        this.p1CharIndex      = 0;
        this.p2CharIndex      = 1;
        this.selectedMapIndex = 0;

        // ── Live match objects ────────────────────────────────────────────
        this.p1  = null;
        this.p2  = null;
        this.map = null;

        // ── Subsystems ────────────────────────────────────────────────────
        this.particles     = new ParticleSystem();
        this.camera        = new Camera(this.canvas.width, this.canvas.height);
        this.postProcessor = new PostProcessor();

        // ── Match clock ───────────────────────────────────────────────────
        this.matchDuration = 180; // seconds
        this.matchTicks    = 0;   // game frames elapsed

        // ── Screen shake ──────────────────────────────────────────────────
        this.screenShakeTime      = 0;
        this.screenShakeIntensity = 0;

        // ── Winner tracking ───────────────────────────────────────────────
        this.winner = null;

        // ── Menu background clouds ────────────────────────────────────────
        this.bgClouds = Array.from({ length: 20 }, () => ({
            x:     Math.random() * 1400,
            y:     Math.random() * 720,
            size:  30 + Math.random() * 150,
            speed: 0.1 + Math.random() * 0.5,
            color: `rgba(40,45,65,${0.1 + Math.random() * 0.25})`,
        }));

        // ── Hero-select state ─────────────────────────────────────────────
        this.activeSelectingPlayer = 1;

        // ── LOAD MENU PORTRAITS DIRECTLY ──
        this.menuImages = CHARACTERS.map(c => {
            const img = new Image();
            // Load the new dedicated portrait image
            img.src = `Assets/${c.folder}/Portrait.png`; 
            return img;
        });

        // ── Startup ───────────────────────────────────────────────────────
        this.bindEvents();
        this.hideLoader();
        requestAnimationFrame(() => this.animate());
    }

    // ── Utility ──────────────────────────────────────────────────────────────

    /** Fade out and remove the loading overlay. */
    hideLoader() {
        const l = document.getElementById('canvas-loader');
        if (l) {
            l.style.opacity = '0';
            setTimeout(() => l.remove(), 600);
        }
    }

    /**
     * Shake the canvas for `i * 2` frames with decreasing intensity.
     * @param {number} i Shake intensity (pixels).
     */
    triggerScreenShake(i) {
        this.screenShakeIntensity = i;
        this.screenShakeTime      = Math.min(22, i * 2);
    }

    /**
     * @param {'invert'|'grayscale'} effect
     * @param {number} dur Frames.
     */
    triggerPostProcess(effect, dur) {
        this.postProcessor.trigger(effect, dur);
    }

    // ── Event binding ─────────────────────────────────────────────────────────

    /** Attach all keyboard, mouse, and UI-button event listeners. */
    bindEvents() {
        window.addEventListener('keydown', e => {
            this.keys[e.key]  = true;
            this.keys[e.code] = true;
            if (e.key === 'Escape') {
                if      (this.state === 'PLAYING') { this.state = 'PAUSED';  audio.playBlip(); }
                else if (this.state === 'PAUSED')  { this.state = 'PLAYING'; audio.playBlip(); }
                else if (this.state !== 'HOME')    { this.state = 'HOME';    audio.playSelect(); }
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key]  = false;
            this.keys[e.code] = false;
        });
        this.canvas.addEventListener('mousemove', e => {
            const r = this.canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - r.left) * (this.canvas.width  / r.width);
            this.mouse.y = (e.clientY - r.top)  * (this.canvas.height / r.height);
        });
        this.canvas.addEventListener('mousedown', () => { this.mouse.clicked = true; });

        // Audio toggle button
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) soundBtn.addEventListener('click', e => {
            const s = audio.toggle();
            e.currentTarget.innerHTML = s ? '🔊 Audio: ON' : '🔇 Audio: OFF';
            e.currentTarget.classList.toggle('text-emerald-400', s);
            e.currentTarget.classList.toggle('text-red-400', !s);
        });

        // Controls modal
        const modal    = document.getElementById('controls-modal');
        const helpBtn  = document.getElementById('btn-help');
        const closeBtn = document.getElementById('btn-close-help');
        const gotitBtn = document.getElementById('btn-modal-gotit');
        if (modal && helpBtn)  helpBtn.addEventListener('click',  () => modal.classList.remove('hidden'));
        if (modal && closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        if (modal && gotitBtn) gotitBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    /**
     * Hit-test (x,y,w,h) against the current mouse position.
     * If the mouse is inside and a click occurred this frame, fire onClick()
     * (consuming the click so nothing below also fires).
     *
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {function():void} onClick
     * @returns {boolean} True while the cursor is hovering.
     */
    registerZone(x, y, w, h, onClick) {
        const hov = this.mouse.x >= x && this.mouse.x <= x + w &&
                    this.mouse.y >= y && this.mouse.y <= y + h;
        if (hov && this.mouse.clicked) {
            audio.playSelect();
            onClick();
            this.mouse.clicked = false;
        }
        return hov;
    }

    // ── Match lifecycle ───────────────────────────────────────────────────────

    /** Instantiate fighters and begin a match on the selected map. */
    startNewMatch() {
        this.map = MAPS[this.selectedMapIndex];

        const p1c = {
            left: 'a', right: 'd', jump: 'w', down: 's',
            attackLight: 'f', attackHeavy: 'g', dash: 'ShiftLeft',
        };
        const p2c = {
            left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown',
            attackLight: 'k', attackHeavy: 'l', dash: 'ControlRight',
        };

        this.p1 = new Fighter(this, 1, CHARACTERS[this.p1CharIndex], 450, 200, true,                     p1c);
        this.p2 = new Fighter(this, 2, CHARACTERS[this.p2CharIndex], 830, 200, this.playersCount === 2, p2c);

        this.camera.x     = 640; this.camera.y     = 360;
        this.camera.scale = 1;   this.camera.targetScale = 1;

        this.matchTicks = 0;
        this.winner     = null;

        this.particles.particles     = [];
        this.particles.glowParticles = [];

        this.updateHtmlHud(true);
        audio.playStartGame();
        this.state = 'PLAYING';
    }

    // ── HTML HUD sync ─────────────────────────────────────────────────────────

    /** Show or hide the HTML HUD overlay and populate static labels. */
    updateHtmlHud(show) {
        const hud = document.getElementById('html-hud');
        if (!hud) return;
        if (!show) { hud.classList.add('hidden'); hud.classList.remove('flex'); return; }
        hud.classList.remove('hidden'); hud.classList.add('flex');

        const c1 = CHARACTERS[this.p1CharIndex], c2 = CHARACTERS[this.p2CharIndex];
        const av1 = document.getElementById('hud-p1-avatar');
        const av2 = document.getElementById('hud-p2-avatar');
        if (av1) {
            av1.innerText = '';
            av1.style.backgroundImage = `url('Assets/${c1.folder}/Portrait.png')`;
            av1.style.backgroundSize = 'cover';
            av1.style.backgroundPosition = 'center top';
            av1.style.backgroundColor = c1.color;
        }
        if (av2) {
            av2.innerText = '';
            av2.style.backgroundImage = `url('Assets/${c2.folder}/Portrait.png')`;
            av2.style.backgroundSize = 'cover';
            av2.style.backgroundPosition = 'center top';
            av2.style.backgroundColor = c2.color;
        }
        const n1 = document.getElementById('hud-p1-name');
        const n2 = document.getElementById('hud-p2-name');
        if (n1) n1.innerText = `P1 (${c1.name.toUpperCase()})`;
        if (n2) n2.innerText = `${this.playersCount === 2 ? 'P2' : 'CPU'} (${c2.name.toUpperCase()})`;
    }

    /** Push live match values to the HUD DOM every frame during PLAYING. */
    syncLiveHudValues() {
        if (!this.p1 || !this.p2) return;
        const p1pct = document.getElementById('hud-p1-pct');
        const p2pct = document.getElementById('hud-p2-pct');
        const p1stk = document.getElementById('hud-p1-stocks');
        const p2stk = document.getElementById('hud-p2-stocks');
        const timer = document.getElementById('hud-timer');

        if (p1pct) p1pct.innerText = `${Math.floor(this.p1.damagePercent)}%`;
        if (p2pct) p2pct.innerText = `${Math.floor(this.p2.damagePercent)}%`;
        if (p1stk) p1stk.innerText = this.p1.stocks;
        if (p2stk) p2stk.innerText = this.p2.stocks;

        const colorFn = p => p > 100 ? '#ff3300' : p > 50 ? '#ffdd00' : '#ffffff';
        if (p1pct) p1pct.style.color = colorFn(this.p1.damagePercent);
        if (p2pct) p2pct.style.color = colorFn(this.p2.damagePercent);

        const tl = Math.max(0, this.matchDuration - Math.floor(this.matchTicks / 60));
        if (timer)
            timer.innerText = `${Math.floor(tl / 60)}:${(tl % 60 < 10 ? '0' : '') + tl % 60}`;
    }

    // ── Drawing helpers ───────────────────────────────────────────────────────

    /** Render the parallax background for the current screen. */
    drawParallaxBackground() {
        const W = this.canvas.width, H = this.canvas.height;
        const gc = (this.state === 'PLAYING' && this.map)
            ? this.map.bgGradient
            : ['#0f172a','#1e293b','#334155'];

        const bg = this.ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, gc[0]); bg.addColorStop(0.5, gc[1]); bg.addColorStop(1, gc[2]);
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(0, 0, W, H);

        if (this.state === 'PLAYING' && this.map?.parallaxLayers) {
            const offX = this.camera.worldOffsetX;
            this.map.parallaxLayers.forEach(l => l.draw(this.ctx, offX * l.depth, W, H));
        } else {
            // Drifting cloud blobs on menu screens.
            for (const c of this.bgClouds) {
                c.x -= c.speed;
                if (c.x < -200) c.x = W + 100;
                this.ctx.fillStyle = c.color;
                this.ctx.beginPath(); this.ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            // Faint grid overlay.
            this.ctx.strokeStyle = 'rgba(255,255,255,0.03)'; this.ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 80) {
                this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, H); this.ctx.stroke();
            }
            for (let y = 0; y < H; y += 80) {
                this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(W, y); this.ctx.stroke();
            }
        }
    }

    /**
     * Draw a styled button rectangle with hover state.
     * @param {number} x @param {number} y @param {number} w @param {number} h
     * @param {string} text   Label shown inside the button.
     * @param {boolean} hov   Is the mouse hovering?
     * @param {string} col    Accent colour for the hover gradient.
     */
    drawButton(x, y, w, h, text, hov, col = '#10b981') {
        this.ctx.save();
        if (hov) {
            this.ctx.shadowColor = col;
            this.ctx.shadowBlur  = 14;
            this.ctx.translate(0, -2);
        }
        const g = this.ctx.createLinearGradient(x, y, x, y + h);
        hov ? (g.addColorStop(0, col), g.addColorStop(1, '#059669'))
            : (g.addColorStop(0, '#1e293b'), g.addColorStop(1, '#0f172a'));
        this.ctx.fillStyle   = g;
        this.ctx.beginPath(); this.ctx.roundRect(x, y, w, h, 12); this.ctx.fill();
        this.ctx.lineWidth   = 2;
        this.ctx.strokeStyle = hov ? '#ffffff' : col;
        this.ctx.stroke();
        this.ctx.fillStyle    = hov ? '#000000' : '#ffffff';
        this.ctx.font         = '900 22px monospace';
        this.ctx.textAlign    = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + w / 2, y + h / 2);
        this.ctx.restore();
    }

    // ── Screen renderers ──────────────────────────────────────────────────────

    drawHomeScreen() {
        if (Math.random() < 0.09)
            this.particles.spawn(Math.random() * this.canvas.width, 0, 1, {
                minSpeed: 0.5, maxSpeed: 2, minSize: 2, maxSize: 5,
                color: ['#64ffda','#e94560','#ffd166'], decay: 0.005, gravity: 0.02,
            });
        this.particles.update();
        this.particles.draw(this.ctx);

        this.ctx.save();
        this.ctx.textAlign    = 'center';
        this.ctx.shadowColor  = '#e94560';
        this.ctx.shadowBlur   = 28;
        this.ctx.font         = '900 96px sans-serif';
        this.ctx.fillStyle    = '#ffffff';
        this.ctx.fillText('AETHER BRAWL', this.canvas.width / 2, 265);
        this.ctx.shadowBlur   = 0;
        this.ctx.font         = '700 18px monospace';
        this.ctx.fillStyle    = '#64ffda';
        this.ctx.fillText('SUPER PREMIUM CANVAS PLATFORM FIGHTER', this.canvas.width / 2, 318);
        this.ctx.font         = '11px monospace';
        this.ctx.fillStyle    = 'rgba(100,255,218,0.5)';
        this.ctx.fillText(
            '⚡ Dynamic Camera Zoom  ✦ Pixel Shader FX  ✦ Additive Blending  ✦ Parallax Depth',
            this.canvas.width / 2, 345
        );
        this.ctx.restore();

        const s  = this.registerZone(500, 410, 280, 65, () => { this.state = 'MODE_SELECT'; });
        this.drawButton(500, 410, 280, 65, '🚀 START GAME', s, '#e94560');
        const st = this.registerZone(500, 500, 280, 65, () => { this.state = 'SETTINGS'; });
        this.drawButton(500, 500, 280, 65, '⚙️ SETTINGS', st, '#3a86ff');

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font      = '13px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '💡 Higher damage % = more knockback. Camera zooms to keep both fighters in view!',
            this.canvas.width / 2, 640
        );
    }

    drawSettingsScreen() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#64ffda'; this.ctx.font = '900 48px sans-serif';
        this.ctx.fillText('ENGINE CONFIGURATIONS', this.canvas.width / 2, 150);
        this.ctx.restore();

        this.ctx.fillStyle = '#ffffff'; this.ctx.font = '20px monospace'; this.ctx.textAlign = 'left';
        this.ctx.fillText(`Match Duration: ${this.matchDuration / 60} Minutes`, 400, 280);
        const dh = this.registerZone(800, 250, 150, 45, () => {
            this.matchDuration = this.matchDuration === 180 ? 300 : this.matchDuration === 300 ? 60 : 180;
        });
        this.drawButton(800, 250, 150, 45, 'TOGGLE', dh, '#06d6a0');

        this.ctx.fillText('Sound Test:', 400, 380);
        const sh = this.registerZone(800, 350, 150, 45, () => {
            audio.playHitHeavy(); this.triggerScreenShake(8);
        });
        this.drawButton(800, 350, 150, 45, 'TEST HIT', sh, '#ffd166');

        const bh = this.registerZone(500, 550, 280, 60, () => { this.state = 'HOME'; });
        this.drawButton(500, 550, 280, 60, '← RETURN HOME', bh, '#e94560');
    }

    drawModeSelectScreen() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff'; this.ctx.font = '900 48px sans-serif';
        this.ctx.fillText('SELECT BRAWL MODE', this.canvas.width / 2, 160);
        this.ctx.restore();

        const p1h = this.registerZone(250, 260, 350, 250, () => {
            this.playersCount = 1; this.state = 'HERO_SELECT';
        });
        this._modeCard(250, 260, 350, 250, '🤖 1 PLAYER', 'Battle a reactive CPU opponent.', p1h, '#3a86ff');

        const p2h = this.registerZone(680, 260, 350, 250, () => {
            this.playersCount = 2; this.state = 'HERO_SELECT';
        });
        this._modeCard(680, 260, 350, 250, '👥 2 PLAYER', 'Local dual-keyboard duel.', p2h, '#e94560');

        const bh = this.registerZone(500, 580, 280, 50, () => { this.state = 'HOME'; });
        this.drawButton(500, 580, 280, 50, '← BACK', bh, '#94a3b8');
    }

    _modeCard(x, y, w, h, title, desc, hov, accent) {
        this.ctx.save();
        this.ctx.fillStyle   = hov ? '#1e293b' : '#0f172a';
        this.ctx.strokeStyle = hov ? accent    : '#334155';
        this.ctx.lineWidth   = 3;
        if (hov) {
            this.ctx.shadowColor = accent;
            this.ctx.shadowBlur  = 18;
            this.ctx.translate(0, -4);
        }
        this.ctx.beginPath(); this.ctx.roundRect(x, y, w, h, 16);
        this.ctx.fill(); this.ctx.stroke();
        this.ctx.fillStyle  = accent;
        this.ctx.font       = '900 28px sans-serif';
        this.ctx.textAlign  = 'center';
        this.ctx.fillText(title, x + w / 2, y + 60);
        this.ctx.fillStyle  = '#cbd5e1';
        this.ctx.font       = '15px monospace';
        this._wrap(desc, x + w / 2, y + 130, w - 40, 24);
        if (hov) {
            this.ctx.fillStyle = accent;
            this.ctx.font      = 'bold 16px monospace';
            this.ctx.fillText('CLICK TO DEPLOY >>', x + w / 2, y + h - 30);
        }
        this.ctx.restore();
    }

    /** Word-wrap text into lines of maximum width maxW, with line-height lh. */
    _wrap(text, x, y, maxW, lh) {
        const words = text.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (this.ctx.measureText(testLine).width > maxW && n > 0) {
                this.ctx.fillText(line.trim(), x, y);
                line = words[n] + ' ';
                y   += lh;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line.trim(), x, y);
    }

    /**
     * Hero selection screen.
     *
     * Each card shows:
     *   • A static single-frame portrait (from menuImages).
     *   • Character name, title, stat bars, and description.
     *
     * The two-phase flow (P1 picks, then P2/CPU picks) is driven by
     * this.activeSelectingPlayer.
     */
    drawHeroSelectScreen() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff'; this.ctx.font = '900 40px sans-serif';
        this.ctx.fillText(this.activeSelectingPlayer === 1 ? 'PLAYER 1 SELECT HERO' : 'PLAYER 2 SELECT HERO', this.canvas.width / 2, 80);

        const cw = 235, ch = 440, gap = 28, total = CHARACTERS.length;
        const sx = (this.canvas.width - (total * cw + (total - 1) * gap)) / 2;

        for (let i = 0; i < total; i++) {
            const c = CHARACTERS[i], cx = sx + i * (cw + gap), cy = 110;
            const hov = this.registerZone(cx, cy, cw, ch, () => {
                if (this.activeSelectingPlayer === 1) { this.p1CharIndex = i; this.activeSelectingPlayer = 2; }
                else { this.p2CharIndex = i; this.activeSelectingPlayer = 1; this.state = 'MAP_SELECT'; }
            });

            this.ctx.save();
            this.ctx.fillStyle = hov ? '#1e293b' : '#0f172a';
            this.ctx.strokeStyle = hov ? '#64ffda' : '#334155';
            this.ctx.lineWidth = hov ? 4 : 2;
            this.ctx.beginPath(); this.ctx.roundRect(cx, cy, cw, ch, 16); this.ctx.fill(); this.ctx.stroke();

            // ── DRAW DEDICATED PORTRAIT ───────────────────────────────────
            const portraitX = cx + 10;
            const portraitY = cy + 10;
            const portraitW = cw - 20;
            const portraitH = 150;

            const img = this.menuImages[i];
            
            if (img && img.complete && img.naturalWidth > 0) {
                this.ctx.save();
                // Clip to keep portrait inside the rounded box
                this.ctx.beginPath();
                this.ctx.roundRect(portraitX, portraitY, portraitW, portraitH, 10);
                this.ctx.clip();

                // Fill a dark background behind the portrait
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fillRect(portraitX, portraitY, portraitW, portraitH);

                // Scale portrait to fit the box height proportionally
                const imgAspect = img.naturalWidth / img.naturalHeight;
                const dh = portraitH;
                const dw = dh * imgAspect;
                
                // Center horizontally and align to top
                const dx = portraitX + (portraitW - dw) / 2;
                const dy = portraitY;

                // Disable image smoothing for crisp pixel art
                this.ctx.imageSmoothingEnabled = false;
                // Draw the ENTIRE portrait image — it's a single static PNG
                this.ctx.drawImage(img, dx, dy, dw, dh);
                
                this.ctx.restore();
            } else {
                // Placeholder while image loads
                this.ctx.fillStyle = c.color;
                this.ctx.beginPath();
                this.ctx.roundRect(portraitX, portraitY, portraitW, portraitH, 10);
                this.ctx.fill();
                this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                this.ctx.font = '900 55px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(c.name[0], cx + cw / 2, cy + 100);
            }

            // TEXT & STATS
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#ffffff'; this.ctx.font = '900 16px sans-serif';
            this.ctx.fillText(c.name.toUpperCase(), cx + cw / 2, cy + 175);
            this.ctx.fillStyle = c.accent; this.ctx.font = '9px monospace';
            this.ctx.fillText(c.title, cx + cw / 2, cy + 190);
            
            this._stat(cx+18, cy + 215, cw-36, 'SPD', c.stats.speed);
            this._stat(cx+18, cy + 237, cw-36, 'ATK', c.stats.damage);
            this._stat(cx+18, cy + 259, cw-36, 'DEF', c.stats.defense);

            this.ctx.fillStyle = '#94a3b8'; this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this._wrap(c.desc, cx + cw / 2, cy + 300, cw - 28, 14);

            if (hov) {
                this.ctx.fillStyle = '#64ffda';
                this.ctx.font      = 'bold 12px monospace';
                this.ctx.fillText('✦ SELECT ✦', cx + cw / 2, cy + ch - 18);
            }
            this.ctx.restore();
        }

        // Current selection labels at the bottom.
        this.ctx.fillStyle = '#e94560'; this.ctx.font = 'bold 15px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`✦ P1: ${CHARACTERS[this.p1CharIndex].name}`, this.canvas.width / 2 - 45, 595);
        
        // Draw P1 small portrait
        const p1Img = this.menuImages[this.p1CharIndex];
        if (p1Img && p1Img.complete && p1Img.naturalWidth > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.roundRect(this.canvas.width / 2 - 35, 573, 30, 30, 6);
            this.ctx.clip();
            this.ctx.drawImage(p1Img, this.canvas.width / 2 - 35, 573, 30, 30);
            this.ctx.restore();
        }

        // Draw P2/CPU small portrait
        const p2Img = CHARACTERS[this.p2CharIndex] ? this.menuImages[this.p2CharIndex] : null;
        if (p2Img && p2Img.complete && p2Img.naturalWidth > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.roundRect(this.canvas.width / 2 + 5, 573, 30, 30, 6);
            this.ctx.clip();
            this.ctx.drawImage(p2Img, this.canvas.width / 2 + 5, 573, 30, 30);
            this.ctx.restore();
        }

        this.ctx.fillStyle = '#3a86ff'; this.ctx.textAlign = 'left';
        this.ctx.fillText(
            `✦ ${this.playersCount === 2 ? 'P2' : 'CPU'}: ${CHARACTERS[this.p2CharIndex]?.name ?? 'Pending'}`,
            this.canvas.width / 2 + 45, 595
        );

        const bh = this.registerZone(500, 635, 280, 40, () => {
            this.activeSelectingPlayer = 1; this.state = 'MODE_SELECT';
        });
        this.drawButton(500, 635, 280, 40, '← RESTART PICK', bh, '#94a3b8');
        this.ctx.restore();
    }

    /**
     * Draw a labelled stat bar row inside a character card.
     * @param {number} x Left edge of the row.
     * @param {number} y Vertical baseline.
     * @param {number} w Total row width.
     * @param {string} label 3-character label (e.g. 'SPD').
     * @param {number} val  Value 0-10.
     */
    _stat(x, y, w, label, val) {
        this.ctx.fillStyle = '#cbd5e1'; this.ctx.font = '10px monospace'; this.ctx.textAlign = 'left';
        this.ctx.fillText(label, x, y + 8);
        const bx = x + 38, bw = w - 38;
        this.ctx.fillStyle = '#334155'; this.ctx.fillRect(bx, y + 2, bw, 7);
        this.ctx.fillStyle = val > 7 ? '#06d6a0' : val > 4 ? '#ffd166' : '#ff758f';
        this.ctx.fillRect(bx, y + 2, (val / 10) * bw, 7);
    }

    drawMapSelectScreen() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff'; this.ctx.font = '900 48px sans-serif';
        this.ctx.fillText('SELECT COMBAT ARENA', this.canvas.width / 2, 120);
        this.ctx.restore();

        const tw = 440, th = 300, gap = 80;
        const mapSx = (this.canvas.width - (tw * 2 + gap)) / 2;

        for (let i = 0; i < MAPS.length; i++) {
            const m = MAPS[i], ax = mapSx + i * (tw + gap), ay = 190;
            const hov = this.registerZone(ax, ay, tw, th, () => {
                this.selectedMapIndex = i; this.startNewMatch();
            });

            this.ctx.save();
            this.ctx.fillStyle   = hov ? '#1e293b' : '#0f172a';
            this.ctx.strokeStyle = hov ? '#64ffda' : '#334155';
            this.ctx.lineWidth   = hov ? 4 : 2;
            if (hov) { this.ctx.shadowColor = '#64ffda'; this.ctx.shadowBlur = 28; this.ctx.translate(0, -5); }
            this.ctx.beginPath(); this.ctx.roundRect(ax, ay, tw, th, 16);
            this.ctx.fill(); this.ctx.stroke();

            // Mini-map preview.
            this.ctx.save();
            this.ctx.beginPath(); this.ctx.roundRect(ax + 15, ay + 15, tw - 30, 185, 10); this.ctx.clip();
            const tg = this.ctx.createLinearGradient(ax, ay, ax, ay + 185);
            tg.addColorStop(0, m.bgGradient[0]); tg.addColorStop(1, m.bgGradient[1]);
            this.ctx.fillStyle = tg; this.ctx.fillRect(ax + 15, ay + 15, tw - 30, 185);
            const ms = (tw - 60) / 1000, tc = ax + tw / 2;
            m.platforms.forEach(p => {
                const rx = p.x - 640, ry = p.y - 360;
                const mx = tc + rx * ms, my = ay + 100 + ry * ms * 0.8;
                const mw = p.width * ms, mh = Math.max(6, p.height * ms);
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath(); this.ctx.roundRect(mx, my, mw, mh, 3); this.ctx.fill();
                this.ctx.fillStyle = p.topColor;
                this.ctx.fillRect(mx, my, mw, Math.max(2, mh * 0.3));
            });
            this.ctx.restore();

            this.ctx.fillStyle = '#ffffff'; this.ctx.font = '900 22px sans-serif'; this.ctx.textAlign = 'center';
            this.ctx.fillText(m.name, ax + tw / 2, ay + 235);
            this.ctx.fillStyle = '#94a3b8'; this.ctx.font = '11px monospace';
            this.ctx.fillText(m.subtitle, ax + tw / 2, ay + 256);
            if (hov) {
                this.ctx.fillStyle = '#64ffda'; this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText('✦ CLICK TO START ✦', ax + tw / 2, ay + 280);
            }
            this.ctx.restore();
        }

        const bh = this.registerZone(500, 575, 280, 50, () => { this.state = 'HERO_SELECT'; });
        this.drawButton(500, 575, 280, 50, '← BACK TO HEROES', bh, '#e94560');
    }

    drawPlayingScreen() {
        if (!this.map || !this.p1 || !this.p2) return;
        this.matchTicks++;

        // ── Input / AI ────────────────────────────────────────────────────
        this.p1.handleInput(this.keys);
        if (this.playersCount === 2) this.p2.handleInput(this.keys);
        else                         this.p2.updateCPU(this.p1, this.map.platforms);

        // ── Physics ───────────────────────────────────────────────────────
        this.p1.update(this.map.platforms);
        this.p2.update(this.map.platforms);

        // ── Collision — P1 hits P2 ────────────────────────────────────────
        const h1 = this.p1.getHitbox();
        if (h1 && !this.p1.hasDealtDamageThisAttack && this._aabb(h1, this.p2.getHurtbox())) {
            if (this.p2.applyHit(h1, this.p1)) this.p1.hasDealtDamageThisAttack = true;
        }
        // ── Collision — P2 hits P1 ────────────────────────────────────────
        const h2 = this.p2.getHitbox();
        if (h2 && !this.p2.hasDealtDamageThisAttack && this._aabb(h2, this.p1.getHurtbox())) {
            if (this.p1.applyHit(h2, this.p2)) this.p2.hasDealtDamageThisAttack = true;
        }

        this.camera.update(this.p1, this.p2);
        this.particles.update();

        // ── Render (camera-space) ─────────────────────────────────────────
        this.camera.apply(this.ctx);

        if (this.map.drawDecorations) this.map.drawDecorations(this.ctx);

        for (const p of this.map.platforms) {
            this.ctx.save();
            this.ctx.fillStyle  = p.color;
            this.ctx.shadowColor = p.topColor;
            this.ctx.shadowBlur  = p.soft ? 8 : 0;
            this.ctx.beginPath(); this.ctx.roundRect(p.x, p.y, p.width, p.height, p.soft ? 4 : 8);
            this.ctx.fill();
            this.ctx.shadowBlur  = 0;
            this.ctx.fillStyle   = p.topColor;
            this.ctx.beginPath();
            this.ctx.roundRect(p.x, p.y, p.width, Math.max(4, p.height * 0.2), p.soft ? 4 : [8,8,0,0]);
            this.ctx.fill();
            this.ctx.restore();
        }

        this.particles.draw(this.ctx);
        this.p1.draw(this.ctx);
        this.p2.draw(this.ctx);

        this.camera.restore(this.ctx);

        // ── HUD (screen-space) ────────────────────────────────────────────
        this.syncLiveHudValues();

        this.ctx.save();
        this.ctx.font      = '11px monospace';
        this.ctx.fillStyle = 'rgba(100,255,218,0.55)';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`📷 Zoom: ${this.camera.scale.toFixed(2)}x`, this.canvas.width - 8, 18);
        this.ctx.restore();

        // ── Win / time-up check ───────────────────────────────────────────
        const timeUp = Math.floor(this.matchTicks / 60) >= this.matchDuration;
        if (this.p1.stocks <= 0 || this.p2.stocks <= 0 || timeUp) {
            this.winner = this.p1.stocks > this.p2.stocks ? 1
                        : this.p2.stocks > this.p1.stocks ? 2
                        : this.p1.damagePercent < this.p2.damagePercent ? 1 : 2;
            audio.playDeath();
            this.triggerPostProcess('grayscale', 55);
            this.state = 'GAMEOVER';
            this.updateHtmlHud(false);
        }
    }

    /**
     * Axis-aligned bounding-box overlap test.
     * @returns {boolean}
     */
    _aabb(a, b) {
        return a.x < b.x + b.width  && a.x + a.width  > b.x &&
               a.y < b.y + b.height && a.y + a.height > b.y;
    }

    drawPausedScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.74)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#64ffda'; this.ctx.font = '900 72px sans-serif';
        this.ctx.fillText('MATCH PAUSED', this.canvas.width / 2, 250);
        this.ctx.fillStyle = '#ffffff'; this.ctx.font = '16px monospace';
        this.ctx.fillText('Press ESCAPE to resume.', this.canvas.width / 2, 300);
        this.ctx.restore();

        const rh = this.registerZone(500, 380, 280, 55, () => { this.state = 'PLAYING'; audio.playBlip(); });
        this.drawButton(500, 380, 280, 55, '▶ RESUME', rh, '#06d6a0');
        const qh = this.registerZone(500, 460, 280, 55, () => { this.state = 'HOME'; audio.playSelect(); });
        this.drawButton(500, 460, 280, 55, '⏹ QUIT', qh, '#e94560');
    }

    drawGameOverScreen() {
        this.ctx.fillStyle = 'rgba(10,12,20,0.84)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (Math.random() < 0.18)
            this.particles.spawn(
                Math.random() * this.canvas.width, Math.random() * 300, 14, {
                    minSpeed: 2, maxSpeed: 8, minSize: 3, maxSize: 8,
                    color: ['#ffd166','#06d6a0','#ff007f','#ffffff'],
                    decay: 0.016, gravity: 0.1,
                }
            );
        this.particles.update();
        this.particles.draw(this.ctx);

        const wc = this.winner === 1
            ? CHARACTERS[this.p1CharIndex]
            : CHARACTERS[this.p2CharIndex];
        const wt = this.winner === 1  ? 'PLAYER 1 WINS!'
                 : this.playersCount === 2 ? 'PLAYER 2 WINS!'
                 : 'CPU DEFEATED YOU!';

        this.ctx.save();
        this.ctx.textAlign  = 'center';
        this.ctx.shadowColor = wc.color;
        this.ctx.shadowBlur  = 38;
        this.ctx.fillStyle   = wc.color;
        this.ctx.font        = '900 72px sans-serif';
        this.ctx.fillText(wt, this.canvas.width / 2, 200);
        this.ctx.shadowBlur  = 0;
        this.ctx.fillStyle   = '#ffffff';
        this.ctx.font        = 'bold 30px monospace';
        this.ctx.fillText(`✦ ${wc.name.toUpperCase()} DOMINATED ✦`, this.canvas.width / 2, 255);

        // Match report card.
        this.ctx.fillStyle   = '#1e293b';
        this.ctx.beginPath(); this.ctx.roundRect(400, 300, 480, 175, 16); this.ctx.fill();
        this.ctx.strokeStyle = '#334155'; this.ctx.lineWidth = 2; this.ctx.stroke();
        this.ctx.fillStyle   = '#64ffda'; this.ctx.font = 'bold 17px monospace';
        this.ctx.fillText('MATCH REPORT', this.canvas.width / 2, 332);
        this.ctx.fillStyle   = '#cbd5e1'; this.ctx.font = '15px monospace'; this.ctx.textAlign = 'left';
        const pl1 = `P1 (${CHARACTERS[this.p1CharIndex].name})`;
        const pl2 = `${this.playersCount === 2 ? 'P2' : 'CPU'} (${CHARACTERS[this.p2CharIndex].name})`;
        this.ctx.fillText(`${pl1} Stocks:`, 440, 376);
        this.ctx.fillText(`${pl2} Stocks:`, 440, 410);
        this.ctx.fillText('Duration:',      440, 444);
        this.ctx.textAlign  = 'right';
        this.ctx.fillStyle  = '#ffd166'; this.ctx.font = 'bold 15px monospace';
        this.ctx.fillText(`${this.p1.stocks}`,                   840, 376);
        this.ctx.fillText(`${this.p2.stocks}`,                   840, 410);
        this.ctx.fillText(`${Math.floor(this.matchTicks / 60)}s`, 840, 444);
        this.ctx.restore();

        const rh = this.registerZone(480, 508, 320, 58, () => { this.startNewMatch(); });
        this.drawButton(480, 508, 320, 58, '🔄 REMATCH', rh, '#06d6a0');
        const hh = this.registerZone(480, 586, 320, 48, () => { this.state = 'HOME'; });
        this.drawButton(480, 586, 320, 48, '🏠 MAIN MENU', hh, '#e94560');
    }

    // ── Main loop ─────────────────────────────────────────────────────────────

    /** Called every animation frame by requestAnimationFrame. */
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        // ── Screen shake ──────────────────────────────────────────────────
        if (this.screenShakeTime > 0) {
            this.screenShakeTime--;
            const si = this.screenShakeIntensity;
            this.ctx.translate(
                (Math.random() - 0.5) * si * 2,
                (Math.random() - 0.5) * si * 2
            );
            if (si > 1) this.screenShakeIntensity *= 0.92;
        }

        this.drawParallaxBackground();

        switch (this.state) {
            case 'HOME':        this.drawHomeScreen();                             break;
            case 'SETTINGS':    this.drawSettingsScreen();                         break;
            case 'MODE_SELECT': this.drawModeSelectScreen();                       break;
            case 'HERO_SELECT': this.drawHeroSelectScreen();                       break;
            case 'MAP_SELECT':  this.drawMapSelectScreen();                        break;
            case 'PLAYING':     this.drawPlayingScreen();                          break;
            case 'PAUSED':      this.drawPlayingScreen(); this.drawPausedScreen(); break;
            case 'GAMEOVER':    this.drawGameOverScreen();                         break;
        }

        this.ctx.restore();

        // Post-processing composites over the finished frame.
        this.postProcessor.apply(this.ctx, this.canvas);

        // Consume the click event now that all zones have been hit-tested.
        this.mouse.clicked = false;

        requestAnimationFrame(() => this.animate());
    }
}


// ════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ════════════════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
    new Engine();
    console.log('✦ AETHER BRAWL v2.3 — Static Portrait Edition booted ✦');
});