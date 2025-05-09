const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');

let gameStarted = false;
let lives = 5;
let score = 0;
let currentStage = 1;
const totalStages = 4;
let waveTime = 0;

const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 30,
    width: 40,
    height: 20,
    speed: 0.1,
    velocityX: 0,
    color: 'lime'
};

const keys = {};
const bullets = [];
const bulletSpeed = -5;
const bulletWidth = 5;
const bulletHeight = 10;
const bulletColor = 'white';
const bulletInterval = 200;
let lastBulletTime = 0;
let spaceKeyPressed = false;

const enemyWidth = 30;
const enemyHeight = 20;
const enemyPadding = 10;
const enemyOffsetX = 30;
const enemyOffsetY = 50;
let enemySpeedX = 1;
let enemySpeedY = enemyHeight;
let enemyDirection = 1;
const enemies = [];

const enemyBulletWidth = 3;
const enemyBulletHeight = 7;
const enemyBulletColor = 'yellow';
const enemyBulletSpeed = 2;
const enemyFireInterval = 2000;
const lastEnemyFireTime = {};
const enemyBullets = [];
const enemyFireDelay = 300; // ミリ秒単位の遅延時間

const stageData = [
    { rows: 3, cols: 8, speedX: 1, speedY: enemyHeight, layout: 'rect', enemyBulletSpeed: 2 },
    { rows: 5, cols: 8, speedX: 0.8, speedY: enemyHeight / 1.5, layout: 'rect', enemyBulletSpeed: 1.2 },
    { rows: 3, cols: 8, speedX: 1.2, speedY: enemyHeight * 1.1, layout: 'rect', enemyBulletSpeed: 3.5 },
    { layout: 'boss', bossBulletSpeed: 4 }
];

const bossWidth = 60;
const bossHeight = 40;
const bossColor = '#8A2BE2';
const bossSpeedY = 0.3;
const bossSpeedX = 2;
let bossDirectionX = 1;
const bossInitialY = canvas.height * 0.3;
let boss;
let bossAlive = false;
const bossHP = 50;
let currentBossHP = bossHP;
const bossMoveInterval = 150;
let bossMoveTimer = 0;
let bossAttackPhase = 0;
let bossAttackTimer = 0;
const bossAttackInterval = 1500;
let bossLastPhaseChange = 0;
let bossChargeTimer = 0;
let isBossCharging = false;
let chargeDirection = 0;
let chargeSpeed = 0;
let bossMovementPattern = 0;
let bossMovementTimer = 0;
const bossMovementInterval = 3000;

const bossBulletWidth = 10;
const bossBulletHeight = 15;
const bossBulletColor = 'orange';
const bossBulletSpeed = 3;
const bossFireInterval = 120;
let bossFireTimer = 0;
const bossBullets = [];

const powerUps = [];
const powerUpTypes = [
    { type: 'doubleShot', color: '#00ffff', effect: '弾数2倍' },
    { type: 'extraLife', color: '#ff00ff', effect: 'ライフ+1' },
    { type: 'speedUp', color: '#ffff00', effect: '移動速度アップ' }
];
const powerUpSpeed = 0.5;
const powerUpSize = 15;
const powerUpDropChance = 0.2;

// コマンド処理の機能を追加
const commandInput = document.getElementById('commandInput');
const executeCommand = document.getElementById('executeCommand');
const commandHistory = document.getElementById('commandHistory');

function addCommandMessage(message, type = '') {
    const p = document.createElement('p');
    p.textContent = message;
    if (type) p.className = type;
    commandHistory.appendChild(p);
    commandHistory.scrollTop = commandHistory.scrollHeight;
}

