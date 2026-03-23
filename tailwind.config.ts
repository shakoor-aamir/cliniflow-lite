import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          25: "#f8fafc",
        },
      },
      boxShadow: {
        panel: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Aptos", "\"Segoe UI Variable\"", "\"Segoe UI\"", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
