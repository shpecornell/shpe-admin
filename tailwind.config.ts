import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        shpe: {
          bgStart: "#00031A",
          bgEnd: "#001F5B",
          accent: "#FD652F",
          blue: "#0070C0"
        }
      }
    }
  },
  plugins: []
};

export default config;
