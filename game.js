// Game Constants
const CANVAS_ID = 'gameCanvas';
const BASE_SPAWN_RATE = 60; 


// Game State
let canvas, ctx;
let lastTime = 0;
let gameRunning = false;
let isPaused = false;
let score = 0;
let lives = 3;
let frameCount = 0;
let animationId;
let playerName = "Player";
let currentLevel = 1;
let fishEatenThisLevel = 0;
let fishRequiredForLevel = 10;
let particleSystem = [];



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

// Leaderboard
let leaderboard = [];
const LEADERBOARD_KEY = 'fishySurvivalLeaderboard';

window.addEventListener('load', init);

function init() {
    canvas = document.getElementById(CANVAS_ID);
    ctx = canvas.getContext('2d');

    // Load Assets Directly
    assets.player.src = 'assets/player_fish.png';
    assets.smallEnemy.src = 'assets/enemy_small.png';
    assets.bigEnemy.src = 'assets/enemy_big.png';
    // assets.ocean.src = 'assets/ocean_bg.png'; // Handled in draw

    // Preload ocean but draw handles validity
    assets.ocean.src = 'assets/ocean_bg.png';

    loadLeaderboard();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);

    // Input Handling
    canvas.addEventListener('mousemove', handleInput);
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleInput(e.touches[0]);
    }, { passive: false });

    // UI Buttons
    document.getElementById('play-btn').addEventListener('click', validateAndStart);
    document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('back-btn').addEventListener('click', showStartScreen);
    
    // Game Over Buttons
    document.getElementById('restart-btn').addEventListener('click', showStartScreen);
    document.getElementById('go-leaderboard-btn').addEventListener('click', showLeaderboard);
    
    // In-game UI
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    
    // Level Complete
    document.getElementById('next-level-btn').addEventListener('click', startNextLevel);

    // Initial draw
    draw();
}

function loadLeaderboard() {
    try {
        const stored = localStorage.getItem(LEADERBOARD_KEY);
        if (stored) {
            leaderboard = normalizeLeaderboard(JSON.parse(stored));
        }
    } catch (e) {
        console.warn("LocalStorage access failed", e);
    }
}

function normalizeLeaderboard(entries) {
    const bestByName = new Map();
    if (!Array.isArray(entries)) return [];
    entries.forEach((entry) => {
        if (!entry || typeof entry.name !== 'string') return;
        const existing = bestByName.get(entry.name);
        if (!existing || entry.score > existing.score) {
            bestByName.set(entry.name, entry);
        }
    });
    return Array.from(bestByName.values());
}

function saveLeaderboard() {
    try {
        leaderboard = normalizeLeaderboard(leaderboard);
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.warn("LocalStorage save failed", e);
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    mouse.x = canvas.width / 2;
    mouse.y = canvas.height / 2;
}

function handleInput(inputEvent) {
    if (!gameRunning || isPaused) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = inputEvent.clientX - rect.left;
    mouse.y = inputEvent.clientY - rect.top;
}

function handleKeyDown(e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameRunning) togglePause();
    }
}

function togglePause() {
    isPaused = !isPaused;
    const pauseScreen = document.getElementById('pause-screen');
    const pauseBtn = document.getElementById('pause-btn');
    
    if (isPaused) {
        pauseScreen.classList.remove('hidden');
        pauseBtn.textContent = 'Resume';
        cancelAnimationFrame(animationId);
    } else {
        pauseScreen.classList.add('hidden');
        pauseBtn.textContent = 'Pause';
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    }
}

function validateAndStart() {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();
    if (name.length < 2 || name.length > 15) {
        alert("Please enter a name between 2 and 15 characters.");
        return;
    }
    playerName = name;
    document.getElementById('player-name-hud').textContent = playerName;
    
    // Reset full game state
    currentLevel = 1;
    score = 0;
    lives = 3;
    startLevel();
}

function startLevel() {
    // Determine requirements for this level
    fishEatenThisLevel = 0;
    fishRequiredForLevel = 10 + (currentLevel - 1) * 5;
    
    // Reset Entities
    fishes = [];
    player = new Fish(true);
    particleSystem = [];

    gameRunning = true;
    isPaused = false;
    
    // Center player
    mouse.x = canvas.width / 2;
    mouse.y = canvas.height / 2;

    // UI
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('pause-btn').textContent = 'Pause';
    
    // Ensure pause screen is hidden
    document.getElementById('pause-screen').classList.add('hidden');

    updateHUD();
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function startNextLevel() {
    startLevel();
}

function showStartScreen() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}

function showLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<li style="text-align:center;">No scores yet</li>';
    } else {
        leaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="rank">#${index + 1}</div>
                <div class="info">
                    <span class="name">${entry.name}</span>
                    <span class="details">Lvl ${entry.level} • ${new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <div class="score">${entry.score}</div>
            `;
            list.appendChild(li);
        });
    }
    
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('leaderboard-screen').classList.remove('hidden');
}

function levelComplete() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    currentLevel++;
    document.getElementById('level-complete-score').textContent = score;
    document.getElementById('next-level-num').textContent = currentLevel;
    
    document.getElementById('level-complete-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);

    // Save to leaderboard
    const newEntry = {
        name: playerName,
        score: score,
        level: currentLevel,
        date: new Date().toISOString()
    };
    const existing = leaderboard.find((entry) => entry.name === playerName);
    if (!existing) {
        leaderboard.push(newEntry);
    } else if (newEntry.score > existing.score) {
        Object.assign(existing, newEntry);
    }
    saveLeaderboard();

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = currentLevel;
    
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}


function updateHUD() {
    document.getElementById('score-display').textContent = score;
    document.getElementById('lives-display').textContent = lives;
    document.getElementById('level-display').textContent = currentLevel;
    document.getElementById('fish-remaining').textContent = Math.max(0, fishRequiredForLevel - fishEatenThisLevel);
}

function gameLoop(timestamp) {
    if (!gameRunning || isPaused) return;
    // const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    if (!player) return;
    player.update();
    
    // Particles
    particleSystem.forEach((p, i) => {
        p.update();
        if (p.life <= 0) particleSystem.splice(i, 1);
    });

    // Spawn Logic
    // Spawn rate decreases (gets faster) as level increases. Min frame gap is 20.
    const spawnRate = Math.max(20, Math.floor(BASE_SPAWN_RATE - (currentLevel * 2)));
    frameCount++;
    if (frameCount % spawnRate === 0) {
        fishes.push(new Fish());
    }

    // Update & Collision
    for (let i = fishes.length - 1; i >= 0; i--) {
        const fish = fishes[i];
        fish.update();

        // Remove if out of bounds
        if (fish.x < -200 || fish.x > canvas.width + 200 ||
            fish.y < -200 || fish.y > canvas.height + 200) {
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
                score += 10 + currentLevel; // Bonus score for higher levels
                player.radius = Math.min(player.radius + 1, 60); // Grow and Cap size
                fishEatenThisLevel++;
                
                // Spawn particles
                spawnParticles(fish.x, fish.y, fish.color);
                
                fishes.splice(i, 1);
                updateHUD();
                
                if (fishEatenThisLevel >= fishRequiredForLevel) {
                    levelComplete();
                }
            } else {
                // Die
                lives--;
                triggerScreenShake();
                updateHUD();
                fishes.splice(i, 1);

                if (lives <= 0) {
                    gameOver();
                }
            }
        } else {
             // Recalculate color/danger dynamically
             if (!fish.isPlayer) {
                const danger = fish.radius > player.radius;
                fish.color = danger ? '#FF4444' : '#44FF44';
                fish.isDanger = danger;
            }
        }
    }
    
    if (screenShake > 0) {
        screenShake--;
    }
}

let screenShake = 0;
function triggerScreenShake() {
    screenShake = 15;
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particleSystem.push(new Particle(x, y, color));
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.life = 40;
    }
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / 40;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
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
            this.facingLeft = false;
        } else {
            // Difficulty scaling
            const difficultyMultiplier = 1 + (currentLevel * 0.1);
            
            // Big fish chance increases with level
            const bigFishChance = Math.min(0.85, 0.4 + (currentLevel * 0.05));
            const isBigger = Math.random() < bigFishChance;
            
            const sizeVariance = isBigger ?
                (player.radius + 10 + Math.random() * 40) :
                (Math.max(5, player.radius - 5 - Math.random() * 10));

            this.radius = sizeVariance;
            this.color = this.radius > player.radius ? '#FF4444' : '#44FF44'; 
            this.isDanger = this.radius > player.radius;

            // Spawn logic
            if (Math.random() < 0.5) {
                this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
                this.y = Math.random() * canvas.height;
            } else {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
            }

            // Velocity
            const angle = Math.atan2(Math.random() * canvas.height - this.y, Math.random() * canvas.width - this.x);
            const speed = (2 + Math.random() * 3) * difficultyMultiplier;
            this.dx = Math.cos(angle) * speed;
            this.dy = Math.sin(angle) * speed;
            this.facingLeft = this.dx < 0;
        }
    }

    update() {
        if (this.isPlayer) {
            // Lerp towards mouse
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
        let img = null;
        if (this.isPlayer) {
            img = assets.player;
        } else {
            this.isDanger = this.radius > player.radius;
            img = this.isDanger ? assets.bigEnemy : assets.smallEnemy;
        }

        const isValid = img && img.complete && img.naturalWidth > 0;
        
        ctx.save();
        
        if (screenShake > 0) {
             const shakeX = (Math.random() - 0.5) * screenShake;
             const shakeY = (Math.random() - 0.5) * screenShake;
             ctx.translate(shakeX, shakeY);
        }

        ctx.translate(this.x, this.y);

        if (isValid) {
            let scaleX = 1;
            if (this.isPlayer) {
                if (this.facingLeft) scaleX = -1;
            } else {
                if (!this.facingLeft) scaleX = -1;
            }
            ctx.scale(scaleX, 1);
            // Draw slightly larger than hit circle for better look
            ctx.drawImage(img, -this.radius * 1.2, -this.radius * 1.2, this.radius * 2.4, this.radius * 2.4);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            if (this.isPlayer) { // Eye
                 ctx.fillStyle = 'white';
                 ctx.beginPath();
                 ctx.arc(5, -5, 5, 0, Math.PI * 2);
                 ctx.fill();
            }
        }
        ctx.restore();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (assets.ocean.complete && assets.ocean.naturalWidth > 0) {
        ctx.drawImage(assets.ocean, 0, 0, canvas.width, canvas.height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#006994');
        grad.addColorStop(1, '#003366');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Entities
    fishes.forEach(fish => fish.draw());
    if (gameRunning && player) player.draw();
    
    // Particles
    particleSystem.forEach(p => p.draw(ctx));
}
