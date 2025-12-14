import dotenv from 'dotenv';

dotenv.config();

export const config = {
  binance: {
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || '',
    testnet: process.env.BINANCE_TESTNET === 'true',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  trading: {
    tradeAmountUsdt: parseFloat(process.env.TRADE_AMOUNT_USDT) || 100,
    maxPositions: parseInt(process.env.MAX_POSITIONS) || 3,
    leverage: parseInt(process.env.LEVERAGE) || 10,
    timeframes: (process.env.TIMEFRAMES || '5m,15m,1h').split(','),
  },
  riskManagement: {
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || 2,
    takeProfitLevels: [
      { percent: parseFloat(process.env.TAKE_PROFIT_1_PERCENT) || 1.5, closePercent: 0.33 },
      { percent: parseFloat(process.env.TAKE_PROFIT_2_PERCENT) || 3, closePercent: 0.33 },
      { percent: parseFloat(process.env.TAKE_PROFIT_3_PERCENT) || 5, closePercent: 0.34 },
    ],
  },
  coinSelection: {
    minVolumeUsdt: parseFloat(process.env.MIN_VOLUME_USDT) || 10000000,
    topCoinsCount: parseInt(process.env.TOP_COINS_COUNT) || 10,
  },
};
