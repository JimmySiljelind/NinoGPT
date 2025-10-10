# NinoGPT

Install Bun on your device:

```bash
irm https://bun.sh/install.ps1 | iex
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

Incase of error, clear whit command:

```bash
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json,bun.lockb -ErrorAction SilentlyContinue
```

```bash
Remove-Item -Recurse -Force "$env:USERPROFILE\.bun\install\cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\bun\install\cache" -ErrorAction SilentlyContinue
```

```bash
bun install --no-cache
```
