#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def allow() -> None:
    emit({"permission": "allow"})
    sys.exit(0)


def deny(user_message: str, agent_message: str) -> None:
    emit(
        {
            "permission": "deny",
            "user_message": user_message,
            "agent_message": agent_message,
        }
    )
    sys.exit(0)


GIT_THEN_PUSH = re.compile(
    r"\bgit\b(?:(?!\s*(?:&&|\|\||;|\|)\b).)*?\bpush\b",
    re.IGNORECASE,
)
SHELL_SEP = re.compile(r"\s*(?:&&|\|\||;|\|)\s*")
DRY_RUN = re.compile(r"(?:--dry-run\b|(?:^|\s)-n(?:\s|$))", re.IGNORECASE)


def normalize_command(command: str) -> str:
    unquoted = re.sub(r'["\']', " ", command)
    return " ".join(unquoted.split())


def push_args_segment(after_push: str) -> str:
    return SHELL_SEP.split(after_push, maxsplit=1)[0]


def is_push_to_origin(command: str) -> bool:
    cmd = normalize_command(command)
    for match in GIT_THEN_PUSH.finditer(cmd):
        args = push_args_segment(cmd[match.end() :])
        if DRY_RUN.search(args):
            continue
        if re.search(r"\borigin\b", args, re.IGNORECASE):
            return True
    return False


def run_cmd(cmd: list[str], cwd: Path, timeout_sec: int) -> tuple[int, str]:
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        timeout=timeout_sec,
    )
    tail = (proc.stdout or "") + (proc.stderr or "")
    if len(tail) > 12000:
        tail = tail[-12000:]
    return proc.returncode, tail


def workspace_root(payload: dict) -> Path | None:
    roots = payload.get("workspace_roots") or []
    if not roots:
        project = os.environ.get("CURSOR_PROJECT_DIR") or os.environ.get(
            "CLAUDE_PROJECT_DIR"
        )
        if project:
            roots = [project]
    if not roots:
        return None
    return Path(roots[0]).resolve()


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        allow()

    command = payload.get("command") or ""
    if not isinstance(command, str) or not is_push_to_origin(command):
        allow()

    root = workspace_root(payload)
    if root is None:
        allow()

    failures: list[str] = []

    if (root / "package.json").is_file():
        code, output = run_cmd(["npm", "run", "test:run"], root, timeout_sec=600)
        if code != 0:
            failures.append(
                "`npm run test:run` failed before push.\n\n"
                f"Output (truncated):\n{output}"
            )

    sail = root / "vendor" / "bin" / "sail"
    if sail.is_file():
        code, output = run_cmd([str(sail), "test"], root, timeout_sec=840)
        if code != 0:
            failures.append(
                "`./vendor/bin/sail test` failed before push.\n\n"
                f"Output (truncated):\n{output}"
            )

    if failures:
        body = "\n\n---\n\n".join(failures)
        deny(
            "Unit tests failed; push to origin was blocked.",
            (
                "Tests must pass before `git push` to `origin`. "
                "Fix the failures below, then retry the push.\n\n"
                f"{body}"
            ),
        )

    allow()


if __name__ == "__main__":
    try:
        main()
    except subprocess.TimeoutExpired as exc:
        deny(
            "Tests timed out before push to origin.",
            f"Test command timed out: {exc}",
        )
    except Exception as exc:
        sys.stderr.write(f"[pre-push-require-tests] {exc}\n")
        allow()
