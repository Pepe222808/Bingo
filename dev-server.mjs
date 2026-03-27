import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const processes = []

function run(label, args) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code) => {
    if (code !== 0) {
      process.exitCode = code ?? 1
    }
  })

  processes.push(child)
  console.log(`[${label}] started`)
}

run('server', ['run', 'server'])
run('vite', ['run', 'dev:vite'])

function shutdown() {
  for (const child of processes) {
    child.kill()
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
