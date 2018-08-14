#!/usr/bin/env node
'use strict';

const HEADER = `<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->
`

const fs = require('fs');
const jsdom = require('jsdom');
const shell = require('shelljs');
const svgToPdf = require('./svgToPdf');
const s2v = require("svg2vectordrawable");

const images = shell.ls('-R', 'icons')
  .map(image => `icons/${image}`)
  .filter(image => image.includes('.svg'));

for (let image of images) {
  let data = HEADER + fs.readFileSync(image, 'utf-8');
  fs.writeFileSync(image, data, 'utf-8');
  if (image.indexOf('/ios/') != -1) {
    jsdom.env({html: data,
      done : function (errors, window) {
        console.log(image);
        var temp = svgToPdf(window.document.body);
        if (temp) {
          fs.writeFileSync(image.replace('.svg', '.pdf'), temp, 'utf-8');
        }
      }
    });
  } else if (image.indexOf('/android/') != -1) {
    console.log(image);
    let imageData = s2v.getFileContent(image);

    let lightImage = s2v.svg2vectorDrawableContent(imageData.replace('context-fill', '#0c0c0d'), 'nodpi');
    s2v.createFile(image.replace('.svg', '-light.xml'), lightImage, false);

    let darkImage = s2v.svg2vectorDrawableContent(imageData.replace('context-fill', '#f9f9fa'), 'nodpi');
    s2v.createFile(image.replace('.svg', '-dark.xml'), darkImage, false);  }
}
