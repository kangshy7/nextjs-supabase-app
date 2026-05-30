"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile, ProfileUpdateInput } from "@/types/profile";

const profileSchema = z.object({
  username: z
    .string()
    .max(50, "사용자명은 50자 이하여야 합니다.")
    .regex(/^[a-zA-Z0-9_]*$/, "영문, 숫자, 밑줄만 사용 가능합니다.")
    .optional()
    .or(z.literal("")),
  full_name: z.string().max(100, "이름은 100자 이하여야 합니다.").optional().or(z.literal("")),
  avatar_url: z.string().url("올바른 URL 형식이어야 합니다.").optional().or(z.literal("")),
  bio: z.string().max(500, "자기소개는 500자 이하여야 합니다.").optional().or(z.literal("")),
  website: z.string().url("올바른 URL 형식이어야 합니다.").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: Profile | null;
  userId: string;
  className?: string;
}

export function ProfileForm({ profile, userId, className }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username ?? "",
      full_name: profile?.full_name ?? "",
      avatar_url: profile?.avatar_url ?? "",
      bio: profile?.bio ?? "",
      website: profile?.website ?? "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    setMessage(null);
    const supabase = createClient();

    const updateData: ProfileUpdateInput = {
      username: data.username || null,
      full_name: data.full_name || null,
      avatar_url: data.avatar_url || null,
      bio: data.bio || null,
      website: data.website || null,
    };

    const { error } = await supabase.from("profiles").upsert({ id: userId, ...updateData });

    if (error) {
      // username 중복 오류 처리
      if (error.code === "23505") {
        setMessage({ type: "error", text: "이미 사용 중인 사용자명입니다." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } else {
      setMessage({ type: "success", text: "프로필이 저장되었습니다." });
    }

    setIsLoading(false);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">프로필 설정</CardTitle>
          <CardDescription>공개 프로필 정보를 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">사용자명</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="예: john_doe"
                  {...form.register("username")}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="full_name">이름</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="홍길동"
                  {...form.register("full_name")}
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">자기소개</Label>
                <textarea
                  id="bio"
                  rows={3}
                  placeholder="간단한 자기소개를 입력하세요."
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("bio")}
                />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-500">{form.formState.errors.bio.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website">웹사이트</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  {...form.register("website")}
                />
                {form.formState.errors.website && (
                  <p className="text-sm text-red-500">{form.formState.errors.website.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="avatar_url">아바타 URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  {...form.register("avatar_url")}
                />
                {form.formState.errors.avatar_url && (
                  <p className="text-sm text-red-500">{form.formState.errors.avatar_url.message}</p>
                )}
              </div>

              {message && (
                <p
                  className={cn(
                    "text-sm",
                    message.type === "success" ? "text-green-600" : "text-red-500"
                  )}
                >
                  {message.text}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "저장 중..." : "프로필 저장"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
