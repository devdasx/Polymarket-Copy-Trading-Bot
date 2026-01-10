import { spawn } from "child_process";

function start() {
  const child = spawn("npx", ["ts-node", "copy-trades.ts"], {
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    console.log(`[watchdog] bot exited with code ${code}. restarting...`);
    setTimeout(start, 1000);
  });
}

start();
