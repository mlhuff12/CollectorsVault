#!/usr/bin/env python3
"""Validates API unit test naming and AAA comment patterns.

For every [Fact] / [Theory]-decorated test found under
tests/CollectorsVault.Api.Tests/unit/**/*.cs the following rules apply:

  1. The method name must follow Method_Condition_Expected style
     (at least two underscores separating three parts).

  2. The method body must contain all three of:
       // Arrange
       // Act
       // Assert

Exit codes:
  0  – all checks pass
  1  – one or more violations found, or no test files were discovered
"""

import re
import sys
from pathlib import Path

# Matches a [Fact] or [Theory] attribute line (with optional arguments / spaces).
ATTR_RE = re.compile(r"^\s*\[(Fact|Theory)[\](\s]")

# Matches a method declaration line; capture group 1 is the method name.
# Handles: public [async] [static] ReturnType MethodName(
METHOD_RE = re.compile(
    r"^\s*(?:public|protected|private)\s+"
    r"(?:(?:async|override|virtual|static|abstract)\s+)*"
    r"\S+\s+(\w+)\s*[\(<]"
)


def check_file(path: Path, errors: list[str]) -> None:
    lines = path.read_text(encoding="utf-8").splitlines()
    n = len(lines)
    i = 0
    while i < n:
        if not ATTR_RE.match(lines[i]):
            i += 1
            continue

        # Found [Fact] or [Theory] — scan ahead for the method declaration,
        # skipping over any additional attributes ([InlineData], etc.).
        method_name: str | None = None
        method_line: int | None = None  # 1-based line number
        for j in range(i + 1, min(i + 15, n)):
            m = METHOD_RE.match(lines[j])
            if m:
                method_name = m.group(1)
                method_line = j + 1
                break

        if method_name is None:
            i += 1
            continue

        # ── Check 1: Method_Condition_Expected naming ────────────────────────
        if method_name.count("_") < 2:
            errors.append(
                f"{path}:{method_line}: "
                f"'{method_name}' does not follow Method_Condition_Expected naming."
            )

        # ── Check 2: AAA comments present in the method body ────────────────
        # Find the opening brace of the method body (the line that contains
        # the first '{' at or after the method declaration).
        body_start: int | None = None
        for j in range(method_line - 1, min(method_line + 10, n)):
            if "{" in lines[j]:
                body_start = j
                break

        if body_start is not None:
            # Collect body lines until the matching closing brace.
            depth = 0
            body_lines: list[str] = []
            for j in range(body_start, n):
                depth += lines[j].count("{") - lines[j].count("}")
                body_lines.append(lines[j])
                if depth <= 0:
                    break

            body = "\n".join(body_lines)
            for comment in ("// Arrange", "// Act", "// Assert"):
                if comment not in body:
                    errors.append(
                        f"{path}:{method_line}: "
                        f"'{method_name}' is missing '{comment}' comment."
                    )

        i += 1


def main() -> int:
    unit_test_dir = Path("tests/CollectorsVault.Api.Tests/unit")
    files = sorted(unit_test_dir.rglob("*.cs"))

    if not files:
        print(f"ERROR: No C# files found under '{unit_test_dir}'.")
        return 1

    errors: list[str] = []
    for f in files:
        check_file(f, errors)

    if errors:
        print(f"Found {len(errors)} unit-test style violation(s):\n")
        for err in errors:
            print(f"  {err}")
        return 1

    print(
        f"All {len(files)} unit test file(s) pass"
        " naming and AAA comment checks."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
