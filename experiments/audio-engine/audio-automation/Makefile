.PHONY: install run clean test

install:
	python -m pip install -r requirements.txt

run:
	python -m src.orchestrate --playlist playlist.txt --config config.yaml

clean:
	rm -rf work output **/__pycache__

test:
	pytest -q

gui:
	python webui/app.py
