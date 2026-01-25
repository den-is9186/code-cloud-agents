#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# LLAMA 4 SCOUT LOCAL SETUP
# ═══════════════════════════════════════════════════════════════
# 
# Dieses Script richtet Llama 4 Scout auf eurem Server ein.
# Voraussetzungen: 24-48GB VRAM GPU (RTX 4090/5090 oder H100)
#
# Usage: ./setup-scout-local.sh [vllm|ollama|llamacpp]
# ═══════════════════════════════════════════════════════════════

set -e

METHOD="${1:-ollama}"
PORT="${2:-8000}"
MODEL_NAME="llama-4-scout-instruct"

echo "═══════════════════════════════════════════════════════════════"
echo "  LLAMA 4 SCOUT LOCAL SETUP"
echo "  Method: $METHOD | Port: $PORT"
echo "═══════════════════════════════════════════════════════════════"

case $METHOD in
  # ─────────────────────────────────────────────────────────────────
  # OPTION 1: vLLM (Empfohlen für Production)
  # ─────────────────────────────────────────────────────────────────
  vllm)
    echo "📦 Installing vLLM..."
    pip install vllm --upgrade
    
    echo "🚀 Starting vLLM server..."
    echo "   Model: $MODEL_NAME"
    echo "   Port: $PORT"
    echo "   Context: 131k tokens"
    
    vllm serve meta-llama/Llama-4-Scout-17B-16E-Instruct \
      --host 0.0.0.0 \
      --port $PORT \
      --tensor-parallel-size 1 \
      --max-model-len 131072 \
      --trust-remote-code \
      --dtype auto
    ;;
    
  # ─────────────────────────────────────────────────────────────────
  # OPTION 2: Ollama (Einfachstes Setup)
  # ─────────────────────────────────────────────────────────────────
  ollama)
    echo "📦 Installing Ollama..."
    if ! command -v ollama &> /dev/null; then
      curl -fsSL https://ollama.com/install.sh | sh
    fi
    
    echo "📥 Pulling Llama 4 Scout..."
    ollama pull llama4-scout:instruct
    
    echo "🚀 Starting Ollama server..."
    echo "   Port: 11434 (Ollama default)"
    echo "   OpenAI-compatible: http://localhost:11434/v1"
    
    OLLAMA_HOST=0.0.0.0 ollama serve
    ;;
    
  # ─────────────────────────────────────────────────────────────────
  # OPTION 3: llama.cpp (Beste Performance/VRAM)
  # ─────────────────────────────────────────────────────────────────
  llamacpp)
    echo "📦 Building llama.cpp..."
    
    if [ ! -d "llama.cpp" ]; then
      git clone https://github.com/ggerganov/llama.cpp
    fi
    
    cd llama.cpp
    make -j$(nproc) LLAMA_CUDA=1
    
    # Download quantized model if not exists
    MODEL_FILE="llama-4-scout-instruct-Q4_K_M.gguf"
    if [ ! -f "models/$MODEL_FILE" ]; then
      echo "📥 Downloading quantized model..."
      echo "   Bitte manuell von HuggingFace herunterladen:"
      echo "   https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct-GGUF"
      echo "   Und nach llama.cpp/models/ kopieren"
      exit 1
    fi
    
    echo "🚀 Starting llama.cpp server..."
    ./server \
      -m models/$MODEL_FILE \
      --host 0.0.0.0 \
      --port $PORT \
      --ctx-size 131072 \
      --n-gpu-layers 99
    ;;
    
  *)
    echo "❌ Unknown method: $METHOD"
    echo "   Usage: ./setup-scout-local.sh [vllm|ollama|llamacpp]"
    exit 1
    ;;
esac
