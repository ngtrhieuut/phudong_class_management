import { resolve } from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from './index';
import {
  auditLogs,
  badgeDefinitions,
  behaviorTemplates,
  classMemberships,
  classRoles,
  classStudents,
  classes,
  guardians,
  levelDefinitions,
  mediaAssets,
  notifications,
  organizationMembers,
  organizations,
  praisePostStudents,
  praisePosts,
  rewardRedemptions,
  rewards,
  schoolYears,
  scoreTransactions,
  studentBadges,
  studentGuardians,
  studentScoreSnapshots,
  students,
  taskAssignments,
  tasks,
  teacherNotes,
  users,
} from './schema';

/**
 * These IDs intentionally do not come from an auth provider. They are stable,
 * fake UUIDs for local/demo data only and must be replaced by real auth-linked
 * users before any production seed is considered.
 */
const DEMO = {
  organization: '00000000-0000-4000-8000-000000000001',
  teacher: '00000000-0000-4000-8000-000000000002',
  guardianUser: '00000000-0000-4000-8000-000000000003',
  schoolYear: '00000000-0000-4000-8000-000000000010',
  class: '00000000-0000-4000-8000-000000000011',
  guardian: '00000000-0000-4000-8000-000000000020',
  praisePost: '00000000-0000-4000-8000-000000000030',
  mediaAsset: '00000000-0000-4000-8000-000000000031',
  task: '00000000-0000-4000-8000-000000000040',
  rewardRedemption: '00000000-0000-4000-8000-000000000050',
  teacherNote: '00000000-0000-4000-8000-000000000060',
  notification: '00000000-0000-4000-8000-000000000070',
  auditLog: '00000000-0000-4000-8000-000000000080',
  classRoleLead: '00000000-0000-4000-8000-000000000090',
  classRoleHelper: '00000000-0000-4000-8000-000000000091',
  studentMaiAnh: '00000000-0000-4000-8000-000000000101',
  studentMinhAnh: '00000000-0000-4000-8000-000000000102',
  studentQuynhAnh: '00000000-0000-4000-8000-000000000103',
  studentGiaHan: '00000000-0000-4000-8000-000000000104',
  studentDucKhoa: '00000000-0000-4000-8000-000000000105',
  classStudentMaiAnh: '00000000-0000-4000-8000-000000000111',
  classStudentMinhAnh: '00000000-0000-4000-8000-000000000112',
  classStudentQuynhAnh: '00000000-0000-4000-8000-000000000113',
  classStudentGiaHan: '00000000-0000-4000-8000-000000000114',
  classStudentDucKhoa: '00000000-0000-4000-8000-000000000115',
  behaviorSpeak: '00000000-0000-4000-8000-000000000201',
  behaviorHelp: '00000000-0000-4000-8000-000000000202',
  behaviorHomework: '00000000-0000-4000-8000-000000000203',
  behaviorLate: '00000000-0000-4000-8000-000000000204',
  levelOne: '00000000-0000-4000-8000-000000000301',
  levelTwo: '00000000-0000-4000-8000-000000000302',
  levelThree: '00000000-0000-4000-8000-000000000303',
  levelFour: '00000000-0000-4000-8000-000000000304',
  levelFive: '00000000-0000-4000-8000-000000000305',
  badgeSpeak: '00000000-0000-4000-8000-000000000401',
  badgeHelp: '00000000-0000-4000-8000-000000000402',
  badgeHomework: '00000000-0000-4000-8000-000000000403',
  badgeClean: '00000000-0000-4000-8000-000000000404',
  badgeProgress: '00000000-0000-4000-8000-000000000405',
  badgeStar: '00000000-0000-4000-8000-000000000406',
  taskAssignmentMaiAnh: '00000000-0000-4000-8000-000000000501',
  taskAssignmentMinhAnh: '00000000-0000-4000-8000-000000000502',
  rewardSeat: '00000000-0000-4000-8000-000000000601',
  rewardGame: '00000000-0000-4000-8000-000000000602',
  rewardSticker: '00000000-0000-4000-8000-000000000603',
  rewardAssistant: '00000000-0000-4000-8000-000000000604',
  rewardSong: '00000000-0000-4000-8000-000000000605',
  rewardPraise: '00000000-0000-4000-8000-000000000606',
  scoreMaiSpeak: '00000000-0000-4000-8000-000000000701',
  scoreMaiHelp: '00000000-0000-4000-8000-000000000702',
  scoreMaiHomework: '00000000-0000-4000-8000-000000000703',
  scoreMaiManual: '00000000-0000-4000-8000-000000000704',
  scoreMaiReward: '00000000-0000-4000-8000-000000000705',
  scoreMinhSpeak: '00000000-0000-4000-8000-000000000706',
  scoreMinhHelp: '00000000-0000-4000-8000-000000000707',
  scoreQuynhSpeak: '00000000-0000-4000-8000-000000000708',
  scoreQuynhLate: '00000000-0000-4000-8000-000000000709',
  scoreGiaHomework: '00000000-0000-4000-8000-000000000710',
  scoreDucHelp: '00000000-0000-4000-8000-000000000711',
  snapshotMaiAnh: '00000000-0000-4000-8000-000000000801',
  snapshotMinhAnh: '00000000-0000-4000-8000-000000000802',
  snapshotQuynhAnh: '00000000-0000-4000-8000-000000000803',
  snapshotGiaHan: '00000000-0000-4000-8000-000000000804',
  snapshotDucKhoa: '00000000-0000-4000-8000-000000000805',
} as const;

