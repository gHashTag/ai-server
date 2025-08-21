/**
 * @description pm2 configuration file.
 * @example
 *  production mode :: pm2 start ecosystem.config.js --only prod
 *  development mode :: pm2 start ecosystem.config.js --only dev
 */
module.exports = {
  apps: [
    {
      name: 'prod', // pm2 start App name
      script: 'dist/server.js',
      exec_mode: 'fork', // 'cluster' or 'fork'
      instance_var: 'INSTANCE_ID', // instance variable
      instances: 1, // pm2 instance count
      autorestart: true, // auto restart if process crash
      watch: false, // files change automatic restart
      ignore_watch: ['node_modules', 'logs'], // ignore files change
      max_memory_restart: '1G', // restart if process use more than 1G memory
      merge_logs: true, // if true, stdout and stderr will be merged and sent to pm2 log
      output: './logs/access.log', // pm2 log file
      error: './logs/error.log', // pm2 error log file
      env: {
        // environment variable
        PORT: 3000,
        NODE_ENV: 'production',
        BOT_TOKEN_1: process.env.BOT_TOKEN_1,
        BOT_TOKEN_2: process.env.BOT_TOKEN_2,
        BOT_TOKEN_3: process.env.BOT_TOKEN_3,
        BOT_TOKEN_4: process.env.BOT_TOKEN_4,
        BOT_TOKEN_5: process.env.BOT_TOKEN_5,
        BOT_TOKEN_6: process.env.BOT_TOKEN_6,
        BOT_TOKEN_7: process.env.BOT_TOKEN_7,
        BOT_TOKEN_8: process.env.BOT_TOKEN_8,
        BOT_TOKEN_TEST_1: process.env.BOT_TOKEN_TEST_1,
        BOT_TOKEN_TEST_2: process.env.BOT_TOKEN_TEST_2,
      },
    },
  ],
  deploy: {
    production: {
      user: 'user',
      host: '0.0.0.0',
      ref: 'origin/master',
      repo: 'git@github.com:repo.git',
      path: 'dist/server.js',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --only prod',
    },
  },
}
