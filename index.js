const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const botsDir = path.join(__dirname, 'bots');

if (!fs.existsSync(botsDir)) {
    console.error("[-] خطأ: مجلد bots غير موجود!");
    process.exit(1);
}

const botFiles = fs.readdirSync(botsDir.filter(file => file.endsWith('.json')));

function startBot(botData, fileName) {
    if (!botData.token || !botData.channelId) {
        console.log(`[-] الملف ${fileName} ناقص بيانات (Token أو Channel ID).`);
        return;
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    client.once('ready', () => {
        console.log(`[+] تم تشغيل: ${client.user.tag} (${botData.name || fileName})`);
        connectToVoiceChannel(client, botData);
    });

    client.login(botData.token).catch(err => {
        console.error(`[-] خطأ تسجيل دخول ${fileName}:`, err.message);
    });
}

function connectToVoiceChannel(client, botData) {
    const guild = client.guilds.cache.get(botData.guildId || '1545708846553501768');
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
                setTimeout(() => connectToVoiceChannel(client, botData), 5000);
            }
        });

        console.log(`[🔊] (${botData.name}) ثبت في الروم: ${channel.name}`);
    } catch (error) {
        console.error(`[-] خطأ في الاتصال للبوت (${botData.name}):`, error);
        setTimeout(() => connectToVoiceChannel(client, botData), 10000);
    }
}

// قراءة وتشغيل الملفات بفارق زمني بسيط بين كل بوت والثاني لمنع الضغط
const files = fs.readdirSync(botsDir).filter(file => file.endsWith('.json'));

files.forEach((file, index) => {
    setTimeout(() => {
        const filePath = path.join(botsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
            const botData = JSON.parse(fileContent);
            startBot(botData, file);
        } catch (e) {
            console.error(`[-] خطأ في قراءة ملف JSON للبوت ${file}:`, e.message);
        }
    }, index * 2500); // فاصل زمني ثانيتين ونصف بين كل بوت
});
