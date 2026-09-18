import { Link } from "@tanstack/react-router";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";

export function NxLaunchNotice({ title }: { title: string }) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        padding: "56px 24px",
        textAlign: "center",
        borderStyle: "dashed",
      }}
    >
      <img
        src={nxgLogo.url}
        alt="NXGEN Premier League logo"
        loading="lazy"
        style={{ width: 88, height: "auto" }}
      />
      <h2 className="display" style={{ fontSize: 18 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--silver-d)" }}>
        Nothing here yet — this fills in as games are played.
      </p>
      <Link to="/" className="btn btn-gold btn-sm">Back to Home</Link>
    </div>
  );
}
