import Phaser from 'phaser';
import { Difficulty, RankName } from '../types';
import { ScoreManager, IRankInfo } from '../utils/ScoreManager';

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = Difficulty.MEDIUM;
  private playerStats!: ReturnType<typeof ScoreManager.getDefaultPlayerStats>;
  private rankInfo!: IRankInfo;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.playerStats = ScoreManager.loadPlayerStats('player_0', '玩家');
    this.rankInfo = ScoreManager.getRankInfo(this.playerStats.totalScore);

    this.createBackground();
    this.createTitle();
    this.createPlayerInfo();
    this.createDifficultySelector();
    this.createStartButton();
    this.createRankButton();
    this.createHelpButton();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a5c3a, 0x0d3d24, 0x1a5c3a, 0x0d3d24);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    this.add.graphics()
      .lineStyle(2, 0x2d7a4c, 0.3)
      .strokeRoundedRect(30, 30, this.scale.width - 60, this.scale.height - 60, 20);
  }

  private createTitle(): void {
    const title = this.add.text(
      this.scale.width / 2,
      150,
      '斗地主',
      {
        font: 'bold 80px Arial',
        color: '#ffd700',
        stroke: '#8b4513',
        strokeThickness: 6
      }
    );
    title.setOrigin(0.5);

    const subtitle = this.add.text(
      this.scale.width / 2,
      230,
      '经典斗地主 H5 游戏',
      {
        font: '24px Arial',
        color: '#c8e6c9'
      }
    );
    subtitle.setOrigin(0.5);
  }

  private createPlayerInfo(): void {
    const y = 320;
    const width = this.scale.width - 80;

    const panel = this.add.graphics();
    panel.fillStyle(0x14522a, 0.8);
    panel.fillRoundedRect(40, y, width, 100, 15);
    panel.lineStyle(2, 0x3d8c5a, 0.6);
    panel.strokeRoundedRect(40, y, width, 100, 15);

    this.add.text(60, y + 20, `${this.rankInfo.icon} ${this.rankInfo.name}`, {
      font: 'bold 22px Arial',
      color: '#ffd700'
    });

    this.add.text(60, y + 50, `积分: ${this.playerStats.totalScore}`, {
      font: '18px Arial',
      color: '#ffffff'
    });

    this.add.text(250, y + 50, `胜: ${this.playerStats.wins} | 负: ${this.playerStats.losses}`, {
      font: '18px Arial',
      color: '#c8e6c9'
    });

    if (this.rankInfo.nextRank) {
      const progressBg = this.add.graphics();
      progressBg.fillStyle(0x0a2a15, 0.8);
      progressBg.fillRect(60, y + 78, width - 40, 12);

      const progress = this.add.graphics();
      progress.fillStyle(0x4caf50, 1);
      progress.fillRect(60, y + 78, (width - 40) * this.rankInfo.progress, 12);

      const remaining = this.rankInfo.nextRank.requiredScore - this.playerStats.totalScore;
      this.add.text(width - 120, y + 75, `+${remaining}`, {
        font: '12px Arial',
        color: '#ffd700'
      });
    }
  }

  private createDifficultySelector(): void {
    const y = 480;
    const width = this.scale.width - 80;

    this.add.text(40, y - 35, '选择难度:', {
      font: 'bold 24px Arial',
      color: '#ffffff'
    });

    const difficulties = [
      { key: Difficulty.EASY, label: '简单', desc: '适合新手' },
      { key: Difficulty.MEDIUM, label: '中等', desc: '普通难度' },
      { key: Difficulty.HARD, label: '困难', desc: '高手挑战' }
    ];

    const buttonWidth = (width - 40) / 3;

    difficulties.forEach((diff, index) => {
      const x = 60 + index * (buttonWidth + 20);
      const isSelected = this.selectedDifficulty === diff.key;

      const button = this.add.graphics();
      button.fillStyle(isSelected ? 0x4caf50 : 0x2d7a4c, isSelected ? 1 : 0.6);
      button.fillRoundedRect(x, y, buttonWidth, 80, 10);
      
      if (isSelected) {
        button.lineStyle(3, 0xffd700, 1);
        button.strokeRoundedRect(x, y, buttonWidth, 80, 10);
      }

      this.add.text(x + buttonWidth / 2, y + 25, diff.label, {
        font: 'bold 22px Arial',
        color: '#ffffff'
      }).setOrigin(0.5);

      this.add.text(x + buttonWidth / 2, y + 50, diff.desc, {
        font: '14px Arial',
        color: isSelected ? '#ffd700' : '#a5d6a7'
      }).setOrigin(0.5);

      const hitZone = this.add.zone(x + buttonWidth / 2, y + 40, buttonWidth, 80);
      hitZone.setInteractive();
      hitZone.on('pointerdown', () => {
        this.selectedDifficulty = diff.key;
        this.scene.restart();
      });
    });
  }

  private createStartButton(): void {
    const y = 620;
    const width = this.scale.width - 80;

    const button = this.add.graphics();
    button.fillStyle(0xff6b35, 1);
    button.fillRoundedRect(40, y, width, 90, 15);

    this.add.text(this.scale.width / 2, y + 45, '开始游戏', {
      font: 'bold 32px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(this.scale.width / 2, y + 45, width, 90);
    hitZone.setInteractive();
    hitZone.on('pointerdown', () => {
      this.scene.start('GameScene', {
        difficulty: this.selectedDifficulty,
        playerName: '玩家'
      });
    });
  }

  private createRankButton(): void {
    const y = 750;
    const width = (this.scale.width - 100) / 2;

    const button = this.add.graphics();
    button.fillStyle(0x9c27b0, 0.8);
    button.fillRoundedRect(40, y, width, 70, 12);

    this.add.text(40 + width / 2, y + 35, '🏆 排行榜', {
      font: 'bold 20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(40 + width / 2, y + 35, width, 70);
    hitZone.setInteractive();
    hitZone.on('pointerdown', () => {
      this.showLeaderboard();
    });
  }

  private createHelpButton(): void {
    const y = 750;
    const width = (this.scale.width - 100) / 2;

    const button = this.add.graphics();
    button.fillStyle(0x2196f3, 0.8);
    button.fillRoundedRect(60 + width, y, width, 70, 12);

    this.add.text(60 + width + width / 2, y + 35, '📖 游戏规则', {
      font: 'bold 20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(60 + width + width / 2, y + 35, width, 70);
    hitZone.setInteractive();
    hitZone.on('pointerdown', () => {
      this.showRules();
    });
  }

  private showLeaderboard(): void {
    const leaderboard = ScoreManager.getLeaderboard();
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    const panel = this.add.graphics();
    panel.fillStyle(0x14522a, 1);
    panel.fillRoundedRect(50, 200, this.scale.width - 100, 800, 20);
    panel.lineStyle(3, 0x4caf50, 0.6);
    panel.strokeRoundedRect(50, 200, this.scale.width - 100, 800, 20);

    this.add.text(this.scale.width / 2, 240, '🏆 排行榜', {
      font: 'bold 32px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    if (leaderboard.length === 0) {
      this.add.text(this.scale.width / 2, 500, '暂无排行数据', {
        font: '24px Arial',
        color: '#c8e6c9'
      }).setOrigin(0.5);
    } else {
      const topPlayers = leaderboard.slice(0, 10);
      topPlayers.forEach((player, index) => {
        const rankInfo = ScoreManager.getRankInfo(player.totalScore);
        const y = 300 + index * 50;
        
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
        
        this.add.text(80, y, medal, {
          font: 'bold 20px Arial',
          color: index < 3 ? '#ffd700' : '#ffffff'
        });
        
        this.add.text(130, y, player.playerName, {
          font: '18px Arial',
          color: '#ffffff'
        });
        
        this.add.text(320, y, `${rankInfo.icon} ${rankInfo.name}`, {
          font: '16px Arial',
          color: '#ffd700'
        });
        
        this.add.text(480, y, `${player.totalScore}分`, {
          font: '18px Arial',
          color: '#4caf50'
        });
      });
    }

    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0xff6b35, 1);
    closeBtn.fillRoundedRect(this.scale.width / 2 - 80, 920, 160, 50, 10);
    
    this.add.text(this.scale.width / 2, 945, '关闭', {
      font: 'bold 20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const closeZone = this.add.zone(this.scale.width / 2, 945, 160, 50);
    closeZone.setInteractive();
    closeZone.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private showRules(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    const panel = this.add.graphics();
    panel.fillStyle(0x14522a, 1);
    panel.fillRoundedRect(50, 150, this.scale.width - 100, 900, 20);
    panel.lineStyle(3, 0x4caf50, 0.6);
    panel.strokeRoundedRect(50, 150, this.scale.width - 100, 900, 20);

    this.add.text(this.scale.width / 2, 190, '📖 游戏规则', {
      font: 'bold 28px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    const rules = [
      '【基本规则】',
      '• 游戏使用54张牌（含大小王）',
      '• 三人游戏，一人为地主，两人为农民',
      '• 地主拥有20张牌，农民各17张',
      '',
      '【叫地主】',
      '• 随机选择一名玩家开始叫地主',
      '• 可叫100分、200分、300分或不叫',
      '• 叫分最高者成为地主',
      '',
      '【牌型】',
      '• 单张：任意一张牌',
      '• 对子：两张相同点数的牌',
      '• 三张：三张相同点数的牌',
      '• 三带一：三张+任意一张',
      '• 三带二：三张+一对',
      '• 顺子：5张及以上连续单张',
      '• 连对：3对及以上连续对子',
      '• 飞机：2组及以上连续三张',
      '• 炸弹：四张相同点数的牌',
      '• 火箭：大小王（最大牌型）',
      '',
      '【胜负条件】',
      '• 地主先出完所有牌则地主胜',
      '• 任一农民先出完牌则农民胜'
    ];

    let y = 240;
    rules.forEach(rule => {
      if (rule === '') {
        y += 10;
      } else {
        this.add.text(70, y, rule, {
          font: '16px Arial',
          color: rule.startsWith('【') ? '#ffd700' : '#e8f5e9'
        });
        y += 28;
      }
    });

    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0xff6b35, 1);
    closeBtn.fillRoundedRect(this.scale.width / 2 - 80, 980, 160, 50, 10);
    
    this.add.text(this.scale.width / 2, 1005, '关闭', {
      font: 'bold 20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const closeZone = this.add.zone(this.scale.width / 2, 1005, 160, 50);
    closeZone.setInteractive();
    closeZone.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
