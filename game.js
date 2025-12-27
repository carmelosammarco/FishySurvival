// Game Constants
const CANVAS_ID = 'gameCanvas';
const SPAWN_RATE = 60; // Frames between spawns (approx 1 sec at 60fps)

// Game State
let canvas, ctx;
let lastTime = 0;
let gameRunning = false;
let score = 0;
let lives = 3;
let frameCount = 0;
let animationId;

// Entities
let player;
let fishes = [];

// Assets
const assets = {
    player: new Image(),
    smallEnemy: new Image(),
    bigEnemy: new Image(),
    ocean: new Image()
};

// Input
const mouse = { x: 0, y: 0 };

window.addEventListener('load', init);

function init() {
    canvas = document.getElementById(CANVAS_ID);
    ctx = canvas.getContext('2d');

    // Load Assets Directly
    assets.player.src = 'assets/player_fish.png';
    assets.smallEnemy.src = 'assets/enemy_small.png';
    assets.bigEnemy.src = 'assets/enemy_big.png';
    assets.ocean.src = 'assets/ocean_bg.png';

    resize();
    window.addEventListener('resize', resize);

    // Input Handling
    canvas.addEventListener('mousemove', handleInput);
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleInput(e.touches[0]);
    }, { passive: false });

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);

    // Initial draw
    draw();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    mouse.x = canvas.width / 2;
    mouse.y = canvas.height / 2;
}

function handleInput(inputEvent) {
    if (!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = inputEvent.clientX - rect.left;
    mouse.y = inputEvent.clientY - rect.top;
}

class Fish {
    constructor(isPlayer = false) {
        this.isPlayer = isPlayer;
        if (isPlayer) {
            this.radius = 20;
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            this.color = '#FFA500'; // Orange
            this.speed = 5;
        } else {
            // Randomly determine if this fish is bigger or smaller than player
            const isBigger = Math.random() > 0.6; // 40% chance of big fish
            const sizeVariance = isBigger ?
                (player.radius + 10 + Math.random() * 40) :
                (Math.max(5, player.radius - 5 - Math.random() * 10));

            this.radius = sizeVariance;
            this.color = this.radius > player.radius ? '#FF4444' : '#44FF44'; // Red if dangerous, Green if food
            this.isDanger = this.radius > player.radius; // Remember initial state for image choice

            // Spawn logic (sides of screen)
            if (Math.random() < 0.5) {
                this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
                this.y = Math.random() * canvas.height;
            } else {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
            }

            // Velocity
            const angle = Math.atan2(Math.random() * canvas.height - this.y, Math.random() * canvas.width - this.x);
            const speed = 2 + Math.random() * 3;
            this.dx = Math.cos(angle) * speed;
            this.dy = Math.sin(angle) * speed;

            // Orientation for sprite flipping
            this.facingLeft = this.dx < 0;
        }
    }

    update() {
        if (this.isPlayer) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            this.x += dx * 0.1;
            this.y += dy * 0.1;
            this.facingLeft = dx < 0;
        } else {
            this.x += this.dx;
            this.y += this.dy;
        }
    }

    draw() {
        // Determine which image to use
        let img = null;
        if (this.isPlayer) {
            img = assets.player;
        } else {
            // Re-evaluate danger in case player grew
            this.isDanger = this.radius > player.radius;

            // Only use smallEnemy img if !isDanger, bigEnemy for danger
            if (this.isDanger) {
                img = assets.bigEnemy;
            } else {
                img = assets.smallEnemy;
            }
        }

        // Check if image is valid to draw (Standard Image object)
        const isValid = img && img.complete && img.naturalWidth > 0;

        if (isValid) {
            ctx.save();
            ctx.translate(this.x, this.y);

            let scaleX = 1;
            if (this.isPlayer) {
                if (this.facingLeft) scaleX = -1;
            } else {
                if (!this.facingLeft) scaleX = -1;
            }

            ctx.scale(scaleX, 1);
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.restore();

        } else {
            // Fallback to shapes
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();

            // Eye if player
            if (this.isPlayer) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(this.x + (mouse.x > this.x ? 5 : -5), this.y - 5, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    fishes = [];
    player = new Fish(true);

    // Center player
    mouse.x = canvas.width / 2;
    mouse.y = canvas.height / 2;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    updateHUD();
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('final-score').textContent = score;
    cancelAnimationFrame(animationId);
}

function updateHUD() {
    document.getElementById('score-display').textContent = score;
    document.getElementById('lives-display').textContent = lives;
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    // const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    player.update();

    // Spawn
    frameCount++;
    if (frameCount % SPAWN_RATE === 0) {
        fishes.push(new Fish());
    }

    // Update & Collision
    for (let i = fishes.length - 1; i >= 0; i--) {
        const fish = fishes[i];
        fish.update();

        // Remove if out of bounds
        if (fish.x < -100 || fish.x > canvas.width + 100 ||
            fish.y < -100 || fish.y > canvas.height + 100) {
            fishes.splice(i, 1);
            continue;
        }

        // Collision
        const dx = fish.x - player.x;
        const dy = fish.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + fish.radius * 0.8) {
            if (player.radius >= fish.radius) {
                // Eat
                score += 10;
                player.radius += 1;
                fishes.splice(i, 1);
                updateHUD();
            } else {
                // Die
                lives--;
                updateHUD();
                fishes.splice(i, 1);

                if (lives <= 0) {
                    gameOver();
                }
            }
        }

        // Recalculate color/danger
        if (!fish.isPlayer) {
            const danger = fish.radius > player.radius;
            fish.color = danger ? '#FF4444' : '#44FF44';
            fish.isDanger = danger;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (assets.ocean.complete && assets.ocean.naturalWidth > 0) {
        ctx.drawImage(assets.ocean, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#006994';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Entities
    fishes.forEach(fish => fish.draw());
    player.draw();
}
