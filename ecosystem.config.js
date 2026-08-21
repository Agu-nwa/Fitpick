module.exports = {
  apps: [
    {
      name: "fitpick",
      cwd: __dirname,
      // Run Next directly so PM2 owns the actual server process. An npm
      // wrapper can exit before its spawned next-server child, leaving a
      // stale listener on port 3000 during an atomic release switch.
      script: "node_modules/next/dist/bin/next",
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
        NODE_ENV: "production",
        WORKER_NAME: "fitpick-worker",
        WORKER_EXCLUDED_JOB_TYPES: "avatar_preview_generation,tryon_visual_validation"
      },
      stop_exit_codes: [0],
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: "512M"
    },
    {
      name: "fitpick-tryon-worker",
      cwd: __dirname,
      script: "node_modules/.bin/tsx",
      args: "workers/fitpick-worker.ts",
      env: {
        NODE_ENV: "production",
        WORKER_NAME: "fitpick-tryon-worker",
        WORKER_JOB_TYPES: "avatar_preview_generation,tryon_visual_validation",
        WORKER_POLL_MS: "1000",
        WORKER_ENABLE_MAINTENANCE: "false"
      },
      stop_exit_codes: [0],
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: "512M"
    },
    {
      name: "fitpick-realtime",
      cwd: __dirname,
      script: "node_modules/.bin/tsx",
      args: "server/support-realtime.ts",
      env: {
        NODE_ENV: "production"
      },
      stop_exit_codes: [0],
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: "256M"
    }
  ]
};
