/*
  🐉 DRAGON BOT - WhatsApp Bot dengan Sistem Verifikasi
*/

import './config.js';
import fs from 'fs';
import chalk from 'chalk';
import moment from 'moment-timezone';
import Database from './database.js';

export default async function handler(riz, m) {
  const msg = m.messages[0];
  if (!msg.message) return;

  let body = msg.message.conversation ||
             msg.message.extendedTextMessage?.text ||
             msg.message.imageMessage?.caption ||
             msg.message.videoMessage?.caption || '';

  function CleanJid(msg) {
    const raw = msg?.key?.participantAlt || 
                msg?.key?.participant || 
                msg.key.remoteJid || '';
    return (raw.split(':')[0]?.split('@')[0] || '') + '@s.whatsapp.net';
  }

  const id = msg.key.remoteJid;
  const sender = CleanJid(msg);
  const pushname = msg.pushName || "Unknown";
  const isGroup = id.endsWith("@g.us");
  
  if (global.privateOnly && isGroup) return;

  const isOwner = global.owner.includes(sender.split('@')[0]) || msg?.key?.fromMe === true;
  const userSession = Database.getUserSession(sender);
  const isVerified = Database.isVerified(sender);
  const isBlocked = Database.isBlocked(sender);
  
  const reply = (text) => riz.sendMessage(id, { text }, { quoted: msg });

  console.log(chalk.bold.blue("\n📩 PESAN MASUK!"));
  console.log(chalk.gray("────────────────────────────"));
  console.log(chalk.cyan("ID       :"), chalk.white(id));
  console.log(chalk.magenta("Sender   :"), chalk.white(sender));
  console.log(chalk.yellow("Verified :"), chalk.white(isVerified));
  console.log(chalk.red("Blocked  :"), chalk.white(isBlocked));
  console.log(chalk.green("Pushname :"), chalk.white(pushname));
  console.log(chalk.cyan("Body     :"), chalk.white(body));
  console.log(chalk.gray("────────────────────────────\n"));

  const usedPrefix = global.prefix.find(p => body.startsWith(p));
  
  if (!usedPrefix) {
    if (userSession.awaitingCode && !isVerified && !isOwner) {
      const code = body.trim();
      const validCode = Database.verifyCode(code);
      
      if (validCode) {
        Database.useCode(code, sender);
        Database.addUser(sender);
        Database.clearUserSession(sender);
        await sendMenu();
        return;
      } else {
        const attempts = Database.incrementAttempts(sender);
        const remaining = 3 - attempts;
        
        if (remaining <= 0) {
          await reply(`${global.mess.blocked}\nKamu telah 3x gagal verifikasi.`);
          Database.clearUserSession(sender);
          return;
        }
        
        await reply(`${global.mess.invalidCode}\n${global.mess.maxAttempts} ${remaining}x`);
        return;
      }
    }
    
    if (userSession.awaitingChannelUrl && isVerified) {
      const url = body.trim();
      if (!url.includes('whatsapp.com/channel/')) {
        await reply('❌ URL channel tidak valid!\nFormat: https://whatsapp.com/channel/...');
        return;
      }
      
      Database.setUserSession(sender, {
        awaitingChannelUrl: false,
        channelUrl: url,
        awaitingEmojiType: true
      });
      
      await reply(
        '🎭 Pilih tipe emoji:\n\n' +
        '1. Random (bot pilih random dari emoji default)\n' +
        '2. Custom (kirim emoji kamu)\n\n' +
        'Balas dengan angka 1 atau 2\n' +
        'Atau ketik /cancel untuk batal'
      );
      return;
    }
    
    if (userSession.awaitingEmojiType && isVerified) {
      const choice = body.trim();
      if (choice === '1') {
        Database.setUserSession(sender, {
          awaitingEmojiType: false,
          emojiType: 'random',
          awaitingEmojiInput: false
        });
        
        await reply(
          '🎯 Emoji tipe: *RANDOM*\n\n' +
          'Bot akan menggunakan emoji default:\n' +
          '😂 ❤️ 👍 🎉 🔥 👏 ⭐ 💯 🤩 🚀\n\n' +
          'Ketik */spam* untuk mulai\n' +
          'Ketik */cancel* untuk batal'
        );
      } else if (choice === '2') {
        Database.setUserSession(sender, {
          awaitingEmojiType: false,
          emojiType: 'custom',
          awaitingEmojiInput: true
        });
        
        await reply(
          '🎨 Kirim emoji custom kamu\n\n' +
          'Format: tanpa spasi, hanya koma\n' +
          'Contoh: 😂,❤️,👍,🎉\n\n' +
          'Maximal 10 emoji\n' +
          'Ketik /cancel untuk batal'
        );
      } else {
        await reply('❌ Pilih 1 atau 2 saja!');
      }
      return;
    }
    
    if (userSession.awaitingEmojiInput && isVerified) {
      const emojis = body.trim().split(',');
      
      if (emojis.length > 10) {
        await reply('❌ Maximal 10 emoji!');
        return;
      }
      
      const validEmojis = emojis.filter(e => {
        const regex = /(\p{Emoji}|\u200D)/gu;
        return regex.test(e);
      });
      
      if (validEmojis.length === 0) {
        await reply('❌ Tidak ada emoji valid! Kirim emoji saja.');
        return;
      }
      
      Database.setUserSession(sender, {
        awaitingEmojiInput: false,
        customEmojis: validEmojis
      });
      
      await reply(
        `✅ Emoji diterima: ${validEmojis.join(' ')}\n\n` +
        'Ketik */spam* untuk mulai spam\n' +
        'Ketik */cancel* untuk batal'
      );
      return;
    }
    
    if (userSession.awaitingDeleteUser && isOwner) {
      const number = body.trim();
      const jid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      
      if (Database.deleteUser(jid)) {
        await reply(`✅ User ${number} berhasil dihapus!`);
      } else {
        await reply('❌ User tidak ditemukan!');
      }
      
      Database.clearUserSession(sender);
      return;
    }
    
    return;
  }

  const bodyWithoutPrefix = body.slice(usedPrefix.length);
  const args = bodyWithoutPrefix.trim().split(' ');
  const command = args.shift().toLowerCase();
  const q = args.join(' ');

  if (command === 'cancel') {
    Database.clearUserSession(sender);
    await reply(global.mess.cancelled);
    return;
  }

  if (command === 'start') {
    Database.clearUserSession(sender);
    
    if (isOwner) {
      Database.addUser(sender);
      await sendMenu();
      return;
    }
    
    if (isBlocked) {
      await reply(global.mess.blocked);
      return;
    }
    
    if (isVerified) {
      await sendMenu();
      return;
    }
    
    Database.setUserSession(sender, { awaitingCode: true });
    
    await reply(
      '🔐 *VERIFIKASI DIBUTUHKAN*\n\n' +
      'Setelah pesan ini dikirim, kirim code yang diberikan owner *tanpa diubah-ubah*.\n' +
      'Contoh: DRGN123425\n\n' +
      `*Max ${global.auth.maxAttempts}x percobaan* jika gagal akan otomatis diblokir.\n\n` +
      'Owner: 628978116653'
    );
    return;
  }

  if (!isOwner && !isVerified) {
    await reply(global.mess.notVerified);
    return;
  }

  if (isBlocked) {
    await reply(global.mess.blocked);
    return;
  }

  if (command === 'menu') {
    await sendMenu();
    return;
  }

  if (command === 'spamemoji') {
    if (!isVerified && !isOwner) {
      await reply(global.mess.userOnly);
      return;
    }
    
    Database.setUserSession(sender, {
      awaitingChannelUrl: true,
      command: 'spamemoji'
    });
    
    await reply(
      '📢 *SPAM EMOJI DI CHANNEL*\n\n' +
      'Masukkan URL channel yang ingin di-spam:\n' +
      'Contoh: https://whatsapp.com/channel/xxxxxxxxxx\n\n' +
      'Ketik /cancel untuk batal'
    );
    return;
  }

  if (command === 'spam') {
    if (!isVerified && !isOwner) return;
    
    const session = Database.getUserSession(sender);
    if (!session.channelUrl) {
      await reply('❌ Kamu belum setup spam!\nGunakan /spamemoji dulu');
      return;
    }
    
    await reply('⏳ Memulai spam emoji...');
    
    const emojis = session.emojiType === 'random' 
      ? global.defaultEmojis 
      : session.customEmojis || global.defaultEmojis;
    
    let spamCount = 0;
    for (let i = 0; i < 5; i++) {
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      spamCount++;
      
      try {
        await riz.sendMessage(id, { 
          text: `[SPAM ${spamCount}] ${randomEmoji}\nChannel: ${session.channelUrl}` 
        });
      } catch (error) {
        console.error('Spam error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await reply(`✅ Spam selesai! ${spamCount}x emoji terkirim.`);
    Database.clearUserSession(sender);
    return;
  }

  if (command === 'create') {
    if (!isOwner) {
      await reply(global.mess.ownerOnly);
      return;
    }
    
    const code = Database.generateCode();
    
    await reply(
      `✅ *CODE BARU DIBUAT*\n\n` +
      `📝 Code: *${code}*\n` +
      `📅 Created: ${moment().format('DD/MM/YYYY HH:mm:ss')}\n\n` +
      `Kirim code ini ke user untuk verifikasi.\n` +
      `*1 code hanya untuk 1 user.*`
    );
    return;
  }

  if (command === 'cekuser') {
    if (!isOwner) {
      await reply(global.mess.ownerOnly);
      return;
    }
    
    const users = Database.getAllUsers();
    
    if (users.length === 0) {
      await reply('📭 Tidak ada user terdaftar.');
      return;
    }
    
    let userList = `👥 *DAFTAR USER* (${users.length} user)\n\n`;
    
    users.forEach((user, index) => {
      userList += `${index + 1}. ${user.number}\n`;
      userList += `   📅 ${moment(user.verifiedAt).format('DD/MM/YY HH:mm')}\n`;
      if (user.status === 'blocked') userList += `   🚫 BLOKIR\n`;
      userList += '\n';
    });
    
    await reply(userList);
    return;
  }

  if (command === 'deluser') {
    if (!isOwner) {
      await reply(global.mess.ownerOnly);
      return;
    }
    
    if (!q) {
      Database.setUserSession(sender, { awaitingDeleteUser: true });
      await reply(
        '👤 *HAPUS USER*\n\n' +
        'Masukkan nomor user yang ingin dihapus:\n' +
        'Contoh: 628123456789\n\n' +
        'Ketik /cancel untuk batal'
      );
      return;
    }
    
    const jid = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    if (Database.deleteUser(jid)) {
      await reply(`✅ User ${q} berhasil dihapus!`);
    } else {
      await reply('❌ User tidak ditemukan!');
    }
    return;
  }

  await reply(global.mess.invalidCmd);

  async function sendMenu() {
    const menuImage = fs.existsSync(global.menuImage) 
      ? fs.readFileSync(global.menuImage) 
      : null;
    
    const menuText = `
🐉 *DRAGON BOT*

╭─「 👤 USER MENU 」
├ /menu - Tampilkan menu
├ /spamemoji - Spam emoji di channel
╰─

╭─「 👑 OWNER MENU 」
├ /create - Buat code verifikasi
├ /cekuser - Cek semua user
├ /deluser - Hapus user
╰─

📌 *NOTE:*
- Bot hanya bekerja di private chat
- Owner: 628978116653
- 1 code = 1 user
- Max 3x gagal verifikasi = BLOKIR

© Dragon Team 2024
    `.trim();

    if (menuImage) {
      await riz.sendMessage(id, {
        image: menuImage,
        caption: menuText,
        footer: "Powered by Baileys",
        contextInfo: {
          mentionedJid: [sender],
          externalAdReply: {
            title: "DRAGON BOT",
            body: "WhatsApp Bot dengan Sistem Verifikasi",
            thumbnail: fs.existsSync(global.thumb) ? fs.readFileSync(global.thumb) : null,
            sourceUrl: "https://github.com",
            mediaType: 1
          }
        }
      }, { quoted: msg });
    } else {
      await reply(menuText);
    }
  }
}