const express = require('express');
const path = require('path');
const app = express();

// Kendi oluşturduğumuz veritabanı bağlantı dosyasını çağırıyoruz
const db = require('./db'); 

// Gerekli ayarlar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- ROTALAR (API ENDPOINTS) ---

// 1. Kitapları Getir 
app.get('/api/books', (req, res) => {
    db.query("SELECT * FROM Books", (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Veri çekilemedi' });
        }
        res.json(results);
    });
});

// 2. Giriş Yap 
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // TERMİNALDE GÖRMEK İÇİN LOGLAR 
    console.log("------------------------------------------------");
    console.log("GİRİŞ DENEMESİ:");
    console.log("Email:", email);
    console.log("Şifre:", password);

    // NOT: SQL Injection açığı bilerek bırakılmıştır (Hocaya göstermek için)
    // Güvenli hali: "SELECT * FROM Users WHERE email = ? AND password = ?"
   
    const sql = "SELECT * FROM Users WHERE email = '" + email + "' AND password = '" + password + "'";
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.json({ success: false, message: 'Sunucu Hatası' });
        }
        
        console.log("VERİTABANI SONUCU:", result); // Ne bulduğunu gör

        if (result.length > 0) {
            // Giriş başarılı
            console.log("-> BAŞARILI");
            res.json({ success: true, user: result[0] });
        } else {
            // Giriş başarısız
            console.log("-> BAŞARISIZ: Kullanıcı bulunamadı");
            res.json({ success: false, message: 'Email veya şifre hatalı' });
        }
        console.log("------------------------------------------------");
    });
});

// 3. Üye Ol
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
 
    const sql = "INSERT INTO Users (username, email, password) VALUES (?, ?, ?)";
    
    db.query(sql, [username, email, password], (err, result) => {
        if (err) {
            console.error("Kayıt hatası:", err);
            // Eğer aynı email varsa hata verir
            return res.json({ success: false, message: 'Kayıt oluşturulamadı (Email kullanılıyor olabilir)' });
        }
        res.json({ success: true });
    });
});

// 4. Sipariş Oluştur ve STOKTAN DÜŞ 
app.post('/api/orders', (req, res) => {
    const { user_id, items } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Sepet boş' });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // A. Siparişi Kaydet
    db.query("INSERT INTO Orders (user_id, total_amount) VALUES (?, ?)", [user_id, total], (err, result) => {
        
        if (err) {
            console.error("Sipariş ana tablo hatası:", err);
            return res.status(500).json({ error: 'Sipariş oluşturulamadı' });
        }

        const orderId = result.insertId;
        
        // B. Detayları Kaydet
        const details = items.map(i => [orderId, i.book_id, i.quantity, i.price]);
        
        db.query("INSERT INTO OrderDetails (order_id, book_id, quantity, unit_price) VALUES ?", [details], (err, res2) => {
            if (err) {
                console.error("Detay tablosu hatası:", err);
                return res.status(500).json({ error: 'Detaylar eklenemedi' });
            }

            // STOKTAN DÜŞME
            items.forEach(item => {
                const sqlUpdate = "UPDATE Books SET stock = stock - ? WHERE book_id = ?";
                
                db.query(sqlUpdate, [item.quantity, item.book_id], (err, result) => {
                    if (err) {
                        console.error(`Kitap ID ${item.book_id} stok hatası:`, err);
                    } else {
                        console.log(`Kitap ID ${item.book_id} stoğu ${item.quantity} adet azaltıldı.`);
                    }
                });
            });

            res.json({ message: 'Sipariş Tamamlandı ve Stoklar Güncellendi' });
        });
    });
});

// Sunucuyu Başlat
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});