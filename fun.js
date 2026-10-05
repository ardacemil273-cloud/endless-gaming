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
  { question: "Güneş sisteminin en büyük gezegeni hangisidir?", answer: "jüpiter", hint: "Gaz devi ve adını Roma tanrılarının kralından alır." },
  { question: "Discord'un temel metin biçimlendirme dili hangisidir?", answer: "markdown", hint: "Yıldız işaretleriyle kalın yazı yazabildiğin dil." },
];
const RPS = { rock: "Taş", paper: "Kağıt", scissors: "Makas" };
const RPS_BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

export const funCommand = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("ENDLESS eğlence merkezini aç.")
  .addSubcommand((sub) => sub.setName("coinflip").setDescription("Yazı mı tura mı?"))
  .addSubcommand((sub) => sub.setName("dice").setDescription("Zar at.").addIntegerOption((option) => option.setName("sides").setDescription("Zar yüzü (2-100)").setMinValue(2).setMaxValue(100)))
  .addSubcommand((sub) => sub.setName("8ball").setDescription("Gizemli 8 topuna soru sor.").addStringOption((option) => option.setName("question").setDescription("Sorun").setRequired(true).setMaxLength(300)))
  .addSubcommand((sub) => sub.setName("rps").setDescription("Taş, kağıt, makas oyna.").addStringOption((option) => option.setName("choice").setDescription("Seçimin").setRequired(true).addChoices({ name: "Taş", value: "rock" }, { name: "Kağıt", value: "paper" }, { name: "Makas", value: "scissors" })))
  .addSubcommand((sub) => sub.setName("choose").setDescription("İki seçenekten birini seç.").addStringOption((option) => option.setName("first").setDescription("İlk seçenek").setRequired(true).setMaxLength(100)).addStringOption((option) => option.setName("second").setDescription("İkinci seçenek").setRequired(true).setMaxLength(100)))
  .addSubcommand((sub) => sub.setName("trivia").setDescription("Günün mini bilgisini ve ipucunu gör."));

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
  const trivia = TRIVIA[randomInt(0, TRIVIA.length)];
  return respond(interaction, `🧠 **Mini Trivia**\n${trivia.question}\nİpucu: *${trivia.hint}*\nCevabını sohbete yaz!`);
}
