# Photon Icons

A collection of icons that harmonize with Firefox’s new Photon design.

To add a new icon
* Put the file in `icons/<platform>/iconname-size.svg`.
* Edit `photon-icons.json` to add a new entry that references your file in the appropriate place (alphabetized by name).
* Run `npm install` to install all the dependencies.
* Run `npm test` to make sure you did everything correctly.
* Run `npm run build` to optimize the SVG, and if applicable, generate the iOS and Android versions.
* Send a PR! 🙂
