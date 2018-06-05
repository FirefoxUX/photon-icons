#!/usr/bin/env node
'use strict';

const shell = require('shelljs');
const fs = require('fs');
const {icons} = require('./photon-icons.json');

const SIZE_RE = /<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/;

const images = shell.ls('-R', 'icons')
  .map(image => `icons/${image}`)
  .filter(image => image.includes('.'));
let prevname = "";

const missing = [];
const unseen = images.slice();
const out_of_order = [];
const bad_sizes = [];

for (let icon of icons) {
  let currname = icon.categories.join(':');
  if (icon.tags.indexOf('deprecated') != -1) {
    currname += ':deprecated';
  }
  currname += '/' + icon.name;
  currname = currname.replace(' ', '@').toLocaleLowerCase();
  if (currname < prevname) {
    out_of_order.push(`${currname.replace('@', ' ')} should be before ${prevname.replace('@', ' ')}.`);
  }
  prevname = currname;
  for (let source in icon.source) {
    for (let size in icon.source[source]) {
      let image = icon.source[source][size];
      let exists = images.includes(image);
      let unseenIndex = unseen.indexOf(image);
      if (unseenIndex != -1) {
        unseen.splice(unseenIndex, 1);
      }
      if (!exists) {
        missing.push(`${image} (from ${icon.name}.${source}.${size})`)
      } else {
        // check for the correct viewbox.
        let data = fs.readFileSync(image, "utf-8");
        let matches = SIZE_RE.exec(data);
        if (!matches) {
          bad_sizes.push(`${image} does not have a proper viewBox.`);
        } else {
          let sizes = matches.slice(1);
          if (!sizes.every(size => size == sizes[0])) {
            bad_sizes.push(`${image} isn't square with a proper viewbox: [${sizes}]`);
          }
        }
      }
    }
  }
}

if (missing.length) {
  console.log(`Missing files:\n  ${missing.join("\n  ")}`);
}
if (unseen.length) {
  console.log(`Extra files:\n  ${unseen.join("\n  ")}`);
}
if (out_of_order.length) {
  console.log(`Out of order entries:\n  ${out_of_order.join("\n  ")}`);
}
if (bad_sizes.length) {
  console.log(`Poorly-sized entries:\n  ${bad_sizes.join("\n  ")}`);
}