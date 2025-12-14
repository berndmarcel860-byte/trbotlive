import logger from '../utils/logger.js';
import binanceService from '../services/binanceService.js';
import marketAnalysisService from '../services/marketAnalysisService.js';
import positionManager from '../services/positionManager.js';
import telegramService from '../services/telegramService.js';
import { config } from '../config/config.js';

class TradingStrategy {
  constructor() {
    this.isRunning = false;
    this.scanInterval = 60000; // Scan every 60 seconds
    this.monitorInterval = 10000; // Monitor positions every 10 seconds
  }

  /**
   * Start the trading strategy
   */
  async start() {
    try {
      logger.info('Starting trading strategy...');
      this.isRunning = true;

      // Initial scan
      await this.scanMarkets();

      // Set up intervals
      this.scanTimer = setInterval(() => this.scanMarkets(), this.scanInterval);
      this.monitorTimer = setInterval(() => this.monitorPositions(), this.monitorInterval);

      logger.info('Trading strategy started successfully');
    } catch (error) {
      logger.error('Failed to start trading strategy:', error);
      await telegramService.notifyError(`Failed to start trading strategy: ${error.message}`);
    }
  }

  /**
   * Stop the trading strategy
   */
  async stop() {
    try {
      logger.info('Stopping trading strategy...');
      this.isRunning = false;

      if (this.scanTimer) clearInterval(this.scanTimer);
      if (this.monitorTimer) clearInterval(this.monitorTimer);

      logger.info('Trading strategy stopped');
      await telegramService.sendMessage('🛑 Trading Bot Stopped');
    } catch (error) {
      logger.error('Failed to stop trading strategy:', error);
    }
  }

  /**
   * Scan markets for trading opportunities
   */
  async scanMarkets() {
    try {
      logger.info('Scanning markets...');

      // Check if we can open more positions
      const activePositions = positionManager.getActivePositionsCount();
      if (activePositions >= config.trading.maxPositions) {
        logger.info(`Max positions (${config.trading.maxPositions}) reached. Skipping scan.`);
        return;
      }

      // Get top coins by volume
      const topCoins = await binanceService.getTopCoins(config.coinSelection.topCoinsCount);
      
      if (topCoins.length === 0) {
        logger.warn('No coins found for analysis');
        return;
      }

      logger.info(`Analyzing ${topCoins.length} top coins`);

      // Notify about market analysis periodically (every 10 scans)
      if (Math.random() < 0.1) {
        await telegramService.notifyMarketAnalysis(topCoins);
      }

      // Analyze each coin
      for (const coin of topCoins) {
        // Skip if already have position
        if (positionManager.hasPosition(coin.symbol)) {
          continue;
        }

        // Check if we can open more positions
        if (positionManager.getActivePositionsCount() >= config.trading.maxPositions) {
          break;
        }

        // Analyze multiple timeframes
        const analysis = await marketAnalysisService.analyzeMultipleTimeframes(
          coin.symbol,
          config.trading.timeframes
        );

        if (!analysis) continue;

        // Check entry conditions
        if (marketAnalysisService.checkEntryConditions(analysis)) {
          logger.info(`Entry signal detected for ${coin.symbol}`);
          await this.executeEntry(analysis);
          
          // Add small delay between entries
          await this.sleep(2000);
        }
      }

      logger.info('Market scan completed');
    } catch (error) {
      logger.error('Failed to scan markets:', error);
    }
  }

  /**
   * Execute entry based on analysis
   * @param {Object} analysis - Market analysis result
   */
  async executeEntry(analysis) {
    try {
      const symbol = analysis.symbol;
      
      // Get the primary timeframe analysis
      const primaryTF = config.trading.timeframes[0];
      const tfAnalysis = analysis.analyses[primaryTF];

      if (!tfAnalysis) {
        logger.warn(`No analysis for primary timeframe ${primaryTF}`);
        return;
      }

      // Prepare trade setup
      const tradeSetup = {
        symbol,
        side: 'buy', // For scalping, we primarily focus on long positions
        entryPrice: tfAnalysis.currentPrice,
        dcaLevels: tfAnalysis.dcaLevels,
        analysis,
      };

      logger.info(`Executing entry for ${symbol}:`, tradeSetup);

      // Open position
      const position = await positionManager.openPosition(tradeSetup);

      if (position) {
        logger.info(`Successfully opened position for ${symbol}`);
      } else {
        logger.warn(`Failed to open position for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Failed to execute entry for ${analysis.symbol}:`, error);
      await telegramService.notifyError(`Failed to execute entry for ${analysis.symbol}: ${error.message}`);
    }
  }

  /**
   * Monitor open positions
   */
  async monitorPositions() {
    try {
      await positionManager.monitorPositions();
    } catch (error) {
      logger.error('Failed to monitor positions:', error);
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emergency stop - close all positions
   */
  async emergencyStop() {
    try {
      logger.warn('Emergency stop initiated - closing all positions');
      await telegramService.sendMessage('🚨 EMERGENCY STOP - Closing all positions');

      const positions = Array.from(positionManager.positions.keys());
      
      for (const symbol of positions) {
        await positionManager.closePosition(symbol);
        await this.sleep(1000);
      }

      await this.stop();
      logger.info('Emergency stop completed');
    } catch (error) {
      logger.error('Failed to execute emergency stop:', error);
    }
  }
}

export default new TradingStrategy();
