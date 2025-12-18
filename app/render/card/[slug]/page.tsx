import { getProfileBySlug } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

export default async function RenderCard({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { token?: string };
}) {
  if (searchParams.token !== process.env.RENDER_TOKEN) return <div>Unauthorized</div>;

  const { user, extra } = await getProfileBySlug(params.slug);
  if (!user) return <div>Not found</div>;

  return (
    <div
      id="card-root"
      className="w-[1080px] h-[1920px] overflow-hidden rounded-[80px] relative"
      style={{ background: "linear-gradient(180deg, #bcd4e6 0%, #cfd9c2 70%, #ffffff 100%)" }}
    >
      <div className="absolute top-20 left-0 right-0 text-center text-white z-10">
        <div className="text-[84px] font-semibold leading-tight">{user.name}</div>
        <div className="text-[40px] opacity-90 mt-3">Connecting</div>
      </div>

      {/* photo */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.photo_url || ""}
          alt="photo"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 p-16 z-10">
        <div className="flex items-center justify-between">
          <div className="text-white drop-shadow">
            <div className="text-[44px] font-semibold">{extra?.school || ""}</div>
            <div className="text-[34px] opacity-90">{extra?.job_type || ""}</div>
          </div>

          <div className="bg-white rounded-[30px] px-14 py-10 shadow-xl text-[38px] font-semibold">
            + Add Member
          </div>
        </div>
      </div>
    </div>
  );
}
