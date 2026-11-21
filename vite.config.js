import { defineConfig } from 'vite';
export default defineConfig({ server: { port: 5173 }, build: { rollupOptions: { input: {
  home: 'index.html', packages: 'packages.html', booking: 'booking.html',
  track: 'track-booking.html', login: 'login.html', register: 'register.html',
  admin: 'admin/dashboard.html', adminBookings: 'admin/bookings.html',
  adminPackages: 'admin/packages.html', adminFood: 'admin/food-management.html',
  adminReports: 'admin/reports.html', adminSettings: 'admin/settings.html'
}}}});
