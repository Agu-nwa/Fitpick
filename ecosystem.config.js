module.exports = {
  apps: [
    {
      name: "fitpick",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "fitpick-worker",
      cwd: __dirname,
      script: "node_modules/.bin/tsx",
      args: "workers/fitpick-worker.ts",
      env: {
        NODE_ENV: "production"
      },
      stop_exit_codes: [0],
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: "512M"
    }
  ]
};
