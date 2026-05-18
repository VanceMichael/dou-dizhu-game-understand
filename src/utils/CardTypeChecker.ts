import { CardType, ICard, ICardCombination, CardRank } from '../types';
import { Card } from './Card';

export class CardTypeChecker {
  static check(cards: ICard[]): ICardCombination {
    if (cards.length === 0) {
      return { type: CardType.INVALID, cards: [], mainValue: 0, length: 0 };
    }

    const sortedCards = Card.sortDesc(cards);
    
    if (this.isRocket(sortedCards)) {
      return {
        type: CardType.ROCKET,
        cards: sortedCards,
        mainValue: CardRank.JOKER_BIG,
        length: 2
      };
    }

    if (this.isBomb(sortedCards)) {
      return {
        type: CardType.BOMB,
        cards: sortedCards,
        mainValue: sortedCards[0].value,
        length: 4
      };
    }

    if (this.isSingle(sortedCards)) {
      return {
        type: CardType.SINGLE,
        cards: sortedCards,
        mainValue: sortedCards[0].value,
        length: 1
      };
    }

    if (this.isPair(sortedCards)) {
      return {
        type: CardType.PAIR,
        cards: sortedCards,
        mainValue: sortedCards[0].value,
        length: 2
      };
    }

    if (this.isTriple(sortedCards)) {
      return {
        type: CardType.TRIPLE,
        cards: sortedCards,
        mainValue: sortedCards[0].value,
        length: 3
      };
    }

    const tripleOne = this.isTripleOne(sortedCards);
    if (tripleOne) {
      return {
        type: CardType.TRIPLE_ONE,
        cards: sortedCards,
        mainValue: tripleOne.mainValue,
        length: 4
      };
    }

    const triplePair = this.isTriplePair(sortedCards);
    if (triplePair) {
      return {
        type: CardType.TRIPLE_PAIR,
        cards: sortedCards,
        mainValue: triplePair.mainValue,
        length: 5
      };
    }

    const straight = this.isStraight(sortedCards);
    if (straight) {
      return {
        type: CardType.STRAIGHT,
        cards: sortedCards,
        mainValue: straight.mainValue,
        length: straight.length
      };
    }

    const straightPair = this.isStraightPair(sortedCards);
    if (straightPair) {
      return {
        type: CardType.STRAIGHT_PAIR,
        cards: sortedCards,
        mainValue: straightPair.mainValue,
        length: straightPair.length
      };
    }

    const plane = this.isPlane(sortedCards);
    if (plane) {
      return {
        type: CardType.PLANE,
        cards: sortedCards,
        mainValue: plane.mainValue,
        length: plane.length
      };
    }

    const planeSingle = this.isPlaneSingle(sortedCards);
    if (planeSingle) {
      return {
        type: CardType.PLANE_SINGLE,
        cards: sortedCards,
        mainValue: planeSingle.mainValue,
        length: planeSingle.length
      };
    }

    const planePair = this.isPlanePair(sortedCards);
    if (planePair) {
      return {
        type: CardType.PLANE_PAIR,
        cards: sortedCards,
        mainValue: planePair.mainValue,
        length: planePair.length
      };
    }

    const fourTwo = this.isFourTwo(sortedCards);
    if (fourTwo) {
      return {
        type: CardType.FOUR_TWO,
        cards: sortedCards,
        mainValue: fourTwo.mainValue,
        length: 6
      };
    }

    const fourTwoPair = this.isFourTwoPair(sortedCards);
    if (fourTwoPair) {
      return {
        type: CardType.FOUR_TWO_PAIR,
        cards: sortedCards,
        mainValue: fourTwoPair.mainValue,
        length: 8
      };
    }

    return { type: CardType.INVALID, cards: sortedCards, mainValue: 0, length: 0 };
  }

