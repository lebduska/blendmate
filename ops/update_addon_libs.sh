#!/bin/bash

# Script to update/vendor Python libraries for the Blender addon
# Requirements: python3, pip

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ADDON_DIR="$SCRIPT_DIR/../blendmate-addon"
LIBS_DIR="$ADDON_DIR/libs"

echo "🚀 Updating Blender addon libraries..."

# Clean old libs
if [ -d "$LIBS_DIR" ]; then
    echo "🧹 Cleaning old libraries in $LIBS_DIR..."
    rm -rf "$LIBS_DIR"
fi

mkdir -p "$LIBS_DIR"

# Install requirements
echo "📦 Installing requirements to $LIBS_DIR..."
python3 -m pip install --target "$LIBS_DIR" -r "$ADDON_DIR/requirements.txt" --upgrade --no-user

# Clean up unnecessary files to keep the addon small
echo "🧹 Cleaning up unnecessary files (*.pyc, __pycache__, dist-info)..."
find "$LIBS_DIR" -name "*.pyc" -delete
find "$LIBS_DIR" -name "__pycache__" -delete
find "$LIBS_DIR" -name "*.dist-info" -rf
find "$LIBS_DIR" -name "*.egg-info" -rf

echo "✅ Done! Addon libraries are updated and ready for distribution."
