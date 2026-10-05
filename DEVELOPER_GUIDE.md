# ENDLESS geliştirici rehberi

Bu dosya, projeyi ilk kez açan birinin botun nasıl çalıştığını anlayabilmesi için yazıldı. Kod içinde de kısa yorumlar vardır; burası ise bütün resmi anlatır.

## 1. Bot açılırken ne olur?

1. `index.js` `.env` dosyasındaki ayarları okur.
2. PostgreSQL bağlantı havuzu oluşturur.
3. `database/schema.sql` dosyasını çalıştırır. `IF NOT EXISTS` kullanıldığı için bu işlem mevcut veriyi silmez.
4. Discord slash komutlarını (`/start`, `/games`, `/social` gibi) Discord API'ye kaydeder.
5. Express sağlık adresini açar: `GET /api/healthz`.
6. Discord Gateway'e bağlanır ve gelen komutları ilgili handler fonksiyonuna yollar.

> Özet: `index.js` botun trafik polisi, `games.js` oyun salonu, `schema.sql` ise veritabanı planıdır.

## 2. Bir slash komutu nasıl çalışır?

Örneğin kullanıcı `/games slots amount:50` yazdığında:

1. Discord komutu `index.js` içindeki `handleInteraction` fonksiyonuna gelir.
2. Komut adı `games` olduğu için `handleGames` çağrılır.
3. `games.js`, alt komutun `slots` olduğunu görür.
4. `walletBet` PostgreSQL transaction başlatır ve Coin bakiyesini kilitler.
5. Yeterli Coin varsa ledger'a negatif hareket yazılır ve cüzdandan bahis düşülür.
6. Slot sonucu üretilir.
7. Kazanç varsa ikinci transaction ile ledger'a pozitif hareket yazılır.
8. Discord mesajı birkaç ara kareyle güncellenir; kullanıcı animasyonu görür.

Bu yapı sayesinde bot kapanıp tekrar açılsa bile Coin hareketlerinin geçmişi `endless_ledger` tablosunda kalır.

## 3. Dosyaları nerede değiştirmeliyim?

| İhtiyaç | Dosya |
|---|---|
| Yeni slash komutu tanımlamak | İlgili modülün `SlashCommandBuilder` bölümü |
| Oyun kuralını değiştirmek | `games.js` içindeki ilgili fonksiyon |
| Yeni tablo veya kalıcı veri eklemek | `database/schema.sql` |
| Sosyal GIF eklemek/değiştirmek | `assets/gifs/` ve `SOCIAL_GIFS` haritası |
| Genel cüzdan/ledger davranışını değiştirmek | `index.js` içindeki `inTransaction`, `insertLedger` veya ekonomi fonksiyonları |
| Kullanıcıya komutları anlatmak | `helpText`, `README.md` ve bu rehber |

## 4. Yeni oyun ekleme şablonu

1. `gamesCommand` içine bir `.addSubcommand(...)` ekle.
2. Handler içinde aynı ada sahip bir fonksiyon oluştur.
3. Bahisli oyunsa önce `walletBet(...)` çağır.
4. Kazanç varsa `walletPayout(...)` çağır.
5. Sonucu kullanıcıya açık Türkçe metinle gönder.
6. `handleGames` içindeki yönlendirmeye yeni `if` satırı ekle.
7. Yardım metnine kullanım örneği ekle.
8. `npm test` ve `git diff --check` çalıştır.

Örnek iskelet:

```js
async function yeniOyun(interaction) {
  const amount = interaction.options.getInteger("amount", true);
  const debit = await walletBet({
    pool, inTransaction, insertLedger,
    worldId: interaction.guildId,
    userId: interaction.user.id,
    amount,
    reason: "yeni_oyun_bet",
    interactionId: interaction.id,
  });

  if (!debit.ok) return interaction.editReply("Yeterli Coin yok.");

  // Burada oyunun sonucu üretilir.
  const kazanc = 0;
  if (kazanc > 0) {
    await walletPayout({
      pool, inTransaction, insertLedger,
      worldId: interaction.guildId,
      userId: interaction.user.id,
      amount: kazanc,
      reason: "yeni_oyun_payout",
      interactionId: interaction.id,
    });
  }

  return interaction.editReply("Oyun sonucu burada gösterilir.");
}
```

## 5. GIF sistemi nasıl çalışır?

- GIF dosyaları `assets/gifs/endless-*.gif` biçiminde tutulur.
- `games.js`, `fileURLToPath(new URL(...))` ile bu dosyaların deploy içindeki gerçek yolunu bulur.
- Sosyal komut önce mesajı üç ara kareyle günceller.
- Son karede `AttachmentBuilder` GIF'i Discord mesajına ekler.
- Yeni bir hareket eklemek için aynı isimde bir GIF üret, `SOCIAL_GIFS` içine eşleştir ve `socialCommand` içine alt komut ekle.

GIF'ler bu sürümde programatik olarak Endless renkleri, orbit deseni ve hareket sembolüyle üretildi. Böylece üçüncü taraf bir botun görseli veya marka adı kullanılmaz.

## 6. Veritabanı güvenliği

- Her para hareketi bir `idempotency_key` ile ledger'a yazılır.
- Aynı interaction tekrar ulaşırsa `ON CONFLICT DO NOTHING` ikinci ödülü engeller.
- Bakiye güncellemesi transaction içindedir.
- SQL içindeki dinamik sütun adı yalnızca kodun sabit seçtiği `wallet_coins` veya `wallet_gems` değerlerinden gelir; kullanıcı metni SQL'e doğrudan eklenmez.
- Günlük çark `endless_daily_spins` tablosunda UTC tarihine göre tutulur.

## 7. Yerelde test

```bash
npm ci
npm test
```

Gerçek Discord bağlantısı için `.env` içinde şunlar gerekir:

```env
DISCORD_BOT_TOKEN=...
DATABASE_URL=postgresql://...
PORT=3000
```

Gizli anahtarları GitHub'a gönderme. Üretimde ortam değişkeni olarak tanımla.

## 8. Deploy notu

Discord Gateway bağlantısı sürekli açık bir Node.js süreci ister. Bu nedenle botu yalnızca kısa ömürlü serverless fonksiyonlarda çalıştırma. Node 22 kullanan ve `npm start` komutunu sürekli çalıştıran bir servis seç. Sağlık kontrolü için `/api/healthz` adresini kullan.
