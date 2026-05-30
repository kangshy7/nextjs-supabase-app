export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdateInput = Pick<
  Profile,
  "username" | "full_name" | "avatar_url" | "bio" | "website"
>;
