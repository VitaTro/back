const { google } = require("googleapis");
require("dotenv").config();

const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

async function uploadToDrive(localPath, nameForDrive) {
  const fileMetadata = {
    name: nameForDrive,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: "application/pdf",
    body: require("fs").createReadStream(localPath),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id",
  });

  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const publicUrl = `https://drive.google.com/uc?id=${file.data.id}&export=download`;
  return publicUrl;
}

module.exports = uploadToDrive;
