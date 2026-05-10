# pi-omni

Pi extension package for integrating [Omni](https://github.com/wayanjimmy/omni) output filtering.

## What it does

This Pi extension connects Pi sessions to the Omni CLI, allowing Omni to:

- Receive session start events (`--session-start`)
- Add system prompt context before the agent starts
- Intercept tool results for post-processing (`--post-hook`)
- Receive pre-compact events (`--pre-compact`)

The extension is designed to **fail open** — if Omni is missing, exits non-zero, returns empty output, or returns invalid JSON, Pi continues normally without interruption.

## Prerequisites

- [Pi](https://github.com/earendil-works/pi-coding-agent) is installed
- The `omni` executable is available on `PATH` for the Pi process

If your local Omni setup depends on an environment manager such as Infisical, direnv, 1Password, or similar, launch Pi through that environment yourself.

## Install

```bash
pi install git:https://github.com/wayanjimmy/pi-omni.git
```

## Verify the extension is active

After installation, start a new Pi session. The extension should:

- Invoke `omni --session-start` at session start
- Inject any Omni system prompt additions before the agent starts
- Invoke `omni --post-hook` after non-mutating tool results
- Invoke `omni --pre-compact` before session compaction

## Avoid double-loading

If you previously had an Omni extension at `~/.pi/agent/extensions/omni.ts`, remove it before installing this package to prevent duplicate hook calls.

## Local development

For testing changes locally without installing from Git:

```bash
pi -e /path/to/pi-omni/pi-extensions/omni.ts
```

## Typecheck

```bash
npm install
npm run typecheck
```

## License

MIT
