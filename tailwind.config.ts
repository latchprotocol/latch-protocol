import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 40px rgba(0, 255, 209, 0.18)",
        glowStrong: "0 0 60px rgba(255, 46, 99, 0.22)"
      }
    }
  },
  plugins: []
} satisfies Config;
