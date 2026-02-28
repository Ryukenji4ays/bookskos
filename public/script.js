// --- 1. GLOBAL DEĞİŞKENLER ---
var tumKitaplar = []; 

// Sayfa yüklendiğinde çalışacaklar
document.addEventListener('DOMContentLoaded', function() {
    kitaplariGetir();
    sepetSayisiniGuncelle();
    kullaniciKontrol();
    
    // Arama kutusu dinleyicisi
    var aramaKutusu = document.getElementById('searchInput');
    if (aramaKutusu) {
        aramaKutusu.addEventListener('keyup', function(olay) {
            kitapAra(olay.target.value);
        });
    }
});

// --- 2. KİTAPLARI GETİR ---
function kitaplariGetir() {
    fetch('/api/books')
        .then(function(cevap) { return cevap.json(); })
        .then(function(veri) {
            tumKitaplar = veri;
            ekranaBas(tumKitaplar);
        })
        .catch(function(hata) {
            console.log("Hata:", hata);
            document.getElementById('product-list').innerHTML = "Kitaplar yüklenemedi.";
        });
}

// --- 3. EKRANA BAS (Çizimine Göre Düzenlendi) ---
function ekranaBas(kitapListesi) {
    var kutu = document.getElementById('product-list');
    kutu.innerHTML = '';

    if (kitapListesi.length === 0) {
        kutu.innerHTML = '<p>Kitap bulunamadı.</p>';
        return;
    }

    kitapListesi.forEach(function(kitap) {
        // Resim kontrolü
        var resim = kitap.image_url || 'https://via.placeholder.com/150';
        
        // Yazar bilgisi yoksa 'Bilinmiyor' yazsın
        var yazar = kitap.author || 'Yazar Bilinmiyor';

        // --- BURASI DEĞİŞTİ ---
        var kartHTML = `
            <div class="product-card">
                <div class="image-box">
                    <img src="${resim}" alt="${kitap.title}">
                </div>

                <div class="card-info">
                    <h3>${kitap.title}</h3>
                    
                    <p class="author"><i class="fas fa-pen-nib"></i> ${yazar}</p>
                    
                    <p class="stock">Stok: ${kitap.stock} Adet</p>

                    <p class="price">${kitap.price} TL</p>
                </div>

                <button onclick="sepeteEkle(${kitap.book_id})" class="add-btn">
                    Sepete Ekle
                </button>
            </div>
        `;
        kutu.innerHTML += kartHTML;
    });
}

// --- 4. KULLANICI KONTROLÜ ---
function kullaniciKontrol() {
    var kullaniciVerisi = localStorage.getItem('currentUser');
    var userMenu = document.getElementById('user-menu');

    if (userMenu) {
        if (kullaniciVerisi) {
            var kullanici = JSON.parse(kullaniciVerisi);
            userMenu.innerHTML = `
                <span style="font-weight:bold; color:#2c3e50; margin-left:10px;">
                    ${kullanici.username}
                </span>
                <a href="#" onclick="cikisYap()" style="color:red; margin-left:10px; font-size:14px;">(Çıkış)</a>
            `;
        } else {
            userMenu.innerHTML = `<a href="login.html"><i class="fas fa-user"></i> Giriş Yap</a>`;
        }
    }
}

function cikisYap() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// --- 5. SEPET VE DİĞER FONKSİYONLAR ---
/* script.js dosyasındaki sepeteEkle fonksiyonunu bununla değiştir: */

function sepeteEkle(kitapId) {
    var kitap = tumKitaplar.find(function(k) { return k.book_id == kitapId; });
    
    if (kitap) {
        var sepet = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        var varMi = sepet.find(function(item) { return item.book_id == kitapId; });

        // --- STOK KONTROLÜ BAŞLANGIÇ ---
        var sepettekiAdet = varMi ? varMi.quantity : 0;
        
        // Eğer sepetteki adet + 1, stoktan büyükse işlem yapma
        if (sepettekiAdet + 1 > kitap.stock) {
            alert("Üzgünüz, bu üründen stokta sadece " + kitap.stock + " adet kaldı!");
            return; 
        }
        // --- STOK KONTROLÜ BİTİŞ ---

        if (varMi) {
            varMi.quantity += 1;
        } else {
            sepet.push({
                book_id: kitap.book_id,
                title: kitap.title,
                price: kitap.price,
                stock: kitap.stock,
                quantity: 1
            });
        }
        localStorage.setItem('shoppingCart', JSON.stringify(sepet));
        sepetSayisiniGuncelle();
        popupAc();
    }
}

function kitapAra(kelime) {
    var baslik = document.getElementById('page-title');

    // 1. Eğer arama kutusu boşaltılırsa başlığı düzelt
    if (!kelime || kelime.trim() === "") {
        baslik.innerText = "Popüler Kitaplar";
        ekranaBas(tumKitaplar); // Tüm kitapları geri getir
        return;
    }

    // 2. Arama yapıldığı an başlığı değiştir
    baslik.innerText = '"' + kelime + '" için Arama Sonuçları';

    // 3. Arama işlemini yap
    kelime = kelime.toLowerCase();
    var bulunanlar = tumKitaplar.filter(function(kitap) {
        return kitap.title.toLowerCase().includes(kelime);
    });

    // 4. Sonuçları ekrana bas
    ekranaBas(bulunanlar);
}

function kategoriFiltrele(kategoriAdi) {
    var baslik = document.getElementById('page-title');
    if (kategoriAdi === 'Hepsi') {
        baslik.innerText = "Popüler Kitaplar";
        ekranaBas(tumKitaplar);
    } else {
        baslik.innerText = kategoriAdi + " Kitapları";
        // Kategori ID eşleşmesi (Basit yöntem)
        var id = 0;
        if (kategoriAdi == 'Edebiyat') id = 1;
        if (kategoriAdi == 'Çocuk' || kategoriAdi == 'Bilim') id = 2; // Örnek ID'ler
        if (kategoriAdi == 'Roman') id = 3;
        if (kategoriAdi == 'Tarih') id = 4;
        
        // Eğer veritabanında ID'ler farklıysa burayı güncellemen gerekebilir
        // Şimdilik isimle filtreleme yapalım garanti olsun:
        // (Gerçek projede ID daha doğrudur ama öğrenci projesinde bu da çalışır)
        var filtreli = tumKitaplar.filter(function(k) { 
             // Kategori ID'si tutuyorsa getir (Veritabanındaki ID'lerine göre)
             return k.category_id == id; 
        });
        ekranaBas(filtreli);
    }
}

function sepetSayisiniGuncelle() {
    var sepet = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    var toplam = 0;
    sepet.forEach(function(item) { toplam += item.quantity; });
    var sayac = document.getElementById('cart-count');
    if (sayac) sayac.innerText = "(" + toplam + ")";
}

function popupAc() { document.getElementById('custom-popup').style.display = 'flex'; }
function closePopup() { document.getElementById('custom-popup').style.display = 'none'; }