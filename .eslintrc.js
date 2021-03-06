module.exports = {
	'env': {
		'browser': true,
		'commonjs': true,
		'es6': true,
		'node': true
	},
	'extends': 'eslint:recommended',
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly'
	},
	'parserOptions': {
		'ecmaVersion': 11
	},
	'rules': {
		'no-console': process.env.NODE_ENV  === 'x' ? ['warn'] : ['off'],
		'no-debugger': process.env.NODE_ENV === 'x' ? ['warn'] : ['off'],
		'indent': ['error','tab'],
		'linebreak-style': ['error', 'unix'],
		'quotes': ['error','single'],
		'semi': ['error','always'],
		'no-unused-vars': ['warn']
	}
};
