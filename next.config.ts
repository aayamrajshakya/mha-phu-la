import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @mlc-ai/web-llm uses Node.js-specific requires that shouldn't be bundled server-side
  serverExternalPackages: ['@mlc-ai/web-llm'],

  turbopack: {
    rules: {
      // Turbopack native WASM support — needed by web-llm's tokenizer
      '*.wasm': {
        type: 'wasm',
      },
    },
  },
};

export default nextConfig;
