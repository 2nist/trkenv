from __future__ import annotations
from flask import Flask, render_template, request, redirect, url_for
from pathlib import Path
import yaml

app = Flask(__name__)

CFG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


def load_cfg():
    return yaml.safe_load(open(CFG_PATH, "r", encoding="utf-8"))


def save_cfg(cfg):
    CFG_PATH.write_text(yaml.safe_dump(cfg, sort_keys=False), encoding="utf-8")


@app.route("/")
def index():
    cfg = load_cfg()
    # Peek latest lyrics presence for SEG00
    seg_dir = Path("work").glob("session-*/SEG00")
    latest = sorted(seg_dir, reverse=True)
    has_vtt = has_srt = False
    if latest:
        vdir = latest[0] / cfg["lyrics"]["vtt_relpath"]
        sdir = latest[0] / cfg["lyrics"]["srt_relpath"]
        has_vtt = any(vdir.glob("*.vtt")) if vdir.exists() else False
        has_srt = any(sdir.glob("*.srt")) if sdir.exists() else False
    return render_template("index.html", cfg=cfg, has_vtt=has_vtt, has_srt=has_srt)


@app.route("/settings", methods=["GET", "POST"])
def settings():
    cfg = load_cfg()
    if request.method == "POST":
        cfg.setdefault("asr", {})
        cfg.setdefault("lyrics", {})
        # ASR
        cfg["asr"]["model_size"] = request.form.get("model_size", cfg["asr"].get("model_size"))
        cfg["asr"]["compute_type"] = request.form.get("compute_type", cfg["asr"].get("compute_type"))
        cfg["asr"]["align"] = bool(request.form.get("align"))
        cfg["asr"]["diarize"] = bool(request.form.get("diarize"))
        cfg["asr"]["language"] = request.form.get("language") or ""
        # Lyrics
        cfg["lyrics"]["export_srt"] = bool(request.form.get("export_srt"))
        cfg["lyrics"]["json_include_words"] = bool(request.form.get("json_include_words"))
        cfg["lyrics"]["word_conf_min"] = float(request.form.get("word_conf_min", cfg["lyrics"].get("word_conf_min", 0.0)))
        save_cfg(cfg)
        return redirect(url_for("settings"))
    return render_template("settings.html", cfg=cfg)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
