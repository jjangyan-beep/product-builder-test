# Repository instructions

## Purpose

This repository is the primary workspace for Codex-assisted development and documentation.

## Working agreements

- Keep source code, documentation, tests, and configuration needed to reproduce the work in this repository.
- Put durable project documentation in `docs/` when appropriate.
- Make focused changes and preserve unrelated user work.
- Inspect existing code and documentation before changing behavior.
- Run relevant checks or tests before reporting completion.
- Summarize changed files, verification performed, and any remaining risks.

## Git workflow

- Prefer a dedicated branch for each substantial task.
- Do not rewrite shared history.
- Commit, push, or open a pull request only when the user requests it.
- Use clear commit messages that describe the outcome.

## Credentials and sensitive data

- Never commit passwords, API keys, access tokens, refresh tokens, private keys, or other secrets.
- Store secrets in environment variables or an approved secret manager.
- Provide sanitized examples through files such as `.env.example`.
- Avoid printing secret values in logs, command output, documentation, or test fixtures.
