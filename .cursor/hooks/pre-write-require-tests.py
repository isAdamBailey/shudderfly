#!/usr/bin/env python3
import json
import os
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


def parse_tool_input(raw) -> dict:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def extract_file_path(tool_name: str, tool_input: dict) -> str | None:
    if tool_name == "EditNotebook":
        path = tool_input.get("target_notebook")
        return path if isinstance(path, str) and path else None
    for key in ("file_path", "path", "target_file", "file"):
        val = tool_input.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def pick_workspace_root(file_path: str, roots: list[str]) -> tuple[Path, str] | None:
    resolved = Path(file_path).expanduser()
    if not resolved.is_absolute():
        for root in roots:
            candidate = Path(root) / resolved
            try:
                rel = candidate.resolve().relative_to(Path(root).resolve())
                return Path(root).resolve(), str(rel).replace("\\", "/")
            except ValueError:
                continue
        return None
    resolved = resolved.resolve()
    for root in roots:
        root_res = Path(root).resolve()
        try:
            rel = resolved.relative_to(root_res)
            return root_res, str(rel).replace("\\", "/")
        except ValueError:
            continue
    return None


def classify_relative(rel_posix: str) -> str:
    lower = rel_posix.lower()
    if lower.startswith("vendor/") or lower.startswith("node_modules/"):
        return "skip"
    skip_prefixes = (
        ".cursor/",
        ".git/",
        "public/build/",
        "storage/",
        "bootstrap/cache/",
    )
    if any(lower.startswith(p) for p in skip_prefixes):
        return "skip"
    skip_ext = (
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".ico",
        ".svg",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".mp3",
        ".mp4",
        ".pdf",
    )
    if lower.endswith(skip_ext):
        return "skip"
    if lower.endswith(".ipynb"):
        return "skip"

    fe_prefixes = ("resources/js/", "resources/css/")
    if any(lower.startswith(p) for p in fe_prefixes):
        return "frontend"

    fe_root_names = {
        "package.json",
        "package-lock.json",
        "vite.config.js",
        "vite.config.ts",
        "vitest.config.js",
        "vitest.config.ts",
        "tailwind.config.js",
        "tailwind.config.ts",
        "postcss.config.js",
        "postcss.config.cjs",
        "eslint.config.js",
        "eslint.config.mjs",
        ".eslintrc",
        ".eslintrc.cjs",
        ".eslintrc.js",
        ".prettierrc",
        ".prettierrc.json",
    }
    if lower in {n.lower() for n in fe_root_names} or lower.startswith("eslint"):
        return "frontend"

    be_prefixes = (
        "app/",
        "routes/",
        "database/",
        "config/",
        "bootstrap/",
        "tests/",
        "resources/views/",
    )
    if any(lower.startswith(p) for p in be_prefixes):
        return "backend"

    be_root_names = {
        "composer.json",
        "composer.lock",
        "phpunit.xml",
        "phpunit.xml.dist",
        "pint.json",
        "artisan",
    }
    if lower in {n.lower() for n in be_root_names}:
        return "backend"
    if lower == "public/index.php":
        return "backend"
    if lower.endswith(".php"):
        return "backend"

    return "skip"


def run_cmd(
    cmd: list[str],
    cwd: Path,
    label: str,
    timeout_sec: int,
) -> tuple[int, str]:
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


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        allow()

    tool_name = payload.get("tool_name") or ""
    if tool_name not in ("Write", "EditNotebook"):
        allow()

    tool_input = parse_tool_input(payload.get("tool_input"))
    file_path = extract_file_path(tool_name, tool_input)
    if not file_path:
        allow()

    roots = payload.get("workspace_roots") or []
    if not roots:
        project = os.environ.get("CURSOR_PROJECT_DIR") or os.environ.get(
            "CLAUDE_PROJECT_DIR"
        )
        if project:
            roots = [project]
    if not roots:
        allow()

    picked = pick_workspace_root(file_path, roots)
    if not picked:
        allow()

    root, rel = picked
    bucket = classify_relative(rel)
    if bucket == "skip":
        allow()

    if bucket == "frontend":
        if not (root / "package.json").is_file():
            allow()
        code, output = run_cmd(
            ["npm", "run", "test:run"],
            root,
            "frontend",
            timeout_sec=600,
        )
        if code != 0:
            deny(
                "Frontend unit tests failed before applying the edit.",
                (
                    "`npm run test:run` failed while validating this write. "
                    "Fix the failing tests (or the code under test), then retry.\n\n"
                    f"Output (truncated):\n{output}"
                ),
            )
        allow()

    sail = root / "vendor" / "bin" / "sail"
    if not sail.is_file():
        deny(
            "Backend tests could not run (Laravel Sail missing).",
            (
                "This change touches backend paths, but `./vendor/bin/sail` was not found. "
                "Install Composer dependencies (including `laravel/sail`) so `./vendor/bin/sail test` can run, "
                "or adjust the hook classification if this path should not require PHP tests."
            ),
        )

    code, output = run_cmd(
        [str(sail), "test"],
        root,
        "backend",
        timeout_sec=840,
    )
    if code != 0:
        deny(
            "Backend unit tests failed before applying the edit.",
            (
                "`./vendor/bin/sail test` failed while validating this write. "
                "Fix the failing tests (or the code under test), then retry.\n\n"
                f"Output (truncated):\n{output}"
            ),
        )
    allow()


if __name__ == "__main__":
    try:
        main()
    except subprocess.TimeoutExpired as exc:
        deny(
            "Tests timed out before applying the edit.",
            f"Test command timed out: {exc}",
        )
    except Exception as exc:
        sys.stderr.write(f"[pre-write-require-tests] {exc}\n")
        allow()
