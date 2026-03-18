const express = require('express');
const path = require('path');
const sequelize = require('./db');
const Place = require('./models/Place');
const { Route } = require('./models/Route');
const session = require('express-session');
const User = require('./models/User');
const Visit = require('./models/Visit'); // РџРѕРґРєР»СЋС‡Р°РµРј РЅР°С€Сѓ 5-СЋ С‚Р°Р±Р»РёС†Сѓ


const app = express();
const PORT = process.env.PORT || 3000;

// РќР°СЃС‚СЂРѕР№РєР° EJS РєР°Рє view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// РЎС‚Р°С‚РёС‡РµСЃРєРёРµ С„Р°Р№Р»С‹
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


// РњР°СЂС€СЂСѓС‚С‹

// AUTH
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.render('register', { error: 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚' });

    const user = await User.create({ username, password });
    req.session.userId = user.id;
    res.redirect('/');
  } catch (e) {
    res.render('register', { error: 'РћС€РёР±РєР° СЂРµРіРёСЃС‚СЂР°С†РёРё' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || !(await user.validPassword(password))) {
      return res.render('login', { error: 'РќРµРІРµСЂРЅРѕРµ РёРјСЏ РёР»Рё РїР°СЂРѕР»СЊ' });
    }
    req.session.userId = user.id;
    res.redirect('/');
  } catch (e) {
    res.render('login', { error: 'РћС€РёР±РєР° РІС…РѕРґР°' });
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

// РЎС‚СЂР°РЅРёС†Р° РІСЃРµС… РјРµСЃС‚ (РљР°С‚Р°Р»РѕРі)
app.get('/places', async (req, res) => {
  const places = await Place.findAll();
  res.render('places', { places });
});

// РЎС‚СЂР°РЅРёС†Р° РѕРґРЅРѕРіРѕ РјРµСЃС‚Р°
app.get('/place/:id', async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (!place) return res.status(404).send('РњРµСЃС‚Рѕ РЅРµ РЅР°Р№РґРµРЅРѕ');
  res.render('place', { place });
});

// API: РїРѕР»СѓС‡РёС‚СЊ РІСЃРµ РјРµСЃС‚Р°
app.get('/api/places', async (req, res) => {
  const { category } = req.query;
  const where = category ? { category } : {};
  const places = await Place.findAll({ where });
  res.json(places);
});

// API: РїРѕР»СѓС‡РёС‚СЊ РѕРґРЅРѕ РјРµСЃС‚Рѕ
app.get('/api/places/:id', async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (!place) return res.status(404).json({ error: 'РќРµ РЅР°Р№РґРµРЅРѕ' });
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

  if (!route) return res.status(404).send('РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ');

  res.render('route', { route });
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
});app.get('/routes', async (req, res) => {
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

// --- РњРµСЃС‚Р° ---
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
    res.render('admin/place-form', { place: req.body, error: 'РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.get('/admin/places/:id/edit', requireAdmin, async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (!place) return res.status(404).send('РќРµ РЅР°Р№РґРµРЅРѕ');
  res.render('admin/place-form', { place, error: null });
});

app.post('/admin/places/:id/edit', requireAdmin, async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).send('РќРµ РЅР°Р№РґРµРЅРѕ');
    const { title, description, category, lat, lng, city, image } = req.body;
    await place.update({ title, description, category, lat: parseFloat(lat), lng: parseFloat(lng), city, image });
    res.redirect('/admin/places');
  } catch (e) {
    const place = await Place.findByPk(req.params.id);
    res.render('admin/place-form', { place, error: 'РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.post('/admin/places/:id/delete', requireAdmin, async (req, res) => {
  const place = await Place.findByPk(req.params.id);
  if (place) await place.destroy();
  res.redirect('/admin/places');
});

// --- РњР°СЂС€СЂСѓС‚С‹ ---
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
    res.render('admin/route-form', { route: req.body, places, error: 'РћС€РёР±РєР°: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.get('/admin/routes/:id/edit', requireAdmin, async (req, res) => {
  const route = await Route.findByPk(req.params.id, { include: [{ model: Place, as: 'places' }] });
  if (!route) return res.status(404).send('РќРµ РЅР°Р№РґРµРЅРѕ');
  const places = await Place.findAll({ order: [['title', 'ASC']] });
  res.render('admin/route-form', { route, places, error: null });
});

app.post('/admin/routes/:id/edit', requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).send('РќРµ РЅР°Р№РґРµРЅРѕ');
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
    res.render('admin/route-form', { route, places, error: 'РћС€РёР±РєР°: ' + e.message + (e.errors ? ' - ' + e.errors.map(err => err.message).join(', ') : '') });
  }
});

app.post('/admin/routes/:id/delete', requireAdmin, async (req, res) => {
  const route = await Route.findByPk(req.params.id);
  if (route) await route.destroy();
  res.redirect('/admin/routes');
});

// --- РџРѕР»СЊР·РѕРІР°С‚РµР»Рё ---
app.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await User.findAll({ order: [['id', 'ASC']] });
  res.render('admin/users', { users });
});

app.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (user && user.id !== req.user.id) {
    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
  }
  res.redirect('/admin/users');
});

// ============ END ADMIN PANEL ============

// РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ Р‘Р” Рё Р·Р°РїСѓСЃРє СЃРµСЂРІРµСЂР°
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`CitiVoice server is running on http://localhost:${PORT}`);
  });
});
