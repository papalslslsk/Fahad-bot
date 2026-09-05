const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = __dirname;

// قراءة ملفات الـ JSON الموجودة تلقائياً (من bot1.json إلى botX.json)
const botFiles = fs.readdirSync(projectDir)
    .filter(file => file.startsWith('bot') && file.endsWith('.json'))
    .sort();

if (botFiles.length === 0) {
    console.error("[-] خطأ: لم يتم العثور على أي ملفات بوتات JSON!");
    process.exit(1);
}

console.log(`[i] تم العثور على ${botFiles.length} بوتات. جاري إطلاقهم بعمليات منفصلة (Fork)...`);

function startBotProcess(jsonFile, index) {
    const workerScript = path.join(projectDir, 'worker.js');
    
    // نشغل ملف عامل (Worker) مستقل لكل بوت ونمرر له اسم ملف الـ JSON الخاص فيه
    const child = fork(workerScript, [jsonFile]);

    console.log(`🚀 تم إطلاق عملية البوت رقم [${index}]: ملف ${jsonFile}`);

    child.on('exit', (code) => {
        console.log(`⚠️ توقف البوت المرتبط بـ ${jsonFile} بررمز ${code}, جاري إعادة تشغيله تلقائياً...`);
        setTimeout(() => {
            startBotProcess(jsonFile, index);
        }, 5000);
    });

    child.on('error', (err) => {
        console.error(`❌ خطأ في عملية البوت ${jsonFile}:`, err);
    });
}

// إطلاق البوتات بفارق ثانيتين بينهم عشان ما يصير أي Rate Limit
botFiles.forEach((file, index) => {
    setTimeout(() => {
        startBotProcess(file, index + 1);
    }, index * 2000); // فاصل ثانيتين بين كل بوت والثاني
});
