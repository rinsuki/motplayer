const webpack = require("webpack")

/** @type {import("webpack").Configuration} */
const config = {
    mode: "production",
    entry: {
        "local-storage": "./src/browser/polyfill/local-storage.ts",
        "require1": "./src/browser/polyfill/require1.ts",
    },
    output: {
        path: __dirname + "/dist/browser/bundle",
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader",
        }]
    },
    resolve: {
        fallback: {
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify"),
            // "process-browser": require.resolve("./src/process.js"),
            "path": require.resolve("path-browserify"),
            "process-browser": require.resolve("./src/browser/polyfill/process.ts"),
            vm: false,
        }
    },
    optimization: {
        minimize: false,
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: "process-browser",
            Buffer: ["buffer", "Buffer"],
        })
    ],
}

module.exports = config