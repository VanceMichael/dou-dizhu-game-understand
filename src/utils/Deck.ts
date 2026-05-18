import { CardSuit, CardRank, ICard } from '../types';
import { Card } from './Card';

export class Deck {
  private cards: ICard[] = [];

  constructor() {
    this.init();
  }

  private init(): void {
    this.cards = [];
    
    const suits = [CardSuit.SPADE, CardSuit.HEART, CardSuit.CLUB, CardSuit.DIAMOND];
    const ranks = [
      CardRank.THREE, CardRank.FOUR, CardRank.FIVE, CardRank.SIX, CardRank.SEVEN,
      CardRank.EIGHT, CardRank.NINE, CardRank.TEN, CardRank.JACK, CardRank.QUEEN,
      CardRank.KING, CardRank.ACE, CardRank.TWO
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(new Card(suit, rank));
      }
    }

    this.cards.push(new Card(CardSuit.JOKER_BLACK, CardRank.JOKER_SMALL));
    this.cards.push(new Card(CardSuit.JOKER_RED, CardRank.JOKER_BIG));
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(): { players: ICard[][], landlordCards: ICard[] } {
    this.shuffle();

    const player1: ICard[] = [];
    const player2: ICard[] = [];
    const player3: ICard[] = [];

    for (let i = 0; i < 51; i += 3) {
      player1.push(this.cards[i]);
      player2.push(this.cards[i + 1]);
      player3.push(this.cards[i + 2]);
    }

    const landlordCards = this.cards.slice(51, 54);

    return {
      players: [player1, player2, player3],
      landlordCards
    };
  }

  getCards(): ICard[] {
    return [...this.cards];
  }
}
