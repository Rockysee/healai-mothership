#!/bin/bash
# FRAMEGEN — Local Inference Server startup script
# Run from the local-inference/ directory: ./start.sh

set -e
cd "$(dirname "$0")"

echo ""
echo "🎬  FRAMEGEN Local Inference Setup"
echo "   Model  : LTX-Video (Lightricks)"
echo "   Device : Apple MPS (M1/M2/M3 GPU)"
echo "   Port   : 8000"
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
echo "   Installing dependencies (one-time, ~2 min)…"
echo ""
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo ""
echo "   ✓ Dependencies ready"
echo ""
echo "   Starting server on http://localhost:8000"
echo "   First generation downloads LTX-Video model (~8 GB) — subsequent runs are instant."
echo "   Press Ctrl+C to stop."
echo ""

# ── MPS Memory tuning (Apple M1/M2/M3) ──────────────────────
# Removes the upper memory allocation limit to prevent OOM on 16GB M1.
# This lets MPS use all available VRAM; model + 49-frame generation fits safely.
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
export PYTORCH_MPS_ALLOCATOR_POLICY=garbage_collection

# ── Launch ───────────────────────────────────────────────────
python server.py
