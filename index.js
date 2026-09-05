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

    let connection = null;

    function connect() {
        const guild = client.guilds.cache.get(botData.guildId);
        if (!guild) {
            return setTimeout(connect, 5000);
        }

        const channel = guild.channels.cache.get(botData.channelId);
        if (!channel) {
            return setTimeout(connect, 5000);
        }

        try {
            connection = joinVoiceChannel({
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
                    if (connection) connection.destroy();
                    setTimeout(connect, 3000);
                }
            });

            console.log(`[🔊] تثبيت ناجح: (${botData.name}) ثابت في الروم: ${channel.name}`);
        } catch (error) {
            setTimeout(connect, 5000);
        }
    }

    client.once('ready', () => {
        console.log(`[+] متصل: ${client.user.tag} (${botData.name})`);
        connect();
    });

    // حماية داخلية خاصة بهذا البوت فقط بدون أي تداخل مع البوتات الثانية
    client.on('voiceStateUpdate', (oldState, newState) => {
        if (newState.member && newState.member.id === client.user.id) {
            if (newState.channelId !== botData.channelId) {
                setTimeout(() => {
                    if (connection) {
                        try { connection.destroy(); } catch (e) {}
                    }
                    connect();
                }, 1000);
            }
        }
    });

    client.login(token).catch(err => {
        console.error(`[-] خطأ تسجيل دخول ${botData.name}:`, err.message);
    });
}

const files = fs.readdirSync(projectDir)
    .filter(file => file.startsWith('bot') && file.endsWith('.json'))
    .sort();

if (files.length === 0) {
    console.error("[-] خطأ: لم يتم العثور على ملفات بوتات!");
    process.exit(1);
}

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
    }, index * 5000);
});
