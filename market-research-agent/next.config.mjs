/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "langchain",
      "@langchain/openai",
      "@langchain/langgraph",
      "@langchain/community",
      "@langchain/textsplitters",
      "langsmith",
    ],
  },
};

export default nextConfig;
