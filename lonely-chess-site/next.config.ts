/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/Lonely-Chess-CS-420',
    images: { unoptimized: true },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
}

export default nextConfig