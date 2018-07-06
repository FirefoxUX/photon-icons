#!/usr/bin/env node
'use strict';

const shell = require('shelljs');
const fs = require('fs');
const {icons} = require('./photon-icons.json');

const SVG_RE = /<svg [^>]*>/;
const interesting_attrs = ['xmlns', 'width', 'height', 'viewBox'];

const images = shell.ls('-R', 'icons')
  .map(image => `icons/${image}`)
  .filter(image => image.includes('.svg'));
let prevname = "";

const missing = [];
const unseen = images.slice();
const seen = [];
const out_of_order = [];
const bad_sizes = [];

function checkIncluded(name, categories, tags) {
  let rv = false;
  name = name.toLocaleLowerCase();
  categories = categories.map(c => c.toLocaleLowerCase());
  nextTag: for (let tag of tags.map(c => c.toLocaleLowerCase())) {
    if (tag.indexOf(name) != -1 || name.indexOf(tag) != -1) {
      out_of_order.push(`${name}’s tags shouldn’t include ${tag} (already in name).`);
      rv = true;
      continue;
    }
    for (let category of categories) {
      if (tag.indexOf(category) != -1 || category.indexOf(tag) != -1) {
        out_of_order.push(`${name}’s tags shouldn’t include ${tag} (already in categories).`);
        rv = true;
        continue nextTag;
      }
    }
  }
  return rv;
}

function checkAlphabetical(name, list, kind) {
  let sorted = list.map(c => c.toLocaleLowerCase());
  sorted.sort();
  if (JSON.stringify(list.map(c => c.toLocaleLowerCase())) !== JSON.stringify(sorted)) {
    out_of_order.push(`${name}’s ${kind} aren’t alphabetical.`);
  }
}

for (let icon of icons) {
  let currname = icon.name;
  currname = currname.replace(' ', '@').toLocaleLowerCase();
  if (currname < prevname) {
    out_of_order.push(`${currname.replace('@', ' ')} should be before ${prevname.replace('@', ' ')}.`);
  }
  checkAlphabetical(icon.name, icon.categories, "categories");
  if (!checkIncluded(icon.name, icon.categories, icon.tags)) {
    checkAlphabetical(icon.name, icon.tags, "tags");
  }
  prevname = currname;
  for (let source in icon.source) {
    nextImage: for (let size in icon.source[source]) {
      let image = icon.source[source][size];
      let exists = images.includes(image);
      let unseenIndex = unseen.indexOf(image);
      if (unseenIndex != -1) {
        unseen.splice(unseenIndex, 1);
      }
      if (!exists) {
        missing.push(`${image} (from ${icon.name}.${source}.${size})`)
        continue nextImage;
      }
      if (seen.indexOf(image) != -1) {
        out_of_order.push(`Duplicate entries for ${image}!`);
        continue nextImage;
      }
      seen.push(image);

      // check for the correct viewbox.
      let data = fs.readFileSync(image, "utf-8");
      let matches = SVG_RE.exec(data);
      let ATTR_RE = /[a-zA-Z0-9]+="[^"]*"/g;
      let attr = null;
      let attrs = {};
      while ((attr = ATTR_RE.exec(matches[0])) != null) {
        let [key, val] = attr[0].split("=");
        if (interesting_attrs.indexOf(key) == -1) {
          continue;
        }
        // Make sure we don't have duplicate attributes.
        if (attrs[key] != undefined) {
          bad_sizes.push(`${image} has more than one ${key}.`);
          continue nextImage;
        }
        attrs[key] = val.slice(1, val.length - 1);
      }

      // Make sure all the things we're interested in are there.
      for (let key of interesting_attrs) {
        if (!attrs[key]) {
          bad_sizes.push(`${image} is missing ${key}.`);
          continue nextImage;
        }
      }
      let attr_size = attrs['width'];
      if (attrs['height'] != attr_size) {
        bad_sizes.push(`${image} has a height different than "${attr_size}".`);
        continue nextImage;
      }
      if (attrs['viewBox'] != `0 0 ${attr_size} ${attr_size}`) {
        bad_sizes.push(`${image} has a viewbox different than "0 0 ${attr_size} ${attr_size}".`);
        continue nextImage;
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