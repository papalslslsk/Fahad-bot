const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const projectDir = __dirname;

function startBot(botData, fileName) {
    const token = botData.token;

    if (!token || token.includes("هنا")) {
        console.log(`[-] خطأ: التوكن غير مخزن بشكل صحيح في ملف ${fileName}!`);
        return;
    }

    if (!botData.channelId || !botData.guildId) {
        console.log(`[-] خطأ: بيانات الروم أو السيرفر ناقصة في ملف ${fileName}!`);
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

    // حماية إضافية: مراقبة حالة البوت لو حاول شخص نقله أو تحرك من رومه
    client.on('voiceStateUpdate', (oldState, newState) => {
        // إذا كان الحدث يخص هذا البوت نفسه
        if (newState.member.id === client.user.id) {
            // إذا طلع أو انتقل لروم غير رومه المخصص
            if (newState.channelId !== botData.channelId) {
                console.log(`[!] تنبيه: (${botData.name}) حاول الخروج أو الانتقال، جاري إعادته لرومه الأساسي...`);
                setTimeout(() => connectToVoiceChannel(client, botData), 1500);
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
    if (!channel) return console.log(`[-] الروم الصوتي غير موجود للبوت (${botData.name})! أيدي الروم: ${botData.channelId}`);

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

        console.log(`[🔊] تثبيت مؤكد: (${botData.name}) استقر حصرياً في الروم: ${channel.name}`);
    } catch (error) {
        console.error(`[-] خطأ في الاتصال للبوت (${botData.name}):`, error);
        setTimeout(() => connectToVoiceChannel(client, botData), 5000);
    }
}

const files = fs.readdirSync(projectDir)
    .filter(file => file.startsWith('bot') && file.endsWith('.json'))
    .sort();

if (files.length === 0) {
    console.error("[-] خطأ: لم يتم العثور على أي ملفات بوتات!");
    process.exit(1);
}

// التشغيل بفارق زمني 5 ثوانٍ بين كل بوت والثاني لمنع أي ضغط أو تعارض في الاتصال مع ديسكورد
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
    }, index * 5000); // 5 ثواني فاصل زمني آمن ومستقر جداً
});
