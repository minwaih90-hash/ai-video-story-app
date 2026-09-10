import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

const VIDEO_MODEL =
  process.env.FAL_VIDEO_MODEL || "fal-ai/kling-video/v1.6/standard/image-to-video";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageUrl, prompt } = req.body || {};

  if (!imageUrl) {
    return res.status(400).json({ error: "Missing 'imageUrl' in request body" });
  }

  if (!process.env.FAL_KEY) {
    return res.status(500).json({
      error: "FAL_KEY is not set on the server. Add it to .env.local"
    });
  }

  try {
    const { request_id } = await fal.queue.submit(VIDEO_MODEL, {
      input: {
        image_url: imageUrl,
        prompt: prompt || "subtle natural motion, cinematic"
      }
    });

    return res.status(200).json({ requestId: request_id, model: VIDEO_MODEL });
  } catch (err) {
    console.error("video submission failed:", err);
    return res.status(500).json({ error: "Video submission failed", detail: String(err) });
  }
}
