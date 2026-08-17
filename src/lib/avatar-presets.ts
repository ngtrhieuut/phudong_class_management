export type AvatarGender = "male" | "female";

export type AvatarPreset = {
  id: string;
  label: string;
  gender: AvatarGender;
  url: string;
};

export const avatarPresets: readonly AvatarPreset[] = [
  { id: "male-01", label: "Bạn nam áo xanh", gender: "male", url: "/avatars/male-01.svg" },
  { id: "male-02", label: "Bạn nam kính tròn", gender: "male", url: "/avatars/male-02.svg" },
  { id: "male-03", label: "Bạn nam tóc xoăn", gender: "male", url: "/avatars/male-03.svg" },
  { id: "male-04", label: "Bạn nam áo cam", gender: "male", url: "/avatars/male-04.svg" },
  { id: "male-05", label: "Bạn nam đội mũ", gender: "male", url: "/avatars/male-05.svg" },
  { id: "female-01", label: "Bạn nữ tóc dài", gender: "female", url: "/avatars/female-01.svg" },
  { id: "female-02", label: "Bạn nữ nơ xanh", gender: "female", url: "/avatars/female-02.svg" },
  { id: "female-03", label: "Bạn nữ tóc bob", gender: "female", url: "/avatars/female-03.svg" },
  { id: "female-04", label: "Bạn nữ áo vàng", gender: "female", url: "/avatars/female-04.svg" },
  { id: "female-05", label: "Bạn nữ cài hoa", gender: "female", url: "/avatars/female-05.svg" },
];

export function isAvatarPresetUrl(value: string | null | undefined): value is string {
  return Boolean(value && avatarPresets.some((preset) => preset.url === value));
}
