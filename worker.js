const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

const jsonFileName = process.argv[2];
if (!jsonFileName) {
    console.error("[-] لم يتم تمرير ملف JSON للعامل!");
    process.exit(1);
}

const filePath = path.join(__dirname, jsonFileName);
let botData;

try {
    botData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
    console.error(`[-] خطأ في قراءة الملف ${jsonFileName}:`, e.message);
    process.exit(1);
}

const token = process.env[botData.token] || botData.token;
if (!token || token.length < 50) {
    console.error(`[-] التوكن غير صالح لملف ${jsonFileName}`);
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

function connectVoice() {
    const guild = client.guilds.cache.get(botData.guildId);
    if (!guild) {
        return setTimeout(connectVoice, 5000);
    }

    const channel = guild.channels.cache.get(botData.channelId);
    if (!channel) {
        return setTimeout(connectVoice, 5000);
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
                setTimeout(connectVoice, 3000);
            }
        });

        console.log(`[🔊] النجاح الأسطوري: (${botData.name}) استقر في روم: ${channel.name}`);
    } catch (err) {
        setTimeout(connectVoice, 5000);
    }
}

client.once('ready', () => {
    console.log(`[+] اشتغل البوت بنجاح: ${client.user.tag} (${botData.name})`);
    connectVoice();
});

client.login(token).catch(err => {
    console.error(`[-] فشل تسديل الدخول لـ ${botData.name}:`, err.message);
    process.exit(1); // عشان يخليه يعيد المحاولة تلقائياً من الـ fork
});
