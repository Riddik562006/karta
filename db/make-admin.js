const sequelize = require('./index');
const User = require('../models/User');

async function createOrUpdateAdmin() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database');

        await sequelize.sync();
        console.log('✓ Database synced');

        const adminEmail = 'admin@citivoice.local';
        const adminPassword = 'admin12345';
        const adminUsername = 'admin';

        // Ищем существующего админа по email
        let admin = await User.findOne({ where: { email: adminEmail } });

        if (admin) {
            // Обновляем существующего админа
            admin.password = adminPassword;
            admin.role = 'admin';
            admin.level = 1;
            await admin.save();
            console.log(`✓ Updated admin user: ${adminEmail}`);
        } else {
            // Ищем по юзernameу если email не найден
            admin = await User.findOne({ where: { username: adminUsername } });
            if (admin) {
                // Обновляем username-based админа
                admin.email = adminEmail;
                admin.password = adminPassword;
                admin.role = 'admin';
                admin.level = 1;
                await admin.save();
                console.log(`✓ Updated admin user: ${adminUsername} → ${adminEmail}`);
            } else {
                // Создаём нового админа
                admin = await User.create({
                    email: adminEmail,
                    username: adminUsername,
                    password: adminPassword,
                    role: 'admin',
                    level: 1,
                    exp: 0
                });
                console.log(`✓ Created new admin user: ${adminEmail}`);
            }
        }

        console.log('\n📋 Admin credentials:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log('\n✅ Admin user is ready!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createOrUpdateAdmin();
