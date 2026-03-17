import * as THREE from 'three';
import { Player } from './Player';
import { Dust2Map } from './Map';
import { Enemy } from './Enemy';
import { AudioManager } from './AudioManager';
import { Loot } from './Loot';
import { EffectsManager } from './EffectsManager';

interface RoundConfig {
  enemiesToKill: number;
  enemyCount: number;
  enemyHealth: number;
}

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private isPlaying: boolean = false;
  private clock: THREE.Clock;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private audioManager: AudioManager;
  private effectsManager: EffectsManager;
  
  // 敌人系统
  private enemies: Enemy[] = [];
  private mapColliders: THREE.Box3[] = [];
  private enemyTextures: string[] = [
    '/assets/角色1.png',
    '/assets/角色2.png',
    '/assets/角色3.png',
    '/assets/角色4.png'
  ];
  
  // 战利品系统
  private loots: Loot[] = [];
  
  // 子弹上限
  private readonly MAX_RESERVE_AMMO_RIFLE = 90;
  private readonly MAX_RESERVE_AMMO_PISTOL = 36;
  
  // 回合系统
  private currentRound: number = 1;
  private killCount: number = 0;
  private roundKills: number = 0;
  private roundConfig: RoundConfig;
  private isRoundActive: boolean = false;
  private isCountdownActive: boolean = false;
  private countdownTime: number = 0;
  private lastKillTime: number = 0;
  private comboKills: number = 0;
  
  // 爆头统计
  private headshotCount: number = 0;
  
  // 射线检测
  private raycaster: THREE.Raycaster;

  constructor(container: HTMLElement) {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 300);

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 初始化音频管理器
    this.audioManager = new AudioManager();
    
    // 初始化特效管理器
    this.effectsManager = new EffectsManager();

    // 创建地图
    const map = new Dust2Map(this.scene);
    map.create();
    this.mapColliders = map.getColliders();

    // 创建玩家
    this.player = new Player(this.scene, this.camera, this.mapColliders, this.audioManager);

    // 射线检测
    this.raycaster = new THREE.Raycaster();

    // 时钟
    this.clock = new THREE.Clock();

    // 小地图
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.minimapCanvas.width = 180;
    this.minimapCanvas.height = 180;

    // 回合配置
    this.roundConfig = this.getRoundConfig(this.currentRound);

    // 事件监听
    this.setupEventListeners();

    // 开始游戏循环
    this.animate();
  }

  private getRoundConfig(round: number): RoundConfig {
    const enemiesToKill = 5 + round * 3;
    return {
      enemiesToKill: enemiesToKill,
      enemyCount: enemiesToKill + 2, // 敌人数量 = 击杀目标 + 2
      enemyHealth: 50 + round * 10
    };
  }

  private setupEventListeners(): void {
    // 窗口大小调整
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 指针锁定
    const instructions = document.getElementById('instructions')!;
    
    instructions.addEventListener('click', () => {
      this.startGame();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        this.isPlaying = true;
        instructions.style.display = 'none';
        
        if (!this.isRoundActive && !this.isCountdownActive && !this.player.isPlayerDead()) {
          this.startNewRound();
        }
      } else {
        this.isPlaying = false;
        instructions.style.display = 'block';
      }
    });

    // 鼠标移动
    document.addEventListener('mousemove', (event) => {
      if (!this.isPlaying) return;
      this.player.handleMouseMove(event.movementX, event.movementY);
    });

    // 敌人攻击事件
    document.addEventListener('enemyAttack', ((event: CustomEvent) => {
      const damage = event.detail.damage;
      this.player.takeDamage(damage);
    }) as EventListener);

    // 玩家重启事件
    document.addEventListener('playerRestart', () => {
      this.restartGame();
    });

    // 武器射击事件
    document.addEventListener('weaponShoot', ((_event: CustomEvent) => {
      this.checkPlayerShooting();
    }) as EventListener);
  }

  private startGame(): void {
    document.body.requestPointerLock();
  }

  private restartGame(): void {
    this.currentRound = 1;
    this.killCount = 0;
    this.roundKills = 0;
    this.comboKills = 0;
    this.headshotCount = 0;
    this.roundConfig = this.getRoundConfig(this.currentRound);
    
    // 重置特效管理器
    this.effectsManager.reset();
    
    this.clearEnemies();
    this.startNewRound();
  }

  private startNewRound(): void {
    this.roundKills = 0;
    this.isRoundActive = false;
    this.isCountdownActive = true;
    this.countdownTime = 10;
    
    this.clearEnemies();
    this.spawnEnemies();
    
    this.player.setCanMove(false);
    this.player.setCanShoot(false);
    this.enemies.forEach(enemy => enemy.setCanMove(false));
    
    this.audioManager.playCountdown();
    this.updateRoundHUD();
    this.startCountdown();
  }

  private startCountdown(): void {
    const countdownInterval = setInterval(() => {
      this.countdownTime--;
      this.updateCountdownDisplay();
      
      if (this.countdownTime <= 0) {
        clearInterval(countdownInterval);
        this.isCountdownActive = false;
        this.isRoundActive = true;
        
        this.player.setCanMove(true);
        this.player.setCanShoot(true);
        this.enemies.forEach(enemy => enemy.setCanMove(true));
        this.hideCountdownDisplay();
      }
    }, 1000);
  }

  private updateCountdownDisplay(): void {
    let countdownElement = document.getElementById('countdown');
    
    if (!countdownElement) {
      countdownElement = document.createElement('div');
      countdownElement.id = 'countdown';
      countdownElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 120px;
        font-weight: bold;
        color: #ff6600;
        text-shadow: 4px 4px 8px rgba(0,0,0,0.8);
        z-index: 300;
        animation: pulse 1s ease-in-out;
      `;
      document.body.appendChild(countdownElement);
    }
    
    countdownElement.textContent = this.countdownTime.toString();
    countdownElement.style.display = 'block';
  }

  private hideCountdownDisplay(): void {
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
      countdownElement.style.display = 'none';
    }
  }

  private spawnEnemies(): void {
    const spawnPoints = [
      new THREE.Vector3(60, 0, 70),
      new THREE.Vector3(50, 0, -50),
      new THREE.Vector3(-50, 0, 50),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(30, 0, -35),
      new THREE.Vector3(-35, 0, 35),
      new THREE.Vector3(60, 0, 30),
      new THREE.Vector3(-60, 0, -50)
    ];

    for (let i = 0; i < this.roundConfig.enemyCount; i++) {
      const spawnIndex = i % spawnPoints.length;
      const spawnPoint = spawnPoints[spawnIndex].clone();
      
      spawnPoint.x += (Math.random() - 0.5) * 10;
      spawnPoint.z += (Math.random() - 0.5) * 10;
      
      const texturePath = this.enemyTextures[i % this.enemyTextures.length];
      
      const enemy = new Enemy(
        this.scene,
        spawnPoint,
        texturePath,
        this.mapColliders,
        this.roundConfig.enemyHealth
      );
      this.enemies.push(enemy);
    }
  }

  private clearEnemies(): void {
    // 正确清理所有敌人
    this.enemies.forEach(enemy => {
      enemy.die(); // 调用 die 方法从场景中移除
    });
    this.enemies = [];
    
    // 清理战利品
    this.loots.forEach(loot => {
      loot.collect(); // 触发清理
    });
    this.loots = [];
  }

  private spawnLoot(position: THREE.Vector3): void {
    // 随机决定掉落类型和概率
    const rand = Math.random();
    
    if (rand < 0.4) {
      // 40% 概率掉落血包
      const loot = new Loot(this.scene, position, 'health');
      this.loots.push(loot);
    } else if (rand < 0.7) {
      // 30% 概率掉落弹药
      const loot = new Loot(this.scene, position, 'ammo');
      this.loots.push(loot);
    }
    // 30% 概率不掉落
  }

  private checkLootCollection(): void {
    const playerPos = this.player.getPosition();
    const collectRadius = 2; // 拾取半径

    this.loots.forEach(loot => {
      if (loot.isLootCollected()) return;

      const distance = playerPos.distanceTo(loot.getPosition());
      
      if (distance <= collectRadius) {
        const result = loot.collect();
        if (result) {
          this.applyLootEffect(result.type, result.value);
        }
      }
    });
    
    // 清理已收集的战利品
    this.loots = this.loots.filter(loot => !loot.isLootCollected());
  }

  private applyLootEffect(type: string, value: number): void {
    if (type === 'health') {
      // 恢复血量
      this.player.heal(value);
      this.showLootPickupMessage(`+${value} HP`);
    } else if (type === 'ammo') {
      // 恢复子弹
      const weapon = this.player.getWeapon();
      const weaponType = weapon.getWeaponType();
      
      let maxAmmo = this.MAX_RESERVE_AMMO_RIFLE;
      if (weaponType === 'pistol') {
        maxAmmo = this.MAX_RESERVE_AMMO_PISTOL;
      }
      
      const currentReserve = weapon.getReserveAmmo();
      const addedAmmo = Math.min(value, maxAmmo - currentReserve);
      
      if (addedAmmo > 0) {
        weapon.addAmmo(addedAmmo);
        this.showLootPickupMessage(`+${addedAmmo} 弹药`);
      }
    }
  }

  private showLootPickupMessage(message: string): void {
    let messageElement = document.getElementById('loot-message');
    
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.id = 'loot-message';
      messageElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -100px);
        font-size: 24px;
        font-weight: bold;
        color: #00ff00;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        z-index: 150;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.style.opacity = '1';
    
    setTimeout(() => {
      messageElement!.style.opacity = '0';
    }, 1000);
  }

  private checkPlayerShooting(): void {
    // 倒计时期间不能开枪
    if (this.isCountdownActive) {
      return;
    }
    
    // 锁头功能：射击时自动瞄准最近敌人
    if (this.player.isAimbotEnabled()) {
      this.applyAimbotInstant();
    }
    
    const weapon = this.player.getWeapon();
    const stats = weapon.getStats();
    const weaponType = weapon.getWeaponType();
    
    // 获取相机的前方向
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);

    // 近战武器使用近距离检测
    if (weaponType === 'knife') {
      // 近战范围攻击
      const playerPos = this.player.getPosition();
      
      this.enemies.forEach(enemy => {
        if (!enemy.isEnemyAlive()) return;
        
        const enemyPos = enemy.getPosition();
        const distance = playerPos.distanceTo(enemyPos);
        
        if (distance <= stats.range) {
          // 检查是否在玩家前方
          const toEnemy = new THREE.Vector3().subVectors(enemyPos, playerPos).normalize();
          const dot = direction.dot(toEnemy);
          
          if (dot > 0.5) { // 大约120度范围
            const killed = enemy.takeDamage(stats.damage);
            // 播放敌人受击音效
            this.audioManager.playEnemyHit();
            if (killed) {
              this.handleEnemyKilled(enemyPos, false, weaponType);
            }
          }
        }
      });
    } else {
      // 远程武器使用射线检测
      this.raycaster.set(this.camera.position, direction);
      this.raycaster.far = stats.range;
      
      const enemyMeshes = this.enemies
        .filter(e => e.isEnemyAlive())
        .map(e => e.getMesh());

      const intersects = this.raycaster.intersectObjects(enemyMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const enemy = hitMesh.userData.enemy as Enemy;
        
        if (enemy && enemy.isEnemyAlive()) {
          // 爆头检测：命中点在敌人上半部分
          const hitPoint = intersects[0].point;
          const enemyPos = enemy.getPosition();
          const relativeHeight = hitPoint.y - enemyPos.y;
          const isHeadshot = relativeHeight > 1.0; // 头部位置
          
          const killed = enemy.takeDamage(stats.damage, isHeadshot);
          // 播放敌人受击音效
          this.audioManager.playEnemyHit();
          if (killed) {
            this.handleEnemyKilled(enemy.getPosition(), isHeadshot, weaponType);
          }
        }
      }
    }
  }

  private handleEnemyKilled(enemyPosition: THREE.Vector3, isHeadshot: boolean = false, weaponType: string = 'rifle'): void {
    this.killCount++;
    this.roundKills++;
    
    const now = Date.now();
    
    if (now - this.lastKillTime < 5000) {
      this.comboKills++;
    } else {
      this.comboKills = 1;
    }
    
    this.lastKillTime = now;
    
    // 生成战利品
    this.spawnLoot(enemyPosition);
    
    // 播放音效
    this.audioManager.playKillSound(this.comboKills);
    
    // 显示连杀特效
    this.effectsManager.showKillStreak(this.comboKills);
    
    // 检查成就
    if (this.killCount === 1) {
      this.effectsManager.checkAchievement('firstBlood');
    }
    if (this.comboKills >= 3) {
      this.effectsManager.checkAchievement('tripleKill', this.comboKills);
    }
    if (this.comboKills >= 5) {
      this.effectsManager.checkAchievement('pentaKill', this.comboKills);
    }
    if (isHeadshot) {
      this.headshotCount++;
      this.effectsManager.showHeadshot();
      this.effectsManager.checkAchievement('headshot');
    }
    if (weaponType === 'knife') {
      this.effectsManager.checkAchievement('knifeKill');
    }
    
    this.updateHUD();
    
    // 只有回合正在进行时才检查胜利条件
    if (this.isRoundActive && this.roundKills >= this.roundConfig.enemiesToKill) {
      this.completeRound();
    }
  }

  private completeRound(): void {
    this.isRoundActive = false;
    
    this.audioManager.playVictory();
    this.showRoundComplete();
    
    setTimeout(() => {
      this.currentRound++;
      this.roundConfig = this.getRoundConfig(this.currentRound);
      this.startNewRound();
    }, 3000);
  }

  private showRoundComplete(): void {
    let completeElement = document.getElementById('round-complete');
    
    if (!completeElement) {
      completeElement = document.createElement('div');
      completeElement.id = 'round-complete';
      completeElement.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: #00ff00;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        z-index: 300;
        text-align: center;
      `;
      document.body.appendChild(completeElement);
    }
    
    completeElement.innerHTML = `第 ${this.currentRound} 轮通关!<br>准备下一轮...`;
    completeElement.style.display = 'block';
    
    setTimeout(() => {
      completeElement!.style.display = 'none';
    }, 2500);
  }

  private updateRoundHUD(): void {
    let roundInfoElement = document.getElementById('round-info');
    
    if (!roundInfoElement) {
      roundInfoElement = document.createElement('div');
      roundInfoElement.id = 'round-info';
      roundInfoElement.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        z-index: 100;
        text-align: center;
        background: rgba(0,0,0,0.5);
        padding: 10px 20px;
        border-radius: 10px;
      `;
      document.body.appendChild(roundInfoElement);
    }
    
    roundInfoElement.innerHTML = `
      第 ${this.currentRound} 轮 | 击杀: ${this.roundKills}/${this.roundConfig.enemiesToKill}
    `;
    roundInfoElement.style.display = 'block';
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    if (this.isPlaying && !this.player.isPlayerDead()) {
      // 更新玩家
      this.player.update(deltaTime);
      
      // 外挂功能
      // 锁头功能已移至射击时触发
      if (this.player.isESPEnabled()) {
        this.updateESP();
      } else {
        this.hideESP();
      }
      // 更新无限子弹状态
      this.player.getWeapon().setInfiniteAmmo(this.player.isInfiniteAmmoEnabled());
      
      // 更新敌人
      if (this.isRoundActive) {
        const playerPos = this.player.getPosition();
        this.enemies.forEach(enemy => {
          enemy.update(playerPos, deltaTime);
        });
      }
      
      // 更新战利品
      this.loots.forEach(loot => {
        loot.update(deltaTime);
      });
      
      // 检测战利品拾取
      this.checkLootCollection();
      
      // 更新 HUD
      this.updateHUD();
      this.updateRoundHUD();
      this.updateMinimap();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateHUD(): void {
    // 更新弹药显示
    const ammoElement = document.getElementById('ammo')!;
    const weapon = this.player.getWeapon();
    
    if (weapon.getWeaponType() === 'knife') {
      ammoElement.textContent = '';
    } else {
      ammoElement.textContent = `${weapon.getAmmo()} / ${weapon.getReserveAmmo()}`;
    }
    
    // 更新击杀数
    let killsElement = document.getElementById('total-kills');
    if (!killsElement) {
      killsElement = document.createElement('div');
      killsElement.id = 'total-kills';
      killsElement.style.cssText = `
        position: fixed;
        top: 60px;
        left: 20px;
        font-size: 20px;
        color: white;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        z-index: 100;
      `;
      document.body.appendChild(killsElement);
    }
    killsElement.textContent = `总击杀: ${this.killCount}`;
    
    // 更新武器信息
    const weaponInfoElement = document.getElementById('weapon-info');
    if (weaponInfoElement) {
      const weaponNames = {
        rifle: 'M7 Rifle',
        pistol: 'Pistol',
        knife: 'Knife'
      };
      
      const weaponNameElement = weaponInfoElement.querySelector('.weapon-name');
      if (weaponNameElement) {
        weaponNameElement.textContent = weaponNames[weapon.getWeaponType()];
      }
      
      const stats = weapon.getStats();
      const damageElement = weaponInfoElement.querySelector('.damage-info');
      if (damageElement) {
        damageElement.textContent = `伤害: ${stats.damage}`;
      }
    }
  }

  private updateMinimap(): void {
    const ctx = this.minimapCtx;
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 0.9;
    
    // 绘制网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // 绘制障碍物/墙壁（从碰撞体中获取）
    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    this.mapColliders.forEach(collider => {
      const min = collider.min;
      const max = collider.max;
      
      // 转换坐标到小地图坐标
      const x = centerX + (min.x + (max.x - min.x) / 2) * scale;
      const y = centerY - (min.z + (max.z - min.z) / 2) * scale;
      const w = (max.x - min.x) * scale;
      const h = (max.z - min.z) * scale;
      
      ctx.fillRect(x - w/2, y - h/2, w, h);
    });

    // 绘制关键点
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(centerX + (-70) * scale, centerY - (-70) * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText('T', centerX + (-73) * scale, centerY - (-67) * scale);

    ctx.fillStyle = '#0066ff';
    ctx.beginPath();
    ctx.arc(centerX + 70 * scale, centerY - 70 * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('CT', centerX + 65 * scale, centerY - 67 * scale);

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX + (-50) * scale, centerY - 50 * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('A', centerX + (-53) * scale, centerY - 47 * scale);

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX + 50 * scale, centerY - (-50) * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('B', centerX + 47 * scale, centerY - (-47) * scale);

    // 绘制敌人
    ctx.fillStyle = '#ff0000';
    this.enemies.forEach(enemy => {
      if (enemy.isEnemyAlive()) {
        const enemyPos = enemy.getPosition();
        const enemyX = centerX + enemyPos.x * scale;
        const enemyY = centerY - enemyPos.z * scale;
        
        ctx.beginPath();
        ctx.arc(enemyX, enemyY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 玩家位置
    const playerPos = this.player.getPosition();
    const playerX = centerX + playerPos.x * scale;
    const playerY = centerY - playerPos.z * scale;

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(this.camera.quaternion);

    ctx.save();
    ctx.translate(playerX, playerY);
    ctx.rotate(-euler.y);

    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -30);
    ctx.arc(0, 0, 30, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -10);
    ctx.stroke();

    ctx.restore();
  }

  // 外挂功能：锁头（射击时瞬间瞄准）
  private applyAimbotInstant(): void {
    const camera = this.camera;
    const playerPos = camera.position.clone();
    
    // 找到最近的活着且在视野内的敌人
    let nearestEnemy: Enemy | null = null;
    let nearestDistance = Infinity;
    let headPosition: THREE.Vector3 | null = null;
    
    // 相机前方向
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    for (const enemy of this.enemies) {
      if (!enemy.isEnemyAlive()) continue;
      
      const enemyPos = enemy.getPosition();
      const headPos = enemyPos.clone();
      headPos.y += 1.5; // 头部高度
      
      // 计算到敌人的向量
      const toEnemy = new THREE.Vector3().subVectors(headPos, playerPos);
      const distance = toEnemy.length();
      
      // 检查是否在前方（视野内）
      toEnemy.normalize();
      const dot = cameraDirection.dot(toEnemy);
      
      if (dot > 0.3) { // 在前方（大约140度范围）
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
          headPosition = headPos;
        }
      }
    }
    
    // 如果找到了敌人，瞄准头部
    if (nearestEnemy && headPosition) {
      const direction = new THREE.Vector3().subVectors(headPosition, playerPos);
      direction.normalize();
      
      // 计算yaw和pitch
      const yaw = Math.atan2(-direction.x, -direction.z);
      const pitch = Math.asin(direction.y);
      
      // 应用到相机
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
      camera.rotation.x = pitch; // 保持与 handleMouseMove 一致
      camera.rotation.z = 0;
      
      // 同步更新玩家的 yaw 和 pitch
      this.player.syncCameraRotation(yaw, pitch);
    }
  }

  // 外挂功能：透视ESP
  private updateESP(): void {
    // 创建或获取ESP容器
    let espContainer = document.getElementById('esp-container');
    if (!espContainer) {
      espContainer = document.createElement('div');
      espContainer.id = 'esp-container';
      espContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
      `;
      document.body.appendChild(espContainer);
    }
    
    espContainer.innerHTML = '';
    espContainer.style.display = 'block';
    
    const camera = this.camera;
    const playerPos = camera.position.clone();
    
    for (const enemy of this.enemies) {
      if (!enemy.isEnemyAlive()) continue;
      
      const enemyPos = enemy.getPosition();
      
      // 计算敌人到屏幕的坐标
      const screenPos = enemyPos.clone();
      screenPos.project(camera);
      
      // 检查是否在屏幕内
      if (screenPos.z > 1) continue; // 在相机后面
      
      const x = (screenPos.x + 1) / 2 * window.innerWidth;
      const y = (-screenPos.y + 1) / 2 * window.innerHeight;
      
      // 计算距离
      const distance = playerPos.distanceTo(enemyPos);
      
      // 创建敌人红框
      const boxSize = Math.max(30, 100 / distance * 10);
      const espBox = document.createElement('div');
      espBox.style.cssText = `
        position: absolute;
        left: ${x - boxSize/2}px;
        top: ${y - boxSize}px;
        width: ${boxSize}px;
        height: ${boxSize * 2}px;
        border: 2px solid #ff0000;
        box-shadow: 0 0 5px #ff0000;
        pointer-events: none;
      `;
      
      // 添加距离信息
      const distanceLabel = document.createElement('div');
      distanceLabel.style.cssText = `
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        color: #ff0000;
        font-size: 12px;
        text-shadow: 1px 1px 2px black;
        white-space: nowrap;
      `;
      distanceLabel.textContent = `${distance.toFixed(1)}m`;
      espBox.appendChild(distanceLabel);
      
      espContainer.appendChild(espBox);
    }
  }

  private hideESP(): void {
    const espContainer = document.getElementById('esp-container');
    if (espContainer) {
      espContainer.style.display = 'none';
    }
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