const demoSchoolYearStartsAt = new Date('2026-08-01T00:00:00.000Z');
const demoSchoolYearEndsAt = new Date('2027-07-31T23:59:59.000Z');
const demoToday = new Date('2026-08-17T08:00:00.000Z');
const demoTomorrow = new Date('2026-08-18T23:59:59.000Z');

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the demo seed.');
  }

  await db.insert(organizations).values({
    id: DEMO.organization,
    name: 'Trường Tiểu học Phù Đổng (Demo)',
    code: 'phudong-demo',
    settingsJson: { demo: true, locale: 'vi-VN' },
  }).onConflictDoNothing();

  await db.insert(users).values([
    {
      id: DEMO.teacher,
      email: 'demo.teacher@example.invalid',
      displayName: 'Cô Mai (Demo)',
      status: 'active',
    },
    {
      id: DEMO.guardianUser,
      email: 'demo.guardian@example.invalid',
      displayName: 'Phụ huynh Demo',
      status: 'active',
    },
  ]).onConflictDoNothing();

  await db.insert(organizationMembers).values({
    id: '00000000-0000-4000-8000-000000000004',
    organizationId: DEMO.organization,
    userId: DEMO.teacher,
    role: 'teacher',
  }).onConflictDoNothing();

  await db.insert(schoolYears).values({
    id: DEMO.schoolYear,
    organizationId: DEMO.organization,
    name: '2026-2027',
    startsAt: demoSchoolYearStartsAt,
    endsAt: demoSchoolYearEndsAt,
    active: true,
  }).onConflictDoNothing();

  await db.insert(classes).values({
    id: DEMO.class,
    organizationId: DEMO.organization,
    schoolYearId: DEMO.schoolYear,
    name: 'Lớp 1/6',
    grade: 1,
    homeroomTeacherId: DEMO.teacher,
    settingsJson: { demo: true, theme: 'stars' },
  }).onConflictDoNothing();

  await db.insert(classMemberships).values({
    id: '00000000-0000-4000-8000-000000000005',
    classId: DEMO.class,
    userId: DEMO.teacher,
    role: 'homeroom_teacher',
  }).onConflictDoNothing();

  await db.insert(classRoles).values([
    {
      id: DEMO.classRoleLead,
      classId: DEMO.class,
      name: 'Lớp trưởng',
      icon: 'crown',
      sortOrder: 1,
    },
    {
      id: DEMO.classRoleHelper,
      classId: DEMO.class,
      name: 'Lớp phó học tập',
      icon: 'book-open',
      sortOrder: 2,
    },
  ]).onConflictDoNothing();

  await db.insert(students).values([
    { id: DEMO.studentMaiAnh, organizationId: DEMO.organization, studentCode: 'DEMO-001', fullName: 'Mai Anh', shortName: 'Mai', status: 'active' },
    { id: DEMO.studentMinhAnh, organizationId: DEMO.organization, studentCode: 'DEMO-002', fullName: 'Minh Anh', shortName: 'Minh', status: 'active' },
    { id: DEMO.studentQuynhAnh, organizationId: DEMO.organization, studentCode: 'DEMO-003', fullName: 'Quỳnh Anh', shortName: 'Quỳnh', status: 'active' },
    { id: DEMO.studentGiaHan, organizationId: DEMO.organization, studentCode: 'DEMO-004', fullName: 'Gia Hân', shortName: 'Hân', status: 'active' },
    { id: DEMO.studentDucKhoa, organizationId: DEMO.organization, studentCode: 'DEMO-005', fullName: 'Đức Khoa', shortName: 'Khoa', status: 'active' },
  ]).onConflictDoNothing();

  await db.insert(classStudents).values([
    { id: DEMO.classStudentMaiAnh, classId: DEMO.class, studentId: DEMO.studentMaiAnh, seatNo: 1, groupName: 'Mặt Trời', classRoleId: DEMO.classRoleLead },
    { id: DEMO.classStudentMinhAnh, classId: DEMO.class, studentId: DEMO.studentMinhAnh, seatNo: 2, groupName: 'Mặt Trời', classRoleId: DEMO.classRoleHelper },
    { id: DEMO.classStudentQuynhAnh, classId: DEMO.class, studentId: DEMO.studentQuynhAnh, seatNo: 3, groupName: 'Cầu Vồng' },
    { id: DEMO.classStudentGiaHan, classId: DEMO.class, studentId: DEMO.studentGiaHan, seatNo: 4, groupName: 'Cầu Vồng' },
    { id: DEMO.classStudentDucKhoa, classId: DEMO.class, studentId: DEMO.studentDucKhoa, seatNo: 5, groupName: 'Ngôi Sao' },
  ]).onConflictDoNothing();

  await db.insert(guardians).values({
    id: DEMO.guardian,
    userId: DEMO.guardianUser,
    fullName: 'Phụ huynh Mai Anh (Demo)',
    email: 'demo.guardian@example.invalid',
  }).onConflictDoNothing();

  await db.insert(studentGuardians).values({
    id: '00000000-0000-4000-8000-000000000021',
    studentId: DEMO.studentMaiAnh,
    guardianId: DEMO.guardian,
    relationship: 'parent',
    canView: true,
    receivesNotifications: true,
  }).onConflictDoNothing();

  await db.insert(behaviorTemplates).values([
    { id: DEMO.behaviorSpeak, organizationId: DEMO.organization, classId: DEMO.class, name: 'Phát biểu bài', category: 'positive', defaultPoints: 5, icon: 'hand', colorToken: 'sun', parentVisibility: 'visible', dailyLimit: 3, active: true },
    { id: DEMO.behaviorHelp, organizationId: DEMO.organization, classId: DEMO.class, name: 'Giúp đỡ bạn', category: 'positive', defaultPoints: 2, icon: 'users', colorToken: 'mint', parentVisibility: 'visible', active: true },
    { id: DEMO.behaviorHomework, organizationId: DEMO.organization, classId: DEMO.class, name: 'Hoàn thành bài tập', category: 'positive', defaultPoints: 3, icon: 'check', colorToken: 'blue', parentVisibility: 'visible', active: true },
    { id: DEMO.behaviorLate, organizationId: DEMO.organization, classId: DEMO.class, name: 'Đi học muộn', category: 'needs_improvement', defaultPoints: -3, icon: 'clock', colorToken: 'amber', parentVisibility: 'visible', dailyLimit: 1, active: true },
  ]).onConflictDoNothing();

  await db.insert(levelDefinitions).values([
    { id: DEMO.levelOne, classId: DEMO.class, name: 'Giai đoạn 1', minScore: 0, maxScore: 49, sortOrder: 1 },
    { id: DEMO.levelTwo, classId: DEMO.class, name: 'Giai đoạn 2', minScore: 50, maxScore: 149, sortOrder: 2 },
    { id: DEMO.levelThree, classId: DEMO.class, name: 'Giai đoạn 3', minScore: 150, maxScore: 299, sortOrder: 3 },
    { id: DEMO.levelFour, classId: DEMO.class, name: 'Giai đoạn 4', minScore: 300, maxScore: 499, sortOrder: 4 },
    { id: DEMO.levelFive, classId: DEMO.class, name: 'Giai đoạn 5', minScore: 500, maxScore: null, sortOrder: 5 },
  ]).onConflictDoNothing();

  await db.insert(badgeDefinitions).values([
    { id: DEMO.badgeSpeak, classId: DEMO.class, name: 'Dũng sĩ phát biểu', description: 'Tích cực chia sẻ ý kiến trong lớp.', iconUrl: '/badges/speaking.svg', ruleJson: { type: 'behavior_count', behavior: 'speak', threshold: 10 }, active: true },
    { id: DEMO.badgeHelp, classId: DEMO.class, name: 'Giúp đỡ bạn bè', description: 'Luôn sẵn sàng hỗ trợ bạn.', iconUrl: '/badges/helping.svg', ruleJson: { type: 'behavior_count', behavior: 'help', threshold: 5 }, active: true },
    { id: DEMO.badgeHomework, classId: DEMO.class, name: 'Siêu chăm học', description: 'Kiên trì hoàn thành nhiệm vụ học tập.', iconUrl: '/badges/homework.svg', active: true },
    { id: DEMO.badgeClean, classId: DEMO.class, name: 'Giữ vệ sinh tốt', description: 'Giữ góc học tập sạch sẽ.', iconUrl: '/badges/clean.svg', active: true },
    { id: DEMO.badgeProgress, classId: DEMO.class, name: 'Tiến bộ vượt bậc', description: 'Có bước tiến đáng ghi nhận.', iconUrl: '/badges/progress.svg', active: true },
    { id: DEMO.badgeStar, classId: DEMO.class, name: 'Ngôi sao lớp học', description: 'Tỏa sáng bằng nhiều hành động tích cực.', iconUrl: '/badges/star.svg', active: true },
  ]).onConflictDoNothing();

  await db.insert(tasks).values({
    id: DEMO.task,
    classId: DEMO.class,
    title: 'Giữ bàn học sạch',
    description: 'Kiểm tra và sắp xếp góc học tập trước khi ra về.',
    scope: 'student',
    rewardStars: 3,
    completionMode: 'manual',
    startsAt: demoToday,
    dueAt: demoTomorrow,
    status: 'active',
    createdBy: DEMO.teacher,
  }).onConflictDoNothing();

  await db.insert(taskAssignments).values([
    { id: DEMO.taskAssignmentMaiAnh, taskId: DEMO.task, studentId: DEMO.studentMaiAnh, status: 'completed', completedAt: demoToday, approvedBy: DEMO.teacher },
    { id: DEMO.taskAssignmentMinhAnh, taskId: DEMO.task, studentId: DEMO.studentMinhAnh, status: 'pending' },
  ]).onConflictDoNothing();

  await db.insert(rewards).values([
    { id: DEMO.rewardSeat, classId: DEMO.class, name: 'Chọn chỗ ngồi yêu thích', description: 'Được chọn chỗ ngồi cho một tiết học.', rewardType: 'privilege', costStars: 20, stock: null, active: true },
    { id: DEMO.rewardGame, classId: DEMO.class, name: 'Chọn trò chơi cuối tiết', description: 'Chọn một trò chơi ngắn cùng cả lớp.', rewardType: 'activity', costStars: 30, stock: 5, active: true },
    { id: DEMO.rewardSticker, classId: DEMO.class, name: 'Sticker bất kỳ', description: 'Chọn một sticker vui tặng bản thân.', rewardType: 'physical', costStars: 50, stock: 20, active: true },
    { id: DEMO.rewardAssistant, classId: DEMO.class, name: 'Trợ lý cô giáo một ngày', description: 'Hỗ trợ cô giáo trong một hoạt động nhỏ.', rewardType: 'privilege', costStars: 80, stock: 2, active: true },
    { id: DEMO.rewardSong, classId: DEMO.class, name: 'Chọn bài hát khởi động', description: 'Chọn bài hát mở đầu một tiết học.', rewardType: 'activity', costStars: 100, stock: null, active: true },
    { id: DEMO.rewardPraise, classId: DEMO.class, name: 'Tuyên dương đặc biệt', description: 'Một lời tuyên dương nổi bật trong tuần.', rewardType: 'recognition', costStars: 150, stock: null, active: true },
  ]).onConflictDoNothing();

  await db.insert(scoreTransactions).values([
    { id: DEMO.scoreMaiSpeak, classId: DEMO.class, studentId: DEMO.studentMaiAnh, behaviorTemplateId: DEMO.behaviorSpeak, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 5, spendableDelta: 5, reason: 'Phát biểu bài tự tin', occurredAt: demoToday },
    { id: DEMO.scoreMaiHelp, classId: DEMO.class, studentId: DEMO.studentMaiAnh, behaviorTemplateId: DEMO.behaviorHelp, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 2, spendableDelta: 2, reason: 'Giúp đỡ bạn', occurredAt: demoToday },
    { id: DEMO.scoreMaiHomework, classId: DEMO.class, studentId: DEMO.studentMaiAnh, behaviorTemplateId: DEMO.behaviorHomework, actorUserId: DEMO.teacher, transactionType: 'task', lifetimeDelta: 3, spendableDelta: 3, reason: 'Hoàn thành nhiệm vụ học tập', occurredAt: demoToday },
    { id: DEMO.scoreMaiManual, classId: DEMO.class, studentId: DEMO.studentMaiAnh, actorUserId: DEMO.teacher, transactionType: 'manual', lifetimeDelta: 15, spendableDelta: 15, reason: 'Thành tích nhóm trong ngày', occurredAt: demoToday },
    { id: DEMO.scoreMaiReward, classId: DEMO.class, studentId: DEMO.studentMaiAnh, actorUserId: DEMO.teacher, transactionType: 'reward', lifetimeDelta: 0, spendableDelta: -20, reason: 'Đổi quà: chọn chỗ ngồi yêu thích', occurredAt: demoToday },
    { id: DEMO.scoreMinhSpeak, classId: DEMO.class, studentId: DEMO.studentMinhAnh, behaviorTemplateId: DEMO.behaviorSpeak, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 5, spendableDelta: 5, reason: 'Phát biểu bài', occurredAt: demoToday },
    { id: DEMO.scoreMinhHelp, classId: DEMO.class, studentId: DEMO.studentMinhAnh, behaviorTemplateId: DEMO.behaviorHelp, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 2, spendableDelta: 2, reason: 'Giúp đỡ bạn', occurredAt: demoToday },
    { id: DEMO.scoreQuynhSpeak, classId: DEMO.class, studentId: DEMO.studentQuynhAnh, behaviorTemplateId: DEMO.behaviorSpeak, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 5, spendableDelta: 5, reason: 'Phát biểu bài', occurredAt: demoToday },
    { id: DEMO.scoreQuynhLate, classId: DEMO.class, studentId: DEMO.studentQuynhAnh, behaviorTemplateId: DEMO.behaviorLate, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 0, spendableDelta: -3, reason: 'Cần cải thiện việc đi học đúng giờ', occurredAt: demoToday },
    { id: DEMO.scoreGiaHomework, classId: DEMO.class, studentId: DEMO.studentGiaHan, behaviorTemplateId: DEMO.behaviorHomework, actorUserId: DEMO.teacher, transactionType: 'task', lifetimeDelta: 5, spendableDelta: 5, reason: 'Hoàn thành bài tập đầy đủ', occurredAt: demoToday },
    { id: DEMO.scoreDucHelp, classId: DEMO.class, studentId: DEMO.studentDucKhoa, behaviorTemplateId: DEMO.behaviorHelp, actorUserId: DEMO.teacher, transactionType: 'behavior', lifetimeDelta: 2, spendableDelta: 2, reason: 'Giúp đỡ bạn', occurredAt: demoToday },
  ]).onConflictDoNothing();

  await db.insert(rewardRedemptions).values({
    id: DEMO.rewardRedemption,
    rewardId: DEMO.rewardSeat,
    studentId: DEMO.studentMaiAnh,
    classId: DEMO.class,
    costStars: 20,
    status: 'fulfilled',
    requestedAt: demoToday,
    approvedBy: DEMO.teacher,
    fulfilledAt: demoToday,
  }).onConflictDoNothing();

  await db.insert(studentBadges).values([
    { id: '00000000-0000-4000-8000-000000000411', studentId: DEMO.studentMaiAnh, classId: DEMO.class, badgeId: DEMO.badgeHelp, awardedBy: DEMO.teacher, awardedAt: demoToday, reason: 'Chủ động hỗ trợ bạn trong hoạt động nhóm' },
    { id: '00000000-0000-4000-8000-000000000412', studentId: DEMO.studentGiaHan, classId: DEMO.class, badgeId: DEMO.badgeHomework, awardedBy: DEMO.teacher, awardedAt: demoToday, reason: 'Hoàn thành nhiệm vụ đúng hạn' },
  ]).onConflictDoNothing();

  await db.insert(studentScoreSnapshots).values([
    { id: DEMO.snapshotMaiAnh, studentId: DEMO.studentMaiAnh, classId: DEMO.class, lifetimeScore: 25, spendableStars: 5, updatedAt: demoToday },
    { id: DEMO.snapshotMinhAnh, studentId: DEMO.studentMinhAnh, classId: DEMO.class, lifetimeScore: 7, spendableStars: 7, updatedAt: demoToday },
    { id: DEMO.snapshotQuynhAnh, studentId: DEMO.studentQuynhAnh, classId: DEMO.class, lifetimeScore: 5, spendableStars: 2, updatedAt: demoToday },
    { id: DEMO.snapshotGiaHan, studentId: DEMO.studentGiaHan, classId: DEMO.class, lifetimeScore: 5, spendableStars: 5, updatedAt: demoToday },
    { id: DEMO.snapshotDucKhoa, studentId: DEMO.studentDucKhoa, classId: DEMO.class, lifetimeScore: 2, spendableStars: 2, updatedAt: demoToday },
  ]).onConflictDoNothing();

  await db.insert(praisePosts).values({
    id: DEMO.praisePost,
    classId: DEMO.class,
    authorUserId: DEMO.teacher,
    title: 'Những người bạn biết sẻ chia',
    body: 'Mai Anh và Minh Anh đã cùng nhau hoàn thành hoạt động nhóm rất vui vẻ.',
    visibility: 'related_guardians',
    createdAt: demoToday,
    updatedAt: demoToday,
  }).onConflictDoNothing();

  await db.insert(praisePostStudents).values([
    { id: '00000000-0000-4000-8000-000000000032', postId: DEMO.praisePost, studentId: DEMO.studentMaiAnh },
    { id: '00000000-0000-4000-8000-000000000033', postId: DEMO.praisePost, studentId: DEMO.studentMinhAnh },
  ]).onConflictDoNothing();

  await db.insert(mediaAssets).values({
    id: DEMO.mediaAsset,
    ownerType: 'praise_post',
    ownerId: DEMO.praisePost,
    storageKey: 'demo/praise-posts/00000000-0000-4000-8000-000000000030.webp',
    mimeType: 'image/webp',
    width: 1200,
    height: 800,
  }).onConflictDoNothing();

  await db.insert(teacherNotes).values({
    id: DEMO.teacherNote,
    studentId: DEMO.studentMaiAnh,
    classId: DEMO.class,
    authorUserId: DEMO.teacher,
    body: 'Mai Anh chủ động hỗ trợ các bạn khi làm việc nhóm.',
    visibility: 'teacher_only',
    createdAt: demoToday,
    updatedAt: demoToday,
  }).onConflictDoNothing();

  await db.insert(notifications).values({
    id: DEMO.notification,
    userId: DEMO.guardianUser,
    type: 'praise_post',
    title: 'Mai Anh vừa được tuyên dương',
    body: 'Con đã cùng bạn hoàn thành hoạt động nhóm rất tốt.',
    deepLink: `/parent/praise/${DEMO.praisePost}`,
    createdAt: demoToday,
  }).onConflictDoNothing();

  await db.insert(auditLogs).values({
    id: DEMO.auditLog,
    organizationId: DEMO.organization,
    actorUserId: DEMO.teacher,
    entityType: 'score_transaction',
    entityId: DEMO.scoreMaiSpeak,
    action: 'created',
    afterJson: { transactionType: 'behavior', studentId: DEMO.studentMaiAnh, lifetimeDelta: 5, spendableDelta: 5 },
    ipHash: 'demo-only',
    createdAt: demoToday,
  }).onConflictDoNothing();

  console.log('Demo seed completed for Lớp 1/6 — 2026-2027.');
}

seed().catch((error: unknown) => {
  console.error('Demo seed failed:', error);
  process.exitCode = 1;
});
