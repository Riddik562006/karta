const Place = require('../models/Place');
const { Route } = require('../models/Route');

const defaultPlaces = [
    {
        title: 'Водонапорная башня',
        description: 'Водонапорная башня — один из главных архитектурных символов Оренбурга. Башня была построена в 1900 году для обеспечения города питьевой водой. Высота сооружения — около 35 метров, и долгое время она была видна из любой точки центра города.\n\nСегодня внутри расположен Музей истории Оренбурга. Посетители могут подняться на смотровую площадку и насладиться панорамным видом на старый центр города, реку Урал и Оренбургскую степь. Башня выполнена в псевдоготическом стиле и является объектом культурного наследия России федерального значения.',
        category: 'architecture',
        lat: 51.775307,
        lng: 55.107191,
        city: 'Оренбург',
        image: '/images/ВодонапорнаяБашня.webp',
    },
    {
        title: 'Мост Европа–Азия',
        description: 'Пешеходный мост через реку Урал, разделяющий два континента — Европу и Азию. Оренбург — единственный город в мире, через который проходит река, являющаяся естественной границей двух цивилизаций.\n\nНа середине моста установлен знак с надписью «Европа» и «Азия». Туристы со всего мира приезжают в Оренбург, чтобы одновременно побывать в двух частях света. Мост входит в список наиболее посещаемых достопримечательностей Оренбургской области.',
        category: 'bridge',
        lat: 51.753201,
        lng: 55.107216,
        city: 'Оренбург',
        image: '/images/мост.webp',
    },
    {
        title: 'Национальная Деревня',
        description: 'Национальная Деревня — это культурный комплекс, представляющий традиции и быт различных народов, проживающих в Оренбургской области. Здесь можно увидеть аутентичные дома, мастерские ремесленников и попробовать национальные блюда.\n\nКомплекс организует различные мероприятия, включая фестивали, мастер-классы и выставки, позволяя посетителям погрузиться в атмосферу разных культур и узнать больше о наследии региона.',
        category: 'cultural',
        lat: 51.776514,
        lng: 55.167768,
        city: 'Оренбург',
        image: '/images/национальная_деревня.webp',
    },
    {
        title: 'Спуск к реке Урал',
        description: 'Спуск к реке Урал — это живописное место в Оренбурге, где можно насладиться видом на реку и окружающую природу. Здесь часто проводят прогулки, фотосессии и различные мероприятия на свежем воздухе.\n\nМесто популярно среди туристов и местных жителей, предлагая возможность отдохнуть и насладиться красотой природы.',
        category: 'history',
        lat: 51.754148,
        lng: 55.106600,
        city: 'Оренбург',
        image: '/images/Спуск_урал.webp',
    },
];

const defaultRoute = {
    title: 'Классический Оренбург',
    description: 'Идеальная прогулка для знакомства с историческим центром города. Мы пройдем от знаменитой башни до набережной.',
    image: '/images/22_orenburg.jpg',
    duration: '1.5 часа',
    distance: '2.5 км',
    type: 'walk'
};

async function ensureDefaultPlaces() {
    const createdPlaces = [];

    for (const placeData of defaultPlaces) {
        const [place] = await Place.findOrCreate({
            where: { title: placeData.title },
            defaults: placeData
        });
        createdPlaces.push(place);
    }

    return createdPlaces;
}

async function ensureDefaultRoutes() {
    const [route] = await Route.findOrCreate({
        where: { title: defaultRoute.title },
        defaults: defaultRoute
    });

    const places = await Place.findAll({
        where: {
            title: ['Водонапорная башня', 'Спуск к реке Урал', 'Мост Европа–Азия']
        }
    });

    const orderByTitle = {
        'Водонапорная башня': 1,
        'Спуск к реке Урал': 2,
        'Мост Европа–Азия': 3,
    };

    if (places.length >= 3) {
        await route.setPlaces([]);

        for (const place of places.sort((a, b) => orderByTitle[a.title] - orderByTitle[b.title])) {
            await route.addPlace(place, { through: { order: orderByTitle[place.title] } });
        }
    }

    return route;
}

async function ensureSeedData() {
    await ensureDefaultPlaces();
    await ensureDefaultRoutes();
}

module.exports = {
    defaultPlaces,
    defaultRoute,
    ensureDefaultPlaces,
    ensureDefaultRoutes,
    ensureSeedData,
};
