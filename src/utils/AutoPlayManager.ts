import { IPlayer, ICard, Difficulty } from '../types';
import { AIController } from '../ai/AIController';

export class AutoPlayManager {
  private aiController: AIController;
  private isEnabled: boolean = false;

  constructor(difficulty: Difficulty = Difficulty.MEDIUM) {
    this.aiController = new AIController(difficulty);
  }

  setDifficulty(difficulty: Difficulty): void {
    this.aiController.setDifficulty(difficulty);
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }

  isAutoPlayEnabled(): boolean {
    return this.isEnabled;
  }

  getAutoPlayDecision(
    myCards: ICard[],
    lastPlayedCards: ICard[],
    lastPlayerIndex: number,
    myIndex: number,
    isMyTurnToStart: boolean,
    playedCards: ICard[],
    otherPlayersCardCounts: { playerIndex: number; count: number }[]
  ): { action: 'play' | 'pass'; cards?: ICard[] } {
    if (!this.isEnabled) {
      return { action: 'pass' };
    }

    return this.aiController.decidePlay(
      myCards,
      lastPlayedCards,
      lastPlayerIndex,
      myIndex,
      isMyTurnToStart,
      playedCards,
      otherPlayersCardCounts
    );
  }

  getAutoBidDecision(
    myCards: ICard[],
    currentBid: number,
    myIndex: number
  ): { action: 'bid' | 'pass'; score: number } {
    if (!this.isEnabled) {
      return { action: 'pass', score: 0 };
    }

    return this.aiController.decideBid(myCards, currentBid, myIndex);
  }

  getAutoRobDecision(
    myCards: ICard[],
    currentLandlordIndex: number,
    myIndex: number
  ): { action: 'rob' | 'pass' } {
    if (!this.isEnabled) {
      return { action: 'pass' };
    }

    return this.aiController.decideRob(myCards, currentLandlordIndex, myIndex);
  }
}
