export type AvatarGender = "male" | "female";

export type AvatarPreset = {
  id: string;
  label: string;
  gender: AvatarGender;
  url: string;
};

export const avatarPresets: readonly AvatarPreset[] = [
  { id: "male-01", label: "Bạn nam áo hoodie xanh", gender: "male", url: "/avatars/male-01.webp" },
  { id: "male-02", label: "Bạn nam áo sọc xanh", gender: "male", url: "/avatars/male-02.webp" },
  { id: "male-03", label: "Bạn nam áo vàng và kính", gender: "male", url: "/avatars/male-03.webp" },
  { id: "male-04", label: "Bạn nam áo cam", gender: "male", url: "/avatars/male-04.webp" },
  { id: "male-05", label: "Bạn nam áo đỏ", gender: "male", url: "/avatars/male-05.webp" },
  { id: "female-01", label: "Bạn nữ áo hồng", gender: "female", url: "/avatars/female-01.webp" },
  { id: "female-02", label: "Bạn nữ tóc đuôi ngựa", gender: "female", url: "/avatars/female-02.webp" },
  { id: "female-03", label: "Bạn nữ đeo kính", gender: "female", url: "/avatars/female-03.webp" },
  { id: "female-04", label: "Bạn nữ tóc ngắn", gender: "female", url: "/avatars/female-04.webp" },
  { id: "female-05", label: "Bạn nữ nơ xanh", gender: "female", url: "/avatars/female-05.webp" },
];

export function isAvatarPresetUrl(value: string | null | undefined): value is string {
  return Boolean(value && avatarPresets.some((preset) => preset.url === value));
}

/**
 * Keep server-rendered cards compatible with the old PNG database values
 * while all new writes and public assets use WebP.
 */
export function normalizeAvatarPresetUrl(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  const legacyPath = value.match(/^\/avatars\/(male|female)-(0[1-5])\.png$/u);
  return legacyPath ? `/avatars/${legacyPath[1]}-${legacyPath[2]}.webp` : value;
}
