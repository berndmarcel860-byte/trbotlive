/**
 * Calculate Fibonacci retracement levels
 * @param {number} high - High price
 * @param {number} low - Low price
 * @param {boolean} isUptrend - Whether the trend is upward
 * @returns {Object} Fibonacci levels
 */
export function calculateFibonacciLevels(high, low, isUptrend = true) {
  const diff = high - low;
  
  const levels = {
    level_0: isUptrend ? low : high,
    level_236: isUptrend ? low + diff * 0.236 : high - diff * 0.236,
    level_382: isUptrend ? low + diff * 0.382 : high - diff * 0.382,
    level_500: isUptrend ? low + diff * 0.5 : high - diff * 0.5,
    level_618: isUptrend ? low + diff * 0.618 : high - diff * 0.618,
    level_786: isUptrend ? low + diff * 0.786 : high - diff * 0.786,
    level_100: isUptrend ? high : low,
  };
  
  return levels;
}

/**
 * Get DCA entry levels based on Fibonacci
 * @param {Object} fibLevels - Fibonacci levels
 * @returns {Array} Array of entry prices
 */
export function getDCAEntryLevels(fibLevels) {
  return [
    fibLevels.level_382,
    fibLevels.level_500,
    fibLevels.level_618,
  ];
}

/**
 * Calculate position size based on risk
 * @param {number} accountBalance - Account balance in USDT
 * @param {number} riskPercent - Risk percentage per trade
 * @param {number} entryPrice - Entry price
 * @param {number} stopLossPrice - Stop loss price
 * @param {number} leverage - Leverage
 * @returns {number} Position size
 */
export function calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLossPrice, leverage = 1) {
  const riskAmount = accountBalance * (riskPercent / 100);
  const stopLossPercent = Math.abs((entryPrice - stopLossPrice) / entryPrice);
  const positionSize = (riskAmount / stopLossPercent) / entryPrice;
  
  return positionSize;
}

/**
 * Round to step size
 * @param {number} value - Value to round
 * @param {number} stepSize - Step size
 * @returns {number} Rounded value
 */
export function roundToStepSize(value, stepSize) {
  const precision = stepSize.toString().split('.')[1]?.length || 0;
  const rounded = Math.floor(value / stepSize) * stepSize;
  return parseFloat(rounded.toFixed(precision));
}

/**
 * Format price with precision as string
 * @param {number} price - Price to format
 * @param {number} precision - Price precision
 * @returns {string} Formatted price string
 */
export function formatPrice(price, precision = 8) {
  return parseFloat(price).toFixed(precision);
}
