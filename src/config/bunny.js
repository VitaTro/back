import fetch from "node-fetch";

export const uploadImage = async (req, res) => {
  const file = req.file; // якщо використовуєш multer
  const fileName = file.originalname;

  const response = await fetch(
    `${process.env.BUNNY_STORAGE_ENDPOINT}${fileName}`,
    {
      method: "PUT",
      headers: {
        AccessKey: process.env.BUNNY_ACCESS_KEY,
        "Content-Type": file.mimetype,
      },
      body: file.buffer,
    },
  );

  if (response.ok) {
    const imageUrl = `https://nika-gold-images.b-cdn.net/${fileName}`;
    res.json({ imageUrl });
  } else {
    res.status(500).json({ error: "Upload failed" });
  }
};
