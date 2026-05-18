import { RankName, IRankConfig } from '../types';

export interface IPlayerStats {
  playerId: string;
  playerName: string;
  totalScore: number;
  wins: number;
  losses: number;
  highestScore: number;
  currentWinStreak: number;
  maxWinStreak: number;
  gamesPlayed: number;
  lastPlayed: number;
}

export interface IRankInfo {
  rank: RankName;
  name: string;
  icon: string;
  minScore: number;
  maxScore: number;
  progress: number;
  nextRank?: {
    name: string;
    icon: string;
    requiredScore: number;
  };
}

const RANK_CONFIGS: IRankConfig[] = [
  { rank: RankName.BRONZE, name: '青铜', minScore: 0, maxScore: 999, icon: '🥉' },
  { rank: RankName.SILVER, name: '白银', minScore: 1000, maxScore: 2999, icon: '🥈' },
  { rank: RankName.GOLD, name: '黄金', minScore: 3000, maxScore: 5999, icon: '🥇' },
  { rank: RankName.PLATINUM, name: '铂金', minScore: 6000, maxScore: 9999, icon: '💎' },
  { rank: RankName.DIAMOND, name: '钻石', minScore: 10000, maxScore: 19999, icon: '💠' },
  { rank: RankName.MASTER, name: '大师', minScore: 20000, maxScore: 49999, icon: '⭐' },
  { rank: RankName.KING, name: '王者', minScore: 50000, maxScore: Infinity, icon: '👑' }
];

export class ScoreManager {
  private static STORAGE_KEY = 'dou_dizhu_player_stats';

  static getDefaultPlayerStats(playerId: string, playerName: string): IPlayerStats {
    return {
      playerId,
      playerName,
      totalScore: 1000,
      wins: 0,
      losses: 0,
      highestScore: 1000,
      currentWinStreak: 0,
      maxWinStreak: 0,
      gamesPlayed: 0,
      lastPlayed: Date.now()
    };
  }

  static loadPlayerStats(playerId: string, playerName: string = '玩家'): IPlayerStats {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY + '_' + playerId);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load player stats:', e);
    }
    return this.getDefaultPlayerStats(playerId, playerName);
  }

  static savePlayerStats(stats: IPlayerStats): void {
    try {
      localStorage.setItem(this.STORAGE_KEY + '_' + stats.playerId, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save player stats:', e);
    }
  }

  static updateStats(
    stats: IPlayerStats,
    scoreChange: number,
    isWin: boolean
  ): IPlayerStats {
    const newStats = { ...stats };
    
    newStats.totalScore += scoreChange;
    newStats.totalScore = Math.max(0, newStats.totalScore);
    newStats.gamesPlayed++;
    newStats.lastPlayed = Date.now();
    
    if (isWin) {
      newStats.wins++;
      newStats.currentWinStreak++;
      newStats.maxWinStreak = Math.max(newStats.maxWinStreak, newStats.currentWinStreak);
      newStats.highestScore = Math.max(newStats.highestScore, newStats.totalScore);
    } else {
      newStats.losses++;
      newStats.currentWinStreak = 0;
    }
    
    return newStats;
  }

  static getRankInfo(score: number): IRankInfo {
    for (let i = 0; i < RANK_CONFIGS.length; i++) {
      const config = RANK_CONFIGS[i];
      
      if (score >= config.minScore && score <= config.maxScore) {
        const nextConfig = RANK_CONFIGS[i + 1];
        
        let progress = 0;
        if (config.maxScore !== Infinity) {
          const range = config.maxScore - config.minScore + 1;
          progress = (score - config.minScore) / range;
          progress = Math.min(1, Math.max(0, progress));
        } else {
          progress = 1;
        }
        
        const rankInfo: IRankInfo = {
          rank: config.rank,
          name: config.name,
          icon: config.icon,
          minScore: config.minScore,
          maxScore: config.maxScore,
          progress
        };
        
        if (nextConfig) {
          rankInfo.nextRank = {
            name: nextConfig.name,
            icon: nextConfig.icon,
            requiredScore: nextConfig.minScore
          };
        }
        
        return rankInfo;
      }
    }
    
    const lastConfig = RANK_CONFIGS[RANK_CONFIGS.length - 1];
    return {
      rank: lastConfig.rank,
      name: lastConfig.name,
      icon: lastConfig.icon,
      minScore: lastConfig.minScore,
      maxScore: lastConfig.maxScore,
      progress: 1
    };
  }

  static calculateScoreChange(
    baseScore: number,
    multiplier: number,
    isLandlord: boolean,
    isWin: boolean
  ): number {
    let scoreChange = baseScore * multiplier;
    
    if (isLandlord) {
      scoreChange *= 2;
    }
    
    return isWin ? scoreChange : -scoreChange;
  }

  static getAllRankConfigs(): IRankConfig[] {
    return [...RANK_CONFIGS];
  }

  static getLeaderboard(): IPlayerStats[] {
    try {
      const allStats: IPlayerStats[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY + '_')) {
          const value = localStorage.getItem(key);
          if (value) {
            allStats.push(JSON.parse(value));
          }
        }
      }
      
      return allStats.sort((a, b) => b.totalScore - a.totalScore);
    } catch (e) {
      console.error('Failed to get leaderboard:', e);
      return [];
    }
  }
}
