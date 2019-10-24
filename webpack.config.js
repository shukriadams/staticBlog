module.exports = {
    context: __dirname + "/frontend",
    entry: "./index",
	output: {
		path: __dirname + "/web/static/js",
		filename: "webpack.js"
	},
    module: {
      rules: [
        {
            test: /\.js$/,
            exclude: /node_modules/,
            use: ['babel-loader']
        },
        {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
        },        
      ]
    }
};