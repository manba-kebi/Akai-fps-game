import * as THREE from 'three';
import { AudioManager } from './AudioManager';

export type WeaponType = 'rifle' | 'pistol' | 'knife';

export interface WeaponStats {
  damage: number;
  fireRate: number; // RPM
  reloadTime: number;
  magazineSize: number;
  reserveAmmo: number;
  recoil: number;
  spread: number;
  isAutomatic: boolean; // 是否全自动
  range: number; // 射程
}

export class Weapon {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private weaponGroup: THREE.Group;
  private stats: WeaponStats;
  private weaponType: WeaponType;
  private ammo: number;
  private reserveAmmo: number;
  private isReloading: boolean = false;
  private canShoot: boolean = true;
  private lastShootTime: number = 0;
  private muzzleFlash: THREE.PointLight | null = null;
  private audioManager: AudioManager;
  private isTriggerHeld: boolean = false; // 是否按住扳机
  private infiniteAmmo: boolean = false; // 无限子弹模式

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, audioManager: AudioManager) {
    this.scene = scene;
    this.camera = camera;
    this.audioManager = audioManager;
    this.weaponGroup = new THREE.Group();
    
    // 默认是步枪
    this.weaponType = 'rifle';
    this.stats = this.getWeaponStats('rifle');
    this.ammo = this.stats.magazineSize;
    this.reserveAmmo = this.stats.reserveAmmo;

    this.createWeaponModel();
    this.createMuzzleFlash();
    
    // 将武器添加到相机
    this.camera.add(this.weaponGroup);
    this.scene.add(this.camera);
  }

  private getWeaponStats(type: WeaponType): WeaponStats {
    const stats: { [key in WeaponType]: WeaponStats } = {
      rifle: {
        damage: 36,
        fireRate: 600, // RPM
        reloadTime: 2.5,
        magazineSize: 30,
        reserveAmmo: 90,
        recoil: 0.015,
        spread: 0.008,
        isAutomatic: true,
        range: 100
      },
      pistol: {
        damage: 45,
        fireRate: 300, // RPM
        reloadTime: 1.5,
        magazineSize: 12,
        reserveAmmo: 36,
        recoil: 0.025,
        spread: 0.015,
        isAutomatic: false,
        range: 50
      },
      knife: {
        damage: 100,
        fireRate: 60, // 1秒一次
        reloadTime: 0,
        magazineSize: 999,
        reserveAmmo: 999,
        recoil: 0,
        spread: 0,
        isAutomatic: false,
        range: 3 // 近战范围
      }
    };

    return stats[type];
  }

  public switchWeapon(type: WeaponType): void {
    if (this.isReloading) return;
    
    this.weaponType = type;
    this.stats = this.getWeaponStats(type);
    this.ammo = this.stats.magazineSize;
    this.reserveAmmo = this.stats.reserveAmmo;
    
    // 重新创建武器模型
    this.clearWeaponModel();
    this.createWeaponModel();
    
    // 更新 HUD
    this.updateWeaponHUD();
  }

  private clearWeaponModel(): void {
    while (this.weaponGroup.children.length > 0) {
      this.weaponGroup.remove(this.weaponGroup.children[0]);
    }
  }

  private createWeaponModel(): void {
    switch (this.weaponType) {
      case 'rifle':
        this.createRifleModel();
        break;
      case 'pistol':
        this.createPistolModel();
        break;
      case 'knife':
        this.createKnifeModel();
        break;
    }
  }

  private createRifleModel(): void {
    // M7 步枪模型
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.8
    });

    // 枪身主体
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.6);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0.15, -0.15, -0.4);
    this.weaponGroup.add(body);

    // 枪管
    const barrelGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.4, 16);
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.15, -0.1, -0.7);
    this.weaponGroup.add(barrel);

    // 弹匣
    const magazineGeo = new THREE.BoxGeometry(0.04, 0.15, 0.08);
    const magazine = new THREE.Mesh(magazineGeo, bodyMat);
    magazine.position.set(0.15, -0.25, -0.35);
    this.weaponGroup.add(magazine);

    // 握把
    const gripGeo = new THREE.BoxGeometry(0.06, 0.12, 0.03);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.9
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0.15, -0.25, -0.25);
    grip.rotation.x = -0.3;
    this.weaponGroup.add(grip);

    // 准星
    const sightMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.2
    });
    const frontSightGeo = new THREE.BoxGeometry(0.01, 0.03, 0.01);
    const frontSight = new THREE.Mesh(frontSightGeo, sightMat);
    frontSight.position.set(0.15, -0.03, -0.65);
    this.weaponGroup.add(frontSight);

    this.weaponGroup.position.set(0.25, -0.2, -0.5);
  }

  private createPistolModel(): void {
    // 手枪模型
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.4,
      metalness: 0.9
    });

    // 枪身
    const bodyGeo = new THREE.BoxGeometry(0.05, 0.1, 0.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0.2, -0.15, -0.25);
    this.weaponGroup.add(body);

    // 枪管
    const barrelGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.15, 16);
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.2, -0.12, -0.35);
    this.weaponGroup.add(barrel);

    // 弹匣
    const magazineGeo = new THREE.BoxGeometry(0.03, 0.1, 0.04);
    const magazine = new THREE.Mesh(magazineGeo, bodyMat);
    magazine.position.set(0.2, -0.25, -0.2);
    this.weaponGroup.add(magazine);

    // 握把
    const gripGeo = new THREE.BoxGeometry(0.04, 0.1, 0.025);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.9
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0.2, -0.22, -0.18);
    grip.rotation.x = -0.2;
    this.weaponGroup.add(grip);

    this.weaponGroup.position.set(0.3, -0.15, -0.4);
  }

  private createKnifeModel(): void {
    // 小刀模型
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.2,
      metalness: 0.95
    });

    // 刀刃
    const bladeGeo = new THREE.BoxGeometry(0.02, 0.05, 0.25);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0.25, -0.15, -0.35);
    this.weaponGroup.add(blade);

    // 刀尖
    const tipGeo = new THREE.ConeGeometry(0.025, 0.08, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.z = Math.PI / 4;
    tip.position.set(0.25, -0.15, -0.5);
    this.weaponGroup.add(tip);

    // 刀柄
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.9
    });
    const handleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.12);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.25, -0.15, -0.22);
    this.weaponGroup.add(handle);

    this.weaponGroup.position.set(0.3, -0.1, -0.35);
  }

  private createMuzzleFlash(): void {
    this.muzzleFlash = new THREE.PointLight(0xff6600, 0, 5);
    this.muzzleFlash.position.set(0.15, -0.1, -0.9);
    this.weaponGroup.add(this.muzzleFlash);
  }

  public startShooting(): void {
    this.isTriggerHeld = true;
    this.tryShoot();
  }

  public stopShooting(): void {
    this.isTriggerHeld = false;
  }

  public tryShoot(): boolean {
    // 无限子弹模式下不需要检查弹药
    if (!this.infiniteAmmo) {
      if (!this.canShoot || this.isReloading || this.ammo <= 0) {
        // 子弹空了自动换弹
        if (this.ammo <= 0 && this.reserveAmmo > 0 && !this.isReloading) {
          this.reload();
        }
        return false;
      }
    } else {
      // 无限子弹模式也要检查是否可以射击
      if (!this.canShoot || this.isReloading) {
        return false;
      }
    }

    const now = Date.now();
    const fireInterval = (60 / this.stats.fireRate) * 1000;

    if (now - this.lastShootTime < fireInterval) {
      return false;
    }

    this.lastShootTime = now;
    
    // 无限子弹模式下不消耗子弹
    if (!this.infiniteAmmo) {
      this.ammo--;
    }

    // 播放枪声（小刀没有枪声）
    if (this.weaponType !== 'knife') {
      this.audioManager.playGunshot();
    }

    // 显示枪口火焰（小刀没有）
    if (this.muzzleFlash && this.weaponType !== 'knife') {
      this.muzzleFlash.intensity = 3;
      setTimeout(() => {
        if (this.muzzleFlash) {
          this.muzzleFlash.intensity = 0;
        }
      }, 50);
    }

    // 射击动画
    this.playShootAnimation();

    // 触发射击事件（让 Game 类检测命中）
    const event = new CustomEvent('weaponShoot', {
      detail: {
        weaponType: this.weaponType,
        stats: this.stats
      }
    });
    document.dispatchEvent(event);

    return true;
  }

  public update(): void {
    // 全自动武器持续射击
    if (this.isTriggerHeld && this.stats.isAutomatic) {
      this.tryShoot();
    }
    
    // 武器晃动
    const time = Date.now() * 0.001;
    const swayAmount = 0.001;
    
    this.weaponGroup.position.x = this.getBasePosition().x + Math.sin(time * 2) * swayAmount;
    this.weaponGroup.position.y = this.getBasePosition().y + Math.cos(time * 1.5) * swayAmount;
  }

  private getBasePosition(): THREE.Vector3 {
    switch (this.weaponType) {
      case 'rifle':
        return new THREE.Vector3(0.25, -0.2, -0.5);
      case 'pistol':
        return new THREE.Vector3(0.3, -0.15, -0.4);
      case 'knife':
        return new THREE.Vector3(0.3, -0.1, -0.35);
    }
  }

  private playShootAnimation(): void {
    const basePos = this.getBasePosition();
    
    if (this.weaponType === 'knife') {
      // 小刀挥砍动画
      this.playKnifeSwingAnimation();
    } else {
      // 枪械后坐力动画
      const originalZ = basePos.z;
      const originalRotX = this.weaponGroup.rotation.x;
      
      const recoilAmount = this.stats.recoil * 10;
      this.weaponGroup.position.z += recoilAmount;
      this.weaponGroup.rotation.x -= recoilAmount * 0.5;

      setTimeout(() => {
        this.weaponGroup.position.z = originalZ;
        this.weaponGroup.rotation.x = originalRotX;
      }, 50);
    }
  }

  private playKnifeSwingAnimation(): void {
    // 挥砍动画 - 快速挥动小刀
    const basePos = this.getBasePosition();
    const startTime = Date.now();
    const duration = 150; // 动画持续时间
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        // 挥砍动作：向右前方挥出，然后收回
        const swingAngle = Math.sin(progress * Math.PI) * 0.8;
        const swingForward = Math.sin(progress * Math.PI) * 0.15;
        
        this.weaponGroup.rotation.z = -swingAngle;
        this.weaponGroup.rotation.y = swingAngle * 0.5;
        this.weaponGroup.position.z = basePos.z - swingForward;
        
        requestAnimationFrame(animate);
      } else {
        // 重置位置
        this.weaponGroup.rotation.z = 0;
        this.weaponGroup.rotation.y = 0;
        this.weaponGroup.position.z = basePos.z;
      }
    };
    
    animate();
  }

  public reload(): void {
    if (this.isReloading || this.ammo === this.stats.magazineSize || this.reserveAmmo <= 0) {
      return;
    }

    // 小刀不需要换弹
    if (this.weaponType === 'knife') return;

    this.isReloading = true;

    // 换弹动画
    this.playReloadAnimation();

    setTimeout(() => {
      const needed = this.stats.magazineSize - this.ammo;
      const available = Math.min(needed, this.reserveAmmo);
      this.ammo += available;
      this.reserveAmmo -= available;
      this.isReloading = false;
    }, this.stats.reloadTime * 1000);
  }

  private playReloadAnimation(): void {
    const basePos = this.getBasePosition();
    const originalY = basePos.y;
    const originalRotX = this.weaponGroup.rotation.x;

    this.weaponGroup.position.y -= 0.3;
    this.weaponGroup.rotation.x -= 0.5;

    setTimeout(() => {
      this.weaponGroup.position.y = originalY;
      this.weaponGroup.rotation.x = originalRotX;
    }, this.stats.reloadTime * 1000 - 200);
  }

  private updateWeaponHUD(): void {
    const weaponInfoElement = document.getElementById('weapon-info');
    if (weaponInfoElement) {
      const weaponNames = {
        rifle: 'M7 Rifle',
        pistol: 'Pistol',
        knife: 'Knife'
      };
      
      const weaponNameElement = weaponInfoElement.querySelector('.weapon-name');
      if (weaponNameElement) {
        weaponNameElement.textContent = weaponNames[this.weaponType];
      }
    }
  }

  public getWeaponType(): WeaponType {
    return this.weaponType;
  }

  public getAmmo(): number {
    return this.ammo;
  }

  public getReserveAmmo(): number {
    return this.reserveAmmo;
  }

  public isWeaponReloading(): boolean {
    return this.isReloading;
  }

  public getStats(): WeaponStats {
    return this.stats;
  }

  public addAmmo(count: number): void {
    this.reserveAmmo += count;
  }

  public setInfiniteAmmo(enabled: boolean): void {
    this.infiniteAmmo = enabled;
  }

  public isInfiniteAmmo(): boolean {
    return this.infiniteAmmo;
  }
}
