'use strict';
require('core-js/stable');
require('regenerator-runtime/runtime');

const crypto = require('crypto');
crypto.generateKeyPair = require('browser-keygen').generateKeyPair;

module.exports = {
	AnchorAPIBuilder: require('./AnchorAPIBuilder'),
	AnchorAPI: require('./AnchorAPI')
};
window.anchor = module.exports;
window.Ipfs = require('ipfs');