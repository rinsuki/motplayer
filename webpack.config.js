/** @type {import("webpack").Configuration} */
const config = {
    mode: "production",
    entry: {
        "local-storage": "./src/browser/polyfill/local-storage.ts",
    },
    output: {
        path: new URL("dist/browser/bundle", import.meta.url).pathname
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader",
        }]
    },
    optimization: {
        minimize: false,
    },
}

export default config