import { randomInt } from "node:crypto";
import { SlashCommandBuilder } from "discord.js";

const cooldowns = new Map();
const COOLDOWN_MS = 2_000;

const EIGHT_BALL_ANSWERS = [
  "Kesinlikle evet.",
  "Yıldızlar olumlu görünüyor.",
  "Büyük ihtimalle.",
  "Şimdilik kararsız.",
  "Tekrar sorman daha iyi olabilir.",
  "Pek sanmıyorum.",
  "Kesinlikle hayır.",
  "ENDLESS kehanet motoru bu soruya cevap vermeyi reddediyor.",
];

const TRIVIA = [
  { question: "Bir deste iskambil kağıdında kaç kart vardır?", answer: "52", hint: "Dört takımın her birinde 13 kart bulunur." },
  { question: "Güneş sisteminin en büyük gezegeni hangisidir?", answer: "Jüpiter", hint: "Gaz devi ve adını Roma tanrılarının kralından alır." },
  { question: "Discord'un temel metin biçimlendirme dili hangisidir?", answer: "Markdown", hint: "Yıldız işaretleriyle kalın yazı yazabildiğin dil." },
  { question: "Dünyanın en büyük okyanusu hangisidir?", answer: "Pasifik Okyanusu", hint: "Asya ile Amerika kıtaları arasında uzanır." },
  { question: "Bir haftada kaç gün vardır?", answer: "7", hint: "Pazartesi ile başlayıp pazarla biter." },
];

const JOKES = [
  "Programcı neden karanlıkta çalışır? Çünkü ışıkta bug'lar saklanamaz.",
  "Klavye neden doktora gitmiş? Tuşlarına basılıyormuş.",
  "Bir SQL sorgusu bara girmiş ve iki tablo istemiş. Barmen sormuş: JOIN ister misin?",
  "Wi-Fi neden ayrılmış? Aralarında bağlantı kalmamış.",
  "Bugün çok kararlıydım… sonra bir zar attım.",
];

const QUOTES = [
  "Küçük bir şans, büyük bir maceranın başlangıcıdır.",
  "En iyi ekipman, iyi arkadaşlardır.",
  "Kazanmak güzel, ama oyunu eğlenceli yapan yolculuktur.",
  "Bugünün görevi: biraz gül, biraz oyna, biraz da mola ver.",
  "ENDLESS dünyasında her oyuncunun bir sonraki seviyesi vardır.",
];

const COMPLIMENTS = [
  "Bugün enerjin bir boss savaşını tek başına bitirecek kadar yüksek.",
  "Senin olduğun takımda şans bonusu otomatik aktif oluyor.",
  "Zekân, ENDLESS'in en nadir eşyası olabilir.",
  "Sohbete girdiğin anda sunucunun havası güzelleşiyor.",
  "Sen gerçek bir maceracı ruhuna sahipsin.",
];

const FRIENDLY_ROASTS = [
  "Senin şansını görünce zarlar bile utanıp köşeye çekiliyor.",
  "Haritayı kaybetmedin; harita seni bulamamış.",
  "Envanterin dolu ama strateji çantan hâlâ boş görünüyor.",
  "Sen boss değilsin, ama kesinlikle gizli görev gibisin.",
  "Bugün reflekslerin keşif cooldown'ında olabilir.",
];

const VIBES = [
  ["Kaşif", "Yeni yerler, yeni fikirler ve bolca macera."],
  ["Şans Ustası", "Bugün evren zarları senin lehine atıyor."],
  ["Stratejist", "Hamleni herkesten önce düşünüyorsun."],
  ["Kaos Elçisi", "Plan yok, ama kesinlikle eğlence var."],
  ["Lobi Efsanesi", "Sohbete girdiğin anda atmosfer değişiyor."],
  ["Boss Enerjisi", "Bugün seni durdurmak için bütün ekip lazım."],
];

const RPS = { rock: "Taş", paper: "Kağıt", scissors: "Makas" };
const RPS_BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

