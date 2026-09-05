const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const config = require('./config.json');

if (!config.bots || config.bots.length === 0) {
    console.error("[-] خطأ: لا توجد بوتات مسجلة في ملف config.json");
    process.exit(1);
}

// دالة لتشغيل كل بوت بشكل مستقل داخل نفس المشروع
function startBot(botData) {
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

    client.login(botData.token);
}

function connectToVoiceChannel(client, botData) {
    const guild = client.guilds.cache.get(config.guildId);
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

        // حماية تامة: إعادة الاتصال فوراً لو فصل البوت
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
        console.error(`[-] خطأ في اتصال البوت (${botData.name}):`, error);
        setTimeout(() => connectToVoiceChannel(client, botData), 10000);
    }
}

// تشغيل جميع البوتات الموجودة في القائمة دفعة واحدة
config.bots.forEach(botData => {
    startBot(botData);
});
