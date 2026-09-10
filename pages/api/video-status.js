import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

const VIDEO_MODEL =
  process.env.FAL_VIDEO_MODEL || "fal-ai/kling-video/v1.6/standard/image-to-video";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { requestId } = req.query;

  if (!requestId) {
    return res.status(400).json({ error: "Missing 'requestId' query param" });
  }

  try {
    const status = await fal.queue.status(VIDEO_MODEL, {
      requestId,
      logs: true
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(VIDEO_MODEL, { requestId });
      const videoUrl = result?.data?.video?.url;
      return res.status(200).json({ status: "COMPLETED", videoUrl });
    }

    return res.status(200).json({ status: status.status || "IN_PROGRESS" });
  } catch (err) {
    console.error("video status check failed:", err);
    return res.status(500).json({ error: "Status check failed", detail: String(err) });
  }
}
