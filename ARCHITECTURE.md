# Trading Bot Architecture

## System Overview

The AI Trading Scalping Bot is designed with a modular, institutional-grade architecture that separates concerns and enables maintainable, scalable code.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Main Application                         │
│                         (src/index.js)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   Initialize    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Binance Service│ │ Telegram Service│ │Trading Strategy │
│                 │ │                 │ │                 │
│ - Connect API   │ │ - Send Messages │ │ - Scan Markets  │
│ - Get Markets   │ │ - Notifications │ │ - Entry Logic   │
│ - Place Orders  │ │ - Alerts        │ │ - Monitor Pos.  │
└────────┬────────┘ └─────────────────┘ └────────┬────────┘
         │                                        │
         │                                        │
         └─────────────────┬──────────────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │    Market Analysis Service     │
           │                               │
           │  - Multi-timeframe Analysis   │
           │  - Technical Indicators       │
           │  - Fibonacci Levels          │
           │  - Entry Condition Check      │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │     Position Manager          │
           │                               │
           │  - Open Positions             │
           │  - DCA Entry Execution        │
           │  - TP/SL Management          │
           │  - Breakeven Logic           │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │      Trading Utils            │
           │                               │
           │  - Fibonacci Calculator       │
           │  - Position Sizing           │
           │  - Price Formatting          │
           └───────────────────────────────┘
```

## Component Details

### 1. Main Application (`src/index.js`)
**Responsibility**: Application entry point and lifecycle management

- Initializes all services
- Coordinates startup sequence
- Handles graceful shutdown
- Manages error handling and recovery
- Sets up signal handlers (SIGTERM, SIGINT)

### 2. Configuration (`src/config/config.js`)
**Responsibility**: Centralized configuration management

- Loads environment variables
- Provides typed configuration objects
- Validates configuration values
- Manages default values

### 3. Binance Service (`src/services/binanceService.js`)
**Responsibility**: All Binance API interactions

Key Functions:
- `initialize()` - Connect to Binance Futures API
- `getTopCoins()` - Retrieve highest volume trading pairs
- `getOHLCV()` - Get candlestick data
- `setLeverage()` - Configure position leverage
- `createMarketOrder()` - Place market orders
- `createStopLossOrder()` - Place stop loss orders
- `createTakeProfitOrder()` - Place take profit orders
- `getOpenPositions()` - Retrieve current positions
- `getCurrentPrice()` - Get real-time price

### 4. Telegram Service (`src/services/telegramService.js`)
**Responsibility**: User notifications via Telegram

Key Functions:
- `initialize()` - Setup Telegram bot
- `notifyEntry()` - Send new position notification
- `notifyTakeProfit()` - Alert when TP levels hit
- `notifyStopLoss()` - Alert when SL triggered
- `notifyMarketAnalysis()` - Send market overview
- `notifyError()` - Alert about errors

### 5. Market Analysis Service (`src/services/marketAnalysisService.js`)
**Responsibility**: Technical analysis and signal generation

Key Functions:
- `analyzeMultipleTimeframes()` - Analyze across 5m, 15m, 1h
- `analyzeSingleTimeframe()` - Perform technical analysis
- `checkEntryConditions()` - Validate entry signals
- `determineTrend()` - Identify market trend direction
- `calculateVolatility()` - Measure price volatility

Technical Indicators Used:
- **SMA (Simple Moving Average)**: Trend direction
- **RSI (Relative Strength Index)**: Overbought/oversold conditions
- **MACD (Moving Average Convergence Divergence)**: Momentum
- **Bollinger Bands**: Volatility and extremes
- **Fibonacci Retracement**: Support/resistance levels

### 6. Position Manager (`src/services/positionManager.js`)
**Responsibility**: Trade execution and position lifecycle

Key Functions:
- `openPosition()` - Execute entry with full order setup
- `monitorPositions()` - Continuous position tracking
- `moveStopLossToBreakeven()` - SL adjustment after TP1
- `checkDCALevels()` - Monitor for DCA entry triggers
- `executeDCA()` - Add to position at Fibonacci levels
- `calculateUnrealizedPnL()` - Track profit/loss
- `closePosition()` - Exit position completely

### 7. Trading Strategy (`src/strategies/tradingStrategy.js`)
**Responsibility**: Core trading logic and orchestration

Key Functions:
- `start()` - Begin trading operations
- `scanMarkets()` - Periodic market scanning
- `executeEntry()` - Coordinate entry execution
- `monitorPositions()` - Position monitoring loop
- `emergencyStop()` - Emergency shutdown with position closure

### 8. Trading Utils (`src/utils/tradingUtils.js`)
**Responsibility**: Mathematical calculations and utilities

Key Functions:
- `calculateFibonacciLevels()` - Compute Fib retracement levels
- `getDCAEntryLevels()` - Extract DCA entry points
- `calculatePositionSize()` - Risk-based position sizing
- `roundToStepSize()` - Exchange-compliant rounding
- `formatPrice()` - Price formatting utilities

### 9. Logger (`src/utils/logger.js`)
**Responsibility**: Centralized logging

Features:
- Multiple log levels (info, warn, error, debug)
- Console and file outputs
- Structured logging with timestamps
- Separate error log file
- Color-coded console output

## Data Flow

### 1. Market Scanning Flow
```
Trading Strategy
    ↓
Get Top Coins (Binance Service)
    ↓
For each coin:
    ↓
Analyze Multiple Timeframes (Market Analysis)
    ↓
