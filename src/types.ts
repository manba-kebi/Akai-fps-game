export interface GameState {
  isPlaying: boolean;
  health: number;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
}

export interface PlayerState {
  velocity: { x: number; y: number; z: number };
  canJump: boolean;
  isSprinting: boolean;
  moveSpeed: number;
  sprintMultiplier: number;
}

export interface WeaponStats {
  damage: number;
  fireRate: number;
  reloadTime: number;
  magazineSize: number;
  reserveAmmo: number;
  recoil: number;
  spread: number;
}

export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}
