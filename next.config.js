/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  webpack(config, { dev }) {
    // Resolve the browser bundle even in Next's server-side client-component pass.
    // The package's node export imports @tensorflow/tfjs-node, which is not a browser dependency.
    const humanPackageDir = require("node:path").dirname(require.resolve("@vladmandic/human"));
    config.resolve.alias["@vladmandic/human-browser$"] = require("node:path").join(humanPackageDir, "human.esm.js");
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
