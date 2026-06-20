// vite.config.js
import react from "file:///mnt/c/Users/Louise%20Bruwer/Documents/GitHub/IMY772/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///mnt/c/Users/Louise%20Bruwer/Documents/GitHub/IMY772/frontend/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///mnt/c/Users/Louise%20Bruwer/Documents/GitHub/IMY772/frontend/node_modules/vite-plugin-pwa/dist/index.js";
import istanbul from "file:///mnt/c/Users/Louise%20Bruwer/Documents/GitHub/IMY772/frontend/node_modules/vite-plugin-istanbul/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    istanbul({
      include: "src/**",
      exclude: ["node_modules", "cypress/"],
      extension: [".js", ".jsx"],
      requireEnv: true,
      // only instrument when CYPRESS_COVERAGE=true
      forceBuildInstrument: false
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg", "microtrack-logo.png"],
      manifest: {
        name: "Microtrack",
        short_name: "Microtrack",
        description: "Track and manage your microgreens",
        theme_color: "#7db344",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/microtrack-app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/microtrack-app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
          // NOTE: /api/* is intentionally NOT cached by the service worker.
          // It is live dashboard data; caching it (previously NetworkFirst, 24h)
          // served stale data and, on any blip, surfaced a false "server is
          // waking up" state. API requests now always go straight to the network.
        ]
      }
    })
  ],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "lcov"],
      reportsDirectory: "coverage"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvTG91aXNlIEJydXdlci9Eb2N1bWVudHMvR2l0SHViL0lNWTc3Mi9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL21udC9jL1VzZXJzL0xvdWlzZSBCcnV3ZXIvRG9jdW1lbnRzL0dpdEh1Yi9JTVk3NzIvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL21udC9jL1VzZXJzL0xvdWlzZSUyMEJydXdlci9Eb2N1bWVudHMvR2l0SHViL0lNWTc3Mi9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcclxuaW1wb3J0IGlzdGFuYnVsIGZyb20gJ3ZpdGUtcGx1Z2luLWlzdGFuYnVsJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgaXN0YW5idWwoe1xyXG4gICAgICBpbmNsdWRlOiAnc3JjLyoqJyxcclxuICAgICAgZXhjbHVkZTogWydub2RlX21vZHVsZXMnLCAnY3lwcmVzcy8nXSxcclxuICAgICAgZXh0ZW5zaW9uOiBbJy5qcycsICcuanN4J10sXHJcbiAgICAgIHJlcXVpcmVFbnY6IHRydWUsICAgICAgICAgIC8vIG9ubHkgaW5zdHJ1bWVudCB3aGVuIENZUFJFU1NfQ09WRVJBR0U9dHJ1ZVxyXG4gICAgICBmb3JjZUJ1aWxkSW5zdHJ1bWVudDogZmFsc2UsXHJcbiAgICB9KSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLnN2ZycsICdpY29uLnN2ZycsICdtaWNyb3RyYWNrLWxvZ28ucG5nJ10sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogJ01pY3JvdHJhY2snLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdNaWNyb3RyYWNrJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RyYWNrIGFuZCBtYW5hZ2UgeW91ciBtaWNyb2dyZWVucycsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjN2RiMzQ0JyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9taWNyb3RyYWNrLWFwcC1pY29uLnN2ZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnYW55JyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9taWNyb3RyYWNrLWFwcC1pY29uLnN2ZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnYW55JyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLHN2Zyxwbmcsd29mZjJ9J10sXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnU3RhbGVXaGlsZVJldmFsaWRhdGUnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzLWNhY2hlJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nc3RhdGljXFwuY29tXFwvLiovaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ3N0YXRpYy1mb250cy1jYWNoZScsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgLy8gTk9URTogL2FwaS8qIGlzIGludGVudGlvbmFsbHkgTk9UIGNhY2hlZCBieSB0aGUgc2VydmljZSB3b3JrZXIuXHJcbiAgICAgICAgICAvLyBJdCBpcyBsaXZlIGRhc2hib2FyZCBkYXRhOyBjYWNoaW5nIGl0IChwcmV2aW91c2x5IE5ldHdvcmtGaXJzdCwgMjRoKVxyXG4gICAgICAgICAgLy8gc2VydmVkIHN0YWxlIGRhdGEgYW5kLCBvbiBhbnkgYmxpcCwgc3VyZmFjZWQgYSBmYWxzZSBcInNlcnZlciBpc1xyXG4gICAgICAgICAgLy8gd2FraW5nIHVwXCIgc3RhdGUuIEFQSSByZXF1ZXN0cyBub3cgYWx3YXlzIGdvIHN0cmFpZ2h0IHRvIHRoZSBuZXR3b3JrLlxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICBdLFxyXG4gIHRlc3Q6IHtcclxuICAgIGNvdmVyYWdlOiB7XHJcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxyXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ3RleHQtc3VtbWFyeScsICdqc29uJywgJ2xjb3YnXSxcclxuICAgICAgcmVwb3J0c0RpcmVjdG9yeTogJ2NvdmVyYWdlJyxcclxuICAgIH0sXHJcbiAgfSxcclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxVyxPQUFPLFdBQVc7QUFDdlgsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sY0FBYztBQUVyQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxTQUFTO0FBQUEsTUFDVCxTQUFTLENBQUMsZ0JBQWdCLFVBQVU7QUFBQSxNQUNwQyxXQUFXLENBQUMsT0FBTyxNQUFNO0FBQUEsTUFDekIsWUFBWTtBQUFBO0FBQUEsTUFDWixzQkFBc0I7QUFBQSxJQUN4QixDQUFDO0FBQUEsSUFDRCxRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsZUFBZSxZQUFZLHFCQUFxQjtBQUFBLE1BQ2hFLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQyxrQ0FBa0M7QUFBQSxRQUNqRCxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZLEVBQUUsWUFBWSxJQUFJLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSTtBQUFBLFlBQ2xFO0FBQUEsVUFDRjtBQUFBLFVBQ0E7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxLQUFLLEtBQUssS0FBSyxJQUFJO0FBQUEsWUFDbEU7QUFBQSxVQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUtGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLGdCQUFnQixRQUFRLE1BQU07QUFBQSxNQUNqRCxrQkFBa0I7QUFBQSxJQUNwQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
