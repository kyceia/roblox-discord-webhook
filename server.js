const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware to parse JSON requests
app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'roblox-discord-webhook-proxy'
    });
});

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        // Validate that we have a Discord webhook URL
        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK;
        if (!discordWebhookUrl) {
            console.error('DISCORD_WEBHOOK_URL or DISCORD_WEBHOOK environment variable is not set');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'Discord webhook URL not configured'
            });
        }

        // Validate request body
        if (!req.body || Object.keys(req.body).length === 0) {
            console.warn('Received empty webhook payload');
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Webhook payload cannot be empty'
            });
        }

        // Log received data for debugging
        console.log('Received Roblox webhook data:', JSON.stringify(req.body, null, 2));

        // Prepare payload for Discord
        const discordPayload = {
            content: `**Roblox Webhook Data Received**`,
            embeds: [{
                title: 'Roblox Webhook',
                description: '```json\n' + JSON.stringify(req.body, null, 2) + '\n```',
                color: 0x00FF00, // Green color
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Roblox Webhook Proxy'
                }
            }]
        };

        // Forward to Discord webhook
        const discordResponse = await axios.post(discordWebhookUrl, discordPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        console.log(`Successfully forwarded webhook to Discord. Status: ${discordResponse.status}`);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Webhook successfully forwarded to Discord',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing webhook:', error);

        // Handle specific error types
        if (error.code === 'ECONNREFUSED') {
            return res.status(502).json({
                error: 'Bad Gateway',
                message: 'Unable to connect to Discord webhook URL'
            });
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                error: 'Gateway Timeout',
                message: 'Discord webhook request timed out'
            });
        }

        if (error.response) {
            // Discord API returned an error
            const status = error.response.status;
            const statusText = error.response.statusText;
            
            console.error(`Discord webhook error: ${status} ${statusText}`);
            console.error('Discord response:', error.response.data);

            return res.status(502).json({
                error: 'Discord Webhook Error',
                message: `Discord returned ${status}: ${statusText}`,
                discordError: error.response.data
            });
        }

        // Generic error handling
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process webhook request'
        });
    }
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
    });
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`🚀 Roblox-Discord Webhook Proxy server running on http://${HOST}:${PORT}`);
    console.log(`📡 Webhook endpoint available at: http://${HOST}:${PORT}/webhook`);
    console.log(`💚 Health check available at: http://${HOST}:${PORT}/health`);
    
    // Verify environment configuration
    if (process.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK) {
        console.log('✅ Discord webhook URL configured');
    } else {
        console.warn('⚠️  DISCORD_WEBHOOK_URL or DISCORD_WEBHOOK environment variable not set - webhook forwarding will fail');
    }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
