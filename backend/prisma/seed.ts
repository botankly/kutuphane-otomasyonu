import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Hard Reset sonrası Tam 500 Tekil & Benzersiz Kitap Yükleniyor...');

  // 1. System Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const librarianPassword = await bcrypt.hash('librarian123', 10);
  const memberPassword = await bcrypt.hash('member123', 10);

  const defaultUsers = [
    {
      email: 'admin@kutuphane.com',
      passwordHash: adminPassword,
      fullName: 'Sistem Yöneticisi',
      role: 'ADMIN'
    },
    {
      email: 'librarian@kutuphane.com',
      passwordHash: librarianPassword,
      fullName: 'Kütüphane Görevlisi',
      role: 'LIBRARIAN'
    },
    {
      email: 'member@kutuphane.com',
      passwordHash: memberPassword,
      fullName: 'Örnek Kütüphane Üyesi',
      role: 'MEMBER'
    }
  ];

  for (const u of defaultUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, isActive: true },
      create: {
        email: u.email,
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
        isActive: true
      }
    });
  }

  // 2. THEMATIC COVER POOLS BY CATEGORY
  const THEMATIC_COVER_POOLS: Record<string, string[]> = {
    'Yazılım': [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&auto=format&fit=crop&q=80'
    ],
    'Edebiyat': [
      'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80'
    ],
    'Tarih': [
      'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80'
    ],
    'Felsefe': [
      'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80'
    ],
    'Bilim Kurgu': [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80'
    ],
    'Ekonomi': [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80'
    ],
    'Psikoloji': [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop&q=80'
    ],
    'Hukuk': [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=80'
    ],
    'Mühendislik': [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80'
    ]
  };

  // 3. 500 DISTINCT REALISTIC BOOKS BY CATEGORY (~56 PER CATEGORY)
  const RAW_BOOK_DATA: Record<string, Array<{ title: string; author: string; publisher: string }>> = {
    'Yazılım': [
      { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', publisher: 'Prentice Hall' },
      { title: 'Refactoring: Improving the Design of Existing Code', author: 'Martin Fowler', publisher: 'Addison-Wesley' },
      { title: 'Design Patterns: Elements of Reusable Object-Oriented Software', author: 'Erich Gamma et al.', publisher: 'Addison-Wesley' },
      { title: 'The Pragmatic Programmer: Your Journey to Mastery', author: 'Andrew Hunt & David Thomas', publisher: 'Addison-Wesley' },
      { title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', publisher: 'MIT Press' },
      { title: 'Code Complete: A Practical Handbook of Software Construction', author: 'Steve McConnell', publisher: 'Microsoft Press' },
      { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', publisher: 'MIT Press' },
      { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', publisher: 'O\'Reilly Media' },
      { title: 'Clean Architecture: A Craftsman\'s Guide to Software Structure', author: 'Robert C. Martin', publisher: 'Prentice Hall' },
      { title: 'Domain-Driven Design: Tackling Complexity in Software', author: 'Eric Evans', publisher: 'Addison-Wesley' },
      { title: 'Test Driven Development: By Example', author: 'Kent Beck', publisher: 'Addison-Wesley' },
      { title: 'You Don\'t Know JS Yet: Get Started', author: 'Kyle Simpson', publisher: 'O\'Reilly Media' },
      { title: 'Node.js Design Patterns', author: 'Mario Casciaro', publisher: 'Packt Publishing' },
      { title: 'The Rust Programming Language', author: 'Steve Klabnik', publisher: 'No Starch Press' },
      { title: 'Python Crash Course', author: 'Eric Matthes', publisher: 'No Starch Press' },
      { title: 'Grokking Algorithms', author: 'Aditya Bhargava', publisher: 'Manning Publications' },
      { title: 'Head First Design Patterns', author: 'Eric Freeman', publisher: 'O\'Reilly Media' },
      { title: 'Site Reliability Engineering', author: 'Betsy Beyer', publisher: 'O\'Reilly Media' },
      { title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', publisher: 'CareerCup' },
      { title: 'Continuous Delivery', author: 'Jez Humble', publisher: 'Addison-Wesley' },
      { title: 'Mikroservis Mimarisi ve Bulut Sistemleri', author: 'Dr. Ahmet Yılmaz', publisher: 'Kodlab' },
      { title: 'Sıfırdan Go Programlama Masterclass', author: 'Mehmet Ali Kaya', publisher: 'Abacus Yayıncılık' },
      { title: 'Modern Web Geliştirme: React & Next.js', author: 'Caner Şahin', publisher: 'Seçkin Yayıncılık' },
      { title: 'Algoritmalar ve Veri Yapıları El Kitabı', author: 'Prof. Dr. Erkan Uçar', publisher: 'Nobel Akademik' },
      { title: 'TypeScript ve Nesne Yönelimli Mimari', author: 'Serkan Öztürk', publisher: 'Kodlab' },
      { title: 'Docker ve Kubernetes ile Konteyner Yönetimi', author: 'Oğuzhan Çelik', publisher: 'Pusula Yayıncılık' },
      { title: 'Linux Sistem Yönetimi ve Kabuk Programlama', author: 'Volkan Kılıç', publisher: 'Kodlab' },
      { title: 'Veri Tabanı Mimarisi ve İleri SQL', author: 'Doç. Dr. Murat Demir', publisher: 'Palme Yayıncılık' },
      { title: 'Nesne Yönelimli Analiz ve Tasarım Prensipleri', author: 'Bülent Arslan', publisher: 'Seçkin Yayıncılık' },
      { title: 'Siber Güvenlik ve Ağ Sızma Testleri', author: 'Tarkan Akın', publisher: 'Abacus Yayıncılık' },
      { title: 'Yapay Zeka ve Derin Öğrenme Uygulamaları', author: 'Dr. Selin Tekin', publisher: 'Kodlab' },
      { title: 'Makine Öğrenmesi Algoritmaları ve Python', author: 'Emre Yıldız', publisher: 'Pusula Yayıncılık' },
      { title: 'GraphQL ve RESTful API Tasarımı', author: 'Kaan Polat', publisher: 'Kodlab' },
      { title: 'Git ve GitHub ile Versiyon Kontrolü', author: 'Burak Serbest', publisher: 'Abacus Yayıncılık' },
      { title: 'C++ ile Yüksek Performanslı Kodlama', author: 'Engin Ceylan', publisher: 'Seçkin Yayıncılık' },
      { title: 'Spring Boot ile Java Mikroservisler', author: 'Uğur Aydoğan', publisher: 'Kodlab' },
      { title: 'Swift ve SwiftUI ile iOS Uygulama Geliştirme', author: 'Alperen Şen', publisher: 'Pusula Yayıncılık' },
      { title: 'Kotlin ve Jetpack Compose ile Android Mimarisi', author: 'Onur Kurt', publisher: 'Kodlab' },
      { title: 'C# ve .NET Core Enterprise Mimari', author: 'Murat Yücedağ', publisher: 'Abacus Yayıncılık' },
      { title: 'Elixir ve Erlang ile Dağıtık Sistemler', author: 'Deniz Güven', publisher: 'Kodlab' },
      { title: 'Fonksiyonel Programlama ve Scala', author: 'Tolga Erim', publisher: 'Pusula Yayıncılık' },
      { title: 'DevSecOps Prensipleri ve Otomasyon', author: 'Turgut Kaplan', publisher: 'Kodlab' },
      { title: 'Sistem Tasarımı Mülakat Rehberi', author: 'Alex Xu', publisher: 'ByteByteGo' },
      { title: 'WebAssembly ve Modern Web Teknolojileri', author: 'Cem Yıldırım', publisher: 'Abacus Yayıncılık' },
      { title: 'Flutter ile Çapraz Platform Mobil Geliştirme', author: 'Adem İlhan', publisher: 'Kodlab' },
      { title: 'Vue.js 3 ve Nuxt.js Mimari Rehberi', author: 'Fatih Keskin', publisher: 'Pusula Yayıncılık' },
      { title: 'Redis ile Önbellekleme ve Performans', author: 'Gökhan Çeliker', publisher: 'Kodlab' },
      { title: 'RabbitMQ ve Kafka ile Asenkron Mesajlaşma', author: 'Zafer Ayan', publisher: 'Kodlab' },
      { title: 'Sorumlu Yazılım Mühendisliği ve Etik', author: 'Prof. Dr. Ali Güneş', publisher: 'Nobel Akademik' },
      { title: 'Algoritmik Ticaret ve Finansal Python', author: 'Bora Tunca', publisher: 'Scala Yayıncılık' },
      { title: 'Compiler Tasarım İlkeleri ve Yorumlayıcılar', author: 'Prof. Dr. Haluk Altun', publisher: 'Palme Yayıncılık' },
      { title: 'Yazılım Test Otomasyonu ve Selenium', author: 'Ayşe Karaca', publisher: 'Abacus Yayıncılık' },
      { title: 'Cyber Threat Intelligence El Kitabı', author: 'Erhan Çevik', publisher: 'Kodlab' },
      { title: 'Kuantum Programlama ve Qiskit Esasları', author: 'Dr. Mert Aksoy', publisher: 'Nobel Akademik' },
      { title: 'Raspberry Pi ve IoT Projeleri', author: 'Gökhan Dökümcü', publisher: 'Pusula Yayıncılık' },
      { title: 'Clean Craftsmanship: Disciplines, Standards, and Ethics', author: 'Robert C. Martin', publisher: 'Prentice Hall' }
    ],
    'Edebiyat': [
      { title: 'Suç ve Ceza', author: 'Fyodor Dostoyevski', publisher: 'Can Yayınları' },
      { title: 'Tutunamayanlar', author: 'Oğuz Atay', publisher: 'İletişim Yayınları' },
      { title: 'Kürk Mantolu Madonna', author: 'Sabahattin Ali', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Sefiller', author: 'Victor Hugo', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Saatleri Ayarlama Enstitüsü', author: 'Ahmet Hamdi Tanpınar', publisher: 'Dergah Yayınları' },
      { title: 'Dönüşüm', author: 'Franz Kafka', publisher: 'Can Yayınları' },
      { title: 'Çalıkuşu', author: 'Reşat Nuri Güntekin', publisher: 'İnkılap Kitabevi' },
      { title: 'İnce Memed', author: 'Yaşar Kemal', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Huzur', author: 'Ahmet Hamdi Tanpınar', publisher: 'Dergah Yayınları' },
      { title: 'Tehlikeli Oyunlar', author: 'Oğuz Atay', publisher: 'İletişim Yayınları' },
      { title: 'Simyacı', author: 'Paulo Coelho', publisher: 'Can Yayınları' },
      { title: 'Kırmızı ve Siyah', author: 'Stendhal', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Karamazov Kardeşler', author: 'Fyodor Dostoyevski', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Gurur ve Önyargı', author: 'Jane Austen', publisher: 'Can Yayınları' },
      { title: 'Şeker Portakalı', author: 'José Mauro de Vasconcelos', publisher: 'Can Yayınları' },
      { title: 'Yüzyıllık Yalnızlık', author: 'Gabriel García Márquez', publisher: 'Can Yayınları' },
      { title: 'Küçük Prens', author: 'Antoine de Saint-Exupéry', publisher: 'Can Yayınları' },
      { title: 'Fareler ve İnsanlar', author: 'John Steinbeck', publisher: 'Sel Yayıncılık' },
      { title: 'Beyaz Diş', author: 'Jack London', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Anna Karenina', author: 'Lev Tolstoy', publisher: 'Can Yayınları' },
      { title: 'Vadideki Zambak', author: 'Honoré de Balzac', publisher: 'Can Yayınları' },
      { title: 'Yabancı', author: 'Albert Camus', publisher: 'Can Yayınları' },
      { title: 'Dava', author: 'Franz Kafka', publisher: 'Can Yayınları' },
      { title: 'Şato', author: 'Franz Kafka', publisher: 'Can Yayınları' },
      { title: 'Yeraltından Notlar', author: 'Fyodor Dostoyevski', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Öteki', author: 'Fyodor Dostoyevski', publisher: 'Can Yayınları' },
      { title: 'Babalar ve Oğullar', author: 'İvan Turgenyev', publisher: 'Can Yayınları' },
      { title: 'Savaş ve Barış', author: 'Lev Tolstoy', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Madame Bovary', author: 'Gustave Flaubert', publisher: 'Can Yayınları' },
      { title: 'Goriot Baba', author: 'Honoré de Balzac', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Kolera Günlerinde Aşk', author: 'Gabriel García Márquez', publisher: 'Can Yayınları' },
      { title: 'Son Kuşlar', author: 'Sait Faik Abasıyanık', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Mahur Beste', author: 'Ahmet Hamdi Tanpınar', publisher: 'Dergah Yayınları' },
      { title: 'Sahnenin Dışındakiler', author: 'Ahmet Hamdi Tanpınar', publisher: 'Dergah Yayınları' },
      { title: 'Kıskanmak', author: 'Nahid Sırrı Örik', publisher: 'Can Yayınları' },
      { title: 'Kiralık Konak', author: 'Yakup Kadri Karaosmanoğlu', publisher: 'İletişim Yayınları' },
      { title: 'Yaban', author: 'Yakup Kadri Karaosmanoğlu', publisher: 'İletişim Yayınları' },
      { title: 'Devlet Ana', author: 'Kemal Tahir', publisher: 'İthaki Yayınları' },
      { title: 'Puslu Kıtalar Atlası', author: 'İhsan Oktay Anar', publisher: 'İletişim Yayınları' },
      { title: 'Susuz Yaz', author: 'Necati Cumalı', publisher: 'Cumhuriyet Yayınları' },
      { title: 'Aylak Adam', author: 'Yusuf Atılgan', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Anayurt Oteli', author: 'Yusuf Atılgan', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Ağrı Dağı Efsanesi', author: 'Yaşar Kemal', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Yılanı Öldürseler', author: 'Yaşar Kemal', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Yılanların Öcü', author: 'Fakir Baykurt', publisher: 'Literatür Yayıncılık' },
      { title: 'Bir Düğün Gecesi', author: 'Adalet Ağaoğlu', publisher: 'Everest Yayınları' },
      { title: 'Gece', author: 'Bilge Karasu', publisher: 'Metis Yayınları' },
      { title: 'Cevdet Bey ve Oğulları', author: 'Orhan Pamuk', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Kara Kitap', author: 'Orhan Pamuk', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Benim Adım Kırmızı', author: 'Orhan Pamuk', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Masumiyet Müzesi', author: 'Orhan Pamuk', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Sevgili Arsız Ölüm', author: 'Latife Tekin', publisher: 'İletişim Yayınları' },
      { title: 'Berci Kristin Çöp Masalları', author: 'Latife Tekin', publisher: 'İletişim Yayınları' },
      { title: 'Gece Dersleri', author: 'Latife Tekin', publisher: 'İletişim Yayınları' },
      { title: 'Amat', author: 'İhsan Oktay Anar', publisher: 'İletişim Yayınları' },
      { title: 'Suskunlar', author: 'İhsan Oktay Anar', publisher: 'İletişim Yayınları' }
    ],
    'Tarih': [
      { title: 'Nutuk', author: 'Mustafa Kemal Atatürk', publisher: 'Türk Tarih Kurumu' },
      { title: 'Devlet-i Aliyye: Osmanlı İmparatorluğu Üzerine Araştırmalar', author: 'Halil İnalcık', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'İlber Ortaylı ile Yakın Tarih', author: 'İlber Ortaylı', publisher: 'Kronik Kitap' },
      { title: 'Gazi Mustafa Kemal Atatürk', author: 'İlber Ortaylı', publisher: 'Kronik Kitap' },
      { title: 'Sapiens: İnsan Türünün Kısa Bir Tarihi', author: 'Yuval Noah Harari', publisher: 'Kolektif Kitap' },
      { title: 'Homo Deus: Yarının Kısa Bir Tarihi', author: 'Yuval Noah Harari', publisher: 'Kolektif Kitap' },
      { title: 'Tüfek Mikrop ve Çelik', author: 'Jared Diamond', publisher: 'Pegasus Yayınları' },
      { title: 'Tarih Notları', author: 'Bernard Lewis', publisher: 'Kronik Kitap' },
      { title: 'Osmanlı İmparatorluğu Klasik Çağ (1300-1600)', author: 'Halil İnalcık', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Türklerin Tarihi: Orta Asya\'dan Avrupa\'ya', author: 'İlber Ortaylı', publisher: 'Timaş Yayınları' },
      { title: 'İkinci Dünya Savaşı Tarihi', author: 'B. H. Liddell Hart', publisher: 'Kırmızı Kedi Yayınevi' },
      { title: 'Ortadoğu: İki Bin Yıllık Miras', author: 'Bernard Lewis', publisher: 'Arkadaş Yayınevi' },
      { title: 'Selçuklu Devlet Teşkilatı', author: 'Prof. Dr. Mehmet Altay Köymen', publisher: 'Türk Tarih Kurumu' },
      { title: 'Dünya Uygarlık Tarihi', author: 'Will Durant', publisher: 'Kabalcı Yayınları' },
      { title: 'Cumhuriyet Dönemi Ekonomi Tarihi', author: 'Şevket Pamuk', publisher: 'İletişim Yayınları' },
      { title: 'Osmanlı Sosyal ve Ekonomik Tarihi', author: 'Halil İnalcık', publisher: 'Eren Yayıncılık' },
      { title: 'Haçlı Seferleri Tarihi', author: 'Steven Runciman', publisher: 'Türk Tarih Kurumu' },
      { title: 'Roma İmparatorluğu\'nun Yükselişi ve Çöküşü', author: 'Edward Gibbon', publisher: 'İletişim Yayınları' },
      { title: 'Bizans İmparatorluğu Tarihi', author: 'A. A. Vasiliev', publisher: 'Alfa Yayınları' },
      { title: 'Soğuk Savaş Tarihi', author: 'John Lewis Gaddis', publisher: 'Kronik Kitap' },
      { title: 'Birinci Dünya Savaşı Kroniği', author: 'A. J. P. Taylor', publisher: 'Kırmızı Kedi' },
      { title: 'Fransız İhtilali ve Avrupa', author: 'Georges Lefebvre', publisher: 'Türk Tarih Kurumu' },
      { title: 'İpek Yolu Tarihi', author: 'Valerie Hansen', publisher: 'Kronik Kitap' },
      { title: 'Antik Yunan Medeniyeti', author: 'J. B. Bury', publisher: 'Dost Kitabevi' },
      { title: 'Mezopotamya Tarihi ve Uygarlıkları', author: 'Georges Roux', publisher: 'Kabalcı Yayınları' },
      { title: 'Mısır Piramitleri ve Firavunlar Tarihi', author: 'T. G. H. James', publisher: 'Homer Kitabevi' },
      { title: 'Büyük İskender ve Hellenizm', author: 'W. W. Tarn', publisher: 'Türk Tarih Kurumu' },
      { title: 'Napolyon Savaşları ve Avrupa Diplomasisi', author: 'David G. Chandler', publisher: 'Kronik Kitap' },
      { title: 'Osmanlı\'da Yeniçeri Ocağı', author: 'Reşad Ekrem Koçu', publisher: 'Doğan Kitap' },
      { title: 'Kurtuluş Savaşı Doğu Cephesi', author: 'Kâzım Karabekir', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Çanakkale Savaşları Tarihi', author: 'Sermet Atacanlı', publisher: 'Bilgi Yayınevi' },
      { title: 'Balkan Savaşları ve Büyük Göçler', author: 'Justin McCarthy', publisher: 'İletişim Yayınları' },
      { title: 'Lale Devri ve Osmanlı Islahatları', author: 'Ahmet Refik Altınay', publisher: 'Tarih Vakfı' },
      { title: 'Tanzimat Fermanı ve Modernleşme', author: 'Prof. Dr. Niyazi Berkes', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Jön Türkler ve II. Abdülhamid Dönemi', author: 'Şerif Mardin', publisher: 'İletişim Yayınları' },
      { title: 'Türkiye Cumhuriyeti Dış Politikası Tarihi', author: 'Prof. Dr. Baskın Oran', publisher: 'İletişim Yayınları' },
      { title: 'Kafkasya Tarihi ve Halkları', author: 'W. E. D. Allen', publisher: 'Kronik Kitap' },
      { title: 'Orta Asya Türk Devletleri Tarihi', author: 'Prof. Dr. Bahaeddin Ögel', publisher: 'Türk Tarih Kurumu' },
      { title: 'Hun İmparatorluğu Tarihi', author: 'Prof. Dr. Ahmet Taşağıl', publisher: 'Kronik Kitap' },
      { title: 'Göktürkler ve Uygurlar Tarihi', author: 'Prof. Dr. Ahmet Taşağıl', publisher: 'Kronik Kitap' },
      { title: 'Gazneliler ve Büyük Selçuklular', author: 'Prof. Dr. Erdoğan Merçil', publisher: 'Türk Tarih Kurumu' },
      { title: 'Endülüs Emevi Devleti Tarihi', author: 'Prof. Dr. Ziya Kazıcı', publisher: 'Kayhan Yayınları' },
      { title: 'Rönesans ve Reform Tarihi', author: 'Jacob Burckhardt', publisher: 'İş Bankası Kültür' },
      { title: 'Coğrafi Keşifler Tarihi', author: 'Carlo M. Cipolla', publisher: 'Tarih Vakfı' },
      { title: 'Sanayi Devrimi ve Kapitalizm Tarihi', author: 'Eric Hobsbawm', publisher: 'Dost Kitabevi' },
      { title: 'Amerikan İç Savaşı ve Abraham Lincoln', author: 'James M. McPherson', publisher: 'Kronik Kitap' },
      { title: 'Rus Devrimi ve Sovyetler Birliği', author: 'E. H. Carr', publisher: 'İletişim Yayınları' },
      { title: 'Ming Hanedanı ve Çin Tarihi', author: 'John King Fairbank', publisher: 'Tarih Vakfı' },
      { title: 'Maya ve İnka Medeniyetleri', author: 'Michael D. Coe', publisher: 'Homer Kitabevi' },
      { title: 'Osmanlı Mimarisi ve Sanat Tarihi', author: 'Doğan Kuban', publisher: 'YEM Yayın' },
      { title: 'Türk Denizcilik Tarihi', author: 'Fevzi Kurtoğlu', publisher: 'Deniz Basımevi' },
      { title: 'Milli Mücadele Kadın Kahramanları', author: 'Prof. Dr. Leyla Kaplan', publisher: 'Atatürk Araştırma Merkezi' },
      { title: 'Lozan Barış Antlaşması Tarihi', author: 'Prof. Dr. Seha L. Meray', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Şark Meselesi ve Osmanlı Diplomasisi', author: 'Prof. Dr. Bayram Kodaman', publisher: 'Türk Tarih Kurumu' },
      { title: 'Türkiye\'de Çok Partili Hayata Geçiş Tarihi', author: 'Tarık Zafer Tunaya', publisher: 'İletişim Yayınları' },
      { title: 'Kırım Savaşı ve Modern Hemşirelik', author: 'Florence Nightingale', publisher: 'Kronik Kitap' }
    ],
    'Felsefe': [
      { title: 'Devlet (Politeia)', author: 'Platon', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Böyle Buyurdu Zerdüşt', author: 'Friedrich Nietzsche', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Varlık ve Zaman', author: 'Martin Heidegger', publisher: 'Agora Kitaplığı' },
      { title: 'Saf Aklın Eleştirisi', author: 'Immanuel Kant', publisher: 'İdea Yayınevi' },
      { title: 'Etika', author: 'Baruch Spinoza', publisher: 'Dost Kitabevi' },
      { title: 'Sokratik Diyaloglar', author: 'Platon', publisher: 'Can Yayınları' },
      { title: 'Nikomakhos\'a Etik', author: 'Aristoteles', publisher: 'Sarmal Yayınevi' },
      { title: 'Toplum Sözleşmesi', author: 'Jean-Jacques Rousseau', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Felsefenin Temel İlkeleri', author: 'Georges Politzer', publisher: 'Sol Yayınları' },
      { title: 'Stoacının Günlüğü', author: 'Marcus Aurelius', publisher: 'Destek Yayınları' },
      { title: 'İncelenmemiş Yaşam', author: 'Robert Nozick', publisher: 'Ayrıntı Yayınları' },
      { title: 'Metafizik', author: 'Aristoteles', publisher: 'Sosyal Yayınlar' },
      { title: 'Yöntem Üzerine Söylem', author: 'René Descartes', publisher: 'Say Yayınları' },
      { title: 'Bulantı', author: 'Jean-Paul Sartre', publisher: 'Can Yayınları' },
      { title: 'Mantıksal Felsefe İncelemesi (Tractatus)', author: 'Ludwig Wittgenstein', publisher: 'Metis Yayınları' },
      { title: 'İnsanın Anlama Yetisi Üzerine Bir Deneme', author: 'John Locke', publisher: 'Kabalcı Yayınları' },
      { title: 'Tragedyanın Doğuşu', author: 'Friedrich Nietzsche', publisher: 'Say Yayınları' },
      { title: 'Deccal (Der Antichrist)', author: 'Friedrich Nietzsche', publisher: 'İş Bankası Kültür' },
      { title: 'İyinin ve Kötünün Ötesinde', author: 'Friedrich Nietzsche', publisher: 'Mustafa Kemal' },
      { title: 'Ahlakın Soykütüğü Üzerine', author: 'Friedrich Nietzsche', publisher: 'Say Yayınları' },
      { title: 'İtiraflar (Confessiones)', author: 'Augustinus', publisher: 'İletişim Yayınları' },
      { title: 'Monadoloji', author: 'Gottfried Wilhelm Leibniz', publisher: 'İş Bankası Kültür' },
      { title: 'Leviathan', author: 'Thomas Hobbes', publisher: 'Yapı Kredi Yayınları' },
      { title: 'İki Hükümet Üzerine İnceleme', author: 'John Locke', publisher: 'Metis Yayınları' },
      { title: 'İnsan Doğası Üzerine Bir İnceleme', author: 'David Hume', publisher: 'İdea Yayınevi' },
      { title: 'Pratik Aklın Eleştirisi', author: 'Immanuel Kant', publisher: 'Say Yayınları' },
      { title: 'Yargı Yetisinin Eleştirisi', author: 'Immanuel Kant', publisher: 'İdea Yayınevi' },
      { title: 'Tinin Fenomenolojisi', author: 'G. W. F. Hegel', publisher: 'İdea Yayınevi' },
      { title: 'Mantık Bilimi (Wissenschaft der Logik)', author: 'G. W. F. Hegel', publisher: 'Sol Yayınları' },
      { title: 'Hakikat ve Yöntem', author: 'Hans-Georg Gadamer', publisher: 'Paradigma Yayınları' },
      { title: 'Varlık ve Hiçlik', author: 'Jean-Paul Sartre', publisher: 'İthaki Yayınları' },
      { title: 'Özgürlük Üzerine (On Liberty)', author: 'John Stuart Mill', publisher: 'Kabalcı Yayınları' },
      { title: 'Utilitarizm (Faydacılık)', author: 'John Stuart Mill', publisher: 'İletişim Yayınları' },
      { title: 'Pragmatizm: Yeni Bir Adlandırma', author: 'William James', publisher: 'Ayrıntı Yayınları' },
      { title: 'Bilimsel Devrimlerin Yapısı', author: 'Thomas S. Kuhn', publisher: 'Kırmızı Yayınları' },
      { title: 'Bilgi Arkeolojisi', author: 'Michel Foucault', publisher: 'Birey Yayınları' },
      { title: 'Hapishanenin Doğuşu (Discipline and Punish)', author: 'Michel Foucault', publisher: 'Imge Kitabevi' },
      { title: 'Şiddet Üzerine Düşünceler', author: 'Georges Sorel', publisher: 'Metis Yayınları' },
      { title: 'Minima Moralia: Sakatlanmış Yaşamdan Yansımalar', author: 'Theodor W. Adorno', publisher: 'Metis Yayınları' },
      { title: 'Aydınlanmanın Diyalektiği', author: 'Max Horkheimer & Theodor Adorno', publisher: 'Kabalcı' },
      { title: 'Akıl Tutulması', author: 'Max Horkheimer', publisher: 'Metis Yayınları' },
      { title: 'Kamusal Alanın Yapısal Dönüşümü', author: 'Jürgen Habermas', publisher: 'İletişim Yayınları' },
      { title: 'Gösteri Toplumu', author: 'Guy Debord', publisher: 'Ayrıntı Yayınları' },
      { title: 'Simulakrlar ve Simülasyon', author: 'Jean Baudrillard', publisher: 'Doğu Batı Yayınları' },
      { title: 'Postmodern Durum', author: 'Jean-François Lyotard', publisher: 'Ara Yayıncılık' },
      { title: 'Yabancılaşma Teorisi', author: 'Karl Marx', publisher: 'Sol Yayınları' },
      { title: 'Varoluşçuluk Bir Hümanizmdir', author: 'Jean-Paul Sartre', publisher: 'Say Yayınları' },
      { title: 'Cinselliğin Tarihi', author: 'Michel Foucault', publisher: 'Ayrıntı Yayınları' },
      { title: 'Deliliğin Tarihi', author: 'Michel Foucault', publisher: 'İmge Kitabevi' },
      { title: 'Güç Arzusu', author: 'Friedrich Nietzsche', publisher: 'Say Yayınları' },
      { title: 'Sanat Kuramı ve Estetik', author: 'Prof. Dr. İsmail Tunalı', publisher: 'Remzi Kitabevi' },
      { title: 'Dil ve Hakikat', author: 'A. J. Ayer', publisher: 'Metis Yayınları' },
      { title: 'Epistemolojiye Giriş Dersleri', author: 'Prof. Dr. Arda Denkel', publisher: 'Boğaziçi Üniversitesi' },
      { title: 'Zihin Felsefesi Esasları', author: 'John Searle', publisher: 'Litera Yayıncılık' },
      { title: 'Siyaset Felsefesi Dersleri', author: 'Leo Strauss', publisher: 'Ayrıntı Yayınları' },
      { title: 'Ortaçağ Felsefesi Tarihi', author: 'Etienne Gilson', publisher: 'Kabalcı Yayınları' }
    ],
    'Bilim Kurgu': [
      { title: 'Dune: Çöl Gezegeni', author: 'Frank Herbert', publisher: 'İthaki Yayınları' },
      { title: 'Dune Mesihi', author: 'Frank Herbert', publisher: 'İthaki Yayınları' },
      { title: 'Vakıf (Foundation)', author: 'Isaac Asimov', publisher: 'İthaki Yayınları' },
      { title: 'Vakıf ve İmparatorluk', author: 'Isaac Asimov', publisher: 'İthaki Yayınları' },
      { title: '1984', author: 'George Orwell', publisher: 'Can Yayınları' },
      { title: 'Cesur Yeni Dünya', author: 'Aldous Huxley', publisher: 'İthaki Yayınları' },
      { title: 'Fahrenheit 451', author: 'Ray Bradbury', publisher: 'İthaki Yayınları' },
      { title: 'Mülksüzler', author: 'Ursula K. Le Guin', publisher: 'Metis Yayınları' },
      { title: 'Karanlığın Sol Eli', author: 'Ursula K. Le Guin', publisher: 'Metis Yayınları' },
      { title: 'Otostopçunun Galaksi Rehberi', author: 'Douglas Adams', publisher: 'Alfa Yayınları' },
      { title: 'Android\'ler Elektrikli Koyun Düşler mi?', author: 'Philip K. Dick', publisher: 'Alfa Yayınları' },
      { title: 'Zaman Makinesi', author: 'H. G. Wells', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Neuromancer', author: 'William Gibson', publisher: 'Altıkırkbeş Yayınları' },
      { title: 'Üç Cisim Problemi', author: 'Cixin Liu', publisher: 'İthaki Yayınları' },
      { title: 'Solaris', author: 'Stanisław Lem', publisher: 'İthaki Yayınları' },
      { title: 'Stalker (Yol Kenarında Piknik)', author: 'Arkadi ve Boris Strugatski', publisher: 'İthaki Yayınları' },
      { title: 'Çocukluğun Sonu', author: 'Arthur C. Clarke', publisher: 'İthaki Yayınları' },
      { title: 'Damızlık Kızın Öyküsü', author: 'Margaret Atwood', publisher: 'Doğan Kitap' },
      { title: 'Biz', author: 'Yevgeni Zamyatin', publisher: 'İş Bankası Kültür' },
      { title: 'Yüksek Şatodaki Adam', author: 'Philip K. Dick', publisher: 'Alfa Yayınları' },
      { title: 'Ubik', author: 'Philip K. Dick', publisher: 'Alfa Yayınları' },
      { title: 'Ben Robot', author: 'Isaac Asimov', publisher: 'İthaki Yayınları' },
      { title: 'Uzay Efsanesi 2001', author: 'Arthur C. Clarke', publisher: 'İthaki Yayınları' },
      { title: 'Derinliklerdeki Şehir', author: 'Arthur C. Clarke', publisher: 'İthaki Yayınları' },
      { title: 'Yıldız Gemisi Askerleri', author: 'Robert A. Heinlein', publisher: 'İthaki Yayınları' },
      { title: 'Bitmeyen Savaş', author: 'Joe Haldeman', publisher: 'İthaki Yayınları' },
      { title: 'Hyperion', author: 'Dan Simmons', publisher: 'İthaki Yayınları' },
      { title: 'Ay Zalim Bir Sevgilidir', author: 'Robert A. Heinlein', publisher: 'İthaki Yayınları' },
      { title: 'Marslı', author: 'Andy Weir', publisher: 'İthaki Yayınları' },
      { title: 'Başlat: Ready Player One', author: 'Ernest Cline', publisher: 'DEX Yayınları' },
      { title: 'Zamanın Çocukları', author: 'Adrian Tchaikovsky', publisher: 'İthaki Yayınları' },
      { title: 'Kızıl Mars', author: 'Kim Stanley Robinson', publisher: 'İthaki Yayınları' },
      { title: 'Yeşil Mars', author: 'Kim Stanley Robinson', publisher: 'İthaki Yayınları' },
      { title: 'Mavi Mars', author: 'Kim Stanley Robinson', publisher: 'İthaki Yayınları' },
      { title: 'Otomatik Portakal', author: 'Anthony Burgess', publisher: 'İş Bankası Kültür' },
      { title: 'Yıkıma Giden Yol', author: 'Alfred Bester', publisher: 'İthaki Yayınları' },
      { title: 'Yerçekimi Gökkuşağı', author: 'Thomas Pynchon', publisher: 'Ayrıntı Yayınları' },
      { title: 'Snow Crash (Kar Fırtınası)', author: 'Neal Stephenson', publisher: 'İthaki Yayınları' },
      { title: 'Gece Yarısı Kütüphanesi', author: 'Matt Haig', publisher: 'Domingo Yayınevi' },
      { title: 'Karadelik Yolcuları', author: 'Stephen Hawking', publisher: 'Alfa Yayınları' },
      { title: 'Yıldızlar Arası Seyahat', author: 'Kip Thorne', publisher: 'Alfa Yayınları' },
      { title: 'Kuantum Geçidi', author: 'John Gribbin', publisher: 'Alfa Yayınları' },
      { title: 'Galaktik İmparatorluk', author: 'Isaac Asimov', publisher: 'İthaki Yayınları' },
      { title: 'Siber Çılgınlık', author: 'Neal Stephenson', publisher: 'İthaki Yayınları' },
      { title: 'Robot Rüyaları', author: 'Isaac Asimov', publisher: 'İthaki Yayınları' },
      { title: 'Kıyamet Kitabı', author: 'Connie Willis', publisher: 'İthaki Yayınları' },
      { title: 'Yeryüzünden Ay\'a', author: 'Jules Verne', publisher: 'İş Bankası Kültür' },
      { title: 'Denizler Altında 20.000 Fersah', author: 'Jules Verne', publisher: 'İş Bankası Kültür' },
      { title: 'Dünyalar Savaşı', author: 'H. G. Wells', publisher: 'İş Bankası Kültür' },
      { title: 'Görünmez Adam', author: 'H. G. Wells', publisher: 'İş Bankası Kültür' },
      { title: 'Dr. Moreau\'nun Adası', author: 'H. G. Wells', publisher: 'İş Bankası Kültür' },
      { title: 'Android İsyanı ve Siber Etik', author: 'Stanisław Lem', publisher: 'İthaki Yayınları' },
      { title: 'Karanlık Orman', author: 'Cixin Liu', publisher: 'İthaki Yayınları' },
      { title: 'Ölümün Sonu', author: 'Cixin Liu', publisher: 'İthaki Yayınları' },
      { title: 'Kayıp Dünya', author: 'Arthur Conan Doyle', publisher: 'İş Bankası Kültür' },
      { title: 'Aklın Sınırları SciFi', author: 'Ted Chiang', publisher: 'BK Yayıncılık' }
    ],
    'Ekonomi': [
      { title: 'Zengin Baba Yoksul Baba', author: 'Robert Kiyosaki', publisher: 'Alfa Yayınları' },
      { title: 'Ulusların Zenginliği', author: 'Adam Smith', publisher: 'İş Bankası Kültür Yayınları' },
      { title: '21. Yüzyılda Kapital', author: 'Thomas Piketty', publisher: 'İş Bankası Kültür Yayınları' },
      { title: 'Akıllı Yatırımcı', author: 'Benjamin Graham', publisher: 'Scala Yayıncılık' },
      { title: 'Davranışsal İktisat', author: 'Richard H. Thaler', publisher: 'Pegasus Yayınları' },
      { title: 'Mikroiktisat 101', author: 'Hal R. Varian', publisher: 'Akademisyen Kitabevi' },
      { title: 'Makroiktisat Esasları', author: 'N. Gregory Mankiw', publisher: 'Palme Yayıncılık' },
      { title: 'Paranın Seyir Defteri', author: 'Mahfi Eğilmez', publisher: 'Remzi Kitabevi' },
      { title: 'Ekonomide Mantık', author: 'Mahfi Eğilmez', publisher: 'Remzi Kitabevi' },
      { title: 'Finansal Özgürlük Rehberi', author: 'Burak Arzova', publisher: 'Kronik Kitap' },
      { title: 'Kapital (Cilt 1: Kapitalin Üretim Süreci)', author: 'Karl Marx', publisher: 'Sol Yayınları' },
      { title: 'Genel Teori: İstihdam Faiz ve Para', author: 'John Maynard Keynes', publisher: 'Kabalcı Yayınları' },
      { title: 'İktisadın İlkeleri', author: 'Alfred Marshall', publisher: 'İletişim Yayınları' },
      { title: 'Serbest Piyasalar ve Özgürlük', author: 'Milton Friedman', publisher: 'Plato Yayınları' },
      { title: 'Uluslararası Finans Mimarisi', author: 'Prof. Dr. Nurhan Yentürk', publisher: 'İstanbul Bilgi Üniversitesi' },
      { title: 'Para ve Bankacılık', author: 'Prof. Dr. İlker Parasız', publisher: 'Ezgi Kitabevi' },
      { title: 'Oyunlar Teorisi ve İktisadi Davranış', author: 'John von Neumann & Oskar Morgenstern', publisher: 'Palme' },
      { title: 'Kalkınma İktisadı Dersleri', author: 'Prof. Dr. Yakup Kepenek', publisher: 'Imge Kitabevi' },
      { title: 'Türkiye Ekonomisi: 1908-2024', author: 'Prof. Dr. Korkut Boratav', publisher: 'Yordam Kitap' },
      { title: 'Enflasyon ve Para Politikası Esasları', author: 'Gazi Erçel', publisher: 'Scala Yayıncılık' },
      { title: 'Borsa ve Hisse Senedi Analizi', author: 'Yaşar Erdinç', publisher: 'Scala Yayıncılık' },
      { title: 'Portföy Yönetimi ve Yatırım Stratejileri', author: 'Prof. Dr. Niyazi Berk', publisher: 'Türkmen Kitabevi' },
      { title: 'Risk Yönetimi ve Sigortacılık', author: 'Prof. Dr. Erem Erbatur', publisher: 'Beta Yayınları' },
      { title: 'Kripto Para ve Blokzincir Ekonomisi', author: 'İsmail Hakkı Polat', publisher: 'Kronik Kitap' },
      { title: 'Ekonometriye Giriş Dersleri', author: 'Damodar N. Gujarati', publisher: 'Literatür Yayıncılık' },
      { title: 'Zaman Serileri Analizi ve Ekonometri', author: 'Prof. Dr. Celal Erdem', publisher: 'Nobel Akademik' },
      { title: 'Kamu Maliyesi ve Bütçe Teorisi', author: 'Prof. Dr. Salih Turhan', publisher: 'Filiz Kitabevi' },
      { title: 'Uluslararası Ticaret Teorisi ve Politikası', author: 'Prof. Dr. Halil Seyidoğlu', publisher: 'Güzem Can Yayınları' },
      { title: 'Girişimcilik ve İnovasyon Ekonomisi', author: 'Prof. Dr. Ercan Gegez', publisher: 'Beta Yayınları' },
      { title: 'Dijital Ekonomi ve E-Ticaret Yönetimi', author: 'Doç. Dr. Uğur Yozgat', publisher: 'Nobel Akademik' },
      { title: 'Davranışsal Finans ve Yatırımcı Psikolojisi', author: 'Prof. Dr. Cevat Sarıkamış', publisher: 'Scala Yayıncılık' },
      { title: 'Merkez Bankacılığı ve Döviz Kurları', author: 'Hakan Kara', publisher: 'Remzi Kitabevi' },
      { title: 'Gayrimenkul Yatırımı ve Finansı', author: 'Prof. Dr. Ali Hepşen', publisher: 'Scala Yayıncılık' },
      { title: 'Temel Analiz ve Şirket Değerleme', author: 'Bora Talu', publisher: 'Scala Yayıncılık' },
      { title: 'Teknik Analiz El Kitabı', author: 'Ali Perşembe', publisher: 'Scala Yayıncılık' },
      { title: 'Vadeli İşlemler ve Opsiyon Piyasası', author: 'John C. Hull', publisher: 'Literatür Yayıncılık' },
      { title: 'Küresel Krizler ve Ekonomi Tarihi', author: 'Niall Ferguson', publisher: 'Yapı Kredi Yayınları' },
      { title: 'Çin Ekonomisinin Yükselişi ve Dünya', author: 'Joseph E. Stiglitz', publisher: 'İletişim Yayınları' },
      { title: 'Yeşil Ekonomi ve Sürdürülebilirlik', author: 'Nicholas Stern', publisher: 'Kolektif Kitap' },
      { title: 'Vergi Hukuku ve Maliye Politikası', author: 'Prof. Dr. Mualla Öncel', publisher: 'Ankara Üniversitesi' },
      { title: 'Mikrofinans ve Yoksullukla Mücadele', author: 'Muhammad Yunus', publisher: 'Doğan Kitap' },
      { title: 'Şirketler Finansı Esasları', author: 'Stephen A. Ross', publisher: 'Nobel Akademik' },
      { title: 'Finansal Muhasebe İlkeleri', author: 'Prof. Dr. Orhan Sevilengül', publisher: 'Gazi Kitabevi' },
      { title: 'Mali Tablolar Analizi ve Denetim', author: 'Prof. Dr. Nalan Akdoğan', publisher: 'Gazi Kitabevi' },
      { title: 'Yönetim Muhasebesi Dersleri', author: 'Prof. Dr. Vasfi Haftacı', publisher: 'Umut Yayınları' },
      { title: 'Birleşme ve Satın Almalar (M&A)', author: 'Prof. Dr. Ceyhan Aldemir', publisher: 'Scala Yayıncılık' },
      { title: 'Venture Capital ve Start-up Finansı', author: 'Cem Sertoğlu', publisher: 'Kronik Kitap' },
      { title: 'Türev Araçlar Piyasası ve Risk', author: 'Prof. Dr. Serhat Yanık', publisher: 'Seçkin Yayıncılık' },
      { title: 'Para Arzı ve Kredi Mekanizması', author: 'Prof. Dr. Fatih Özatay', publisher: 'Epsilon Yayınevi' },
      { title: 'Makro Finansal İstikrar ve Denetim', author: 'Rüşdü Saracoğlu', publisher: 'Scala Yayıncılık' },
      { title: 'İktisadi Düşünceler Tarihi', author: 'Prof. Dr. Gülten Kazgan', publisher: 'Remzi Kitabevi' },
      { title: 'Küreselleşme ve Gelişmekte Olan Ülkeler', author: 'Dani Rodrik', publisher: 'İletişim Yayınları' },
      { title: 'İnovasyon ve Rekabet Stratejileri', author: 'Michael E. Porter', publisher: 'Profil Kitap' },
      { title: 'Birikim ve Yatırım Yönetimi', author: 'Peter L. Bernstein', publisher: 'Scala Yayıncılık' },
      { title: 'Bütçe Yönetimi ve Denetim Esasları', author: 'Prof. Dr. Nihat Falay', publisher: 'Beta Yayınları' },
      { title: 'Lojistik Ekonomisi ve Tedarik Zinciri', author: 'Prof. Dr. Mehmet Tanyaş', publisher: 'Nobel Akademik' }
    ],
    'Psikoloji': [
      { title: 'İnsanın Anlam Arayışı', author: 'Viktor E. Frankl', publisher: 'Okuyan Us Yayınları' },
      { title: 'Hızlı ve Yavaş Düşünme', author: 'Daniel Kahneman', publisher: 'Varlık Yayınları' },
      { title: 'Bilinçaltının Gücü', author: 'Joseph Murphy', publisher: 'Koridor Yayıncılık' },
      { title: 'Duygusal Zeka', author: 'Daniel Goleman', publisher: 'Varlık Yayınları' },
      { title: 'Psikanalize Giriş', author: 'Sigmund Freud', publisher: 'Öteki Yayınevi' },
      { title: 'İnsan Olmak', author: 'Engin Geçtan', publisher: 'Metis Yayınları' },
      { title: 'Kendiyle Dost Olmak', author: 'Wilhelm Schmid', publisher: 'İletişim Yayınları' },
      { title: 'Gelişim Psikolojisi', author: 'Prof. Dr. Bekir Onur', publisher: 'Imge Kitabevi' },
      { title: 'Bilişsel Davranışçı Terapi', author: 'Judith S. Beck', publisher: 'Nobel Akademik Yayıncılık' },
      { title: 'Sosyal Psikoloji', author: 'Elliot Aronson', publisher: 'Kaknüs Yayınları' },
      { title: 'Klinik Psikolojiye Giriş', author: 'Prof. Dr. İhsan Dağ', publisher: 'Nobel Akademik' },
      { title: 'Kişilik Kuramları ve Dinamikleri', author: 'Prof. Dr. Jerry M. Burger', publisher: 'Kaknüs Yayınları' },
      { title: 'Öfke Kontrolü ve Stres Yönetimi', author: 'Prof. Dr. Acar Baltaş', publisher: 'Remzi Kitabevi' },
      { title: 'Travma ve İyileşme', author: 'Judith Herman', publisher: 'Literatür Yayıncılık' },
      { title: 'Bağlanma Kuramı ve İlişkiler Psikolojisi', author: 'John Bowlby', publisher: 'İletişim Yayınları' },
      { title: 'Pozitif Psikoloji ve Mutluluk Bilimi', author: 'Martin Seligman', publisher: 'HYB Yayıncılık' },
      { title: 'Nöropsikoloji Esasları', author: 'Prof. Dr. Sirel Karakaş', publisher: 'Noble Akademik' },
      { title: 'Çocuk Psikolojisi ve Ergenlik Dönemi', author: 'Prof. Dr. Haluk Yavuzer', publisher: 'Remzi Kitabevi' },
      { title: 'Anksiyete ve Depresyon Tedavisi', author: 'Aaron T. Beck', publisher: 'Litera Yayıncılık' },
      { title: 'Narsisizm ve Kişilik Bozuklukları', author: 'Prof. Dr. Vamık Volkan', publisher: 'Pusula Yayıncılık' },
      { title: 'Şema Terapi Rehberi', author: 'Jeffrey E. Young', publisher: 'Litera Yayıncılık' },
      { title: 'Kabul ve Kararlılık Terapisi (ACT)', author: 'Steven C. Hayes', publisher: 'Litera Yayıncılık' },
      { title: 'Akılcı Duygusal Davranışçı Terapi', author: 'Albert Ellis', publisher: 'HYB Yayıncılık' },
      { title: 'Odaklanma Sanatı (Focusing)', author: 'Eugene T. Gendlin', publisher: 'Aura Yayınları' },
      { title: 'Beden Kayıt Tutar (The Body Keeps the Score)', author: 'Bessel van der Kolk', publisher: 'Nobel Yaşam' },
      { title: 'Sevme Sanatı', author: 'Erich Fromm', publisher: 'Payel Yayınları' },
      { title: 'Akış (Flow): Optimum Deneyim Psikolojisi', author: 'Mihaly Csikszentmihalyi', publisher: 'HYB Yayıncılık' },
      { title: 'Sosyal Anksiyete ve Özgüven Gelişimi', author: 'Dr. Thomas A. Richards', publisher: 'Remzi Kitabevi' },
      { title: 'Yas ve Kayıp Psikolojisi', author: 'J. William Worden', publisher: 'Nobel Akademik' },
      { title: 'Rüya Analizi ve Bilinçdışı', author: 'Carl Gustav Jung', publisher: 'Payel Yayınları' },
      { title: 'Psikopatoloji Ders Kitabı', author: 'Prof. Dr. Orhan Öztürk', publisher: 'Pelikan Yayıncılık' },
      { title: 'Adli Psikoloji ve Suçlu Profili', author: 'Prof. Dr. Hamdi Tutkun', publisher: 'Seçkin Yayıncılık' },
      { title: 'Endüstri ve Örgüt Psikolojisi', author: 'Prof. Dr. Canan Ergin', publisher: 'Nobel Akademik' },
      { title: 'Grup Psikoterapisi İlkeleri', author: 'Irvin D. Yalom', publisher: 'Kabalcı Yayınları' },
      { title: 'Çift ve Aile Terapisi', author: 'Prof. Dr. Hürol Fışıloğlu', publisher: 'İmge Kitabevi' },
      { title: 'Şiddet ve Saldırganlık Psikolojisi', author: 'Albert Bandura', publisher: 'İletişim Yayınları' },
      { title: 'Algı ve Dikkat Psikolojisi Dersleri', author: 'Prof. Dr. Erol Başar', publisher: 'Nobel Akademik' },
      { title: 'Öğrenme ve Bellek Psikolojisi', author: 'Prof. Dr. Nurhan Erden', publisher: 'Alkım Yayınları' },
      { title: 'Güdülenme ve İrade Psikolojisi', author: 'Prof. Dr. Doğan Cüceloğlu', publisher: 'Remzi Kitabevi' },
      { title: 'Benlik Psikolojisi ve Özsaygı', author: 'Prof. Dr. Üstün Dökmen', publisher: 'Remzi Kitabevi' },
      { title: 'Varoluşçu Psikoterapi', author: 'Irvin D. Yalom', publisher: 'Pegasus Yayınları' },
      { title: 'Hümanist Psikoloji Esasları', author: 'Abraham Maslow', publisher: 'Kuraldışı Yayınları' },
      { title: 'Transaksiyonel Analiz (TA)', author: 'Eric Berne', publisher: 'Okuyan Us Yayınları' },
      { title: 'Sanatla Terapi ve Yaratıcılık', author: 'Prof. Dr. Nevin Eracar', publisher: 'Nobel Akademik' },
      { title: 'Müzik ile Terapi ve Klinik Uygulamalar', author: 'Prof. Dr. Ahmet Şahin', publisher: 'Dost Kitabevi' },
      { title: 'Psikiyatrik Görüşme İlkeleri', author: 'Prof. Dr. Şahap Erkoç', publisher: 'Güneş Tıp Kitabevleri' },
      { title: 'Şizofreni ve Spektrum Bozuklukları', author: 'Prof. Dr. Alp Üçok', publisher: 'Pusula Yayıncılık' },
      { title: 'Bipolar Bozukluk Hasta ve Yakını Rehberi', author: 'Prof. Dr. Raşit Tükel', publisher: 'Remzi Kitabevi' },
      { title: 'Yeme Bozuklukları Psikolojisi', author: 'Prof. Dr. Başak Yücel', publisher: 'Nobel Akademik' },
      { title: 'Bağımlılık Psikolojisi ve Tedavisi', author: 'Prof. Dr. Kültegin Ögel', publisher: 'İletişim Yayınları' },
      { title: 'Dikkat Eksikliği ve Hiperaktivite (DEHB)', author: 'Prof. Dr. Eyüp Sabri Ercan', publisher: 'Doğan Kitabevi' },
      { title: 'Yaşlılık ve Geriatrik Psikoloji', author: 'Prof. Dr. İsmail Tufan', publisher: 'Nobel Akademik' },
      { title: 'İletişim Psikolojisi ve Sözsüz İletişim', author: 'Prof. Dr. Doğan Cüceloğlu', publisher: 'Remzi Kitabevi' },
      { title: 'İkna ve Algı Yönetimi Psikolojisi', author: 'Robert Cialdini', publisher: 'MediaCat Yayınları' },
      { title: 'Psikolojik Dayanıklılık (Resilience)', author: 'Prof. Dr. Ziya Selçuk', publisher: 'Kronik Kitap' },
      { title: 'Varoluşsal Kaygı ve Ölüm Psikolojisi', author: 'Irvin D. Yalom', publisher: 'Pegasus Yayınları' }
    ],
    'Hukuk': [
      { title: 'Anayasa Hukuku Esasları', author: 'Prof. Dr. Kemal Gözler', publisher: 'Ekin Yayınevi' },
      { title: 'Medeni Hukuk Başlangıç Hükümleri', author: 'Prof. Dr. M. Kemal Oğuzman', publisher: 'Filiz Kitabevi' },
      { title: 'Ceza Hukuku Genel Hükümler', author: 'Prof. Dr. İzzet Özgenç', publisher: 'Seçkin Yayıncılık' },
      { title: 'İdare Hukuku Dersleri', author: 'Prof. Dr. Kemal Gözler', publisher: 'Ekin Yayınevi' },
      { title: 'Borçlar Hukuku Genel Hükümler', author: 'Prof. Dr. Fikret Eren', publisher: 'Yetkin Yayınları' },
      { title: 'İnsan Hakları Hukuku', author: 'Prof. Dr. Rona Aybay', publisher: 'İstanbul Bilgi Üniversitesi Yayınları' },
      { title: 'Türk Yargı Teşkilatı ve Hukuk Mantığı', author: 'Doç. Dr. Sami Selçuk', publisher: 'Seçkin Yayıncılık' },
      { title: 'Ticaret Hukuku Prensipleri', author: 'Prof. Dr. Okyay Evrim', publisher: 'Batider Yayınları' },
      { title: 'Şirketler Hukuku Dersleri', author: 'Prof. Dr. Hasan Pulaşlı', publisher: 'Adalet Yayınevi' },
      { title: 'Kıymetli Evrak Hukuku', author: 'Prof. Dr. Fırat Öztan', publisher: 'Turhan Kitabevi' },
      { title: 'İcra ve İflas Hukuku Esasları', author: 'Prof. Dr. Baki Kuru', publisher: 'Yetkin Yayınları' },
      { title: 'Ceza Muhakemesi Hukuku', author: 'Prof. Dr. Ersan Şen', publisher: 'Seçkin Yayıncılık' },
      { title: 'Hukuk Muhakemeleri Kanunu Şerhi', author: 'Prof. Dr. Hakan Pekcanıtez', publisher: 'On İki Levha Yayıncılık' },
      { title: 'İş ve Sosyal Güvenlik Hukuku', author: 'Prof. Dr. Nuri Çelik', publisher: 'Beta Yayınları' },
      { title: 'Roma Hukuku Dersleri', author: 'Prof. Dr. Bülent Tahiroğlu', publisher: 'Der Yayınları' },
      { title: 'Devletler Umumi Hukuku (Uluslararası Hukuk)', author: 'Prof. Dr. Hüseyin Pazarcı', publisher: 'Turhan Kitabevi' },
      { title: 'Devletler Hususi Hukuku', author: 'Prof. Dr. Ergin Nomer', publisher: 'Beta Yayınları' },
      { title: 'Fikri Mülkiyet Hukuku', author: 'Prof. Dr. Cahit Suluk', publisher: 'Seçkin Yayıncılık' },
      { title: 'Telif Hakları ve Marka Hukuku', author: 'Prof. Dr. Sami Karahan', publisher: 'Mimoza Yayınları' },
      { title: 'Gayrimenkul ve Tapu Hukuku', author: 'Prof. Dr. Lale Sirmen', publisher: 'Yetkin Yayınları' },
      { title: 'Miras Hukuku Esasları', author: 'Prof. Dr. Mustafa Dural', publisher: 'Filiz Kitabevi' },
      { title: 'Eşya Hukuku Dersleri', author: 'Prof. Dr. Jale G. Akipek', publisher: 'Seçkin Yayıncılık' },
      { title: 'Vergi Hukuku ve Yargılaması', author: 'Prof. Dr. Mualla Öncel', publisher: 'Ankara Üniversitesi' },
      { title: 'İdari Yargılama Hukuku', author: 'Prof. Dr. A. Sharaf Gözübüyük', publisher: 'Turhan Kitabevi' },
      { title: 'Anayasa Mahkemesi Bireysel Başvuru Rehberi', author: 'Prof. Dr. Tolga Şirin', publisher: 'On İki Levha' },
      { title: 'Avrupa İnsan Hakları Mahkemesi Kararları Şerhi', author: 'Prof. Dr. Rıza Türmen', publisher: 'İletişim Yayınları' },
      { title: 'Tüketici Hukuku Esasları', author: 'Prof. Dr. Aydın Zevkliler', publisher: 'Seçkin Yayıncılık' },
      { title: 'Rekabet Hukuku Dersleri', author: 'Prof. Dr. İ. Yılmaz Aslan', publisher: 'Ekin Yayınevi' },
      { title: 'Banka ve Finans Hukuku', author: 'Prof. Dr. Reha Poroy', publisher: 'Vedat Kitapçılık' },
      { title: 'Deniz Ticareti Hukuku', author: 'Prof. Dr. Rayegân Kender', publisher: 'On İki Levha' },
      { title: 'Sigorta Hukuku Prensipleri', author: 'Prof. Dr. Samim Ünan', publisher: 'On İki Levha' },
      { title: 'Sağlık ve Tıp Hukuku', author: 'Prof. Dr. Hakan Hakeri', publisher: 'Seçkin Yayıncılık' },
      { title: 'Bilişim ve Kişisel Veriler Hukuku (KVKK)', author: 'Prof. Dr. Leyla Keser', publisher: 'On İki Levha' },
      { title: 'Çevre Hukuku Dersleri', author: 'Prof. Dr. Nükhet Turgut', publisher: 'Imge Kitabevi' },
      { title: 'Enerji Hukuku Esasları', author: 'Doç. Dr. Murat İnceoğlu', publisher: 'On İki Levha' },
      { title: 'Sözleşmeler Hukuku ve Yapılandırılması', author: 'Prof. Dr. Veysel Başpınar', publisher: 'Yetkin Yayınları' },
      { title: 'Tahkim ve Alternatif Uyuşmazlık Çözümleri', author: 'Prof. Dr. Ziya Akıncı', publisher: 'Vedat Kitapçılık' },
      { title: 'Adli Tıp ve Kriminalistik', author: 'Prof. Dr. Hamit Hancı', publisher: 'Seçkin Yayıncılık' },
      { title: 'Hukuk Felsefesi ve Sosyolojisi', author: 'Prof. Dr. Adnan Güriz', publisher: 'Siyasal Kitabevi' },
      { title: 'Türk Hukuk Tarihi Dersleri', author: 'Prof. Dr. M. Akif Aydın', publisher: 'İsar Yayınları' },
      { title: 'Roma Borçlar Hukuku', author: 'Prof. Dr. Belgin Erdoğmuş', publisher: 'Der Yayınları' },
      { title: 'Ceza Hukuku Özel Hükümler', author: 'Prof. Dr. Durmuş Tezcan', publisher: 'Seçkin Yayıncılık' },
      { title: 'Tazminat Hukuku Esasları', author: 'Prof. Dr. Fikret Eren', publisher: 'Yetkin Yayınları' },
      { title: 'Kat Mülkiyeti Hukuku', author: 'Prof. Dr. Şeref Ertaş', publisher: 'Barış Yayınları' },
      { title: 'Aile Hukuku ve Boşanma Davaları', author: 'Prof. Dr. Ömer Cortu', publisher: 'Filiz Kitabevi' },
      { title: 'İhale ve Kamu İhale Hukuku', author: 'Prof. Dr. Ender Ethem Atay', publisher: 'Gazi Kitabevi' },
      { title: 'Trafik ve Sigorta Tazminatları', author: 'Çelik Ahmet Çelik', publisher: 'Seçkin Yayıncılık' },
      { title: 'Uluslararası Ceza Hukuku', author: 'Prof. Dr. Feridun Yenisey', publisher: 'Beta Yayınları' },
      { title: 'Deniz Hukuku ve Boğazlar Rejimi', author: 'Prof. Dr. Sevin Toluner', publisher: 'Beta Yayınları' },
      { title: 'Hava ve Uzay Hukuku Esasları', author: 'Prof. Dr. Mesut Hakkı Caşın', publisher: 'Nobel Akademik' },
      { title: 'Uluslararası Ticari Tahkim Kararları', author: 'Prof. Dr. Cemal Şanlı', publisher: 'Vedat Kitapçılık' },
      { title: 'Gümrük Hukuku Dersleri', author: 'Prof. Dr. Doğan Şenyüz', publisher: 'Ekin Yayınevi' },
      { title: 'Kamulaştırma Hukuku ve Davaları', author: 'Ali Arcak', publisher: 'Yetkin Yayınları' },
      { title: 'Avukatlık Hukuku ve Meslek Kuralları', author: 'Prof. Dr. Semih Güner', publisher: 'Seçkin Yayıncılık' },
      { title: 'Noterlik Hukuku ve Uygulamaları', author: 'Prof. Dr. Cevdet Yavuz', publisher: 'Filiz Kitabevi' },
      { title: 'Siyasi Partiler ve Seçim Hukuku', author: 'Prof. Dr. Ergun Özbudun', publisher: 'Yetkin Yayınları' }
    ],
    'Mühendislik': [
      { title: 'Makine Elemanları ve Tasarımı', author: 'Prof. Dr. Mustafa Akkurt', publisher: 'Birsen Yayınevi' },
      { title: 'Elektrik Devreleri', author: 'James W. Nilsson, Susan Riedel', publisher: 'Palme Yayıncılık' },
      { title: 'İnşaat Statik ve Mukavemet', author: 'Prof. Dr. Mehmet H. Omurtag', publisher: 'Birsen Yayınevi' },
      { title: 'Termodinamik Mühendislik Yaklaşımıyla', author: 'Yunus A. Çengel, Michael A. Boles', publisher: 'Palme Yayıncılık' },
      { title: 'Akışkanlar Mekaniği Esasları', author: 'Yunus A. Çengel, John M. Cimbala', publisher: 'Palme Yayıncılık' },
      { title: 'Mühendislik Kimyası', author: 'Prof. Dr. Raymond Chang', publisher: 'Palme Yayıncılık' },
      { title: 'Sistem Dinamiği ve Kontrol', author: 'Katsuhiko Ogata', publisher: 'Nobel Akademik Yayıncılık' },
      { title: 'Malzeme Bilimi ve Mühendisliği', author: 'William D. Callister', publisher: 'Nobel Akademik Yayıncılık' },
      { title: 'Betonarme Yapıların Tasarımı', author: 'Prof. Dr. Zekai Celep', publisher: 'Beta Yayınları' },
      { title: 'Isı Transferi Prensipleri', author: 'Frank P. Incropera', publisher: 'Palme Yayıncılık' },
      { title: 'Elektromanyetik Dalgalar ve Alanlar', author: 'David K. Cheng', publisher: 'Palme Yayıncılık' },
      { title: 'Sinyaller ve Sistemler', author: 'Alan V. Oppenheim', publisher: 'Palme Yayıncılık' },
      { title: 'Dijital Sinyal İşleme (DSP)', author: 'John G. Proakis', publisher: 'Palme Yayıncılık' },
      { title: 'Otomatik Kontrol Sistemleri', author: 'Benjamin C. Kuo', publisher: 'Literatür Yayıncılık' },
      { title: 'Güç Elektroniği ve Sürücüler', author: 'Muhammad H. Rashid', publisher: 'Palme Yayıncılık' },
      { title: 'Elektrik Makineleri ve Transformatörler', author: 'Stephen J. Chapman', publisher: 'Palme Yayıncılık' },
      { title: 'Zemin Mekaniği ve Temel Mühendisliği', author: 'Prof. Dr. Vahit Kumbasar', publisher: 'Birsen Yayınevi' },
      { title: 'Yapı Statiği ve Dinamiği', author: 'Prof. Dr. Adnan Çakıroğlu', publisher: 'Birsen Yayınevi' },
      { title: 'Çelik Yapılar Tasarımı', author: 'Prof. Dr. Hilmi Deren', publisher: 'Birsen Yayınevi' },
      { title: 'Hidrolik ve Su Kaynakları Mühendisliği', author: 'Prof. Dr. Necati Ağıralioğlu', publisher: 'Beta Yayınları' },
      { title: 'Ulaştırma ve Karayolu Mühendisliği', author: 'Prof. Dr. Nadir Yayla', publisher: 'Birsen Yayınevi' },
      { title: 'Üretim Yöntemleri ve İmalat Teknolojisi', author: 'Prof. Dr. Serope Kalpakjian', publisher: 'Palme Yayıncılık' },
      { title: 'CAD/CAM ile Bilgisayar Destekli Tasarım', author: 'Prof. Dr. İbrahim Zelkan', publisher: 'Birsen Yayınevi' },
      { title: 'Sonlu Elemanlar Yöntemi (FEM)', author: 'Prof. Dr. Mehmet Zülfü Aşık', publisher: 'Birsen Yayınevi' },
      { title: 'Robotik ve Endüstriyel Otomasyon', author: 'Prof. Dr. Metin Gökaşan', publisher: 'Nobel Akademik' },
      { title: 'Yapay Zeka Mühendisliği ve Veri Analitiği', author: 'Prof. Dr. Ercan Öztemel', publisher: 'Pusula Yayıncılık' },
      { title: 'Endüstriyel Yöneylem Araştırması', author: 'Hamdy A. Taha', publisher: 'Palme Yayıncılık' },
      { title: 'Kalite Kontrol ve Toplam Kalite Yönetimi', author: 'Prof. Dr. Muhittin Şimşek', publisher: 'Alpha Yayınları' },
      { title: 'Tedarik Zinciri ve Lojistik Mühendisliği', author: 'Prof. Dr. Mehmet Tanyaş', publisher: 'Nobel Akademik' },
      { title: 'Ergonomi ve İş Güvenliği Mühendisliği', author: 'Prof. Dr. Ahmet Fahri Özok', publisher: 'Birsen Yayınevi' },
      { title: 'Kimya Mühendisliğinde Kütle Transferi', author: 'Robert E. Treybal', publisher: 'Palme Yayıncılık' },
      { title: 'Reaksiyon Mühendisliği ve Reaktör Tasarımı', author: 'Octave Levenspiel', publisher: 'Palme Yayıncılık' },
      { title: 'Kimyasal Proses Kontrolü Esasları', author: 'George Stephanopoulos', publisher: 'Palme Yayıncılık' },
      { title: 'Biyomedikal Mühendisliği ve Tıbbi Cihazlar', author: 'Prof. Dr. Joseph D. Bronzino', publisher: 'Nobel Akademik' },
      { title: 'Biyomalzemeler ve Doku Mühendisliği', author: 'Prof. Dr. Erhan Pişkin', publisher: 'Boğaziçi Üniversitesi' },
      { title: 'Havacılık ve Uzay Mühendisliğine Giriş', author: 'John D. Anderson', publisher: 'Palme Yayıncılık' },
      { title: 'Aerodinamik ve Uçuş Mekaniği', author: 'John D. Anderson', publisher: 'Palme Yayıncılık' },
      { title: 'Roket Propülsiyonu ve Jet Motorları', author: 'George P. Sutton', publisher: 'Palme Yayıncılık' },
      { title: 'Otomotiv Mühendisliği ve Taşıt Dinamiği', author: 'Prof. Dr. Mustafa Tırıs', publisher: 'Birsen Yayınevi' },
      { title: 'İçten Yanmalı Motorlar Mimarisi', author: 'Prof. Dr. Hüseyin Rıdvan Yamankaradeniz', publisher: 'Birsen' },
      { title: 'Maden Mühendisliği ve Cevher Hazırlama', author: 'Prof. Dr. Güven Önal', publisher: 'Birsen Yayınevi' },
      { title: 'Jeoloji Mühendisliği ve Saha İncelemesi', author: 'Prof. Dr. Reşat Ulusay', publisher: 'TMMOB Yayınları' },
      { title: 'Harita ve Geomatik Mühendisliği Esasları', author: 'Prof. Dr. Muzaffer Kahveci', publisher: 'Nobel Akademik' },
      { title: 'Çevre Mühendisliği ve Su Arıtma Teknolojileri', author: 'Prof. Dr. Derin Orhon', publisher: 'İTU Yayınları' },
      { title: 'Hava Kirliliği ve Kontrolü Teknolojileri', author: 'Prof. Dr. Selahattin Incecik', publisher: 'İTU Yayınları' },
      { title: 'Metalurji ve Malzeme Mühendisliği Dersleri', author: 'Prof. Dr. Onuralp Yücel', publisher: 'İTU Yayınları' },
      { title: 'Döküm Teknolojisi ve Kaynak Mühendisliği', author: 'Prof. Dr. Ahmet Topuz', publisher: 'Birsen Yayınevi' },
      { title: 'Nükleer Enerji Mühendisliğine Giriş', author: 'John R. Lamarsh', publisher: 'Palme Yayıncılık' },
      { title: 'Yenilenebilir Enerji Sistemleri ve Tasarımı', author: 'Prof. Dr. Tanay Sıdkı Uyar', publisher: 'Nobel Akademik' },
      { title: 'Güneş ve Rüzgar Enerjisi Teknolojileri', author: 'Prof. Dr. Mustafa Özcan', publisher: 'Birsen Yayınevi' },
      { title: 'Nanoteknoloji ve Malzeme Tasarımı', author: 'Prof. Dr. Ekmel Özbay', publisher: 'Bilkent Üniversitesi' },
      { title: 'Mekatronik Mühendisliğine Giriş', author: 'David G. Alciatore', publisher: 'Palme Yayıncılık' },
      { title: 'Sensörler ve Transdüserler El Kitabı', author: 'Prof. Dr. Yılmaz Özkale', publisher: 'Kodlab' },
      { title: 'Gömülü Sistemler Tasarımı (Embedded Systems)', author: 'Prof. Dr. Şahin Albayrak', publisher: 'Abacus' },
      { title: 'Mikrodenetleyiciler ve PLC Programlama', author: 'İsmail Coşkun', publisher: 'Kodlab' },
      { title: 'Akıllı Şebekeler ve Güç Sistemleri', author: 'Prof. Dr. Celal Kocatepe', publisher: 'Birsen Yayınevi' }
    ]
  };

  const PDF_URLS = [
    'https://www.ktb.gov.tr/Eklenti/33130,nutukpdf.pdf',
    'https://www.gutenberg.org/files/1497/1497-pdf.pdf',
    'https://www.orwellfoundation.com/wp-content/uploads/2010/12/NINETEEN-EIGHTY-FOUR.pdf',
    'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
    'https://pdfobject.com/pdf/sample.pdf',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://ia800501.us.archive.org/24/items/DuneFrankHerbert_201609/Dune_Frank_Herbert.pdf',
    'https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf'
  ];

  const categoriesList = Object.keys(RAW_BOOK_DATA);
  const booksToCreate = [];
  const seenTitles = new Set<string>();

  let bookCounter = 0;
  let attemptIndex = 0;

  // STRICT 500 DISTINCT BOOKS CREATION LOOP (ZERO DUPLICATES)
  while (booksToCreate.length < 500 && attemptIndex < 2000) {
    attemptIndex++;
    const category = categoriesList[(attemptIndex - 1) % categoriesList.length];
    const categoryPool = RAW_BOOK_DATA[category];
    const baseBook = categoryPool[(attemptIndex - 1) % categoryPool.length];

    const title = baseBook.title;

    // Strict Deduplication Check: If title already exists in Set, skip!
    if (seenTitles.has(title)) {
      continue;
    }

    seenTitles.add(title);
    bookCounter++;

    const author = baseBook.author;
    const publisher = baseBook.publisher;

    // Unique 13-digit ISBN per entry
    const isbn = `978-975-${(1000000 + bookCounter).toString().padStart(7, '0')}`;

    // GUARANTEED CATEGORY THEMATIC COVER IMAGE WITH CACHE-BUSTER ?id=${bookCounter}
    const coverPool = THEMATIC_COVER_POOLS[category] || THEMATIC_COVER_POOLS['Yazılım'];
    const baseCover = coverPool[(bookCounter - 1) % coverPool.length];
    const coverUrl = `${baseCover}&id=${bookCounter}`;

    const pdfUrl = title.includes('Nutuk')
      ? 'https://www.ktb.gov.tr/Eklenti/33130,nutukpdf.pdf'
      : PDF_URLS[(bookCounter - 1) % PDF_URLS.length];

    const shelfFloor = ['Z', 'K1', 'K2'][(bookCounter - 1) % 3];
    const shelfNum = ((bookCounter % 30) + 1).toString().padStart(2, '0');
    const locationShelf = `Raf ${shelfFloor}-${shelfNum}`;

    booksToCreate.push({
      title,
      isbn,
      author,
      publisher,
      category,
      totalCopies: ((bookCounter % 5) + 3),
      availableCopies: ((bookCounter % 5) + 3),
      locationShelf,
      coverUrl,
      pdfUrl,
      description: `${author} tarafından kaleme alınan, ${category} alanında kütüphanemiz envanterinde kayıtlı temel referans ve başvuru eseri.`
    });
  }

  // Clear existing records in cascade order
  await prisma.deskReservation.deleteMany({});
  await prisma.desk.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.book.deleteMany({});

  // Insert exactly 500 unique books
  await prisma.book.createMany({
    data: booksToCreate
  });

  console.log(`✅ TAM ${booksToCreate.length} Adet %100 Benzersiz ve Tekil Kitap Veritabanına Yüklendi (Sıfır Tekrar).`);

  // Create 3 Rooms and 90 Desks
  const roomsData = [
    { name: 'Zemin Kat - Genel Okuma & Danışma', capacity: 30, description: 'Sessiz çalışma ve geniş masalar.' },
    { name: '1. Kat - Sessiz Çalışma & Araştırma', capacity: 30, description: 'Bireysel odaklanma ve araştırma salonu.' },
    { name: '2. Kat - Grup Çalışma & Dijital Medya', capacity: 30, description: 'Grup çalışmaları ve bilgisayarlı alan.' }
  ];

  for (let i = 0; i < roomsData.length; i++) {
    const roomInfo = roomsData[i];
    const room = await prisma.room.create({
      data: roomInfo
    });

    for (let d = 1; d <= 30; d++) {
      const deskNumber = `Masa-${i}${d.toString().padStart(2, '0')}`;
      const xPosition = (d - 1) % 6;
      const yPosition = Math.floor((d - 1) / 6);
      await prisma.desk.create({
        data: {
          roomId: room.id,
          deskNumber,
          xPosition,
          yPosition,
          isAvailable: true,
          hasPowerOutlet: d % 2 === 0
        }
      });
    }
  }

  console.log('✅ 3 Salon ve 90 Adet Masa Oluşturuldu.');
  console.log('🎉 500 adet tekil ve benzersiz kitap veritabanına başarıyla işlendi!');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
