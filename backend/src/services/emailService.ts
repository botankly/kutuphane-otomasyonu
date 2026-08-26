import nodemailer from 'nodemailer';

/**
 * Creates a fresh Nodemailer transporter reading current process.env credentials
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER || 'botankulay1@gmail.com';
  const pass = process.env.EMAIL_PASS || 'iqoe kheb ymyl wrsp';

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass
    }
  });
};

/**
 * 1. Genel Canlı Bildirim E-postası (Her Bildirim Tetiğinde Otomatik Mail Gönderimi)
 */
export const sendNotificationEmail = async (
  toEmail: string,
  userName: string,
  title: string,
  message: string
): Promise<boolean> => {
  try {
    const fromUser = process.env.EMAIL_USER || 'botankulay1@gmail.com';
    const transporter = getTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #60a5fa;">🏛️ Üniversite Kütüphanesi</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Canlı Sistem Bildirimi</p>
        </div>
        
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Sayın ${userName},</h2>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 800; color: #0f172a;">${title}</p>
            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${message}</p>
          </div>
          
          <p style="font-size: 12px; color: #64748b;">Bu bildirim Kütüphane Bilgi Sistemindeki hesabınıza (<strong>${toEmail}</strong>) tanımlı e-posta adresinize gönderilmiştir.</p>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © 2026 Üniversite Kütüphane Otomasyon Sistemi. Tüm hakları saklıdır.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Kütüphane Otomasyonu" <${fromUser}>`,
      to: toEmail,
      subject: `🔔 ${title}`,
      html: htmlContent
    });

    console.log(`✅ Email başarıyla gönderildi: ${info.messageId} | Alıcı: ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Email Hatası (${toEmail}):`, error.message || error);
    return false;
  }
};

/**
 * 2. Hoş geldin e-postası (Yeni Üye Kaydı)
 */
export const sendRegistrationEmail = async (toEmail: string, userName: string): Promise<boolean> => {
  try {
    const fromUser = process.env.EMAIL_USER || 'botankulay1@gmail.com';
    const transporter = getTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #60a5fa;">🏛️ Üniversite Kütüphanesi</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Aramıza Hoş Geldiniz!</p>
        </div>
        
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Sayın ${userName},</h2>
          <p>Üniversite Kütüphane Bilgi Sistemine başarıyla kayıt oldunuz.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">🎯 Neler Yapabilirsiniz?</p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
              <li>Zengin dijital ve fiziksel kitap kataloğunu inceleyin</li>
              <li>İstediğiniz kitabı 14 gün süreyle ödünç alın</li>
              <li>3 Katlı Kütüphanemizde 90 çalışma masasından dilediğinizi rezerve edin</li>
              <li>QR kod ile masanıza oturup sessiz çalışma alanının keyfini çıkarın</li>
            </ul>
          </div>
          
          <p style="font-size: 13px; color: #64748b;">E-posta adresiniz: <strong>${toEmail}</strong></p>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © 2026 Üniversite Kütüphane Otomasyon Sistemi. Tüm hakları saklıdır.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Kütüphane Otomasyonu" <${fromUser}>`,
      to: toEmail,
      subject: '🎉 Kütüphanemize Hoş Geldiniz! - Kayıt Onayı',
      html: htmlContent
    });

    console.log(`✅ Email başarıyla gönderildi: ${info.messageId} | Alıcı: ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Email Hatası (${toEmail}):`, error.message || error);
    return false;
  }
};

/**
 * 3. Kitap Ödünç Alma Onay E-postası
 */
