import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cbre: {
          green: "#003F2D",
          accent: "#17E88F",
        },
        nvidia: {
          green: "#76B900",
        },
        nmc: {
          blue: "#38BDF8",
        },
      },
    },
  },
  plugins: [],
};
export default config;

