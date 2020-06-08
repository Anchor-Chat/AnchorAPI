'use strict';
require('core-js/stable');
require('regenerator-runtime/runtime');

// Main
module.exports = {
	AnchorAPIBuilder: require('./AnchorAPIBuilder'),
	AnchorAPI: require('./AnchorAPI'),
	TextChannel: require('./objects/TextChannel')
};