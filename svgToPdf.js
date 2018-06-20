/*
 * svgToPdf.js
 * 
 * Copyright 2012-2014 Florian Hülsmann <fh@cbix.de>
 * Copyright 2014 Ben Gribaudo <www.bengribaudo.com>
 * 
 * This script is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This script is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this file.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */
'use strict';

global.window = {document: {createElementNS: () => {return {}} }};
global.navigator = {};
global.btoa = () => {};
const jsPDF = require('jspdf');

var pdfSvgAttr = {
    // allowed attributes. all others are removed from the preview.
    g: ['stroke', 'fill', 'stroke-width'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
    rect: ['x', 'y', 'width', 'height', 'stroke', 'fill', 'stroke-width'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'stroke', 'fill', 'stroke-width'],
    circle: ['cx', 'cy', 'r', 'stroke', 'fill', 'stroke-width'],
    text: ['x', 'y', 'font-size', 'font-family', 'text-anchor', 'font-weight', 'font-style', 'fill'],
    path: ['d', 'stroke', 'fill', 'stroke-width']
};

var removeAttributes = function(node, attributes) {
    attributes.forEach(attrib => {
        node.removeAttribute(attrib);
    });
}

var parseNumbers = function(data) {
    let numbers = /[, ]? *(-?[0-9]*[.]?[0-9]+)/g;
    let rv = [];
    let result;
    while ((result = numbers.exec(data)) !== null) {
        rv.push(parseFloat(result[1]));
    }
    return rv;
}

var svgElementToPdf = function(element, pdf, options) {
    // pdf is a jsPDF object
    var remove = (typeof(options.removeInvalid) == 'undefined' ? false : options.removeInvalid);
    var k = (typeof(options.scale) == 'undefined' ? 1.0 : options.scale);
    var colorMode = null;
    var error = "";
    Array.from(element.children).forEach(function(node, i) {
		var hasFillColor = false;
		var hasStrokeColor = false;
		if (['g','line','rect','ellipse','circle','text','path'].includes(node.localName)) {
            var fillColor = node.getAttribute('fill');
            if(fillColor != null) {
                if (fillColor == 'context-fill') {
                    fillColor = 'black';
                }
                var fillRGB = new window.RGBColor(fillColor);
                if(fillRGB.ok) {
					hasFillColor = true;
                    colorMode = 'F';
                } else {
                    colorMode = null;
                }
            }
        }
        if (['g','line','rect','ellipse','circle','path'].includes(node.localName)) {
            if(hasFillColor) {
				pdf.setFillColor(fillRGB.r, fillRGB.g, fillRGB.b);
			}
            if(node.getAttribute('stroke-width') != null) {
                pdf.setLineWidth(k * parseInt(node.getAttribute('stroke-width')));
            }
            var strokeColor = node.getAttribute('stroke');
            if(strokeColor != null) {
                if (strokeColor == 'context-fill') {
                    strokeColor = 'black';
                }
                var strokeRGB = new window.RGBColor(strokeColor);
                if(strokeRGB.ok) {
					hasStrokeColor = true;
                    pdf.setDrawColor(strokeRGB.r, strokeRGB.g, strokeRGB.b);
                    if(colorMode == 'F') {
                        colorMode = 'FD';
                    } else {
                        colorMode = null;
                    }
                } else {
                    colorMode = null;
                }
            }
		}
        switch(node.tagName.toLowerCase()) {
            case 'svg':
            case 'a':
            case 'g':
                let rv = svgElementToPdf(node, pdf, options);
                removeAttributes(node, pdfSvgAttr.g);
                if (!rv) {
                    error = "group error";
                }
                break;
            case 'line':
                pdf.line(
                    k*parseInt(node.getAttribute('x1')),
                    k*parseInt(node.getAttribute('y1')),
                    k*parseInt(node.getAttribute('x2')),
                    k*parseInt(node.getAttribute('y2'))
                );
                removeAttributes(node, pdfSvgAttr.line);
                break;
            case 'path':
                let d = node.getAttribute('d');
                const REGEX = /(?=[MmLlHhVvQqCcTtSsAaZz])/
                let current = {x:0, y:0};
                let firstPoint = null;
                let controlPoint = null;
                let closed = false;
                let lines = [];
                for (let part of d.split(REGEX)) {
                    let op = part[0];
                    part = part.slice(1);
                    switch (op) {
                        case 'M':
                        case 'm':
                            controlPoint = null;
                            part = parseNumbers(part);
                            let first = true;
                            while (part.length) {
                                let prev = {...current};
                                if (op == 'M') {
                                    current = {x:0, y:0};
                                }
                                current.x += part[0];
                                current.y += part[1];
                                if (!firstPoint) {
                                    firstPoint = {...current};
                                }
                                if (!first) {
                                    lines.push([
                                        current.x - prev.x,
                                        current.y - prev.y
                                    ]);
                                }
                                first = false;
                                part = part.slice(2);
                            }
                            break;
                        case 'L':
                        case 'l':
                            controlPoint = null;
                            part = parseNumbers(part);
                            while (part.length) {
                                let prev = {...current};
                                if (op == 'L') {
                                    current = {x:0, y:0};
                                }
                                current.x += part[0];
                                current.y += part[1];
                                lines.push([
                                    current.x - prev.x,
                                    current.y - prev.y
                                ]);
                                part = part.slice(2);
                            }
                            break;
                        case 'H':
                        case 'h':
                            controlPoint = null;
                            part = parseNumbers(part);
                            while (part.length) {
                                let prev = {...current};
                                if (op == 'H') {
                                    current.x = 0;
                                }
                                current.x += part.shift();
                                lines.push([current.x - prev.x, 0]);
                            }
                            break;
                        case 'V':
                        case 'v':
                            controlPoint = null;
                            part = parseNumbers(part);
                            while (part.length) {
                                let prev = {...current};
                                if (op == 'V') {
                                    current.y = 0;
                                }
                                current.y += part.shift();
                                lines.push([0, current.y - prev.y]);
                            }
                            break;
                        case 'C':
                        case 'c':
                            part = parseNumbers(part);
                            while (part.length) {
                                let prev = {...current};
                                if (op == 'C') {
                                    current = {x:0, y:0};
                                }
                                let cp1 = {
                                    x: current.x + part[0],
                                    y: current.y + part[1]
                                };
                                let cp2 = {
                                    x: current.x + part[2],
                                    y: current.y + part[3]
                                };
                                current.x += part[4];
                                current.y += part[5];
                                lines.push([
                                    cp1.x - prev.x,cp1.y - prev.y,
                                    cp2.x - prev.x,cp2.y - prev.y,
                                    current.x - prev.x,current.y - prev.y
                                ]);
                                controlPoint = {
                                    x: 2*current.x - cp2.x,
                                    y: 2*current.y - cp2.y
                                };
                                part = part.slice(6);
                            }
                        break;
                        case 'S':
                        case 's':
                            part = parseNumbers(part);
                            while (part.length) {
                                let prev = {...current};
                                if (!controlPoint) {
                                    controlPoint = {...current};
                                }
                                if (op == 'S') {
                                    current = {x:0, y:0};
                                }
                                let cp2 = {
                                    x: current.x + part[0],
                                    y: current.y + part[1]
                                };
                                current.x += part[2];
                                current.y += part[3];
                                lines.push([
                                    controlPoint.x - prev.x,controlPoint.y - prev.y,
                                    cp2.x - prev.x,cp2.y - prev.y,
                                    current.x - prev.x,current.y - prev.y
                                ])
                                controlPoint = {
                                    x: 2*current.x - cp2.x,
                                    y: 2*current.y - cp2.y
                                };
                                part = part.slice(4);
                            }
                            break;
                        case 'Z':
                        case 'z':
                            closed = true;
                            break;
                        case 'A':
                        case 'a':
                            part = parseNumbers(part);
                            while (part.length) {
                                let prev = {...current};
                                current.x += part[5];
                                current.y += part[6];
                                let q = Math.sqrt(
                                    (current.x - prev.x) * (current.x - prev.x) +
                                    (current.y - prev.y) * (current.y - prev.y)
                                );
                                let mid = Math.sqrt(Math.abs(part[0] * part[0] - q * q / 4));
                                let x = (current.x + prev.x) / 2 + mid * (current.y - prev.y) / q;
                                let y = (current.y + prev.y) / 2 + mid * (current.x - prev.x) / q;
                                pdf.ellipse(x, y, part[0], part[1], colorMode);
                                lines.push([
                                    current.x - prev.x,current.y - prev.y
                                ]);
                                controlPoint = null;
                                part = part.slice(7);
                            }
                            break;
                        case 'Q':
                        case 'q':
                        case 'T':
                        case 't':
                        default:
                            error += `Can't translate to pdf: ${op + part}\n`;
                            break;
                    }
                }
                pdf.lines(
                    lines,
                    firstPoint.x,
                    firstPoint.y,
                    [k,k], colorMode, closed
                );
                removeAttributes(node, pdfSvgAttr.path);
                break;
            case 'rect':
                pdf.rect(
                    k*parseInt(node.getAttribute('x')),
                    k*parseInt(node.getAttribute('y')),
                    k*parseInt(node.getAttribute('width')),
                    k*parseInt(node.getAttribute('height')),
                    colorMode
                );
                removeAttributes(node, pdfSvgAttr.rect);
                break;
            case 'ellipse':
                pdf.ellipse(
                    k*parseInt(node.getAttribute('cx')),
                    k*parseInt(node.getAttribute('cy')),
                    k*parseInt(node.getAttribute('rx')),
                    k*parseInt(node.getAttribute('ry')),
                    colorMode
                );
                removeAttributes(node, pdfSvgAttr.ellipse);
                break;
            case 'circle':
                pdf.circle(
                    k*parseInt(node.getAttribute('cx')),
                    k*parseInt(node.getAttribute('cy')),
                    k*parseInt(node.getAttribute('r')),
                    colorMode
                );
                removeAttributes(node, pdfSvgAttr.circle);
                break;
            case 'text':
                if(node.hasAttribute('font-family')) {
                    switch(node.getAttribute('font-family').toLowerCase()) {
                        case 'serif': pdf.setFont('times'); break;
                        case 'monospace': pdf.setFont('courier'); break;
                        default:
                            node.getAttribute('font-family', 'sans-serif');
                            pdf.setFont('helvetica');
                    }
                }
                if(hasFillColor) {
                    pdf.setTextColor(fillRGB.r, fillRGB.g, fillRGB.b);
                }
                var fontType = "";
                if(node.hasAttribute('font-weight')) {
                    if(node.getAttribute('font-weight') == "bold") {
                        fontType = "bold";
                    } else {
                        node.removeAttribute('font-weight');
                    }
                }
                if(node.hasAttribute('font-style')) {
                    if(node.getAttribute('font-style') == "italic") {
                        fontType += "italic";
                    } else {
                        node.removeAttribute('font-style');
                    }
                }
                pdf.setFontType(fontType);
                var pdfFontSize = 16;
				if(node.hasAttribute('font-size')) {
                    pdfFontSize = parseInt(node.getAttribute('font-size'));
                }
                var box = node.getBBox();
                //FIXME: use more accurate positioning!!
                var x, y, xOffset = 0;
                if(node.hasAttribute('text-anchor')) {
                    switch(node.getAttribute('text-anchor')) {
                        case 'end': xOffset = box.width; break;
                        case 'middle': xOffset = box.width / 2; break;
                        case 'start': break;
                        case 'default': node.getAttribute('text-anchor', 'start');
                    }
                    x = parseInt(node.getAttribute('x')) - xOffset;
                    y = parseInt(node.getAttribute('y'));
                }
				//console.log("fontSize:", pdfFontSize, "text:", n.text());
                pdf.setFontSize(pdfFontSize).text(
                    k * x,
                    k * y,
                    node.text()
                );
                removeAttributes(node, pdfSvgAttr.text);
                break;
            //TODO: image
            default:
                if (remove) {
                    console.log("can't translate to pdf:", node ? node.localName : 'unknown');
                    node.remove();
                }
        }
    });
    if (error) {
        console.log(error);
        return null;
    }
    return pdf;
};

jsPDF.API.addSVG = function(element, x, y, options) {
    'use strict'

    options = (typeof(options) == 'undefined' ? {} : options);
    options.x_offset = x;
    options.y_offset = y;

    let rv = svgElementToPdf(element, this, options);
    if (!rv) {
        return null;
    }
    return this;
};

var svgToPdf = function (svg) {
    let width = parseInt(svg.getAttribute('width'), 10);
    let height = parseInt(svg.getAttribute('height'), 10);
    var pdf = new jsPDF('p', 'px', 'a4');
    let rv = svgElementToPdf(svg, pdf, {
      scale: 1, // this is the ratio of px to pt units
      removeInvalid: true // this removes elements that could not be translated to pdf from the source svg
    });
    if (!rv) {
        return null;
    }
    return pdf.output();
}

module.exports = svgToPdf;

