import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neural: {
          void: "var(--bg-void)",
          cyan: "var(--cyan)",
          violet: "var(--violet)",
          magenta: "var(--magenta)",
          amber: "var(--amber)",
          emerald: "var(--emerald)",
          "text-hi": "var(--text-hi)",
          "text-mid": "var(--text-mid)",
          "text-lo": "var(--text-lo)",
          glass: "var(--glass)",
          "glass-border": "var(--glass-border)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "gradient-shift": { "0%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" }, "100%": { backgroundPosition: "0% 50%" } },
        "nebula-drift": { "0%, 100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(80px,40px) scale(1.1)" } },
        "chip-float": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-3px)" } },
        "thought-float": { "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.6" }, "25%": { transform: "translateY(-8px) scale(1.02)", opacity: "0.9" }, "50%": { transform: "translateY(-3px) scale(0.98)", opacity: "0.7" }, "75%": { transform: "translateY(-10px) scale(1.01)", opacity: "0.85" } },
        "nav-pulse": { "0%, 100%": { opacity: "0.2" }, "50%": { opacity: "0.6" } },
        "ctx-pulse": { "0%, 100%": { boxShadow: "0 0 10px rgba(0,240,255,0.2)" }, "50%": { boxShadow: "0 0 20px rgba(0,240,255,0.4)" } },
        "flow-dot": { "0%": { opacity: "0", transform: "scale(0)" }, "30%": { opacity: "0.8", transform: "scale(1)" }, "100%": { opacity: "0", transform: "scale(0.5) translateY(-10px)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-shift": "gradient-shift 6s ease infinite",
        "nebula-drift": "nebula-drift 25s ease-in-out infinite",
        "chip-float": "chip-float 3s ease-in-out infinite",
        "thought-float": "thought-float 8s ease-in-out infinite",
        "nav-pulse": "nav-pulse 4s ease-in-out infinite",
        "ctx-pulse": "ctx-pulse 3s ease-in-out infinite",
        "flow-dot": "flow-dot 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
