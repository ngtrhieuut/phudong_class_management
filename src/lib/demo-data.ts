export type DemoStudent = {
  id: string;
  name: string;
  shortName: string;
  group: string;
  points: number;
  spendableStars: number;
  level: string;
  levelLabel: string;
  progress: number;
  tone: "gold" | "coral" | "blue" | "green" | "lilac";
  taskStatus: "Đã xong" | "Đang làm" | "Chưa bắt đầu";
};

export type DemoActivity = {
  id: string;
  type: "star" | "message" | "task";
  title: string;
  detail: string;
  time: string;
  tone: "gold" | "orange" | "blue";
};

export type DemoPraise = {
  id: string;
  student: string;
  time: string;
  behavior: string;
  body: string;
  tone: "gold" | "blue" | "green";
};

export type DemoBehavior = {
  id: string;
  label: string;
  points: number;
  description: string;
  tone: "gold" | "coral" | "blue" | "green";
};

export const demoClass = {
  name: "Lớp 1/6",
  schoolYear: "2026-2027",
  school: "Trường Tiểu học Phù Đổng",
  studentCount: 32,
};

export const dashboardStudents: DemoStudent[] = [
  {
    id: "student-mai-anh",
    name: "Mai Anh",
    shortName: "MA",
    group: "Tổ Mặt Trời",
    points: 124,
    spendableStars: 38,
    level: "4",
    levelLabel: "Người truyền cảm hứng",
    progress: 72,
    tone: "gold",
    taskStatus: "Đã xong",
  },
  {
    id: "student-minh-anh",
    name: "Minh Anh",
    shortName: "M",
    group: "Tổ Mặt Trời",
    points: 98,
    spendableStars: 26,
    level: "3",
    levelLabel: "Nhà khám phá",
    progress: 66,
    tone: "blue",
    taskStatus: "Đang làm",
  },
  {
    id: "student-quynh-anh",
    name: "Quỳnh Anh",
    shortName: "Q",
    group: "Tổ Cầu Vồng",
    points: 77,
    spendableStars: 21,
    level: "3",
    levelLabel: "Nhà khám phá",
    progress: 51,
    tone: "coral",
    taskStatus: "Đã xong",
  },
  {
    id: "student-gia-han",
    name: "Gia Hân",
    shortName: "G",
    group: "Tổ Cầu Vồng",
    points: 63,
    spendableStars: 19,
    level: "2",
    levelLabel: "Ngôi sao nhỏ",
    progress: 42,
    tone: "green",
    taskStatus: "Đang làm",
  },
  {
    id: "student-duc-khoa",
    name: "Đức Khoa",
    shortName: "ĐK",
    group: "Tổ Gió Mới",
    points: 52,
    spendableStars: 14,
    level: "2",
    levelLabel: "Ngôi sao nhỏ",
    progress: 35,
    tone: "lilac",
    taskStatus: "Chưa bắt đầu",
  },
  {
    id: "student-ngoc-han",
    name: "Ngọc Hân",
    shortName: "NH",
    group: "Tổ Gió Mới",
    points: 41,
    spendableStars: 12,
    level: "1",
    levelLabel: "Mầm sáng",
    progress: 82,
    tone: "blue",
    taskStatus: "Đang làm",
  },
];

export const recentActivities: DemoActivity[] = [
  {
    id: "activity-1",
    type: "star",
    title: "Minh Anh nhận được một ngôi sao",
    detail: "Hành vi: Giúp đỡ bạn bè",
    time: "10 phút trước",
    tone: "gold",
  },
  {
    id: "activity-2",
    type: "message",
    title: "Phụ huynh của Bảo Nam đã phản hồi",
    detail: "Báo cáo tiến bộ tuần",
    time: "45 phút trước",
    tone: "orange",
  },
  {
    id: "activity-3",
    type: "task",
    title: "Tổ Cầu Vồng hoàn thành nhiệm vụ",
    detail: "Giữ góc học tập gọn gàng",
    time: "2 giờ trước",
    tone: "blue",
  },
];

export const recentPraise: DemoPraise[] = [
  {
    id: "praise-1",
    student: "Lan Chi",
    time: "Vừa xong",
    behavior: "Tư duy sáng tạo",
    body: "Con đã đưa ra một ý tưởng rất hay cho trò chơi của lớp.",
    tone: "gold",
  },
  {
    id: "praise-2",
    student: "Đức Duy",
    time: "1 giờ trước",
    behavior: "Giúp đỡ bạn",
    body: "Con chủ động sắp xếp lại góc đồ dùng mà không cần nhắc.",
    tone: "blue",
  },
  {
    id: "praise-3",
    student: "Ngọc Nam",
    time: "Hôm qua",
    behavior: "Đọc sách chăm chỉ",
    body: "",
    tone: "green",
  },
];

export const behaviorPresets: DemoBehavior[] = [
  {
    id: "behavior-speaking",
    label: "Phát biểu bài",
    points: 5,
    description: "Tự tin chia sẻ ý kiến",
    tone: "gold",
  },
  {
    id: "behavior-helping",
    label: "Giúp đỡ bạn",
    points: 2,
    description: "Biết quan tâm và hợp tác",
    tone: "coral",
  },
  {
    id: "behavior-homework",
    label: "Làm bài tập",
    points: 3,
    description: "Hoàn thành việc được giao",
    tone: "blue",
  },
  {
    id: "behavior-on-time",
    label: "Đi học đúng giờ",
    points: 5,
    description: "Sẵn sàng cho ngày học mới",
    tone: "green",
  },
  {
    id: "behavior-clean",
    label: "Giữ lớp sạch",
    points: 2,
    description: "Cùng chăm sóc không gian chung",
    tone: "blue",
  },
  {
    id: "behavior-group",
    label: "Làm việc nhóm",
    points: 2,
    description: "Lắng nghe và phối hợp",
    tone: "gold",
  },
];
