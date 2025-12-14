import logger from './utils/logger.js';
import binanceService from './services/binanceService.js';
import telegramService from './services/telegramService.js';
import tradingStrategy from './strategies/tradingStrategy.js';
import { config } from './config/config.js';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the trading bot
 */
async function initializeBot() {
  try {
    logger.info('='.repeat(60));
    logger.info('AI Trading Scalping Bot for Binance Futures');
    logger.info('Institutional-Grade Trading Engine');
    logger.info('='.repeat(60));

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Validate configuration
    if (!config.binance.apiKey || !config.binance.secretKey) {
      throw new Error('Binance API credentials not configured. Please set BINANCE_API_KEY and BINANCE_SECRET_KEY in .env file.');
    }

    logger.info('Initializing services...');

    // Initialize Telegram service
    await telegramService.initialize();

    // Initialize Binance service
    await binanceService.initialize();

    // Display configuration
    logger.info('Configuration:');
    logger.info(`- Testnet: ${config.binance.testnet ? 'Enabled' : 'Disabled'}`);
    logger.info(`- Trade Amount: ${config.trading.tradeAmountUsdt} USDT`);
    logger.info(`- Max Positions: ${config.trading.maxPositions}`);
    logger.info(`- Leverage: ${config.trading.leverage}x`);
    logger.info(`- Timeframes: ${config.trading.timeframes.join(', ')}`);
    logger.info(`- Stop Loss: ${config.riskManagement.stopLossPercent}%`);
    logger.info(`- Take Profits: ${config.riskManagement.takeProfitLevels.map(tp => tp.percent + '%').join(', ')}`);

    // Start trading strategy
    await tradingStrategy.start();

    logger.info('Bot initialized successfully');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    await telegramService.notifyError(`Bot initialization failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Shutdown the trading bot gracefully
 */
async function shutdownBot() {
  try {
    logger.info('Shutting down bot...');
    await tradingStrategy.stop();
    logger.info('Bot shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  await telegramService.notifyError(`Uncaught Exception: ${error.message}`);
  await tradingStrategy.emergencyStop();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await telegramService.notifyError(`Unhandled Rejection: ${reason}`);
});

/**
 * Handle shutdown signals
 */
process.on('SIGTERM', shutdownBot);
process.on('SIGINT', shutdownBot);

// Start the bot
initializeBot();
