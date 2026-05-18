import Phaser from 'phaser';
import { ICard, IPlayer, Difficulty, PlayerPosition, CardRank, CardSuit } from '../types';
import { Card } from '../utils/Card';
import { Deck } from '../utils/Deck';
import { GameEngine } from '../utils/GameEngine';
import { CardCounter, ICardCount } from '../utils/CardCounter';
import { AutoPlayManager } from '../utils/AutoPlayManager';
import { ScoreManager } from '../utils/ScoreManager';

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = Difficulty.MEDIUM;
  private playerName: string = '玩家';
  private gameEngine!: GameEngine;
  private cardCounter!: CardCounter;
  private autoPlayManager!: AutoPlayManager;
  
  private players: IPlayer[] = [];
  private landlordCards: ICard[] = [];
  private landlordIndex: number = -1;
  private currentPlayerIndex: number = 0;
  private lastPlayedCards: ICard[] = [];
  private lastPlayerIndex: number = -1;
  private baseScore: number = 100;
  private multiplier: number = 1;
  private gamePhase: 'idle' | 'dealing' | 'bidding' | 'robbing' | 'playing' | 'gameOver' = 'idle';
  
  private selectedCards: ICard[] = [];
  private cardSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerCardSprites: Map<number, Phaser.GameObjects.Container[]> = new Map();
  private cardHitZones: Map<string, Phaser.GameObjects.Zone> = new Map();
  
  private aiTimer?: Phaser.Time.TimerEvent;
  private playerStats!: ReturnType<typeof ScoreManager.getDefaultPlayerStats>;

  private bidButtons: Phaser.GameObjects.GameObject[] = [];
  private robButtons: Phaser.GameObjects.GameObject[] = [];
  private cardCounterElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { difficulty?: Difficulty; playerName?: string }): void {
    this.difficulty = data.difficulty || Difficulty.MEDIUM;
    this.playerName = data.playerName || '玩家';
    this.gameEngine = new GameEngine(this.difficulty);
    this.autoPlayManager = new AutoPlayManager(this.difficulty);
    this.playerStats = ScoreManager.loadPlayerStats('player_0', this.playerName);
  }

  create(): void {
    this.createBackground();
    this.createUI();
    this.startGame();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a5c3a, 0x0d3d24, 0x1a5c3a, 0x0d3d24);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    this.add.graphics()
      .lineStyle(3, 0x2d7a4c, 0.5)
      .strokeRoundedRect(20, 20, this.scale.width - 40, this.scale.height - 40, 25);
  }

  private createUI(): void {
    const backBtn = this.add.graphics();
    backBtn.fillStyle(0x555555, 0.8);
    backBtn.fillRoundedRect(30, 30, 60, 40, 8);
    
    this.add.text(60, 50, '返回', {
      font: '16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const backZone = this.add.zone(60, 50, 60, 40);
    backZone.setInteractive();
    backZone.on('pointerdown', () => {
      if (this.aiTimer) {
        this.aiTimer.destroy();
      }
      this.scene.start('MenuScene');
    });

    this.add.text(this.scale.width / 2, 50, '斗地主', {
      font: 'bold 24px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(this.scale.width - 100, 45, `${this.multiplier}倍`, {
      font: 'bold 18px Arial',
      color: '#ff6b35'
    }).setOrigin(0.5);

    this.createAutoPlayButton();
    this.createCardCounterButton();
  }

  private createAutoPlayButton(): void {
    const x = this.scale.width - 90;
    const y = 80;
    const isEnabled = this.autoPlayManager.isAutoPlayEnabled();

    const button = this.add.graphics();
    button.fillStyle(isEnabled ? 0x4caf50 : 0x666666, 1);
    button.fillRoundedRect(x, y, 70, 35, 8);

    this.add.text(x + 35, y + 17, isEnabled ? '托管中' : '托管', {
      font: '14px Arial',
      color: '#ffffff'
    }).setOrigin(0.5).setData('autoPlayText', true);

    const hitZone = this.add.zone(x + 35, y + 17, 70, 35);
    hitZone.setInteractive();
    hitZone.on('pointerdown', () => {
      this.autoPlayManager.toggle();
      this.updateAutoPlayButton();
      
      if (this.autoPlayManager.isAutoPlayEnabled() && this.gamePhase === 'playing') {
        this.checkAutoPlay();
      }
    });
  }

  private updateAutoPlayButton(): void {
    this.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Text && child.getData('autoPlayText')) {
        child.destroy();
      }
    });
    this.createAutoPlayButton();
  }

  private createCardCounterButton(): void {
    const x = 30;
    const y = 80;

    const button = this.add.graphics();
    button.fillStyle(0x2196f3, 0.8);
    button.fillRoundedRect(x, y, 70, 35, 8);

    this.add.text(x + 35, y + 17, '记牌器', {
      font: '14px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(x + 35, y + 17, 70, 35);
    hitZone.setInteractive();
    hitZone.on('pointerdown', () => {
      this.showCardCounter();
    });
  }

  private showCardCounter(): void {
    if (!this.cardCounter) return;

    const cardCounts = this.cardCounter.getCardCounts();
    
    this.cardCounterElements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.cardCounterElements.push(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0x14522a, 1);
    panel.fillRoundedRect(50, 200, this.scale.width - 100, 800, 20);
    panel.lineStyle(3, 0x4caf50, 0.6);
    panel.strokeRoundedRect(50, 200, this.scale.width - 100, 800, 20);
    this.cardCounterElements.push(panel);

    const title = this.add.text(this.scale.width / 2, 240, '📊 记牌器', {
      font: 'bold 28px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);
    this.cardCounterElements.push(title);

    this.cardCounterElements.push(
      this.add.text(80, 280, '牌型', {
        font: 'bold 18px Arial',
        color: '#ffd700'
      })
    );
    this.cardCounterElements.push(
      this.add.text(300, 280, '剩余', {
        font: 'bold 18px Arial',
        color: '#ffd700'
      })
    );
    this.cardCounterElements.push(
      this.add.text(420, 280, '已出', {
        font: 'bold 18px Arial',
        color: '#ffd700'
      })
    );
    this.cardCounterElements.push(
      this.add.text(540, 280, '总数', {
        font: 'bold 18px Arial',
        color: '#ffd700'
      })
    );

    let y = 320;
    cardCounts.forEach((count: ICardCount) => {
      this.cardCounterElements.push(
        this.add.text(80, y, count.rankName, {
          font: '18px Arial',
          color: '#ffffff'
        })
      );

      const remainingColor = count.remaining === 0 ? '#ff5252' : 
                            count.remaining === count.total ? '#4caf50' : '#ffd700';
      this.cardCounterElements.push(
        this.add.text(300, y, count.remaining.toString(), {
          font: 'bold 18px Arial',
          color: remainingColor
        })
      );

      this.cardCounterElements.push(
        this.add.text(420, y, count.played.toString(), {
          font: '18px Arial',
          color: '#c8e6c9'
        })
      );

      this.cardCounterElements.push(
        this.add.text(540, y, count.total.toString(), {
          font: '18px Arial',
          color: '#a5d6a7'
        })
      );

      y += 35;
    });

    const bombsPlayed = this.cardCounter.getBombsPlayed();
    const bombsRemaining = this.cardCounter.getBombsRemaining();
    
    this.cardCounterElements.push(
      this.add.text(80, y + 20, `💣 炸弹: 已出 ${bombsPlayed} | 剩余 ${bombsRemaining}`, {
        font: 'bold 18px Arial',
        color: '#ff6b35'
      })
    );

    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0xff6b35, 1);
    closeBtn.fillRoundedRect(this.scale.width / 2 - 80, 920, 160, 50, 10);
    this.cardCounterElements.push(closeBtn);
    
    const closeText = this.add.text(this.scale.width / 2, 945, '关闭', {
      font: 'bold 20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.cardCounterElements.push(closeText);

    const closeZone = this.add.zone(this.scale.width / 2, 945, 160, 50);
    closeZone.setInteractive();
    closeZone.on('pointerdown', () => {
      this.cardCounterElements.forEach(element => {
        if (element && element.active !== false) {
          element.destroy();
        }
      });
      closeZone.destroy();
      this.cardCounterElements = [];
    });
  }

  private startGame(): void {
    this.gamePhase = 'dealing';
    
    const deck = new Deck();
    const { players, landlordCards } = deck.deal();
    
    this.cardCounter = new CardCounter(deck.getCards());

    this.players = [
      {
        id: 'player_0',
        position: PlayerPosition.BOTTOM,
        name: this.playerName,
        cards: Card.sortDesc(players[0]),
        isLandlord: false,
        isAI: false,
        isAutoPlay: false,
        score: 0
      },
      {
        id: 'player_1',
        position: PlayerPosition.LEFT,
        name: 'AI-东方',
        cards: Card.sortDesc(players[1]),
        isLandlord: false,
        isAI: true,
        isAutoPlay: true,
        score: 0
      },
      {
        id: 'player_2',
        position: PlayerPosition.RIGHT,
        name: 'AI-西方',
        cards: Card.sortDesc(players[2]),
        isLandlord: false,
        isAI: true,
        isAutoPlay: true,
        score: 0
      }
    ];

    this.landlordCards = landlordCards;
    this.currentPlayerIndex = Math.floor(Math.random() * 3);
    this.multiplier = 1;

    this.renderPlayers();
    this.showGameMessage('发牌中...');

    this.time.delayedCall(1500, () => {
      this.startBidding();
    });
  }

  private renderPlayers(): void {
    this.players.forEach((player, index) => {
      this.renderPlayerCards(player, index);
      this.renderPlayerInfo(player, index);
    });
  }

  private renderPlayerCards(player: IPlayer, playerIndex: number): void {
    const cardWidth = 80;
    const cardHeight = 110;
    const overlap = 30;

    if (playerIndex === 0) {
      const totalWidth = (player.cards.length - 1) * overlap + cardWidth;
      const startX = (this.scale.width - totalWidth) / 2;
      const y = this.scale.height - 220;

      for (let i = 0; i < player.cards.length; i++) {
        const card = player.cards[i];
        const x = startX + i * overlap;
        const isLastCard = i === player.cards.length - 1;
        this.createCardSprite(card, x, y, playerIndex, i, true, isLastCard);
      }
    } else if (playerIndex === 1) {
      const x = 30;
      const startY = 300;
      const overlapY = 25;

      player.cards.forEach((_, index) => {
        const y = startY + index * overlapY;
        this.createCardBack(x, y, playerIndex, index);
      });
    } else {
      const x = this.scale.width - 80;
      const startY = 300;
      const overlapY = 25;

      player.cards.forEach((_, index) => {
        const y = startY + index * overlapY;
        this.createCardBack(x, y, playerIndex, index);
      });
    }
  }

  private createCardSprite(
    card: ICard,
    x: number,
    y: number,
    playerIndex: number,
    cardIndex: number,
    isSelectable: boolean,
    isLastCard: boolean = false
  ): void {
    const container = this.add.container(x, y);
    const cardWidth = 80;
    const cardHeight = 110;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
    bg.lineStyle(2, 0xcccccc, 1);
    bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 8);
    container.add(bg);

    const isRed = card.suit === CardSuit.HEART || card.suit === CardSuit.DIAMOND || 
                  card.suit === CardSuit.JOKER_RED;
    const textColor = isRed ? '#e53935' : '#212121';

    const rankName = Card.getRankName(card.rank);
    const suitSymbol = this.getSuitSymbol(card.suit);
    
    const rankX = 8;
    const rankY = 8;
    const suitX = 8;
    const suitY = 32;
    
    const rankText = this.add.text(rankX, rankY, rankName, {
      font: 'bold 18px Arial',
      color: textColor
    });
    container.add(rankText);

    if (suitSymbol) {
      const suitText = this.add.text(suitX, suitY, suitSymbol, {
        font: '28px Arial',
        color: textColor
      });
      container.add(suitText);
    }

    if (card.rank >= CardRank.JACK && card.rank <= CardRank.KING) {
      const bigSymbol = this.add.text(cardWidth / 2, cardHeight / 2 + 15, suitSymbol, {
        font: '42px Arial',
        color: textColor
      }).setOrigin(0.5);
      container.add(bigSymbol);
    } else if (card.rank === CardRank.JOKER_SMALL || card.rank === CardRank.JOKER_BIG) {
      const bigSymbol = this.add.text(cardWidth / 2, cardHeight / 2 + 15, suitSymbol, {
        font: '42px Arial',
        color: textColor
      }).setOrigin(0.5);
      container.add(bigSymbol);
    }

    container.setSize(cardWidth, cardHeight);

    if (isSelectable) {
      const interactiveWidth = isLastCard ? cardWidth : 30;
      
      const hitZone = this.add.zone(x, y, interactiveWidth, cardHeight);
      hitZone.setOrigin(0, 0);
      hitZone.setInteractive();
      hitZone.setDepth(100 + cardIndex);
      
      this.cardHitZones.set(card.id, hitZone);
      
      hitZone.on('pointerdown', () => {
        if (this.gamePhase !== 'playing') return;
        if (this.currentPlayerIndex !== 0) return;
        if (this.autoPlayManager.isAutoPlayEnabled()) return;

        this.toggleCardSelection(card, container);
      });
    }

    this.cardSprites.set(card.id, container);
    
    if (!this.playerCardSprites.has(playerIndex)) {
      this.playerCardSprites.set(playerIndex, []);
    }
    this.playerCardSprites.get(playerIndex)!.push(container);
  }

  private getSuitSymbol(suit: CardSuit): string {
    switch (suit) {
      case CardSuit.SPADE: return '♠';
      case CardSuit.HEART: return '♥';
      case CardSuit.CLUB: return '♣';
      case CardSuit.DIAMOND: return '♦';
      case CardSuit.JOKER_BLACK: return '🃏';
      case CardSuit.JOKER_RED: return '🃏';
      default: return '';
    }
  }

  private createCardBack(x: number, y: number, playerIndex: number, cardIndex: number): void {
    const container = this.add.container(x, y);
    const cardWidth = 80;
    const cardHeight = 110;

    const bg = this.add.graphics();
    bg.fillStyle(0x2196f3, 1);
    bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
    bg.lineStyle(2, 0x1565c0, 1);
    bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 8);
    container.add(bg);

    const pattern = this.add.graphics();
    pattern.lineStyle(1, 0x64b5f6, 0.5);
    for (let i = 10; i < cardHeight - 10; i += 12) {
      pattern.lineBetween(5, i, cardWidth - 5, i);
    }
    container.add(pattern);

    const logo = this.add.text(cardWidth / 2, cardHeight / 2, '🎴', {
      font: '32px Arial'
    }).setOrigin(0.5);
    container.add(logo);

    container.setSize(cardWidth, cardHeight);

    if (!this.playerCardSprites.has(playerIndex)) {
      this.playerCardSprites.set(playerIndex, []);
    }
    this.playerCardSprites.get(playerIndex)!.push(container);
  }

  private renderPlayerInfo(player: IPlayer, playerIndex: number): void {
    let x: number, y: number;
    
    if (playerIndex === 0) {
      x = 120;
      y = this.scale.height - 80;
    } else if (playerIndex === 1) {
      x = 120;
      y = 220;
    } else {
      x = this.scale.width - 120;
      y = 220;
    }

    const nameBg = this.add.graphics();
    nameBg.fillStyle(player.isLandlord ? 0xff6b35 : 0x2d7a4c, 0.9);
    nameBg.fillRoundedRect(x - 60, y - 15, 120, 30, 8);

    const roleIcon = player.isLandlord ? '👑 地主' : '🌾 农民';
    this.add.text(x, y, `${roleIcon} ${player.name}`, {
      font: 'bold 14px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const cardCount = player.cards.length;
    this.add.text(x, y + 25, `${cardCount}张`, {
      font: '12px Arial',
      color: '#c8e6c9'
    }).setOrigin(0.5);
  }

  private toggleCardSelection(card: ICard, container: Phaser.GameObjects.Container): void {
    const isSelected = this.selectedCards.some(c => c.id === card.id);
    const hitZone = this.cardHitZones.get(card.id);

    if (isSelected) {
      this.selectedCards = this.selectedCards.filter(c => c.id !== card.id);
      container.y += 30;
      if (hitZone) {
        hitZone.y += 30;
      }
    } else {
      this.selectedCards.push(card);
      container.y -= 30;
      if (hitZone) {
        hitZone.y -= 30;
      }
    }
  }

  private clearCardSelection(): void {
    this.selectedCards.forEach(card => {
      const sprite = this.cardSprites.get(card.id);
      if (sprite) {
        sprite.y += 30;
      }
      const hitZone = this.cardHitZones.get(card.id);
      if (hitZone) {
        hitZone.y += 30;
      }
    });
    this.selectedCards = [];
  }

  private startBidding(): void {
    this.clearBidButtons();
    this.clearRobButtons();
    
    this.gamePhase = 'bidding';
    this.showGameMessage('开始叫地主');

    this.createBidButtons();

    if (this.currentPlayerIndex !== 0) {
      this.processAIBid();
    }
  }

  private createBidButtons(): void {
    this.clearBidButtons();
    
    const y = this.scale.height - 320;
    const buttonWidth = 140;
    const spacing = 20;

    const bids = [
      { score: 100, label: '100分' },
      { score: 200, label: '200分' },
      { score: 300, label: '300分' }
    ];

    const startX = (this.scale.width - (buttonWidth * 3 + spacing * 2)) / 2;

    bids.forEach((bid, index) => {
      const x = startX + index * (buttonWidth + spacing);

      const button = this.add.graphics();
      button.fillStyle(0x4caf50, 1);
      button.fillRoundedRect(x, y, buttonWidth, 50, 10);
      this.bidButtons.push(button);

      const text = this.add.text(x + buttonWidth / 2, y + 25, bid.label, {
        font: 'bold 18px Arial',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.bidButtons.push(text);

      const hitZone = this.add.zone(x + buttonWidth / 2, y + 25, buttonWidth, 50);
      hitZone.setInteractive();
      hitZone.on('pointerdown', () => {
        if (this.gamePhase !== 'bidding' || this.currentPlayerIndex !== 0) return;
        
        this.multiplier = bid.score / 100;
        this.landlordIndex = 0;
        this.showGameMessage(`你叫了 ${bid.score} 分`);
        
        this.clearBidButtons();
        this.startRobbing();
      });
      this.bidButtons.push(hitZone);
    });

    const passX = (this.scale.width - buttonWidth) / 2;
    const passY = y + 70;

    const passButton = this.add.graphics();
    passButton.fillStyle(0x757575, 1);
    passButton.fillRoundedRect(passX, passY, buttonWidth, 50, 10);
    this.bidButtons.push(passButton);

    const passText = this.add.text(passX + buttonWidth / 2, passY + 25, '不叫', {
      font: 'bold 18px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.bidButtons.push(passText);

    const passZone = this.add.zone(passX + buttonWidth / 2, passY + 25, buttonWidth, 50);
    passZone.setInteractive();
    passZone.on('pointerdown', () => {
      if (this.gamePhase !== 'bidding' || this.currentPlayerIndex !== 0) return;
      
      this.showGameMessage('你不叫');
      this.clearBidButtons();
      
      this.currentPlayerIndex = 1;
      this.processAIBid();
    });
    this.bidButtons.push(passZone);
  }

  private clearBidButtons(): void {
    this.bidButtons.forEach(btn => {
      if (btn && btn.active !== false) {
        btn.destroy();
      }
    });
    this.bidButtons = [];
  }

  private processAIBid(): void {
    if (this.gamePhase !== 'bidding') return;

    this.time.delayedCall(1500, () => {
      const player = this.players[this.currentPlayerIndex];
      const decision = this.gameEngine.getAIBidDecision(player, this.multiplier * 100, this.currentPlayerIndex);

      if (decision.action === 'bid') {
        this.multiplier = decision.score / 100;
        this.landlordIndex = this.currentPlayerIndex;
        this.showGameMessage(`${player.name} 叫了 ${decision.score} 分`);
        
        this.startRobbing();
      } else {
        this.showGameMessage(`${player.name} 不叫`);
        
        const nextPlayer = (this.currentPlayerIndex + 1) % 3;
        
        if (nextPlayer === 0) {
          this.currentPlayerIndex = nextPlayer;
          this.createBidButtons();
        } else {
          this.currentPlayerIndex = nextPlayer;
          this.processAIBid();
        }
      }
    });
  }

  private startRobbing(): void {
    this.clearBidButtons();
    
    this.gamePhase = 'robbing';
    this.showGameMessage('是否抢地主？');

    if (this.landlordIndex === -1) {
      this.showGameMessage('无人叫地主，重新发牌...');
      this.time.delayedCall(2000, () => {
        this.scene.restart({ difficulty: this.difficulty, playerName: this.playerName });
      });
      return;
    }

    this.currentPlayerIndex = (this.landlordIndex + 1) % 3;
    
    if (this.currentPlayerIndex === 0) {
      this.createRobButtons();
    } else {
      this.processAIRob();
    }
  }

  private createRobButtons(): void {
    this.clearRobButtons();
    
    const y = this.scale.height - 250;
    const buttonWidth = 140;
    const spacing = 40;

    const robX = (this.scale.width - buttonWidth * 2 - spacing) / 2;

    const robButton = this.add.graphics();
    robButton.fillStyle(0xff6b35, 1);
    robButton.fillRoundedRect(robX, y, buttonWidth, 50, 10);
    this.robButtons.push(robButton);

    const robText = this.add.text(robX + buttonWidth / 2, y + 25, '抢地主', {
      font: 'bold 18px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.robButtons.push(robText);

    const robZone = this.add.zone(robX + buttonWidth / 2, y + 25, buttonWidth, 50);
    robZone.setInteractive();
    robZone.on('pointerdown', () => {
      if (this.gamePhase !== 'robbing') return;
      
      this.multiplier *= 2;
      this.landlordIndex = 0;
      this.showGameMessage('你抢了地主！');
      
      this.clearRobButtons();
      
      const nextPlayer = (this.currentPlayerIndex + 1) % 3;
      if (nextPlayer === this.landlordIndex) {
        this.becomeLandlord(this.landlordIndex);
      } else if (nextPlayer === 0) {
        this.currentPlayerIndex = nextPlayer;
        this.createRobButtons();
      } else {
        this.currentPlayerIndex = nextPlayer;
        this.processAIRob();
      }
    });
    this.robButtons.push(robZone);

    const passX = robX + buttonWidth + spacing;

    const passButton = this.add.graphics();
    passButton.fillStyle(0x757575, 1);
    passButton.fillRoundedRect(passX, y, buttonWidth, 50, 10);
    this.robButtons.push(passButton);

    const passText = this.add.text(passX + buttonWidth / 2, y + 25, '不抢', {
      font: 'bold 18px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.robButtons.push(passText);

    const passZone = this.add.zone(passX + buttonWidth / 2, y + 25, buttonWidth, 50);
    passZone.setInteractive();
    passZone.on('pointerdown', () => {
      if (this.gamePhase !== 'robbing') return;
      
      this.showGameMessage('你不抢');
      this.clearRobButtons();
      
      const nextPlayer = (this.currentPlayerIndex + 1) % 3;
      if (nextPlayer === this.landlordIndex) {
        this.becomeLandlord(this.landlordIndex);
      } else if (nextPlayer === 0) {
        this.currentPlayerIndex = nextPlayer;
        this.createRobButtons();
      } else {
        this.currentPlayerIndex = nextPlayer;
        this.processAIRob();
      }
    });
    this.robButtons.push(passZone);
  }

  private clearRobButtons(): void {
    this.robButtons.forEach(btn => {
      if (btn && btn.active !== false) {
        btn.destroy();
      }
    });
    this.robButtons = [];
  }

  private processAIRob(): void {
    if (this.gamePhase !== 'robbing') return;

    this.time.delayedCall(1500, () => {
      if (this.gamePhase !== 'robbing') return;
      
      const player = this.players[this.currentPlayerIndex];
      const decision = this.gameEngine.getAIRobDecision(player, this.landlordIndex, this.currentPlayerIndex);

      if (decision.action === 'rob') {
        if (this.gamePhase !== 'robbing') return;
        
        this.multiplier *= 2;
        this.landlordIndex = this.currentPlayerIndex;
        this.showGameMessage(`${player.name} 抢了地主！`);
        
        this.becomeLandlord(this.currentPlayerIndex);
      } else {
        if (this.gamePhase !== 'robbing') return;
        
        this.showGameMessage(`${player.name} 不抢`);
        
        const nextPlayer = (this.currentPlayerIndex + 1) % 3;
        
        if (nextPlayer === this.landlordIndex) {
          this.becomeLandlord(this.landlordIndex);
        } else if (nextPlayer === 0) {
          this.currentPlayerIndex = nextPlayer;
          this.createRobButtons();
        } else {
          this.currentPlayerIndex = nextPlayer;
          this.processAIRob();
        }
      }
    });
  }

  private becomeLandlord(playerIndex: number): void {
    this.clearBidButtons();
    this.clearRobButtons();
    
    this.players.forEach((p, i) => {
      p.isLandlord = i === playerIndex;
      if (i === playerIndex) {
        p.cards = Card.sortDesc([...p.cards, ...this.landlordCards]);
      }
    });

    this.currentPlayerIndex = playerIndex;
    this.gamePhase = 'playing';

    this.clearPlayerCards();
    this.renderPlayers();
    this.showLandlordCards();

    this.createPlayButtons();

    this.showGameMessage(`${this.players[playerIndex].name} 成为地主！`);

    this.time.delayedCall(2000, () => {
      if (this.currentPlayerIndex !== 0) {
        this.processAIPlay();
      } else if (this.autoPlayManager.isAutoPlayEnabled()) {
        this.checkAutoPlay();
      }
    });
  }

  private showLandlordCards(): void {
    const overlap = 35;
    const cardWidth = 80;
    const cardHeight = 110;
    const totalWidth = (this.landlordCards.length - 1) * overlap + cardWidth;
    const x = (this.scale.width - totalWidth) / 2;
    const y = 380;

    this.landlordCards.forEach((card, index) => {
      const container = this.add.container(x + index * overlap, y);

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
      bg.lineStyle(2, 0xffd700, 1);
      bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 8);
      container.add(bg);

      const isRed = card.suit === CardSuit.HEART || card.suit === CardSuit.DIAMOND || 
                    card.suit === CardSuit.JOKER_RED;
      const textColor = isRed ? '#e53935' : '#212121';
      const rankName = Card.getRankName(card.rank);

      const rankText = this.add.text(8, 8, rankName, {
        font: 'bold 18px Arial',
        color: textColor
      });
      container.add(rankText);

      const suitSymbol = this.getSuitSymbol(card.suit);
      if (suitSymbol) {
        const suitText = this.add.text(8, 32, suitSymbol, {
          font: '28px Arial',
          color: textColor
        });
        container.add(suitText);
      }

      container.setSize(cardWidth, cardHeight);
    });

    this.add.text(this.scale.width / 2, y - 25, '地主牌', {
      font: 'bold 16px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);
  }

  private clearPlayerCards(): void {
    this.cardSprites.forEach(sprite => sprite.destroy());
    this.cardSprites.clear();
    
    this.playerCardSprites.forEach(sprites => {
      sprites.forEach(s => s.destroy());
    });
    this.playerCardSprites.clear();
    
    this.cardHitZones.forEach(hitZone => hitZone.destroy());
    this.cardHitZones.clear();
  }

  private createPlayButtons(): void {
    const y = this.scale.height - 100;
    const buttonWidth = 100;
    const spacing = 20;

    const startX = (this.scale.width - buttonWidth * 3 - spacing * 2) / 2;

    const hintButton = this.add.graphics();
    hintButton.fillStyle(0x9c27b0, 0.9);
    hintButton.fillRoundedRect(startX, y, buttonWidth, 45, 8);

    this.add.text(startX + buttonWidth / 2, y + 22, '提示', {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5).setData('playButtonText', true);

    const hintZone = this.add.zone(startX + buttonWidth / 2, y + 22, buttonWidth, 45);
    hintZone.setInteractive();
    hintZone.on('pointerdown', () => {
      if (this.gamePhase !== 'playing' || this.currentPlayerIndex !== 0) return;
      if (this.autoPlayManager.isAutoPlayEnabled()) return;
      
      this.showHint();
    });

    const playX = startX + buttonWidth + spacing;

    const playButton = this.add.graphics();
    playButton.fillStyle(0x4caf50, 0.9);
    playButton.fillRoundedRect(playX, y, buttonWidth, 45, 8);

    this.add.text(playX + buttonWidth / 2, y + 22, '出牌', {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5).setData('playButtonText', true);

    const playZone = this.add.zone(playX + buttonWidth / 2, y + 22, buttonWidth, 45);
    playZone.setInteractive();
    playZone.on('pointerdown', () => {
      if (this.gamePhase !== 'playing' || this.currentPlayerIndex !== 0) return;
      if (this.autoPlayManager.isAutoPlayEnabled()) return;
      if (this.selectedCards.length === 0) {
        this.showGameMessage('请选择要出的牌！');
        return;
      }

      const canPlay = this.gameEngine.canPlayCards(
        this.selectedCards,
        this.lastPlayedCards,
        this.lastPlayerIndex,
        0
      );

      if (!canPlay) {
        this.showGameMessage('牌型不正确或不能大过上家！');
        return;
      }

      this.playCards(0, this.selectedCards);
    });

    const passX = playX + buttonWidth + spacing;

    const passButton = this.add.graphics();
    passButton.fillStyle(0x757575, 0.9);
    passButton.fillRoundedRect(passX, y, buttonWidth, 45, 8);

    this.add.text(passX + buttonWidth / 2, y + 22, '不出', {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5).setData('playButtonText', true);

    const passZone = this.add.zone(passX + buttonWidth / 2, y + 22, buttonWidth, 45);
    passZone.setInteractive();
    passZone.on('pointerdown', () => {
      if (this.gamePhase !== 'playing' || this.currentPlayerIndex !== 0) return;
      if (this.autoPlayManager.isAutoPlayEnabled()) return;
      
      if (this.lastPlayedCards.length === 0 || this.lastPlayerIndex === 0) {
        this.showGameMessage('你必须出牌！');
        return;
      }

      this.pass(0);
    });
  }

  private showHint(): void {
    const player = this.players[0];
    const otherPlayers = this.players.filter((_, i) => i !== 0);

    const decision = this.gameEngine.getAIDecision(
      player,
      this.lastPlayedCards,
      this.lastPlayerIndex,
      0,
      this.cardCounter.getPlayedCards(),
      otherPlayers
    );

    if (decision.action === 'play' && decision.cards) {
      this.clearCardSelection();
      
      decision.cards.forEach(card => {
        const sprite = this.cardSprites.get(card.id);
        if (sprite) {
          this.selectedCards.push(card);
          sprite.y -= 30;
        }
      });

      this.showGameMessage('提示选择了推荐牌型');
    } else {
      this.showGameMessage('建议不出');
    }
  }

  private playCards(playerIndex: number, cards: ICard[]): void {
    const player = this.players[playerIndex];
    
    player.cards = player.cards.filter(c => !cards.some(ec => ec.id === c.id));
    
    this.cardCounter.addPlayedCards(cards);

    this.lastPlayedCards = cards;
    this.lastPlayerIndex = playerIndex;

    this.showPlayedCards(playerIndex, cards);

    this.clearCardSelection();

    this.showGameMessage(`${player.name} 出牌`);

    if (player.cards.length === 0) {
      this.endGame(player.isLandlord ? 'landlord' : 'farmer');
      return;
    }

    this.currentPlayerIndex = (playerIndex + 1) % 3;

    this.clearPlayerCards();
    this.renderPlayers();

    this.time.delayedCall(1500, () => {
      if (this.currentPlayerIndex !== 0) {
        this.processAIPlay();
      } else if (this.autoPlayManager.isAutoPlayEnabled()) {
        this.checkAutoPlay();
      }
    });
  }

  private pass(playerIndex: number): void {
    const player = this.players[playerIndex];

    this.showGameMessage(`${player.name} 不出`);

    this.currentPlayerIndex = (playerIndex + 1) % 3;

    this.time.delayedCall(1000, () => {
      if (this.currentPlayerIndex === this.lastPlayerIndex) {
        this.lastPlayedCards = [];
        this.lastPlayerIndex = -1;
        this.showGameMessage('新一轮出牌');
      }

      if (this.currentPlayerIndex !== 0) {
        this.processAIPlay();
      } else if (this.autoPlayManager.isAutoPlayEnabled()) {
        this.checkAutoPlay();
      }
    });
  }

  private showPlayedCards(playerIndex: number, cards: ICard[]): void {
    let x: number, y: number;

    if (playerIndex === 0) {
      x = this.scale.width / 2;
      y = this.scale.height - 400;
    } else if (playerIndex === 1) {
      x = 200;
      y = this.scale.height / 2 - 50;
    } else {
      x = this.scale.width - 200;
      y = this.scale.height / 2 - 50;
    }

    const cardWidth = 80;
    const cardHeight = 110;
    const overlap = 35;
    const totalWidth = (cards.length - 1) * overlap + cardWidth;
    const startX = x - totalWidth / 2;

    cards.forEach((card, index) => {
      const container = this.add.container(startX + index * overlap, y);
      
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
      bg.lineStyle(2, 0x4caf50, 1);
      bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 8);
      container.add(bg);

      const isRed = card.suit === CardSuit.HEART || card.suit === CardSuit.DIAMOND || 
                    card.suit === CardSuit.JOKER_RED;
      const textColor = isRed ? '#e53935' : '#212121';
      const rankName = Card.getRankName(card.rank);

      const rankText = this.add.text(8, 8, rankName, {
        font: 'bold 18px Arial',
        color: textColor
      });
      container.add(rankText);

      const suitSymbol = this.getSuitSymbol(card.suit);
      if (suitSymbol) {
        const suitText = this.add.text(8, 32, suitSymbol, {
          font: '28px Arial',
          color: textColor
        });
        container.add(suitText);
      }

      container.setSize(cardWidth, cardHeight);

      this.time.delayedCall(3000, () => {
        container.destroy();
      });
    });
  }

  private processAIPlay(): void {
    if (this.gamePhase !== 'playing') return;

    this.aiTimer = this.time.delayedCall(1500, () => {
      const player = this.players[this.currentPlayerIndex];
      const otherPlayers = this.players.filter((_, i) => i !== this.currentPlayerIndex);

      const decision = this.gameEngine.getAIDecision(
        player,
        this.lastPlayedCards,
        this.lastPlayerIndex,
        this.currentPlayerIndex,
        this.cardCounter.getPlayedCards(),
        otherPlayers
      );

      if (decision.action === 'play' && decision.cards) {
        this.playCards(this.currentPlayerIndex, decision.cards);
      } else {
        if (this.lastPlayedCards.length === 0 || this.lastPlayerIndex === this.currentPlayerIndex) {
          const anyCard = player.cards[player.cards.length - 1];
          this.playCards(this.currentPlayerIndex, [anyCard]);
        } else {
          this.pass(this.currentPlayerIndex);
        }
      }
    });
  }

  private checkAutoPlay(): void {
    if (!this.autoPlayManager.isAutoPlayEnabled()) return;
    if (this.gamePhase !== 'playing') return;
    if (this.currentPlayerIndex !== 0) return;

    this.time.delayedCall(1000, () => {
      const player = this.players[0];
      const otherPlayers = this.players.filter((_, i) => i !== 0);

      const decision = this.autoPlayManager.getAutoPlayDecision(
        player.cards,
        this.lastPlayedCards,
        this.lastPlayerIndex,
        0,
        this.lastPlayedCards.length === 0 || this.lastPlayerIndex === 0,
        this.cardCounter.getPlayedCards(),
        otherPlayers.map(p => ({ playerIndex: p.position, count: p.cards.length }))
      );

      if (decision.action === 'play' && decision.cards) {
        this.playCards(0, decision.cards);
      } else {
        if (this.lastPlayedCards.length === 0 || this.lastPlayerIndex === 0) {
          const anyCard = player.cards[player.cards.length - 1];
          this.playCards(0, [anyCard]);
        } else {
          this.pass(0);
        }
      }
    });
  }

  private showGameMessage(message: string): void {
    this.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Text) {
        if (child.getData('isMessage')) {
          child.destroy();
        }
      }
    });

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(this.scale.width / 2 - 150, this.scale.height / 2 - 30, 300, 60, 15);

    const text = this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
      font: 'bold 20px Arial',
      color: '#ffd700'
    }).setOrigin(0.5);
    
    text.setData('isMessage', true);

    this.time.delayedCall(2500, () => {
      bg.destroy();
      text.destroy();
    });
  }

  private endGame(winner: 'landlord' | 'farmer'): void {
    this.gamePhase = 'gameOver';
    
    if (this.aiTimer) {
      this.aiTimer.destroy();
    }

    const isPlayerWin = (winner === 'landlord' && this.players[0].isLandlord) ||
                       (winner === 'farmer' && !this.players[0].isLandlord);

    const scoreChange = ScoreManager.calculateScoreChange(
      this.baseScore,
      this.multiplier,
      this.players[0].isLandlord,
      isPlayerWin
    );

    this.playerStats = ScoreManager.updateStats(this.playerStats, scoreChange, isPlayerWin);
    ScoreManager.savePlayerStats(this.playerStats);

    this.scene.start('GameOverScene', {
      winner,
      winnerName: winner === 'landlord' 
        ? this.players.find(p => p.isLandlord)?.name 
        : this.players.filter(p => !p.isLandlord).map(p => p.name).join('、'),
      scoreChange,
      isPlayerWin,
      baseScore: this.baseScore,
      multiplier: this.multiplier,
      playerIsLandlord: this.players[0].isLandlord
    });
  }
}