  static compareCombination(a: ICardCombination, b: ICardCombination): boolean {
    if (a.type === CardType.INVALID || b.type === CardType.INVALID) {
      return false;
    }

    if (b.type === CardType.ROCKET) {
      return true;
    }

    if (a.type === CardType.ROCKET) {
      return false;
    }

    if (b.type === CardType.BOMB) {
      if (a.type !== CardType.BOMB) {
        return true;
      }
      return b.mainValue >= a.mainValue;
    }

    if (a.type === CardType.BOMB) {
      return false;
    }

    if (a.type !== b.type || a.length !== b.length) {
      return false;
    }

    switch (b.type) {
      case CardType.SINGLE:
      case CardType.PAIR:
      case CardType.TRIPLE:
      case CardType.BOMB:
      case CardType.STRAIGHT:
      case CardType.STRAIGHT_PAIR:
      case CardType.PLANE:
      case CardType.PLANE_SINGLE:
      case CardType.PLANE_PAIR:
      case CardType.TRIPLE_ONE:
      case CardType.TRIPLE_PAIR:
      case CardType.FOUR_TWO:
      case CardType.FOUR_TWO_PAIR:
        return b.mainValue > a.mainValue;
      default:
        return false;
    }
  }

  static canBeat(current: ICard[], last: ICard[]): boolean {
    if (current.length === 0) {
      return false;
    }
    if (last.length === 0) {
      const combo = this.check(current);
      return combo.type !== CardType.INVALID;
    }

    const currentCombo = this.check(current);
    const lastCombo = this.check(last);

    return this.compareCombination(lastCombo, currentCombo);
  }

  private static isRocket(cards: ICard[]): boolean {
    if (cards.length !== 2) return false;
    return (
      cards[0].value === CardRank.JOKER_BIG &&
      cards[1].value === CardRank.JOKER_SMALL
    );
  }

  private static isBomb(cards: ICard[]): boolean {
    if (cards.length !== 4) return false;
    const value = cards[0].value;
    return cards.every(c => c.value === value);
  }

  private static isSingle(cards: ICard[]): boolean {
    return cards.length === 1;
  }

  private static isPair(cards: ICard[]): boolean {
    if (cards.length !== 2) return false;
    return cards[0].value === cards[1].value;
  }

  private static isTriple(cards: ICard[]): boolean {
    if (cards.length !== 3) return false;
    const value = cards[0].value;
    return cards.every(c => c.value === value);
  }

  private static isTripleOne(cards: ICard[]): { mainValue: number } | null {
    if (cards.length !== 4) return null;
    const counts = this.getValueCounts(cards);
    const triples = Object.entries(counts).filter(([_, count]) => count === 3);
    if (triples.length === 1) {
      return { mainValue: parseInt(triples[0][0]) };
    }
    return null;
  }

  private static isTriplePair(cards: ICard[]): { mainValue: number } | null {
    if (cards.length !== 5) return null;
    const counts = this.getValueCounts(cards);
    const triples = Object.entries(counts).filter(([_, count]) => count === 3);
    const pairs = Object.entries(counts).filter(([_, count]) => count === 2);
    if (triples.length === 1 && pairs.length === 1) {
      return { mainValue: parseInt(triples[0][0]) };
    }
    return null;
  }

