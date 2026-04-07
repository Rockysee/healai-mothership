#!/bin/bash
# FRAMEGEN — HunyuanVideo Local Inference startup script
# Run from the local-inference-hunyuan/ directory: ./start.sh

set -e
cd "$(dirname "$0")"

echo ""
echo "🎬  FRAMEGEN — HunyuanVideo Local Inference"
echo "   Model  : HunyuanVideo (Tencent, 13B params)"
echo "   Device : Apple MPS (M1/M2/M3/M4 GPU) or CUDA"
echo "   Port   : 8001"
echo ""
echo "   ⚠  First run downloads ~87 GB — ensure you have space + stable connection."
echo "   ⚠  Minimum: 16 GB unified memory (M1). Recommended: 32 GB+ (M2 Max / M3 Max)."
echo ""

# ── Python check ──────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 not found."
  echo "   Install via: brew install python"
  exit 1
fi

PYTHON=$(command -v python3)
echo "   Python : $($PYTHON --version)"

# ── Virtual environment ───────────────────────────────────────
if [ ! -d ".venv" ]; then
  echo ""
  echo "   Creating virtual environment…"
  $PYTHON -m venv .venv
fi

source .venv/bin/activate

# ── Install / update dependencies ────────────────────────────
echo "   Installing dependencies (one-time, ~3 min)…"
echo ""
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo ""
echo "   ✓ Dependencies ready"
echo ""

# ── System info ───────────────────────────────────────────────
TOTAL_RAM=$(python3 -c "import psutil; print(f'{psutil.virtual_memory().total / 1024**3:.0f}')")
echo "   RAM detected : ${TOTAL_RAM} GB"

if [ "$TOTAL_RAM" -lt 16 ]; then
  echo ""
  echo "   ⚠  Less than 16 GB RAM detected. HunyuanVideo may not run."
  echo "      Consider using LTX-Video (local-inference/) instead."
  echo ""
fi

if [ "$TOTAL_RAM" -ge 64 ]; then
  echo "   Config : 720p · 85 frames · model_cpu_offload ✓"
elif [ "$TOTAL_RAM" -ge 32 ]; then
  echo "   Config : 480p · 61 frames · model_cpu_offload ✓"
else
  echo "   Config : 480p · 49 frames · sequential_cpu_offload (slower, fits 16 GB)"
fi

echo ""
echo "   Starting server on http://localhost:8001"
echo "   First generation downloads HunyuanVideo model (~87 GB)."
echo "   Subsequent runs load from cache instantly."
echo "   Press Ctrl+C to stop."
echo ""

# ── MPS memory tuning (Apple M1/M2/M3/M4) ────────────────────
# Remove upper memory limit so MPS can use full unified memory pool.
# Critical for HunyuanVideo — without this you'll OOM on 16 GB M1.
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
export PYTORCH_MPS_ALLOCATOR_POLICY=garbage_collection

# HuggingFace cache dir (optional override)
# export HF_HOME=/path/to/large/disk/hf_cache

# ── Launch ────────────────────────────────────────────────────
python server.py
