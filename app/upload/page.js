"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { doc, updateDoc } from "firebase/firestore";
import { functions, db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

const STAGES = {
  idle: "idle",
  requesting: "Preparing upload link…",
  uploading: "Uploading…",
  processing: "Processing video (this can take a few minutes)…",
  done: "Done",
};

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState(STAGES.idle);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  if (!user) {
    return <p>Log in to upload a video.</p>;
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return setError("Choose a video file first.");
    setError("");

    try {
      setStage(STAGES.requesting);
      const createUploadUrl = httpsCallable(functions, "createUploadUrl");
      const { data } = await createUploadUrl();
      const { uploadURL, streamVideoId } = data;

      setStage(STAGES.uploading);
      await uploadWithProgress(uploadURL, file, setProgress);

      await updateDoc(doc(db, "videos", streamVideoId), {
        title,
        description,
        ownerUid: user.uid,
        channelName: user.displayName || "Channel",
      });

      setStage(STAGES.processing);
      const checkVideoStatus = httpsCallable(functions, "checkVideoStatus");
      const poll = async () => {
        const { data: statusData } = await checkVideoStatus({ streamVideoId });
        if (statusData.ready) {
          setStage(STAGES.done);
          router.push(`/watch/${streamVideoId}`);
        } else {
          setTimeout(poll, 4000);
        }
      };
      poll();
    } catch (err) {
      setError(err.message);
      setStage(STAGES.idle);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 20 }}>
        Upload a new video
      </h2>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept="video/*"
          className="field"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <input
          className="field"
          placeholder="Video title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="field"
          placeholder="Description (optional)"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        {stage !== STAGES.idle && (
          <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginBottom: 12 }}>
            {STAGES[stage] || stage}
            {stage === STAGES.uploading && ` (${progress}%)`}
          </p>
        )}

        <button className="btn" type="submit" disabled={stage !== STAGES.idle}>
          Upload
        </button>
      </form>
    </div>
  );
}

function uploadWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}
