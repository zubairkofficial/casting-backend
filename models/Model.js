import { DataTypes, Model as SequelizeModel } from 'sequelize';
import { IsString, IsUrl, IsOptional, validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export default function initModelModel(sequelize) {
    class Model extends SequelizeModel {


        // Custom validation logic
        static async validateModel(modelData) {
            const modelInstance = plainToClass(Model, modelData);
            const errors = await validate(modelInstance);
            if (errors.length > 0) {
                throw new Error('Validation failed: ' + errors.map(err => err.toString()).join(', '));
            }
        }
    }

    Model.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            comcardNo: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,

                validate: {
                    notEmpty: true,
                    len: [1, 255]
                }
            },
            nameEng: {
                type: DataTypes.STRING,
                allowNull: false,

                validate: {
                    notEmpty: true,
                    len: [1, 255]
                }
            },
            nameKor: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 255]
                }
            },
            national: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 100]
                }
            },
            stage: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: [0, 100]
                }
            },
            additionalPic: {
                type: DataTypes.STRING,
                allowNull: true,

                validate: {
                    isUrl: true
                }
            },
            comecardUrl: {
                type: DataTypes.STRING,
                allowNull: true,

                validate: {
                    isUrl: true
                }
            },
            comcardPic: {
                type: DataTypes.STRING,
                allowNull: true,

                validate: {
                    isUrl: true
                }
            },
            download: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isUrl: true
                }
            },
            htmlUrl: {
                type: DataTypes.STRING,
                allowNull: true,

                validate: {
                    isUrl: true
                }
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,

            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,

            }
        },
        {
            sequelize,
            modelName: 'Model',
            tableName: 'models',
            timestamps: true,
            paranoid: true, // Enables soft deletes

        }
    );

    // Add validation hooks
    Model.addHook('beforeCreate', async (model) => {
        await Model.validateModel(model);
    });

    Model.addHook('beforeUpdate', async (model) => {
        await Model.validateModel(model);
    });


    // Add class methods
    Model.findByComcardNo = function (comcardNo) {
        return this.findOne({
            where: { comcardNo }
        });
    };

    Model.findByNational = function (national) {
        return this.findAll({
            where: { national }
        });
    };

    Model.findByStage = function (stage) {
        return this.findAll({
            where: { stage }
        });
    };

    return Model;
}
