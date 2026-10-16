// Общие списки «смотрим вместе».
// Владелец создаёт список и приглашает друзей. Любой участник добавляет фильмы
// и отмечает просмотренные; удалить фильм может тот, кто его добавил, или владелец.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const MAX_OWNED_LISTS = 20;
const MAX_MEMBERS = 10;
const MAX_ITEMS = 500;
const NAME_MAX = 60;

const userSelect = { id: true, username: true, avatar: true };

router.use(authMiddleware);

// id всех подтверждённых друзей пользователя
async function friendIdsOf(userId) {
  const rows = await prisma.friend.findMany({
    where: { status: 'accepted', OR: [{ userId }, { friendId: userId }] },
    select: { userId: true, friendId: true },
  });
  return new Set(rows.map((r) => (r.userId === userId ? r.friendId : r.userId)));
}

// Список, если пользователь в нём участвует; иначе null
async function findListForMember(listId, userId) {
  const membership = await prisma.sharedListMember.findUnique({
    where: { listId_userId: { listId, userId } },
    select: { list: { select: { id: true, name: true, ownerId: true } } },
  });
  return membership ? membership.list : null;
}

function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > NAME_MAX) return null;
  return name;
}

function shapeList(list, userId) {
  return {
    id: list.id,
    name: list.name,
    ownerId: list.ownerId,
    isOwner: list.ownerId === userId,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    members: list.members.map((m) => m.user),
    itemsCount: list._count?.items ?? list.items?.length ?? 0,
    preview: (list.items || []).slice(0, 4).map((i) => ({
      id: i.id,
      title: i.title,
      posterUrl: i.posterUrl,
    })),
  };
}

// Все списки, где пользователь участник
router.get('/', async (req, res) => {
  try {
    const lists = await prisma.sharedList.findMany({
      where: { members: { some: { userId: req.userId } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { orderBy: { createdAt: 'asc' }, select: { user: { select: userSelect } } },
        items: {
          where: { watched: false },
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: { id: true, title: true, posterUrl: true },
        },
        _count: { select: { items: true } },
      },
    });
    res.json(lists.map((l) => shapeList(l, req.userId)));
  } catch (error) {
    console.error('Ошибка загрузки общих списков:', error);
    res.status(500).json({ error: 'Не удалось загрузить общие списки' });
  }
});

// Создать список и сразу добавить выбранных друзей
router.post('/', async (req, res) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) {
      return res.status(400).json({ error: `Название от 1 до ${NAME_MAX} символов` });
    }

    const owned = await prisma.sharedList.count({ where: { ownerId: req.userId } });
    if (owned >= MAX_OWNED_LISTS) {
      return res.status(400).json({ error: `Можно создать не больше ${MAX_OWNED_LISTS} списков` });
    }

    const requested = Array.isArray(req.body?.memberIds)
      ? [...new Set(req.body.memberIds.filter((id) => typeof id === 'string'))]
      : [];
    const friends = await friendIdsOf(req.userId);
    const memberIds = requested.filter((id) => friends.has(id) && id !== req.userId);
    if (memberIds.length + 1 > MAX_MEMBERS) {
      return res.status(400).json({ error: `В списке может быть не больше ${MAX_MEMBERS} человек` });
    }

    const list = await prisma.sharedList.create({
      data: {
        name,
        ownerId: req.userId,
        members: {
          create: [req.userId, ...memberIds].map((userId) => ({ userId })),
        },
      },
      include: {
        members: { orderBy: { createdAt: 'asc' }, select: { user: { select: userSelect } } },
        _count: { select: { items: true } },
      },
    });
    res.status(201).json(shapeList(list, req.userId));
  } catch (error) {
    console.error('Ошибка создания общего списка:', error);
    res.status(500).json({ error: 'Не удалось создать список' });
  }
});

// Список с фильмами
router.get('/:id', async (req, res) => {
  try {
    const allowed = await findListForMember(req.params.id, req.userId);
    if (!allowed) return res.status(404).json({ error: 'Список не найден' });

    const list = await prisma.sharedList.findUnique({
      where: { id: req.params.id },
      include: {
        members: { orderBy: { createdAt: 'asc' }, select: { user: { select: userSelect } } },
        items: {
          orderBy: [{ watched: 'asc' }, { createdAt: 'desc' }],
          include: { addedBy: { select: userSelect } },
        },
      },
    });

    res.json({
      ...shapeList(list, req.userId),
      itemsCount: list.items.length,
      items: list.items.map((i) => ({
        id: i.id,
        tmdbId: i.tmdbId,
        mediaType: i.mediaType,
        title: i.title,
        posterUrl: i.posterUrl,
        releaseYear: i.releaseYear,
        watched: i.watched,
        createdAt: i.createdAt,
        addedBy: i.addedBy,
        canRemove: i.addedById === req.userId || list.ownerId === req.userId,
      })),
    });
  } catch (error) {
    console.error('Ошибка загрузки общего списка:', error);
    res.status(500).json({ error: 'Не удалось загрузить список' });
  }
});

