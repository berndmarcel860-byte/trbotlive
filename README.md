# AI Trading Scalping Bot for Binance Futures

An institutional-grade automated trading bot for Binance Futures that uses advanced technical analysis, Fibonacci retracement levels, and Dollar Cost Averaging (DCA) strategy for scalping on multiple timeframes (5m, 15m, 1h).

## Features

### Core Trading Features
- ✅ **Automatic Coin Selection**: Analyzes and selects top coins based on volume and volatility
- ✅ **Fibonacci-Based DCA Entries**: Smart entry points using Fibonacci retracement levels (38.2%, 50%, 61.8%)
- ✅ **Multi-Timeframe Analysis**: Analyzes 5-minute, 15-minute, and 1-hour timeframes simultaneously
- ✅ **Institutional-Grade Risk Management**: 3 take profit levels (TP1, TP2, TP3) and dynamic stop loss
- ✅ **Breakeven Protection**: Automatically moves stop loss to entry when TP1 is reached
- ✅ **Position Sizing**: Intelligent position sizing based on account balance and risk parameters

### Technical Analysis
- **Multiple Indicators**:
  - Simple Moving Averages (SMA 20, SMA 50)
  - Relative Strength Index (RSI)
  - Moving Average Convergence Divergence (MACD)
  - Bollinger Bands
  - Fibonacci Retracement Levels

### Risk Management
- **3-Level Take Profit System**:
  - TP1: 1.5% (closes 33% of position)
  - TP2: 3% (closes 33% of position)
  - TP3: 5% (closes remaining 34%)
- **Dynamic Stop Loss**: 2% initial stop loss, moved to breakeven after TP1
- **Leverage Control**: Configurable leverage (default 10x)
- **Position Limits**: Maximum concurrent positions to manage risk

### Telegram Integration
- 🤖 Real-time trade notifications
- 📊 Market analysis updates
- 🎯 Take profit alerts
- 🔴 Stop loss notifications
- ⚠️ Error alerts
- 📈 Position updates

## Installation

### Prerequisites
- Node.js 18+ installed
- Binance Futures account with API access
- Telegram bot token (optional but recommended)

### Setup Instructions

1. **Clone the repository**:
```bash
git clone https://github.com/berndmarcel860-byte/trbotlive.git
cd trbotlive
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:
```env
# Binance API Configuration
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
BINANCE_TESTNET=true  # Set to false for live trading

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Trading Configuration
TRADE_AMOUNT_USDT=100
MAX_POSITIONS=3
LEVERAGE=10

# Risk Management
STOP_LOSS_PERCENT=2
TAKE_PROFIT_1_PERCENT=1.5
TAKE_PROFIT_2_PERCENT=3
TAKE_PROFIT_3_PERCENT=5

# Timeframes for analysis
TIMEFRAMES=5m,15m,1h

