const { execSync } = require('child_process');

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      // Find all processes listening on the port
      const stdout = execSync(`netstat -ano -p tcp`).toString();
      const lines = stdout.split('\r\n');
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Protocol, Local Address, Foreign Address, State, PID
        if (parts.length >= 5 && parts[3] === 'LISTENING') {
          const localAddr = parts[1];
          if (localAddr.endsWith(`:${port}`) || localAddr === `[::]:${port}` || localAddr === `0.0.0.0:${port}`) {
            const pid = parseInt(parts[4], 10);
            if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
              pids.add(pid);
            }
          }
        }
      }

      if (pids.size > 0) {
        for (const pid of pids) {
          console.log(`[free-port] ⚡ Port ${port} is in use by PID ${pid}. Closing it now...`);
          try {
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[free-port] ✓ Successfully terminated PID ${pid}`);
          } catch {}
        }
        // Small delay to allow Windows socket cleanup
        const start = Date.now();
        while (Date.now() - start < 400) {}
      }
    } else {
      // macOS / Linux
      try {
        const pids = execSync(`lsof -ti :${port}`).toString().trim();
        if (pids) {
          console.log(`[free-port] ⚡ Freeing port ${port}...`);
          execSync(`kill -9 ${pids}`, { stdio: 'ignore' });
        }
      } catch {}
    }
  } catch (err) {
    // Port was already free or no process found
  }
}

const targetPort = process.env.PORT || 8081;
freePort(targetPort);
process.exit(0);
