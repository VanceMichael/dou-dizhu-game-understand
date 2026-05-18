import { ICard, Difficulty, ICardCombination, CardType, CardRank } from '../types';
import { CardTypeChecker } from '../utils/CardTypeChecker';
import { Card } from '../utils/Card';

export interface AIDecision {
  action: 'play' | 'pass';
  cards?: ICard[];
  bidScore?: number;
}

export class AIController {
  private difficulty: Difficulty;

  constructor(difficulty: Difficulty = Difficulty.MEDIUM) {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  decideBid(
    myCards: ICard[],
    currentBid: number,
    _myIndex: number
  ): { action: 'bid' | 'pass'; score: number } {
    const score = this.evaluateHand(myCards);
    
    switch (this.difficulty) {
      case Difficulty.EASY:
        if (score >= 70 && currentBid < 300) {
          return { action: 'bid', score: Math.min(300, currentBid + 100) };
        }
        if (score >= 40 && currentBid === 0 && Math.random() > 0.5) {
          return { action: 'bid', score: 100 };
        }
        return { action: 'pass', score: 0 };

      case Difficulty.MEDIUM:
        if (score >= 80 && currentBid < 300) {
          return { action: 'bid', score: Math.min(300, currentBid + 100) };
        }
        if (score >= 60 && currentBid < 200) {
          return { action: 'bid', score: Math.min(200, currentBid + 100) };
        }
        if (score >= 40 && currentBid === 0 && Math.random() > 0.3) {
          return { action: 'bid', score: 100 };
        }
        return { action: 'pass', score: 0 };

      case Difficulty.HARD:
        if (score >= 85 && currentBid < 300) {
          return { action: 'bid', score: Math.min(300, currentBid + 100) };
        }
        if (score >= 70 && currentBid < 200) {
          return { action: 'bid', score: Math.min(200, currentBid + 100) };
        }
        if (score >= 50 && currentBid === 0) {
          return { action: 'bid', score: 100 };
        }
        if (score >= 35 && currentBid === 0 && Math.random() > 0.5) {
          return { action: 'bid', score: 100 };
        }
        return { action: 'pass', score: 0 };
    }
  }

  decideRob(
    myCards: ICard[],
    _currentLandlordIndex: number,
    _myIndex: number
  ): { action: 'rob' | 'pass' } {
    const score = this.evaluateHand(myCards);
    
    switch (this.difficulty) {
      case Difficulty.EASY:
        if (score >= 75 && Math.random() > 0.3) {
          return { action: 'rob' };
        }
        return { action: 'pass' };

      case Difficulty.MEDIUM:
        if (score >= 70) {
          return { action: 'rob' };
        }
        if (score >= 55 && Math.random() > 0.4) {
          return { action: 'rob' };
        }
        return { action: 'pass' };

      case Difficulty.HARD:
        if (score >= 65) {
          return { action: 'rob' };
        }
        if (score >= 50 && Math.random() > 0.3) {
          return { action: 'rob' };
        }
        return { action: 'pass' };
    }
  }

  decidePlay(
    myCards: ICard[],
    lastPlayedCards: ICard[],
    lastPlayerIndex: number,
    myIndex: number,
    isMyTurnToStart: boolean,
    playedCards: ICard[],
    otherPlayersCardCounts: { playerIndex: number; count: number }[]
  ): AIDecision {
    if (isMyTurnToStart || lastPlayerIndex === myIndex || lastPlayedCards.length === 0) {
      return this.decideLeadPlay(myCards, otherPlayersCardCounts);
    }

    return this.decideFollowPlay(myCards, lastPlayedCards, otherPlayersCardCounts);
  }

  private decideLeadPlay(
    myCards: ICard[],
    otherPlayersCardCounts: { playerIndex: number; count: number }[]
  ): AIDecision {
    const combinations = this.findAllValidCombinations(myCards);
    
    if (combinations.length === 0) {
      return { action: 'play', cards: [myCards[0]] };
    }

    const sortedCombos = combinations.sort((a, b) => {
      if (a.type === CardType.ROCKET) return 1;
      if (b.type === CardType.ROCKET) return -1;
      if (a.type === CardType.BOMB) return 1;
      if (b.type === CardType.BOMB) return -1;
      return a.mainValue - b.mainValue;
    });

    const hasFewCards = otherPlayersCardCounts.some(p => p.count <= 2);
    
    for (const combo of sortedCombos) {
      if (combo.type === CardType.ROCKET && !hasFewCards) continue;
      if (combo.type === CardType.BOMB && !hasFewCards && myCards.length > 4) continue;
      
      const remainingCards = myCards.filter(c => !combo.cards.some(cc => cc.id === c.id));
      const remainingCombos = this.findAllValidCombinations(remainingCards);
      
      if (hasFewCards || remainingCards.length === 0 || remainingCombos.length > 0) {
        return { action: 'play', cards: combo.cards };
      }
    }

    return { action: 'play', cards: sortedCombos[0]?.cards || [myCards[0]] };
  }

  private decideFollowPlay(
    myCards: ICard[],
    lastPlayedCards: ICard[],
    otherPlayersCardCounts: { playerIndex: number; count: number }[]
  ): AIDecision {
    const lastCombo = CardTypeChecker.check(lastPlayedCards);
    
    if (lastCombo.type === CardType.INVALID) {
      return { action: 'pass' };
    }

    const beatingCombos = this.findBeatingCombinations(myCards, lastCombo);
    
    if (beatingCombos.length === 0) {
      return { action: 'pass' };
    }

    const hasFewCards = otherPlayersCardCounts.some(p => p.count <= 2);
    const shouldUseBomb = this.shouldUseBomb(myCards, lastCombo, hasFewCards);

    const validCombos = beatingCombos.filter(combo => {
      if (combo.type === CardType.ROCKET) {
        return hasFewCards || shouldUseBomb;
      }
      if (combo.type === CardType.BOMB) {
        return shouldUseBomb || (hasFewCards && lastCombo.type !== CardType.BOMB);
      }
      return true;
    });

    if (validCombos.length === 0) {
      return { action: 'pass' };
    }

    const sortedCombos = validCombos.sort((a, b) => {
      if (a.type === b.type) {
        return a.mainValue - b.mainValue;
      }
      if (a.type === CardType.ROCKET) return 1;
      if (b.type === CardType.ROCKET) return -1;
      if (a.type === CardType.BOMB) return 1;
      if (b.type === CardType.BOMB) return -1;
      return 0;
    });

    switch (this.difficulty) {
      case Difficulty.EASY:
        if (Math.random() > 0.3 && sortedCombos.length > 0) {
          return { action: 'play', cards: sortedCombos[0].cards };
        }
        if (Math.random() > 0.5) {
          return { action: 'pass' };
        }
        return { action: 'play', cards: sortedCombos[0].cards };

      case Difficulty.MEDIUM:
        if (hasFewCards && sortedCombos.length > 0) {
          return { action: 'play', cards: sortedCombos[0].cards };
        }
        if (Math.random() > 0.2 && sortedCombos.length > 0) {
          return { action: 'play', cards: sortedCombos[0].cards };
        }
        if (Math.random() > 0.4) {
          return { action: 'pass' };
        }
        return { action: 'play', cards: sortedCombos[0]?.cards || [] };

      case Difficulty.HARD:
        if (hasFewCards && sortedCombos.length > 0) {
          return { action: 'play', cards: sortedCombos[0].cards };
        }
        
        const nonBombCombos = sortedCombos.filter(
          c => c.type !== CardType.ROCKET
        );
        
        if (nonBombCombos.length > 0) {
          return { action: 'play', cards: nonBombCombos[0].cards };
        }
        
        if (shouldUseBomb && sortedCombos.length > 0) {
          return { action: 'play', cards: sortedCombos[0].cards };
        }
        
        return { action: 'pass' };
    }
  }

  private shouldUseBomb(
    myCards: ICard[],
    lastCombo: ICardCombination,
    hasFewCards: boolean
  ): boolean {
    const myBombs = this.findBombs(myCards);
    
    if (myBombs.length === 0) return false;

    if (hasFewCards) return true;

    if (lastCombo.type === CardType.BOMB) {
      const myBiggerBombs = myBombs.filter(b => b.mainValue > lastCombo.mainValue);
      return myBiggerBombs.length > 0;
    }

    if (lastCombo.type === CardType.ROCKET) return false;

    switch (this.difficulty) {
      case Difficulty.EASY:
        return myCards.length <= 6 && myBombs.length >= 2;
      case Difficulty.MEDIUM:
        return myCards.length <= 8 && myBombs.length >= 1;
      case Difficulty.HARD:
        return myCards.length <= 10 || myBombs.length >= 2;
    }
  }

  private findBombs(cards: ICard[]): ICardCombination[] {
    const bombs: ICardCombination[] = [];
    const valueCounts = this.getValueCounts(cards);

    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 4) {
        const bombCards = cards.filter(c => c.value === parseInt(value));
        bombs.push({
          type: CardType.BOMB,
          cards: bombCards,
          mainValue: parseInt(value),
          length: 4
        });
      }
    }

