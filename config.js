// === DRAGON BOT CONFIG ===
global.mess = {
  wait: '⏳ Sedang diproses...',
  error: '❌ Terjadi kesalahan!',
  success: '✅ Berhasil!',
  notStarted: '⚠️ Kirim *"/start"* dulu untuk memulai!',
  notVerified: '🔐 Kamu belum terverifikasi!\nKirim code yang diberikan owner.',
  blocked: '🚫 Akun diblokir! 3x gagal verifikasi.',
  ownerOnly: '👑 Fitur owner only!',
  userOnly: '👤 Fitur user only!',
  invalidCmd: '❌ Perintah tidak dikenal!',
  cancelled: '❌ Dibatalkan!',
  welcome: '👋 Selamat datang di *DRAGON BOT*!',
  maxAttempts: '⚠️ Sisa percobaan: ',
  invalidCode: '❌ Code salah!'
}

// Owner number - langsung akses tanpa verifikasi
global.owner = ['628978116653']

// Prefix hanya "/"
global.prefix = ['/']

// Bot hanya di private chat
global.privateOnly = true

// Path gambar bot
global.image = './media/bot-image.jpg'
global.menuImage = './media/menu.jpg'
global.thumb = './media/thumb.jpg'

// Sistem verifikasi
global.auth = {
  maxAttempts: 3,
  codeFormat: 'DRGN',
  codeLength: 4,
  codeSuffix: '25'
}

// Emoji untuk spam
global.defaultEmojis = ['😂', '❤️', '👍', '🎉', '🔥', '👏', '⭐', '💯', '🤩', '🚀']