export const sendLoanConfirmationEmail = async (
  toEmail: string,
  userName: string,
  bookTitle: string,
  dueDate: string
): Promise<boolean> => {
  try {
    const fromUser = process.env.EMAIL_USER || 'botankulay1@gmail.com';
    const transporter = getTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #60a5fa;">📚 Kitap Ödünç Alma Onayı</h1>
        </div>
        
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Sayın ${userName},</h2>
          <p>Kütüphanemizden gerçekleştirdiğiniz kitap ödünç alma işlemi başarıyla onaylanmıştır.</p>
          
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #1e3a8a;">📖 Kitap Bilgisi:</p>
            <p style="margin: 0; font-size: 16px; font-weight: 800; color: #1d4ed8;">${bookTitle}</p>
            
            <hr style="border: 0; border-top: 1px dashed #93c5fd; margin: 12px 0;" />
            
            <p style="margin: 0; font-size: 13px; color: #1e40af;">
              📅 <strong>Son Teslim Tarihi:</strong> <span style="font-weight: 800; color: #dc2626;">${dueDate}</span>
            </p>
          </div>
          
          <p style="font-size: 12px; color: #64748b;">Lütfen kitabı son teslim tarihinden önce iade etmeyi veya süresini uzatmayı unutmayınız.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Kütüphane Otomasyonu" <${fromUser}>`,
      to: toEmail,
      subject: `📖 Kitap Ödünç Alındı: ${bookTitle}`,
      html: htmlContent
    });

    console.log(`✅ Email başarıyla gönderildi: ${info.messageId} | Alıcı: ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Email Hatası (${toEmail}):`, error.message || error);
    return false;
  }
};

/**
 * 4. Masa Rezervasyon Onay E-postası
 */
export const sendReservationEmail = async (
  toEmail: string,
  userName: string,
  deskName: string,
  roomName: string,
  date: string,
  timeSlot: string
): Promise<boolean> => {
  try {
    const fromUser = process.env.EMAIL_USER || 'botankulay1@gmail.com';
    const transporter = getTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #34d399;">🪑 Masa Rezervasyon Onayı</h1>
        </div>
        
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Sayın ${userName},</h2>
          <p>Çalışma masası rezervasyonunuz başarıyla oluşturuldu!</p>
          
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #047857; font-weight: 700;">Salon / Kat:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #065f46; text-align: right;">${roomName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #047857; font-weight: 700;">Masa Numarası:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #065f46; text-align: right;">${deskName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #047857; font-weight: 700;">Tarih:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #065f46; text-align: right;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #047857; font-weight: 700;">Saat Aralığı:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #065f46; text-align: right;">${timeSlot}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 12px; color: #64748b;">Salona vardığınızda QR kod okutarak veya profilden <strong>Masaya Otur (Check-In)</strong> butonuna basarak oturumunuzu başlatabilirsiniz.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Kütüphane Otomasyonu" <${fromUser}>`,
      to: toEmail,
      subject: `🪑 Masa Rezervasyon Onayı: ${roomName} (${deskName})`,
      html: htmlContent
    });

    console.log(`✅ Email başarıyla gönderildi: ${info.messageId} | Alıcı: ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Email Hatası (${toEmail}):`, error.message || error);
    return false;
  }
};

/**
 * 5. Şifre Sıfırlama E-postası (Forgot Password / Password Reset Link)
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  resetUrl: string
): Promise<boolean> => {
  try {
    const fromUser = process.env.EMAIL_USER || 'botankulay1@gmail.com';
    const transporter = getTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #60a5fa;">🔑 Şifre Sıfırlama Talebi</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Üniversite Kütüphane Bilgi Sistemi</p>
        </div>
        
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Merhaba,</h2>
          <p>Kütüphane hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni bir şifre belirlemek için aşağıdaki butona tıklayın:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
              Şifremi Sıfırla &rarr;
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b;">Eğer buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcınıza kopyalayabilirsiniz:</p>
          <p style="font-size: 12px; word-break: break-all; color: #2563eb;"><a href="${resetUrl}">${resetUrl}</a></p>
          
          <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px 16px; margin: 24px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 12px; color: #be123c;">⚠️ Bu bağlantı <strong>1 saat</strong> süreyle geçerlidir. Talebi siz yapmadıysanız bu e-postayı dikkate almayınız.</p>
          </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © 2026 Üniversite Kütüphane Otomasyon Sistemi. Tüm hakları saklıdır.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Kütüphane Otomasyonu" <${fromUser}>`,
      to: toEmail,
      subject: '🔑 Kütüphane Hesabı Şifre Sıfırlama Bağlantısı',
      html: htmlContent
    });

    console.log(`✅ Şifre sıfırlama e-postası başarıyla gönderildi: ${info.messageId} | Alıcı: ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Şifre Sıfırlama Email Hatası (${toEmail}):`, error.message || error);
    throw error;
  }
};