// Переименовать (только владелец)
router.put('/:id', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    if (list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Переименовать список может только его создатель' });
    }
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: `Название от 1 до ${NAME_MAX} символов` });

    await prisma.sharedList.update({ where: { id: list.id }, data: { name } });
    res.json({ success: true, name });
  } catch (error) {
    console.error('Ошибка переименования списка:', error);
    res.status(500).json({ error: 'Не удалось переименовать список' });
  }
});

// Удалить список (только владелец)
router.delete('/:id', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    if (list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Удалить список может только его создатель' });
    }
    await prisma.sharedList.delete({ where: { id: list.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления списка:', error);
    res.status(500).json({ error: 'Не удалось удалить список' });
  }
});

// Выйти из списка (участник, не владелец)
router.post('/:id/leave', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    if (list.ownerId === req.userId) {
      return res.status(400).json({ error: 'Создатель не может выйти из списка, только удалить его' });
    }
    await prisma.sharedListMember.delete({
      where: { listId_userId: { listId: list.id, userId: req.userId } },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка выхода из списка:', error);
    res.status(500).json({ error: 'Не удалось выйти из списка' });
  }
});

// Пригласить друга (только владелец, только своего друга)
router.post('/:id/members', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    if (list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Приглашать может только создатель списка' });
    }
    const { userId } = req.body || {};
    const friends = await friendIdsOf(req.userId);
    if (typeof userId !== 'string' || !friends.has(userId)) {
      return res.status(400).json({ error: 'Пригласить можно только друга' });
    }
    const count = await prisma.sharedListMember.count({ where: { listId: list.id } });
    if (count >= MAX_MEMBERS) {
      return res.status(400).json({ error: `В списке может быть не больше ${MAX_MEMBERS} человек` });
    }
    await prisma.sharedListMember.upsert({
      where: { listId_userId: { listId: list.id, userId } },
      update: {},
      create: { listId: list.id, userId },
    });
    await prisma.sharedList.update({ where: { id: list.id }, data: { updatedAt: new Date() } });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Ошибка приглашения в список:', error);
    res.status(500).json({ error: 'Не удалось пригласить друга' });
  }
});

// Убрать участника (только владелец)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    if (list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Убирать участников может только создатель списка' });
    }
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Нельзя убрать себя из своего списка' });
    }
    await prisma.sharedListMember.deleteMany({
      where: { listId: list.id, userId: req.params.userId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления участника:', error);
    res.status(500).json({ error: 'Не удалось убрать участника' });
  }
});

// Добавить фильм (любой участник)
router.post('/:id/items', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });

    const { tmdbId, title, posterUrl } = req.body || {};
    const mediaType = req.body?.mediaType === 'tv' ? 'tv' : 'movie';
    if (!Number.isInteger(tmdbId)) {
      return res.status(400).json({ error: 'Неверный идентификатор фильма' });
    }
    if (typeof title !== 'string' || title.trim() === '' || title.length > 300) {
      return res.status(400).json({ error: 'Неверное название' });
    }
    const year = Number(req.body?.releaseYear);
    const releaseYear = Number.isInteger(year) && year >= 1870 && year <= 2100 ? year : null;

    const count = await prisma.sharedListItem.count({ where: { listId: list.id } });
    if (count >= MAX_ITEMS) {
      return res.status(400).json({ error: `В списке может быть не больше ${MAX_ITEMS} фильмов` });
    }

    const exists = await prisma.sharedListItem.findUnique({
      where: { listId_tmdbId_mediaType: { listId: list.id, tmdbId, mediaType } },
      select: { id: true },
    });
    if (exists) return res.status(409).json({ error: 'Этот фильм уже есть в списке' });

    const item = await prisma.sharedListItem.create({
      data: {
        listId: list.id,
        tmdbId,
        mediaType,
        title: title.trim(),
        posterUrl: typeof posterUrl === 'string' && posterUrl.length <= 500 ? posterUrl : null,
        releaseYear,
        addedById: req.userId,
      },
    });
    await prisma.sharedList.update({ where: { id: list.id }, data: { updatedAt: new Date() } });
    res.status(201).json(item);
  } catch (error) {
    console.error('Ошибка добавления в общий список:', error);
    res.status(500).json({ error: 'Не удалось добавить фильм' });
  }
});

// Отметить просмотренным или вернуть (любой участник)
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    if (typeof req.body?.watched !== 'boolean') {
      return res.status(400).json({ error: 'Нужно поле watched' });
    }
    const result = await prisma.sharedListItem.updateMany({
      where: { id: req.params.itemId, listId: list.id },
      data: { watched: req.body.watched },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Фильм не найден' });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка обновления фильма в списке:', error);
    res.status(500).json({ error: 'Не удалось обновить фильм' });
  }
});

// Убрать фильм (кто добавил, или владелец)
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const list = await findListForMember(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Список не найден' });
    const item = await prisma.sharedListItem.findFirst({
      where: { id: req.params.itemId, listId: list.id },
      select: { id: true, addedById: true },
    });
    if (!item) return res.status(404).json({ error: 'Фильм не найден' });
    if (item.addedById !== req.userId && list.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Убрать фильм может тот, кто его добавил, или создатель списка' });
    }
    await prisma.sharedListItem.delete({ where: { id: item.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления фильма из списка:', error);
    res.status(500).json({ error: 'Не удалось убрать фильм' });
  }
});

module.exports = router;
