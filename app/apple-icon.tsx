import { ImageResponse } from "next/og";

// Apple touch icon, generated from code (see app/icon.tsx). Serves
// /apple-icon.png at 180x180.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d6336c",
          color: "#ffffff",
          fontSize: 99,
          fontWeight: 800,
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
