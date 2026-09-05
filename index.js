const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

// الأيدي الثابت للسيرفر
const GUILD_ID = process.env.GUILD_ID || '1545708846553501768';

// قائمة البوتات الـ 8 مع أيديات روماتها والمتغير الخاص بكل توكن في ريلواي
const botsConfig = [
    { name: "Bot 1", tokenKey: "TOKEN_1", channelId: "1545708848575156265" },
    { name: "Bot 2", tokenKey: "TOKEN_2", channelId: "1545708848575156266" },
    { name: "Bot 3", tokenKey: "TOKEN_3", channelId: "1545708848575156267" },
    { name: "Bot 4", tokenKey: "TOKEN_4", channelId: "1545708848575156268" },
    { name: "Bot 5", tokenKey: "TOKEN_5", channelId: "1545708848575156269" },
    { name: "Bot 6", tokenKey: "TOKEN_6", channelId: "1545902045784183004" },
    { name: "Bot 7", tokenKey: "TOKEN_7", channelId: "1545902174255456317" },
    { name: "Bot 8", tokenKey: "TOKEN_8", channelId: "1545902268316909628" }
];

function startBot(config) {
    const token = process.env[config.tokenKey];
    if (!token) {
        console.log(`[-] تنبيه: المتغير ${config.tokenKey} غير موجود في ريلواي، تم تخطي ${config.name}`);
        return;
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    client.once('ready', () => {
        console.log(`[+] تم تشغيل: ${client.user.tag} (${config.name})`);
        connectToVoiceChannel(client, config);
    });

    client.login(token);
}

function connectToVoiceChannel(client, config) {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return console.log(`[-] السيرفر غير موجود للبوت (${config.name})!`);

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel) return console.log(`[-] الروم الصوتي غير موجود للبوت (${config.name})!`);

    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        // حماية تامة ضد الخروج وإعادة الاتصال التلقائي
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                setTimeout(() => connectToVoiceChannel(client, config), 5000);
            }
        });

        console.log(`[🔊] (${config.name}) ثبت في الروم: ${channel.name} بنجاح 24/7`);
    } catch (error) {
        console.error(`[-] خطأ في اتصال الروم للبوت (${config.name}):`, error);
        setTimeout(() => connectToVoiceChannel(client, config), 10000);
    }
}

// تشغيل البوتات الموجودة تباعاً
botsConfig.forEach(bot => {
    startBot(bot);
});
