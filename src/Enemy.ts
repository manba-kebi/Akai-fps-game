import * as THREE from 'three';

export class Enemy {
  private mesh: THREE.Mesh;
  private sprite: THREE.Sprite;
  private health: number;
  private maxHealth: number;
  private speed: number;
  private isAlive: boolean = true;
  private scene: THREE.Scene;
  private pathPoints: THREE.Vector3[] = [];
  private currentPathIndex: number = 0;
  private canMove: boolean = false;
  private colliders: THREE.Box3[];
  
  // 血条显示
  private healthBar: THREE.Group;
  private healthBarBackground: THREE.Mesh | null = null;
  private healthBarFill: THREE.Mesh | null = null;
  
  // 攻击系统
  private lastAttackTime: number = 0;
  private attackCooldown: number = 1200; // 1.2秒攻击一次
  private attackDamage: number = 15;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    texturePath: string,
    colliders: THREE.Box3[],
    health: number = 100
  ) {
    this.scene = scene;
    this.colliders = colliders;
    this.health = health;
    this.maxHealth = health;
    this.speed = 4 + Math.random() * 2; // 随机速度 4-6

    // 创建敌人精灵（使用图片纹理）
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(texturePath);
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    this.sprite = new THREE.Sprite(spriteMaterial);
    this.sprite.scale.set(2, 3, 1);
    this.sprite.position.copy(position);
    this.sprite.position.y = 1.5;
    
    scene.add(this.sprite);

    // 创建碰撞体（不可见）
    const collisionGeo = new THREE.BoxGeometry(1, 3, 1);
    const collisionMat = new THREE.MeshBasicMaterial({
      visible: false
    });
    this.mesh = new THREE.Mesh(collisionGeo, collisionMat);
    this.mesh.position.copy(position);
    this.mesh.position.y = 1.5;
    this.mesh.userData.enemy = this;
    
    scene.add(this.mesh);

    // 创建血条
    this.healthBar = new THREE.Group();
    this.createHealthBar();
    
    // 生成随机巡逻路径
    this.generatePatrolPath(position);
  }

  private createHealthBar(): void {
    // 血条背景
    const bgGeometry = new THREE.PlaneGeometry(1.5, 0.15);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide
    });
    this.healthBarBackground = new THREE.Mesh(bgGeometry, bgMaterial);
    
    // 血条填充
    const fillGeometry = new THREE.PlaneGeometry(1.5, 0.15);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });
    this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    this.healthBarFill.position.z = 0.01;
    
    this.healthBar.add(this.healthBarBackground);
    this.healthBar.add(this.healthBarFill);
    this.healthBar.position.copy(this.sprite.position);
    this.healthBar.position.y = 3.5;
    
    this.scene.add(this.healthBar);
  }

  private updateHealthBar(): void {
    if (!this.healthBarFill) return;
    
    const healthPercent = this.health / this.maxHealth;
    
    // 更新血条宽度
    this.healthBarFill.scale.x = healthPercent;
    this.healthBarFill.position.x = (1 - healthPercent) * -0.75;
    
    // 根据血量改变颜色
    if (healthPercent > 0.6) {
      (this.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
    } else if (healthPercent > 0.3) {
      (this.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
    } else {
      (this.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    }
  }

  private generatePatrolPath(startPos: THREE.Vector3): void {
    // 生成4-6个巡逻点
    const numPoints = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numPoints; i++) {
      const point = new THREE.Vector3(
        startPos.x + (Math.random() - 0.5) * 30,
        0,
        startPos.z + (Math.random() - 0.5) * 30
      );
      
      // 确保巡逻点在地图范围内
      point.x = Math.max(-90, Math.min(90, point.x));
      point.z = Math.max(-90, Math.min(90, point.z));
      
      this.pathPoints.push(point);
    }
  }

  public setCanMove(canMove: boolean): void {
    this.canMove = canMove;
  }

  public update(playerPosition: THREE.Vector3, deltaTime: number): void {
    if (!this.isAlive || !this.canMove) return;

    // 简单的追踪玩家行为
    const directionToPlayer = new THREE.Vector3();
    directionToPlayer.subVectors(playerPosition, this.sprite.position);
    directionToPlayer.y = 0;
    
    const distanceToPlayer = directionToPlayer.length();
    
    // 如果玩家在攻击范围内，停止移动并攻击
    if (distanceToPlayer <= 2.5) {
      // 攻击玩家
      this.attackPlayer();
    } else if (distanceToPlayer < 25) {
      // 追踪玩家
      directionToPlayer.normalize();
      
      // 计算新位置
      const newX = this.sprite.position.x + directionToPlayer.x * this.speed * deltaTime;
      const newZ = this.sprite.position.z + directionToPlayer.z * this.speed * deltaTime;
      
      // 碰撞检测
      if (!this.checkCollision(newX, newZ)) {
        this.sprite.position.x = newX;
        this.sprite.position.z = newZ;
      } else {
        // 尝试单独移动X和Z
        if (!this.checkCollision(newX, this.sprite.position.z)) {
          this.sprite.position.x = newX;
        } else if (!this.checkCollision(this.sprite.position.x, newZ)) {
          this.sprite.position.z = newZ;
        }
      }
    } else {
      // 否则按巡逻路径移动
      this.patrol(deltaTime);
    }

    // 更新碰撞体和血条位置
    this.mesh.position.copy(this.sprite.position);
    this.healthBar.position.copy(this.sprite.position);
    this.healthBar.position.y = 3.5;
    
    // 让精灵和血条始终面向相机
    this.sprite.lookAt(playerPosition);
    this.healthBar.lookAt(playerPosition);
  }

  private checkCollision(x: number, z: number): boolean {
    const enemyBox = new THREE.Box3(
      new THREE.Vector3(x - 0.5, 0, z - 0.5),
      new THREE.Vector3(x + 0.5, 3, z + 0.5)
    );

    for (const collider of this.colliders) {
      if (enemyBox.intersectsBox(collider)) {
        return true;
      }
    }
    
    return false;
  }

  private patrol(deltaTime: number): void {
    if (this.pathPoints.length === 0) return;

    const targetPoint = this.pathPoints[this.currentPathIndex];
    const direction = new THREE.Vector3();
    direction.subVectors(targetPoint, this.sprite.position);
    direction.y = 0;

    const distance = direction.length();

    if (distance < 1) {
      // 到达当前巡逻点，移动到下一个
      this.currentPathIndex = (this.currentPathIndex + 1) % this.pathPoints.length;
    } else {
      direction.normalize();
      
      const newX = this.sprite.position.x + direction.x * this.speed * deltaTime;
      const newZ = this.sprite.position.z + direction.z * this.speed * deltaTime;
      
      if (!this.checkCollision(newX, newZ)) {
        this.sprite.position.x = newX;
        this.sprite.position.z = newZ;
      }
    }
  }

  private attackPlayer(): void {
    const now = Date.now();
    if (now - this.lastAttackTime < this.attackCooldown) return;
    
    this.lastAttackTime = now;
    
    // 触发攻击事件（通过自定义事件）
    const event = new CustomEvent('enemyAttack', {
      detail: { damage: this.attackDamage }
    });
    document.dispatchEvent(event);
  }

  public takeDamage(damage: number, isHeadshot: boolean = false): boolean {
    if (!this.isAlive) return false;
    
    // 爆头伤害加倍
    const actualDamage = isHeadshot ? damage * 2 : damage;
    this.health -= actualDamage;
    this.updateHealthBar();
    
    // 受伤闪烁效果
    this.flashDamage();
    
    // 显示伤害数字
    if (isHeadshot) {
      this.showDamageNumber(actualDamage, true);
    }
    
    if (this.health <= 0) {
      this.die();
      return true;
    }
    
    return false;
  }

  private flashDamage(): void {
    const originalColor = (this.sprite.material as THREE.SpriteMaterial).color.clone();
    (this.sprite.material as THREE.SpriteMaterial).color.setHex(0xff0000);
    
    setTimeout(() => {
      if (this.sprite.material) {
        (this.sprite.material as THREE.SpriteMaterial).color.copy(originalColor);
      }
    }, 100);
  }

  private showDamageNumber(_damage: number, _isHeadshot: boolean): void {
    // 伤害数字显示（通过事件）
    const event = new CustomEvent('showDamage', {
      detail: { 
        damage: _damage, 
        isHeadshot: _isHeadshot,
        position: this.sprite.position.clone()
      }
    });
    document.dispatchEvent(event);
  }

  public die(): void {
    if (!this.isAlive) return;
    
    this.isAlive = false;
    this.scene.remove(this.sprite);
    this.scene.remove(this.mesh);
    this.scene.remove(this.healthBar);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public getPosition(): THREE.Vector3 {
    return this.sprite.position.clone();
  }

  public isEnemyAlive(): boolean {
    return this.isAlive;
  }

  public getHealth(): number {
    return this.health;
  }

  public getAttackDamage(): number {
    return this.attackDamage;
  }
}