# Top coins selection
MIN_VOLUME_USDT=10000000
TOP_COINS_COUNT=10
```

4. **Getting Binance API Keys**:
   - Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
   - Create a new API key
   - Enable "Enable Futures" permission
   - Whitelist your IP address (recommended)
   - Save your API Key and Secret Key

5. **Getting Telegram Bot Token** (Optional):
   - Open Telegram and search for [@BotFather](https://t.me/BotFather)
   - Send `/newbot` and follow instructions
   - Copy the bot token
   - To get your chat ID, send a message to [@userinfobot](https://t.me/userinfobot)

## Usage

### Start the Bot

**Development mode** (with auto-restart):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

### Testing on Testnet

**IMPORTANT**: Always test on Binance Futures Testnet first!

1. Go to [Binance Futures Testnet](https://testnet.binancefuture.com/)
2. Create a testnet account
3. Generate testnet API keys
4. Set `BINANCE_TESTNET=true` in your `.env` file

### Going Live

⚠️ **WARNING**: Only use live trading after thorough testing on testnet!

1. Set `BINANCE_TESTNET=false` in `.env`
2. Use your live Binance API keys
3. Start with small `TRADE_AMOUNT_USDT` values
4. Monitor the bot closely for the first few days

## How It Works

### 1. Market Scanning
- Every 60 seconds, the bot scans top coins by volume
- Filters coins meeting minimum volume requirements
- Analyzes each coin across multiple timeframes

### 2. Multi-Timeframe Analysis
- Analyzes 5m, 15m, and 1h charts simultaneously
- Calculates technical indicators (SMA, RSI, MACD, Bollinger Bands)
- Determines trend direction and strength
- Identifies Fibonacci retracement levels

### 3. Entry Conditions
- Requires bullish signals from at least 2 timeframes
- RSI must not be overbought (>75)
- Minimum confidence score of 60%
- Respects maximum position limits

### 4. DCA Entry Strategy
- **Initial Entry (40%)**: Enters at current price when signals align
- **DCA Level 1 (30%)**: Adds to position at 38.2% Fibonacci level
- **DCA Level 2 (30%)**: Final addition at 50% Fibonacci level

### 5. Take Profit & Stop Loss Management
- **TP1 (1.5%)**: Closes 33% of position
- **TP2 (3%)**: Closes another 33%
- **TP3 (5%)**: Closes remaining 34%
- **Breakeven**: When TP1 hits, stop loss moves to entry price
- **Stop Loss**: Initial 2% stop loss on entire position

### 6. Position Monitoring
- Monitors positions every 10 seconds
- Tracks DCA level execution
- Manages stop loss adjustments
- Sends Telegram notifications for all events

## Project Structure

```
trbotlive/
├── src/
│   ├── config/
│   │   └── config.js              # Configuration management
│   ├── services/
│   │   ├── binanceService.js      # Binance API integration
│   │   ├── telegramService.js     # Telegram notifications
│   │   ├── marketAnalysisService.js # Technical analysis
│   │   └── positionManager.js     # Position management
│   ├── strategies/
│   │   └── tradingStrategy.js     # Main trading logic
│   ├── utils/
│   │   ├── logger.js              # Logging utility
│   │   └── tradingUtils.js        # Trading calculations
│   └── index.js                   # Application entry point
├── logs/                          # Log files (auto-generated)
├── .env                          # Environment configuration
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Project dependencies
└── README.md                     # This file
```

## Configuration Options

### Trading Parameters

- `TRADE_AMOUNT_USDT`: Amount to trade per position in USDT
- `MAX_POSITIONS`: Maximum number of concurrent positions
- `LEVERAGE`: Leverage multiplier (1-125x, default 10x)
- `TIMEFRAMES`: Comma-separated timeframes to analyze

### Risk Management

- `STOP_LOSS_PERCENT`: Initial stop loss percentage
- `TAKE_PROFIT_1_PERCENT`: First take profit level
- `TAKE_PROFIT_2_PERCENT`: Second take profit level
- `TAKE_PROFIT_3_PERCENT`: Third take profit level

### Coin Selection

- `MIN_VOLUME_USDT`: Minimum 24h volume in USDT
- `TOP_COINS_COUNT`: Number of top coins to analyze

## Logs

Logs are saved in the `logs/` directory:
- `combined.log`: All log messages
- `error.log`: Error messages only

## Safety Features

- ✅ Testnet support for safe testing
- ✅ Maximum position limits
- ✅ Automatic stop loss on every trade
- ✅ Breakeven protection after TP1
- ✅ Emergency stop functionality
- ✅ Error notifications via Telegram
- ✅ Comprehensive logging
- ✅ Graceful shutdown handling

## Risk Disclaimer

⚠️ **IMPORTANT**: 
- Trading cryptocurrencies carries significant risk
- This bot is provided for educational purposes
- Past performance does not guarantee future results
- Only trade with money you can afford to lose
- Always test on testnet before live trading
- The developers are not responsible for any financial losses

## Troubleshooting

### Common Issues

**1. API Connection Errors**
- Verify API keys are correct
- Check IP whitelist settings on Binance
- Ensure Futures trading is enabled on your API key

**2. Insufficient Balance**
- Ensure you have enough USDT in your Futures wallet
- Reduce `TRADE_AMOUNT_USDT` if needed

**3. Telegram Notifications Not Working**
- Verify bot token is correct
- Ensure you've started a conversation with your bot
- Check that chat ID is correct

**4. No Trades Being Executed**
- Check if market conditions meet entry criteria
- Reduce minimum confidence thresholds if needed
- Verify that top coins are being found

## Support

For issues or questions:
- Open an issue on GitHub
- Check the logs for error messages
- Review the Telegram notifications for clues

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ for algorithmic traders**