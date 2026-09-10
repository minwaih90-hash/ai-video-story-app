import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || "fal-ai/flux/dev";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body" });
  }

  if (!process.env.FAL_KEY) {
    return res.status(500).json({
      error: "FAL_KEY is not set on the server. Add it to .env.local"
    });
  }

  try {
    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt,
        image_size: "landscape_16_9",
        num_images: 1
      },
      logs: false
    });

    const imageUrl = result?.data?.images?.[0]?.url;

    if (!imageUrl) {
      return res.status(500).json({ error: "No image returned", detail: result });
    }

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("image generation failed:", err);
    return res.status(500).json({ error: "Image generation failed", detail: String(err) });
  }
}