function executeGameCommand(command) {
    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
        case '/help':
            addCommandMessage('利用可能なコマンド:');
            addCommandMessage('/help - コマンド一覧を表示');
            addCommandMessage('/stage [1-4] - ステージを変更');
            addCommandMessage('/life [1-10] - ライフを設定');
            addCommandMessage('/score [数値] - スコアを設定');
            break;

        case '/stage':
            const stageNum = parseInt(args[0]);
            if (stageNum >= 1 && stageNum <= 4) {
                currentStage = stageNum;
                createEnemies();
                addCommandMessage(`ステージを ${stageNum} に変更しました`, 'success');
            } else {
                addCommandMessage('ステージ番号は1から4の間で指定してください', 'error');
            }
            break;

        case '/life':
            const lifeNum = parseInt(args[0]);
            if (lifeNum >= 1 && lifeNum <= 10) {
                lives = lifeNum;
                addCommandMessage(`ライフを ${lifeNum} に設定しました`, 'success');
            } else {
                addCommandMessage('ライフは1から10の間で指定してください', 'error');
            }
            break;

        case '/score':
            const scoreNum = parseInt(args[0]);
            if (!isNaN(scoreNum) && scoreNum >= 0) {
                score = scoreNum;
                addCommandMessage(`スコアを ${scoreNum} に設定しました`, 'success');
            } else {
                addCommandMessage('有効な数値を入力してください', 'error');
            }
            break;

        default:
            addCommandMessage('不明なコマンドです。 /help でコマンド一覧を確認できます', 'error');
    }
}

executeCommand.addEventListener('click', () => {
    const command = commandInput.value;
    if (command) {
        executeGameCommand(command);
        commandInput.value = '';
    }
});

commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const command = commandInput.value;
        if (command) {
            executeGameCommand(command);
            commandInput.value = '';
        }
    }
});

startButton.addEventListener('click', startGame);

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        lives = 5;
        score = 0;
        currentStage = 1;
        bullets.length = 0;
        enemyBullets.length = 0;
        bossBullets.length = 0;
        powerUps.length = 0;
        bossAlive = false;
        currentBossHP = bossHP;
        createEnemies();
        startButton.style.display = 'none';
        gameLoop();
    }
}

function createEnemies() {
    enemies.length = 0;
    const currentStageData = stageData[currentStage - 1];

    if (!currentStageData) {
        gameStarted = false;
        startButton.innerText = 'ゲームクリア！\nリスタート';
        startButton.style.display = 'block';
        return;
    }

    enemySpeedX = currentStageData.speedX || 1;
    enemySpeedY = currentStageData.speedY || enemyHeight;
    enemyDirection = 1;

    if (currentStageData.layout === 'circle') {
        const numEnemies = currentStageData.rows * currentStageData.cols;
        const radius = currentStageData.radius;
        const centerX = currentStageData.centerX;
        const centerY = currentStageData.centerY;
        for (let i = 0; i < numEnemies; i++) {
            const angle = (i / numEnemies) * 2 * Math.PI;
            const enemyX = centerX + radius * Math.cos(angle) - enemyWidth / 2;
            const enemyY = centerY + radius * Math.sin(angle) - enemyHeight / 2;
            enemies.push({
                x: enemyX,
                y: enemyY,
                width: enemyWidth,
                height: enemyHeight,
                color: 'red',
                alive: true,
                angle: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                hp: 1
            });
        }
    } else if (currentStageData.layout === 'boss') {
        boss = {
            x: canvas.width / 2 - bossWidth / 2,
            y: bossInitialY,
            width: bossWidth,
            height: bossHeight,
            color: bossColor,
            speedY: bossSpeedY,
            speedX: bossSpeedX,
            directionX: bossDirectionX,
            alive: true,
            hp: currentBossHP
        };
        bossAlive = true;
        bossBullets.length = 0;
    } else {
        const rows = currentStageData.rows;
        const cols = currentStageData.cols;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const enemyX = col * (enemyWidth + enemyPadding) + enemyOffsetX;
                const enemyY = row * (enemyHeight + enemyPadding) + enemyOffsetY;
                enemies.push({
                    x: enemyX,
                    y: enemyY,
                    width: enemyWidth,
                    height: enemyHeight,
                    color: 'red',
                    alive: true,
                    angle: 0,
                    rotationSpeed: 0,
                    hp: 1
                });
            }
        }
    }

    enemies.forEach((_, index) => {
        lastEnemyFireTime[index] = 0;
    });
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    
    // メインの船体
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // コックピット
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height * 0.4, player.width * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // エンジン
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width * 0.3, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.7, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.5, player.y + player.height * 1.2);
    ctx.closePath();
    ctx.fill();
    
    // 翼
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x - player.width * 0.2, player.y + player.height * 0.7);
    ctx.lineTo(player.x - player.width * 0.5, player.y + player.height * 0.5);
    ctx.lineTo(player.x - player.width * 0.2, player.y + player.height * 0.3);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(player.x + player.width * 1.2, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width * 1.5, player.y + player.height * 0.5);
    ctx.lineTo(player.x + player.width * 1.2, player.y + player.height * 0.3);
    ctx.closePath();
    ctx.fill();
}

