# Dependency and asset review

The runtime package contains no vendored third-party Python or JavaScript libraries.
Python is installed separately and not redistributed. Browser/system fonts are not
bundled. SVG artwork and inline icons are local source assets; the owner should
confirm rights to contributed artwork before publishing. No external artwork
license or font file was found in this source snapshot.

jsdom is used ONLY for development tests. Its MIT license is preserved in
[docs/licenses/jsdom-LICENSE.txt](docs/licenses/jsdom-LICENSE.txt).
No node_modules folder is distributed. The table below records the complete
resolved test dependency tree from the local tested installation/lockfile.
Licenses are package metadata, not an independent legal provenance determination.
Dependencies retain their own terms; npm installs their notices with their packages.
The project license does not replace dependency licenses.

The previous development manifest requested jsdom 30.1.6; the available and tested
local installation was 30.1.2. This candidate pins 30.1.2 and its actual resolved
transitive graph, with the published integrity records retained. A clean online
npm ci remains to be checked before public release; no dependencies are bundled.

| Development package | Version | Declared license |
|---|---|---|
| @asamuzakjp/css-color | 7.1.5 | MIT |
| @asamuzakjp/dom-selector | 9.2.4 | MIT |
| @bramus/specificity | 2.4.3 | MIT |
| @csstools/color-helpers | 6.1.2 | MIT-0 |
| @csstools/css-calc | 3.4.3 | MIT |
| @csstools/css-color-parser | 4.2.6 | MIT |
| @csstools/css-parser-algorithms | 4.0.2 | MIT |
| @csstools/css-syntax-patches-for-csstree | 1.1.15 | MIT-0 |
| @csstools/css-tokenizer | 4.0.2 | MIT |
| @exodus/bytes | 1.16.0 | MIT |
| bidi-js | 1.1.0 | MIT |
| css-tree | 3.2.1 | MIT |
| data-urls | 8.0.0 | MIT |
| decimal.js | 10.6.0 | MIT |
| entities | 8.1.0 | BSD-2-Clause |
| html-encoding-sniffer | 7.0.0 | MIT |
| is-potential-custom-element-name | 1.0.1 | MIT |
| jsdom | 30.1.2 | MIT |
| lru-cache | 11.5.3 | BlueOak-1.0.0 |
| mdn-data | 2.27.1 | CC0-1.0 |
| parse5 | 8.0.1 | MIT |
| punycode | 2.3.1 | MIT |
| require-from-string | 2.0.2 | MIT |
| saxes | 6.0.0 | ISC |
| source-map-js | 1.2.2 | BSD-3-Clause |
| tldts | 7.4.18 | MIT |
| tldts-core | 7.4.18 | MIT |
| tough-cookie | 6.0.2 | BSD-3-Clause |
| tr46 | 7.0.0 | MIT |
| undici | 8.11.2 | MIT |
| w3c-xmlserializer | 6.0.0 | MIT |
| webidl-conversions | 8.0.1 | BSD-2-Clause |
| whatwg-mimetype | 5.0.0 | MIT |
| whatwg-url | 17.2.0 | MIT |
| xml-name-validator | 5.0.0 | Apache-2.0 |
| xmlchars | 2.2.0 | MIT |
