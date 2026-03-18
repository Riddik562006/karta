const sequelize = require('./index');
const { ensureSeedData } = require('./seed-data');

const forceReset = process.argv.includes('--force');

async function seed() {
    if (!forceReset) {
        console.error('Сидирование остановлено: эта команда полностью очищает базу данных. Используй: node db/seed.js --force');
        process.exit(1);
    }

    await sequelize.sync({ force: true });

    await ensureSeedData();

    console.log('База данных заполнена!');
    process.exit(0);
}

seed();
