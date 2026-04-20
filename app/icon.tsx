import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b0b0f",
          color: "#e50914",
          fontSize: 28,
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
