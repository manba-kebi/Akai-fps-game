import * as THREE from 'three';

export class Dust2Map {
  private scene: THREE.Scene;
  private colliders: THREE.Box3[] = [];
  
  // Dust2 配色方案
  private colors = {
    sand: 0xd4a574,
    darkSand: 0xa67c52,
    concrete: 0x8b8b7a,
    darkConcrete: 0x5a5a4e,
    wood: 0x6b4423,
    metal: 0x4a4a4a,
    sky: 0x87ceeb,
    ground: 0xc9a86c,
    wall: 0xb8956d
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.createSkybox();
    this.createGround();
    this.createTSpawn();
    this.createCTSpawn();
    this.createMidArea();
    this.createASite();
    this.createBSite();
    this.createLongA();
    this.createBDoors();
    this.createTunnels();
    this.createBoundaryWalls();
    this.addLighting();
  }

  private createSkybox(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#4a90c2');
    gradient.addColorStop(0.5, '#87ceeb');
    gradient.addColorStop(1, '#f5deb3');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  private createGround(): void {
    // 主地面
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: this.colors.ground,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 地面细节
    this.addGroundDetails();
  }

  private addGroundDetails(): void {
    for (let i = 0; i < 40; i++) {
      const size = Math.random() * 2 + 0.5;
      const detailGeo = new THREE.CircleGeometry(size, 8);
      const detailMat = new THREE.MeshStandardMaterial({
        color: this.colors.darkSand,
        roughness: 1
      });
      const detail = new THREE.Mesh(detailGeo, detailMat);
      detail.rotation.x = -Math.PI / 2;
      detail.position.set(
        (Math.random() - 0.5) * 180,
        0.01,
        (Math.random() - 0.5) * 180
      );
      this.scene.add(detail);
    }
  }

  private createTSpawn(): void {
    // T 出生点平台
    const platformGeo = new THREE.BoxGeometry(20, 0.3, 20);
    const platformMat = new THREE.MeshStandardMaterial({
      color: this.colors.concrete,
      roughness: 0.8
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(-70, 0.15, -70);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.scene.add(platform);

    // T 出生点标识
    const markerGeo = new THREE.RingGeometry(3, 3.5, 32);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(-70, 0.4, -70);
    this.scene.add(marker);

    // T 出生点围墙
    this.createWall(-70, 2, -82, 22, 4, 0.5);
    this.createWall(-82, 2, -70, 0.5, 4, 22);
  }

  private createCTSpawn(): void {
    // CT 出生点平台
    const platformGeo = new THREE.BoxGeometry(20, 0.3, 20);
    const platformMat = new THREE.MeshStandardMaterial({
      color: this.colors.concrete,
      roughness: 0.8
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(70, 0.15, 70);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.scene.add(platform);

    // CT 出生点标识
    const markerGeo = new THREE.RingGeometry(3, 3.5, 32);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(70, 0.4, 70);
    this.scene.add(marker);

    // CT 出生点围墙
    this.createWall(70, 2, 82, 22, 4, 0.5);
    this.createWall(82, 2, 70, 0.5, 4, 22);
  }

  private createMidArea(): void {
    // 中门 - 经典的双门结构
    const doorHeight = 4;
    const doorWidth = 3;
    const doorThickness = 0.5;

    // 左门
    this.createWall(-1.5, doorHeight / 2, 0, doorThickness, doorHeight, doorWidth);
    
    // 右门
    this.createWall(1.5, doorHeight / 2, 0, doorThickness, doorHeight, doorWidth);

    // 门框上方
    this.createWall(0, doorHeight + 1, 0, doorWidth * 2 + doorThickness, 2, doorWidth);

    // 中门两侧墙壁
    this.createWall(-12, 2.5, 0, 18, 5, 0.5);
    this.createWall(12, 2.5, 0, 18, 5, 0.5);

    // 中门平台的台阶
    for (let i = 0; i < 3; i++) {
      const stepGeo = new THREE.BoxGeometry(15, 0.3, 2);
      const stepMat = new THREE.MeshStandardMaterial({
        color: this.colors.concrete,
        roughness: 0.9
      });
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(0, 0.15 + i * 0.3, -6 - i * 2);
      step.receiveShadow = true;
      this.scene.add(step);
    }
  }

  private createASite(): void {
    // A 点平台
    const platformGeo = new THREE.BoxGeometry(25, 0.3, 25);
    const platformMat = new THREE.MeshStandardMaterial({
      color: this.colors.concrete,
      roughness: 0.8
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(-50, 0.15, 50);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.scene.add(platform);

    // A 点标识
    const markerGeo = new THREE.CircleGeometry(4, 32);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(-50, 0.4, 50);
    this.scene.add(marker);

    // A 点箱子掩体
    this.createCrate(-55, 1, 55, 2, 2, 2);
    this.createCrate(-45, 1, 55, 2, 2, 2);
    this.createCrate(-55, 1, 45, 2, 2, 2);
    this.createCrate(-45, 1, 45, 2, 2, 2);

    // A 点狙击位
    this.createWall(-65, 1.5, 50, 0.5, 3, 10);
    
    // A 点后方墙壁
    this.createWall(-50, 2, 65, 20, 4, 0.5);
  }

  private createBSite(): void {
    // B 点平台
    const platformGeo = new THREE.BoxGeometry(25, 0.3, 25);
    const platformMat = new THREE.MeshStandardMaterial({
      color: this.colors.concrete,
      roughness: 0.8
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(50, 0.15, -50);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.scene.add(platform);

    // B 点标识
    const markerGeo = new THREE.CircleGeometry(4, 32);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(50, 0.4, -50);
    this.scene.add(marker);

    // B 点箱子掩体
    this.createCrate(45, 1, -45, 2, 2, 2);
    this.createCrate(55, 1, -45, 2, 2, 2);
    this.createCrate(45, 1, -55, 2, 2, 2);
    this.createCrate(55, 1, -55, 2, 2, 2);
    this.createCrate(50, 2.5, -50, 2, 2, 2); // 叠加箱子

    // B 平台台阶
    for (let i = 0; i < 4; i++) {
      const stepGeo = new THREE.BoxGeometry(15, 0.3, 2);
      const stepMat = new THREE.MeshStandardMaterial({
        color: this.colors.concrete,
        roughness: 0.9
      });
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(50, 0.15 + i * 0.3, -35 - i * 2);
      step.receiveShadow = true;
      this.scene.add(step);
    }
    
    // B 点后方墙壁
    this.createWall(50, 2, -65, 20, 4, 0.5);
  }

  private createLongA(): void {
    // Long A 走廊墙壁
    this.createWall(-30, 2, 35, 0.5, 4, 30);
    this.createWall(-40, 2, 35, 0.5, 4, 30);

    // A 大门框
    this.createWall(-35, 3, 50, 12, 6, 0.5);
    
    // Long A 的箱子
    this.createCrate(-32, 1, 25, 2, 2, 2);
    this.createCrate(-38, 1, 30, 2, 2, 2);
  }

  private createBDoors(): void {
    // B 门 - 双门结构
    const doorHeight = 4;
    const doorWidth = 3;
    const doorThickness = 0.5;

    // 左门
    this.createWall(28.5, doorHeight / 2, -50, doorThickness, doorHeight, doorWidth);
    
    // 右门
    this.createWall(31.5, doorHeight / 2, -50, doorThickness, doorHeight, doorWidth);

    // 门框上方
    this.createWall(30, doorHeight + 1, -50, doorWidth * 2 + doorThickness, 2, doorWidth);
  }

  private createTunnels(): void {
    // B 洞入口
    this.createWall(22, 2, -28, 12, 4, 0.5);
    this.createWall(22, 2, -38, 12, 4, 0.5);
    
    // B 洞内部通道
    this.createWall(28, 2, -33, 0.5, 4, 12);
    this.createWall(35, 2, -33, 0.5, 4, 12);

    // B 洞箱子
    this.createCrate(32, 1, -33, 2, 2, 2);
  }

  private createBoundaryWalls(): void {
    // 地图边界墙
    this.createWall(0, 5, -95, 200, 10, 1);  // 北墙
    this.createWall(0, 5, 95, 200, 10, 1);   // 南墙
    this.createWall(-95, 5, 0, 1, 10, 200);  // 西墙
    this.createWall(95, 5, 0, 1, 10, 200);   // 东墙

    // 中间分隔墙
    this.createWall(0, 3, -20, 0.5, 6, 30);
    this.createWall(0, 3, 20, 0.5, 6, 30);
  }

  private createWall(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number
  ): void {
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMat = new THREE.MeshStandardMaterial({
      color: this.colors.wall,
      roughness: 0.8,
      metalness: 0.2
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // 添加碰撞盒
    const box = new THREE.Box3().setFromObject(wall);
    this.colliders.push(box);
  }

  private createCrate(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number
  ): void {
    const crateGeo = new THREE.BoxGeometry(width, height, depth);
    const crateMat = new THREE.MeshStandardMaterial({
      color: this.colors.wood,
      roughness: 0.9
    });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(x, y, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);

    // 添加碰撞盒
    const box = new THREE.Box3().setFromObject(crate);
    this.colliders.push(box);
  }

  private addLighting(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 主光源 - 太阳
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    // 半球光
    const hemisphereLight = new THREE.HemisphereLight(
      0x87ceeb,
      0xc9a86c,
      0.3
    );
    this.scene.add(hemisphereLight);
  }

  public getColliders(): THREE.Box3[] {
    return this.colliders;
  }
}