export const funCommand = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("ENDLESS eğlence merkezini aç; oyun, şans ve sosyal komutları kullan.")
  .addSubcommand((sub) => sub.setName("coinflip").setDescription("Yazı mı tura mı? Şansını hemen test et."))
  .addSubcommand((sub) => sub.setName("dice").setDescription("İstediğin yüz sayısında zar at.").addIntegerOption((option) => option.setName("sides").setDescription("Zar yüzü: 2 ile 100 arasında.").setMinValue(2).setMaxValue(100)))
  .addSubcommand((sub) => sub.setName("8ball").setDescription("Gizemli 8 topuna bir soru sor.").addStringOption((option) => option.setName("question").setDescription("Cevabını merak ettiğin soru.").setRequired(true).setMaxLength(300)))
  .addSubcommand((sub) => sub.setName("rps").setDescription("ENDLESS'e karşı taş, kağıt veya makas oyna.").addStringOption((option) => option.setName("choice").setDescription("Bu turdaki seçimin.").setRequired(true).addChoices({ name: "Taş", value: "rock" }, { name: "Kağıt", value: "paper" }, { name: "Makas", value: "scissors" })))
  .addSubcommand((sub) => sub.setName("choose").setDescription("Karar veremiyorsan iki seçenekten birini seç.").addStringOption((option) => option.setName("first").setDescription("İlk seçenek.").setRequired(true).setMaxLength(100)).addStringOption((option) => option.setName("second").setDescription("İkinci seçenek.").setRequired(true).setMaxLength(100)))
  .addSubcommand((sub) => sub.setName("trivia").setDescription("Mini bilgi, ipucu ve sohbet meydan okuması al."))
  .addSubcommand((sub) => sub.setName("joke").setDescription("Sohbete rastgele, kısa bir şaka bırak."))
  .addSubcommand((sub) => sub.setName("quote").setDescription("Maceraya uygun rastgele bir söz keşfet."))
  .addSubcommand((sub) => sub.setName("compliment").setDescription("Bir oyuncuya pozitif ve eğlenceli iltifat gönder.").addUserOption((option) => option.setName("user").setDescription("İltifat gönderilecek oyuncu.")))
  .addSubcommand((sub) => sub.setName("roast").setDescription("Kırıcı olmayan, tamamen dostça bir şaka yap.").addUserOption((option) => option.setName("user").setDescription("Dostça şaka yapılacak oyuncu.")))
  .addSubcommand((sub) => sub.setName("ship").setDescription("İki oyuncunun takım uyumunu eğlenceli ölç.").addUserOption((option) => option.setName("first").setDescription("İlk oyuncu.").setRequired(true)).addUserOption((option) => option.setName("second").setDescription("İkinci oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("vibe").setDescription("Bugünkü ENDLESS enerjini öğren."));

function respond(interaction, content) {
  return interaction.reply({ content, ephemeral: false, allowedMentions: { parse: [] } });
}

function isRateLimited(interaction) {
  const key = `${interaction.guildId ?? "dm"}:${interaction.user.id}`;
  const last = cooldowns.get(key) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) return Math.ceil(remaining / 1000);
  cooldowns.set(key, Date.now());
  return 0;
}

function displayUser(user) {
  return user?.globalName ?? user?.username ?? "Gizemli oyuncu";
}

export async function handleFun(interaction) {
  const remaining = isRateLimited(interaction);
  if (remaining) return respond(interaction, `Biraz yavaş, eğlence motoru ısınıyor. **${remaining} saniye** sonra tekrar dene.`);

  const action = interaction.options.getSubcommand();
  if (action === "coinflip") return respond(interaction, `🪙 **${randomInt(0, 2) ? "Tura" : "Yazı"}**!`);
  if (action === "dice") {
    const sides = interaction.options.getInteger("sides") ?? 6;
    return respond(interaction, `🎲 **d${sides}** atıldı: **${randomInt(1, sides + 1)}**`);
  }
  if (action === "8ball") {
    const question = interaction.options.getString("question", true);
    return respond(interaction, `🔮 **${question}**\n> ${EIGHT_BALL_ANSWERS[randomInt(0, EIGHT_BALL_ANSWERS.length)]}`);
  }
  if (action === "choose") {
    const options = [interaction.options.getString("first", true), interaction.options.getString("second", true)];
    return respond(interaction, `🎯 ENDLESS seçti: **${options[randomInt(0, options.length)]}**`);
  }
  if (action === "rps") {
    const player = interaction.options.getString("choice", true);
    const choices = Object.keys(RPS);
    const bot = choices[randomInt(0, choices.length)];
    const result = player === bot ? "Berabere!" : RPS_BEATS[player] === bot ? "Kazandın!" : "Bu turu ben aldım!";
    return respond(interaction, `✊ **${RPS[player]}** vs **${RPS[bot]}** — **${result}**`);
  }
  if (action === "trivia") {
    const trivia = TRIVIA[randomInt(0, TRIVIA.length)];
    return respond(interaction, `🧠 **Mini Trivia**\n${trivia.question}\nİpucu: *${trivia.hint}*\nCevabını sohbete yaz! Cevap: ||${trivia.answer}||`);
  }
  if (action === "joke") return respond(interaction, `😂 ${JOKES[randomInt(0, JOKES.length)]}`);
  if (action === "quote") return respond(interaction, `📜 *${QUOTES[randomInt(0, QUOTES.length)]}*`);
  if (action === "vibe") {
    const [name, description] = VIBES[randomInt(0, VIBES.length)];
    return respond(interaction, `✨ Bugünkü vibe'ın: **${name}**\n${description}`);
  }
  if (action === "compliment" || action === "roast") {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const text = action === "compliment" ? COMPLIMENTS[randomInt(0, COMPLIMENTS.length)] : FRIENDLY_ROASTS[randomInt(0, FRIENDLY_ROASTS.length)];
    return respond(interaction, `${action === "compliment" ? "💖" : "🔥"} **${displayUser(user)}** için: ${text}`);
  }
  const first = interaction.options.getUser("first", true);
  const second = interaction.options.getUser("second", true);
  const score = randomInt(0, 101);
  const verdict = score >= 85 ? "Efsanevi takım!" : score >= 65 ? "Çok iyi uyum!" : score >= 40 ? "Dengeli bir ikili." : "Kaos ama eğlenceli bir takım!";
  return respond(interaction, `💞 **${displayUser(first)} + ${displayUser(second)}**\nUyum skoru: **%${score}** — ${verdict}`);
}
