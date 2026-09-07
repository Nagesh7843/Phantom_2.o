/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },

      {
        source: '/login/google',
        destination: 'http://127.0.0.1:5000/login/google',
      },
      {
        source: '/login/callback',
        destination: 'http://127.0.0.1:5000/login/callback',
      },
      {
        source: '/logout',
        destination: 'http://127.0.0.1:5000/logout',
      },
    ];
  },
};

export default nextConfig;
