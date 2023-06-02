const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
	target: 'node',
	externals: [nodeExternals()], // removes node_modules from your final bundle
	entry: './lib/Gateway.js', // make sure this matches the main root of your code
	mode: 'production',
	output: {
		path: path.join(__dirname, 'build'), // this can be any path and directory you want
		filename: 'videopass-gateway.js',
	},
	optimization: {
		minimize: true, // enabling this reduces file size and readability
	},
}
