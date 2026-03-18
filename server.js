const express = require('express');
const path = require('path');
const sequelize = require('./db');
const { DataTypes } = require('sequelize');
const Place = require('./models/Place');
const { Route } = require('./models/Route');
const session = require('express-session');
const User = require('./models/User');
const UserAlias = require('./models/UserAlias');
const Visit = require('./models/Visit');
const { ensureSeedData } = require('./db/seed-data');


const app = express();
const PORT = process.env.PORT || 3000;

// Настройка EJS как view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'citivoice-secret-key-2026',
  resave: false,
  saveUninitialized: false
}));

app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    req.user = await User.findByPk(req.session.userId);
    res.locals.user = req.user;
    if (req.user) {
      const expForNextLevel = req.user.level * 100;
      const currentLevelExp = (req.user.level - 1) * 100;
      const progress = req.user.exp - currentLevelExp;
      res.locals.nextRankExp = expForNextLevel - req.user.exp;
      res.locals.progressPercent = (progress / 100) * 100;
    }
  } else {
    res.locals.user = null;
    res.locals.nextRankExp = 100;
    res.locals.progressPercent = 0;
  }
  next();
});


function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin') return res.status(403).render('403');
  next();
}

function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}


// AUTH
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';

    if (!isValidEmail(email)) {
      return res.render('register', { error: 'Введите корректный email' });
    }

    if (username.length < 3 || username.length > 32) {
      return res.render('register', { error: 'Имя пользователя должно быть от 3 до 32 символов' });
    }

    if (!password || password.length < 4) {
      return res.render('register', { error: 'Пароль должен быть не короче 4 символов' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.render('register', { error: 'Пользователь с таким email уже существует' });

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.render('register', { error: 'Пользователь уже существует' });

    const existingAlias = await UserAlias.findOne({ where: { alias: username } });
    if (existingAlias) return res.render('register', { error: 'Этот логин уже занят' });

    const user = await User.create({ email, username, password });
    req.session.userId = user.id;
    res.redirect('/');
  } catch (e) {
    res.render('register', { error: 'Ошибка регистрации' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const emailOrLogin = (req.body.email || '').trim();
    const normalizedEmail = normalizeEmail(emailOrLogin);
    const password = req.body.password || '';

    if (!emailOrLogin || !password) {
      return res.render('login', { error: 'Введите email и пароль' });
    }

    let user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await User.findOne({ where: { username: emailOrLogin } });
    }
    if (!user) {
      const aliasRecord = await UserAlias.findOne({ where: { alias: emailOrLogin } });
      if (aliasRecord) {
        user = await User.findByPk(aliasRecord.UserId);
      }
    }

    if (!user || !(await user.validPassword(password))) {
      return res.render('login', { error: 'Неверный email (или логин) или пароль' });
    }
    req.session.userId = user.id;
    res.redirect('/');
  } catch (e) {
    res.render('login', { error: 'Ошибка входа' });
  }
});

app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  res.redirect('/');
});

app.get('/profile', requireAuth, (req, res) => {
  const expForNextLevel = req.user.level * 100;
  const currentLevelExp = (req.user.level - 1) * 100;
  const progress = req.user.exp - currentLevelExp;
  const nextRankExp = expForNextLevel - req.user.exp;
  const progressPercent = (progress / 100) * 100;

  res.render('profile', { nextRankExp, progressPercent });
});

// API for EXP gain
app.post('/api/user/exp', requireAuth, async (req, res) => {

  const { expEarned } = req.body;
  let newExp = req.user.exp + Number(expEarned);
  const newLevel = Math.floor(newExp / 100) + 1;

  req.user.exp = newExp;
  req.user.level = newLevel;
  await req.user.save();

  res.json({ success: true, level: newLevel, exp: newExp });
});

app.get('/', async (req, res) => {
  const popularPlaces = await Place.findAll({ limit: 4 });
  res.render('index', { title: 'CitiVoice - Interactive City Map', popularPlaces });
});

app.get('/game', (req, res) => {
  res.render('game');
});

app.get('/map', (req, res) => { res.render('map'); });

// Страница всех мест (каталог)
app.get('/places', async (req, res) => {
  const places = await Place.findAll();
  res.render('places', { places });
});

// Страница одного места
app.get('/place/:id', async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (!place) return res.status(404).send('Место не найдено');
  res.render('place', { place });
});

// API: получить все места
app.get('/api/places', async (req, res) => {
  const { category } = req.query;
  const where = category ? { category } : {};
  const places = await Place.findAll({ where });
  res.json(places);
});

// API: получить одно место
app.get('/api/places/:id', async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (!place) return res.status(404).json({ error: 'Не найдено' });
  res.json(place);
});


