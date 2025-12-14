#!/usr/bin/env node

/**
 * Configuration Validator
 * Validates the bot configuration before starting
 */

import { config } from './src/config/config.js';
import fs from 'fs';
import path from 'path';

console.log('='.repeat(60));
console.log('Configuration Validator');
console.log('='.repeat(60));

let hasErrors = false;
let hasWarnings = false;

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.error('❌ ERROR: .env file not found');
  console.log('   Please copy .env.example to .env and configure it');
  hasErrors = true;
} else {
  console.log('✅ .env file found');
}

// Validate Binance Configuration
console.log('\n📊 Binance Configuration:');
if (!config.binance.apiKey || config.binance.apiKey === 'your_binance_api_key_here') {
  console.error('   ❌ BINANCE_API_KEY not configured');
  hasErrors = true;
} else {
  console.log(`   ✅ API Key: ${config.binance.apiKey.substring(0, 8)}...`);
}

if (!config.binance.secretKey || config.binance.secretKey === 'your_binance_secret_key_here') {
  console.error('   ❌ BINANCE_SECRET_KEY not configured');
  hasErrors = true;
} else {
  console.log(`   ✅ Secret Key: ${config.binance.secretKey.substring(0, 8)}...`);
}

console.log(`   ${config.binance.testnet ? '🧪 Testnet Mode: ENABLED' : '⚠️  Live Trading Mode: ENABLED'}`);
if (!config.binance.testnet) {
  console.warn('   ⚠️  WARNING: You are in LIVE trading mode!');
  hasWarnings = true;
}

// Validate Telegram Configuration
console.log('\n📱 Telegram Configuration:');
if (!config.telegram.botToken || config.telegram.botToken === 'your_telegram_bot_token_here') {
  console.warn('   ⚠️  Telegram bot token not configured (optional)');
  console.log('   ℹ️  Notifications will be disabled');
  hasWarnings = true;
} else {
  console.log(`   ✅ Bot Token: ${config.telegram.botToken.substring(0, 10)}...`);
}

if (!config.telegram.chatId || config.telegram.chatId === 'your_telegram_chat_id_here') {
  if (config.telegram.botToken && config.telegram.botToken !== 'your_telegram_bot_token_here') {
    console.warn('   ⚠️  Telegram chat ID not configured');
    hasWarnings = true;
  }
} else {
  console.log(`   ✅ Chat ID: ${config.telegram.chatId}`);
}

// Validate Trading Configuration
console.log('\n💰 Trading Configuration:');
console.log(`   Trade Amount: ${config.trading.tradeAmountUsdt} USDT`);
console.log(`   Max Positions: ${config.trading.maxPositions}`);
console.log(`   Leverage: ${config.trading.leverage}x`);
console.log(`   Timeframes: ${config.trading.timeframes.join(', ')}`);

if (config.trading.tradeAmountUsdt < 10) {
  console.warn('   ⚠️  WARNING: Trade amount is very low (<10 USDT)');
  hasWarnings = true;
}

if (config.trading.leverage > 20) {
  console.warn('   ⚠️  WARNING: High leverage (>20x) increases risk significantly');
  hasWarnings = true;
}

// Validate Risk Management
console.log('\n🛡️  Risk Management:');
console.log(`   Stop Loss: ${config.riskManagement.stopLossPercent}%`);
config.riskManagement.takeProfitLevels.forEach((tp, i) => {
  console.log(`   TP${i + 1}: ${tp.percent}% (closes ${(tp.closePercent * 100).toFixed(0)}%)`);
});

if (config.riskManagement.stopLossPercent > 5) {
  console.warn('   ⚠️  WARNING: Stop loss >5% is considered high risk');
  hasWarnings = true;
}

// Validate Coin Selection
console.log('\n🪙 Coin Selection:');
console.log(`   Min Volume: $${(config.coinSelection.minVolumeUsdt / 1000000).toFixed(1)}M`);
console.log(`   Top Coins: ${config.coinSelection.topCoinsCount}`);

// Check logs directory
console.log('\n📝 Logs Directory:');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  console.log('   ℹ️  Logs directory will be created on first run');
} else {
  console.log('   ✅ Logs directory exists');
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('❌ Configuration has ERRORS. Please fix them before starting the bot.');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Configuration has warnings. Review them before proceeding.');
  console.log('✅ No critical errors found. Bot can start.');
  process.exit(0);
} else {
  console.log('✅ Configuration is valid. Bot is ready to start!');
  process.exit(0);
}
