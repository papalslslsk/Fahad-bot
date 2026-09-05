const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const projectDir = __dirname;

function startBot(botData, fileName) {
    const token = process.env[botData.token] || botData.token;

    if (!token || !botData.channelId) {
        console.log(`[-] الملف ${fileName} بياناته ناقصة أو متغير البيئة غير موجود.`);
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

    client.login(token).catch(err => {
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

        console.log(`[🔊] (${botData.name}) قفل وثبت في الروم: ${channel.name}`);
    } catch (error) {
        console.error(`[-] خطأ في الاتصال للبوت (${botData.name}):`, error);
        setTimeout(() => connectToVoiceChannel(client, botData), 10000);
    }
}

const files = fs.readdirSync(projectDir).filter(file => file.startsWith('bot') && file.endsWith('.json'));

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
    }, index * 2500);
});
