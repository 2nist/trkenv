from services.sdk_py.base import BaseExperiment, RunContext
class EXP(BaseExperiment):
    def run(self, ctx:RunContext):
        ctx.log("Hello from plugin")
        ctx.emit_json("hello", {"ok": True})
