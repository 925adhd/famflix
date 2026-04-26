import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b0b0f",
          color: "#e50914",
          fontSize: 120,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-0.05em",
          fontFamily: "sans-serif",
        }}
      >
        F
      </div>
    ),
    size
  );
}
