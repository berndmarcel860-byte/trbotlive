# Deployment Guide

This guide covers different deployment options for the trading bot in production environments.

## Deployment Options

1. **Simple Node.js Process** (Quick start)
2. **PM2 Process Manager** (Recommended)
3. **Docker Container** (Isolated environment)
4. **Systemd Service** (Linux native)
5. **Cloud VPS** (DigitalOcean, AWS, etc.)

---

## Option 1: Simple Node.js Process

### Pros
- Quick to set up
- Good for testing

### Cons
- No auto-restart
- Stops when terminal closes
- No process monitoring

### Steps

```bash
# Start the bot
npm start

# Or with nohup for background execution
nohup npm start > bot.log 2>&1 &
```

**Not recommended for production**

---

## Option 2: PM2 Process Manager (Recommended)

### Pros
- Auto-restart on crash
- Log management
- Process monitoring
- Easy deployment
- Built-in clustering

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start src/index.js --name trbotlive

# Enable startup on system boot
pm2 startup
pm2 save

# View logs
pm2 logs trbotlive

# Monitor
pm2 monit

# Restart
pm2 restart trbotlive

# Stop
pm2 stop trbotlive

# View status
pm2 status
```

### PM2 Ecosystem File

Create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'trbotlive',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10
  }]
};
```

Then start with:
```bash
pm2 start ecosystem.config.cjs
```

---

