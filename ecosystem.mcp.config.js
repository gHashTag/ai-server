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
      output: '/app/logs/main-server-out.log',
      error: '/app/logs/main-server-error.log',
      log: '/app/logs/main-server.log',
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
      output: '/app/logs/mcp-out.log',
      error: '/app/logs/mcp-error.log',
      log: '/app/logs/mcp.log',
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
        '--port',
        '8289',
        '--log-level',
        'warn',
      ],
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      merge_logs: true,
      output: '/app/logs/inngest-out.log',
      error: '/app/logs/inngest-error.log',
      log: '/app/logs/inngest.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      env: {
        NODE_ENV: 'development',
        INNGEST_LOG_LEVEL: 'warn',
        INNGEST_VERBOSE: 'false',
      },
    },
  ],
}
 