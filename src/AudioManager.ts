export class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isPlayingFootstep: boolean = false;

  constructor() {
    this.loadSounds();
  }

  private loadSounds(): void {
    // 加载枪声
    this.loadSound('gunshot', '/assets/枪声.m4a');
    
    // 加载击杀音效
    this.loadSound('kill', '/assets/击杀.m4a');
    this.loadSound('doublekill', '/assets/双杀.m4a');
    this.loadSound('triplekill', '/assets/三杀.m4a');
    this.loadSound('quadrakill', '/assets/四杀.m4a');
    this.loadSound('pentakill', '/assets/五杀.m4a');
    this.loadSound('hexakill', '/assets/六杀.m4a');
    this.loadSound('septimakill', '/assets/七杀及以上.m4a');
    
    // 加载备用击杀音效（随机播放）
    this.loadSound('headshotkill', '/assets/爆头击杀.m4a');
    this.loadSound('doublekill_2', '/assets/双杀_2.m4a');
    this.loadSound('triplekill_2', '/assets/三杀_2.m4a');
    this.loadSound('septimakill_2', '/assets/七杀及以上_2.m4a');
    
    // 加载通关音效
    this.loadSound('victory', '/assets/通关成功.m4a');
    
    // 加载倒计时音效
    this.loadSound('countdown', '/assets/开始时倒数.mp4');
    
    // 加载脚步声
    this.loadSound('footstep', '/assets/脚步声-皮鞋走路_爱给网_aigei_com.mp4');
    
    // 加载受击音效
    this.loadSound('playerHit1', '/assets/我的受击音效1.m4a');
    this.loadSound('playerHit2', '/assets/我的受击音效2.m4a');
    this.loadSound('enemyHit', '/assets/敌人受击音效.m4a');
  }

  private loadSound(name: string, path: string): void {
    const audio = new Audio(path);
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }

  public playSound(name: string, volume: number = 1.0): void {
    const audio = this.sounds.get(name);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {
        // 忽略自动播放限制错误
      });
    }
  }

  public playGunshot(): void {
    this.playSound('gunshot', 0.5);
  }

  public playKillSound(killCount: number, isHeadshot: boolean = false): void {
    // 单杀时，根据是否爆头选择音效
    if (killCount === 1) {
      if (isHeadshot) {
        this.playSound('headshotkill', 0.7);
      } else {
        this.playSound('kill', 0.7);
      }
      return;
    }
    
    // 连杀音效（不管是否爆头都正常播放）
    if (killCount === 2) {
      // 双杀：随机选择两个音效之一
      const soundName = Math.random() < 0.5 ? 'doublekill' : 'doublekill_2';
      this.playSound(soundName, 0.7);
    } else if (killCount === 3) {
      // 三杀：随机选择两个音效之一
      const soundName = Math.random() < 0.5 ? 'triplekill' : 'triplekill_2';
      this.playSound(soundName, 0.7);
    } else if (killCount === 4) {
      this.playSound('quadrakill', 0.7);
    } else if (killCount === 5) {
      this.playSound('pentakill', 0.7);
    } else if (killCount === 6) {
      this.playSound('hexakill', 0.7);
    } else if (killCount >= 7) {
      // 七杀及以上：随机选择两个音效之一
      const soundName = Math.random() < 0.5 ? 'septimakill' : 'septimakill_2';
      this.playSound(soundName, 0.7);
    }
  }

  public playVictory(): void {
    this.playSound('victory', 0.8);
  }

  public playCountdown(): void {
    this.playSound('countdown', 0.6);
  }

  public startFootstep(): void {
    if (!this.isPlayingFootstep) {
      const audio = this.sounds.get('footstep');
      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.3;
        audio.loop = true;
        audio.play().catch(() => {});
        this.isPlayingFootstep = true;
      }
    }
  }

  public stopFootstep(): void {
    const audio = this.sounds.get('footstep');
    if (audio && this.isPlayingFootstep) {
      audio.pause();
      audio.currentTime = 0;
      this.isPlayingFootstep = false;
    }
  }

  public isFootstepPlaying(): boolean {
    return this.isPlayingFootstep;
  }

  public playPlayerHit(): void {
    // 随机播放两个受击音效中的一个
    const soundName = Math.random() < 0.5 ? 'playerHit1' : 'playerHit2';
    this.playSound(soundName, 0.6);
  }

  public playEnemyHit(): void {
    this.playSound('enemyHit', 0.5);
  }
}
