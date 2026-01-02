module.exports = {
  apps: [{
    name: 'gourmetlog-api',
    script: 'server/index.ts',
    interpreter: 'bun',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production',
      API_PORT: 3001,
    },
  }],
};
