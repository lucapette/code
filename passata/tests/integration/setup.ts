import { beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

let server: ReturnType<typeof spawn>;

async function waitForServer(url: string, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server not ready at ${url}`);
}

beforeAll(async () => {
  server = spawn('npx', ['tsx', 'src/index.ts'], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'test' },
  });

  await waitForServer('http://localhost:3000');
}, 30000);

afterAll(async () => {
  server.kill();
});
