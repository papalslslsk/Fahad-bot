const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const projectDir = __dirname;

function startBot(botData, fileName) {
    // جلب التوكن: يبحث عنه في متغيرات البيئة بريلواي أولاً، وإذا لم يجدها يأخذها مباشرة من ملف الـ json
    let token = process.env[botData.token] || botData.token;

    if (!token || token.includes("هنا") || token.length < 50) {
        console.log(`[-] خطأ: التوكن غير صحيح أو غير متوفر لـ ${botData.name || fileName}`);
        return;
    }

    if (!botData.channelId || !botData.guildId) {
        console.log(`[-] خطأ: بيانات الروم أو السيرفر ناقصة في ملف ${fileName}`);
        return;
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    client.once('ready', () => {
        console.log(`[+] تم تشغيل البوت بنجاح: ${client.user.tag} (${botData.name})`);
        connectToVoiceChannel(client, botData);
    });

    // حماية قوية جداً: إذا حاول أي أحد يسحب البوت أو طلع بالغلط، يرجع فورا لرومه بدون عذر
    client.on('voiceStateUpdate', (oldState, newState) => {
        if (newState.member && newState.member.id === client.user.id) {
            if (newState.channelId !== botData.channelId) {
                console.log(`[!] تنبيه: (${botData.name}) خرج من رومه المخصص، جاري إعادته فوراً...`);
                setTimeout(() => connectToVoiceChannel(client, botData), 1000);
            }
        }
    });

    client.login(token).catch(err => {
        console.error(`[-] خطأ في تسجيل دخول ${botData.name}:`, err.message);
    });
}

function connectToVoiceChannel(client, botData) {
    const guild = client.guilds.cache.get(botData.guildId);
    if (!guild) return console.log(`[-] السيرفر غير موجود للبوت (${botData.name})!`);

    const channel = guild.channels.cache.get(botData.channelId);
    if (!channel) return console.log(`[-] الروم الصوتي غير موجود للبوت (${botData.name})!`);

    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                setTimeout(() => connectToVoiceChannel(client, botData), 4000);
            }
        });

        console.log(`[🔊] تثبيت أسطوري: (${botData.name}) استقر وثبت في الروم: ${channel.name}`);
    } catch (error) {
        console.error(`[-] خطأ في الاتصال الصوتي للبوت (${botData.name}):`, error);
        setTimeout(() => connectToVoiceChannel(client, botData), 6000);
    }
}

// قراءة ملفات البوتات بالترتيب من bot1 إلى bot8
const files = fs.readdirSync(projectDir)
    .filter(file => file.startsWith('bot') && file.endsWith('.json'))
    .sort();

if (files.length === 0) {
    console.error("[-] خطأ: لم يتم العثور على أي ملفات بوتات!");
    process.exit(1);
}

console.log(`[i] جاري تشغيل ${files.length} بوتات بفاصل زمني آمن...`);

// تشغيل البوتات ورا بعض بفارق 6 ثوانٍ عشان ديسكورد ما يعطيك حظر اتصال (Rate Limit)
files.forEach((file, index) => {
    setTimeout(() => {
        const filePath = path.join(projectDir, file);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const botData = JSON.parse(fileContent);
            startBot(botData, file);
        } catch (e) {
            console.error(`[-] خطأ في قراءة ملف JSON للبوت ${file}:`, e.message);
        }
    }, index * 6000); // 6 ثوانٍ بين كل بوت والثاني
});
