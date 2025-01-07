import { DataTypes, Model as SequelizeModel } from 'sequelize';
import { IsString, IsArray, validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export default function initEmailTemplateModel(sequelize) {
    class EmailTemplate extends SequelizeModel {
        // Custom validation logic
        static async validateEmailTemplate(templateData) {
            const templateInstance = plainToClass(EmailTemplate, templateData);
            const errors = await validate(templateInstance);
            if (errors.length > 0) {
                throw new Error('Validation failed: ' + errors.map(err => err.toString()).join(', '));
            }

        }
    }

    EmailTemplate.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true,
                    len: [1, 255]
                }
            },
            template: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            },
            variables: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidVariableArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Variables must be an array');
                        }
                    }
                }
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        },
        {
            sequelize,
            modelName: 'EmailTemplate',
            tableName: 'email_templates',
            timestamps: true,
            paranoid: true, // Enables soft deletes
        }
    );

    // Add validation hooks
    EmailTemplate.addHook('beforeCreate', async (template) => {
        await EmailTemplate.validateEmailTemplate(template);
    });

    EmailTemplate.addHook('beforeUpdate', async (template) => {
        await EmailTemplate.validateEmailTemplate(template);
    });

    // Add class methods
    EmailTemplate.findByTitle = function (title) {
        return this.findOne({
            where: { title }
        });
    };

    EmailTemplate.findActiveTemplates = function () {
        return this.findAll({
            where: { isActive: true }
        });
    };

    // Instance method to extract variables from template
    EmailTemplate.prototype.extractVariables = function () {
        const variableRegex = /\[(.*?)\]/g;
        const matches = this.template.match(variableRegex) || [];
        this.variables = [...new Set(matches.map(match => match.replace(/[\[\]]/g, '')))];
    };

    // Instance method to compile template with values
    EmailTemplate.prototype.compile = function (values) {
        let compiledTemplate = this.template;
        Object.entries(values).forEach(([key, value]) => {
            const regex = new RegExp(`\\[${key}\\]`, 'g');
            compiledTemplate = compiledTemplate.replace(regex, value || `[${key}]`);
        });
        return compiledTemplate;
    };

    return EmailTemplate;
} 