Calculate Technical Indicators
    ↓
Determine Fibonacci Levels
    ↓
Check Entry Conditions
    ↓
If conditions met → Execute Entry
```

### 2. Entry Execution Flow
```
Execute Entry (Trading Strategy)
    ↓
Open Position (Position Manager)
    ↓
Set Leverage & Margin Mode (Binance Service)
    ↓
Calculate Position Size
    ↓
Place Market Order (Entry)
    ↓
Place Stop Loss Order
    ↓
Place 3 Take Profit Orders
    ↓
Store Position Details
    ↓
Send Telegram Notification
```

### 3. Position Monitoring Flow
```
Monitor Positions (Position Manager)
    ↓
For each open position:
    ↓
Get Current Price (Binance Service)
    ↓
Check if TP1 reached → Move SL to Breakeven
    ↓
Check DCA Levels → Execute DCA if triggered
    ↓
Calculate Unrealized PnL
    ↓
Log Status & Send Notifications
```

### 4. DCA Execution Flow
```
Current Price reaches DCA Level
    ↓
Execute DCA (Position Manager)
    ↓
Calculate DCA Order Size
    ↓
Place Market Order (Binance Service)
    ↓
Update Position:
    - Increase quantity
    - Recalculate average entry
    - Mark DCA level as executed
    ↓
Send Notification
```

## Key Design Patterns

### 1. Singleton Pattern
All services are implemented as singletons to ensure single instance across the application:
```javascript
export default new BinanceService();
```

### 2. Service Layer Pattern
Clear separation between:
- **Services**: External integrations (Binance, Telegram)
- **Strategies**: Business logic (trading decisions)
- **Utils**: Pure functions (calculations)

### 3. Event-Driven Architecture
- Periodic scanning (time-based events)
- Position monitoring (state change events)
- Order execution (action events)

### 4. Dependency Injection
Services are imported and used, allowing easy mocking for tests:
```javascript
import binanceService from '../services/binanceService.js';
```

## Configuration Management

### Environment Variables
All sensitive and configurable values are stored in `.env`:
- API credentials
- Trading parameters
- Risk management settings
- Feature flags (testnet mode)

### Config Object
Centralized config object provides:
- Type-safe access to settings
- Default values
- Validation logic
- Parsing of environment variables

## Error Handling Strategy

### Levels of Error Handling

1. **Service Level**: Try-catch blocks with logging
2. **Strategy Level**: Recovery logic for transient failures
3. **Application Level**: Graceful shutdown on critical errors
4. **User Level**: Telegram notifications for important events

### Recovery Mechanisms

- **API Errors**: Retry with exponential backoff
- **Network Issues**: Automatic reconnection
- **Invalid Orders**: Log and notify, continue operation
- **Critical Failures**: Emergency stop with position closure

## Security Considerations

### API Key Protection
- Keys stored in `.env` (not committed)
- Keys never logged
- IP whitelist recommended on Binance

### Rate Limiting
- CCXT built-in rate limiting enabled
- Configurable scan intervals
- Staggered order placement

### Risk Management
- Maximum position limits
- Mandatory stop losses
- Position sizing based on account balance
- Breakeven protection after TP1

## Performance Optimization

### Efficient Market Scanning
- Top coins filtered by volume
- Parallel analysis possible
- Skip coins with existing positions

### Caching Strategy
- Markets loaded once on startup
- Symbol info cached
- Position state maintained in memory

### Resource Management
- Interval-based operations (not continuous loops)
- Graceful shutdown cleans up resources
- Log rotation to prevent disk bloat

## Scalability Considerations

### Horizontal Scaling
Current design supports single instance. For multiple instances:
- Need distributed position tracking
- Coordination for maximum position limits
- Shared state management (Redis)

### Vertical Scaling
Can handle:
- 100+ coins analysis
- Multiple concurrent positions
- High-frequency monitoring

### Extension Points
Easy to add:
- New technical indicators
- Additional exchanges
- More sophisticated strategies
- Machine learning models

## Testing Strategy

### Unit Tests (Future)
- Trading calculations (Fibonacci, position sizing)
- Indicator calculations
- Price formatting

### Integration Tests (Future)
- Binance API interactions (testnet)
- Order placement and management
- Position lifecycle

### Manual Testing
- Testnet trading required before live
- Paper trading recommended
- Gradual position size increase

## Monitoring & Observability

### Logs
- **combined.log**: All operations
- **error.log**: Errors only
- Structured JSON format
- Timestamp and context included

### Notifications
- Real-time trade alerts via Telegram
- Entry/exit confirmations
- Error notifications
- Periodic market updates

### Metrics (Future Enhancement)
- Win/loss ratio
- Average profit per trade
- Daily/weekly performance
- Sharpe ratio

## Deployment Considerations

### Environment Setup
- Node.js 18+ required
- Stable internet connection
- 24/7 operation recommended

### Process Management
Recommended tools:
- **PM2**: Process manager with auto-restart
- **Docker**: Containerized deployment
- **systemd**: Linux service management

### Backup & Recovery
- Configuration files backed up
- Position state can be recovered from Binance
- Logs retained for auditing

---

This architecture ensures the bot is:
- ✅ **Maintainable**: Clear code organization
- ✅ **Scalable**: Modular design
- ✅ **Reliable**: Comprehensive error handling
- ✅ **Observable**: Detailed logging and notifications
- ✅ **Secure**: API key protection and risk management
