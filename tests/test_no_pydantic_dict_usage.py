import os
import fnmatch


def find_files(root, patterns, exclude_dirs=None):
    exclude_dirs = set(exclude_dirs or [])
    for dirpath, dirnames, filenames in os.walk(root):
        # skip excluded dirs
        parts = set(dirpath.split(os.sep))
        if exclude_dirs & parts:
            continue
        for name in filenames:
            for pat in patterns:
                if fnmatch.fnmatch(name, pat):
                    yield os.path.join(dirpath, name)


def test_no_method_dict_usage():
    """Fail if any project python files use the `.dict(` method call.

    This helps prevent regressions when migrating to Pydantic v2 where
    `.dict()` is deprecated in favor of `model_dump()`.
    """
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    patterns = ["*.py"]
    exclude_dirs = {"venv", ".venv", "build", "dist", ".git", ".venv_test", "node_modules"}
    matches = []
    for fp in find_files(root, patterns, exclude_dirs=exclude_dirs):
        # Skip this test file itself to avoid matching its docstring/comments
        if os.path.abspath(fp) == os.path.abspath(__file__):
            continue
        # skip our helper and known acceptable dict() usage on plain dict constructors
        if fp.endswith(os.path.join('apps', 'server', 'models', '_compat.py')):
            continue
        with open(fp, 'r', encoding='utf-8') as fh:
            try:
                txt = fh.read()
            except Exception:
                continue
        # look specifically for method-style `.dict(` occurrences
        if ".dict(" in txt:
            # Heuristic: ignore dict( as a constructor by requiring a dot before dict
            # We already look for .dict( so this is method-style; collect file
            matches.append(fp)

    # Allow occurrences in scripts or vendor paths if present; assert none in user code
    assert not matches, f"Found .dict(...) occurrences in files: {matches}"
