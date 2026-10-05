# ENDLESS

Discord sunucularını ayrı oyun dünyalarına dönüştüren, PostgreSQL destekli ekonomi ve macera botu.

## Özellikler

- Sunucu başına izole dünya ve oyuncu profili
- Coin/Gem cüzdanı, banka, güvenli ledger ve idempotent işlemler
- Günlük ödül serisi ve günlük görev panosu
- 5 dakikalık keşif cooldown'ı, rastlantısal olaylar ve XP/level sistemi
- Üç aşamalı Kül Harabeleri zindanı ve boss savaşı
- Market, envanter, ekipman bonusları ve tüketilebilir eşyalar
- **Eğlence merkezi:** `/fun coinflip`, `/fun dice`, `/fun 8ball`, `/fun rps`, `/fun choose`, `/fun trivia`
- Express health endpoint: `/api/healthz`
- Discord etkileşimlerinde idempotency ve güvenli mention ayarları

## Yerel kurulum

```bash
npm ci
cp .env.example .env
# .env içine Discord token, DATABASE_URL ve PORT değerlerini gir
psql "$DATABASE_URL" -f database/schema.sql
npm start
```

Discord uygulamasında bot için `Guilds` intent yeterlidir. Komutlar, `DISCORD_DEV_GUILD_ID` verilirse o sunucuya anında; verilmezse global olarak kaydedilir.

## Deploy kontrol listesi

1. PostgreSQL veritabanını oluştur ve `database/schema.sql` dosyasını bir kez çalıştır.
2. Hosting sağlayıcısında Node.js 22+ seç.
3. Build/install komutu: `npm ci`; start komutu: `npm start`.
4. Ortam değişkenlerini `.env.example` üzerinden tanımla. Token ve veritabanı URL'sini GitHub'a koyma.
5. Sağlık kontrolünü `GET /api/healthz` olarak tanımla.
6. Discord Developer Portal'da botu sunuculara `bot` ve `applications.commands` scope'larıyla davet et.

## Güvenlik ve operasyon

- Para hareketleri PostgreSQL transaction + ledger idempotency anahtarıyla korunur.
- Kullanıcı girdilerinde Discord mention'ları kapalıdır.
- Eğlence komutlarında spam'e karşı oyuncu başına 2 saniyelik cooldown vardır.
- `LOG_LEVEL=info` varsayılandır; üretimde gizli değerleri loglama.
