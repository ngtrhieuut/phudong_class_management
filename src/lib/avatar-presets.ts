export type AvatarGender = "male" | "female";

export type AvatarPreset = {
  id: string;
  label: string;
  gender: AvatarGender;
  url: string;
};

export const avatarPresets: readonly AvatarPreset[] = [
  { id: "male-01", label: "Bạn nam áo hoodie xanh", gender: "male", url: "/avatars/male-01.png" },
  { id: "male-02", label: "Bạn nam áo sọc xanh", gender: "male", url: "/avatars/male-02.png" },
  { id: "male-03", label: "Bạn nam áo vàng và kính", gender: "male", url: "/avatars/male-03.png" },
  { id: "male-04", label: "Bạn nam áo cam", gender: "male", url: "/avatars/male-04.png" },
  { id: "male-05", label: "Bạn nam áo đỏ", gender: "male", url: "/avatars/male-05.png" },
  { id: "female-01", label: "Bạn nữ áo hồng", gender: "female", url: "/avatars/female-01.png" },
  { id: "female-02", label: "Bạn nữ tóc đuôi ngựa", gender: "female", url: "/avatars/female-02.png" },
  { id: "female-03", label: "Bạn nữ đeo kính", gender: "female", url: "/avatars/female-03.png" },
  { id: "female-04", label: "Bạn nữ tóc ngắn", gender: "female", url: "/avatars/female-04.png" },
  { id: "female-05", label: "Bạn nữ nơ xanh", gender: "female", url: "/avatars/female-05.png" },
];

export function isAvatarPresetUrl(value: string | null | undefined): value is string {
  return Boolean(value && avatarPresets.some((preset) => preset.url === value));
}
