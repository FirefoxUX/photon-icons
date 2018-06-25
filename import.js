#!/usr/bin/env node
'use strict';

const shell = require('shelljs');
const fetch = require('node-fetch');
const fs = require('fs');
const {icons} = require('./photon-icons.json');

const images = shell.ls('-R', 'icons')
  .map(image => `icons/${image}`)
  .filter(image => image.includes('.'));
let prevname = "";

const missing = [];
const unseen = images.slice();
const out_of_order = [];
const bad_sizes = [];

if (!process.env.FIGMA_TOKEN) {
  console.log("Missing Figma token. Please set the FIGMA_TOKEN environment variable.")
}

const FILE_ID = 'wb4TYfsXHQ8xIVp7rE1NfT';
fetch(
    `https://api.figma.com/v1/files/${FILE_ID}`,
    {headers: { 'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN }})
  .then(res => res.json())
  .then(json => {
    for (let child of json.document.children[0].children) {
      child.imageName = `icons/${child.name.replace(' / ', '/')}.svg`;
      let exists = images.includes(child.imageName);
      let unseenIndex = unseen.indexOf(child.imageName);
      if (unseenIndex != -1) {
        unseen.splice(unseenIndex, 1);
      }
      if (!exists) {
        missing.push(child);
      }
    }
  }).then(reportErrors);

function reportErrors() {
  if (missing.length) {
    let values = missing.map(x => x.id);
    console.log(`GET https://api.figma.com/v1/images/${FILE_ID}?format=svg&ids=${values.join(",")}`);
    fetch(
      `https://api.figma.com/v1/images/${FILE_ID}?format=svg&ids=${values.join(",")}`,
      {headers: { 'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN }})
    .then(res => res.json())
    .then(json => {
      for (let image in json.images) {
        let file = missing.find(x => x.id == image).imageName;
        fetch(json.images[image]).then(res => {
          console.log(`Downloading ${file}`);
          const dest = fs.createWriteStream(file);
          res.body.pipe(dest);
        });
      }
    });
  }
}
