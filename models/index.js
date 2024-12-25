import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import initUserModel from './User.js';
import initUserEmailModel from './UserEmail.js';
import initModelModel from './Model.js';
import initEmailTemplateModel from './EmailTemplate.js';
import initPostModel from './Post.js';
dotenv.config();

// Create a new Sequelize instance with database configurations
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    define: {
        logging: false,
        timestamps: true,
    },
});

// Initialize models
const User = initUserModel(sequelize);
const UserEmail = initUserEmailModel(sequelize);
const Model = initModelModel(sequelize);
const EmailTemplate = initEmailTemplateModel(sequelize);
const Post = initPostModel(sequelize);

// Define associations between models
User.hasMany(UserEmail, {
    foreignKey: 'createdBy',
    as: 'userEmails'
});

UserEmail.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// Export models and sequelize instance
export { sequelize, User, UserEmail, Model, EmailTemplate, Post };
export default sequelize;
