import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import React from "react";
import { getProfileBySlug } from "@/lib/getProfile";

export const runtime = "edge";

async function headImage(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    const ct = res.headers.get("content-type") || "";
    const ok =
      res.ok &&
      (ct.includes("jpeg") ||
        ct.includes("jpg") ||
        ct.includes("png") ||
        ct.includes("webp"));
    return { ok, status: res.status, contentType: ct };
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      error: String(e?.message || e),
    };
  }
}

const h = React.createElement;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;

  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug") === "1";

  const { user, extra } = await getProfileBySlug(slug);

  const name = user?.name ?? "Matcha Match User";
  const school = extra?.school ?? "";
  const job = extra?.job_type ?? "";
  const photoUrl = user?.photo_url ?? "";
  const accent = (user as any)?.favorite_color ?? "#7CFFB2";

  const photoHead = photoUrl ? await headImage(photoUrl) : null;
  const safePhoto = photoHead?.ok ? photoUrl : "";

  if (debug) {
    return Response.json({
      slug,
      userFound: !!user,
      user: user
        ? {
            user_id: (user as any).user_id,
            name: user.name,
            role: user.role,
            profile_slug: user.profile_slug,
            photo_url: user.photo_url,
            favorite_color: (user as any)?.favorite_color ?? null,
          }
        : null,
      extra,
      photoHead,
      safePhotoUsed: !!safePhoto,
    });
  }

  // Build React element without JSX (so route.ts compiles)
  const root = h(
    "div",
    {
      style: {
        width: "1080px",
        height: "1920px",
        display: "flex",
        position: "relative",
        borderRadius: "80px",
        overflow: "hidden",
        background: "#111",
        fontFamily: "system-ui",
      },
    },
    safePhoto
      ? h("img", {
          src: safePhoto,
          width: 1080,
          height: 1920,
          style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          },
        })
      : null,

    // Gradient overlay
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.55))",
      },
    }),

    // Top block
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: "110px",
          left: "80px",
          right: "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "white",
          textAlign: "center",
        },
      },
      h(
        "div",
        {
          style: {
            padding: "18px 26px",
            borderRadius: "22px",
            border: `6px solid ${accent}`,
            background: "rgba(0,0,0,0.25)",
            fontSize: "92px",
            fontWeight: 900,
            lineHeight: 1.05,
          },
        },
        name
      ),
      h(
        "div",
        { style: { marginTop: "28px", fontSize: "48px", opacity: 0.9 } },
        "Connecting"
      )
    ),

    // Bottom block
    h(
      "div",
      {
        style: {
          position: "absolute",
          left: "80px",
          right: "80px",
          bottom: "100px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "40px",
          color: "white",
        },
      },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        h("div", { style: { fontSize: "68px", fontWeight: 900 } }, school),
        h("div", { style: { fontSize: "44px", opacity: 0.9 } }, job)
      ),
      h(
        "div",
        {
          style: {
            background: "rgba(255,255,255,0.92)",
            color: "#000",
            padding: "28px 44px",
            borderRadius: "28px",
            fontSize: "44px",
            fontWeight: 900,
          },
        },
        "Connect Now"
      )
    )
  );

  return new ImageResponse(root, { width: 1080, height: 1920 });
}
