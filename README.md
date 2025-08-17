# Roblox Discord Webhook Proxy

A simple Node.js server that receives webhook data from Roblox games and forwards it to Discord.

## Setup

1. Deploy to Railway.app or similar hosting service
2. Set environment variable: `DISCORD_WEBHOOK_URL`
3. Use the public URL in your Roblox script

## Files needed for deployment:
- server.js
- package.json  
- railway.json

## Environment Variables:
- `DISCORD_WEBHOOK_URL` - Your Discord webhook URL

## Endpoints:
- `GET /health` - Health check
- `POST /webhook` - Receives Roblox data and forwards to Discord