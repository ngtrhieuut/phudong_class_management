import type { DemoActivity, DemoBehavior, DemoPraise, DemoStudent } from "@/lib/demo-data";
import type {
  ClassStudentRow,
  TeacherDashboardData,
} from "@/lib/classroom/queries";

type LevelRow = {
  id: string;
  name: string;
  minScore: number;
  maxScore: number | null;
  sortOrder: number;
};

export type DashboardPresentation = {
  students: DemoStudent[];
  activities: DemoActivity[];
  praiseItems: DemoPraise[];
  behaviors: DemoBehavior[];
  stats: {
    totalLifetimeScore: number;
    todayScore: number;
    studentCount: number;
    recentActivityCount: number;
  };
};

const tones: DemoStudent["tone"][] = ["gold", "blue", "coral", "green", "lilac"];
const behaviorTones: DemoBehavior["tone"][] = ["gold", "coral", "blue", "green"];
const praiseTones: DemoPraise["tone"][] = ["gold", "blue", "green"];

function asNumber(value: number | string | null | undefined): number {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function resolveLevel(score: number, levels: readonly LevelRow[]) {
  const matching = [...levels]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((level) => score >= level.minScore && (level.maxScore === null || score <= level.maxScore));
  const level = matching.at(-1);
  if (!level) {
    return { level: "—", label: "Chưa thiết lập cấp độ", progress: 0 };
  }

  const next = [...levels]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find((candidate) => candidate.minScore > level.minScore);
  if (!next) {
    return { level: String(level.sortOrder), label: level.name, progress: 100 };
  }

  const range = Math.max(1, next.minScore - level.minScore);
  const progress = Math.max(0, Math.min(100, Math.round(((score - level.minScore) / range) * 100)));
  return { level: String(level.sortOrder), label: level.name, progress };
}

function toDemoStudent(row: ClassStudentRow, levels: readonly LevelRow[], index: number): DemoStudent {
  const points = asNumber(row.lifetimeScore);
  const level = resolveLevel(points, levels);
  return {
    id: row.id,
    studentCode: row.studentCode,
    name: row.fullName,
    shortName: row.shortName?.trim() || initials(row.fullName),
    group: row.groupName?.trim() || "Chưa phân tổ",
    points,
    spendableStars: Math.max(0, asNumber(row.spendableStars)),
    level: level.level,
    levelLabel: level.label,
    progress: level.progress,
    tone: tones[index % tones.length],
    taskStatus: "Chưa bắt đầu",
  };
}

function relativeTime(date: Date): string {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "Gần đây";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function toDashboardPresentation(data: TeacherDashboardData): DashboardPresentation {
  const students = data.students.map((student, index) => toDemoStudent(student, data.levels, index));
  const namesById = new Map(students.map((student) => [student.id, student.name]));

  const activities: DemoActivity[] = data.recentScores.map((score) => ({
    id: score.id,
    type: score.lifetimeDelta > 0 ? "star" : "message",
    title: `${score.studentName || namesById.get(score.studentId) || "Học sinh"} được ghi nhận`,
    detail: score.behaviorName || score.reason,
    time: relativeTime(score.occurredAt),
    tone: score.lifetimeDelta > 0 ? "gold" : "orange",
  }));

  const praiseItems: DemoPraise[] = data.praise.map((item, index) => ({
    id: item.id,
    student: item.studentNames || "Lớp học",
    time: relativeTime(item.createdAt),
    behavior: item.title,
    body: item.body,
    tone: praiseTones[index % praiseTones.length],
  }));

  const behaviors: DemoBehavior[] = data.behaviorTemplates.map((behavior, index) => ({
    id: behavior.id,
    label: behavior.name,
    points: behavior.defaultPoints,
    description: behavior.category === "positive" ? "Ghi nhận hành vi tích cực" : "Điều cần cải thiện",
    tone: behaviorTones[index % behaviorTones.length],
  }));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayScore = data.recentScores
    .filter((score) => new Date(score.occurredAt).getTime() >= startOfToday.getTime())
    .reduce((total, score) => total + asNumber(score.lifetimeDelta), 0);

  return {
    students,
    activities,
    praiseItems,
    behaviors,
    stats: {
      totalLifetimeScore: students.reduce((total, student) => total + student.points, 0),
      todayScore,
      studentCount: students.length,
      recentActivityCount: data.recentScores.length,
    },
  };
}

export function toStudentPresentation(
  row: ClassStudentRow,
  levels: readonly LevelRow[] = [],
  index = 0,
): DemoStudent {
  return toDemoStudent(row, levels, index);
}
