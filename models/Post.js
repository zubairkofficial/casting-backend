import { DataTypes, Model } from 'sequelize';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export default function initPostModel(sequelize) {
    class Post extends Model {
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
                type: DataTypes.JSON,
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
            data: {
                type: DataTypes.JSONB,
                defaultValue: false,
                allowNull: false,
            }
        },
        {
            sequelize,
            modelName: 'Post',
            tableName: 'posts',
            paranoid: true, // Enable soft deletes
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