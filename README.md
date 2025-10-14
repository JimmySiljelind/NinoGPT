# NinoGPT

## Prerequisites

Install [Bun](https://bun.com) if it is not already available on your machine:

```bash
irm https://bun.sh/install.ps1 | iex
```

## Install Dependencies

Install all workspace dependencies (server and client) from the repository root:

```bash
bun install
```

## Development

Run the full stack in watch mode:

```bash
bun run dev
```

## Quality Gates

The following scripts keep the codebase healthy:

- `bun run lint` - format check and ESLint for the client bundle.
- `bun run typecheck` - TypeScript checks for both server and client.
- `bun run test` - project test suite (placeholder until tests are added).
- `bun run audit` - dependency security audit via npm.
- `bun run ci` - runs lint, typecheck, and tests in sequence.

## Environment

Create `packages/server/.env` based on the provided example file before starting the server.

## Troubleshooting

If Bun's cache becomes inconsistent, clear local state and reinstall:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json,bun.lock -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.bun\install\cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\bun\install\cache" -ErrorAction SilentlyContinue
bun install --no-cache
```
