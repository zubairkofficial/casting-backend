import { DataTypes, Model } from 'sequelize';

export default function initUserEmailModel(sequelize) {
    class UserEmail extends Model { }

    UserEmail.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isEmail: true,
                },
            },
            name: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            picture: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isUrl: true,
                },
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            accessToken: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            refreshToken: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            tokenExpiry: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            lastSyncedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            }
        },
        {
            sequelize,
            modelName: 'UserEmail',
            tableName: 'user_emails',
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    unique: true,
                    fields: ['email', 'createdBy'],
                    where: {
                        deletedAt: null
                    }
                }
            ]
        }
    );

    return UserEmail;
}