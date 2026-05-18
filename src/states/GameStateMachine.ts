import { createMachine, assign, ActorRefFrom } from 'xstate';
import { ICard, IPlayer, GameState, Difficulty } from '../types';
import { Deck } from '../utils/Deck';
import { Card } from '../utils/Card';

export interface GameContext {
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
  passedPlayers: number[];
  gameLog: string[];
  playedCards: ICard[];
  difficulty: Difficulty;
  playerName: string;
}

export type GameEvents =
  | { type: 'START' }
  | { type: 'DEAL_COMPLETE' }
  | { type: 'BID'; playerIndex: number; score: number }
  | { type: 'PASS_BID'; playerIndex: number }
  | { type: 'ROB'; playerIndex: number }
  | { type: 'PASS_ROB'; playerIndex: number }
  | { type: 'PLAY_CARDS'; playerIndex: number; cards: ICard[] }
  | { type: 'PASS'; playerIndex: number }
  | { type: 'GAME_OVER'; winner: 'landlord' | 'farmer' }
  | { type: 'RESET' };

const createInitialContext = (difficulty: Difficulty = Difficulty.MEDIUM, playerName: string = '玩家'): GameContext => ({
  players: [],
  deck: [],
  landlordCards: [],
  landlordIndex: -1,
  currentPlayerIndex: 0,
  lastPlayedCards: [],
  lastPlayerIndex: -1,
  baseScore: 100,
  multiplier: 1,
  bidHistory: [],
  passedPlayers: [],
  gameLog: [],
  playedCards: [],
  difficulty,
  playerName
});

