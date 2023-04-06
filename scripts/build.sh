#!/bin/bash

mkdir -p build dist
export NODE_OPTIONS=--openssl-legacy-provider
npm run preelectron-pack && npm run dist
