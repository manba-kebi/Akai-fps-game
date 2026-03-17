import * as THREE from 'three';

export type LootType = 'health' | 'ammo';

export class Loot {
  private mesh: THREE.Mesh;
  private type: LootType;
  private value: number;
  private scene: THREE.Scene;
  private isCollected: boolean = false;
  private bobOffset: number = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3, type: LootType) {
    this.scene = scene;
    this.type = type;
    
    // 根据类型设置值
    if (type === 'health') {
      this.value = 25; // 恢复25点血量
    } else {
      this.value = 15; // 恢复15发子弹
    }

    // 创建掉落物
    const color = type === 'health' ? 0x00ff00 : 0xffff00;
    
    // 使用发光的球体
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.5;
    this.mesh.userData.loot = this;
    
    scene.add(this.mesh);

    // 添加光晕效果
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(glow);
    
    // 随机初始偏移
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  public update(deltaTime: number): void {
    if (this.isCollected) return;
    
    // 上下浮动动画
    const time = Date.now() * 0.003 + this.bobOffset;
    this.mesh.position.y = 0.5 + Math.sin(time) * 0.2;
    
    // 旋转
    this.mesh.rotation.y += deltaTime * 2;
  }

  public collect(): { type: LootType; value: number } | null {
    if (this.isCollected) return null;
    
    this.isCollected = true;
    this.scene.remove(this.mesh);
    
    return {
      type: this.type,
      value: this.value
    };
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public isLootCollected(): boolean {
    return this.isCollected;
  }

  public getType(): LootType {
    return this.type;
  }
}
