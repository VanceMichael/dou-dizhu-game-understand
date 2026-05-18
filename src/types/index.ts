export enum CardSuit {
  SPADE = 'spade',
  HEART = 'heart',
  CLUB = 'club',
  DIAMOND = 'diamond',
  JOKER_BLACK = 'joker_black',
  JOKER_RED = 'joker_red'
}

export enum CardRank {
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
  TWO = 15,
  JOKER_SMALL = 16,
  JOKER_BIG = 17
}

export interface ICard {
  suit: CardSuit;
  rank: CardRank;
  id: string;
  value: number;
  suitValue: number;
}

export enum CardType {
  SINGLE = 'single',
  PAIR = 'pair',
  TRIPLE = 'triple',
  TRIPLE_ONE = 'triple_one',
  TRIPLE_PAIR = 'triple_pair',
  STRAIGHT = 'straight',
  STRAIGHT_PAIR = 'straight_pair',
  PLANE = 'plane',
  PLANE_SINGLE = 'plane_single',
  PLANE_PAIR = 'plane_pair',
  FOUR_TWO = 'four_two',
  FOUR_TWO_PAIR = 'four_two_pair',
  BOMB = 'bomb',
  ROCKET = 'rocket',
  INVALID = 'invalid'
}

export interface ICardCombination {
  type: CardType;
  cards: ICard[];
  mainValue: number;
  length: number;
}

export enum PlayerPosition {
  BOTTOM = 0,
  LEFT = 1,
  RIGHT = 2
}

export interface IPlayer {
  id: string;
  position: PlayerPosition;
  name: string;
  cards: ICard[];
  isLandlord: boolean;
  isAI: boolean;
  isAutoPlay: boolean;
  score: number;
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum GameState {
  IDLE = 'idle',
  SHUFFLING = 'shuffling',
  DEALING = 'dealing',
  BIDDING = 'bidding',
  ROBBING = 'robbing',
  DRAWING_LANDLORD = 'drawing_landlord',
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

export interface IGameConfig {
  difficulty: Difficulty;
  baseScore: number;
  multiplier: number;
  playerName: string;
}

export interface IGameContext {
  players: IPlayer[];
  deck: ICard[];
  landlordCards: ICard[];
  landlordIndex: number;
  currentPlayerIndex: number;
  lastPlayedCards: ICard[];
  lastPlayerIndex: number;
  baseScore: number;
  multiplier: number;
  bidHistory: { playerIndex: number; score: number }[];
  gameState: GameState;
  passedPlayers: number[];
  gameLog: string[];
  playedCards: ICard[];
}

export enum RankName {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  MASTER = 'master',
  KING = 'king'
}

export interface IRankConfig {
  rank: RankName;
  name: string;
  minScore: number;
  maxScore: number;
  icon: string;
}
