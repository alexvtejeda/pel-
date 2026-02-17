import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			slate: {
  				'50': 'oklch(98% 0.005 264.695)',
  				'100': 'oklch(95% 0.008 264.695)',
  				'200': 'oklch(85% 0.015 264.695)',
  				'300': 'oklch(70% 0.025 264.695)',
  				'400': 'oklch(50% 0.035 264.695)',
  				'500': 'oklch(35% 0.042 264.695)',
  				'600': 'oklch(25% 0.042 264.695)',
  				'700': 'oklch(18% 0.042 264.695)',
  				'800': 'oklch(12.9% 0.042 264.695)',
  				'900': 'oklch(8% 0.042 264.695)',
  				DEFAULT: 'oklch(12.9% 0.042 264.695)'
  			},
  			zinc: {
  				'50': 'oklch(98% 0.002 285.823)',
  				'100': 'oklch(95% 0.003 285.823)',
  				'200': 'oklch(85% 0.004 285.823)',
  				'300': 'oklch(70% 0.005 285.823)',
  				'400': 'oklch(50% 0.005 285.823)',
  				'500': 'oklch(35% 0.005 285.823)',
  				'600': 'oklch(25% 0.005 285.823)',
  				'700': 'oklch(18% 0.005 285.823)',
  				'800': 'oklch(14.1% 0.005 285.823)',
  				'900': 'oklch(10% 0.005 285.823)',
  				DEFAULT: 'oklch(14.1% 0.005 285.823)'
  			},
  			red: {
  				'50': 'oklch(97% 0.015 26.042)',
  				'100': 'oklch(94% 0.025 26.042)',
  				'200': 'oklch(85% 0.045 26.042)',
  				'300': 'oklch(70% 0.065 26.042)',
  				'400': 'oklch(50% 0.080 26.042)',
  				'500': 'oklch(40% 0.090 26.042)',
  				'600': 'oklch(30% 0.092 26.042)',
  				'700': 'oklch(25.8% 0.092 26.042)',
  				'800': 'oklch(20% 0.092 26.042)',
  				'900': 'oklch(15% 0.092 26.042)',
  				DEFAULT: 'oklch(25.8% 0.092 26.042)'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'2xl': '1rem',
  			xl: '0.75rem'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'Source Sans 3',
  				'Manrope',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
