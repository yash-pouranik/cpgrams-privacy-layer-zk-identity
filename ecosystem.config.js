module.exports = {
  apps: [
    {
      name: 'sso-server',
      script: 'src/app.js',
      cwd: 'apps/sso-server',
      instances: 1, // Single instance to support local MemoryAdapter without session loss
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'cpgrams-backend',
      script: 'src/app.js',
      cwd: 'apps/cpgrams-backend',
      instances: 1, // Single instance to support express-session MemoryStore without session loss
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'frontend-client',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: 'apps/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
    },
  ],
};
