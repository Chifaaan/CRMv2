/** Public read-only profile from GET /api/users/:id/profile */
export type PublicUserProfile = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  phoneNumber: string | null;
  company: string | null;
  bio: string | null;
  linkedin: string | null;
  github: string | null;
  image: string | null;
};

/** Minimal user chip data for opening profile without fetch */
export type UserProfilePreview = {
  id: string;
  name: string;
  image?: string | null;
};
