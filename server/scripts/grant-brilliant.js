// Разовая выдача подписки Brilliant всем существующим пользователям, кроме исключений.
// Запуск из папки server (сначала без --apply, чтобы посмотреть, кого затронет):
//   node scripts/grant-brilliant.js
//   node scripts/grant-brilliant.js --apply
const { PrismaClient } = require('@prisma/client');

const EXCLUDE = ['zopo1234'];
const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({ select: { id: true, username: true, plan: true } });
  const excluded = users.filter((u) => EXCLUDE.includes(u.username));
  const targets = users.filter((u) => !EXCLUDE.includes(u.username) && u.plan !== 'brilliant');

  console.log(`Всего пользователей: ${users.length}`);
  console.log(`Не трогаем: ${excluded.map((u) => u.username).join(', ') || 'никого не нашли по нику'}`);
  console.log(`Получат Brilliant: ${targets.length}`);

  if (!apply) {
    console.log('Это пробный запуск. Чтобы выдать подписку, добавь --apply');
    return;
  }
  const result = await prisma.user.updateMany({
    where: { username: { notIn: EXCLUDE }, plan: { not: 'brilliant' } },
    data: { plan: 'brilliant' },
  });
  console.log(`Готово: Brilliant выдан ${result.count} пользователям`);
})()
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
