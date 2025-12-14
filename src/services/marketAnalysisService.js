import { SMA, RSI, MACD, BollingerBands } from 'technicalindicators';
import logger from '../utils/logger.js';
import binanceService from './binanceService.js';
import { calculateFibonacciLevels, getDCAEntryLevels } from '../utils/tradingUtils.js';

class MarketAnalysisService {
  /**
   * Analyze multiple timeframes for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {Array} timeframes - Array of timeframes to analyze
   * @returns {Object} Analysis result
   */
  async analyzeMultipleTimeframes(symbol, timeframes) {
    try {
      const analyses = {};
      
      for (const timeframe of timeframes) {
        analyses[timeframe] = await this.analyzeSingleTimeframe(symbol, timeframe);
      }

      // Calculate overall trend score
      const trendScores = Object.values(analyses).map(a => a.trendScore);
      const avgTrendScore = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;

      // Get signals from different timeframes
      const signals = Object.values(analyses).map(a => a.signal);
      const bullishSignals = signals.filter(s => s === 'BUY').length;
      const bearishSignals = signals.filter(s => s === 'SELL').length;

      // Determine overall signal
      let overallSignal = 'NEUTRAL';
      if (bullishSignals >= 2) overallSignal = 'BUY';
      else if (bearishSignals >= 2) overallSignal = 'SELL';

      return {
        symbol,
        analyses,
        overallSignal,
        avgTrendScore,
        confidence: Math.max(bullishSignals, bearishSignals) / timeframes.length,
      };
    } catch (error) {
      logger.error(`Failed to analyze multiple timeframes for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Analyze a single timeframe for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {string} timeframe - Timeframe to analyze
   * @returns {Object} Analysis result
   */
  async analyzeSingleTimeframe(symbol, timeframe) {
    try {
      const candles = await binanceService.getOHLCV(symbol, timeframe, 100);
      
      if (!candles || candles.length < 50) {
        logger.warn(`Insufficient candle data for ${symbol} ${timeframe}`);
        return null;
      }

      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);

      // Calculate indicators
      const sma20 = SMA.calculate({ period: 20, values: closes });
      const sma50 = SMA.calculate({ period: 50, values: closes });
      const rsi = RSI.calculate({ period: 14, values: closes });
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });

      const bb = BollingerBands.calculate({
        period: 20,
        values: closes,
        stdDev: 2,
      });

      // Get latest values
      const currentPrice = closes[closes.length - 1];
      const currentSMA20 = sma20[sma20.length - 1];
      const currentSMA50 = sma50[sma50.length - 1];
      const currentRSI = rsi[rsi.length - 1];
      const currentMACD = macd[macd.length - 1];
      const currentBB = bb[bb.length - 1];

      // Calculate Fibonacci levels for trend
      const recentHigh = Math.max(...highs.slice(-20));
      const recentLow = Math.min(...lows.slice(-20));
      const isUptrend = currentPrice > currentSMA50;
      const fibLevels = calculateFibonacciLevels(recentHigh, recentLow, isUptrend);
      const dcaLevels = getDCAEntryLevels(fibLevels);

      // Determine trend and signals
      let trendScore = 0;
      let signals = [];

      // SMA trend
      if (currentPrice > currentSMA20) trendScore += 1;
      if (currentPrice > currentSMA50) trendScore += 1;
      if (currentSMA20 > currentSMA50) trendScore += 1;

      // RSI signals
      if (currentRSI < 30) {
        signals.push('RSI_OVERSOLD');
        trendScore += 1;
      } else if (currentRSI > 70) {
        signals.push('RSI_OVERBOUGHT');
        trendScore -= 1;
      }

      // MACD signals
      if (currentMACD && currentMACD.MACD > currentMACD.signal) {
        signals.push('MACD_BULLISH');
        trendScore += 1;
      } else if (currentMACD && currentMACD.MACD < currentMACD.signal) {
        signals.push('MACD_BEARISH');
        trendScore -= 1;
      }

      // Bollinger Bands
      if (currentBB && currentPrice < currentBB.lower) {
        signals.push('BB_OVERSOLD');
        trendScore += 1;
      } else if (currentBB && currentPrice > currentBB.upper) {
        signals.push('BB_OVERBOUGHT');
        trendScore -= 1;
      }

      // Determine overall signal
      let signal = 'NEUTRAL';
      if (trendScore >= 3) signal = 'BUY';
      else if (trendScore <= -2) signal = 'SELL';

      return {
        timeframe,
        currentPrice,
        indicators: {
          sma20: currentSMA20,
          sma50: currentSMA50,
          rsi: currentRSI,
          macd: currentMACD,
          bb: currentBB,
        },
        fibLevels,
        dcaLevels,
        trendScore,
        signal,
        signals,
        isUptrend,
      };
    } catch (error) {
      logger.error(`Failed to analyze ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Check if conditions are met for entry
   * @param {Object} analysis - Market analysis result
   * @returns {boolean} Whether entry conditions are met
   */
  checkEntryConditions(analysis) {
    if (!analysis) return false;

    // Must have bullish overall signal
    if (analysis.overallSignal !== 'BUY') return false;

    // Must have good confidence
    if (analysis.confidence < 0.6) return false;

    // Check RSI is not overbought in any timeframe
    for (const [timeframe, tf_analysis] of Object.entries(analysis.analyses)) {
      if (tf_analysis.indicators.rsi > 75) {
        logger.debug(`RSI overbought on ${timeframe} for ${analysis.symbol}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Determine trend direction
   * @param {Array} candles - OHLCV candles
   * @returns {string} 'UP', 'DOWN', or 'SIDEWAYS'
   */
  determineTrend(candles) {
    if (candles.length < 20) return 'SIDEWAYS';

    const closes = candles.map(c => c.close);
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });

    if (sma20.length === 0 || sma50.length === 0) return 'SIDEWAYS';

    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    const prevSMA20 = sma20[sma20.length - 2];
    const prevSMA50 = sma50[sma50.length - 2];

    // Check if trend is strong
    if (currentSMA20 > currentSMA50 && prevSMA20 > prevSMA50) {
      return 'UP';
    } else if (currentSMA20 < currentSMA50 && prevSMA20 < prevSMA50) {
      return 'DOWN';
    }

    return 'SIDEWAYS';
  }

  /**
   * Calculate volatility
   * @param {Array} candles - OHLCV candles
   * @returns {number} Volatility percentage
   */
  calculateVolatility(candles) {
    if (candles.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }

    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev * 100;
  }
}

export default new MarketAnalysisService();
