#!/bin/bash
# Sposta il terminale nella cartella del gioco
cd "$(dirname "$0")"

# Controlla se il server è già attivo sulla porta 8000, altrimenti lo avvia
if ! lsof -i :8000 >/dev/null; then
  python3 server.py >/dev/null 2>&1 &
  sleep 1
fi

# Apre automaticamente il browser sul gioco
open http://localhost:8000
