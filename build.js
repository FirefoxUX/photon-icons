#!/usr/bin/env node
'use strict';

const HEADER = `<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->`

const shell = require('shelljs');
const fs = require('fs');
const images = shell.ls('-R', 'icons')
  .map(image => `icons/${image}`)
  .filter(image => image.includes('.'));

for (let image of images) {
  // check for the correct viewbox.
  let data = HEADER + fs.readFileSync(image, "utf-8");
  fs.writeFileSync(image, data, "utf-8");
}
