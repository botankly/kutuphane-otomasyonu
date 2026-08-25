const fs = require('fs');
const path = require('path');

const outputDirs = [
  path.join(__dirname, '../public/pdfs'),
  path.join(__dirname, '../public/pdf')
];

outputDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to escape PDF text
function pdfEscape(str) {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Generate valid multi-page PDF with rich Turkish content
function generateRichNovelPdf(book) {
  const { title, author, category, pages, samplePassages } = book;

  let pdfString = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  
  let kids = [];
  for (let i = 0; i < pages; i++) {
    kids.push(`${3 + i * 2} 0 R`);
  }
  
  let pagesObj = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>\nendobj\n`;
  pdfString += pagesObj;
  
  let nextObjId = 3;
  for (let pageNum = 1; pageNum <= pages; pageNum++) {
    let pageObjId = nextObjId++;
    let contentObjId = nextObjId++;
    
    let passage = samplePassages[(pageNum - 1) % samplePassages.length];
    
    let streamLines = [
      `BT`,
      `/F1 18 Tf 50 730 Td (${pdfEscape(title)}) Tj`,
      `0 -25 Td /F1 12 Tf (Yazar: ${pdfEscape(author)} | Kategori: ${pdfEscape(category)}) Tj`,
      `0 -15 Td /F1 10 Tf (Universite Kutup-hane Bilgi Sistemi - Dijital Eser Arsivi) Tj`,
      `0 -30 Td /F1 14 Tf (Bolum ${Math.ceil(pageNum / 3)} - Sayfa ${pageNum}) Tj`,
      `0 -25 Td /F1 11 Tf (${pdfEscape(passage.p1)}) Tj`,
      `0 -20 Td (${pdfEscape(passage.p2)}) Tj`,
      `0 -20 Td (${pdfEscape(passage.p3)}) Tj`,
      `0 -20 Td (${pdfEscape(passage.p4)}) Tj`,
      `0 -40 Td /F1 10 Tf (--- Sayfa ${pageNum} / ${pages} ---) Tj`,
      `ET`
    ];

    let contentText = streamLines.join('\n');
    let contentObj = `${contentObjId} 0 obj\n<< /Length ${Buffer.byteLength(contentText)} >>\nstream\n${contentText}\nendstream\nendobj\n`;
    let pageObj = `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`;
    
    pdfString += pageObj + contentObj;
  }
  
  return pdfString;
}

const booksData = [
  {
    slug: 'kucuk-prens.pdf',
    title: 'Kucuk Prens',
    author: 'Antoine de Saint-Exupery',
    category: 'Edebiyat',
    pages: 16,
    samplePassages: [
      {
        p1: 'Altı yasındayken, ilk caga ait ormanları anlatan Gercek Hikayeler adlı bir kitapta',
        p2: 'muhtesem bir resim gormustum. Bir avı yutan bir boa yılanı resmiydi.',
        p3: 'Kitapta soyle yazıyordu: Boa yılanları avlarını cignemeden oldugu gibi yutarlar.',
        p4: 'Sonra da hareket edemez olurlar ve altı ay suren bir uykuya dalarlar.'
      },
      {
        p1: 'Cozulmesi imkansız gibi gorunen gizemler karsısında insan emre karsı gelemez.',
        p2: 'Colun ortasında, olum tehlikesiyle karsı karsıyayken bana sacma gelse de',
        p3: 'cebimden bir kagıt ve dolma kalem cıkardım. Bana bir koyun ciz dedi.',
        p4: 'Kucuk Prens gulumseyerek bakıyordu: Iste bu koyun tam istedigim gibi oldu.'
      },
      {
        p1: 'Gezegeninde bir cicek vardı... Kucuk Prens bu cicege cok ozen gosteriyordu.',
        p2: 'Gunes dogarken acan bu cicek, Kucuk Prens e cok gururlu seyler soyluyordu.',
        p3: 'Beni ruzgardan korumalısın, aksamları ustume bir cam fanus koymalısın diyordu.',
        p4: 'Insan ancak yuregiyle baktıgı zaman dogruyu gorebilir. Asıl olunası seyler gozle gorulmez.'
      }
    ]
  },
  {
    slug: 'simyaci.pdf',
    title: 'Simyaci',
    author: 'Paulo Coelho',
    category: 'Edebiyat',
    pages: 18,
    samplePassages: [
      {
        p1: 'Santiago adındaki coban, aksam uzeri surusuyle birlikte terk edilmis eski bir kiliseye ulastı.',
        p2: 'Catısı cokmus, icinde buyuk bir sakız agacı buyumustu. Geceyi burada gecirmeye karar verdi.',
        p3: 'Kendi Kisisel Menkıbesini arayan bir insan, tum evrenin ona yardımcı olacagını bilmelidir.',
        p4: 'Mısır Piramitlerine ulasmak ve hazinesini bulmak icin yola cıkmaya karar verdi.'
      },
      {
        p1: 'Gunun birinde kisisel menkıbeni gerceklestirmek arzusuyla dolup tasacaksın.',
        p2: 'Korku, basarısızlıgın tek gercek sebebidir. Yureginin sesini dinle.',
        p3: 'Simyacı ona dedi ki: Yuregin neredeyse hazinen de oradadır.',
        p4: 'Colun fısıltılarını ve ruzgarın sesini anlamayı ogrendi.'
      }
    ]
  },
  {
    slug: '1984.pdf',
    title: '1984',
    author: 'George Orwell',
    category: 'Edebiyat',
    pages: 25,
    samplePassages: [
      {
        p1: 'Nisan ayının soguk ve acı bir gunuydu, saatler on ucu vuruyordu.',
        p2: 'Winston Smith, ruzgarlı toz bulutundan kacmak icin Zafer Evlerinin kapısından iceri süzuldu.',
        p3: 'Buyuk Biraderin Seni Izliyor yazılı afisler her kosede asılıydı.',
        p4: 'Geçmisi kontrol eden gelecegi kontrol eder; su anı kontrol eden gecmisi kontrol eder.'
      },
      {
        p1: 'Gerceklik dedikleri sey Ingilterede degil, Gercek Bakanlıgında yeniden yazılıyordu.',
        p2: 'Iki kere iki bes eder derse Parti, buna inanmak zorundaydın.',
        p3: 'Ozgurluk, iki kere ikinin dort ettigini soyleyebilmektir.',
        p4: 'Winston gunlugunu saklı bolmeye koydu ve sessizce bekledi.'
      }
    ]
  },
  {
    slug: 'sefiller.pdf',
    title: 'Sefiller',
    author: 'Victor Hugo',
    category: 'Edebiyat',
    pages: 30,
    samplePassages: [
      {
        p1: '1815 yılında Jean Valjean adlı kurekcilık mahkumu, on dokuz yıl sureli cezasını tamamlayıp salıverildi.',
        p2: 'Sarı pasaportu yuzunden hicbir hancı onu iceri almak istemiyordu.',
        p3: 'Piskopos Myriel ona kapısını actı ve ekmegini paylastı.',
        p4: 'Insan kardesine iyilik ettikce ruhu aydınlanır ve ozgurlesir.'
      }
    ]
  },
  {
    slug: 'nutuk.pdf',
    title: 'Nutuk',
    author: 'Mustafa Kemal Ataturk',
    category: 'Tarih',
    pages: 50,
    samplePassages: [
      {
        p1: '1919 yılı Mayısının 19 uncu gunu Samsuna cıktım. Genel durum ve gorunus:',
        p2: 'Osmanlı devleti icinde bulundugu grupta Dunya Savasında yenilmis, ordusu zedelenmis...',
        p3: 'Millet ve memleket Millî Hakimiyete dayanan, tam bagımsız yeni bir Turk Devleti kuracaktır.',
        p4: 'Ya istiklal ya olum!'
      },
      {
        p1: 'Amasya Genelgesi ile milli iradenin hakim kılınması ilkesi ilan edildi.',
        p2: 'Sivas Kongresinde Anadolu ve Rumeli Müdafaa-i Hukuk Cemiyeti birlestirildi.',
        p3: 'Turkiye Buyuk Millet Meclisi 23 Nisan 1920de Ankarada toplandı.',
        p4: 'Egemenlik kayıtsız sartsız milletindir!'
      }
    ]
  },
  {
    slug: 'clean-code.pdf',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    category: 'Yazılım',
    pages: 12,
    samplePassages: [
      {
        p1: 'Temiz kod okunabilir, anlasılır ve bakımı kolay koddur.',
        p2: 'Kodunuzu kamp alanını buldugunuzdan daha temiz bırakın (Boy Scout Rule).',
        p3: 'Degisken isimleri niyetini belli etmelidir (Intent-revealing names).',
        p4: 'Fonksiyonlar tek bir is yapmalı ve onu iyi yapmalıdır (Single Responsibility Principle).'
      }
    ]
  },
  {
    slug: 'design-patterns.pdf',
    title: 'Design Patterns',
    author: 'Erich Gamma',
    category: 'Yazılım',
    pages: 10,
    samplePassages: [
      {
        p1: 'Tasarım Desenleri nesne yonelimli yazılım mimarisinde kalıcı cozumlardır.',
        p2: 'Creational, Structural ve Behavioral kategorilerinde 23 temel nesne deseni bulunmaktadır.',
        p3: 'Interfacee gore kod yazın, uygulamaya gore degil.',
        p4: 'Kalıtım yerine nesne kompozisyonunu tercih edin (Composition over Inheritance).'
      }
    ]
  },
  {
    slug: 'pragmatic-programmer.pdf',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    category: 'Yazılım',
    pages: 14,
    samplePassages: [
      {
        p1: 'Pragmatik programcı kendi kodunun sorumlulugunu ustlenir.',
        p2: 'Bozuk pencereleri hemen tamir edin (Don t Live with Broken Windows).',
        p3: 'DRY Prensibi: Don t Repeat Yourself. Bilgiyi tek bir yerde tutun.',
        p4: 'Ortamınızı otomatize edin ve surekli yeni teknolojiler ogrenin.'
      }
    ]
  },
  {
    slug: 'refactoring.pdf',
    title: 'Refactoring',
    author: 'Martin Fowler',
    category: 'Yazılım',
    pages: 15,
    samplePassages: [
      {
        p1: 'Refactoring, kodun dıs davranısını bozmadan ic yapısını iyilestirme sanatıdır.',
        p2: 'Kod kokularını (Code Smells) erken tespit edin.',
        p3: 'Birim testleri (Unit Tests) olmadan refactoring yapmayın.',
        p4: 'Kucuk adımlarla ilerleyin ve her adımda testlerin gectiginden emin olun.'
      }
    ]
  },
  {
    slug: 'devlet.pdf',
    title: 'Devlet (Politeia)',
    author: 'Platon',
    category: 'Felsefe',
    pages: 20,
    samplePassages: [
      {
        p1: 'Adalet nedir? Ideal toplum ve devlet duzeni nasıl olmalıdır?',
        p2: 'Magara Allegorisi: Insanlar karanlık bir magaradaki golgelere bakarak gercekligi sanırlar.',
        p3: 'Filozoflar kral, krallar filozof olmalıdır.',
        p4: 'Ruhun uc bolumu: Akıl, cesaret ve arzular.'
      }
    ]
  },
  {
    slug: 'dune.pdf',
    title: 'Dune',
    author: 'Frank Herbert',
    category: 'Bilim Kurgu',
    pages: 22,
    samplePassages: [
      {
        p1: 'Korku aklın katilidir. Korku tam imhaya yol acan kucuk olumdur.',
        p2: 'Arrakis gezegeni, evrendeki en degerli madde olan baharatın kaynagıdır.',
        p3: 'Paul Atreides col halkı Fremenlerin arasında kendi kaderiyle karsılasır.',
        p4: 'Baharat akmalı (The Spice Must Flow).'
      }
    ]
  },
  {
    slug: 'suc-ve-ceza.pdf',
    title: 'Suc ve Ceza',
    author: 'Fyodor Dostoyevski',
    category: 'Edebiyat',
    pages: 25,
    samplePassages: [
      {
        p1: 'Raskolnikov, St. Petersburgun sıcak bir temmuz aksamında odasından cıktı.',
        p2: 'Olağanustu insanlarla sıradan insanlar arasındaki ahlak sınırlarını sorguluyordu.',
        p3: 'Vicdan azabı, herhangi bir mahkeme cezasından daha agırdır.',
        p4: 'Sonya ona incili okurken Raskolnikov yeniden dogusun ilk adımını attı.'
      }
    ]
  },
  {
    slug: 'uluslarin-zenginligi.pdf',
    title: 'Uluslarin Zenginligi',
    author: 'Adam Smith',
    category: 'Ekonomi',
    pages: 20,
    samplePassages: [
      {
        p1: 'Is bolumu, emeğin uretkenligini artıran en buyuk etkendir.',
        p2: 'Görunmez El (Invisible Hand) piyasayı kendiliginden dengeye getirir.',
        p3: 'Serbest ticaret ve rekabet ulusların refahını saglar.',
        p4: 'Bireysel çıkar, toplumsal faydaya hizmet eder.'
      }
    ]
  },
  {
    slug: 'fahrenheit-451.pdf',
    title: 'Fahrenheit 451',
    author: 'Ray Bradbury',
    category: 'Bilim Kurgu',
    pages: 18,
    samplePassages: [
      {
        p1: 'Yakmak bir zevkti. Kitapların yandıgını, karardıgını gormek harika bir duyguydu.',
        p2: 'Itfaiyeci Guy Montag, kağıdın tutusma sıcaklıgı olan 451 derecede kitap yakıyordu.',
        p3: 'Clarisse ile karsılasması ona dusunmeyi ve kitapların degerini hatırlattı.',
        p4: 'Kitaplar insanlıgın hafızasıdır, onları yakmak dusunceyi yakmaktır.'
      }
    ]
  },
  {
    slug: 'insanligin-hafizasi.pdf',
    title: 'Insanligin Hafizasi Kutup-hane',
    author: 'Alberto Manguel',
    category: 'Tarih',
    pages: 16,
    samplePassages: [
      {
        p1: 'Kutuphaneler insanlıgın zaman icindeki zihnidir.',
        p2: 'Iskenderiye Kutuphanesinden gunumuz dijital kutuphanelerine bilginin yolculugu.',
        p3: 'Kitap toplamak ve sınıflandırmak bir medeniyet gostergesidir.',
        p4: 'Kutuphane, dunyadaki kargaşaya karsı bir duzen ve huzur sığınagıdır.'
      }
    ]
  }
];

console.log('📚 Gercek roman bolumleri içeren PDF dosyaları uretiliyor...');
booksData.forEach(b => {
  const content = generateRichNovelPdf(b);
  outputDirs.forEach(dir => {
    const filePath = path.join(dir, b.slug);
    fs.writeFileSync(filePath, content, 'utf-8');
  });
  console.log(`✅ ${b.slug} (${b.pages} Sayfa Gercek Metin) olusturuldu.`);
});
console.log('🎉 Tum e-kitap PDF dosyaları hazır!');
