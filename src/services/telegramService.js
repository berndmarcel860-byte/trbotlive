import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config.js';
import logger from '../utils/logger.js';

class TelegramService {
  constructor() {
    this.bot = null;
    this.chatId = config.telegram.chatId;
    this.isInitialized = false;
  }

  /**
   * Initialize the Telegram bot
   */
  async initialize() {
    try {
      if (!config.telegram.botToken || !config.telegram.chatId) {
        logger.warn('Telegram bot not configured. Notifications will be disabled.');
        return;
      }

      this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
      this.isInitialized = true;
      logger.info('Telegram bot initialized successfully');
      
      await this.sendMessage('🤖 Trading Bot Started\n\nThe AI scalping bot is now active and monitoring markets.');
    } catch (error) {
      logger.error('Failed to initialize Telegram bot:', error);
    }
  }

  /**
   * Send a message to Telegram
   * @param {string} message - Message to send
   * @param {Object} options - Additional options
   */
  async sendMessage(message, options = {}) {
    if (!this.isInitialized || !this.bot) {
      logger.debug('Telegram message not sent (bot not initialized):', message);
      return;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        ...options,
      });
    } catch (error) {
      logger.error('Failed to send Telegram message:', error);
    }
  }

  /**
   * Notify about new position entry
   * @param {Object} position - Position details
   */
  async notifyEntry(position) {
    const message = `
🟢 <b>NEW POSITION OPENED</b>

<b>Symbol:</b> ${position.symbol}
<b>Side:</b> ${position.side}
<b>Entry Price:</b> $${position.entryPrice}
<b>Quantity:</b> ${position.quantity}
<b>Leverage:</b> ${position.leverage}x
<b>Position Value:</b> $${position.positionValue}

<b>Stop Loss:</b> $${position.stopLoss} (${position.slPercent}%)
<b>TP1:</b> $${position.tp1} (${position.tp1Percent}%)
<b>TP2:</b> $${position.tp2} (${position.tp2Percent}%)
<b>TP3:</b> $${position.tp3} (${position.tp3Percent}%)

<b>Strategy:</b> Fibonacci DCA
<b>Timeframe:</b> ${position.timeframe}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Notify about take profit hit
   * @param {Object} data - TP details
   */
  async notifyTakeProfit(data) {
    const message = `
🎯 <b>TAKE PROFIT ${data.tpLevel} HIT</b>

<b>Symbol:</b> ${data.symbol}
<b>Entry Price:</b> $${data.entryPrice}
<b>Exit Price:</b> $${data.exitPrice}
<b>Profit:</b> $${data.profit} (${data.profitPercent}%)
<b>Closed:</b> ${data.closedPercent}% of position

${data.breakeven ? '🔒 <b>Stop Loss moved to breakeven</b>' : ''}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Notify about stop loss hit
   * @param {Object} data - SL details
   */
  async notifyStopLoss(data) {
    const message = `
🔴 <b>STOP LOSS HIT</b>

<b>Symbol:</b> ${data.symbol}
<b>Entry Price:</b> $${data.entryPrice}
<b>Exit Price:</b> $${data.exitPrice}
<b>Loss:</b> $${data.loss} (${data.lossPercent}%)
<b>Position:</b> Fully closed
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Notify about market analysis
   * @param {Array} topCoins - Top coins analysis
   */
  async notifyMarketAnalysis(topCoins) {
    let message = '📊 <b>MARKET ANALYSIS - TOP COINS</b>\n\n';
    
    topCoins.slice(0, 5).forEach((coin, index) => {
      message += `${index + 1}. <b>${coin.symbol}</b>\n`;
      message += `   Volume: $${(coin.volume / 1000000).toFixed(2)}M\n`;
      message += `   Change: ${coin.priceChange > 0 ? '📈' : '📉'} ${coin.priceChange.toFixed(2)}%\n`;
      message += `   Volatility: ${coin.volatility.toFixed(2)}%\n\n`;
    });

    await this.sendMessage(message);
  }

  /**
   * Notify about errors
   * @param {string} errorMessage - Error message
   */
  async notifyError(errorMessage) {
    const message = `
⚠️ <b>ERROR</b>

${errorMessage}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Notify about position update
   * @param {Object} data - Position update data
   */
  async notifyPositionUpdate(data) {
    const message = `
📊 <b>POSITION UPDATE</b>

<b>Symbol:</b> ${data.symbol}
<b>Current Price:</b> $${data.currentPrice}
<b>Entry Price:</b> $${data.entryPrice}
<b>Unrealized PnL:</b> $${data.unrealizedPnL} (${data.pnlPercent}%)
<b>Status:</b> ${data.status}
    `.trim();

    await this.sendMessage(message);
  }
}

export default new TelegramService();
