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
        charcoal: "#5F6955",
        deepgray: "#7C6B5D",
        olive: "#A9A18D",
        beige: "#E0C5B1",
        copper: "#D5A18E",
        offwhite: "#F4F2EE",
        background: "#F4F2EE",
        foreground: "#5F6955",
        card: {
          DEFAULT: "#F4F2EE",
          foreground: "#5F6955",
        },
        popover: {
          DEFAULT: "#F4F2EE",
          foreground: "#5F6955",
        },
        primary: {
          DEFAULT: "#5F6955",
          foreground: "#F4F2EE",
        },
        secondary: {
          DEFAULT: "#7C6B5D",
          foreground: "#F4F2EE",
        },
        muted: {
          DEFAULT: "#A9A18D",
          foreground: "#F4F2EE",
        },
        accent: {
          DEFAULT: "#D5A18E",
          foreground: "#F4F2EE",
        },
        destructive: {
          DEFAULT: "#D5A18E",
          foreground: "#F4F2EE",
        },
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
