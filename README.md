# sattrack [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> utility to get the track of a satellite

## Installation


```sh
$ npm install -g sattrack
```

## Configuration


## Usage


```
Usage: sattrack [command] <options>

Commands:
  update                 Update tle file                            [aliases: u]
  visible                Visible tonight                            [aliases: v]
  next [satellite]       next [satellite]                           [aliases: n]
  plot [satellite]       plot [satellite]                           [aliases: p]
  config [name] [value]  show/set the config                        [aliases: c]

Options:
  --day    add or remove days to the reference date                 [default: 0]
  --range  number of days to scan                                   [default: 1]
  --tle    TLE dataset to use
       [choices: "visual", "tle-new", "stations", "weather", "supplemental/iss"]
                                                             [default: "visual"]
```

```js
var sattrack = require('sattrack');

sattrack('Rainbow');
```
## License

unlicense © [John Cole]()


[npm-image]: https://badge.fury.io/js/sattrack.svg
[npm-url]: https://npmjs.org/package/sattrack
[travis-image]: https://travis-ci.org/cole-hsv/sattrack.svg?branch=master
[travis-url]: https://travis-ci.org/cole-hsv/sattrack
[daviddm-image]: https://david-dm.org/cole-hsv/sattrack.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/cole-hsv/sattrack
[coveralls-image]: https://coveralls.io/repos/cole-hsv/sattrack/badge.svg
[coveralls-url]: https://coveralls.io/r/cole-hsv/sattrack
