import { google } from 'googleapis';

export async function getDriveClient(accessToken, refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_API_URL}google-auth/callback`
    );

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
}

// Example usage:
export async function uploadFileToDrive(accessToken, refreshToken, fileMetadata, media) {
    try {
        const drive = await getDriveClient(accessToken, refreshToken);
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id'
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw error;
    }
} 