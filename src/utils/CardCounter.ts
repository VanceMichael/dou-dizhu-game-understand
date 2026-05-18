import { ICard, CardRank } from '../types';
import { Card } from './Card';

export interface ICardCount {
  rank: CardRank;
  rankName: string;
  total: number;
  played: number;
  remaining: number;
  remainingCards: ICard[];
}

export class CardCounter {
  private playedCards: ICard[] = [];
  private allCards: ICard[] = [];

  constructor(allCards: ICard[]) {
    this.allCards = allCards;
  }

  reset(allCards?: ICard[]): void {
    this.playedCards = [];
    if (allCards) {
      this.allCards = allCards;
    }
  }

  addPlayedCards(cards: ICard[]): void {
    for (const card of cards) {
      if (!this.playedCards.some(c => c.id === card.id)) {
        this.playedCards.push(card);
      }
    }
  }

  getCardCounts(): ICardCount[] {
    const counts: ICardCount[] = [];
    
    const allRanks = [
      CardRank.THREE, CardRank.FOUR, CardRank.FIVE, CardRank.SIX,
      CardRank.SEVEN, CardRank.EIGHT, CardRank.NINE, CardRank.TEN,
      CardRank.JACK, CardRank.QUEEN, CardRank.KING, CardRank.ACE,
      CardRank.TWO, CardRank.JOKER_SMALL, CardRank.JOKER_BIG
    ];

    for (const rank of allRanks) {
      const totalCards = this.allCards.filter(c => c.value === rank);
      const played = this.playedCards.filter(c => c.value === rank);
      const remaining = totalCards.filter(c => !played.some(p => p.id === c.id));
      
      counts.push({
        rank,
        rankName: Card.getRankName(rank),
        total: totalCards.length,
        played: played.length,
        remaining: remaining.length,
        remainingCards: remaining
      });
    }

    return counts;
  }

  getRemainingCardCount(rank: CardRank): number {
    const totalCards = this.allCards.filter(c => c.value === rank);
    const played = this.playedCards.filter(c => c.value === rank);
    return totalCards.length - played.length;
  }

  getPlayedCards(): ICard[] {
    return [...this.playedCards];
  }

  getRemainingCards(): ICard[] {
    return this.allCards.filter(c => !this.playedCards.some(p => p.id === c.id));
  }

  hasCardBeenPlayed(card: ICard): boolean {
    return this.playedCards.some(c => c.id === card.id);
  }

  getBombsPlayed(): number {
    const valueCounts: Record<number, number> = {};
    for (const card of this.playedCards) {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    }
    
    let bombs = 0;
    for (const count of Object.values(valueCounts)) {
      if (count === 4) bombs++;
    }
    
    const hasSmallJoker = this.playedCards.some(c => c.value === CardRank.JOKER_SMALL);
    const hasBigJoker = this.playedCards.some(c => c.value === CardRank.JOKER_BIG);
    if (hasSmallJoker && hasBigJoker) {
      bombs++;
    }
    
    return bombs;
  }

  getBombsRemaining(): number {
    const remainingCards = this.getRemainingCards();
    const valueCounts: Record<number, number> = {};
    for (const card of remainingCards) {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    }
    
    let bombs = 0;
    for (const count of Object.values(valueCounts)) {
      if (count === 4) bombs++;
    }
    
    const hasSmallJoker = remainingCards.some(c => c.value === CardRank.JOKER_SMALL);
    const hasBigJoker = remainingCards.some(c => c.value === CardRank.JOKER_BIG);
    if (hasSmallJoker && hasBigJoker) {
      bombs++;
    }
    
    return bombs;
  }
}
