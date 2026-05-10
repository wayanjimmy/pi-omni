# Pi Omni Package Migration Plan

## Purpose

Move the current Omni integration for Pi out of chezmoi-managed personal configuration and into this repository as a publishable Pi package.

The target outcome is a GitHub-hosted package that can be installed with Pi's Git package installer, for example:

```bash
pi install git:https://github.com/<owner>/pi-omni.git
```

This repository should become the source of truth for the Omni Pi extension. Personal setup details, such as launching Pi through Infisical, must not be required by the public package.

## Current State

The extension currently exists in chezmoi source form at:

```text
/home/jimbo/.local/share/chezmoi/dot_pi/agent/extensions/omni.ts
```

It may also be deployed into the live Pi config directory as:

```text
/home/jimbo/.pi/agent/extensions/omni.ts
```

The existing implementation:

- imports `execFile` from `node:child_process`
- imports Pi extension types from `@earendil-works/pi-coding-agent`
- registers Pi lifecycle hooks for:
  - `session_start`
  - `before_agent_start`
  - `session_before_compact`
  - `tool_result`
- invokes the `omni` binary with:
  - `--session-start`
  - `--pre-compact`
  - `--post-hook`
- sets `OMNI_AGENT_ID=pi`
- fails open if Omni errors, times out, returns empty output, or returns invalid JSON
- skips mutation tools such as `edit` and `write`
- maps Pi tool output into Omni-compatible payloads
- stores pending system prompt additions until `before_agent_start`

There are examples of standalone Pi packages and extensions in:

```text
/home/jimbo/clones/labs/agent-stuff
```

The relevant package manifest pattern from that project uses:

```json
{
  "keywords": ["pi-package"],
  "peerDependencies": {
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*"
  },
  "pi": {
    "extensions": ["./pi-extensions"]
  }
}
```

## Desired End State

This repository should contain a standalone Pi package with the Omni extension under project ownership:

```text
/home/jimbo/clones/labs/pi-omni/
  README.md
  package.json
  tsconfig.json
  .gitignore
  pi-extensions/
    omni.ts
  memory/
    pi-omni-package-migration-plan.md
```

The package should be suitable for publishing to GitHub and installing with:

```bash
pi install git:https://github.com/<owner>/pi-omni.git
```

The chezmoi-managed extension should no longer be the active implementation. During cutover, the deployed live config file must be removed:

```text
/home/jimbo/.pi/agent/extensions/omni.ts
```

After validation, the chezmoi source copy should also be retired or removed so it cannot be accidentally re-applied:

```text
/home/jimbo/.local/share/chezmoi/dot_pi/agent/extensions/omni.ts
```

## Non-Goals

The first migration should not:

- refactor the extension logic
- add new behavior
- change Omni payload shapes
- introduce a bundler
- require Infisical
- commit private project IDs or personal environment details
- assume every user has the same Omni installation method

The first migration should be a relocation and packaging change, not a behavior change.

## Repository Structure Plan

Create the following project files.

### `pi-extensions/omni.ts`

This is the package runtime entrypoint. It should be a mechanical copy of the current extension implementation.

Preserve:

- hook names
- subprocess invocation behavior
- timeout and buffer settings
- `OMNI_AGENT_ID=pi`
- fail-open semantics
- mutation-tool skip behavior
- current tool-name mapping
- current tool-response mapping
- pending system prompt addition handling

### `package.json`

Use this as the Pi package manifest and lightweight development manifest.

Planned shape:

```json
{
  "name": "pi-omni",
  "version": "0.1.0",
  "description": "Pi extension package for integrating Omni output filtering",
  "keywords": ["pi-package", "pi-extension", "omni"],
  "license": "MIT",
  "peerDependencies": {
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*"
  },
  "devDependencies": {
    "@types/node": "^24.5.2",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "pi": {
    "extensions": ["./pi-extensions"]
  }
}
```

Notes:

