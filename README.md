# ENDLESS

Discord sunucularını ayrı oyun dünyalarına dönüştüren, PostgreSQL destekli ekonomi ve macera botu.

## Özellikler

- Sunucu başına izole dünya ve oyuncu profili
- Coin/Gem cüzdanı, banka, güvenli ledger ve idempotent işlemler
- Günlük ödül serisi ve günlük görev panosu
- 5 dakikalık keşif cooldown'ı, rastlantısal olaylar ve XP/level sistemi
- Üç aşamalı Kül Harabeleri zindanı ve boss savaşı
- Market, envanter, ekipman bonusları ve tüketilebilir eşyalar
- **Eğlence merkezi:** 12 alt komutla şans oyunları, trivia, şaka, söz, vibe, iltifat, dostça roast ve takım uyumu
- **`/endless` koleksiyon merkezi:** hayvan avı, kalıcı hayvan koleksiyonu, zoo görünümü, dua ödülü, Coin transferi, kontrollü bahis ve sosyal etkileşimler
- **ENDLESS oyun merkezi:** `/games slots`, adım adım oynanan blackjack, hücre seçimli mayın tarlası ve oyun içi Coin bahisleri
- **Endless Arcade genişletmesi:** rulet, crash ve veritabanına kaydedilen günlük ücretsiz Şans Çarkı
- **Başarım Salonu:** `/achievements show` ile kalıcı rozet ilerlemesi, `/achievements claim` ile tek seferlik Coin/Gem/XP ödülleri
- **Endless Yoldaşlar:** `/pet adopt`, `/pet show` ve 24 saatte bir `/pet feed`; sadakat artık türüne göre keşif/av Coin'i, XP, zindan hasarı veya dua ödülünü güçlendirir
- **Dünya Boss Raid:** `/event status`, `/event attack` ve `/event leaderboard` ile bütün sunucunun birlikte savaştığı ortak Kül Kolossusu
- **Endless Arena PvP:** `/arena duel`, `/arena stats` ve `/arena leaderboard` ile güvenli Coin bahisli düello ve rating sistemi
- **Özgün sosyal animasyonlar:** `/social hug`, `/social kiss`, `/social cuddle`, `/social pat`, `/social highfive` ve `/social boop` Discord mesajını adım adım günceller.
- **Markaya özel GIF paketi:** `assets/gifs/` altındaki altı özgün GIF, sosyal komutlarda Discord ek dosyası olarak gönderilir.
- **Oyun animasyonları:** av, tapınak, transfer, bahis, slot, blackjack, mayın tarlası ve sosyal hareketler Discord mesajını adım adım günceller.
- Express health endpoint: `/api/healthz`
- Discord etkileşimlerinde idempotency ve güvenli mention ayarları

## Yerel kurulum

```bash
npm ci
cp .env.example .env
# .env içine Discord token, DATABASE_URL ve PORT değerlerini gir
npm start
```

Discord uygulamasında bot için `Guilds` intent yeterlidir. Bot açılışta `database/schema.sql` dosyasını otomatik ve idempotent biçimde uygular; ayrıca elle çalıştırmak istersen `psql "$DATABASE_URL" -f database/schema.sql` kullanabilirsin. Komutlar, `DISCORD_DEV_GUILD_ID` verilirse o sunucuya anında; verilmezse global olarak kaydedilir.

## Deploy kontrol listesi

1. PostgreSQL veritabanını oluştur ve `database/schema.sql` dosyasını bir kez çalıştır.
2. Hosting sağlayıcısında Node.js 22+ seç.
3. Build/install komutu: `npm ci`; start komutu: `npm start`.
4. Ortam değişkenlerini `.env.example` üzerinden tanımla. Token ve veritabanı URL'sini GitHub'a koyma.
5. Sağlık kontrolünü `GET /api/healthz` olarak tanımla.
6. Discord Developer Portal'da botu sunuculara `bot` ve `applications.commands` scope'larıyla davet et.

## Yeni başlayanlar için kod rehberi

Detaylı açıklama için [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) dosyasına bak. Kısaca:

- `index.js`: PostgreSQL bağlantısını, Discord istemcisini, slash komut kaydını ve ortak ekonomi fonksiyonlarını başlatır.
- `games.js`: slot, blackjack, mayın, rulet, crash, günlük çark ve sosyal komutların oyun kurallarını içerir.
- `database/schema.sql`: botun kullandığı tabloları güvenli ve tekrar çalıştırılabilir biçimde oluşturur.
- `assets/gifs/`: Discord'da gönderilen özgün Endless sosyal animasyonlarıdır.
- `endless_achievement_claims`: başarımların ödülünün iki kez verilmesini engeller.
- `endless_pets`: oyuncunun yoldaş türünü, adını ve 1–100 arasındaki sadakat seviyesini saklar.
- Yoldaş besleme zamanı `endless_pets.last_fed_at` alanında saklanır; şema bu alanı mevcut kurulumlara otomatik ve güvenli biçimde ekler.
- Yoldaş pasifleri her 10 sadakatte %1 artar (en çok %10); ejderha zindan hasarına her 20 sadakatte +1 (en çok +5) verir. Sadakati 100 olan yoldaş tekrar beslenemez ve Coin harcanmaz.
- `endless_world_events` ve `endless_world_event_contributions`: ortak boss canını ve oyuncuların hasar katkılarını saklar.
- `endless_arena_stats` ve `endless_arena_matches`: PvP rating, galibiyet/mağlubiyet ve maç sonucunu saklar.
- Para hareketlerinde önce ledger kaydı, sonra bakiye güncellemesi yapılır; böylece aynı Discord isteği iki kez ödül veremez.

## Güvenlik ve operasyon

- Para hareketleri PostgreSQL transaction + ledger idempotency anahtarıyla korunur.
- Kullanıcı girdilerinde Discord mention'ları kapalıdır.
- Eğlence komutlarında spam'e karşı oyuncu başına 2 saniyelik cooldown vardır.
- `LOG_LEVEL=info` varsayılandır; üretimde gizli değerleri loglama.
- Veritabanı kaynaklı komut hatalarında loglara PostgreSQL hata kodu ve constraint bilgisi eklenir; kullanıcıya bağlantı sorunu için ayrı, güvenli bir mesaj gösterilir.
