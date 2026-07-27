import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          background:
            "linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(37,99,235,1) 100%)",
          color: "white",
          fontSize: 96,
          fontWeight: 700,
          borderRadius: 42
        }}
      >
        M
      </div>
    ),
    {
      width: 180,
      height: 180
    }
  );
}
