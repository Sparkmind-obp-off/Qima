// QIMA local development process manager (sandbox only).
// Not part of the deployed artifact.
module.exports = {
  apps: [
    {
      name: 'qima',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=qima-production --local --ip 0.0.0.0 --port 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
