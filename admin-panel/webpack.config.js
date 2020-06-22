const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const appBuildDev = path.resolve('./.cromwell/static/dev');
const appBuildProd = path.resolve('./.cromwell/static/prod');
const buildMode = process.env.NODE_ENV;
const isProduction = buildMode === 'production';

module.exports = {
    mode: buildMode,
    devtool: isProduction ? null : "source-map",
    entry: './src/index.ts',
    output: {
        path: isProduction ? appBuildProd : appBuildDev,
        filename: isProduction
            ? '[name].[contenthash:8].js'
            : '[name].js',
        publicPath: '/',
    },
    resolve: {
        extensions: [".js", "jsx", ".ts", ".tsx"]
    },
    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader"
                    }
                ]
            },
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader"
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ],
            },
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns:
                isProduction ?
                    [{
                        from: path.resolve(__dirname, '../node_modules/react/umd/react.production.min.js'),
                    },
                    {
                        from: path.resolve(__dirname, '../node_modules/react-dom/umd/react-dom.production.min.js'),
                    }] :
                    [{
                        from: path.resolve(__dirname, '../node_modules/react/umd/react.development.js'),
                    },
                    {
                        from: path.resolve(__dirname, '../node_modules/react/umd/react.profiling.min.js'),
                    },
                    {
                        from: path.resolve(__dirname, '../node_modules/react-dom/umd/react-dom.development.js'),
                    },
                    {
                        from: path.resolve(__dirname, '../node_modules/react-dom/umd/react-dom.profiling.min.js'),
                    }]
        }),
        new HtmlWebpackPlugin(Object.assign(
            {
                filename: `index.html`,
                template: `./public/index.html`,

            },
            isProduction
                ? {
                    minify: {
                        removeComments: true,
                        collapseWhitespace: true,
                        removeRedundantAttributes: true,
                        useShortDoctype: true,
                        removeEmptyAttributes: true,
                        removeStyleLinkTypeAttributes: true,
                        keepClosingSlash: true,
                        minifyJS: true,
                        minifyCSS: true,
                        minifyURLs: true,
                        reactSrc: '/react.production.min.js',
                        reactDOMSrc: '/react-dom.production.min.js',
                        reactProfilingSrc: '',
                        reactDOMProfilingSrc: ''
                    },
                }
                : {
                    reactSrc: '/react.development.js',
                    reactDOMSrc: '/react-dom.development.js',
                    reactProfilingSrc: '/react.profiling.min.js',
                    reactDOMProfilingSrc: '/react-dom.profiling.min.js'
                }
        ))
    ],
    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
        "react": "React",
        "react-dom": "ReactDOM"
    }
};