export const gameStateMachine = createMachine({
  id: 'game',
  initial: 'idle',
  context: createInitialContext(),
  states: {
    idle: {
      on: {
        START: {
          target: 'shuffling',
          actions: assign(({ context }) => {
            const deck = new Deck();
            const { players, landlordCards } = deck.deal();
            
            const newPlayers: IPlayer[] = [
              {
                id: 'player_0',
                position: 0,
                name: context.playerName,
                cards: Card.sortDesc(players[0]),
                isLandlord: false,
                isAI: false,
                isAutoPlay: false,
                score: 0
              },
              {
                id: 'player_1',
                position: 1,
                name: 'AI-东方',
                cards: Card.sortDesc(players[1]),
                isLandlord: false,
                isAI: true,
                isAutoPlay: true,
                score: 0
              },
              {
                id: 'player_2',
                position: 2,
                name: 'AI-西方',
                cards: Card.sortDesc(players[2]),
                isLandlord: false,
                isAI: true,
                isAutoPlay: true,
                score: 0
              }
            ];

            return {
              ...createInitialContext(context.difficulty, context.playerName),
              players: newPlayers,
              landlordCards,
              deck: deck.getCards(),
              gameLog: ['游戏开始，正在洗牌...']
            };
          })
        }
      }
    },
    shuffling: {
      after: {
        500: 'dealing'
      },
      entry: assign({
        gameLog: ({ context }) => [...context.gameLog, '洗牌完成，开始发牌...']
      })
    },
    dealing: {
      after: {
        1000: 'bidding'
      },
      entry: assign({
        currentPlayerIndex: Math.floor(Math.random() * 3),
        gameLog: ({ context }) => [...context.gameLog, '发牌完成，开始叫地主']
      })
    },
    bidding: {
      on: {
        BID: {
          actions: assign(({ context, event }) => {
            const newBidHistory = [...context.bidHistory, { playerIndex: event.playerIndex, score: event.score }];
            const newMultiplier = Math.max(1, event.score / 100);
            
            return {
              ...context,
              bidHistory: newBidHistory,
              multiplier: newMultiplier,
              currentPlayerIndex: (event.playerIndex + 1) % 3,
              gameLog: [...context.gameLog, `${context.players[event.playerIndex].name} 叫了 ${event.score} 分`]
            };
          }),
          target: 'robbing'
        },
        PASS_BID: {
          actions: assign(({ context, event }) => {
            const newPassedPlayers = [...context.passedPlayers, event.playerIndex];
            
            if (newPassedPlayers.length >= 3) {
              return {
                ...context,
                passedPlayers: newPassedPlayers,
                gameLog: [...context.gameLog, '所有人都不叫，重新开始...']
              };
            }
            
            return {
              ...context,
              passedPlayers: newPassedPlayers,
              currentPlayerIndex: (event.playerIndex + 1) % 3,
              gameLog: [...context.gameLog, `${context.players[event.playerIndex].name} 不叫`]
            };
          }),
          target: 'bidding'
        }
      }
    },
    robbing: {
      on: {
        ROB: {
          actions: assign(({ context, event }) => {
            const newMultiplier = context.multiplier * 2;
            
            return {
              ...context,
              multiplier: newMultiplier,
              landlordIndex: event.playerIndex,
              currentPlayerIndex: (event.playerIndex + 1) % 3,
              gameLog: [...context.gameLog, `${context.players[event.playerIndex].name} 抢地主！倍数 x${newMultiplier}`]
            };
          }),
          target: 'robbing'
        },
        PASS_ROB: {
          actions: assign(({ context, event }) => {
            const newPassedPlayers = [...context.passedPlayers, event.playerIndex];
            const allPassed = newPassedPlayers.length >= 3;
            const hasBidder = context.bidHistory.length > 0;
            
            if (allPassed && hasBidder) {
              const lastBid = context.bidHistory[context.bidHistory.length - 1];
              const landlordIndex = lastBid.playerIndex;
              const landlordCards = [...context.landlordCards];
              
              const players = context.players.map((p, i) => ({
                ...p,
                isLandlord: i === landlordIndex,
                cards: i === landlordIndex ? Card.sortDesc([...p.cards, ...landlordCards]) : p.cards
              }));
              
              return {
                ...context,
                passedPlayers: newPassedPlayers,
                landlordIndex,
                players,
                currentPlayerIndex: landlordIndex,
                lastPlayerIndex: -1,
                lastPlayedCards: [],
                gameLog: [...context.gameLog, 
                  `${context.players[landlordIndex].name} 成为地主！`,
                  '地主牌：' + landlordCards.map(c => Card.getRankName(c.rank)).join(' ')
                ]
              };
            }
            
            return {
              ...context,
              passedPlayers: newPassedPlayers,
              currentPlayerIndex: (event.playerIndex + 1) % 3,
              gameLog: [...context.gameLog, `${context.players[event.playerIndex].name} 不抢`]
            };
          }),
          target: 'drawing_landlord'
        }
      }
    },
    drawing_landlord: {
      after: {
        500: 'playing'
      },
      entry: assign(({ context }) => {
        if (context.landlordIndex >= 0) {
          return context;
        }
        
        if (context.bidHistory.length > 0) {
          const lastBid = context.bidHistory[context.bidHistory.length - 1];
          const landlordIndex = lastBid.playerIndex;
          const landlordCards = [...context.landlordCards];
          
          const players = context.players.map((p, i) => ({
            ...p,
            isLandlord: i === landlordIndex,
            cards: i === landlordIndex ? Card.sortDesc([...p.cards, ...landlordCards]) : p.cards
          }));
          
          return {
            ...context,
            landlordIndex,
            players,
            currentPlayerIndex: landlordIndex,
            lastPlayerIndex: -1,
            lastPlayedCards: [],
            gameLog: [...context.gameLog, 
              `${context.players[landlordIndex].name} 成为地主！`,
              '地主牌：' + landlordCards.map(c => Card.getRankName(c.rank)).join(' ')
            ]
          };
        }
        
        return context;
      })
    },
    playing: {
      on: {
        PLAY_CARDS: {
          actions: assign(({ context, event }) => {
            const players = context.players.map((p, i) => {
              if (i === event.playerIndex) {
                const remainingCards = p.cards.filter(c => 
                  !event.cards.some(ec => ec.id === c.id)
                );
                return { ...p, cards: remainingCards };
              }
              return p;
            });

            const playedCards = [...context.playedCards, ...event.cards];
            
            return {
              ...context,
              players,
              lastPlayedCards: event.cards,
              lastPlayerIndex: event.playerIndex,
              currentPlayerIndex: (event.playerIndex + 1) % 3,
              passedPlayers: [],
              playedCards,
              gameLog: [...context.gameLog, 
                `${context.players[event.playerIndex].name} 出牌：${event.cards.map(c => Card.getRankName(c.rank)).join(' ')}`
              ]
            };
          }),
          target: 'playing'
        },
        PASS: {
          actions: assign(({ context, event }) => {
            const newPassedPlayers = [...context.passedPlayers, event.playerIndex];
            
            return {
              ...context,
              passedPlayers: newPassedPlayers,
              currentPlayerIndex: (event.playerIndex + 1) % 3,
              gameLog: [...context.gameLog, `${context.players[event.playerIndex].name} 不出`]
            };
          }),
          target: 'playing'
        }
      }
    },
    gameOver: {
      on: {
        RESET: {
          target: 'idle',
          actions: assign(() => createInitialContext())
        }
      },
      entry: assign(({ context, event }) => {
        if (event.type === 'GAME_OVER') {
          const winner = event.winner;
          const landlord = context.players[context.landlordIndex];
          const farmers = context.players.filter((_, i) => i !== context.landlordIndex);
          
          let scoreChange = context.baseScore * context.multiplier;
          
          const players = context.players.map(p => {
            if (winner === 'landlord') {
              if (p.isLandlord) {
                return { ...p, score: p.score + scoreChange * 2 };
              } else {
                return { ...p, score: p.score - scoreChange };
              }
            } else {
              if (p.isLandlord) {
                return { ...p, score: p.score - scoreChange * 2 };
              } else {
                return { ...p, score: p.score + scoreChange };
              }
            }
          });
          
          return {
            ...context,
            players,
            gameLog: [...context.gameLog, 
              winner === 'landlord' 
                ? `地主 ${landlord.name} 获胜！` 
                : `农民 ${farmers.map(f => f.name).join('、')} 获胜！`
            ]
          };
        }
        return context;
      })
    }
  }
});

export type GameStateMachine = typeof gameStateMachine;
export type GameActorRef = ActorRefFrom<GameStateMachine>;
