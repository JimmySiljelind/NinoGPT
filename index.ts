import process from 'node:process';

type Task = {
   name: string;
   command: string[];
   cwd: string;
   color: string;
};

type BunSubprocess = ReturnType<typeof Bun.spawn>;

const RESET = '\u001B[0m';

const tasks: Task[] = [
   {
      name: 'server',
      command: ['bun', 'run', 'dev'],
      cwd: 'packages/server',
      color: '\u001B[32m',
   },
   {
      name: 'client',
      command: ['bun', 'run', 'dev'],
      cwd: 'packages/client',
      color: '\u001B[33m',
   },
];

const decoder = new TextDecoder();

function logChunk(
   chunk: Uint8Array,
   task: Task,
   target: NodeJS.WriteStream,
   buffer: { value: string }
) {
   buffer.value += decoder.decode(chunk);

   let newlineIndex: number;
   while ((newlineIndex = buffer.value.indexOf('\n')) !== -1) {
      const line = buffer.value.slice(0, newlineIndex).replace(/\r$/, '');
      buffer.value = buffer.value.slice(newlineIndex + 1);
      target.write(`${task.color}[${task.name}]${RESET} ${line}\n`);
   }
}

function flushBuffer(
   task: Task,
   target: NodeJS.WriteStream,
   buffer: { value: string }
) {
   if (!buffer.value) {
      return;
   }

   target.write(
      `${task.color}[${task.name}]${RESET} ${buffer.value.replace(/\r$/, '')}\n`
   );
   buffer.value = '';
}

type RunningTask = {
   task: Task;
   process: BunSubprocess;
};

const running: RunningTask[] = tasks.map((task) => {
   const proc = Bun.spawn(task.command, {
      cwd: task.cwd,
      stdin: 'inherit',
      stdout: 'pipe',
      stderr: 'pipe',
   });

   const stdoutBuffer = { value: '' };
   const stderrBuffer = { value: '' };

   if (proc.stdout) {
      (async () => {
         for await (const chunk of proc.stdout) {
            logChunk(chunk, task, process.stdout, stdoutBuffer);
         }
         flushBuffer(task, process.stdout, stdoutBuffer);
      })().catch((error) => {
         process.stderr.write(
            `${task.color}[${task.name}]${RESET} Failed to read stdout: ${error instanceof Error ? error.message : String(error)}\n`
         );
      });
   }

   if (proc.stderr) {
      (async () => {
         for await (const chunk of proc.stderr) {
            logChunk(chunk, task, process.stderr, stderrBuffer);
         }
         flushBuffer(task, process.stderr, stderrBuffer);
      })().catch((error) => {
         process.stderr.write(
            `${task.color}[${task.name}]${RESET} Failed to read stderr: ${error instanceof Error ? error.message : String(error)}\n`
         );
      });
   }

   return { task, process: proc };
});

let shuttingDown = false;

function shutdown(code: number) {
   if (shuttingDown) {
      return;
   }

   shuttingDown = true;

   for (const { process: proc, task } of running) {
      if (proc.killed) {
         continue;
      }

      const result = proc.kill();
      if (!result) {
         process.stderr.write(
            `${task.color}[${task.name}]${RESET} Failed to terminate process\n`
         );
      }
   }

   process.exitCode = code;
}

process.on('SIGINT', () => {
   shutdown(0);
});

process.on('SIGTERM', () => {
   shutdown(0);
});

const exitPromises = running.map(({ task, process: proc }) =>
   proc.exited.then((code: number) => ({ task, code }))
);

const firstExit = await Promise.race(exitPromises);

if (firstExit.code !== 0) {
   process.stderr.write(
      `${firstExit.task.color}[${firstExit.task.name}]${RESET} exited with code ${firstExit.code}\n`
   );
}

shutdown(firstExit.code ?? 0);

await Promise.all(exitPromises);
