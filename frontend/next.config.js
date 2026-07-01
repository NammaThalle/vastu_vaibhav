


const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
    ...(isDev ? {} : { output: 'export', distDir: 'dist' }),
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    async rewrites() {
        if (!process.env.API_PROXY_URL) {
            return [];
        }

        return [
            {
                source: "/api/:path*",
                destination: `${process.env.API_PROXY_URL}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
