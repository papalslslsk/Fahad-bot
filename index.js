const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const projectDir = __dirname;

function startBot(botData, fileName) {
    const token = process.env[botData.token] || botData.token;

    if (!token || token.includes("هنا") || token.length < 50) {
        console.log(`[-] خطأ: التوكن غير صحيح لملف ${fileName}`);
        return;
    }

    if (!botData.channelId || !botData.guildId) {
        console.log(`[-] خطأ: بيانات الروم ناقصة في ملف ${fileName}`);
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

    client.login(token).catch(err => {
        console.error(`[-] خطأ تسجيل دخول ${botData.name}:`, err.message);
    });
}

function connectToVoiceChannel(client, botData) {
    const guild = client.guilds.cache.get(botData.guildId);
    if (!guild) {
        return setTimeout(() => connectToVoiceChannel(client, botData), 5000);
    }

    const channel = guild.channels.cache.get(botData.channelId);
    if (!channel) {
        return setTimeout(() => connectToVoiceChannel(client, botData), 5000);
    }

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
                setTimeout(() => connectToVoiceChannel(client, botData), 3000);
            }
        });

        console.log(`[🔊] تم الدخول والثبات بنجاح: (${botData.name}) في روم: ${channel.name}`);
    } catch (error) {
        setTimeout(() => connectToVoiceChannel(client, botData), 5000);
    }
}

const files = fs.readdirSync(projectDir)
    .filter(file => file.startsWith('bot') && file.endsWith('.json'))
    .sort();

if (files.length === 0) {
    console.error("[-] خطأ: لم يتم العثور على ملفات بوتات!");
    process.exit(1);
}

// تشغيل البوتات ورا بعض بفارق 6 ثوانٍ عشان ديسكورد يسمح لهم كلهم بالدخول بدون مشاكل
files.forEach((file, index) => {
    setTimeout(() => {
        const filePath = path.join(projectDir, file);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const botData = JSON.parse(fileContent);
            startBot(botData, file);
        } catch (e) {
            console.error(`[-] خطأ في قراءة ${file}:`, e.message);
        }
    }, index * 6000);
});
