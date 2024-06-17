#!/bin/bash

node ./scripts/build--dynamic.js

node ./test/pre-render.js
open ./test/integration--static--out.html