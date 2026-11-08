// All landing-page copy, numbers, links and media slots live here, so
// filling in real content never means touching layout code.
//
// Anything marked TODO is a placeholder: replace it with GO DEUNOTEU's real
// content before launch. Media fields (`imageSrc`, `avatarSrc`, …) are empty
// on purpose; leaving them empty renders a labelled placeholder box.

export const BRAND = {
  name: 'GO DEUNOTEU',
}

export const HERO = {
  lines: ['Kartu Aikatsu', '& merch Jepang,', 'lebih dekat ke kamu.'],
  body:
    'Jajan kartu, ganci, dan merch Aikatsu dari Mercari Jepang bareng-bareng biar harganya lebih ramah. ' +
    'Rincian biayanya terbuka dari awal, dan progres pesananmu bisa kamu pantau sendiri kapan saja.',
}

// Featured carousel in the hero (auto-advances every 5 s).
// TODO: real featured batches; set imageSrc to each batch's cover photo.
export const HIGHLIGHTS: Array<{ title: string; caption: string; href: string; imageSrc?: string }> = [
  { title: '[Judul batch unggulan 1]', caption: 'Mulai Rp —', href: '/id?tab=order' },
  { title: '[Judul batch unggulan 2]', caption: 'Mulai Rp —', href: '/id?tab=order' },
  { title: '[Judul batch unggulan 3]', caption: 'Mulai Rp —', href: '/id?tab=order' },
]

// Row under the carousel. TODO: real count + thumbnails.
export const HIGHLIGHT_ROW = {
  label: '[N] batch lainnya sedang dibuka',
  href: '/id?tab=order',
  thumbnailSrcs: [undefined, undefined, undefined] as Array<string | undefined>,
}

// TODO: replace every value with a figure GO DEUNOTEU can back up.
export const STATS: Array<{ value: string; label: string }> = [
  { value: '000+', label: 'Pesanan selesai' },
  { value: '000+', label: 'Testimoni pembeli' },
  { value: '20XX', label: 'Berdiri sejak' },
  { value: '0.0', label: 'Rating pembeli' },
]

export const ABOUT = {
  eyebrow: 'Tentang kami',
  title: 'Group order kartu dan merch Aikatsu dari Jepang.',
  body:
    'Kami bantu kamu jajan dari Mercari Jepang tanpa ribet: admin yang beli, barang dikumpulkan per batch dan box, ' +
    'lalu dikirim ke Indonesia. Posisi barang, tagihan, dan pajak bisa kamu cek sendiri di sini tanpa perlu chat admin dulu. ' +
    '[TODO: sesuaikan dengan cerita GO DEUNOTEU]',
}

// TODO: real profile URLs. `kind` picks the icon.
export const SOCIALS: Array<{ kind: 'line' | 'x' | 'instagram' | 'shop'; title: string; href: string }> = [
  { kind: 'line', title: 'LINE', href: '#' },
  { kind: 'x', title: 'X', href: '#' },
  { kind: 'instagram', title: 'Instagram', href: '#' },
  { kind: 'shop', title: 'Toko', href: '#' },
]

// TODO: real admin team. lineHref = each admin's LINE profile link.
export const ADMINS: Array<{ name: string; role: string; bio: string; lineHref: string; avatarSrc?: string }> = [
  {
    name: 'Nama Admin',
    role: 'Admin Order',
    bio: '[Perkenalan singkat admin — apa yang bisa dibantu dan kapan bisa dihubungi.]',
    lineHref: '#',
  },
  {
    name: 'Nama Admin',
    role: 'Admin Pembayaran',
    bio: '[Perkenalan singkat admin — apa yang bisa dibantu dan kapan bisa dihubungi.]',
    lineHref: '#',
  },
  {
    name: 'Nama Admin',
    role: 'Admin Pengiriman',
    bio: '[Perkenalan singkat admin — apa yang bisa dibantu dan kapan bisa dihubungi.]',
    lineHref: '#',
  },
]

export const TESTIMONIALS_SECTION = {
  eyebrow: 'Testimoni',
  title: 'Kata mereka yang sudah jajan.',
  body: 'Foto asli dari pembeli, dikirim langsung begitu paketnya sampai.',
  seeAllLabel: 'Lihat semua testimoni',
  seeAllHref: '#', // TODO: testimonial page
}

// TODO: real buyer testimonials. `photoRatio` only shapes the placeholder
// (width / height) so the masonry wall looks like it will with real photos;
// set photoSrc and it is ignored. Leave photo out for a text-only card.
export const TESTIMONIALS: Array<{
  text: string
  name: string
  photo?: { photoSrc?: string; photoRatio: number }
}> = [
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 3 / 4 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 1 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 4 / 5 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 1 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 3 / 4 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 4 / 3 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 1 } },
  { text: '[Testimoni pembeli]', name: 'Nama Pembeli', photo: { photoRatio: 4 / 5 } },
  { text: '[Testimoni pembeli tanpa foto — tampil dengan tanda kutip]', name: 'Nama Pembeli' },
]

export const REVIEW_PROMPT = {
  title: `Gimana jajanmu di ${BRAND.name}?`,
  body: 'Kasih bintang, ceritakan pengalamanmu.',
  reward: '[Hadiah ulasan]', // TODO: remove the pill if there is no reward
  hint: 'Ketuk bintang untuk mulai',
  starLabels: ['Kurang', 'Biasa aja', 'Lumayan', 'Bagus', 'Suka banget'],
  href: (stars: number) => `#ulasan-${stars}`, // TODO: review form
}

// Floating "CS" button options.
export const CS_OPTIONS = {
  chatAdminLabel: 'Chat admin',
  chatAdminHref: '#', // TODO: LINE OpenChat / admin link
}
