import app from './app';
import { autoReleaseExpiredReservations } from './controllers/deskReservation.controller';

const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Server ${PORT} portunda başarıyla başlatıldı!`);
  console.log(`📍 Endpoint: http://localhost:${PORT}`);
  console.log(`📚 Kütüphane Otomasyonu Backend Çalışıyor!\n`);

  // Start background periodic check for 15-minute expired desk reservations (every 30 seconds)
  setInterval(() => {
    autoReleaseExpiredReservations().catch((err) =>
      console.error('Arka plan otomatik masa iptali hatası:', err)
    );
  }, 30000);
});
