import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import type { Profile } from "@/types/profile";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">프로필 설정</h1>
        <p className="mt-2 text-muted-foreground">공개 프로필 정보를 관리합니다.</p>
      </div>
      <ProfileForm profile={profile as Profile | null} userId={userId} />
    </div>
  );
}
