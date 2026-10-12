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
        // Dark SaaS Surface Tokens (remapped for zero pastel leakage)
        ivory: {
          50: "#090D1B",
          100: "#0D1324",
          200: "#162038",
          300: "#1E293B",
          400: "#334155",
          500: "#475569",
        },
        // Electric Blue & Cobalt Primary Accents
        blush: {
          50: "#0F172A",
          100: "#1E293B",
          200: "#1E3A8A",
          300: "#60A5FA",
          400: "#3B82F6",
          500: "#2563EB",
          600: "#3B82F6",
          700: "#60A5FA",
          800: "#93C5FD",
          900: "#BFDBFE",
        },
        // Refined Indigo & Violet Secondary Accents
        lavender: {
          50: "#0F172A",
          100: "#1E1B4B",
          200: "#312E81",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#818CF8",
          700: "#A5B4FC",
          800: "#C7D2FE",
          900: "#E0E7FF",
        },
        // Crisp Light Slate & White Typography Hierarchy for Dark Mode
        plum: {
          50: "#090D1B",
          100: "#0F172A",
          200: "#1E293B",
          300: "#64748B",
          400: "#94A3B8",
          500: "#94A3B8",
          600: "#CBD5E1",
          700: "#E2E8F0",
          800: "#F1F5F9",
          900: "#F8FAFC",
          950: "#FFFFFF",
        },
        navy: {
          50: "#090D1B",
          100: "#0F172A",
          200: "#1E293B",
          300: "#64748B",
          400: "#94A3B8",
          500: "#94A3B8",
          600: "#CBD5E1",
          700: "#E2E8F0",
          800: "#F1F5F9",
          900: "#F8FAFC",
          950: "#FFFFFF",
        },
        teal: {
          50: "#0F172A",
          100: "#1E293B",
          200: "#1E3A8A",
          300: "#60A5FA",
          400: "#3B82F6",
          500: "#2563EB",
          600: "#3B82F6",
          700: "#60A5FA",
          800: "#93C5FD",
          900: "#BFDBFE",
          950: "#EFF6FF",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(2, 6, 23, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
        luxury: "0 16px 36px -8px rgba(2, 6, 23, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        glow: "0 0 25px -5px rgba(37, 99, 235, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
