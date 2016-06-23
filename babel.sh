#!/bin/sh

./node_modules/babel-cli/bin/babel.js \
--presets react,es2015,stage-0 \
--watch js/components/src \
--out-dir js/components/build \
