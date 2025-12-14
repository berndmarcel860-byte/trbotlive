import logger from '../utils/logger.js';
import binanceService from './binanceService.js';
import telegramService from './telegramService.js';
import { config } from '../config/config.js';

class PositionManager {
  constructor() {
    this.positions = new Map();
    this.orderIds = new Map();
  }

  /**
   * Open a new position with DCA entries
   * @param {Object} tradeSetup - Trade setup details
   * @returns {Object} Position details
   */
  async openPosition(tradeSetup) {
    try {
      const { symbol, side, entryPrice, dcaLevels, analysis } = tradeSetup;

      // Set leverage and margin mode
      await binanceService.setLeverage(symbol, config.trading.leverage);
      await binanceService.setMarginMode(symbol, 'isolated');

      // Calculate position size
      const balance = await binanceService.getBalance();
      const availableBalance = balance.USDT?.free || 0;
      const tradeAmount = Math.min(config.trading.tradeAmountUsdt, availableBalance * 0.3);

      if (tradeAmount < 10) {
        logger.warn(`Insufficient balance for ${symbol}`);
        return null;
      }

      // Get symbol info for precision
      const symbolInfo = binanceService.getSymbolInfo(symbol);
      const amountPrecision = symbolInfo?.precision?.amount || 3;
      const pricePrecision = symbolInfo?.precision?.price || 2;

      // Calculate DCA amounts (split into 3 entries)
      const dcaAmounts = [
        tradeAmount * 0.4, // 40% at first entry
        tradeAmount * 0.3, // 30% at second entry
        tradeAmount * 0.3, // 30% at third entry
      ];

      // Place first entry order
      const quantity = parseFloat((dcaAmounts[0] / entryPrice).toFixed(amountPrecision));
      const entryOrder = await binanceService.createMarketOrder(symbol, side, quantity);

      if (!entryOrder) {
        logger.error(`Failed to open position for ${symbol}`);
        return null;
      }

      // Calculate TP and SL prices
      const multiplier = side === 'buy' ? 1 : -1;
      const stopLossPrice = parseFloat((entryPrice * (1 - multiplier * config.riskManagement.stopLossPercent / 100)).toFixed(pricePrecision));
      
      const tp1Price = parseFloat((entryPrice * (1 + multiplier * config.riskManagement.takeProfitLevels[0].percent / 100)).toFixed(pricePrecision));
      const tp2Price = parseFloat((entryPrice * (1 + multiplier * config.riskManagement.takeProfitLevels[1].percent / 100)).toFixed(pricePrecision));
      const tp3Price = parseFloat((entryPrice * (1 + multiplier * config.riskManagement.takeProfitLevels[2].percent / 100)).toFixed(pricePrecision));

      // Place stop loss order
      const slSide = side === 'buy' ? 'sell' : 'buy';
      const slOrder = await binanceService.createStopLossOrder(symbol, slSide, quantity, stopLossPrice);

      // Place take profit orders
      const tp1Quantity = parseFloat((quantity * config.riskManagement.takeProfitLevels[0].closePercent).toFixed(amountPrecision));
      const tp2Quantity = parseFloat((quantity * config.riskManagement.takeProfitLevels[1].closePercent).toFixed(amountPrecision));
      const tp3Quantity = parseFloat((quantity - tp1Quantity - tp2Quantity).toFixed(amountPrecision));

      const tp1Order = await binanceService.createTakeProfitOrder(symbol, slSide, tp1Quantity, tp1Price);
      const tp2Order = await binanceService.createTakeProfitOrder(symbol, slSide, tp2Quantity, tp2Price);
      const tp3Order = await binanceService.createTakeProfitOrder(symbol, slSide, tp3Quantity, tp3Price);

      // Store position details
      const position = {
        symbol,
        side,
        entryPrice: parseFloat(entryOrder.average || entryPrice),
        quantity,
        remainingQuantity: quantity,
        leverage: config.trading.leverage,
        positionValue: tradeAmount,
        stopLoss: stopLossPrice,
        slPercent: config.riskManagement.stopLossPercent,
        tp1: tp1Price,
        tp1Percent: config.riskManagement.takeProfitLevels[0].percent,
        tp2: tp2Price,
        tp2Percent: config.riskManagement.takeProfitLevels[1].percent,
        tp3: tp3Price,
        tp3Percent: config.riskManagement.takeProfitLevels[2].percent,
        dcaLevels,
        dcaAmounts,
        dcaExecuted: [true, false, false],
        entryTime: Date.now(),
        status: 'OPEN',
        breakeven: false,
        orders: {
          entry: entryOrder.id,
          stopLoss: slOrder?.id,
          tp1: tp1Order?.id,
          tp2: tp2Order?.id,
          tp3: tp3Order?.id,
        },
        timeframe: analysis.analyses[config.trading.timeframes[0]]?.timeframe || '5m',
      };

      this.positions.set(symbol, position);
      logger.info(`Position opened for ${symbol}:`, position);

      // Send Telegram notification
      await telegramService.notifyEntry(position);

      return position;
    } catch (error) {
      logger.error(`Failed to open position:`, error);
      await telegramService.notifyError(`Failed to open position for ${tradeSetup.symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Monitor and update positions
   */
  async monitorPositions() {
    try {
      const openPositions = await binanceService.getOpenPositions();
      
      for (const [symbol, position] of this.positions.entries()) {
        const currentPrice = await binanceService.getCurrentPrice(symbol);
        
        if (!currentPrice) continue;

        // Check if TP1 was hit and move SL to breakeven
        if (!position.breakeven && this.shouldMoveToBreakeven(position, currentPrice)) {
          await this.moveStopLossToBreakeven(position);
        }

        // Check DCA levels
        await this.checkDCALevels(position, currentPrice);

        // Update unrealized PnL
        const pnl = this.calculateUnrealizedPnL(position, currentPrice);
        
        // Log position status
        if (Math.abs(pnl.percent) > 0.5) {
          logger.debug(`Position ${symbol}: ${pnl.percent.toFixed(2)}% PnL`);
        }
      }
    } catch (error) {
      logger.error('Failed to monitor positions:', error);
    }
  }

  /**
   * Check if should move stop loss to breakeven
   * @param {Object} position - Position details
   * @param {number} currentPrice - Current market price
   * @returns {boolean} Whether to move to breakeven
   */
  shouldMoveToBreakeven(position, currentPrice) {
    if (position.side === 'buy') {
      return currentPrice >= position.tp1;
    } else {
      return currentPrice <= position.tp1;
    }
  }

  /**
   * Move stop loss to breakeven
   * @param {Object} position - Position details
   */
  async moveStopLossToBreakeven(position) {
    try {
      // Cancel existing stop loss
      if (position.orders.stopLoss) {
        await binanceService.cancelOrder(position.orders.stopLoss, position.symbol);
      }

      // Create new stop loss at entry
      const slSide = position.side === 'buy' ? 'sell' : 'buy';
      const slOrder = await binanceService.createStopLossOrder(
        position.symbol,
        slSide,
        position.remainingQuantity,
        position.entryPrice
      );

      position.stopLoss = position.entryPrice;
      position.breakeven = true;
      position.orders.stopLoss = slOrder?.id;

      logger.info(`Stop loss moved to breakeven for ${position.symbol}`);
      
      await telegramService.notifyPositionUpdate({
        symbol: position.symbol,
        currentPrice: await binanceService.getCurrentPrice(position.symbol),
        entryPrice: position.entryPrice,
        unrealizedPnL: 0,
        pnlPercent: 0,
        status: 'Stop Loss at Breakeven',
      });
    } catch (error) {
      logger.error(`Failed to move stop loss to breakeven:`, error);
    }
  }

  /**
   * Check and execute DCA levels
   * @param {Object} position - Position details
   * @param {number} currentPrice - Current market price
   */
  async checkDCALevels(position, currentPrice) {
    try {
      for (let i = 1; i < position.dcaLevels.length; i++) {
        if (position.dcaExecuted[i]) continue;

        const dcaLevel = position.dcaLevels[i];
        const shouldExecute = position.side === 'buy' 
          ? currentPrice <= dcaLevel 
          : currentPrice >= dcaLevel;

        if (shouldExecute) {
          await this.executeDCA(position, i, currentPrice);
        }
      }
    } catch (error) {
      logger.error('Failed to check DCA levels:', error);
    }
  }

  /**
   * Execute DCA entry
   * @param {Object} position - Position details
   * @param {number} dcaIndex - DCA level index
   * @param {number} currentPrice - Current market price
   */
  async executeDCA(position, dcaIndex, currentPrice) {
    try {
      const symbolInfo = binanceService.getSymbolInfo(position.symbol);
      const amountPrecision = symbolInfo?.precision?.amount || 3;

      const dcaAmount = position.dcaAmounts[dcaIndex];
      const quantity = parseFloat((dcaAmount / currentPrice).toFixed(amountPrecision));

      const order = await binanceService.createMarketOrder(position.symbol, position.side, quantity);

      if (order) {
        position.dcaExecuted[dcaIndex] = true;
        
        // Calculate new average entry price correctly
        const oldQuantity = position.remainingQuantity;
        const totalCost = position.entryPrice * oldQuantity + currentPrice * quantity;
        position.remainingQuantity += quantity;
        position.entryPrice = totalCost / position.remainingQuantity;

        logger.info(`DCA ${dcaIndex + 1} executed for ${position.symbol} at ${currentPrice}`);
        
        await telegramService.notifyPositionUpdate({
          symbol: position.symbol,
          currentPrice,
          entryPrice: position.entryPrice,
          unrealizedPnL: 0,
          pnlPercent: 0,
          status: `DCA Entry ${dcaIndex + 1} executed`,
        });
      }
    } catch (error) {
      logger.error(`Failed to execute DCA:`, error);
    }
  }

  /**
   * Calculate unrealized PnL
   * @param {Object} position - Position details
   * @param {number} currentPrice - Current market price
   * @returns {Object} PnL details
   */
  calculateUnrealizedPnL(position, currentPrice) {
    const multiplier = position.side === 'buy' ? 1 : -1;
    const priceDiff = (currentPrice - position.entryPrice) * multiplier;
    const pnlPercent = (priceDiff / position.entryPrice) * 100 * position.leverage;
    const pnlAmount = position.positionValue * (pnlPercent / 100);

    return {
      amount: pnlAmount,
      percent: pnlPercent,
    };
  }

  /**
   * Close a position
   * @param {string} symbol - Trading pair symbol
   */
  async closePosition(symbol) {
    try {
      const position = this.positions.get(symbol);
      if (!position) return;

      // Cancel all open orders
      for (const orderId of Object.values(position.orders)) {
        if (orderId) {
          await binanceService.cancelOrder(orderId, symbol);
        }
      }

      // Close position with market order
      const slSide = position.side === 'buy' ? 'sell' : 'buy';
      await binanceService.createMarketOrder(symbol, slSide, position.remainingQuantity);

      position.status = 'CLOSED';
      this.positions.delete(symbol);

      logger.info(`Position closed for ${symbol}`);
    } catch (error) {
      logger.error(`Failed to close position for ${symbol}:`, error);
    }
  }

  /**
   * Get active positions count
   * @returns {number} Number of active positions
   */
  getActivePositionsCount() {
    return this.positions.size;
  }

  /**
   * Check if symbol has open position
   * @param {string} symbol - Trading pair symbol
   * @returns {boolean} Whether position exists
   */
  hasPosition(symbol) {
    return this.positions.has(symbol);
  }
}

export default new PositionManager();