## Option 3: Docker Container

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create logs directory
RUN mkdir -p logs

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Start the bot
CMD ["node", "src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  trbotlive:
    build: .
    container_name: trbotlive
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./logs:/usr/src/app/logs
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# View status
docker-compose ps
```

---

## Option 4: Systemd Service (Linux)

### Create Service File

Create `/etc/systemd/system/trbotlive.service`:

```ini
[Unit]
Description=AI Trading Bot for Binance Futures
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/trbotlive
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/ubuntu/trbotlive/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=trbotlive

[Install]
WantedBy=multi-user.target
```

### Commands

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable trbotlive

# Start service
sudo systemctl start trbotlive

# View status
sudo systemctl status trbotlive

# View logs
sudo journalctl -u trbotlive -f

# Stop service
sudo systemctl stop trbotlive

# Restart service
sudo systemctl restart trbotlive
```

---

## Option 5: Cloud VPS Deployment

### Recommended Providers

1. **DigitalOcean** - $6/month droplet
2. **AWS Lightsail** - $5/month
3. **Vultr** - $5/month
4. **Linode** - $5/month

### Minimum Requirements

- 1 CPU core
- 1GB RAM
- 25GB SSD
- Ubuntu 20.04+ or Debian 11+

### Initial Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install git
sudo apt install -y git

# Clone repository
git clone https://github.com/berndmarcel860-byte/trbotlive.git
cd trbotlive

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your credentials

# Validate configuration
npm run validate

# Install PM2
sudo npm install -g pm2

# Start bot with PM2
pm2 start src/index.js --name trbotlive
pm2 startup
pm2 save

# Setup firewall (optional)
sudo ufw allow 22/tcp
sudo ufw enable
```

### SSH Configuration

For secure access:

```bash
# Generate SSH key (on local machine)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id user@server_ip

# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

---

## Monitoring & Alerts

### PM2 Plus (Optional)

Free monitoring dashboard:

```bash
# Register at https://pm2.io
pm2 link <secret_key> <public_key>

# View metrics at pm2.io dashboard
```

### Custom Monitoring Script

Create `monitor.sh`:

```bash
#!/bin/bash

# Check if bot is running
if ! pm2 list | grep -q "trbotlive.*online"; then
    echo "Bot is not running! Restarting..."
    pm2 restart trbotlive
    
    # Send alert (requires curl)
    curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
         -d "chat_id=<YOUR_CHAT_ID>" \
         -d "text=⚠️ Trading bot was down and has been restarted"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage is at ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "Memory usage is at ${MEMORY_USAGE}%"
fi
```

Add to crontab:
```bash
crontab -e
# Add: */5 * * * * /home/ubuntu/trbotlive/monitor.sh
```

---

## Backup Strategy

### Configuration Backup

```bash
# Backup .env file (secure location!)
cp .env /secure/backup/location/.env.backup

# Or encrypt it
gpg -c .env
# Uploads encrypted file to secure storage
```

### Log Rotation

Create `/etc/logrotate.d/trbotlive`:

```
/home/ubuntu/trbotlive/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

---

## Updating the Bot

### Manual Update

```bash
# Stop the bot
pm2 stop trbotlive

# Backup current version
cp -r ~/trbotlive ~/trbotlive.backup

# Pull updates
cd ~/trbotlive
git pull origin main

# Install new dependencies
npm install

# Validate configuration
npm run validate

# Restart bot
pm2 restart trbotlive

# Monitor logs
pm2 logs trbotlive
```

### Automated Update Script

Create `update.sh`:

```bash
#!/bin/bash

echo "Stopping bot..."
pm2 stop trbotlive

echo "Backing up..."
cp -r ~/trbotlive ~/trbotlive.backup.$(date +%Y%m%d_%H%M%S)

echo "Pulling updates..."
cd ~/trbotlive
git pull origin main

echo "Installing dependencies..."
npm install

echo "Validating configuration..."
npm run validate

if [ $? -eq 0 ]; then
    echo "Restarting bot..."
    pm2 restart trbotlive
    echo "Update complete!"
else
    echo "Configuration validation failed!"
    echo "Restoring backup..."
    pm2 start trbotlive
fi
```

---

## Security Best Practices

### 1. API Key Security
- Never commit `.env` to git
- Use IP whitelist on Binance
- Create API keys with only necessary permissions
- Rotate keys periodically

### 2. Server Security
```bash
# Keep system updated
sudo apt update && sudo apt upgrade -y

# Setup firewall
sudo ufw enable
sudo ufw allow 22/tcp

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Install fail2ban
sudo apt install fail2ban
```

### 3. Network Security
- Use SSH keys instead of passwords
- Change default SSH port
- Enable two-factor authentication where possible

### 4. Monitoring
- Enable Telegram notifications
- Monitor logs regularly
- Set up alerts for errors
- Track performance metrics

---

## Troubleshooting Deployment

### Bot Won't Start

```bash
# Check logs
pm2 logs trbotlive --lines 100

# Validate configuration
npm run validate

# Check Node.js version
node --version  # Should be 18+

# Test connectivity
node -e "console.log('Node.js works')"
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart bot
pm2 restart trbotlive

# Add memory limit to PM2
pm2 restart trbotlive --max-memory-restart 500M
```

### Connection Issues

```bash
# Test Binance API
curl https://fapi.binance.com/fapi/v1/ping

# Test DNS resolution
nslookup fapi.binance.com

# Check firewall
sudo ufw status
```

---

## Production Checklist

- [ ] Bot tested on testnet for at least 24 hours
- [ ] Configuration validated (`npm run validate`)
- [ ] `.env` file properly configured
- [ ] API keys have correct permissions
- [ ] IP whitelisting enabled on Binance
- [ ] Telegram notifications working
- [ ] PM2 or systemd configured for auto-restart
- [ ] Logs rotation configured
- [ ] Monitoring in place
- [ ] Backup strategy implemented
- [ ] Server secured (firewall, SSH)
- [ ] Small position size for first week
- [ ] Emergency stop procedure documented

---

## Support & Maintenance

### Daily Tasks
- Check Telegram notifications
- Review P&L in logs
- Verify bot is running (`pm2 status`)

### Weekly Tasks
- Review performance metrics
- Check for updates
- Analyze winning/losing trades
- Adjust parameters if needed

### Monthly Tasks
- Rotate API keys
- Review and optimize strategy
- Backup configuration
- Update dependencies

---

**Remember**: Start small, monitor closely, and scale gradually!