app.post('/api/places/:id/visit', requireAuth, async (req, res) => {
  try {
    const placeId = req.params.id;
    const userId = req.user.id;

    const existing = await Visit.findOne({ where: { PlaceId: parseInt(placeId, 10), UserId: parseInt(userId, 10) } });
    if (existing) {
      return res.status(400).json({ error: 'Вы уже отмечали это место!' });
    }

    await Visit.create({ PlaceId: parseInt(placeId, 10), UserId: parseInt(userId, 10) });

    req.user.exp += 50;
    req.user.level = Math.floor(req.user.exp / 100) + 1;
    await req.user.save();

    res.json({ success: true, message: 'Место отмечено как посещенное, +50 EXP!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/routes', async (req, res) => {
  const routes = await Route.findAll();
  res.render('routes', { routes });
});

app.get('/routes/:id', async (req, res) => {
  const route = await Route.findByPk(req.params.id, {
    include: [{
      model: Place,
      as: 'places',
      through: { attributes: ['order'] }
    }],
    order: [
      [{ model: Place, as: 'places' }, Route.sequelize.models.RoutePlace, 'order', 'ASC']
    ]
  });

  if (!route) return res.status(404).send('Маршрут не найден');

  res.render('route', { route });
});

app.get('/admin', requireAdmin, async (req, res) => {
  const placesCount = await Place.count();
  const routesCount = await Route.count();
  const usersCount = await User.count();
  res.render('admin/index', { placesCount, routesCount, usersCount });
});

// --- Места ---
app.get('/admin/places', requireAdmin, async (req, res) => {
  const places = await Place.findAll({ order: [['id', 'ASC']] });
  res.render('admin/places', { places });
});

app.get('/admin/places/new', requireAdmin, (req, res) => {
  res.render('admin/place-form', { place: null, error: null });
});

app.post('/admin/places/new', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, lat, lng, city, image } = req.body;
    await Place.create({ title, description, category, lat: parseFloat(lat), lng: parseFloat(lng), city, image });
    res.redirect('/admin/places');
  } catch (e) {
    res.render('admin/place-form', { place: req.body, error: 'Ошибка при сохранении: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.get('/admin/places/:id/edit', requireAdmin, async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (!place) return res.status(404).send('Не найдено');
  res.render('admin/place-form', { place, error: null });
});

app.post('/admin/places/:id/edit', requireAdmin, async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).send('Не найдено');
    const { title, description, category, lat, lng, city, image } = req.body;
    await place.update({ title, description, category, lat: parseFloat(lat), lng: parseFloat(lng), city, image });
    res.redirect('/admin/places');
  } catch (e) {
    const place = await Place.findByPk(req.params.id);
    res.render('admin/place-form', { place, error: 'Ошибка при сохранении: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.post('/admin/places/:id/delete', requireAdmin, async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (place) await place.destroy();
  res.redirect('/admin/places');
});

// --- Маршруты ---
app.get('/admin/routes', requireAdmin, async (req, res) => {
  const routes = await Route.findAll({ order: [['id', 'ASC']] });
  res.render('admin/routes', { routes });
});

app.get('/admin/routes/new', requireAdmin, async (req, res) => {
  const places = await Place.findAll({ order: [['title', 'ASC']] });
  res.render('admin/route-form', { route: null, places, error: null });
});

app.post('/admin/routes/new', requireAdmin, async (req, res) => {
  try {
    const { title, description, image, duration, distance, type, placeIds } = req.body;
    const route = await Route.create({ title, description, image, duration, distance, type: type || 'walk' });
    if (placeIds) {
      const ids = Array.isArray(placeIds) ? placeIds : [placeIds];
      const { RoutePlace } = require('./models/Route');
      for (let i = 0; i < ids.length; i++) {
        await RoutePlace.create({ RouteId: route.id, PlaceId: parseInt(ids[i]), order: i + 1 });
      }
    }
    res.redirect('/admin/routes');
  } catch (e) {
    const places = await Place.findAll({ order: [['title', 'ASC']] });
    res.render('admin/route-form', { route: req.body, places, error: 'Ошибка: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.get('/admin/routes/:id/edit', requireAdmin, async (req, res) => {
  const route = await Route.findByPk(req.params.id, { include: [{ model: Place, as: 'places' }] });
  if (!route) return res.status(404).send('Не найдено');
  const places = await Place.findAll({ order: [['title', 'ASC']] });
  res.render('admin/route-form', { route, places, error: null });
});

app.post('/admin/routes/:id/edit', requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).send('Не найдено');
    const { title, description, image, duration, distance, type, placeIds } = req.body;
    await route.update({ title, description, image, duration, distance, type: type || 'walk' });
    const { RoutePlace } = require('./models/Route');
    await RoutePlace.destroy({ where: { RouteId: route.id } });
    if (placeIds) {
      const ids = Array.isArray(placeIds) ? placeIds : [placeIds];
      for (let i = 0; i < ids.length; i++) {
        await RoutePlace.create({ RouteId: route.id, PlaceId: parseInt(ids[i]), order: i + 1 });
      }
    }
    res.redirect('/admin/routes');
  } catch (e) {
    const places = await Place.findAll({ order: [['title', 'ASC']] });
    const route = await Route.findByPk(req.params.id, { include: [{ model: Place, as: 'places' }] });
    res.render('admin/route-form', { route, places, error: 'Ошибка: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.post('/admin/routes/:id/delete', requireAdmin, async (req, res) => {
  const route = await Route.findByPk(req.params.id);
  if (route) await route.destroy();
  res.redirect('/admin/routes');
});

// --- Пользователи ---
app.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await User.findAll({ order: [['id', 'ASC']] });
  res.render('admin/users', { users });
});

app.get('/admin/users/:id/edit', requireAdmin, async (req, res) => {
  const managedUser = await User.findByPk(req.params.id);
  if (!managedUser) return res.status(404).send('Пользователь не найден');

  res.render('admin/user-form', { managedUser, error: null });
});

app.post('/admin/users/:id/edit', requireAdmin, async (req, res) => {
  const managedUser = await User.findByPk(req.params.id);
  if (!managedUser) return res.status(404).send('Пользователь не найден');

  const previousUsername = managedUser.username;
  const email = normalizeEmail(req.body.email);
  const username = (req.body.username || '').trim();
  const role = req.body.role === 'admin' ? 'admin' : 'user';

  if (!isValidEmail(email)) {
    return res.render('admin/user-form', {
      managedUser,
      error: 'Введите корректный email'
    });
  }

  if (!username || username.length < 3 || username.length > 32) {
    return res.render('admin/user-form', {
      managedUser: { ...managedUser.toJSON(), email, username, role },
      error: 'Имя пользователя должно быть от 3 до 32 символов'
    });
  }

  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail && existingEmail.id !== managedUser.id) {
    return res.render('admin/user-form', {
      managedUser: { ...managedUser.toJSON(), email, username, role },
      error: 'Пользователь с таким email уже существует'
    });
  }

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser && existingUser.id !== managedUser.id) {
    return res.render('admin/user-form', {
      managedUser: { ...managedUser.toJSON(), email, username, role },
      error: 'Пользователь с таким именем уже существует'
    });
  }

  const existingAlias = await UserAlias.findOne({ where: { alias: username } });
  if (existingAlias && existingAlias.UserId !== managedUser.id) {
    return res.render('admin/user-form', {
      managedUser: { ...managedUser.toJSON(), email, username, role },
      error: 'Этот логин уже занят в истории логинов другого пользователя'
    });
  }

  if (managedUser.id === req.user.id && role !== 'admin') {
    return res.render('admin/user-form', {
      managedUser: { ...managedUser.toJSON(), email, username, role },
      error: 'Нельзя снять роль администратора у самого себя'
    });
  }

  managedUser.email = email;
  managedUser.username = username;
  managedUser.role = role;
  await managedUser.save();

  if (previousUsername !== username) {
    await UserAlias.findOrCreate({
      where: { alias: previousUsername },
      defaults: { alias: previousUsername, UserId: managedUser.id }
    });
  }

  res.redirect('/admin/users');
});

app.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (user && user.id !== req.user.id) {
    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
  }
  res.redirect('/admin/users');
});

app.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  const managedUser = await User.findByPk(req.params.id);
  if (!managedUser) return res.redirect('/admin/users');
  if (managedUser.id === req.user.id) return res.redirect('/admin/users');

  await Visit.destroy({ where: { UserId: managedUser.id } });
  await managedUser.destroy();

  res.redirect('/admin/users');
});

