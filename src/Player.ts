import * as THREE from 'three';
import type { KeyState, PlayerState } from './types';
import { Weapon, WeaponType } from './Weapon';
import { AudioManager } from './AudioManager';

export class Player {
  private camera: THREE.PerspectiveCamera;
  private velocity: THREE.Vector3;
  private keys: KeyState;
  private state: PlayerState;
  private weapon: Weapon;
  private colliders: THREE.Box3[];
  private audioManager: AudioManager;
  
  // 相机控制
  private yaw: number = 0;
  private pitch: number = 0;
  
  // 状态控制
  private canMove: boolean = true;
  private canShoot: boolean = true;
  private isMoving: boolean = false;
  
  // 玩家血量
  private health: number = 100;
  private maxHealth: number = 100;
  private isDead: boolean = false;
  
  // 外挂系统
  private cheatMenuOpen: boolean = false;
  private cheatOptions = {
    fly: false,
    aimbot: false,
    esp: false,
    infiniteAmmo: false
  };
  
  // 物理参数
  private readonly GRAVITY = 30;
  private readonly JUMP_FORCE = 10;
  private readonly MOVE_SPEED = 10;
  private readonly SPRINT_MULTIPLIER = 1.6;
  private readonly PLAYER_HEIGHT = 1.7;
  private readonly PLAYER_RADIUS = 0.5;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    colliders: THREE.Box3[],
    audioManager: AudioManager
  ) {
    this.camera = camera;
    this.colliders = colliders;
    this.audioManager = audioManager;
    this.velocity = new THREE.Vector3();
    
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false
    };

    this.state = {
      velocity: { x: 0, y: 0, z: 0 },
      canJump: true,
      isSprinting: false,
      moveSpeed: this.MOVE_SPEED,
      sprintMultiplier: this.SPRINT_MULTIPLIER
    };

    this.weapon = new Weapon(scene, camera, audioManager);
    
    // 初始位置
    this.camera.position.set(-70, this.PLAYER_HEIGHT, -70);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 键盘按下事件
    document.addEventListener('keydown', (event) => {
      if (this.isDead) return;
      
      switch (event.code) {
        case 'KeyW':
          this.keys.forward = true;
          break;
        case 'KeyS':
          this.keys.backward = true;
          break;
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'Space':
          this.keys.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          this.state.isSprinting = true;
          break;
        case 'KeyR':
          this.weapon.reload();
          break;
        case 'Digit1':
          this.switchWeapon('rifle');
          break;
        case 'Digit2':
          this.switchWeapon('pistol');
          break;
        case 'Digit3':
          this.switchWeapon('knife');
          break;
        case 'Digit5':
          this.toggleCheatMenu();
          break;
      }
    });

    // 键盘释放事件
    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.keys.forward = false;
          break;
        case 'KeyS':
          this.keys.backward = false;
          break;
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          this.state.isSprinting = false;
          break;
      }
    });

    // 鼠标按下事件
    document.addEventListener('mousedown', (event) => {
      if (this.isDead || !this.canShoot) return;
      
      if (event.button === 0) { // 左键
        this.weapon.startShooting();
      }
    });

    // 鼠标释放事件
    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        this.weapon.stopShooting();
      }
    });
  }

  private switchWeapon(type: WeaponType): void {
    if (this.weapon.getWeaponType() !== type) {
      this.weapon.stopShooting();
      this.weapon.switchWeapon(type);
    }
  }

  public setCanMove(canMove: boolean): void {
    this.canMove = canMove;
  }

  public setCanShoot(canShoot: boolean): void {
    this.canShoot = canShoot;
  }

  // 重置按键状态（暂停/恢复时调用）
  public resetKeys(): void {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.sprint = false;
    this.state.isSprinting = false;
    this.isMoving = false;
    this.weapon.stopShooting();
  }

  public takeDamage(damage: number): void {
    if (this.isDead) return;
    
    this.health -= damage;
    
    // 播放受击音效
    this.audioManager.playPlayerHit();
    
    // 更新血条UI
    this.updateHealthUI();
    
    // 受伤效果
    this.flashDamageEffect();
    
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  public heal(amount: number): void {
    if (this.isDead) return;
    
    this.health = Math.min(this.health + amount, this.maxHealth);
    this.updateHealthUI();
  }

  private updateHealthUI(): void {
    const healthFill = document.getElementById('health-fill');
    if (healthFill) {
      const healthPercent = (this.health / this.maxHealth) * 100;
      healthFill.style.width = `${healthPercent}%`;
    }
  }

  private flashDamageEffect(): void {
    // 屏幕闪红效果
    let damageOverlay = document.getElementById('damage-overlay');
    if (!damageOverlay) {
      damageOverlay = document.createElement('div');
      damageOverlay.id = 'damage-overlay';
      damageOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0.3);
        pointer-events: none;
        z-index: 50;
        opacity: 0;
        transition: opacity 0.1s;
      `;
      document.body.appendChild(damageOverlay);
    }
    
    damageOverlay.style.opacity = '1';
    setTimeout(() => {
      damageOverlay!.style.opacity = '0';
    }, 100);
  }

  private die(): void {
    this.isDead = true;
    this.weapon.stopShooting();
    
    // 显示死亡界面
    this.showDeathScreen();
  }

  private showDeathScreen(): void {
    let deathScreen = document.getElementById('death-screen');
    if (!deathScreen) {
      deathScreen = document.createElement('div');
      deathScreen.id = 'death-screen';
      deathScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 400;
        cursor: pointer;
      `;
      
      deathScreen.innerHTML = `
        <h1 style="color: #ff0000; font-size: 72px; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">你死了</h1>
        <p style="color: white; font-size: 24px; margin-bottom: 30px;">点击屏幕重新开始</p>
        <p style="color: #aaa; font-size: 18px;">按 ESC 退出游戏</p>
      `;
      
      document.body.appendChild(deathScreen);
      
      deathScreen.addEventListener('click', () => {
        this.restart();
      });
    } else {
      deathScreen.style.display = 'flex';
    }
  }

  public restart(): void {
    this.health = this.maxHealth;
    this.isDead = false;
    this.updateHealthUI();
    
    // 重置位置
    this.camera.position.set(-70, this.PLAYER_HEIGHT, -70);
    this.yaw = 0;
    this.pitch = 0;
    
    // 重置武器
    this.weapon.switchWeapon('rifle');
    
    // 隐藏死亡界面
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      deathScreen.style.display = 'none';
    }
    
    // 触发重新开始事件
    const event = new CustomEvent('playerRestart');
    document.dispatchEvent(event);
  }

  public isPlayerDead(): boolean {
    return this.isDead;
  }

  public handleMouseMove(movementX: number, movementY: number): void {
    if (this.isDead) return;
    
    const sensitivity = 0.002;
    
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
    
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  public update(deltaTime: number): void {
    if (this.isDead) return;

    // 外挂模式下的飞天
    if (this.cheatOptions.fly && this.keys.jump) {
      this.camera.position.y += 10 * deltaTime;
      this.velocity.y = 0; // 重置下落速度
    } else if (!this.cheatOptions.fly) {
      // 正常模式：重力
      this.velocity.y -= this.GRAVITY * deltaTime;

      // 跳跃
      if (this.keys.jump && this.state.canJump) {
        this.velocity.y = this.JUMP_FORCE;
        this.state.canJump = false;
      }

      // 应用垂直速度
      const newPosition = this.camera.position.clone();
      newPosition.y += this.velocity.y * deltaTime;

      // 碰撞检测
      const playerBox = new THREE.Box3(
        new THREE.Vector3(
          newPosition.x - this.PLAYER_RADIUS,
          newPosition.y - this.PLAYER_HEIGHT,
          newPosition.z - this.PLAYER_RADIUS
        ),
        new THREE.Vector3(
          newPosition.x + this.PLAYER_RADIUS,
          newPosition.y + 0.2,
          newPosition.z + this.PLAYER_RADIUS
        )
      );

      let collision = false;
      for (const collider of this.colliders) {
        if (playerBox.intersectsBox(collider)) {
          collision = true;
          break;
        }
      }

      if (!collision) {
        this.camera.position.y = newPosition.y;
      } else {
        this.velocity.y = 0;
        this.state.canJump = true;
      }

      // 地面检测
      if (this.camera.position.y < this.PLAYER_HEIGHT) {
        this.camera.position.y = this.PLAYER_HEIGHT;
        this.velocity.y = 0;
        this.state.canJump = true;
      }
    }

    // 移动控制
    if (this.canMove) {
      this.updateMovement(deltaTime);
    } else {
      this.audioManager.stopFootstep();
      this.isMoving = false;
    }

    // 更新武器
    this.weapon.update();
  }

  private updateMovement(deltaTime: number): void {
    const moveDirection = new THREE.Vector3();
    
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    
    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    if (this.keys.forward) {
      moveDirection.add(forward);
    }
    if (this.keys.backward) {
      moveDirection.sub(forward);
    }
    if (this.keys.right) {
      moveDirection.add(right);
    }
    if (this.keys.left) {
      moveDirection.sub(right);
    }

    this.isMoving = moveDirection.length() > 0;

    if (this.isMoving && this.state.canJump) {
      this.audioManager.startFootstep();
    } else {
      this.audioManager.stopFootstep();
    }

    if (this.isMoving) {
      moveDirection.normalize();

      let speed = this.state.moveSpeed;
      if (this.state.isSprinting) {
        speed *= this.state.sprintMultiplier;
      }

      // 分轴碰撞检测 - 允许沿墙滑行
      const moveX = moveDirection.x * speed * deltaTime;
      const moveZ = moveDirection.z * speed * deltaTime;

      // X轴碰撞检测
      const newX = this.camera.position.x + moveX;
      const playerBoxX = new THREE.Box3(
        new THREE.Vector3(
          newX - this.PLAYER_RADIUS,
          this.camera.position.y - this.PLAYER_HEIGHT,
          this.camera.position.z - this.PLAYER_RADIUS
        ),
        new THREE.Vector3(
          newX + this.PLAYER_RADIUS,
          this.camera.position.y + 0.2,
          this.camera.position.z + this.PLAYER_RADIUS
        )
      );

      let collisionX = false;
      for (const collider of this.colliders) {
        if (playerBoxX.intersectsBox(collider)) {
          collisionX = true;
          break;
        }
      }

      if (!collisionX) {
        this.camera.position.x = newX;
      }

      // Z轴碰撞检测
      const newZ = this.camera.position.z + moveZ;
      const playerBoxZ = new THREE.Box3(
        new THREE.Vector3(
          this.camera.position.x - this.PLAYER_RADIUS,
          this.camera.position.y - this.PLAYER_HEIGHT,
          newZ - this.PLAYER_RADIUS
        ),
        new THREE.Vector3(
          this.camera.position.x + this.PLAYER_RADIUS,
          this.camera.position.y + 0.2,
          newZ + this.PLAYER_RADIUS
        )
      );

      let collisionZ = false;
      for (const collider of this.colliders) {
        if (playerBoxZ.intersectsBox(collider)) {
          collisionZ = true;
          break;
        }
      }

      if (!collisionZ) {
        this.camera.position.z = newZ;
      }
    }
  }

  public getWeapon(): Weapon {
    return this.weapon;
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  // 外挂系统
  public toggleCheatMenu(): void {
    this.cheatMenuOpen = !this.cheatMenuOpen;
    
    if (this.cheatMenuOpen) {
      // 退出指针锁定，让鼠标可见
      document.exitPointerLock();
      this.showCheatMenu();
    } else {
      // 重新锁定指针
      document.body.requestPointerLock();
      this.hideCheatMenu();
    }
  }

  private showCheatMenu(): void {
    let menu = document.getElementById('cheat-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'cheat-menu';
      menu.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #ff6600;
        border-radius: 15px;
        padding: 30px;
        z-index: 600;
        color: white;
        font-family: Arial, sans-serif;
        min-width: 300px;
      `;
      document.body.appendChild(menu);
    }
    
    menu.innerHTML = `
      <h2 style="color: #ff6600; margin-bottom: 20px; text-align: center;">🔮 外挂菜单</h2>
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <input type="checkbox" id="cheat-fly" ${this.cheatOptions.fly ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="font-size: 18px;">🦅 飞天</span>
          <span style="color: #888; font-size: 12px; margin-left: auto;">按住空格上升</span>
        </label>
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <input type="checkbox" id="cheat-aimbot" ${this.cheatOptions.aimbot ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="font-size: 18px;">🎯 锁头</span>
          <span style="color: #888; font-size: 12px; margin-left: auto;">自动瞄准敌人头部</span>
        </label>
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <input type="checkbox" id="cheat-esp" ${this.cheatOptions.esp ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="font-size: 18px;">👁️ 透视</span>
          <span style="color: #888; font-size: 12px; margin-left: auto;">显示敌人位置红框</span>
        </label>
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <input type="checkbox" id="cheat-ammo" ${this.cheatOptions.infiniteAmmo ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="font-size: 18px;">∞ 无限子弹</span>
          <span style="color: #888; font-size: 12px; margin-left: auto;">射击不消耗子弹</span>
        </label>
      </div>
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">按 5 关闭菜单</p>
    `;
    
    // 添加事件监听
    const flyCheckbox = document.getElementById('cheat-fly') as HTMLInputElement;
    const aimbotCheckbox = document.getElementById('cheat-aimbot') as HTMLInputElement;
    const espCheckbox = document.getElementById('cheat-esp') as HTMLInputElement;
    const ammoCheckbox = document.getElementById('cheat-ammo') as HTMLInputElement;
    
    if (flyCheckbox) {
      flyCheckbox.addEventListener('change', () => {
        this.cheatOptions.fly = flyCheckbox.checked;
      });
    }
    if (aimbotCheckbox) {
      aimbotCheckbox.addEventListener('change', () => {
        this.cheatOptions.aimbot = aimbotCheckbox.checked;
      });
    }
    if (espCheckbox) {
      espCheckbox.addEventListener('change', () => {
        this.cheatOptions.esp = espCheckbox.checked;
      });
    }
    if (ammoCheckbox) {
      ammoCheckbox.addEventListener('change', () => {
        this.cheatOptions.infiniteAmmo = ammoCheckbox.checked;
      });
    }
    
    menu.style.display = 'block';
  }

  private hideCheatMenu(): void {
    const menu = document.getElementById('cheat-menu');
    if (menu) {
      menu.style.display = 'none';
    }
  }

  public isCheatMenuOpen(): boolean {
    return this.cheatMenuOpen;
  }

  public isFlyEnabled(): boolean {
    return this.cheatOptions.fly;
  }

  public isAimbotEnabled(): boolean {
    return this.cheatOptions.aimbot;
  }

  public isESPEnabled(): boolean {
    return this.cheatOptions.esp;
  }

  public isInfiniteAmmoEnabled(): boolean {
    return this.cheatOptions.infiniteAmmo;
  }

  // 同步相机旋转（用于锁头功能）
  public syncCameraRotation(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
  }
}
