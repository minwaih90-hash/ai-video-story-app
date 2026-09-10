import { useState, useRef } from "react";

const STYLE_OPTIONS = [
  "cinematic",
  "anime",
  "watercolor",
  "stop-motion claymation",
  "1980s VHS",
  "documentary"
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [sceneCount, setSceneCount] = useState(4);
  const [style, setStyle] = useState("cinematic");
  const [story, setStory] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loadingStory, setLoadingStory] = useState(false);
  const [error, setError] = useState("");
  const pollTimers = useRef({});

  async function handleGenerateStory(e) {
    e.preventDefault();
    setError("");
    if (!idea.trim()) {
      setError("ဇာတ်လမ်းအကြောင်းအရာ တစ်ခုခု ရေးထည့်ပါ။");
      return;
    }
    setLoadingStory(true);
    setStory(null);
    setScenes([]);

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, sceneCount: Number(sceneCount), style })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Story generation failed");

      setStory(data);
      setScenes(
        (data.scenes || []).map((s) => ({
          ...s,
          imageStatus: "idle",
          imageUrl: null,
          videoStatus: "idle",
          videoUrl: null,
          videoRequestId: null
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStory(false);
    }
  }

  function updateScene(sceneNumber, patch) {
    setScenes((prev) =>
      prev.map((s) => (s.sceneNumber === sceneNumber ? { ...s, ...patch } : s))
    );
  }

  async function handleGenerateImage(scene) {
    updateScene(scene.sceneNumber, { imageStatus: "busy" });
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene.imagePrompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");
      updateScene(scene.sceneNumber, { imageStatus: "ok", imageUrl: data.imageUrl });
    } catch (err) {
      updateScene(scene.sceneNumber, { imageStatus: "error" });
      setError(err.message);
    }
  }

  async function handleGenerateVideo(scene) {
    if (!scene.imageUrl) return;
    updateScene(scene.sceneNumber, { videoStatus: "busy" });
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: scene.imageUrl, prompt: scene.motionPrompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Video submission failed");

      updateScene(scene.sceneNumber, { videoRequestId: data.requestId });
      pollVideoStatus(scene.sceneNumber, data.requestId);
    } catch (err) {
      updateScene(scene.sceneNumber, { videoStatus: "error" });
      setError(err.message);
    }
  }

  function pollVideoStatus(sceneNumber, requestId) {
    clearInterval(pollTimers.current[sceneNumber]);
    pollTimers.current[sceneNumber] = setInterval(async () => {
      try {
        const res = await fetch(`/api/video-status?requestId=${requestId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Status check failed");

        if (data.status === "COMPLETED") {
          clearInterval(pollTimers.current[sceneNumber]);
          updateScene(sceneNumber, { videoStatus: "ok", videoUrl: data.videoUrl });
        }
      } catch (err) {
        clearInterval(pollTimers.current[sceneNumber]);
        updateScene(sceneNumber, { videoStatus: "error" });
      }
    }, 5000);
  }

  return (
    <div className="page">
      <div className="masthead">
        <h1>Storyboard Studio</h1>
        <p>
          အကြောင်းအရာတစ်ခု ရေးထည့်လိုက်ပါ — Claude က ဇာတ်ကွက်ခွဲပေးမယ်၊ ပုံနှင့် ဗီဒီယို clip
          တွေကို scene တစ်ခုချင်းစီအတွက် ထုတ်ပေးမယ်။
        </p>
      </div>

      <form className="field-group" onSubmit={handleGenerateStory}>
        <div>
          <label htmlFor="idea">ဇာတ်လမ်းအကြောင်းအရာ</label>
          <textarea
            id="idea"
            rows={3}
            placeholder="ဥပမာ - ရွာလေးတစ်ခုမှာ ငါးဖမ်းသမားအိုတစ်ဦးဟာ ပင်လယ်ထဲက အလင်းရောင်ပုံသဏ္ဌာန်ကြီးတစ်ခုကို ဖမ်းမိတယ်..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
        </div>

        <div className="row">
          <div>
            <label htmlFor="sceneCount">Scene အရေအတွက်</label>
            <input
              id="sceneCount"
              type="number"
              min={2}
              max={10}
              value={sceneCount}
              onChange={(e) => setSceneCount(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="style">ရုပ်ပုံစတိုင်</label>
            <select id="style" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loadingStory}>
          {loadingStory ? "ဇာတ်ကွက်ခွဲနေသည်..." : "Story ထုတ်မည်"}
        </button>

        {error && <div className="error-banner">{error}</div>}
      </form>

      {story && (
        <div className="reel">
          <div className="reel-header">
            <div>
              <h2>{story.title}</h2>
              <div className="logline">{story.logline}</div>
            </div>
          </div>

          {scenes.map((scene) => (
            <SceneCard
              key={scene.sceneNumber}
              scene={scene}
              onGenerateImage={() => handleGenerateImage(scene)}
              onGenerateVideo={() => handleGenerateVideo(scene)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneCard({ scene, onGenerateImage, onGenerateVideo }) {
  return (
    <div className="scene-card">
      <div className="scene-visual">
        <span className="scene-number">Scene {scene.sceneNumber}</span>
        <div className="frame">
          {scene.videoUrl ? (
            <video src={scene.videoUrl} controls loop muted />
          ) : scene.imageUrl ? (
            <img src={scene.imageUrl} alt={scene.imagePrompt} />
          ) : (
            "ပုံ မထုတ်ရသေးပါ"
          )}
        </div>

        <div className="scene-actions">
          <button
            className="btn btn-secondary"
            onClick={onGenerateImage}
            disabled={scene.imageStatus === "busy"}
          >
            {scene.imageUrl ? "ပုံပြန်ထုတ်" : "ပုံထုတ်"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onGenerateVideo}
            disabled={!scene.imageUrl || scene.videoStatus === "busy"}
          >
            {scene.videoUrl ? "ဗီဒီယိုပြန်ထုတ်" : "ဗီဒီယိုထုတ်"}
          </button>
        </div>

        <StatusLine label="ပုံ" status={scene.imageStatus} />
        <StatusLine label="ဗီဒီယို" status={scene.videoStatus} />
      </div>

      <div className="scene-body">
        <div className="narration">{scene.narration}</div>
        <div className="prompt-label">Image prompt: {scene.imagePrompt}</div>
        <div className="prompt-label">Motion: {scene.motionPrompt}</div>
      </div>
    </div>
  );
}

function StatusLine({ label, status }) {
  const dotClass =
    status === "ok" ? "ok" : status === "busy" ? "busy" : status === "error" ? "" : "";
  const text =
    status === "ok"
      ? "ပြီးပါပြီ"
      : status === "busy"
      ? "လုပ်ဆောင်နေသည်..."
      : status === "error"
      ? "မအောင်မြင်ပါ"
      : "မလုပ်ရသေးပါ";

  return (
    <div className="status-pill">
      <span className={`status-dot ${dotClass}`} />
      {label}: {text}
    </div>
  );
                }