  private static isStraight(cards: ICard[]): { mainValue: number; length: number } | null {
    if (cards.length < 5) return null;
    
    const values = this.getUniqueValues(cards);
    if (values.length !== cards.length) return null;
    
    if (values.some(v => v >= CardRank.TWO)) return null;

    const sorted = [...values].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== 1) return null;
    }

    return { mainValue: sorted[0], length: sorted.length };
  }

  private static isStraightPair(cards: ICard[]): { mainValue: number; length: number } | null {
    if (cards.length < 6 || cards.length % 2 !== 0) return null;
    
    const counts = this.getValueCounts(cards);
    const values = Object.keys(counts).map(v => parseInt(v)).sort((a, b) => a - b);
    
    if (values.some(v => v >= CardRank.TWO)) return null;
    if (Object.values(counts).some(c => c !== 2)) return null;

    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i - 1] !== 1) return null;
    }

    return { mainValue: values[values.length - 1], length: values.length };
  }

  private static isPlane(cards: ICard[]): { mainValue: number; length: number } | null {
    if (cards.length < 6 || cards.length % 3 !== 0) return null;
    
    const counts = this.getValueCounts(cards);
    const triples = Object.entries(counts)
      .filter(([_, count]) => count === 3)
      .map(([value]) => parseInt(value))
      .sort((a, b) => a - b);
    
    if (triples.length < 2) return null;
    if (triples.some(v => v >= CardRank.TWO)) return null;

    for (let i = 1; i < triples.length; i++) {
      if (triples[i] - triples[i - 1] !== 1) return null;
    }

    if (triples.length * 3 !== cards.length) return null;

    return { mainValue: triples[triples.length - 1], length: triples.length };
  }

  private static isPlaneSingle(cards: ICard[]): { mainValue: number; length: number } | null {
    if (cards.length < 8) return null;
    
    const counts = this.getValueCounts(cards);
    const triples = Object.entries(counts)
      .filter(([_, count]) => count === 3)
      .map(([value]) => parseInt(value))
      .sort((a, b) => a - b);
    
    if (triples.length < 2) return null;
    if (triples.some(v => v >= CardRank.TWO)) return null;

    for (let i = 1; i < triples.length; i++) {
      if (triples[i] - triples[i - 1] !== 1) return null;
    }

    const singles = Object.entries(counts).filter(([_, count]) => count === 1);
    const otherTypes = Object.entries(counts).filter(
      ([_, count]) => count !== 1 && count !== 3
    );

    if (otherTypes.length > 0) return null;
    if (singles.length !== triples.length) return null;

    return { mainValue: triples[triples.length - 1], length: triples.length };
  }

  private static isPlanePair(cards: ICard[]): { mainValue: number; length: number } | null {
    if (cards.length < 10) return null;
    
    const counts = this.getValueCounts(cards);
    const triples = Object.entries(counts)
      .filter(([_, count]) => count === 3)
      .map(([value]) => parseInt(value))
      .sort((a, b) => a - b);
    
    if (triples.length < 2) return null;
    if (triples.some(v => v >= CardRank.TWO)) return null;

    for (let i = 1; i < triples.length; i++) {
      if (triples[i] - triples[i - 1] !== 1) return null;
    }

    const pairs = Object.entries(counts).filter(([_, count]) => count === 2);
    const otherTypes = Object.entries(counts).filter(
      ([_, count]) => count !== 2 && count !== 3
    );

    if (otherTypes.length > 0) return null;
    if (pairs.length !== triples.length) return null;

    return { mainValue: triples[triples.length - 1], length: triples.length };
  }

  private static isFourTwo(cards: ICard[]): { mainValue: number } | null {
    if (cards.length !== 6) return null;
    
    const counts = this.getValueCounts(cards);
    const bombs = Object.entries(counts).filter(([_, count]) => count === 4);
    
    if (bombs.length === 1) {
      return { mainValue: parseInt(bombs[0][0]) };
    }
    return null;
  }

  private static isFourTwoPair(cards: ICard[]): { mainValue: number } | null {
    if (cards.length !== 8) return null;
    
    const counts = this.getValueCounts(cards);
    const bombs = Object.entries(counts).filter(([_, count]) => count === 4);
    const pairs = Object.entries(counts).filter(([_, count]) => count === 2);
    
    if (bombs.length === 1 && pairs.length === 2) {
      return { mainValue: parseInt(bombs[0][0]) };
    }
    return null;
  }

  private static getValueCounts(cards: ICard[]): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const card of cards) {
      counts[card.value] = (counts[card.value] || 0) + 1;
    }
    return counts;
  }

  private static getUniqueValues(cards: ICard[]): number[] {
    return [...new Set(cards.map(c => c.value))];
  }
}
