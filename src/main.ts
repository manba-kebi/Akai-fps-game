import { Game } from './Game';

// 初始化游戏
const container = document.getElementById('game-container');

if (container) {
  const game = new Game(container);
  
  // 窗口关闭时清理资源
  window.addEventListener('beforeunload', () => {
    game.dispose();
  });
}
