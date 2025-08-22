/**
 * @description PM2 configuration for complete AI server system (Main + MCP + Inngest)
 * @usage pm2 start ecosystem.mcp.config.js
 */
module.exports = {
  apps: [
    {
      name: 'ai-server-main',
      script: 'scripts/start-server-with-env.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      merge_logs: true,
      output: './logs/main-server-out.log',
      error: './logs/main-server-error.log',
      log: './logs/main-server.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
    },
    {
      name: 'ai-server-mcp',
      script: 'scripts/start-mcp-for-cursor.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      merge_logs: true,
      output: './logs/mcp-out.log',
      error: './logs/mcp-error.log',
      log: './logs/mcp.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      env: {
        NODE_ENV: 'development',
        SERVER_URL: 'http://localhost:4000',
      },
    },
    {
      name: 'ai-server-inngest',
      script: 'npx',
      args: [
        'inngest-cli@latest',
        'dev',
        '-u',
        'http://localhost:4000/api/inngest',
      ],
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      merge_logs: true,
      output: './logs/inngest-out.log',
      error: './logs/inngest-error.log',
      log: './logs/inngest.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
 