    const hasSmallJoker = cards.some(c => c.value === CardRank.JOKER_SMALL);
    const hasBigJoker = cards.some(c => c.value === CardRank.JOKER_BIG);
    
    if (hasSmallJoker && hasBigJoker) {
      const rocketCards = cards.filter(
        c => c.value === CardRank.JOKER_SMALL || c.value === CardRank.JOKER_BIG
      );
      bombs.push({
        type: CardType.ROCKET,
        cards: rocketCards,
        mainValue: CardRank.JOKER_BIG,
        length: 2
      });
    }

    return bombs;
  }

  private findAllValidCombinations(cards: ICard[]): ICardCombination[] {
    const combinations: ICardCombination[] = [];
    const valueCounts = this.getValueCounts(cards);
    const sortedCards = Card.sort(cards);

    for (const card of cards) {
      combinations.push({
        type: CardType.SINGLE,
        cards: [card],
        mainValue: card.value,
        length: 1
      });
    }

    for (const [value, count] of Object.entries(valueCounts)) {
      if (count >= 2) {
        const pairCards = cards.filter(c => c.value === parseInt(value)).slice(0, 2);
        combinations.push({
          type: CardType.PAIR,
          cards: pairCards,
          mainValue: parseInt(value),
          length: 2
        });
      }
    }

    for (const [value, count] of Object.entries(valueCounts)) {
      if (count >= 3) {
        const tripleCards = cards.filter(c => c.value === parseInt(value)).slice(0, 3);
        combinations.push({
          type: CardType.TRIPLE,
          cards: tripleCards,
          mainValue: parseInt(value),
          length: 3
        });

        const tripleOne = this.findTripleOne(cards, parseInt(value));
        if (tripleOne) combinations.push(tripleOne);

        const triplePair = this.findTriplePair(cards, parseInt(value));
        if (triplePair) combinations.push(triplePair);
      }
    }

    const straights = this.findStraights(sortedCards);
    combinations.push(...straights);

    const straightPairs = this.findStraightPairs(sortedCards, valueCounts);
    combinations.push(...straightPairs);

    const planes = this.findPlanes(sortedCards, valueCounts);
    combinations.push(...planes);

    const bombs = this.findBombs(cards);
    combinations.push(...bombs);

    const fourTwos = this.findFourTwos(cards, valueCounts);
    combinations.push(...fourTwos);

    return combinations;
  }

  private findTripleOne(cards: ICard[], tripleValue: number): ICardCombination | null {
    const tripleCards = cards.filter(c => c.value === tripleValue).slice(0, 3);
    const otherCards = cards.filter(c => c.value !== tripleValue);

    if (otherCards.length === 0) return null;

    return {
      type: CardType.TRIPLE_ONE,
      cards: [...tripleCards, otherCards[0]],
      mainValue: tripleValue,
      length: 4
    };
  }

  private findTriplePair(cards: ICard[], tripleValue: number): ICardCombination | null {
    const tripleCards = cards.filter(c => c.value === tripleValue).slice(0, 3);
    const valueCounts = this.getValueCounts(cards);

    for (const [value, count] of Object.entries(valueCounts)) {
      if (parseInt(value) !== tripleValue && count >= 2) {
        const pairCards = cards.filter(c => c.value === parseInt(value)).slice(0, 2);
        return {
          type: CardType.TRIPLE_PAIR,
          cards: [...tripleCards, ...pairCards],
          mainValue: tripleValue,
          length: 5
        };
      }
    }
    return null;
  }

  private findStraights(sortedCards: ICard[]): ICardCombination[] {
    const straights: ICardCombination[] = [];
    const uniqueValues = [...new Set(sortedCards.filter(c => c.value < CardRank.TWO).map(c => c.value))].sort((a, b) => a - b);

    if (uniqueValues.length < 5) return straights;

    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      for (let len = 5; len <= uniqueValues.length - i; len++) {
        const values = uniqueValues.slice(i, i + len);
        let isConsecutive = true;
        
        for (let j = 1; j < values.length; j++) {
          if (values[j] - values[j - 1] !== 1) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          const straightCards = values.map(v => sortedCards.find(c => c.value === v)!);
          straights.push({
            type: CardType.STRAIGHT,
            cards: straightCards,
            mainValue: values[values.length - 1],
            length: len
          });
        }
      }
    }

    return straights;
  }

  private findStraightPairs(sortedCards: ICard[], valueCounts: Record<number, number>): ICardCombination[] {
    const straightPairs: ICardCombination[] = [];
    const pairValues = Object.entries(valueCounts)
      .filter(([_, count]) => count >= 2 && parseInt(_) < CardRank.TWO)
      .map(([value]) => parseInt(value))
      .sort((a, b) => a - b);

    if (pairValues.length < 3) return straightPairs;

    for (let i = 0; i <= pairValues.length - 3; i++) {
      for (let len = 3; len <= pairValues.length - i; len++) {
        const values = pairValues.slice(i, i + len);
        let isConsecutive = true;
        
        for (let j = 1; j < values.length; j++) {
          if (values[j] - values[j - 1] !== 1) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          const straightPairCards: ICard[] = [];
          for (const v of values) {
            straightPairCards.push(...sortedCards.filter(c => c.value === v).slice(0, 2));
          }
          straightPairs.push({
            type: CardType.STRAIGHT_PAIR,
            cards: straightPairCards,
            mainValue: values[values.length - 1],
            length: len
          });
        }
      }
    }

    return straightPairs;
  }

  private findPlanes(sortedCards: ICard[], valueCounts: Record<number, number>): ICardCombination[] {
    const planes: ICardCombination[] = [];
    const tripleValues = Object.entries(valueCounts)
      .filter(([_, count]) => count >= 3 && parseInt(_) < CardRank.TWO)
      .map(([value]) => parseInt(value))
      .sort((a, b) => a - b);

    if (tripleValues.length < 2) return planes;

    for (let i = 0; i <= tripleValues.length - 2; i++) {
      for (let len = 2; len <= tripleValues.length - i; len++) {
        const values = tripleValues.slice(i, i + len);
        let isConsecutive = true;
        
        for (let j = 1; j < values.length; j++) {
          if (values[j] - values[j - 1] !== 1) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          const planeCards: ICard[] = [];
          for (const v of values) {
            planeCards.push(...sortedCards.filter(c => c.value === v).slice(0, 3));
          }
          planes.push({
            type: CardType.PLANE,
            cards: planeCards,
            mainValue: values[values.length - 1],
            length: len
          });

          const planeSingle = this.findPlaneSingle(sortedCards, values, planeCards);
          if (planeSingle) planes.push(planeSingle);

          const planePair = this.findPlanePair(sortedCards, values, planeCards, valueCounts);
          if (planePair) planes.push(planePair);
        }
      }
    }

    return planes;
  }

  private findPlaneSingle(
    cards: ICard[],
    planeValues: number[],
    planeCards: ICard[]
  ): ICardCombination | null {
    const otherCards = cards.filter(c => !planeValues.includes(c.value));
    
    if (otherCards.length < planeValues.length) return null;

    const singles = otherCards.slice(0, planeValues.length);
    
    return {
      type: CardType.PLANE_SINGLE,
      cards: [...planeCards, ...singles],
      mainValue: planeValues[planeValues.length - 1],
      length: planeValues.length
    };
  }

  private findPlanePair(
    cards: ICard[],
    planeValues: number[],
    planeCards: ICard[],
    valueCounts: Record<number, number>
  ): ICardCombination | null {
    const pairValues = Object.entries(valueCounts)
      .filter(([value, count]) => count >= 2 && !planeValues.includes(parseInt(value)))
      .map(([value]) => parseInt(value));

    if (pairValues.length < planeValues.length) return null;

    const pairs: ICard[] = [];
    for (let i = 0; i < planeValues.length && i < pairValues.length; i++) {
      pairs.push(...cards.filter(c => c.value === pairValues[i]).slice(0, 2));
    }

    return {
      type: CardType.PLANE_PAIR,
      cards: [...planeCards, ...pairs],
      mainValue: planeValues[planeValues.length - 1],
      length: planeValues.length
    };
  }

  private findFourTwos(cards: ICard[], valueCounts: Record<number, number>): ICardCombination[] {
    const fourTwos: ICardCombination[] = [];

    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 4) {
        const fourCards = cards.filter(c => c.value === parseInt(value));
        const otherCards = cards.filter(c => c.value !== parseInt(value));

        if (otherCards.length >= 2) {
          fourTwos.push({
            type: CardType.FOUR_TWO,
            cards: [...fourCards, ...otherCards.slice(0, 2)],
            mainValue: parseInt(value),
            length: 6
          });
        }

        const pairs = Object.entries(valueCounts)
          .filter(([v, c]) => parseInt(v) !== parseInt(value) && c >= 2)
          .map(([v]) => parseInt(v));

        if (pairs.length >= 2) {
          const pairCards: ICard[] = [];
          for (let i = 0; i < 2 && i < pairs.length; i++) {
            pairCards.push(...cards.filter(c => c.value === pairs[i]).slice(0, 2));
          }
          fourTwos.push({
            type: CardType.FOUR_TWO_PAIR,
            cards: [...fourCards, ...pairCards],
            mainValue: parseInt(value),
            length: 8
          });
        }
      }
    }

    return fourTwos;
  }

  private findBeatingCombinations(
    myCards: ICard[],
    lastCombo: ICardCombination
  ): ICardCombination[] {
    const allCombos = this.findAllValidCombinations(myCards);
    const beatingCombos: ICardCombination[] = [];

    for (const combo of allCombos) {
      if (CardTypeChecker.compareCombination(lastCombo, combo)) {
        beatingCombos.push(combo);
      }
    }

    return beatingCombos;
  }

  private evaluateHand(cards: ICard[]): number {
    let score = 0;
    const valueCounts = this.getValueCounts(cards);

    const hasSmallJoker = cards.some(c => c.value === CardRank.JOKER_SMALL);
    const hasBigJoker = cards.some(c => c.value === CardRank.JOKER_BIG);
    
    if (hasSmallJoker && hasBigJoker) {
      score += 40;
    } else if (hasBigJoker) {
      score += 15;
    } else if (hasSmallJoker) {
      score += 10;
    }

    const twos = cards.filter(c => c.value === CardRank.TWO);
    score += twos.length * 10;

    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 4) {
        score += 20;
      } else if (count === 3) {
        score += 5;
      }
    }

    const uniqueValues = [...new Set(cards.filter(c => c.value < CardRank.TWO).map(c => c.value))].sort((a, b) => a - b);
    let consecutiveCount = 1;
    let maxStraight = 0;

    for (let i = 1; i < uniqueValues.length; i++) {
      if (uniqueValues[i] - uniqueValues[i - 1] === 1) {
        consecutiveCount++;
        maxStraight = Math.max(maxStraight, consecutiveCount);
      } else {
        consecutiveCount = 1;
      }
    }

    if (maxStraight >= 5) {
      score += (maxStraight - 4) * 2;
    }

    const pairValues = Object.entries(valueCounts)
      .filter(([_, count]) => count >= 2 && parseInt(_) < CardRank.TWO)
      .map(([value]) => parseInt(value))
      .sort((a, b) => a - b);

    let pairConsecutive = 1;
    let maxPairStraight = 0;

    for (let i = 1; i < pairValues.length; i++) {
      if (pairValues[i] - pairValues[i - 1] === 1) {
        pairConsecutive++;
        maxPairStraight = Math.max(maxPairStraight, pairConsecutive);
      } else {
        pairConsecutive = 1;
      }
    }

    if (maxPairStraight >= 3) {
      score += (maxPairStraight - 2) * 3;
    }

    return Math.min(score, 100);
  }

  private getValueCounts(cards: ICard[]): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const card of cards) {
      counts[card.value] = (counts[card.value] || 0) + 1;
    }
    return counts;
  }
}
