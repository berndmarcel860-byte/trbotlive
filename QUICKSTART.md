# Quick Start Guide

## Initial Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Bot

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- Binance API Key and Secret
- Telegram Bot Token and Chat ID (optional)
- Adjust trading parameters

### 3. Test on Binance Testnet

**IMPORTANT**: Always start with testnet!

Set in `.env`:
```
BINANCE_TESTNET=true
```

Get testnet API keys from: https://testnet.binancefuture.com/

### 4. Start the Bot

```bash
npm start
```

## First Run Checklist

Before running the bot, ensure:

- [ ] You have Node.js 18+ installed
- [ ] Dependencies are installed (`npm install`)
- [ ] `.env` file is configured
- [ ] Using testnet mode (`BINANCE_TESTNET=true`)
- [ ] Have testnet API keys from Binance Futures Testnet
- [ ] (Optional) Telegram bot is set up

## Testing Your Setup

### Test 1: Check Configuration
```bash
node -e "import('./src/config/config.js').then(m => console.log(JSON.stringify(m.config, null, 2)))"
```

### Test 2: Verify Bot Starts
```bash
npm start
```

Look for:
- "Bot initialized successfully" in the logs
- No error messages
- Telegram notification (if configured)

### Test 3: Monitor First Scan
Watch the logs for:
- Market scanning messages
- Coin analysis
- Any entry signals

## Common First-Time Issues

### Issue: "Binance API credentials not configured"
**Solution**: Add your API keys to `.env` file

### Issue: "IP address not whitelisted"
**Solution**: Add your IP to API key whitelist on Binance

### Issue: "Insufficient balance"
**Solution**: Reduce `TRADE_AMOUNT_USDT` in `.env`

### Issue: No trades executing
**Solution**: Market conditions may not meet entry criteria. Be patient or adjust parameters.

## Safety First

1. **Always test on testnet first** - Get familiar with the bot behavior
2. **Start small** - Use minimal `TRADE_AMOUNT_USDT` when going live
3. **Monitor actively** - Watch the first few hours/days closely
4. **Set limits** - Keep `MAX_POSITIONS` low initially
5. **Use stop losses** - Never disable the stop loss feature

## Going Live Safely

When you're ready to go live:

1. Test on testnet for at least 24 hours
2. Review the logs and understand the bot's behavior
3. Set `BINANCE_TESTNET=false` in `.env`
4. Use your live Binance API keys
5. Start with `TRADE_AMOUNT_USDT=10` or similar small amount
6. Set `MAX_POSITIONS=1` initially
7. Monitor for the first full day

## Monitoring Your Bot

### Check Logs
```bash
# View all logs
tail -f logs/combined.log

# View only errors
tail -f logs/error.log
```

### Telegram Notifications
If configured, you'll receive:
- Trade entry notifications
- Take profit alerts
- Stop loss alerts
- Error messages

## Support

- Check `README.md` for full documentation
- Review `logs/` directory for detailed information
- Open GitHub issues for bugs or questions

---

**Remember**: Only trade with money you can afford to lose!
