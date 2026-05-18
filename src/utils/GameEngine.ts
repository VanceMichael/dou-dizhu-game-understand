import { ICard, IPlayer, Difficulty, GameState, RankName, IRankConfig } from '../types';
import { CardTypeChecker } from './CardTypeChecker';
import { AIController } from '../ai/AIController';
import { Card } from './Card';

export class GameEngine {
  private aiControllers: Map<number, AIController> = new Map();
  private difficulty: Difficulty;
  
  constructor(difficulty: Difficulty = Difficulty.MEDIUM) {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.aiControllers.forEach(controller => controller.setDifficulty(difficulty));
  }

  getAIController(playerIndex: number): AIController {
    if (!this.aiControllers.has(playerIndex)) {
      this.aiControllers.set(playerIndex, new AIController(this.difficulty));
    }
    return this.aiControllers.get(playerIndex)!;
  }

  canPlayCards(
    cards: ICard[],
    lastPlayedCards: ICard[],
    lastPlayerIndex: number,
    currentPlayerIndex: number
  ): boolean {
    if (lastPlayedCards.length === 0 || lastPlayerIndex === currentPlayerIndex) {
      const combo = CardTypeChecker.check(cards);
      return combo.type !== 'invalid';
    }
    return CardTypeChecker.canBeat(cards, lastPlayedCards);
  }

  getAIDecision(
    player: IPlayer,
    lastPlayedCards: ICard[],
    lastPlayerIndex: number,
    currentPlayerIndex: number,
    playedCards: ICard[],
    otherPlayers: IPlayer[]
  ): { action: 'play' | 'pass'; cards?: ICard[] } {
    const aiController = this.getAIController(player.position);
    
    const isMyTurnToStart = lastPlayedCards.length === 0 || lastPlayerIndex === currentPlayerIndex;
    
    const otherPlayersCardCounts = otherPlayers.map(p => ({
      playerIndex: p.position,
      count: p.cards.length
    }));

    const decision = aiController.decidePlay(
      player.cards,
      lastPlayedCards,
      lastPlayerIndex,
      currentPlayerIndex,
      isMyTurnToStart,
      playedCards,
      otherPlayersCardCounts
    );

    return decision;
  }

  getAIBidDecision(
    player: IPlayer,
    currentBid: number,
    playerIndex: number
  ): { action: 'bid' | 'pass'; score: number } {
    const aiController = this.getAIController(player.position);
    return aiController.decideBid(player.cards, currentBid, playerIndex);
  }

  getAIRobDecision(
    player: IPlayer,
    currentLandlordIndex: number,
    playerIndex: number
  ): { action: 'rob' | 'pass' } {
    const aiController = this.getAIController(player.position);
    return aiController.decideRob(player.cards, currentLandlordIndex, playerIndex);
  }

  checkWinCondition(players: IPlayer[]): { winner: 'landlord' | 'farmer' } | null {
    for (const player of players) {
      if (player.cards.length === 0) {
        if (player.isLandlord) {
          return { winner: 'farmer' };
        } else {
          return { winner: 'landlord' };
        }
      }
    }
    return null;
  }

  getCurrentBid(players: IPlayer[]): number {
    return 0;
  }

  sortCards(cards: ICard[]): ICard[] {
    return Card.sortDesc(cards);
  }
}

export const rankConfigs: IRankConfig[] = [
  { rank: RankName.BRONZE, name: '青铜', minScore: 0, maxScore: 999, icon: '🥉' },
  { rank: RankName.SILVER, name: '白银', minScore: 1000, maxScore: 2999, icon: '🥈' },
  { rank: RankName.GOLD, name: '黄金', minScore: 3000, maxScore: 5999, icon: '🥇' },
  { rank: RankName.PLATINUM, name: '铂金', minScore: 6000, maxScore: 9999, icon: '💎' },
  { rank: RankName.DIAMOND, name: '钻石', minScore: 10000, maxScore: 19999, icon: '💠' },
  { rank: RankName.MASTER, name: '大师', minScore: 20000, maxScore: 49999, icon: '⭐' },
  { rank: RankName.KING, name: '王者', minScore: 50000, maxScore: Infinity, icon: '👑' }
];

export function getRankByScore(score: number): IRankConfig {
  for (const config of rankConfigs) {
    if (score >= config.minScore && score <= config.maxScore) {
      return config;
    }
  }
  return rankConfigs[rankConfigs.length - 1];
}

export function getRankProgress(score: number): { currentRank: IRankConfig; nextRank: IRankConfig | null; progress: number } {
  const currentRank = getRankByScore(score);
  const currentIndex = rankConfigs.indexOf(currentRank);
  
  if (currentIndex >= rankConfigs.length - 1) {
    return {
      currentRank,
      nextRank: null,
      progress: 1
    };
  }
  
  const nextRank = rankConfigs[currentIndex + 1];
  const progress = (score - currentRank.minScore) / (currentRank.maxScore - currentRank.minScore + 1);
  
  return {
    currentRank,
    nextRank,
    progress: Math.min(1, Math.max(0, progress))
  };
}
