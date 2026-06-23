# Agent Guidelines

## Defer to the user when the simpler fix is theirs to make

If the simplest, most correct solution to a problem requires the user's
involvement (e.g. a `sudo`/system-level install, a global PATH or dotfile
change, an account/permissions action, or anything outside this repo), STOP and
ask the user to do it. Do not implement a more complicated in-repo workaround
just to avoid asking.

- Prefer the clean solution that needs one user action over a brittle workaround
  the agent can do unattended.
- Tell the user exactly what to run/do, then wait.
- Only build an in-repo workaround if the user declines the simpler path.

Goal: avoid wasted work and tokens on workarounds the user would rather handle
directly.
