const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const projectDir = __dirname;

const files = fs.readdirSync(projectDir)
    .filter(file => file.startsWith('bot') && file.endsWith('.json'))
    .sort();

if (files.length === 0) {
    console.error("[-] خطأ: لم يتم العثور على ملفات بوتات!");
    process.exit(1);
}

console.log(`[i] جاري تشغيل ${files.length} بوتات بشكل متسلسل ومستقر...`);

files.forEach((file, index) => {
    setTimeout(() => {
        try {
            const filePath = path.join(projectDir, file);
            const botData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const token = process.env[botData.token] || botData.token;
            if (!token || token.length < 50) {
                console.log(`[-] خطأ في توكن ${file}`);
                return;
            }

            const client = new Client({
                intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
            });

            client.on('ready', () => {
                console.log(`[+] تم تشغيل البوت: ${client.user.tag} (${botData.name})`);
                connect(client, botData);
            });

            client.login(token).catch(err => {
                console.error(`[-] خطأ تسجيل دخول ${botData.name}:`, err.message);
            });

        } catch (e) {
            console.error(`[-] خطأ في تشغيل ${file}:`, e.message);
        }
    }, index * 8000); // 8 ثوانٍ كاملة بين كل بوت والثاني لضمان استقرار تام وعدم انهيار الحاوية
});

function connect(client, botData) {
    const guild = client.guilds.cache.get(botData.guildId);
    if (!guild) return setTimeout(() => connect(client, botData), 5000);

    const channel = guild.channels.cache.get(botData.channelId);
    if (!channel) return setTimeout(() => connect(client, botData), 5000);

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
                setTimeout(() => connect(client, botData), 3000);
            }
        });

        console.log(`[🔊] تثبيت ناجح: (${botData.name}) دخل روم: ${channel.name}`);
    } catch (error) {
        setTimeout(() => connect(client, botData), 5000);
    }
}
