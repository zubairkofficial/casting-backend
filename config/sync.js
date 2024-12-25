// sync.js
import sequelize from '../models/index.js';

const syncDatabase = async () => {
    try {
        await sequelize.sync({ logging: false, alter: true }); // Sync all models with the database
        console.log('All models were synchronized successfully.');
    } catch (error) {
        console.error('Error syncing database:', error);
    }
};

export default syncDatabase;