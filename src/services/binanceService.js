import ccxt from 'ccxt';
import { config } from '../config/config.js';
import logger from '../utils/logger.js';

class BinanceService {
  constructor() {
    this.exchange = null;
    this.markets = null;
  }

  /**
   * Initialize the Binance exchange connection
   */
  async initialize() {
    try {
      this.exchange = new ccxt.binance({
        apiKey: config.binance.apiKey,
        secret: config.binance.secretKey,
        enableRateLimit: true,
        options: {
          defaultType: 'future',
          adjustForTimeDifference: true,
        },
      });

      if (config.binance.testnet) {
        this.exchange.urls['api'] = this.exchange.urls['test'];
        logger.info('Using Binance TESTNET');
      }

      // Load markets
      this.markets = await this.exchange.loadMarkets();
      logger.info(`Binance Futures initialized successfully. ${Object.keys(this.markets).length} markets loaded.`);
      
      // Test connection
      const balance = await this.exchange.fetchBalance();
      logger.info(`Account balance: ${balance.USDT?.free || 0} USDT`);
    } catch (error) {
      logger.error('Failed to initialize Binance:', error);
      throw error;
    }
  }

  /**
   * Get top trading pairs by volume
   * @param {number} limit - Number of pairs to return
   * @returns {Array} Array of top trading pairs
   */
  async getTopCoins(limit = 10) {
    try {
      const tickers = await this.exchange.fetchTickers();
      const usdtPairs = Object.entries(tickers)
        .filter(([symbol, ticker]) => 
          symbol.endsWith('/USDT:USDT') && 
          ticker.quoteVolume > config.coinSelection.minVolumeUsdt
        )
        .map(([symbol, ticker]) => ({
          symbol: symbol,
          baseSymbol: symbol.split('/')[0],
          volume: ticker.quoteVolume,
          priceChange: ticker.percentage || 0,
          lastPrice: ticker.last,
          high: ticker.high,
          low: ticker.low,
          volatility: ticker.high && ticker.low ? ((ticker.high - ticker.low) / ticker.low) * 100 : 0,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit);

      logger.info(`Found ${usdtPairs.length} top coins by volume`);
      return usdtPairs;
    } catch (error) {
      logger.error('Failed to get top coins:', error);
      return [];
    }
  }

  /**
   * Get OHLCV data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {string} timeframe - Timeframe (5m, 15m, 1h, etc.)
   * @param {number} limit - Number of candles
   * @returns {Array} OHLCV data
   */
  async getOHLCV(symbol, timeframe = '5m', limit = 100) {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      return ohlcv.map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      }));
    } catch (error) {
      logger.error(`Failed to get OHLCV for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Set leverage for a symbol
   * @param {string} symbol - Trading pair symbol
   * @param {number} leverage - Leverage amount
   */
  async setLeverage(symbol, leverage) {
    try {
      await this.exchange.setLeverage(leverage, symbol);
      logger.info(`Set leverage to ${leverage}x for ${symbol}`);
    } catch (error) {
      logger.error(`Failed to set leverage for ${symbol}:`, error);
    }
  }

  /**
   * Set margin mode
   * @param {string} symbol - Trading pair symbol
   * @param {string} marginMode - 'isolated' or 'cross'
   */
  async setMarginMode(symbol, marginMode = 'isolated') {
    try {
      await this.exchange.setMarginMode(marginMode, symbol);
      logger.info(`Set margin mode to ${marginMode} for ${symbol}`);
    } catch (error) {
      // Margin mode might already be set, log but don't throw
      logger.debug(`Margin mode setting for ${symbol}:`, error.message);
    }
  }

  /**
   * Create a market order
   * @param {string} symbol - Trading pair symbol
   * @param {string} side - 'buy' or 'sell'
   * @param {number} amount - Order amount
   * @param {Object} params - Additional parameters
   * @returns {Object} Order result
   */
  async createMarketOrder(symbol, side, amount, params = {}) {
    try {
      const order = await this.exchange.createOrder(symbol, 'market', side, amount, undefined, params);
      logger.info(`Market order created: ${side} ${amount} ${symbol}`);
      return order;
    } catch (error) {
      logger.error(`Failed to create market order:`, error);
      throw error;
    }
  }

  /**
   * Create a limit order
   * @param {string} symbol - Trading pair symbol
   * @param {string} side - 'buy' or 'sell'
   * @param {number} amount - Order amount
   * @param {number} price - Order price
   * @param {Object} params - Additional parameters
   * @returns {Object} Order result
   */
  async createLimitOrder(symbol, side, amount, price, params = {}) {
    try {
      const order = await this.exchange.createOrder(symbol, 'limit', side, amount, price, params);
      logger.info(`Limit order created: ${side} ${amount} ${symbol} at ${price}`);
      return order;
    } catch (error) {
      logger.error(`Failed to create limit order:`, error);
      throw error;
    }
  }

  /**
   * Create a stop loss order
   * @param {string} symbol - Trading pair symbol
   * @param {string} side - 'buy' or 'sell'
   * @param {number} amount - Order amount
   * @param {number} stopPrice - Stop price
   * @returns {Object} Order result
   */
  async createStopLossOrder(symbol, side, amount, stopPrice) {
    try {
      const params = {
        stopPrice: stopPrice,
        type: 'STOP_MARKET',
      };
      const order = await this.exchange.createOrder(symbol, 'stop_market', side, amount, undefined, params);
      logger.info(`Stop loss order created: ${side} ${amount} ${symbol} at ${stopPrice}`);
      return order;
    } catch (error) {
      logger.error(`Failed to create stop loss order:`, error);
      throw error;
    }
  }

  /**
   * Create a take profit order
   * @param {string} symbol - Trading pair symbol
   * @param {string} side - 'buy' or 'sell'
   * @param {number} amount - Order amount
   * @param {number} takeProfitPrice - Take profit price
   * @returns {Object} Order result
   */
  async createTakeProfitOrder(symbol, side, amount, takeProfitPrice) {
    try {
      const params = {
        stopPrice: takeProfitPrice,
        type: 'TAKE_PROFIT_MARKET',
      };
      const order = await this.exchange.createOrder(symbol, 'take_profit_market', side, amount, undefined, params);
      logger.info(`Take profit order created: ${side} ${amount} ${symbol} at ${takeProfitPrice}`);
      return order;
    } catch (error) {
      logger.error(`Failed to create take profit order:`, error);
      throw error;
    }
  }

  /**
   * Cancel an order
   * @param {string} orderId - Order ID
   * @param {string} symbol - Trading pair symbol
   */
  async cancelOrder(orderId, symbol) {
    try {
      await this.exchange.cancelOrder(orderId, symbol);
      logger.info(`Order ${orderId} cancelled for ${symbol}`);
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error);
    }
  }

  /**
   * Get open positions
   * @returns {Array} Array of open positions
   */
  async getOpenPositions() {
    try {
      const positions = await this.exchange.fetchPositions();
      return positions.filter(pos => parseFloat(pos.contracts) > 0);
    } catch (error) {
      logger.error('Failed to get open positions:', error);
      return [];
    }
  }

  /**
   * Get account balance
   * @returns {Object} Account balance
   */
  async getBalance() {
    try {
      const balance = await this.exchange.fetchBalance();
      return balance;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return null;
    }
  }

  /**
   * Get current price for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {number} Current price
   */
  async getCurrentPrice(symbol) {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      return ticker.last;
    } catch (error) {
      logger.error(`Failed to get current price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get symbol info
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} Symbol information
   */
  getSymbolInfo(symbol) {
    return this.markets[symbol];
  }
}

export default new BinanceService();
