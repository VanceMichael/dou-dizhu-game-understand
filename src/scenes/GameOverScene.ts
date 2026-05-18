import Phaser from 'phaser';
import { ScoreManager, IRankInfo } from '../utils/ScoreManager';
import { Difficulty } from '../types';

interface GameOverData {
  winner: 'landlord' | 'farmer';
  winnerName: string;
  scoreChange: number;
  isPlayerWin: boolean;
  baseScore: number;
  multiplier: number;
  playerIsLandlord: boolean;
}

export class GameOverScene extends Phaser.Scene {
  private gameData!: GameOverData;
  private playerStats!: ReturnType<typeof ScoreManager.getDefaultPlayerStats>;
  private rankInfo!: IRankInfo;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.gameData = data;
    this.playerStats = ScoreManager.loadPlayerStats('player_0', '玩家');
    this.rankInfo = ScoreManager.getRankInfo(this.playerStats.totalScore);
  }

  create(): void {
    this.createBackground();
    this.createResultPanel();
    this.createScoreDetails();
    this.createButtons();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a5c3a, 0x0d3d24, 0x1a5c3a, 0x0d3d24);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    this.add.graphics()
      .lineStyle(3, 0x2d7a4c, 0.5)
      .strokeRoundedRect(20, 20, this.scale.width - 40, this.scale.height - 40, 25);
  }

  private createResultPanel(): void {
    const panelY = 150;
    const panelHeight = 200;

    const panel = this.add.graphics();
    panel.fillStyle(this.gameData.isPlayerWin ? 0x4caf50 : 0xf44336, 0.9);
    panel.fillRoundedRect(50, panelY, this.scale.width - 100, panelHeight, 20);
    panel.lineStyle(4, this.gameData.isPlayerWin ? 0x388e3c : 0xd32f2f, 1);
    panel.strokeRoundedRect(50, panelY, this.scale.width - 100, panelHeight, 20);

    const icon = this.gameData.isPlayerWin ? '🎉' : '😢';
    this.add.text(this.scale.width / 2, panelY + 50, icon, {
      font: '60px Arial'
    }).setOrigin(0.5);

    const resultText = this.gameData.isPlayerWin ? '恭喜获胜！' : '很遗憾，输了...';
    this.add.text(this.scale.width / 2, panelY + 110, resultText, {
      font: 'bold 32px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const winnerText = this.gameData.winner === 'landlord' 
      ? `地主 ${this.gameData.winnerName} 获胜` 
      : `农民 ${this.gameData.winnerName} 获胜`;
    
    this.add.text(this.scale.width / 2, panelY + 155, winnerText, {
      font: '18px Arial',
      color: '#e8f5e9'
    }).setOrigin(0.5);
  }

  private createScoreDetails(): void {
    const startY = 400;
    const height = 280;

    const panel = this.add.graphics();
    panel.fillStyle(0x14522a, 0.9);
    panel.fillRoundedRect(50, startY, this.scale.width - 100, height, 15);
    panel.lineStyle(2, 0x3d8c5a, 0.6);
    panel.strokeRoundedRect(50, startY, this.scale.width - 100, height, 15);

    this.add.text(this.scale.width / 2, startY + 25, '比赛详情', {
      font: 'bold 22px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    let y = startY + 60;
    const leftX = 80;
    const rightX = this.scale.width - 80;

    const details = [
      { label: '玩家身份', value: this.gameData.playerIsLandlord ? '地主' : '农民' },
      { label: '基础分', value: this.gameData.baseScore.toString() },
      { label: '当前倍数', value: `${this.gameData.multiplier}倍` },
      { label: '积分变化', value: this.gameData.scoreChange > 0 ? `+${this.gameData.scoreChange}` : this.gameData.scoreChange.toString() }
    ];

    details.forEach((detail, index) => {
      const itemY = y + index * 50;
      
      this.add.text(leftX, itemY, detail.label, {
        font: '18px Arial',
        color: '#a5d6a7'
      });

      const valueColor = detail.label === '积分变化' 
        ? (this.gameData.scoreChange > 0 ? '#4caf50' : '#f44336')
        : '#ffffff';

      this.add.text(rightX, itemY, detail.value, {
        font: 'bold 18px Arial',
        color: valueColor
      }).setOrigin(1, 0);
    });

    const dividerY = y + 200;
    this.add.graphics()
      .lineStyle(1, 0x3d8c5a, 0.4)
      .lineBetween(70, dividerY, this.scale.width - 70, dividerY);

    this.add.text(leftX, dividerY + 25, `当前段位: ${this.rankInfo.icon} ${this.rankInfo.name}`, {
      font: '18px Arial',
      color: '#ffd700'
    });

    this.add.text(rightX, dividerY + 25, `总积分: ${this.playerStats.totalScore}`, {
      font: 'bold 18px Arial',
      color: '#ffffff'
    }).setOrigin(1, 0);
  }

  private createButtons(): void {
    const y = 730;
    const buttonWidth = (this.scale.width - 140) / 2;
    const spacing = 40;

    const againX = 50;
    const againButton = this.add.graphics();
    againButton.fillStyle(0xff6b35, 1);
    againButton.fillRoundedRect(againX, y, buttonWidth, 60, 12);

    this.add.text(againX + buttonWidth / 2, y + 30, '再来一局', {
      font: 'bold 22px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const againZone = this.add.zone(againX + buttonWidth / 2, y + 30, buttonWidth, 60);
    againZone.setInteractive();
    againZone.on('pointerdown', () => {
      this.scene.start('GameScene', {
        difficulty: Difficulty.MEDIUM,
        playerName: '玩家'
      });
    });

    const menuX = againX + buttonWidth + spacing;
    const menuButton = this.add.graphics();
    menuButton.fillStyle(0x757575, 1);
    menuButton.fillRoundedRect(menuX, y, buttonWidth, 60, 12);

    this.add.text(menuX + buttonWidth / 2, y + 30, '返回菜单', {
      font: 'bold 22px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const menuZone = this.add.zone(menuX + buttonWidth / 2, y + 30, buttonWidth, 60);
    menuZone.setInteractive();
    menuZone.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    const statsY = 830;
    this.add.text(this.scale.width / 2, statsY, `战绩: ${this.playerStats.wins}胜 ${this.playerStats.losses}负`, {
      font: '16px Arial',
      color: '#a5d6a7'
    }).setOrigin(0.5);

    if (this.playerStats.currentWinStreak > 1) {
      this.add.text(this.scale.width / 2, statsY + 30, `🔥 当前连胜: ${this.playerStats.currentWinStreak}局`, {
        font: 'bold 16px Arial',
        color: '#ffd700'
      }).setOrigin(0.5);
    }
  }
}
