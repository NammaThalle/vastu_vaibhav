

const withPWA = require("next-pwa")({
    dest: "public",
    cacheOnFrontEndNav: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        disableDevLogs: true,
    },
});


/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    distDir: 'dist',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
};

module.exports = withPWA(nextConfig);
