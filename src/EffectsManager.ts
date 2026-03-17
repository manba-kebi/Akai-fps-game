export class EffectsManager {
  private container: HTMLElement;
  private killStreakElement: HTMLElement | null = null;
  private achievementElement: HTMLElement | null = null;
  
  // 成就系统
  private achievements: { [key: string]: boolean } = {
    firstBlood: false,
    tripleKill: false,
    pentaKill: false,
    headshot: false,
    knifeKill: false
  };

  constructor() {
    this.container = document.body;
    this.createKillStreakElement();
    this.createAchievementElement();
    
    // 监听伤害数字事件
    document.addEventListener('showDamage', ((event: CustomEvent) => {
      this.showDamageNumber(event.detail.damage, event.detail.isHeadshot);
    }) as EventListener);
  }

  private createKillStreakElement(): void {
    this.killStreakElement = document.createElement('div');
    this.killStreakElement.id = 'kill-streak';
    this.killStreakElement.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      font-weight: bold;
      color: #ff6600;
      text-shadow: 0 0 20px rgba(255, 102, 0, 0.8), 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 250;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
    `;
    this.container.appendChild(this.killStreakElement);
  }

  private createAchievementElement(): void {
    this.achievementElement = document.createElement('div');
    this.achievementElement.id = 'achievement';
    this.achievementElement.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      padding: 15px 25px;
      background: linear-gradient(135deg, rgba(255, 102, 0, 0.9), rgba(255, 165, 0, 0.9));
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      z-index: 300;
      pointer-events: none;
      opacity: 0;
      transform: translateX(100px);
      transition: opacity 0.5s, transform 0.5s;
    `;
    this.container.appendChild(this.achievementElement);
  }

  public showKillStreak(killCount: number): void {
    if (!this.killStreakElement) return;
    
    const messages: { [key: number]: string } = {
      2: '双杀!',
      3: '三杀!',
      4: '四杀!',
      5: '五杀!',
      6: '六杀!',
      7: '七杀!'
    };
    
    if (killCount >= 8) {
      this.killStreakElement.textContent = '超神!';
      this.killStreakElement.style.fontSize = '72px';
      this.killStreakElement.style.color = '#ff0000';
    } else if (messages[killCount]) {
      this.killStreakElement.textContent = messages[killCount];
      this.killStreakElement.style.fontSize = '48px';
      this.killStreakElement.style.color = '#ff6600';
    } else {
      return;
    }
    
    this.killStreakElement.style.opacity = '1';
    this.killStreakElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
    
    setTimeout(() => {
      if (this.killStreakElement) {
        this.killStreakElement.style.opacity = '0';
        this.killStreakElement.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    }, 1500);
  }

  public showHeadshot(): void {
    const headshotElement = document.createElement('div');
    headshotElement.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 36px;
      font-weight: bold;
      color: #ff0000;
      text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 260;
      pointer-events: none;
      animation: headshot 0.5s ease-out forwards;
    `;
    headshotElement.textContent = '爆头!';
    this.container.appendChild(headshotElement);
    
    // 添加动画样式
    if (!document.getElementById('headshot-style')) {
      const style = document.createElement('style');
      style.id = 'headshot-style';
      style.textContent = `
        @keyframes headshot {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
    setTimeout(() => {
      headshotElement.remove();
    }, 500);
  }

  public showDamageNumber(damage: number, isHeadshot: boolean): void {
    const numberElement = document.createElement('div');
    numberElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      font-size: ${isHeadshot ? '32px' : '24px'};
      font-weight: bold;
      color: ${isHeadshot ? '#ff0000' : '#ffff00'};
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 200;
      pointer-events: none;
      animation: damageFloat 1s ease-out forwards;
    `;
    numberElement.textContent = `-${damage}`;
    
    if (isHeadshot) {
      numberElement.textContent += ' 💥';
    }
    
    this.container.appendChild(numberElement);
    
    // 添加动画样式
    if (!document.getElementById('damage-float-style')) {
      const style = document.createElement('style');
      style.id = 'damage-float-style';
      style.textContent = `
        @keyframes damageFloat {
          0% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
          100% { opacity: 0; transform: translate(-50%, -50%) translateY(-50px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    setTimeout(() => {
      numberElement.remove();
    }, 1000);
  }

  public showAchievement(name: string, description: string): void {
    if (!this.achievementElement) return;
    
    this.achievementElement.innerHTML = `
      <div style="font-size: 20px;">🏆 ${name}</div>
      <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">${description}</div>
    `;
    
    this.achievementElement.style.opacity = '1';
    this.achievementElement.style.transform = 'translateX(0)';
    
    setTimeout(() => {
      if (this.achievementElement) {
        this.achievementElement.style.opacity = '0';
        this.achievementElement.style.transform = 'translateX(100px)';
      }
    }, 3000);
  }

  public checkAchievement(type: string, value?: number): void {
    switch (type) {
      case 'firstBlood':
        if (!this.achievements.firstBlood) {
          this.achievements.firstBlood = true;
          this.showAchievement('首杀', '完成第一次击杀');
        }
        break;
      case 'tripleKill':
        if (!this.achievements.tripleKill && value && value >= 3) {
          this.achievements.tripleKill = true;
          this.showAchievement('三杀达成', '连杀3人');
        }
        break;
      case 'pentaKill':
        if (!this.achievements.pentaKill && value && value >= 5) {
          this.achievements.pentaKill = true;
          this.showAchievement('五杀达成', '连杀5人');
        }
        break;
      case 'headshot':
        if (!this.achievements.headshot) {
          this.achievements.headshot = true;
          this.showAchievement('爆头大师', '完成一次爆头击杀');
        }
        break;
      case 'knifeKill':
        if (!this.achievements.knifeKill) {
          this.achievements.knifeKill = true;
          this.showAchievement('近战专家', '用小刀击杀敌人');
        }
        break;
    }
  }

  public reset(): void {
    // 重置成就（新游戏时）
    Object.keys(this.achievements).forEach(key => {
      this.achievements[key] = false;
    });
  }
}
