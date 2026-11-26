import { ImageResponse } from "next/og";

// Icons are generated from code (not binary PNG files) so they can be
// deployed through the UTF-8-only snapshot push. Serves /icon-192.png and
// /icon-512.png, matching the paths referenced in app/manifest.ts.
export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = await id;
  const size = iconId === "192" ? 192 : 512;
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
          fontSize: Math.round(size * 0.55),
          fontWeight: 800,
        }}
      >
        G
      </div>
    ),
    { width: size, height: size },
  );
}
