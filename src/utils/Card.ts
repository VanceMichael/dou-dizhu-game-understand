import { CardSuit, CardRank, ICard } from '../types';

export class Card implements ICard {
  suit: CardSuit;
  rank: CardRank;
  id: string;
  value: number;
  suitValue: number;

  constructor(suit: CardSuit, rank: CardRank) {
    this.suit = suit;
    this.rank = rank;
    this.id = `${suit}_${rank}`;
    this.value = rank;
    this.suitValue = this.getSuitValue(suit);
  }

  private getSuitValue(suit: CardSuit): number {
    switch (suit) {
      case CardSuit.SPADE: return 4;
      case CardSuit.HEART: return 3;
      case CardSuit.CLUB: return 2;
      case CardSuit.DIAMOND: return 1;
      case CardSuit.JOKER_BLACK: return 5;
      case CardSuit.JOKER_RED: return 6;
      default: return 0;
    }
  }

  static getRankName(rank: CardRank): string {
    switch (rank) {
      case CardRank.THREE: return '3';
      case CardRank.FOUR: return '4';
      case CardRank.FIVE: return '5';
      case CardRank.SIX: return '6';
      case CardRank.SEVEN: return '7';
      case CardRank.EIGHT: return '8';
      case CardRank.NINE: return '9';
      case CardRank.TEN: return '10';
      case CardRank.JACK: return 'J';
      case CardRank.QUEEN: return 'Q';
      case CardRank.KING: return 'K';
      case CardRank.ACE: return 'A';
      case CardRank.TWO: return '2';
      case CardRank.JOKER_SMALL: return '小王';
      case CardRank.JOKER_BIG: return '大王';
      default: return '';
    }
  }

  static compare(a: ICard, b: ICard): number {
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    return a.suitValue - b.suitValue;
  }

  static sort(cards: ICard[]): ICard[] {
    return [...cards].sort(Card.compare);
  }

  static sortDesc(cards: ICard[]): ICard[] {
    return [...cards].sort((a, b) => b.value - a.value || b.suitValue - a.suitValue);
  }
}
