import Link from "next/link";

function formatViews(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K views`;
  return `${n || 0} views`;
}

export default function VideoCard({ video }) {
  return (
    <Link href={`/watch/${video.id}`} className="card">
      <div
        className="thumb"
        style={{ backgroundImage: video.thumbnailUrl ? `url(${video.thumbnailUrl})` : undefined }}
      >
        {video.durationLabel && <span className="duration">{video.durationLabel}</span>}
      </div>
      <div className="title">{video.title || "Untitled video"}</div>
      <div className="meta">
        {video.channelName || "Channel"} · {formatViews(video.views)}
      </div>
    </Link>
  );
}
