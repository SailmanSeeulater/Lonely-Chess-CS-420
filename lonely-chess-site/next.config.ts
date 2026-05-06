/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/Lonely-Chess-CS-420',
    assetPrefix: 'https://sailmanseeulater.github.io/Lonely-Chess-CS-420',
    images: { unoptimized: true },
    typescript: {
        ignoreBuildErrors: true,
    },
}

export default nextConfig