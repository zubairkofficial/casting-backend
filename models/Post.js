import { DataTypes, Model as SequelizeModel } from 'sequelize';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export default function initPostModel(sequelize) {
    class Post extends SequelizeModel {
        // Custom validation logic
        static async validatePost(postData) {
            const postInstance = plainToClass(Post, postData);
            const errors = await validate(postInstance);
            if (errors.length > 0) {
                throw new Error('Validation failed: ' + errors.map(err => err.toString()).join(', '));
            }
        }
    }

    Post.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            postId: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            isFavorite: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            isEmailSent: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            postDate: {
                type: DataTypes.STRING,
                defaultValue: null,
            },
            data: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            createdBy: {  // Add this field
                type: DataTypes.UUID, // Assuming User's primary key is INTEGER
                allowNull: false,
                references: {
                    model: 'users', // Ensure this matches your User table name
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            }
        },
        {
            sequelize,
            modelName: 'Post',
            tableName: 'posts',
            paranoid: true, // Enable soft deletes
            timestamps: true, // Ensure timestamps are enabled
        }
    );

    // Validation hooks
    Post.addHook('beforeCreate', async (post) => {
        await Post.validatePost(post);
    });

    Post.addHook('beforeUpdate', async (post) => {
        await Post.validatePost(post);
    });

    return Post;
}
