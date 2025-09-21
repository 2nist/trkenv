# Makefile for local development tasks

.PHONY: setup test

setup:
	./scripts/setup_local.sh

test:
	. .venv/bin/activate && python -m pytest -q
