import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ['Poppins', 'sans-serif'],
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "#FAF9F6",
        foreground: "#4D4D46",
        primary: {
          DEFAULT: "#A5A58D",
          foreground: "#F6F3EE",
        },
        secondary: {
          DEFAULT: "#8B8B83",
          foreground: "#F6F3EE",
        },
        muted: {
          DEFAULT: "#B2B8A3",
          foreground: "#4D4D46",
        },
        accent: {
          DEFAULT: "#C98A75",
          foreground: "#F6F3EE",
        },
        destructive: {
          DEFAULT: "#D9A08E",
          foreground: "#F6F3EE",
        },
        card: {
          DEFAULT: "#F6F3EE",
          foreground: "#4D4D46",
        },
        popover: {
          DEFAULT: "#F6F3EE",
          foreground: "#4D4D46",
        },
        olive: "#A5A58D",
        beige: "#E5D5C5",
        terracotta: "#C98A75",
        cream: "#F6F3EE",
        stone: "#8B8B83",
        charcoal: "#4D4D46",
        rose: "#D9A08E",
        sage: "#B2B8A3",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
