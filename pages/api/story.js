import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idea, sceneCount = 5, style = "cinematic" } = req.body || {};

  if (!idea || typeof idea !== "string") {
    return res.status(400).json({ error: "Missing 'idea' in request body" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local"
    });
  }

  const systemPrompt = `You are a screenwriter for short AI-generated videos.
Given a story idea, break it into exactly ${sceneCount} short scenes suitable for
a ~5-10 second video clip each. Visual style: ${style}.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching this shape:
{
  "title": "string",
  "logline": "string",
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "string - short voiceover / caption line for this scene",
      "imagePrompt": "string - a detailed, self-contained visual description for a text-to-image model. Include subject, setting, lighting, and style: ${style}.",
      "motionPrompt": "string - a short description of how the camera/subject should move for an image-to-video model (e.g. 'slow push-in, hair moving in the wind')"
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: idea }]
    });

    const raw = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "");

    const story = JSON.parse(raw);
    return res.status(200).json(story);
  } catch (err) {
    console.error("story generation failed:", err);
    return res.status(500).json({ error: "Story generation failed", detail: String(err) });
  }
}