- Include only `pi.extensions`; do not include `pi.skills` unless this repository later adds skills.
- Keep dependency versions broad for Pi peer dependencies, matching existing local package examples.
- Add only development dependencies needed for local validation.

### `tsconfig.json`

Add a minimal TypeScript config for typechecking the extension.

It should support:

- modern TypeScript
- Node types
- ES module-style imports
- no emit

The exact options should be chosen to match what Pi extension examples can typecheck with locally.

### `.gitignore`

Ignore typical local development artifacts:

```text
node_modules/
dist/
*.log
.env
.env.*
```

Do not ignore the extension source, README, package manifest, or memory docs.

### `README.md`

The README should be public-facing and avoid personal setup assumptions.

It should document:

- what the package does
- prerequisites
- install command using `pi install git:*`
- how to verify the extension is active
- how the extension fails open
- how to avoid double-loading old and new copies
- optional local development usage

## Public Environment Policy

The public package should assume only:

- Pi is installed.
- Omni is installed.
- The `omni` executable is available on `PATH` for the Pi process.
- The user's shell/session provides any environment Omni requires.

The package code should not mention or depend on Infisical.

The README should not include private Infisical project IDs.

If documenting personal environment wrappers, keep them generic and optional, for example:

```md
If your local Omni setup depends on an environment manager such as Infisical,
direnv, 1Password, or similar, launch Pi through that environment yourself.
```

Optional private/local example, if included, should use placeholders only:

```bash
infisical run --silent --projectId=<your-project-id> -- pi
```

## Install and Usage Plan

### Published Git Install

Primary public installation path:

```bash
pi install git:https://github.com/<owner>/pi-omni.git
```

After installation, Pi should discover the extension through this package metadata:

```json
{
  "pi": {
    "extensions": ["./pi-extensions"]
  }
}
```

The implementation phase should confirm the exact Git install URL format expected by Pi and update the README accordingly.

### Local Development Usage

For local testing before publishing:

```bash
pi -e /home/jimbo/clones/labs/pi-omni/pi-extensions/omni.ts
```

This should be documented as a development workflow, not the primary user installation method.

## Migration Steps

### Phase 1: Create Package Skeleton

1. Create `pi-extensions/`.
2. Add `package.json` with Pi package metadata.
3. Add `tsconfig.json`.
4. Add `.gitignore`.
5. Add a public-facing `README.md`.

### Phase 2: Move Extension Implementation

1. Copy the current implementation from:

   ```text
   /home/jimbo/.local/share/chezmoi/dot_pi/agent/extensions/omni.ts
   ```

2. Place it at:

   ```text
   /home/jimbo/clones/labs/pi-omni/pi-extensions/omni.ts
   ```

3. Keep the implementation behaviorally identical.
4. Avoid cleanup/refactor during this phase.

### Phase 3: Local Validation

Run dependency installation and typechecking according to the final package manager choice.

Expected checks:

```bash
npm install
npm run typecheck
```

If the project uses a different package manager later, update the commands accordingly.

Then smoke test by launching Pi directly with the local extension path:

```bash
pi -e /home/jimbo/clones/labs/pi-omni/pi-extensions/omni.ts
```

Validate that:

- Pi starts normally.
- `session_start` invokes `omni --session-start`.
- `before_agent_start` injects any Omni system prompt addition once.
- `session_before_compact` invokes `omni --pre-compact`.
- non-mutating `tool_result` events invoke `omni --post-hook`.
- `edit` and `write` are skipped.
- Bash output still maps to stdout/stderr correctly.
- Read/grep/find/ls-style output still maps as content.

### Phase 4: Fail-Open Validation

Explicitly test failure cases:

- `omni` missing from `PATH`
- `omni` exits non-zero
- `omni` returns empty stdout
- `omni` returns invalid JSON
- `omni` times out

Expected result for every case:

- Pi continues normally.
- The extension returns `undefined` or otherwise leaves the original Pi behavior intact.
- No session-breaking exception escapes the hook.

### Phase 5: Publish and Git Install Validation

