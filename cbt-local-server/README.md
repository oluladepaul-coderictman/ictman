# CBT Bulldozer Local Server

Run this on your PC/laptop so your Android APK and desktop PWA can connect to it from anywhere on your network (or internet with port forwarding).

## Quick Start

### Windows (PowerShell)
```powershell
.\START-WINDOWS.ps1
```

### Linux / Mac (Terminal)
```bash
chmod +x START-LINUX-MAC.sh
./START-LINUX-MAC.sh
```

## First-Time Setup

1. Copy `.env.example` to `.env`
2. Edit `.env`:
   - Set `PORT` (default: 3001)
   - Set `API_TARGET` to your Replit CBT API URL
3. Run the start script for your OS

## Connecting the APK

1. Find your PC's local IP:
   - **Windows**: Open PowerShell → `ipconfig` → look for "IPv4 Address"
   - **Linux/Mac**: Open Terminal → `ip addr` or `ifconfig`

2. Install CBT Bulldozer APK on your Android phone

3. On first launch, enter: `http://YOUR_PC_IP:3001`
   - Example: `http://192.168.1.10:3001`

4. Tap **Test Connection** → **Connect**

## Keep Server Running Forever

```bash
# Install pm2 globally (one time)
npm install -g pm2

# Start with auto-restart
pm2 start server.js --name cbt-bulldozer

# View logs
pm2 logs cbt-bulldozer

# Stop
pm2 stop cbt-bulldozer
```

## Accessing from Internet (Optional)

Use [ngrok](https://ngrok.com) for a public URL:
```bash
ngrok http 3001
# Copy the https://xxx.ngrok.io URL into your APK
```

Or use [DuckDNS](https://www.duckdns.org) for a free domain with port forwarding on your router.