function updatePlayer() {
    player.x += player.velocityX;
    if (player.x < 0) player.x = 0;
    else if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].speed;
        if (bullets[i].y < -bullets[i].height) bullets.splice(i, 1);
    }
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.save();
            ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.rotate(enemy.angle);
            ctx.fillStyle = enemy.color;
            ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height * 0.6);
            const legWidth = enemy.width / 5;
            const legHeight = enemy.height * 0.4;
            for (let i = 0; i < 4; i++) {
                const xOffset = (i - 1.5) * (enemy.width / 4);
                ctx.fillRect(xOffset - legWidth / 2, enemy.height * 0.1, legWidth, legHeight);
            }
            ctx.fillStyle = 'white';
            ctx.fillRect(-enemy.width / 4, -enemy.height / 4, enemy.width / 8, enemy.height / 8);
            ctx.fillRect(enemy.width / 4 - enemy.width / 8, -enemy.height / 4, enemy.width / 8, enemy.height / 8);
            ctx.restore();
        }
    });

    // ボスの描画
    if (currentStage === 4 && bossAlive && boss) {
        ctx.save();
        
        // ボスの本体
        ctx.fillStyle = boss.color;
        ctx.beginPath();
        ctx.moveTo(boss.x + boss.width / 2, boss.y);
        ctx.lineTo(boss.x + boss.width, boss.y + boss.height * 0.7);
        ctx.lineTo(boss.x + boss.width * 0.8, boss.y + boss.height);
        ctx.lineTo(boss.x + boss.width * 0.2, boss.y + boss.height);
        ctx.lineTo(boss.x, boss.y + boss.height * 0.7);
        ctx.closePath();
        ctx.fill();

        // エネルギーフィールド
        const time = Date.now() * 0.001;
        ctx.strokeStyle = `hsl(${(time * 50) % 360}, 100%, 50%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(boss.x + boss.width / 2, boss.y + boss.height / 2, 
                boss.width * 0.6 + Math.sin(time * 3) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // パワーエフェクト
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time;
            const x = boss.x + boss.width / 2 + Math.cos(angle) * boss.width * 0.4;
            const y = boss.y + boss.height / 2 + Math.sin(angle) * boss.width * 0.4;
            ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsl(${(time * 100) % 360}, 100%, 70%)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 攻撃エフェクト
        if (isBossCharging) {
            ctx.beginPath();
            ctx.arc(boss.x + boss.width / 2, boss.y + boss.height / 2, 
                    boss.width * 0.4 + Math.sin(time * 10) * 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    // ボスの弾の描画
    bossBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 
                bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 弾の軌跡
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
        ctx.lineTo(bullet.x + bullet.width / 2 - bullet.velocityX * 2, 
                   bullet.y + bullet.height / 2 - bullet.velocityY * 2);
        ctx.stroke();
    });
}

function updateEnemies() {
    let reachedEdge = false;
    enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.x += enemySpeedX * enemyDirection;
            enemy.angle += enemy.rotationSpeed;
            if (enemy.x + enemyWidth > canvas.width || enemy.x < 0) reachedEdge = true;
        }
    });
    if (reachedEdge) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            if (enemy.alive) enemy.y += enemySpeedY;
        });
    }
}

function checkCollision(bullet, enemy) {
    return (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
    );
}

function updateBoss() {
    if (!bossAlive || !boss) return;
    
    const currentTime = Date.now();
    boss.y += boss.speedY;
    if (boss.y > canvas.height * 0.25) {
        boss.speedY = 0;
        bossMoveTimer++;
        bossAttackTimer++;
        bossMovementTimer++;

        // 移動パターンの切り替え
        if (bossMovementTimer >= bossMovementInterval) {
            bossMovementPattern = (bossMovementPattern + 1) % 3;
            bossMovementTimer = 0;
        }

        // 攻撃フェーズの切り替え
        if (currentTime - bossLastPhaseChange > bossAttackInterval) {
            bossAttackPhase = (bossAttackPhase + 1) % 4;
            bossLastPhaseChange = currentTime;
            isBossCharging = false;
            chargeSpeed = 0;
        }

        // 移動パターン
        const time = Date.now() * 0.001;
        switch (bossMovementPattern) {
            case 0: // 通常の左右移動
                const verticalOffset = Math.sin(time * 2) * 10;
                boss.y = canvas.height * 0.25 + verticalOffset;
                boss.x += bossSpeedX * bossDirectionX;
                if (boss.x <= 0) {
                    boss.x = 0;
                    bossDirectionX = 1;
                } else if (boss.x >= canvas.width - boss.width) {
                    boss.x = canvas.width - boss.width;
                    bossDirectionX = -1;
                }
                break;
            case 1: // ジグザグ移動
                boss.y = canvas.height * 0.25 + Math.sin(time * 4) * 30;
                boss.x += bossSpeedX * 1.5 * Math.cos(time * 3);
                if (boss.x <= 0) {
                    boss.x = 0;
                } else if (boss.x >= canvas.width - boss.width) {
                    boss.x = canvas.width - boss.width;
                }
                break;
            case 2: // 円運動
                const radius = 100;
                const centerX = canvas.width / 2;
                const centerY = canvas.height * 0.25;
                boss.x = centerX + Math.cos(time * 2) * radius;
                boss.y = centerY + Math.sin(time * 2) * radius;
                break;
        }

        // 画面外に出ないように制限
        if (boss.y < 0) boss.y = 0;
        else if (boss.y > canvas.height * 0.5) boss.y = canvas.height * 0.5;

        // チャージ攻撃の処理
        if (isBossCharging) {
            bossChargeTimer++;
            if (bossChargeTimer < 30) {
                chargeSpeed += 0.3;
            } else if (bossChargeTimer < 60) {
                boss.x += chargeDirection * chargeSpeed;
                if (boss.x < 0 || boss.x > canvas.width - boss.width) {
                    isBossCharging = false;
                    chargeSpeed = 0;
                }
            } else {
                isBossCharging = false;
                chargeSpeed = 0;
            }
        }

        // 攻撃パターン
        switch (bossAttackPhase) {
            case 0: // 通常の連続射撃
                if (bossFireTimer >= bossFireInterval) {
                    fireBossBullet();
                    bossFireTimer = 0;
                }
                break;
            case 1: // 3方向弾
                if (bossFireTimer >= bossFireInterval) {
                    fireBossBullet();
                    fireBossBullet(-0.3);
                    fireBossBullet(0.3);
                    bossFireTimer = 0;
                }
                break;
            case 2: // 広範囲弾
                if (bossFireTimer >= bossFireInterval) {
                    for (let i = -0.6; i <= 0.6; i += 0.2) {
                        fireBossBullet(i);
                    }
                    bossFireTimer = 0;
                }
                break;
            case 3: // チャージ攻撃
                if (!isBossCharging && bossFireTimer >= bossFireInterval * 2) {
                    isBossCharging = true;
                    bossChargeTimer = 0;
                    chargeDirection = Math.random() < 0.5 ? -1 : 1;
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        fireBossBullet(Math.sin(angle) * 0.5, Math.cos(angle) * 0.5);
                    }
                    bossFireTimer = 0;
                }
                break;
        }
        bossFireTimer++;
    }
}

function fireBossBullet(angleOffsetX = 0, angleOffsetY = 1) {
    if (bossAlive && boss) {
        const currentStageData = stageData[currentStage - 1];
        const currentBossBulletSpeed = currentStageData?.bossBulletSpeed || bossBulletSpeed;
        const speed = Math.sqrt(angleOffsetX * angleOffsetX + angleOffsetY * angleOffsetY);
        const normalizedX = angleOffsetX / speed;
        const normalizedY = angleOffsetY / speed;
        
        const newBossBullet = {
            x: boss.x + boss.width / 2 - bossBulletWidth / 2,
            y: boss.y + boss.height,
            width: bossBulletWidth,
            height: bossBulletHeight,
            speed: currentBossBulletSpeed,
            color: bossBulletColor,
            velocityX: normalizedX * currentBossBulletSpeed,
            velocityY: normalizedY * currentBossBulletSpeed
        };
        bossBullets.push(newBossBullet);
    }
}

function updateBossBullets() {
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        const bullet = bossBullets[i];
        bullet.x += bullet.velocityX || 0;
        bullet.y += bullet.velocityY;

        if (bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
            bossBullets.splice(i, 1);
            continue;
        }
        if (checkCollision(bossBullets[i], player)) {
            bossBullets.splice(i, 1);
            lives--;
            if (lives <= 0) gameOver();
        }
    }
}

function fireEnemyBullet() {
    if (!gameStarted) return;
    if (currentStage === 1) return;

    const currentTime = Date.now();
    const currentStageData = stageData[currentStage - 1];
    const currentEnemyBulletSpeed = currentStageData?.enemyBulletSpeed || enemyBulletSpeed;

    enemies.forEach((enemy, index) => {
        if (enemy.alive) {
            if (currentStage === 2 && index % 2 !== 0) return;
            if (currentStage === 3 && index % 3 !== 0) return;

            let fireDelay = 0;
            if (currentStage === 2) {
                const row = Math.floor(index / 8);
                fireDelay = row * 1000;
            } else if (currentStage === 3) {
                const col = index % 8;
                fireDelay = col * 800;
            } else {
                fireDelay = index * (enemyFireDelay / 4);
            }

            if (!lastEnemyFireTime[index] || currentTime - lastEnemyFireTime[index] > enemyFireInterval + fireDelay) {
                const newEnemyBullet = {
                    x: enemy.x + enemy.width / 2 - enemyBulletWidth / 2,
                    y: enemy.y + enemy.height,
                    width: enemyBulletWidth,
                    height: enemyBulletHeight,
                    speed: currentEnemyBulletSpeed,
                    color: enemyBulletColor,
                    velocityY: currentEnemyBulletSpeed
                };
                enemyBullets.push(newEnemyBullet);
                lastEnemyFireTime[index] = currentTime;
            }
        }
    });
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.y += bullet.velocityY; // 常にvelocityYで下に移動

        if (bullet.y > canvas.height) {
            enemyBullets.splice(i, 1);
            continue;
        }
        if (
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
        ) {
            enemyBullets.splice(i, 1);
            lives--;
            if (lives <= 0) gameOver();
        }
    }
}

function drawEnemyBullets() {
    enemyBullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function createPowerUp(x, y) {
    if (Math.random() < powerUpDropChance) {
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({
            x: x,
            y: y,
            width: powerUpSize,
            height: powerUpSize,
            color: type.color,
            type: type.type,
            effect: type.effect
        });
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += powerUpSpeed;

        // 画面外に出たら削除
        if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
            continue;
        }

        // プレイヤーとの衝突判定
        if (checkCollision(powerUp, player)) {
            applyPowerUp(powerUp.type);
            powerUps.splice(i, 1);
        }
    }
}

function applyPowerUp(type) {
    switch (type) {
        case 'doubleShot':
            // 弾数2倍の効果（30秒間）
            const originalFireBullet = fireBullet;
            fireBullet = function() {
                const bullet1 = {
                    x: player.x + player.width / 2 - bulletWidth / 2 - 5,
                    y: player.y - bulletHeight,
                    width: bulletWidth,
                    height: bulletHeight,
                    speed: bulletSpeed,
                    color: bulletColor
                };
                const bullet2 = {
                    x: player.x + player.width / 2 - bulletWidth / 2 + 5,
                    y: player.y - bulletHeight,
                    width: bulletWidth,
                    height: bulletHeight,
                    speed: bulletSpeed,
                    color: bulletColor
                };
                bullets.push(bullet1, bullet2);
            };
            setTimeout(() => {
                fireBullet = originalFireBullet;
            }, 30000);
            break;
        case 'extraLife':
            lives = Math.min(lives + 1, 10); // 最大10ライフまで
            break;
        case 'speedUp':
            player.velocityX *= 1.5;
            setTimeout(() => {
                player.velocityX /= 1.5;
            }, 30000);
            break;
    }
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.color;
        ctx.beginPath();
        ctx.arc(
            powerUp.x + powerUp.width / 2,
            powerUp.y + powerUp.height / 2,
            powerUp.width / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
}

function updateGame() {
    if (!gameStarted) return;

    // プレイヤーの弾と敵の衝突判定
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (enemy.alive && checkCollision(bullet, enemy)) {
                enemy.hp--;
                bullets.splice(i, 1);
                if (enemy.hp <= 0) {
                    enemy.alive = false;
                    score += 10;
                    createPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                }
                break;
            }
        }
    }

    // 敵の弾とプレイヤーの衝突判定
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (checkCollision(bullet, player)) {
            enemyBullets.splice(i, 1);
            lives--;
            if (lives <= 0) gameOver();
        }
    }

    // ボスとの衝突判定
    if (currentStage === 4 && bossAlive && boss) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (checkCollision(bullet, boss)) {
                boss.hp--;
                bullets.splice(i, 1);
                if (boss.hp <= 0) {
                    bossAlive = false;
                    score += 100;
                    gameStarted = false;
                    startButton.innerText = 'ゲームクリア！\nリスタート';
                    startButton.style.display = 'block';
                }
            }
        }

        if (checkCollision(player, boss)) {
            lives = 0;
            gameOver();
        }
    }

    // ステージクリア判定
    if (currentStage < 4) {
        const allEnemiesDefeated = enemies.every(enemy => !enemy.alive);
        if (allEnemiesDefeated && enemies.length > 0) {
            currentStage++;
            createEnemies();
        }
    }

    updatePlayer();
    updateBullets();
    updateEnemies();
    updateBossBullets();
    updateEnemyBullets();
    updatePowerUps();
}

function drawScore() {
    ctx.font = '16px "Pixelify Sans", monospace';
    ctx.fillStyle = 'white';
    ctx.fillText(`Score: ${score}`, 10, 20);
    ctx.fillText(`Stage: ${currentStage}`, 10, 40);
    if (currentStage === 4 && bossAlive && boss) {
        ctx.font = '12px "Pixelify Sans", monospace';
        ctx.fillText(`Boss HP: ${boss.hp}`, canvas.width - 100, 20);
    }
}

function drawLives() {
    ctx.font = '16px "Pixelify Sans", monospace';
    ctx.fillStyle = 'white';
    ctx.fillText(`Lives: ${lives}`, canvas.width - 100, 40);
}

function gameOver() {
    gameStarted = false;
    startButton.innerText = 'ゲームオーバー\nリスタート';
    startButton.style.display = 'block';
}

function updatePlayerVelocity() {
    if (keys['ArrowLeft'] || keys['a']) {
        player.velocityX = -3;
    } else if (keys['ArrowRight'] || keys['d']) {
        player.velocityX = 3;
    } else {
        player.velocityX = 0;
    }
}

function gameLoop() {
    if (!gameStarted) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updatePlayerVelocity();
    updateGame();
    updatePowerUps();
    fireEnemyBullet();
    
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawEnemyBullets();
    drawPowerUps();
    drawScore();
    drawLives();
    
    requestAnimationFrame(gameLoop);
}

function fireBullet() {
    const newBullet = {
        x: player.x + player.width / 2 - bulletWidth / 2,
        y: player.y - bulletHeight,
        width: bulletWidth,
        height: bulletHeight,
        speed: bulletSpeed,
        color: bulletColor
    };
    bullets.push(newBullet);
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && !spaceKeyPressed) {
        spaceKeyPressed = true;
        fireBullet();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ') {
        spaceKeyPressed = false;
    }
});　