1. Commit the package to this repository.
2. Push to GitHub.
3. Install from Git using Pi:

   ```bash
   pi install git:https://github.com/<owner>/pi-omni.git
   ```

4. Confirm Pi discovers the extension from `package.json`.
5. Run a clean smoke test where the old chezmoi/live extension is not active.

### Phase 6: Cutover and Remove Old Live Extension

Once the package works through Git installation, remove the old live Pi extension file:

```text
/home/jimbo/.pi/agent/extensions/omni.ts
```

This removal is important because leaving the live config file in place can cause double-loading if Pi loads both installed packages and config-directory extensions.

After removing the live file:

1. Start a new Pi session.
2. Confirm only the Git-installed package extension is active.
3. Confirm Omni hook behavior still works.
4. Confirm no duplicate hook calls or duplicate prompt additions occur.

### Phase 7: Retire Chezmoi Source Copy

After the Git-installed package is validated and the live file has been removed, retire the chezmoi-managed source copy:

```text
/home/jimbo/.local/share/chezmoi/dot_pi/agent/extensions/omni.ts
```

Options:

1. Delete the chezmoi source file and apply chezmoi so it cannot recreate the live file.
2. Or replace it with documentation pointing to this repository, if keeping a breadcrumb is preferred.

Preferred final state:

- no active Omni extension under `~/.pi/agent/extensions/`
- no chezmoi-managed Omni extension source that can re-apply the old implementation
- this repository is the only source of truth

## Double-Loading Risk

The biggest migration risk is accidentally loading two Omni extensions at the same time:

1. the old live file at `~/.pi/agent/extensions/omni.ts`
2. the new Git-installed `pi-omni` package

Likely symptoms:

- duplicate `session_start` calls
- duplicate `--post-hook` calls
- repeated compression/distillation
- duplicate system prompt additions
- confusing Omni stats or session state

Guardrails:

- During local testing, load only one extension path.
- During Git install validation, remove or disable the old live file first.
- After successful cutover, remove the chezmoi source copy so the old live file is not recreated.

## Runtime Risks

### `omni` Not on PATH

The package depends on the `omni` executable being available to the Pi process.

Mitigation:

- document this as a prerequisite
- keep fail-open behavior
- do not hard-code local paths such as `/usr/local/bin/omni`

### Secret or Environment Assumptions

Different users may configure Omni differently.

Mitigation:

- do not require Infisical
- do not commit personal project IDs
- tell users to launch Pi inside their own environment manager if needed

### Pi Package Metadata Mismatch

The `pi.extensions` metadata must match Pi's package loader expectations.

Mitigation:

- follow the known working `agent-stuff` pattern
- validate with `pi install git:*` before considering the migration complete

### Behavior Drift During Move

Refactoring while moving can introduce subtle integration bugs.

Mitigation:

- make the first implementation a mechanical copy
- only refactor after the package install path is proven

## Verification Checklist

The migration is complete when all of the following are true:

- [x] `package.json` declares a Pi package with `keywords: ["pi-package"]`.
- [x] `package.json` declares `pi.extensions: ["./pi-extensions"]`.
- [x] `pi-extensions/omni.ts` exists in this repository.
- [x] The new extension preserves current behavior.
- [x] The project typechecks locally.
- [x] Pi can run the extension from the local project path.
- [x] The repository can be installed with `pi install git:*`.
- [x] Pi discovers the extension after Git install.
- [x] The live old file `/home/jimbo/.pi/agent/extensions/omni.ts` has been removed during cutover.
- [x] The chezmoi source copy has been retired or removed after validation.
- [x] Public documentation does not require Infisical.
- [x] Public documentation does not expose private project IDs.
- [x] Only one Omni extension is active in normal use.

## Definition of Done

This migration is done when `pi-omni` is a Git-installable Pi package, the Omni extension works from the package install, the old live extension at `~/.pi/agent/extensions/omni.ts` has been removed, and chezmoi is no longer the source of truth for the Omni Pi integration.