// ============ END ADMIN PANEL ============

// Синхронизация БД и запуск сервера
async function ensureUserSchema() {
  const queryInterface = sequelize.getQueryInterface();
  const usersTable = await queryInterface.describeTable('Users');

  if (!usersTable.email) {
    await queryInterface.addColumn('Users', 'email', {
      type: DataTypes.STRING,
      allowNull: true
    });
  }

  try {
    await queryInterface.addIndex('Users', ['email'], {
      name: 'users_email_unique_idx',
      unique: true
    });
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    const isKnown = message.includes('already exists') || message.includes('duplicate key name') || message.includes('relation "users_email_unique_idx" already exists');
    if (!isKnown) {
      console.warn('Не удалось создать уникальный индекс по email:', error.message);
    }
  }
}

async function ensureContentSeeded() {
  const placesCount = await Place.count();
  const routesCount = await Route.count();

  if (placesCount === 0 || routesCount === 0) {
    await ensureSeedData();
    console.log('Стартовые места и маршруты восстановлены автоматически.');
  }
}

async function ensureAdminExists() {
  const bcryptjs = require('bcryptjs');
  const adminEmail = 'admin@citivoice.local';
  const adminPassword = 'admin12345';

  try {
    let admin = await User.findOne({ where: { email: adminEmail } });

    if (!admin) {
      const hashedPassword = await bcryptjs.hash(adminPassword, 10);
      admin = await User.create({
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        level: 1,
        exp: 0
      });
      console.log('✅ Администратор создан автоматически при запуске!');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    }
  } catch (error) {
    console.error('⚠️  Ошибка при создании админа:', error.message);
  }
}

sequelize.sync().then(async () => {
  await ensureUserSchema();
  await ensureContentSeeded();
  await ensureAdminExists();

  app.listen(PORT, () => {
    console.log(`CitiVoice server is running on http://localhost:${PORT}`);
  });
});
